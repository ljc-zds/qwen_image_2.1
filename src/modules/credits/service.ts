import { createHash } from 'node:crypto';
import { and, asc, desc, eq, gt, isNull, or, sql, sum } from 'drizzle-orm';

import { db } from '@/core/db';
import { credit, user } from '@/config/db/schema';
import { getSnowId, getUuid } from '@/lib/hash';

// --- Enums ---

export enum CreditStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  DELETED = 'deleted',
}

export enum CreditTransactionType {
  GRANT = 'grant',
  CONSUME = 'consume',
}

export enum CreditTransactionScene {
  PAYMENT = 'payment',
  SUBSCRIPTION = 'subscription',
  RENEWAL = 'renewal',
  GIFT = 'gift',
  REWARD = 'reward',
}

type NewCredit = typeof credit.$inferInsert;

// --- Expiration ---

export function calculateCreditExpirationTime(params: {
  creditsValidDays: number;
  currentPeriodEnd?: Date;
}): Date | null {
  const { creditsValidDays, currentPeriodEnd } = params;

  if (!creditsValidDays || creditsValidDays <= 0) {
    return null; // never expires
  }

  if (currentPeriodEnd) {
    return new Date(currentPeriodEnd.getTime());
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + creditsValidDays);
  return expiresAt;
}

function validCreditConditions(userId: string) {
  const now = new Date();
  return and(
    eq(credit.userId, userId),
    eq(credit.transactionType, CreditTransactionType.GRANT),
    eq(credit.status, CreditStatus.ACTIVE),
    gt(credit.remainingCredits, 0),
    process.env.WAFFO_ENVIRONMENT === 'prod'
      ? or(
          isNull(credit.metadata),
          sql`${credit.metadata} NOT LIKE ${'%"mode":"test"%'}`
        )
      : undefined,
    or(isNull(credit.expiresAt), gt(credit.expiresAt, now))
  );
}

// --- Balance ---

export async function getBalance(userId: string): Promise<number> {
  const [result] = await db()
    .select({ total: sum(credit.remainingCredits) })
    .from(credit)
    .where(validCreditConditions(userId));

  return parseInt(result?.total || '0');
}

// --- Grant ---

export async function grant(params: {
  userId: string;
  userEmail?: string;
  credits: number;
  description?: string;
  orderNo?: string;
  subscriptionNo?: string;
  scene?: string;
  expiresAt?: Date | null;
}) {
  const newCredit: NewCredit = {
    id: getUuid(),
    userId: params.userId,
    userEmail: params.userEmail || '',
    transactionNo: getSnowId(),
    transactionType: CreditTransactionType.GRANT,
    transactionScene: params.scene || CreditTransactionScene.GIFT,
    credits: params.credits,
    remainingCredits: params.credits,
    status: CreditStatus.ACTIVE,
    description: params.description || 'Grant credit',
    orderNo: params.orderNo || '',
    subscriptionNo: params.subscriptionNo || '',
    expiresAt: params.expiresAt !== undefined ? params.expiresAt : null,
  };

  await db().insert(credit).values(newCredit);
  return newCredit;
}

// --- Consume (FIFO with batching) ---

export async function consume(params: {
  userId: string;
  userEmail?: string;
  credits: number;
  scene?: string;
  description?: string;
  metadata?: string;
  tx?: any;
}): Promise<{ success: boolean; consumedCredit?: any }> {
  const {
    userId,
    userEmail,
    credits: amount,
    scene,
    description,
    metadata,
    tx,
  } = params;
  const now = new Date();

  const execute = async (tx: any) => {
    // 1. Check balance
    const [balance] = await tx
      .select({ total: sum(credit.remainingCredits) })
      .from(credit)
      .where(validCreditConditions(userId));

    if (!balance?.total || parseInt(balance.total) < amount) {
      return { success: false };
    }

    // 2. FIFO consumption with batching
    let remainingToConsume = amount;
    const batchSize = 1000;
    const maxBatches = 10;
    let batchNo = 0;
    const consumedItems: any[] = [];

    while (remainingToConsume > 0 && batchNo < maxBatches) {
      const batchCredits = await tx
        .select()
        .from(credit)
        .where(validCreditConditions(userId))
        .orderBy(asc(credit.expiresAt))
        .limit(batchSize)
        .for('update');

      if (!batchCredits || batchCredits.length === 0) break;

      for (const item of batchCredits) {
        if (remainingToConsume <= 0) break;
        const toConsume = Math.min(remainingToConsume, item.remainingCredits);

        await tx
          .update(credit)
          .set({ remainingCredits: item.remainingCredits - toConsume })
          .where(eq(credit.id, item.id));

        consumedItems.push({
          creditId: item.id,
          transactionNo: item.transactionNo,
          creditsConsumed: toConsume,
          creditsBefore: item.remainingCredits,
          creditsAfter: item.remainingCredits - toConsume,
        });

        remainingToConsume -= toConsume;
      }

      batchNo++;
    }

    // A concurrent transaction may have spent the balance before our row locks.
    // Throw to roll back every partial deduction instead of granting a free task.
    if (remainingToConsume > 0) throw new Error('insufficient_credits');

    // 3. Create consumption record
    const consumedCredit: NewCredit = {
      id: getUuid(),
      userId,
      userEmail: userEmail || '',
      transactionNo: getSnowId(),
      transactionType: CreditTransactionType.CONSUME,
      transactionScene: scene || '',
      status: CreditStatus.ACTIVE,
      description: description || '',
      credits: -amount,
      remainingCredits: 0,
      consumedDetail: JSON.stringify(consumedItems),
      metadata: metadata || '',
    };
    await tx.insert(credit).values(consumedCredit);

    return { success: true, consumedCredit };
  };

  if (tx) return execute(tx);
  try {
    return await db().transaction(execute);
  } catch (error) {
    if (error instanceof Error && error.message === 'insufficient_credits')
      return { success: false };
    throw error;
  }
}

// --- Revoke (restore credits from a consumed record) ---

export async function revoke(consumeCreditId: string) {
  await db().transaction(async (tx: any) => {
    const [consumeRecord] = await tx
      .select()
      .from(credit)
      .where(
        and(
          eq(credit.id, consumeCreditId),
          eq(credit.transactionType, CreditTransactionType.CONSUME),
          eq(credit.status, CreditStatus.ACTIVE)
        )
      )
      .limit(1)
      .for('update');

    if (!consumeRecord || !consumeRecord.consumedDetail) return;

    const items = JSON.parse(consumeRecord.consumedDetail);

    // Atomic increment per source grant — no read-modify-write race.
    for (const item of items) {
      await tx
        .update(credit)
        .set({
          remainingCredits: sql`${credit.remainingCredits} + ${item.creditsConsumed}`,
        })
        .where(eq(credit.id, item.creditId));
    }

    // Mark consumption record as deleted
    await tx
      .update(credit)
      .set({ status: CreditStatus.DELETED })
      .where(eq(credit.id, consumeCreditId));
  });
}

// --- Auto-grant for new user ---

export async function grantForNewUser(params: {
  userId: string;
  userEmail?: string;
  configs: Record<string, string>;
}) {
  const { userId, userEmail, configs } = params;

  if (configs.initial_credits_enabled !== 'true') return;

  const credits = parseInt(configs.initial_credits_amount) || 0;
  if (credits <= 0) return;

  const validDays = parseInt(configs.initial_credits_valid_days) || 0;
  const description = configs.initial_credits_description || 'Initial credits';

  const expiresAt = calculateCreditExpirationTime({
    creditsValidDays: validDays,
  });

  return grant({
    userId,
    userEmail,
    credits,
    description,
    scene: CreditTransactionScene.GIFT,
    expiresAt,
  });
}

// --- History ---

export async function getHistory(userId: string, limit = 50) {
  return db()
    .select()
    .from(credit)
    .where(and(eq(credit.userId, userId), isNull(credit.deletedAt)))
    .orderBy(desc(credit.createdAt))
    .limit(limit);
}

// Verified accounts receive a lifetime trial once. Email-derived unique keys
// deduplicate repeat and concurrent claims for the same email.
const trialKey = (email: string) =>
  'studio_trial_' +
  createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
export async function claimStudioTrial(userId: string) {
  return db().transaction(async (tx: any) => {
    if (
      ['postgres', 'postgresql'].includes(process.env.DATABASE_PROVIDER || '')
    )
      await tx.execute(sql`select pg_advisory_xact_lock(79130421)`);
    const [account] = await tx
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    if (!account?.emailVerified) return { eligible: false, remaining: 0 };
    const transactionNo = trialKey(account.email);
    const [existing] = await tx
      .select()
      .from(credit)
      .where(eq(credit.transactionNo, transactionNo))
      .limit(1);
    if (existing)
      return {
        eligible: true,
        remaining: existing.userId === userId ? existing.remainingCredits : 0,
      };
    const day = new Date();
    day.setUTCHours(0, 0, 0, 0);
    const [usage] = await tx
      .select({ total: sql<number>`count(*)` })
      .from(credit)
      .where(
        and(
          eq(credit.transactionScene, 'studio_trial'),
          gt(credit.createdAt, day)
        )
      );
    const limit = Number(process.env.STUDIO_TRIAL_DAILY_SIGNUPS || 100);
    if (
      !Number.isSafeInteger(limit) ||
      limit < 0 ||
      Number(usage.total) >= limit
    )
      return { eligible: true, remaining: 0, budgetReached: true };
    await tx
      .insert(credit)
      .values({
        id: getUuid(),
        userId,
        userEmail: account.email,
        transactionNo,
        transactionType: 'grant',
        transactionScene: 'studio_trial',
        credits: 1,
        remainingCredits: 1,
        status: 'active',
        description: '1 free welcome image credit',
        metadata: JSON.stringify({
          mode: process.env.WAFFO_ENVIRONMENT || 'test',
          trial: true,
        }),
      })
      .onConflictDoNothing();
    return { eligible: true, remaining: 1 };
  });
}
export async function getStudioTrialRemaining(userId: string) {
  const [result] = await db()
    .select({ total: sum(credit.remainingCredits) })
    .from(credit)
    .where(
      and(
        validCreditConditions(userId),
        eq(credit.transactionScene, 'studio_trial')
      )
    );
  return Number(result?.total || 0);
}

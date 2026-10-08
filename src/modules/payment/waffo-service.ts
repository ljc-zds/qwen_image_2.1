import { createHash } from 'node:crypto';
import { TaxCategory, type WebhookEvent } from '@waffo/pancake-ts';
import { and, asc, eq, gt, isNull, lte, or } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  getWaffoClient,
  waffoEnvironment,
  waffoProductId,
  waffoReady,
  waffoStoreId,
} from '@/core/payment/waffo';
import { envConfigs } from '@/config';
import {
  credit,
  order,
  paymentWebhook,
  subscription,
} from '@/config/db/schema';
import { getPricingProduct } from '@/config/pricing';
import { getUuid } from '@/lib/hash';

import { notifyPaymentToFeishu } from './feishu-notify';

const key = (value: string) => createHash('sha256').update(value).digest('hex');
const date = (value?: string) => {
  const result = new Date(value || '');
  if (!Number.isFinite(result.getTime()))
    throw new Error('waffo_missing_period');
  return result;
};
const cents = (value: string | number | undefined) => {
  const amount = Number(value);
  if (value === undefined || !Number.isFinite(amount) || amount < 0)
    throw new Error('waffo_missing_amount');
  return Math.round(amount * 100);
};

export async function createWaffoCheckout(
  user: { id: string; email: string },
  sku: string
) {
  const product = getPricingProduct(sku);
  if (!product) throw new Error('Unknown product');
  const remoteProductId = waffoProductId(sku);
  const client = getWaffoClient();
  if (product.type === 'subscription') {
    const [active] = await db()
      .select()
      .from(subscription)
      .where(
        and(
          eq(subscription.userId, user.id),
          eq(subscription.paymentProvider, 'waffo'),
          or(
            eq(subscription.status, 'active'),
            eq(subscription.status, 'pending_cancel'),
            eq(subscription.status, 'paused')
          )
        )
      )
      .limit(1);
    if (active) throw new Error('waffo_subscription_exists');
    const [pending] = await db()
      .select()
      .from(order)
      .where(
        and(
          eq(order.userId, user.id),
          eq(order.paymentProvider, 'waffo'),
          eq(order.paymentType, 'subscription'),
          eq(order.status, 'pending'),
          gt(order.createdAt, new Date(Date.now() - 45 * 60_000))
        )
      )
      .limit(1);
    if (pending?.checkoutUrl)
      return {
        checkout_url: pending.checkoutUrl,
        order_no: pending.orderNo,
        environment: waffoEnvironment(),
      };
    if (pending) throw new Error('waffo_checkout_in_progress');
  }
  const orderNo = 'PRISM_' + getUuid();
  // Persist ownership/entitlement before calling the provider; a fast webhook can find it.
  await db().insert(order).values({
    id: getUuid(),
    orderNo,
    userId: user.id,
    userEmail: user.email,
    status: 'pending',
    amount: product.priceInCents,
    currency: product.currency,
    productId: sku,
    productName: product.productName,
    planName: product.planName,
    paymentType: product.type,
    paymentProvider: 'waffo',
    paymentProductId: remoteProductId,
    creditsAmount: product.credits,
    creditsValidDays: product.creditsValidDays,
    checkoutInfo: '{}',
    description: product.description,
  });
  try {
    const session = await client.checkout.createSession(
      {
        productId: remoteProductId,
        currency: 'USD',
        buyerEmail: user.email,
        priceSnapshot: {
          amount: (product.priceInCents / 100).toFixed(2),
          taxCategory: TaxCategory.SaaS,
        },
        successUrl: `${envConfigs.app_url}/settings/billing?payment=pending`,
        metadata: { orderNo, userId: user.id, sku },
        orderMerchantExternalId: orderNo,
        withTrial: false,
        darkMode: false,
      },
      { idempotencyKey: orderNo }
    );
    const url = new URL(session.checkoutUrl);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.waffo.ai'))
      throw new Error('waffo_invalid_checkout_url');
    await db()
      .update(order)
      .set({
        paymentSessionId: session.sessionId,
        checkoutInfo: JSON.stringify(session),
        checkoutUrl: session.checkoutUrl,
      })
      .where(eq(order.orderNo, orderNo));
    return {
      checkout_url: session.checkoutUrl,
      order_no: orderNo,
      environment: waffoEnvironment(),
    };
  } catch {
    // The outcome might be unknown after a timeout. Keep the pending order for reconciliation.
    throw new Error('waffo_checkout_failed');
  }
}

export async function enqueueWaffoEvent(event: WebhookEvent) {
  await db()
    .insert(paymentWebhook)
    .values({
      id: event.id,
      businessKey: key(
        `${event.mode}:${event.eventType}:${event.eventId}:${event.timestamp}`
      ),
      payload: JSON.stringify(event),
      status: 'pending',
    })
    .onConflictDoNothing();
}

// All fulfillment and the inbox receipt commit together. Stable period/payment keys
// also deduplicate different deliveries describing the same charge.
export async function processWaffoDelivery(id: string) {
  let notification: WebhookEvent | undefined;
  await db().transaction(async (tx: any) => {
    const [receipt] = await tx
      .select()
      .from(paymentWebhook)
      .where(eq(paymentWebhook.id, id))
      .limit(1);
    if (!receipt || receipt.status === 'processed') return;
    const event: WebhookEvent = JSON.parse(receipt.payload);
    if (event.storeId !== waffoStoreId() || event.mode !== waffoEnvironment())
      throw new Error('waffo_wrong_store_or_environment');
    const type = event.eventType;
    notification = event;
    const supported = [
      'order.completed',
      'subscription.activated',
      'subscription.payment_succeeded',
      'subscription.canceling',
      'subscription.uncanceled',
      'subscription.canceled',
      'subscription.past_due',
      'refund.succeeded',
    ];
    if (!supported.includes(type)) {
      if (type === 'subscription.plan_changed')
        throw new Error('waffo_plan_change_requires_review');
      await tx
        .update(paymentWebhook)
        .set({ status: 'processed' })
        .where(eq(paymentWebhook.id, id));
      return;
    }
    const data = event.data;
    const external =
      data.orderMerchantExternalId || data.orderMetadata?.orderNo;
    const [local] = await tx
      .select()
      .from(order)
      .where(
        and(
          eq(order.paymentProvider, 'waffo'),
          external
            ? eq(order.orderNo, external)
            : eq(order.subscriptionId, data.orderId)
        )
      )
      .orderBy(asc(order.createdAt))
      .limit(1);
    if (!local) throw new Error('waffo_order_not_found');
    if (
      !data.orderId ||
      (local.subscriptionId && local.subscriptionId !== data.orderId)
    )
      throw new Error('waffo_order_mismatch');
    if (
      data.orderMetadata?.userId &&
      data.orderMetadata.userId !== local.userId
    )
      throw new Error('waffo_user_mismatch');
    if (data.currency.toLowerCase() !== local.currency.toLowerCase())
      throw new Error('waffo_currency_mismatch');
    const isSub = local.paymentType === 'subscription';
    if (
      (type.startsWith('subscription.') && !isSub) ||
      (type === 'order.completed' && isSub)
    )
      throw new Error('waffo_product_type_mismatch');
    const [sub] = isSub
      ? await tx
          .select()
          .from(subscription)
          .where(
            and(
              eq(subscription.paymentProvider, 'waffo'),
              eq(subscription.subscriptionId, data.orderId)
            )
          )
          .limit(1)
      : [];

    if (
      type === 'order.completed' ||
      type === 'subscription.activated' ||
      type === 'subscription.payment_succeeded'
    ) {
      const price =
        data.listPrice?.subtotal ?? data.planPrice?.subtotal ?? data.subtotal;
      const charged = data.chargedAmount ?? data.amount;
      const base =
        price !== undefined
          ? cents(price)
          : cents(charged) - cents(data.taxAmount || '0');
      if (base !== local.amount) throw new Error('waffo_amount_mismatch');
      const start = isSub
        ? date(data.currentPeriodStart)
        : date(event.timestamp);
      const end = isSub
        ? date(data.currentPeriodEnd)
        : new Date(start.getTime() + 365 * 86400000);
      if (end <= start) throw new Error('waffo_invalid_period');
      const grantKey =
        'waffo_' +
        key(
          `${event.mode}:${data.orderId}:${isSub ? start.toISOString() : 'onetime'}`
        );
      const [already] = await tx
        .select()
        .from(credit)
        .where(eq(credit.transactionNo, grantKey))
        .limit(1);
      // Payment events supply the actual payment ID; activation may arrive first.
      if (already) {
        if (data.paymentId)
          await tx
            .update(order)
            .set({ transactionId: data.paymentId })
            .where(eq(order.orderNo, already.orderNo));
      } else {
        const renewal = Boolean(sub);
        const fulfillmentOrderNo = renewal
          ? 'RENEW_' + key(grantKey).slice(0, 32)
          : local.orderNo;
        const subNo = sub?.subscriptionNo || 'SUB_' + getUuid();
        if (isSub && !sub)
          await tx.insert(subscription).values({
            id: getUuid(),
            subscriptionNo: subNo,
            userId: local.userId,
            userEmail: local.userEmail,
            status: 'active',
            paymentProvider: 'waffo',
            subscriptionId: data.orderId,
            productId: local.productId,
            productName: local.productName,
            planName: local.planName,
            amount: local.amount,
            currency: local.currency,
            interval: 'month',
            intervalCount: 1,
            creditsAmount: local.creditsAmount,
            creditsValidDays: 31,
            paymentProductId: local.paymentProductId,
            currentPeriodStart: start,
            currentPeriodEnd: end,
            subscriptionResult: JSON.stringify(event),
          });
        if (sub && (!sub.currentPeriodStart || start >= sub.currentPeriodStart))
          await tx
            .update(subscription)
            .set({
              currentPeriodStart: start,
              currentPeriodEnd: end,
              status:
                sub.status === 'pending_cancel' ? 'pending_cancel' : 'active',
            })
            .where(eq(subscription.id, sub.id));
        const paid = {
          status: 'paid',
          paymentAmount: cents(charged),
          paymentCurrency: data.currency,
          paidAt: start,
          transactionId: data.paymentId || null,
          paymentResult: JSON.stringify(event),
          subscriptionId: data.orderId,
          subscriptionNo: isSub ? subNo : null,
        };
        if (renewal)
          await tx.insert(order).values({
            ...paid,
            id: getUuid(),
            orderNo: fulfillmentOrderNo,
            userId: local.userId,
            userEmail: local.userEmail,
            amount: local.amount,
            currency: local.currency,
            productId: local.productId,
            productName: local.productName,
            planName: local.planName,
            paymentProvider: 'waffo',
            paymentType: 'renew',
            checkoutInfo: '{}',
            creditsAmount: local.creditsAmount,
          });
        else await tx.update(order).set(paid).where(eq(order.id, local.id));
        await tx.insert(credit).values({
          id: getUuid(),
          transactionNo: grantKey,
          userId: local.userId,
          userEmail: local.userEmail,
          orderNo: fulfillmentOrderNo,
          subscriptionNo: isSub ? subNo : '',
          transactionType: 'grant',
          transactionScene: isSub
            ? renewal
              ? 'renewal'
              : 'subscription'
            : 'payment',
          credits: local.creditsAmount,
          remainingCredits: local.creditsAmount,
          status: 'active',
          expiresAt: end,
          description: 'Waffo payment credits',
          metadata: JSON.stringify({ mode: event.mode }),
        });
      }
    } else if (type === 'refund.succeeded') {
      const [paidOrder] = await tx
        .select()
        .from(order)
        .where(
          and(
            eq(order.paymentProvider, 'waffo'),
            data.paymentId
              ? eq(order.transactionId, data.paymentId)
              : eq(order.orderNo, local.orderNo)
          )
        )
        .limit(1);
      if (!paidOrder) throw new Error('waffo_refund_payment_not_found');
      if (paidOrder.status === 'refunded') {
        await tx
          .update(paymentWebhook)
          .set({ status: 'processed', lastError: null })
          .where(eq(paymentWebhook.id, id));
        return;
      }
      if (paidOrder.status !== 'paid')
        throw new Error('waffo_refund_payment_not_found');
      if (
        cents(data.refundedAmount ?? data.amount) <
        (paidOrder.paymentAmount || paidOrder.amount)
      )
        throw new Error('waffo_partial_refund_requires_review');
      await tx
        .update(credit)
        .set({ remainingCredits: 0, status: 'deleted' })
        .where(
          and(
            eq(credit.orderNo, paidOrder.orderNo),
            eq(credit.transactionType, 'grant')
          )
        );
      await tx
        .update(order)
        .set({ status: 'refunded' })
        .where(eq(order.id, paidOrder.id));
    } else {
      if (!sub) throw new Error('waffo_subscription_not_found');
      const previous = sub.subscriptionResult
        ? JSON.parse(sub.subscriptionResult)
        : null;
      if (
        !previous?.timestamp ||
        date(event.timestamp) >= date(previous.timestamp)
      ) {
        const statuses: Record<string, string> = {
          'subscription.canceling': 'pending_cancel',
          'subscription.uncanceled': 'active',
          'subscription.canceled': 'canceled',
          'subscription.past_due': 'paused',
        };
        await tx
          .update(subscription)
          .set({
            status: statuses[type],
            subscriptionResult: JSON.stringify(event),
            canceledAt:
              type === 'subscription.canceled'
                ? date(data.canceledAt || event.timestamp)
                : null,
            canceledEndAt:
              type === 'subscription.canceling' ? sub.currentPeriodEnd : null,
          })
          .where(eq(subscription.id, sub.id));
      }
    }
    await tx
      .update(paymentWebhook)
      .set({ status: 'processed', lastError: null })
      .where(eq(paymentWebhook.id, id));
  });
  if (notification) {
    try {
      await notifyPaymentToFeishu(notification);
    } catch {
      console.error(
        'Feishu payment notification failed; payment processing succeeded'
      );
    }
  }
}

let draining = false;
let timer: ReturnType<typeof setInterval> | undefined;
export async function drainWaffoInbox() {
  if (draining) return;
  draining = true;
  try {
    const pending = await db()
      .select()
      .from(paymentWebhook)
      .where(
        and(
          eq(paymentWebhook.status, 'pending'),
          or(
            isNull(paymentWebhook.nextAttemptAt),
            lte(paymentWebhook.nextAttemptAt, new Date())
          )
        )
      )
      .orderBy(asc(paymentWebhook.createdAt))
      .limit(50);
    for (const item of pending) {
      try {
        await processWaffoDelivery(item.id);
      } catch (error) {
        await db()
          .update(paymentWebhook)
          .set({
            lastError:
              error instanceof Error ? error.message : 'processing_failed',
            attempts: item.attempts + 1,
            nextAttemptAt: new Date(
              Date.now() +
                Math.min(3600, 30 * 2 ** Math.min(item.attempts, 7)) * 1000
            ),
          })
          .where(eq(paymentWebhook.id, item.id));
      }
    }
  } finally {
    draining = false;
  }
}
// Node deployment worker. Persisted receipts survive restarts and retry every 30s.
export function startWaffoWorker() {
  if (process.env.VERCEL === '1') return;
  if (timer || !waffoReady()) return;
  timer = setInterval(() => {
    void drainWaffoInbox().catch(() =>
      console.error('Waffo inbox retry failed')
    );
  }, 30_000);
  timer.unref();
  setTimeout(() => {
    void drainWaffoInbox().catch(() =>
      console.error('Waffo inbox startup failed')
    );
  }, 0);
}

export async function cancelWaffoSubscription(
  userId: string,
  subscriptionNo: string
) {
  const [sub] = await db()
    .select()
    .from(subscription)
    .where(
      and(
        eq(subscription.subscriptionNo, subscriptionNo),
        eq(subscription.userId, userId),
        eq(subscription.paymentProvider, 'waffo')
      )
    )
    .limit(1);
  if (!sub) throw new Error('Subscription not found');
  const result = await getWaffoClient().orders.cancelSubscription({
    orderId: sub.subscriptionId,
  });
  await db()
    .update(subscription)
    .set({
      status: result.status === 'canceled' ? 'canceled' : 'pending_cancel',
      canceledAt: new Date(),
      canceledEndAt: sub.currentPeriodEnd,
    })
    .where(eq(subscription.id, sub.id));
  return sub;
}

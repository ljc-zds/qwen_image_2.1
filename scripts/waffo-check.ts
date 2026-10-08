import assert from 'node:assert/strict';
import { createSign, generateKeyPairSync } from 'node:crypto';
import { mkdirSync } from 'node:fs';

import { loadEnvFiles } from '../src/lib/env';

loadEnvFiles();
mkdirSync('.local', { recursive: true });
process.env.DATABASE_URL = `file:.local/waffo-check-${Date.now()}.db`;
process.env.WAFFO_ENVIRONMENT = 'test';
process.env.WAFFO_STORE_ID = 'STO_test';
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
// Generated local signing fixture, never a merchant or Waffo platform key.
process.env.WAFFO_WEBHOOK_TEST_PUBLIC_KEY = publicKey
  .export({ type: 'spki', format: 'pem' })
  .toString();
const { createClient } = await import('@libsql/client');
const client = createClient({ url: process.env.DATABASE_URL });
// Use the development schema in a disposable database, not the project database.
const { drizzle } = await import('drizzle-orm/libsql');
const { pushSQLiteSchema } = await import('drizzle-kit/api');
const schema = await import('../src/config/db/schema');
const pushed = await pushSQLiteSchema(schema, drizzle(client));
if (pushed.hasDataLoss)
  throw new Error('Unexpected destructive test migration');
await pushed.apply();
const { db } = await import('../src/core/db');
const { enqueueWaffoEvent, processWaffoDelivery, drainWaffoInbox } =
  await import('../src/modules/payment/waffo-service');
const { verifyWaffoEvent } = await import('../src/core/payment/waffo');
const { getBalance, consume, revoke } =
  await import('../src/modules/credits/service');
const { eq } = await import('drizzle-orm');
const { user, order, subscription, paymentWebhook } = schema;
await db()
  .insert(user)
  .values({ id: 'qa', name: 'Payment QA', email: 'waffo-qa@example.invalid' });
await db().insert(order).values({
  id: 'order1',
  orderNo: 'local1',
  userId: 'qa',
  userEmail: 'waffo-qa@example.invalid',
  status: 'pending',
  amount: 1200,
  currency: 'usd',
  productId: 'creator_monthly',
  paymentType: 'subscription',
  paymentProvider: 'waffo',
  checkoutInfo: '{}',
  creditsAmount: 100,
  productName: 'Creator',
});
const now = new Date();
const start = now.toISOString();
const end = new Date(now.getTime() + 31 * 86400000).toISOString();
const event = (
  id: string,
  eventType = 'subscription.activated',
  overrides: Record<string, unknown> = {}
) => ({
  id,
  eventType,
  eventId: 'PAY_' + id,
  timestamp: now.toISOString(),
  storeId: 'STO_test',
  storeName: 'QA',
  mode: 'test' as const,
  data: {
    orderId: 'ORD_remote',
    buyerEmail: 'waffo-qa@example.invalid',
    currency: 'USD',
    amount: '12.00',
    taxAmount: '0',
    productName: 'Creator',
    orderMetadata: { orderNo: 'local1', userId: 'qa' },
    currentPeriodStart: start,
    currentPeriodEnd: end,
    ...overrides,
  },
});
const first = event('activation');
const body = JSON.stringify(first),
  timestamp = String(Date.now());
const signer = createSign('RSA-SHA256');
signer.update(`${timestamp}.${body}`);
signer.end();
const signature = `t=${timestamp},v1=${signer.sign(privateKey, 'base64')}`;
assert.equal(verifyWaffoEvent(body, signature).id, first.id);
assert.throws(() => verifyWaffoEvent(body + ' ', signature));
assert.throws(() => verifyWaffoEvent(body, null));
await enqueueWaffoEvent(first);
await processWaffoDelivery(first.id);
assert.equal(await getBalance('qa'), 100);
await enqueueWaffoEvent(first);
await processWaffoDelivery(first.id);
const paid = event('first-payment', 'subscription.payment_succeeded', {
  paymentId: 'PAY_first',
});
await enqueueWaffoEvent(paid);
await processWaffoDelivery(paid.id);
assert.equal(
  await getBalance('qa'),
  100,
  'activation + payment must grant only once'
);
const reserved = await consume({ userId: 'qa', credits: 1 });
assert.equal(await getBalance('qa'), 99);
await revoke(reserved.consumedCredit.id);
assert.equal(await getBalance('qa'), 100);
const wrong = event('wrong-amount', 'subscription.payment_succeeded', {
  amount: '0.01',
  currentPeriodStart: end,
  currentPeriodEnd: new Date(now.getTime() + 62 * 86400000).toISOString(),
});
await enqueueWaffoEvent(wrong);
await assert.rejects(processWaffoDelivery(wrong.id), /amount_mismatch/);
assert.equal(await getBalance('qa'), 100);
const renewal = event('renewal', 'subscription.payment_succeeded', {
  paymentId: 'PAY_renew',
  currentPeriodStart: end,
  currentPeriodEnd: new Date(now.getTime() + 62 * 86400000).toISOString(),
});
await enqueueWaffoEvent(renewal);
await processWaffoDelivery(renewal.id);
await enqueueWaffoEvent({ ...renewal, id: 'renewal-duplicate' });
await processWaffoDelivery('renewal-duplicate');
assert.equal(await getBalance('qa'), 200);
const cancel = event('canceling', 'subscription.canceling');
await enqueueWaffoEvent(cancel);
await processWaffoDelivery(cancel.id);
const [sub] = await db().select().from(subscription);
assert.equal(sub.status, 'pending_cancel');
assert.equal(
  await getBalance('qa'),
  200,
  'canceling preserves current credits'
);
const refund = event('refund', 'refund.succeeded', {
  paymentId: 'PAY_renew',
  refundedAmount: '12.00',
});
await enqueueWaffoEvent(refund);
await processWaffoDelivery(refund.id);
assert.equal(await getBalance('qa'), 100);
const refundAgain = { ...refund, id: 'refund-duplicate', eventId: 'REF_other' };
await enqueueWaffoEvent(refundAgain);
await processWaffoDelivery(refundAgain.id);
assert.equal(await getBalance('qa'), 100);
await db().insert(order).values({
  id: 'packorder',
  orderNo: 'packlocal',
  userId: 'qa',
  status: 'pending',
  amount: 990,
  currency: 'usd',
  productId: 'image_pack',
  paymentType: 'one-time',
  paymentProvider: 'waffo',
  checkoutInfo: '{}',
  creditsAmount: 80,
});
const pack = event('pack', 'order.completed', {
  orderId: 'ORD_pack',
  amount: '9.90',
  paymentId: 'PAY_pack',
  orderMetadata: { orderNo: 'packlocal', userId: 'qa' },
});
await enqueueWaffoEvent(pack);
await processWaffoDelivery(pack.id);
assert.equal(await getBalance('qa'), 180);
await drainWaffoInbox();
const [failed] = await db()
  .select()
  .from(paymentWebhook)
  .where(eq(paymentWebhook.id, wrong.id));
assert.equal(failed.status, 'pending');
assert.match(failed.lastError, /amount_mismatch/);
assert.equal((await consume({ userId: 'qa', credits: 181 })).success, false);
process.env.WAFFO_ENVIRONMENT = 'prod';
assert.equal(
  await getBalance('qa'),
  0,
  'sandbox credits must not become production entitlements'
);
assert.equal((await consume({ userId: 'qa', credits: 1 })).success, false);
process.env.WAFFO_ENVIRONMENT = 'test';
// Exercise the real SDK's signed checkout request against a local fetch fixture.
process.env.WAFFO_MERCHANT_ID = 'MER_0123456789ABCDEFGHIJKL';
process.env.WAFFO_PRIVATE_KEY = privateKey
  .export({ type: 'pkcs8', format: 'pem' })
  .toString();
delete process.env.WAFFO_PRIVATE_KEY_BASE64;
process.env.WAFFO_IMAGE_PACK_PRODUCT_ID = 'PROD_0123456789ABCDEFGHIJKL';
const originalFetch = globalThis.fetch;
let checkoutBody: any;
globalThis.fetch = async (input, init) => {
  assert.match(
    String(input),
    /api\.waffo\.ai\/v1\/actions\/checkout\/create-session/
  );
  checkoutBody = JSON.parse(String(init?.body));
  return Response.json({
    data: {
      sessionId: 'cs_fixture',
      checkoutUrl: 'https://pancake.waffo.ai/store/qa/checkout/cs_fixture',
      expiresAt: end,
    },
  });
};
try {
  const { createWaffoCheckout } =
    await import('../src/modules/payment/waffo-service');
  const checkout = await createWaffoCheckout(
    { id: 'qa', email: 'waffo-qa@example.invalid' },
    'image_pack'
  );
  assert.match(checkout.checkout_url, /^https:\/\/pancake\.waffo\.ai/);
  assert.equal(checkoutBody.priceSnapshot.amount, '9.90');
  assert.equal(checkoutBody.metadata.userId, 'qa');
  assert.equal(checkoutBody.orderMerchantExternalId, checkout.order_no);
  assert.equal(checkoutBody.withTrial, false);
} finally {
  globalThis.fetch = originalFetch;
}
console.log(
  'PASS: SDK signatures, tamper rejection, durable retries, activation/payment dedup, renewal, cancellation, refund, pack purchase, credit reserve/return and insufficient balance.'
);
client.close();

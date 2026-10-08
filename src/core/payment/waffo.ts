import {
  verifyWebhook,
  WaffoPancake,
  type WebhookEvent,
  type WebhookEventData,
} from '@waffo/pancake-ts';

export function waffoEnvironment(): 'test' | 'prod' {
  const environment = process.env.WAFFO_ENVIRONMENT || 'test';
  if (environment !== 'test' && environment !== 'prod')
    throw new Error('waffo_invalid_environment');
  return environment;
}
export function waffoStoreId() {
  if (!process.env.WAFFO_STORE_ID) throw new Error('waffo_not_configured');
  return process.env.WAFFO_STORE_ID;
}
export function waffoReady() {
  return Boolean(
    process.env.WAFFO_MERCHANT_ID &&
    process.env.WAFFO_STORE_ID &&
    (process.env.WAFFO_PRIVATE_KEY || process.env.WAFFO_PRIVATE_KEY_BASE64)
  );
}
// Server-only signing key. The SDK handles all signing and PEM normalization.
export function getWaffoClient() {
  if (!waffoReady()) throw new Error('waffo_not_configured');
  const privateKey = process.env.WAFFO_PRIVATE_KEY_BASE64
    ? Buffer.from(process.env.WAFFO_PRIVATE_KEY_BASE64, 'base64').toString(
        'utf8'
      )
    : process.env.WAFFO_PRIVATE_KEY!;
  return new WaffoPancake({
    merchantId: process.env.WAFFO_MERCHANT_ID!,
    privateKey,
    environment: waffoEnvironment(),
    fetch: (input, init) =>
      fetch(input, { ...init, signal: AbortSignal.timeout(30_000) }),
  });
}
export function verifyWaffoEvent(
  body: string,
  signature: string | null
): WebhookEvent {
  const event = verifyWebhook<WebhookEventData>(body, signature, {
    environment: waffoEnvironment(),
  });
  if (event.mode !== waffoEnvironment() || event.storeId !== waffoStoreId())
    throw new Error('waffo_wrong_store_or_environment');
  return event;
}
export function waffoProductId(productId: string) {
  const keys: Record<string, string> = {
    creator_monthly: 'WAFFO_CREATOR_MONTHLY_PRODUCT_ID',
    pro_monthly: 'WAFFO_PRO_MONTHLY_PRODUCT_ID',
    image_pack: 'WAFFO_IMAGE_PACK_PRODUCT_ID',
  };
  const id = process.env[keys[productId]];
  if (!id?.startsWith('PROD_')) throw new Error('waffo_product_not_configured');
  return id;
}

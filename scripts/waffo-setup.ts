import { readFileSync, writeFileSync } from 'node:fs';
import { BillingPeriod, TaxCategory } from '@waffo/pancake-ts';

import { loadEnvFiles } from '../src/lib/env';

loadEnvFiles();

// Import only after env loading; verify store ownership before any writes.
const { getWaffoClient, waffoStoreId, waffoEnvironment } =
  await import('../src/core/payment/waffo');
const { listPricingProducts } = await import('../src/config/pricing');
const environment = waffoEnvironment();
const production = environment === 'prod';
const webhookUrl = process.env.WAFFO_WEBHOOK_URL;
if (production) {
  const appUrl = new URL(process.env.VITE_APP_URL || 'http://localhost');
  const hook = new URL(webhookUrl || 'http://localhost');
  if (
    appUrl.protocol !== 'https:' ||
    hook.protocol !== 'https:' ||
    appUrl.origin !== hook.origin ||
    hook.pathname !== '/api/payment/notify/waffo'
  )
    throw new Error(
      'Production requires VITE_APP_URL and matching HTTPS WAFFO_WEBHOOK_URL'
    );
}
const client = getWaffoClient();
const storeId = waffoStoreId();
const result = await client.graphql.query<{ store: { id: string } | null }>({
  query: 'query ($id: String!) { store(id: $id) { id } }',
  variables: { id: storeId },
});
if (result.errors?.length || result.data?.store?.id !== storeId)
  throw new Error('Store ownership could not be verified');
const envFile = production ? '.env.production' : '.env.development';
let contents = readFileSync(envFile, 'utf8');
const envKeys: Record<string, string> = {
  creator_monthly: 'WAFFO_CREATOR_MONTHLY_PRODUCT_ID',
  pro_monthly: 'WAFFO_PRO_MONTHLY_PRODUCT_ID',
  image_pack: 'WAFFO_IMAGE_PACK_PRODUCT_ID',
};
const ids: string[] = [];
for (const product of listPricingProducts()) {
  const envKey = envKeys[product.productId];
  let id = process.env[envKey];
  if (!id) {
    const params = {
      storeId,
      name: product.description,
      prices: {
        USD: {
          amount: (product.priceInCents / 100).toFixed(2),
          taxIncluded: false,
          taxCategory: TaxCategory.SaaS,
        },
      },
      metadata: { sku: product.productId, credits: String(product.credits) },
    };
    const options = {
      idempotencyKey: `prism-${environment}-${storeId}-${product.productId}-${product.priceInCents}`,
    };
    const created = product.plan
      ? await client.subscriptionProducts.create(
          { ...params, billingPeriod: BillingPeriod.Monthly },
          options
        )
      : await client.onetimeProducts.create(params, options);
    id = created.product.id;
    const line = `${envKey}=${id}`;
    const pattern = new RegExp(`^${envKey}=.*$`, 'm');
    contents = pattern.test(contents)
      ? contents.replace(pattern, line)
      : contents + '\n' + line;
    writeFileSync(envFile, contents, 'utf8');
  }
  // Direct prod creation already creates a production version. publish() only
  // promotes an existing test version and rejects prod-only products.
  if (production) {
    const options = {
      idempotencyKey: `prism-${environment}-${storeId}-${product.productId}-activate-v1`,
    };
    if (product.plan)
      await client.subscriptionProducts.updateStatus(
        { id, status: 'active' },
        options
      );
    else
      await client.onetimeProducts.updateStatus(
        { id, status: 'active' },
        options
      );
  }
  if (product.plan) ids.push(id);
  console.log(`${product.productId}: ${id}`);
}
await client.subscriptionProductGroups.create(
  { storeId, name: 'Prism Studio Monthly Plans', productIds: ids },
  { idempotencyKey: `prism-${environment}-${storeId}-monthly-group-v1` }
);
if (webhookUrl) {
  if (!webhookUrl.startsWith('https://'))
    throw new Error(
      'Webhook URL must be public HTTPS (use ngrok for local development)'
    );
  const hooks = await client.graphql.query<{
    store: {
      storeWebhooks: Array<{ id: string; url: string; testMode: boolean }>;
    };
  }>({
    query:
      'query ($id: String!) { store(id: $id) { storeWebhooks { id url testMode } } }',
    variables: { id: storeId },
  });
  if (hooks.errors?.length || !hooks.data?.store)
    throw new Error('Could not inspect existing webhooks');
  const existing = hooks.data.store.storeWebhooks.find(
    (hook) => hook.url === webhookUrl && hook.testMode === !production
  );
  if (!existing) {
    await client.webhooks.add(
      {
        storeId,
        channel: 'http',
        url: webhookUrl,
        testMode: !production,
        events: [
          'order.completed',
          'subscription.activated',
          'subscription.payment_succeeded',
          'subscription.canceling',
          'subscription.uncanceled',
          'subscription.canceled',
          'subscription.past_due',
          'refund.succeeded',
        ],
      },
      {
        idempotencyKey: `prism-${environment}-${storeId}-webhook-${Buffer.from(webhookUrl).toString('hex').slice(-80)}`,
      }
    );
  }
  console.log(`${environment} webhook configured`);
} else
  console.log(
    'Set WAFFO_WEBHOOK_URL to a public HTTPS /api/payment/notify/waffo URL, then rerun.'
  );
console.log(
  production
    ? 'Production products published and webhook registered.'
    : 'Sandbox setup complete. No products have been published to production.'
);

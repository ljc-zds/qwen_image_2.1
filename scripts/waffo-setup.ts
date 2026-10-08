import { readFileSync, writeFileSync } from 'node:fs';
import { BillingPeriod, TaxCategory } from '@waffo/pancake-ts';

import { loadEnvFiles } from '../src/lib/env';

loadEnvFiles();

// Import only after env loading; all writes remain in the selected test store.
const { getWaffoClient, waffoStoreId, waffoEnvironment } =
  await import('../src/core/payment/waffo');
const { listPricingProducts } = await import('../src/config/pricing');
if (waffoEnvironment() !== 'test')
  throw new Error(
    'Setup only creates sandbox products. Configure production separately.'
  );
const client = getWaffoClient();
const storeId = waffoStoreId();
const result = await client.graphql.query<{ store: { id: string } | null }>({
  query: 'query ($id: String!) { store(id: $id) { id } }',
  variables: { id: storeId },
});
if (result.errors?.length || result.data?.store?.id !== storeId)
  throw new Error('Store ownership could not be verified');
const envFile = '.env.development';
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
      idempotencyKey: `prism-test-${storeId}-${product.productId}-${product.priceInCents}`,
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
  if (product.plan) ids.push(id);
  console.log(`${product.productId}: ${id}`);
}
await client.subscriptionProductGroups.create(
  { storeId, name: 'Prism Studio Monthly Plans', productIds: ids },
  { idempotencyKey: `prism-test-${storeId}-monthly-group-v1` }
);
const webhookUrl = process.env.WAFFO_WEBHOOK_URL;
if (webhookUrl) {
  if (!webhookUrl.startsWith('https://'))
    throw new Error(
      'Webhook URL must be public HTTPS (use ngrok for local development)'
    );
  await client.webhooks.add(
    {
      storeId,
      channel: 'http',
      url: webhookUrl,
      testMode: true,
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
      idempotencyKey: `prism-test-${storeId}-webhook-${Buffer.from(webhookUrl).toString('hex').slice(-80)}`,
    }
  );
  console.log('Test webhook registered');
} else
  console.log(
    'Set WAFFO_WEBHOOK_URL to a public HTTPS /api/payment/notify/waffo URL, then rerun.'
  );
console.log(
  'Sandbox setup complete. No products have been published to production.'
);

# Waffo Pancake payments

Integration follows [the official Waffo skill](https://docs.waffo.ai/zh/integrate/skill), with API types from `@waffo/pancake-ts` 0.25.0. The current SDK infers product type from the product ID; `createSession` no longer accepts `productType`. SDK enums are used for billing periods and tax categories.

## Local test configuration

Merchant and store IDs supplied for this project have been saved in the ignored `.env.development`. `WAFFO_ENVIRONMENT=test` is selected. The supplied private key was a placeholder, so no merchant API request or real payment has been made.

1. Add the **test merchant RSA private key** to `.env.development` as `WAFFO_PRIVATE_KEY=<your-test-private-key>` (replace the placeholder with the entire quoted PEM, using escaped newlines). Alternatively set `WAFFO_PRIVATE_KEY_BASE64` to the base64-encoded entire PEM. Never use a `VITE_` variable for keys.
2. Start `ngrok http 3000`. Set `WAFFO_WEBHOOK_URL=https://YOUR-NGROK-DOMAIN/api/payment/notify/waffo` and `VITE_APP_URL` to the public tunnel origin for checkout return URLs. Restart after environment changes.
3. Run `pnpm waffo:setup`. It verifies the selected store, creates only sandbox products, saves product IDs to `.env.development`, creates a subscription product group, and registers a test HTTP webhook if its URL is supplied. Products are not published to production. Existing configured product IDs are reused; clear a wrong ID only after checking it in the dashboard.
4. Run `pnpm build` and start the Node server with env files loaded, or `pnpm dev`.
5. Sign in, open `/pricing`, choose a plan, prepare checkout and open Waffo in a new tab. Use sandbox Visa `4576750000000110` for success or `4576750000000220` for decline, with a future expiry and any CVC.
6. Check `/settings/billing`, `/settings/payments`, and `/settings/credits`. A return-page visit never grants credits; only verified payment events do. The inbox worker runs every 30 seconds. Refresh after webhook processing.

## Catalog and accounting

| SKU               | Price before applicable tax | Credits                |
| ----------------- | --------------------------- | ---------------------- |
| `creator_monthly` | USD 12/month                | 100 per billing period |
| `pro_monthly`     | USD 29/month                | 300 per billing period |
| `image_pack`      | USD 9.90 once               | 80, valid for 365 days |

`src/config/pricing.ts` is authoritative. The browser supplies only a SKU and provider. Internally the existing order schema stores cents; conversion to SDK display amount strings happens at the Waffo boundary. Webhook display amounts are converted back to cents and validated against the stored order.

One image reserves one credit before inference; an inference failure restores the reservation. Credit enforcement defaults on; `STUDIO_REQUIRE_CREDITS=false` explicitly disables it for local previews. Test payment credits have `mode:test` metadata and cannot be spent when `WAFFO_ENVIRONMENT=prod`. Use separate databases and private keys for test and live environments.

## Webhooks and lifecycle

`POST /api/payment/notify/waffo` reads raw request text, uses the SDK's embedded environment public key and replay protection, and checks store and environment before storing the event. It returns 200 only after durable acceptance. A Node worker processes persisted deliveries asynchronously; processing errors remain pending with `last_error` in `payment_webhook` and retry after restart or every 30 seconds.

Fulfillment, subscription updates, credits, and the processed receipt commit in one transaction. Delivery IDs deduplicate transport retries; stable external-order/period keys deduplicate activation versus first-payment and renewal notifications. Ownership is bound to the server-created local order, not the checkout email or success URL.

Supported: one-time purchase, subscription activation, renewal, cancel-at-period-end, termination, past-due status and full refunds. Current-period credits keep their original expiry when canceling. Full refunds revoke the remaining credits from the associated charge. Partial refunds and externally initiated plan changes remain pending for manual review instead of granting or deducting guessed amounts. The app blocks a second active subscription; plan-switch checkout is not enabled yet.

This worker targets the project's Node deployment. For serverless/Cloudflare deployment, replace its interval with a scheduled durable queue consumer before enabling billing. New production schemas must use reviewed migrations; the local SQLite inbox table was added with `pnpm db:push`.

## Verification

`pnpm waffo:check` creates a disposable database in `.local`, generates a temporary RSA signature fixture, and checks SDK verification/tampering, transport/business duplicate handling, renewal, cancellation, full refund, credit-pack fulfillment, retries, credit reservation and failure restoration. It does not call the merchant API or use a real card.

Before live checkout: configure a separate production key, production product IDs and webhook, publish products through Waffo, and run an end-to-end payment test. The setup script intentionally refuses production product creation.

# qwenimage2.site deployment

- Hosting: Vercel project `qwenimage2` (Nitro / TanStack Start), region `iad1`.
- Canonical origin: `https://qwenimage2.site`; `www` redirects to the apex.
- DNS: Cloudflare, with both hosts pointing to the Vercel-recommended CNAME. Records are DNS-only so Vercel handles HTTPS.
- Nameservers: `eleanor.ns.cloudflare.com`, `quincy.ns.cloudflare.com`.
- Database: Neon PostgreSQL. All application tables are explicitly qualified in the independent `qwenimage2` schema; existing `public` application data is not modified.
- Migrations: `migrations/0000_qwenimage2_initial.sql`, reviewed and approved by the user before applying. Migration receipts use `qwenimage2_migrations`.
- Secrets: encrypted Vercel environment variables; ignored local `.env.production` and `.local` files are not included in deployment source or Git.
- Production has new session-signing and settings-encryption keys. Local development remains SQLite.

## Payment processing

Vercel webhook acceptance persists verified events before returning HTTP 200. `@vercel/functions` `waitUntil` keeps fulfillment alive after the response. An authenticated daily `/api/payment/retry` cron retries outstanding deliveries; the Node interval worker is disabled on Vercel. The cron uses `CRON_SECRET`.

Waffo remains in test mode without the real merchant test private key/product IDs, so checkout is unavailable until configured. Real paid plans are not live. Image generation enforces image credits. An active account requires credits before it can call the model.

## Verification

Production verified on 2026-10-07 at `https://qwenimage2.site`. Cloudflare is active, Vercel reports the domain correctly configured, and both hosts have valid HTTPS. The production deployment is `dpl_3VWECQ7P6rBhcfUwZ6A5Egsbd7ke`. Live checks are recorded in `online-verification.json` and `online-browser-audit.json`; the temporary signup test account was removed after verification.

TanStack Start was upgraded to 1.168.60 with its matching React Router 1.170.41 to resolve the security issue that blocked the original deployment. Deployment sources include both `messages/en.json` and `messages/zh.json`, which are required for server-rendered content and SEO metadata.

Prelaunch checks used the repository's `launch-audit` and `security-scan` guides:

| Area | Result |
| --- | --- |
| Responsive | Six public pages checked at 390, 768 and 1440 pixels, without horizontal overflow. |
| Theme | Marketing pages retain the intentionally light Prism Studio design in both application themes. |
| SEO | One H1, title, description and canonical per public page; production origin baked into the Vercel build. |
| Performance | Lab LCP/CLS observations recorded in `launch-browser-audit.json`; images use explicit dimensions and lazy loading below the fold. These are local observations, not field performance claims. |
| Security | Worktree scanner clean; supplied credentials absent from static production output; unauthenticated checkout, generation, admin and cron paths checked. |
| Database | Production adapter transactions verified against the isolated schema; concurrent spend cannot exceed balance, and duplicate returns restore credits once. |
| Build | Production Vercel build and TypeScript check pass. |

## Updates

Builds must use `DATABASE_PROVIDER=postgresql`, `DB_SCHEMA=qwenimage2`, `NITRO_PRESET=vercel` and the production origin. `pnpm build` copies the appropriate schema template before building. Credentials must be set on the hosting platform, not committed.

Do not run a development `db:push` against the shared Neon database. Generate and review a migration before production schema changes. The daily retry cron fits the initial deployment; configure a durable frequent retry schedule if production payments require faster recovery after transient failures.

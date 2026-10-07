# Prism Studio

Independent Qwen Image 2.1 creative workspace built on ShipAny TanStack.

## Local development

Install Node.js 22.12+ and pnpm. Then:

```powershell
pnpm install
Copy-Item .env.example .env.development
# Set AUTH_SECRET to a random value; configure the other values as needed.
pnpm db:push
pnpm rbac:init
pnpm dev
```

Open http://localhost:3000. English is the default; Chinese is available under /zh.
Routes: / (product homepage), /image-generator (creative workspace), /transparent-png, /image-editor, /prompts.
The studio accepts one PNG, JPEG or WebP reference, up to 5 MB.

## Connect real inference

The first version includes a provider-neutral server bridge. It does not assume
that a third-party provider has a particular model slug, price or payload.
Set these **server-only** variables in .env.development (and your production host):

```env
STUDIO_IMAGE_ENDPOINT=https://your-inference-bridge.example/generate
STUDIO_IMAGE_API_KEY=
```

Both are required. The endpoint must use HTTPS, except for a localhost development
bridge. POST requests include an Authorization: Bearer header and this JSON:

```json
{
  "model": "Qwen-Image-2.1",
  "mode": "generate",
  "prompt": "A product photograph...",
  "ratio": "1:1",
  "images": []
}
```

Modes: generate, edit, transparent. Images are inline data URLs. The transparent
mode adds the official RGBA instruction. Your bridge must map this contract to
your chosen provider or a licensed/self-hosted pipeline, and respond synchronously:

```json
{
  "url": "https://your-image-storage.example/result.png",
  "transparent": false
}
```

A PNG data URL is also accepted. For transparent mode, return a real alpha-channel
PNG and transparent: true. The request times out after 180 seconds. Provider-specific
jobs and polling are not implemented in this first version. Remote results open in
a new tab for saving when the browser does not honor cross-origin download.

GET /api/studio/generate exposes only readiness. POST requires an authenticated
session, validates input, and allows one active request per user with a 30-second
interval. The in-memory guard is for a single process; before production add shared
rate limiting and credit/budget enforcement for your inference provider.

Without a configured bridge, generation returns an explicit 503. No mock result
is substituted. Preview artwork was created using the imagegen tool for design
illustration and is not attributed to Qwen Image 2.1.

## Production checklist

- Set VITE_APP_URL to your real domain before building; canonical, hreflang,
  sitemap and social URLs use it.
- Confirm the model/service commercial authorization before enabling paid usage.
- Configure auth, payments, email and storage in /admin/settings as needed.
- Update the inherited legal pages to reflect your actual business and data handling.
- Build with pnpm build. Run the server with pnpm start.
- Point origin to your own Git repository. No commits or deployment are performed.

## Original artwork and SEO

The carousel and prompt examples now use original imagegen artwork: an astronaut cat riding a koi, a miniature ramen city, and a transparent astronaut otter sticker. WebP derivatives live in public/imgs/original; the sticker retains its alpha channel. These images are illustrative, not Qwen model benchmark output. The older reference showcase images are no longer used.

Each tool route has a distinct title, description, localized canonical and hreflang, Open Graph/Twitter metadata, WebSite/WebPage JSON-LD, and route breadcrumbs. The branded 1200x630 share card is public/og/prism-studio.png. Visible FAQ answers include real interface limits and service availability. No fabricated pricing, ratings or model results are included.

## Product homepage

The root route is now an ImagePrompt-inspired product homepage with a large purple headline, four real tool links, alternating original-artwork feature sections, an inspiration gallery, use-case cards and the existing honest FAQ. The generator workspace is retained at /image-generator. Both routes have independent SEO metadata; the localized sitemap includes the new workspace path.

## Expanded prompt library

/prompts now opens with nine original image/prompt pairs and five category filters.
Each card supports full prompt expansion, copying and filling the workspace;
the astronaut otter selects transparent mode. English and Chinese prompt text
is stored in messages/en.json and messages/zh.json. The five new generated images
(cloud-house, rain-portrait, matcha-dessert, fox-library, chrome-sneaker) are WebP
assets under public/imgs/original. Their English prompt text matches the built-in
imagegen input. The displayed results are original illustrative examples from
that tool, not Qwen Image 2.1 inference results or guaranteed output comparisons.

## Thirty additional original images

Added 30 built-in imagegen images (five each of surreal worlds, portraits,
food and drinks, product photography, storybook illustrations and transparent
stickers). The library retains the earlier nine entries, for 39 total. New entries
are interleaved by category and the gallery reveals 12 at a time. All full prompts
are included in the initial HTML; additional images use native lazy loading.
The five new sticker WebPs retain true alpha transparency. Image provenance and
the original English plus Chinese prompt set are saved in
assets/prompt-library/batch-2026-10-06.json; derivatives are in public/imgs/original.
These are illustrative imagegen examples, not Qwen Image 2.1 benchmark results.

## Studio sign-in flow

Browsing the public site and copying prompts require no account. The workspace
opens a branded email/password sign-in dialog when a guest submits a valid prompt.
Registration reuses /sign-up and returns to the originating workspace. The header
shows the signed-in avatar and account menu; signing out restores the guest state.
The generation endpoint checks the session before model readiness and inference.
Login does not automatically spend credits or submit generation.

Before registration, email verification or Google OAuth navigation, the prompt,
mode, ratio and reference image are saved in browser IndexedDB. On return, the
draft is consumed and restored; drafts older than two hours are discarded.
Email/password registration and login work locally. Email verification and password
reset depend on a configured mail provider and appear only when enabled.

Google OAuth wiring is present but not enabled without real credentials. Configure
Google's Web application OAuth client with origin http://localhost:3000 and redirect
URI http://localhost:3000/api/auth/callback/google. In an administrator's authentication
settings, set google_client_id, google_client_secret and google_auth_enabled=true.
Use the production HTTPS domain for both URLs before launch. The client secret is
server-only; the public config reports Google as enabled only with both credentials.
Google's actual provider login cannot be verified until those credentials are supplied.

Verification used temporary local QA accounts, which were deleted afterwards.
Covered registration, successful and failed email login, sign-out, draft restoration
including the uploaded reference, guest API rejection, authenticated service-unavailable
response, desktop/Chinese mobile dialog layout and browser hydration.

## Pricing page preview

/pricing and /zh/pricing use the Prism Studio purple-and-white design and are
linked from the homepage and all tool headers/footers. Included are three plan
cards, a monthly/yearly selector, a comparison table, six dedicated FAQs, and
localized SEO/canonical/hreflang/OG/breadcrumbs plus sitemap entries.

These are proposed launch prices in USD: Explorer $0, Creator $12/month or
$108/year (equivalent $9/month), and Pro $29/month or $288/year (equivalent
$24/month). Proposed credit allowances are 300 and 1,000 monthly respectively.
The preview is defined in src/blocks/studio-pricing.tsx and messages/en.json /
messages/zh.json. Actual model costs and billing rules must be finalized before
launch. Paid buttons display a plan summary; no checkout request or subscription
creation is triggered. No Product/Offer schema advertises these draft plans as
purchasable products. Existing backend payment modules are retained.

## Bailian Qwen Image 2.1 connection

The local workspace now supports STUDIO_IMAGE_PROVIDER=bailian, with
STUDIO_IMAGE_MODEL=qwen-image-2.1-pro and a DashScope synchronous multimodal
endpoint configured via STUDIO_IMAGE_ENDPOINT. STUDIO_IMAGE_API_KEY stays
server-only in the ignored local environment file. The generic bridge contract
remains available via STUDIO_IMAGE_PROVIDER=bridge.

The Bailian adapter maps prompt/reference/ratio to official messages and parameters,
requests one PNG, validates the result host, downloads a bounded PNG and returns
an image data URL. Downloading removes the dependency on expiring provider URLs.
Transparent output is checked against decoded PNG alpha pixels; an opaque image
is rejected for transparent mode. Generation retains login and rate-limit checks.

A real authenticated test passed text-to-image, reference-image editing and native
transparent PNG generation. All results were 1024x1024; temporary QA accounts were
removed afterwards. Raw test outputs and metadata live under ignored .local/
(bailian-results and bailian-functional.json). No API key was placed in client code.
Official reference: https://help.aliyun.com/zh/model-studio/qwen-image-generation-and-editing-api-reference

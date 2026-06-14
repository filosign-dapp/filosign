# `@filosign/astro`

Marketing / SEO site (Astro 6 + Tailwind v4). Migrated from the React client app for better SEO and static generation.

## Commands

From repo root:

- `bun run dev -- --astro` or `bun run --cwd apps/astro dev:local` - dev server ([localhost:3002](http://localhost:3002))
- `bun run astro:build` - production build to `dist/`

From this package:

- `bun run dev` / `bun run build` / `bun run preview`

## Environment Variables

This project uses `@t3-oss/env-core` for type-safe environment variables.

Copy `.env.example` to `.env` and set:

```bash
# Local dev (server :3000, client :3001, astro :3002)
PUBLIC_ASTRO_URL=http://localhost:3002
PUBLIC_CLIENT_URL=http://localhost:3001
PUBLIC_SERVER_URL=http://localhost:3000
```

### Variables

| Variable | Default (local) | Description |
|----------|-----------------|-------------|
| `PUBLIC_ASTRO_URL` | `http://localhost:3002` | Marketing origin - canonical URLs, OG images, sitemap, email static assets |
| `PUBLIC_CLIENT_URL` | `http://localhost:3001` | Help redirects to in-app Support Center |
| `PUBLIC_SERVER_URL` | `http://localhost:3000` | Filosign API base for oRPC (`@filosign/react/orpc` → `/api/rpc`) |

Canonical URLs default from `PUBLIC_ASTRO_URL` + current path in `BaseLayout` unless you pass `canonicalUrl`.

## Pages

All marketing pages migrated from the React app:

| Route | Description |
|-------|-------------|
| `/` | Landing page with Hero, Features Bento, and Stats |
| `/about` | About page with mission, values, and team |
| `/pricing` | Pricing plans with yearly/monthly toggle |
| `/blog` | Blog index - lists posts; hero uses `featured: true` or newest post |
| `/blog/[slug]` | MDX articles under `src/content/blog/` (e.g. `/blog/introduction`) |
| `/changelog` | What's new - feature updates and releases |
| `/docs` | Product docs (Starlight): guides |
| `/docs/workflows` | Agreement workflows overview |
| `/docs/workflows/payouts` | Payout packets user guide |
| `/docs/workflows/attached-files` | Gated file release |
| `/docs/workflows/release-conditions` | Payout and unlock release conditions |
| `/docs/workflows/drafts` | Envelope drafts |
| `/docs/workflows/templates` | Org templates |
| `/docs/workflows/signing-and-routing` | Sign page flow, turn order, quorum |
| `/docs/workflows/envelope-governance` | Void, amend signers, post-send changes |
| `/docs/workflows/comments` | Encrypted draft and envelope comments |
| `/docs/workspace` | Workspace overview (teams, billing, roles) |
| `/docs/security/encrypted-workflows` | Browser encryption and decryption |
| `/docs/proof/e-signature-evidence` | E-signature evidence guide |
| `/docs/proof/completion-packet` | ZIP export contents |
| `/docs/storage/how-retention-works` | Hot storage, Filecoin backup, archival |
| `/docs/plans` | Plans and limits |
| `/docs/plans/roadmap` | Catalog features not shipped yet |
| `/help` | Redirect to in-app Support Center (`PUBLIC_CLIENT_URL/dashboard/support`) |
| `/help/errors/[slug]` | Legacy error help URLs → Support Center topic hash |

### Docs authoring (Starlight)

- Content lives under `src/content/docs/docs/` (Starlight subpath → `/docs/*`).
- Workflow guides live under `src/content/docs/docs/workflows/`; register in `astro.config.mjs` sidebar when adding pages.
- `/docs/stablecoin-payouts` redirects to `/docs/workflows/payouts`.
- `/docs/troubleshooting` redirects to `/help` (Support Center lives in the client app).

### Blog authoring (MDX + content collections)

- Add `src/content/blog/<slug>.mdx` with frontmatter matching `src/content.config.ts` (`title`, `description`, `readingTime`, `dateDisplay`, `publishedISO`, `author`, `heroImage`, optional `heroVideo`, `draft`, `featured`, …).
- **`featured: true`** picks the `/blog` hero (fallback: newest `publishedISO`).
- **`draft: true`** hides the post from build output and listings.
- Add an Open Graph line in `src/content/og-marketing.ts` with key `blog-{slug}` (e.g. `blog-future-of-digital-agreements`) so `/open-graph/blog-{slug}.png` matches meta.
- Article typography: `src/styles/blog-content.css`. **GFM** (tables, etc.) via `gfm: true` on `markdown.processor` and `@astrojs/mdx`.

## CTAs / App Integration

Shared CTAs live in `src/lib/marketing-cta.ts` and `MarketingCtaButtons`:

- **Start Free Trial** → `/pricing`
- **See how it works** → `/#how-it-works` (secondary on most pages)

## Marketing mocks

Decorative product UI panels for landing sections live in [`src/components/marketing-mocks/`](src/components/marketing-mocks/) - not under `islands/` (islands are hydration entry points only).

| Layer | Folder | When to add |
|-------|--------|-------------|
| **Kit** | `kit/` | Reusable visual primitive used 2+ times (panel shell, badge, row, avatar, chip) |
| **Patterns** | `patterns/` | Filosign product concept reused across sections (proof list, payout rule, doc header) |
| **Scenes** | `scenes/<section>/` | One-off assembly for a specific landing block |

Import from the barrel in islands:

```tsx
import { SendStepMock, ProofOutsideMock } from "../marketing-mocks";
```

`MockPanel` variants (`tokens.ts`): `compact` (168px timeline), `default` (192px bento tiles), `auto` (wide cards). Use design tokens only - no hardcoded hex.

## API (oRPC)

Islands call the Filosign server through the typed oRPC client (same wire protocol as `apps/client`):

```tsx
import { FilosignRpcProvider, useFilosignRpc } from "../lib/filosign-rpc";

// Wrap hydrated islands that need the API
<FilosignRpcProvider>
  <MyIsland />
</FilosignRpcProvider>

// Inside the island
const rpc = useFilosignRpc();
await rpc.billing.requestCheckoutLink({ email, planId, interval });
```

Client factory: `@filosign/react/orpc` (`createPublicFilosignOrpcClient`). Server CORS must include `PUBLIC_ASTRO_URL` (see `apps/server/config.ts`).

## Tailwind

Tailwind runs via **PostCSS** (`@tailwindcss/postcss` + `postcss.config.mjs`), not `@tailwindcss/vite`, so builds stay compatible with the workspace's Vite 8 resolution.

Global styles: `src/styles/global.css` (imported from `src/layouts/BaseLayout.astro`).

## SEO

Every page includes:
- Meta title & description
- OpenGraph tags (title, description, image, dimensions, URL) - images are **generated at build** with [astro-og-canvas](https://github.com/delucis/astro-og-canvas) (`src/pages/open-graph/[route].ts`, 1200×630 PNGs under `/open-graph/`). Copy for each card lives in `src/content/og-marketing.ts` and should stay aligned with each page’s `<BaseLayout>` title/description.
- Twitter Card tags (`name=` attributes)
- Canonical URL (`PUBLIC_ASTRO_URL` + path in `BaseLayout`, optional override via `canonicalUrl`)
- JSON-LD (`WebSite`, `Organization`, plus `SoftwareApplication` or `BlogPosting` on blog posts)
- Preconnect hints for external fonts
- `@astrojs/sitemap` (marketing HTML routes only; `/open-graph/*` PNGs are excluded)
- `public/robots.txt` - points crawlers at `sitemap-index.xml` (edit the `Sitemap:` URL if the deploy origin is not `filosign.xyz`)
- `public/llms.txt` - short URL index for AI assistants; `public/llms-full.txt` - extended summaries
- **IndexNow** - `postbuild` runs `scripts/indexnow-ping.ts` (submits sitemap URLs to Bing/Yandex partners). Skips localhost; set `INDEXNOW_SKIP=1` to disable. Key file: `public/8f3c2a1b-4d5e-6f70-8a9b-0c1d2e3f4a5b.txt` (must stay hosted at `/{key}.txt` on the live domain).
- **Performance (landing)** - hero/trust videos defer with `preload="none"` + viewport load (`MotionAwareVideo`); poster at `public/media/demo-poster.webp`; optimized assets `logo-64.webp`, `images/stock_14-760.webp`; Manrope preloaded in `BaseLayout`; cache hints in `public/_headers`.

Direct dependency **`canvaskit-wasm`** is required for OG generation (see astro-og-canvas README).

## Responsive layout

Marketing pages share a shell via [`MarketingPageShell.astro`](src/components/MarketingPageShell.astro): skip link, navbar, section gap, footer.

Horizontal padding uses the `px-page` / `p-page` utilities in [`global.css`](src/styles/global.css) (`px-4` → `sm:px-6` → `md:px-8` → `lg:px-10`). Section width is capped at `90rem` (~1440px) via `marketingMaxWidthClass` in [`marketing-layout.ts`](src/lib/marketing-layout.ts).

- **Navigation:** below `md`, a bottom drawer exposes About / Pricing / Blog / Changelog plus Start free (44px touch targets).
- **Pricing comparison:** desktop table (`lg+`); stacked plan accordions below `lg` (`ComparisonAccordion.tsx`), default open on Teams.

## Animations

AOS (Animate On Scroll) is used for scroll-triggered animations:
- `data-aos="fade-up"` - Most elements
- `data-aos="fade-right/left"` - Split layouts
- `data-aos-delay` - Staggered animations

Configured in `BaseLayout.astro` with 800ms duration and `ease-out-cubic` easing.

## Assets

Static assets (images, videos, fonts) should be copied from `apps/client/public/` to `apps/astro/public/`:

```bash
# Example assets needed
cp apps/client/public/logo.webp apps/astro/public/
cp apps/client/public/demo.webm apps/astro/public/
cp -r apps/client/public/images apps/astro/public/
cp apps/client/public/kartik.jpeg apps/astro/public/
cp apps/client/public/banner.webp apps/astro/public/
```

## Docs

[Astro documentation](https://docs.astro.build)

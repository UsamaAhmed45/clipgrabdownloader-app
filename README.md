# ClipGrab — SEO-first video downloader site

A Next.js (App Router) site built around a controlled, config-driven set of
platform landing pages, with sitemap/robots/JSON-LD generated from that same
config rather than hand-maintained in parallel. See `DESIGN.md` for the
visual design rationale.

**Also in this repo:** `android-app/` — a native Android wrapper (share-sheet
integration, save-to-Gallery, a bottom nav bar) around this website. See
`android-app/README.md` before building or publishing it — it covers a real
Play Store policy risk specific to this kind of app that's worth reading
before you submit anything.

## What's actually implemented vs. stubbed

- **Fully implemented:** site architecture, routing, SEO metadata
  (titles/descriptions/canonicals/OG/Twitter), JSON-LD (Organization,
  WebSite, WebApplication, BreadcrumbList, FAQPage, Article), sitemap.xml,
  robots.txt, PWA manifest, redirects, security headers, an SSRF-hardened
  link-validation boundary, and a working UI end to end.
- **Real extraction, built in, no separate install:**
  `src/app/api/download/route.ts` resolves links via the `btch-downloader`
  npm package (see `src/lib/mediaExtract.ts`) — it's a normal dependency,
  installed automatically by `npm install`, with no binary, no PATH setup,
  and no API key. Covers Instagram, TikTok, YouTube, Facebook, X, and
  Pinterest.

## How downloading works

Nothing to install beyond `npm install` — `btch-downloader` is already a
dependency in `package.json`. Paste a link and it should just work.

**What to expect realistically:**
- These reverse-engineered extraction services are inherently less stable
  than the platforms' own apps — expect some links to fail sometimes, and
  expect that to change over time as platforms and these services adjust
  to each other. That's the nature of this category of tool, not specific
  to this codebase.
- **Hosting environment matters.** These services often block requests
  from datacenter/cloud-provider IP ranges (Vercel, AWS, etc.) more
  aggressively than they block a home internet connection, since that kind
  of traffic pattern is more associated with bot abuse. If it works
  locally on your machine but fails once deployed, that's very likely why
  — test carefully.
- Instagram is generally the flakiest of the six — Meta changes its
  internal endpoints often, and this kind of extractor tends to break and
  get fixed on a cycle.
- Only returns formats that are already complete files (video+audio
  together, or audio-only) — nothing here merges separate video/audio
  streams, so extremely high-resolution YouTube formats that only exist
  split won't show up.
- Nothing here bypasses a private account, an age gate, or a login wall —
  it only works with content that's already accessible without logging in.

**Keeping it working:** update the package periodically —
```bash
npm update btch-downloader
```
— since these extractors need regular fixes as platforms change.

**Alternative: yt-dlp.** `src/lib/ytdlp.ts` contains a self-hosted
alternative built around the well-established open-source `yt-dlp` tool,
run as a subprocess — it's not wired into the route by default anymore
(swapped out in favor of the zero-install npm option above), but the code
is still there if you'd rather run that instead. Swap the import in
`src/app/api/download/route.ts` from `extractMedia` (mediaExtract.ts) to
`extractWithYtDlp` (ytdlp.ts) to switch back; it needs the `yt-dlp` binary
installed separately (`winget install yt-dlp` on Windows, `brew install
yt-dlp` on macOS).

**Prefer a hosted/paid API instead?** Either file can be swapped for a call
to a licensed provider — the rest of the pipeline (token creation, file
streaming) stays the same regardless of which extraction method feeds it.

## Installation

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev
```

## Environment variables

Set these in `.env.local` for development and in your hosting provider's
environment settings for production (see `.env.example` for the full list
with comments): `SITE_URL`, `SITE_NAME`, `SITE_SHORT_NAME`,
`SITE_DESCRIPTION`, `DEFAULT_OG_IMAGE`, `TWITTER_HANDLE`,
`GOOGLE_SITE_VERIFICATION`, `CONTACT_EMAIL`, `YTDLP_PATH` (optional).

`SITE_URL` in particular must be the real production origin before you
deploy — it feeds every canonical URL, the sitemap, robots.txt, and every
JSON-LD `url` field. Never hard-code a domain elsewhere in the codebase.

## Fonts

This scaffold ships with a CSS-only fallback font stack
(`src/app/globals.css`, `--font-display` / `--font-sans`) because the
sandbox this was built in has no network access to fonts.googleapis.com. In
a normal environment, restore the intended pairing from `DESIGN.md`
(Fraunces for display, Inter for body) with `next/font/google` in
`src/app/layout.tsx`, or self-host with `next/font/local` if you'd rather
not depend on Google Fonts at request time. Either approach plugs straight
into the existing `--font-display` / `--font-sans` CSS variables — no other
files need to change.

## A note on scope: running this for real

Whatever extraction path you use (the built-in yt-dlp option above or a
hosted provider), keep in mind before you put this in front of real
traffic:

- Complies with each source platform's Terms of Service and applicable law
  in your jurisdiction — video-downloading tools sit in a legally gray area
  in some jurisdictions and outright violate platform ToS in most cases,
  even though the practice is common.
- Only ever fetches content that's genuinely public (the link validator
  already rejects anything off the supported-host allowlist before it
  would reach an extractor — see `src/lib/validateLink.ts`).
- Is rate-limited and abuse-protected at the infra layer (see "Security"
  below) before it goes live, since `/api/download` will be the most
  abuse-prone part of the app once it actually works.

## Adding a new platform

1. Add an entry to the `platforms` array in `src/config/platforms.ts` with
   real example URLs, genuinely unique `intro`/`howTo`/`troubleshooting`/
   `faq` content (not a find-and-replace of another platform's copy — see
   the comment at the top of that file), and `published: false` while
   you're drafting it.
2. Once the content is real and complete, flip `published: true`. This
   single flag controls whether the page shows up in navigation, the
   homepage grid, `sitemap.xml`, and `generateStaticParams` — there's
   nothing else to wire up.
3. If the new platform overlaps heavily with an existing one (a rebrand, a
   near-duplicate brand name), consider a redirect via `redirectTo` in the
   platform entry (see the `twitter-video-downloader` → `x-video-downloader`
   entry) instead of publishing two thin, near-identical pages.
4. Add the domain(s) it accepts links from to `ALLOWED_HOSTS` in
   `src/lib/validateLink.ts`.

## Adding a new SEO/static page

Add a folder under `src/app/`, export `metadata` via `buildMetadata()` from
`src/lib/seo.ts` (don't hand-write metadata inline — that's how duplicate
titles/descriptions creep in), and add the route to `getIndexableRoutes()`
in `src/config/routes.ts` so it's picked up by the sitemap.

## Adding a blog article

Add an entry to `blogPosts` in `src/config/blog.ts` with a real author and
publication date — never fabricate either. Set `published: true` once the
`body` is finished; unpublished drafts won't render or appear in the
sitemap.

## SEO validation

```bash
npm run build && npm run start &
npm run validate:seo -- http://localhost:3000
```

Checks every page for missing/duplicate titles, missing/duplicate meta
descriptions, missing canonicals, missing or multiple `<h1>`s, missing
`og:image`, images without `alt`, and validates that `sitemap.xml` and
`robots.txt` are reachable and well-formed. Exits non-zero on any failure,
so it can gate a CI build.

## Production deployment

1. Set the real environment variables listed above wherever you host (e.g.
   Vercel project settings) — **`SITE_URL` above all**. These are build-time
   values baked into the static pages (see "Environment variables" above),
   so they must be set in your host's environment *before* the build runs,
   not just in a local `.env.local` that never reaches the server.
2. `npm run build` — this statically generates every published platform
   page and blog post via `generateStaticParams`.
3. Point DNS at your host and confirm `SITE_URL` matches the domain you
   actually serve from before going live — a mismatch here silently breaks
   canonicals and the sitemap.
4. Normalize `http → https` and `www ↔ non-www` at your CDN/edge layer
   (see the comment in `next.config.ts` — this needs to run before the app
   boots, so it belongs at that layer, not in application code).
5. **After every deploy**, run the SEO validator against the live URL, not
   just localhost:
   ```bash
   node scripts/validate-seo.mjs https://www.yourrealdomain.com
   ```
   This is the one check that actually catches a forgotten `SITE_URL`: if
   it was never set on the host, every page's canonical/og:url/og:image
   silently falls back to `http://localhost:3000` even though the page is
   live on your real domain — invisible by just looking at the site in a
   browser, but devastating for indexing and completely breaks every social
   share preview. The validator will fail loudly with exactly that
   diagnosis if it happens.

## Google Search Console

1. Verify the domain (Search Console → Settings → Ownership verification).
   This project is already verified via the **HTML file method**:
   `public/google7d9f4628c61028e1.html` — don't delete it, it needs to stay
   reachable at `https://YOURDOMAIN.com/google7d9f4628c61028e1.html`
   permanently, or Search Console will drop the verification. (The DNS
   method or the `GOOGLE_SITE_VERIFICATION` env var — already wired into
   `<meta name="google-site-verification">` via `src/app/layout.tsx` — both
   work too, if you'd rather switch methods later.)
2. Submit `https://YOURDOMAIN.com/sitemap.xml` under Sitemaps.
3. Use URL Inspection on the homepage and a couple of platform pages to
   confirm they're indexed as expected.
4. Check the Pages report periodically for unexpected `noindex`d or
   excluded URLs.
5. Check Core Web Vitals under Experience for real-user LCP/INP/CLS.
6. Check Search Results under Performance for the queries actually driving
   clicks — use this to prioritize which platform pages get expanded first.

## Analytics

None is wired up by default. If you add one, keep it optional/configurable,
load it without blocking rendering (e.g. Next.js `<Script strategy="afterInteractive">`),
and document exactly what it collects in `src/app/privacy/page.tsx` before
you turn it on — that page currently has a placeholder note for this.

## Security

- `src/lib/validateLink.ts` is the SSRF/abuse boundary: only `http(s)` URLs
  on an explicit host allowlist are accepted before anything downstream
  runs.
- `/api/` is disallowed in `robots.txt` and has no canonical/indexable URL,
  so download-result data never ends up in the sitemap.
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`) are set in `next.config.ts`.
- `src/lib/rateLimit.ts` throttles `/api/download` per IP (6 requests per
  30s, in-memory). This catches accidental request storms — double-clicks,
  rapid retries — before they trip the upstream extraction service's own
  abuse detection. It's in-memory and per-instance, so a production
  deployment behind a CDN/load balancer should still add rate limiting at
  that layer too.

## Reliability notes

- Extraction requests have a hard 20s timeout, and file downloads a 45s
  timeout — both fail with a clear message instead of leaving the person
  staring at a spinner indefinitely.
- Download buttons fetch the file via JavaScript (not a plain link) so a
  failure — an expired token, a source that went down — shows an inline
  error message instead of navigating the whole tab to a raw JSON error
  page.
- The download form guards against double-submission (both the button
  disabling and an internal ref-based lock), and failed downloads show a
  "Try again" button that resubmits without retyping the link.

## On SEO and rankings

Everything in this codebase that's a real, controllable technical SEO
lever is implemented: unique titles/descriptions per page, canonicals,
sitemap.xml with honest `lastmod` values (only set from real dates, never
fabricated), robots.txt, JSON-LD, Open Graph, a blog RSS feed, semantic
HTML, and reasonably fast, mostly-static pages. None of that can guarantee
a specific ranking or "always show up first" for a given search — that
also depends on domain age, backlinks, ongoing content, and how strong the
competition is for that query, none of which a codebase controls on its
own. Treat the technical side as the foundation; ranking well over time
still needs real content growth (more blog posts, more depth per platform
page) and, typically, other sites linking to yours.

## Testing

`npx tsc --noEmit` for type checking, `npm run lint` for ESLint, and
`npm run validate:seo` (against a running build) for the SEO checks above.
No component/e2e test suite is set up yet — add Playwright or Vitest if you
want one; the SEO validator intentionally stays framework-agnostic (plain
`fetch` + regex) so it can run against any deployment, not just this
codebase.

## Project structure

```
src/
  app/                 routes (App Router), sitemap.ts, robots.ts, manifest.ts
    [platform]/        controlled dynamic platform-page route
    blog/[slug]/        blog article route
    api/download/       link validation + extraction stub
  components/
    seo/                JsonLd renderer
    ui/                 Header, Footer, DownloadForm, ThemeToggle
  config/
    site.ts             env-driven site config
    platforms.ts         controlled platform content list (single source of truth)
    blog.ts              blog post content
    routes.ts             indexable-route registry (feeds sitemap.ts)
  lib/
    seo.ts               buildMetadata() — one call site per page
    jsonld.ts             JSON-LD builders
    validateLink.ts        SSRF/allowlist boundary
scripts/
  validate-seo.mjs       automated SEO checklist, see "SEO validation"
DESIGN.md                visual design plan/rationale
```

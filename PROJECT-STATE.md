# ClipGrab Downloader — Full Project State

Website: https://www.clipgrabdownloader.com/
Stack: Next.js 16 (App Router), TypeScript, Tailwind CSS, deployed on Vercel.

## What this project does

A video downloader supporting 8 platforms. Paste a public video link, get
back downloadable formats, click to save. No login required for any
supported platform — everything here works on content that's already
publicly viewable without authentication.

## Architecture

```
User pastes URL
  → Frontend (DownloadForm.tsx) — multi-job download queue
  → POST /api/download — validates, detects platform, calls adapter
  → src/lib/adapters/{platform}.ts — one file per platform
  → Returns format list + tokens (never raw upstream URLs to the client)
  → GET /api/download/file?token=... — streams the actual file
  → Real byte-tracked progress in the browser
```

### Platform adapters (`src/lib/adapters/`)

| Platform  | File           | Method                                    | Notes |
|-----------|----------------|--------------------------------------------|-------|
| Instagram | instagram.ts   | btch-downloader (unofficial extraction)    | thumbnail available |
| TikTok    | tiktok.ts      | btch-downloader                            | thumbnail available |
| YouTube   | youtube.ts     | btch-downloader                            | author + thumbnail available |
| Facebook  | facebook.ts    | btch-downloader + custom /share/ link resolver | no metadata beyond video URLs |
| X         | x.ts           | btch-downloader                            | no metadata beyond title/URL |
| Pinterest | pinterest.ts   | btch-downloader + HLS-manifest filtering   | thumbnail available; filters out .m3u8 (unplayable) URLs |
| Threads   | threads.ts     | btch-downloader                            | thumbnail for video posts |
| Reddit    | reddit.ts      | **Reddit's own official public `.json` endpoint** — not unofficial scraping | video-only (Reddit stores audio as a separate track; no muxing done) |

Adding a platform = one new adapter file + one registry line in
`src/lib/mediaExtract.ts`. Nothing else needs to change.

**Deliberately NOT supported**: Vimeo, Dailymotion, Twitch, Snapchat,
LinkedIn — no adapters exist for these because none of them have a public
data format like Reddit's, and writing unofficial scrapers for them
wasn't done just to inflate the platform count.

**Deliberately NOT supported, and won't be**: private accounts,
friends-only content, DRM-protected content, or anything requiring
bypassing a platform's access controls. This is a firm line, not a gap —
see `src/config/platforms.ts` and the "public-vs-private" blog post for
the reasoning.

## Security

- `src/lib/validateLink.ts` — strict exact-hostname allowlist on the
  *submitted* URL (protocol + domain), derived from published platforms
- `src/lib/ssrfGuard.ts` — checks the *upstream* URL an adapter returns:
  blocks non-http(s) protocols and literal private/loopback/link-local
  IP addresses. **Does NOT do a DNS lookup** — an earlier version did,
  and it caused real false-positive failures on legitimate CDN domains
  (some networks/ISPs transparently proxy media traffic, which can make
  a real hostname resolve to a private-range IP as a side effect of
  routing, not because anything is unsafe)
- `src/lib/rateLimit.ts` — per-operation limits: resolve requests and
  actual file downloads are tracked in separate buckets, downloads
  limited more strictly since they're the more expensive operation
- `src/lib/filename.ts` — sanitizes filenames from untrusted
  platform-supplied titles: strips path traversal characters entirely
  (not by pattern-matching `..`, by only allowing a safe character set),
  blocks Windows reserved device names (CON, PRN, etc.), truncates length
- `src/app/api/download/file/route.ts` — validates every format URL is a
  genuine absolute http(s) URL *before* creating a download token,
  filters out HLS manifest (.m3u8) URLs (unplayable as a direct
  download), wrapped in a top-level try/catch so any unexpected error
  returns clean JSON instead of crashing

## Frontend — download queue (`src/components/ui/DownloadForm.tsx`)

Full multi-job queue architecture (`src/lib/downloadQueue.ts` has the
pure, unit-tested logic):
- Submit multiple different URLs — each becomes an independent job,
  analyzed concurrently, not overwriting each other
- Duplicate URL detection (using the same `urlNormalize.ts` the server
  uses, so tracking-param variants of the same link are caught)
- Download concurrency capped at `MAX_CONCURRENT_DOWNLOADS` (2), extra
  jobs queue automatically (FIFO, no starvation) and start when a slot
  frees up
- Real per-job cancel (`AbortController`), bounded auto-retry for
  transient failures only (not for permanent ones like expired tokens)
- Real byte-tracked progress (Content-Length based), not a fake timer
- Drag-and-drop URL support
- Client-side download history (localStorage, capped at 50 entries) —
  title, platform (derived from the URL's own hostname), filename,
  timestamp, status; "Clear history" button
- Metadata (author/thumbnail) shown only when the adapter genuinely
  returned it — never fabricated placeholders

## SEO

- `src/config/platforms.ts` is the single source of truth — sitemap,
  metadata, and navigation are all generated from it, nothing hand-duplicated
- Runtime duplicate-slug detection that **fails the build** if two
  platform entries share a slug (this caught a real bug once already —
  a stale unpublished stub silently shadowing real content)
- `scripts/validate-seo.mjs` — checks titles, descriptions, canonicals,
  OG tags, alt text, and that every page's canonical/OG URL actually
  matches the domain it's served from (catches a misconfigured
  `SITE_URL` — this was a real production bug earlier in the project)
- 8 blog posts covering real search intent per platform + general topics
  (private vs. public, quality/resolution, watermarks)

## Testing

- `npm run test:security` (`scripts/test-security.ts`, run via `tsx`) —
  42 tests against the *actual* production modules (not reimplemented
  copies): SSRF guard, URL normalization, rate limiter, filename
  sanitization, download queue logic
- `npm run test:links` (`scripts/test-real-links.mjs`) — the one test
  that can verify real downloads work; requires filling in real links
  since no sandboxed environment can reach these platforms
- `npm run validate:seo` — SEO/metadata validator against a live server

## Known, real bugs found and fixed (chronological, for context)

1. `SITE_URL` not set on Vercel → every canonical/sitemap URL pointed at
   `localhost:3000` in production. Fixed by setting the env var; a
   separate Vercel build-cache quirk required editing the sitemap file
   directly to force a fresh build.
2. YouTube downloads failing — no `Referer` header sent when fetching
   the actual file; several CDNs (YouTube's especially) reject requests
   without one matching the platform's own domain.
3. Pinterest videos "downloading" as broken files — Pinterest commonly
   serves video as HLS manifests (`.m3u8`), which aren't a single
   downloadable file; now filtered out before being offered as a format.
4. SSRF guard false-positiving on legitimate CDN domains (Pinterest, X)
   due to a DNS-resolution check that doesn't hold up against real-world
   network conditions (transparent proxying). Removed the DNS-lookup
   step, kept the zero-false-positive literal-IP checks.
5. A genuine race condition in the download queue: clicking multiple
   "ready" downloads in the same tick could exceed the concurrency limit
   because a stale ref was read before a previous state update
   committed. Fixed with an atomic `setJobs` updater; verified with a
   real browser test that could reproduce the race.
6. An "Invalid URL" crash — X's extractor occasionally returns a
   malformed URL; my own diagnostic logging assumed every URL was
   well-formed and crashed on it. Fixed the logging, and added upfront
   validation so any adapter returning a bad URL fails cleanly instead
   of creating a token that's guaranteed to crash later.
7. A persistent hydration error — confirmed via research to be a known
   Turbopack (Next.js 16's default bundler) bug, not a code issue.
   `npm run dev` now uses `--webpack` by default as a workaround.

## What's honestly still open

- **Duration and file size** are not shown anywhere — no adapter's
  underlying data includes them, and nothing is fabricated to fill the
  gap
- **Global queue pause/resume** — not built; a genuine pause of an
  in-flight streamed download isn't meaningfully implementable without
  HTTP Range-based resume, which also isn't built. Cancel + manual retry
  covers the real use case
- **Reddit videos have no audio** — Reddit stores it as a separate
  track; combining them needs server-side muxing (ffmpeg), not currently
  implemented
- **Third-party extraction reliability** — Instagram/TikTok/YouTube/
  Facebook/X/Pinterest/Threads all depend on the `btch-downloader` npm
  package, which talks to an unofficial, free, shared backend service.
  Its uptime and speed are outside this project's control; retries and
  generous timeouts are the mitigation, not a guarantee
- **Play Store submission risk** — if an Android app version of this is
  ever published, YouTube downloading specifically violates Google
  Play's policy outright; see `android-app/README.md` for the full
  writeup if that project gets picked back up

## Where things live if you need to change something

- Add a platform → `src/lib/adapters/`, `src/lib/mediaExtract.ts`,
  `src/lib/validateLink.ts` (allowed hosts), `src/config/platforms.ts`
  (page content), `src/components/ui/PlatformIcon.tsx` (icon)
- Change SEO copy → `src/config/platforms.ts`, `src/config/blog.ts`
- Change security rules → `src/lib/ssrfGuard.ts`, `src/lib/rateLimit.ts`,
  `src/lib/validateLink.ts`
- Change the download experience → `src/components/ui/DownloadForm.tsx`,
  `src/lib/downloadQueue.ts`

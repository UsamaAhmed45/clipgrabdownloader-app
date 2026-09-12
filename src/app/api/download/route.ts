import { NextRequest, NextResponse } from "next/server";
import { validateSubmittedLink } from "@/lib/validateLink";
import { extractMedia } from "@/lib/mediaExtract";
import { createDownloadToken } from "@/lib/downloadTokens";
import { isRateLimited } from "@/lib/rateLimit";
import { buildSafeFilename } from "@/lib/filename";

export const dynamic = "force-dynamic";

/**
 * This endpoint is intentionally NOT crawlable — see robots.ts, which
 * disallows /api/. Download-result data is per-request and has no
 * canonical indexable URL, so it must never appear in the sitemap either
 * (see SEO checklist: "No download-result URLs in sitemap").
 *
 * Rate limiting: a lightweight in-memory per-IP limiter (src/lib/
 * rateLimit.ts) guards against accidental request storms (double-clicks,
 * rapid retries) that would otherwise trip the upstream extraction
 * service's own abuse detection. A production deployment behind a CDN
 * should still add rate limiting at that layer too — this one resets on
 * restart and doesn't share state across multiple server instances.
 *
 * Extraction: resolved via the btch-downloader npm package (src/lib/
 * mediaExtract.ts) — installed as a normal dependency, no separate binary
 * or PATH setup required. See README "How downloading works" for the
 * yt-dlp-based alternative if you'd rather self-host that instead.
 */

// Sent as the Referer header when the file itself is fetched (see
// downloadTokens.ts and the file route). YouTube's CDN in particular is
// known to reject a request whose Referer doesn't match youtube.com, even
// for an otherwise-valid signed URL — this is what was causing YouTube
// downloads specifically to resolve fine but fail right after.
const REFERER_BY_PLATFORM: Record<string, string> = {
  "youtube-video-downloader": "https://www.youtube.com/",
  "instagram-video-downloader": "https://www.instagram.com/",
  "facebook-video-downloader": "https://www.facebook.com/",
  "tiktok-video-downloader": "https://www.tiktok.com/",
  "x-video-downloader": "https://x.com/",
  "pinterest-video-downloader": "https://www.pinterest.com/",
  "threads-video-downloader": "https://www.threads.net/",
  "reddit-video-downloader": "https://www.reddit.com/",
};

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return `resolve:${forwarded?.split(",")[0]?.trim() || "unknown"}`;
}

function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function resolveWithProvider(url: URL, platformSlug: string) {
  try {
    const result = await extractMedia(platformSlug, url.toString());

    const referer = REFERER_BY_PLATFORM[platformSlug];
    // Every adapter's returned format URL is validated before a download
    // token is ever created for it — an adapter occasionally getting a
    // malformed or non-absolute URL back from its upstream source is a
    // real, observed failure mode (X's extractor has done this), and
    // catching it here means the person sees a clean "no valid format"
    // message immediately, instead of a token that's guaranteed to crash
    // later when the file route tries to fetch a URL that was never
    // valid in the first place.
    const formats = result.formats
      .filter((f) => isAbsoluteHttpUrl(f.url))
      .slice(0, 6)
      .map((f) => ({
        label: f.label,
        token: createDownloadToken(f.url, buildSafeFilename(result.title, f.ext), referer),
      }));

    if (formats.length === 0) {
      return {
        status: "extraction_failed" as const,
        platformSlug,
        message: "No downloadable format was found for this link. It may be private, live, or unsupported.",
      };
    }

    return {
      status: "ready" as const,
      platformSlug,
      title: result.title,
      formats,
      author: result.author,
      thumbnail: result.thumbnail,
    };
  } catch (err) {
    if (err instanceof Error && err.message === "UNSUPPORTED_PLATFORM") {
      return {
        status: "provider_not_configured" as const,
        platformSlug,
        message: "This platform isn't wired up to an extractor yet.",
      };
    }
    if (err instanceof Error && err.message === "EXTRACTION_TIMEOUT") {
      return {
        status: "extraction_failed" as const,
        platformSlug,
        message: "This is taking too long — the source may be slow or temporarily down. Try again in a moment.",
      };
    }
    return {
      status: "extraction_failed" as const,
      platformSlug,
      message: "Couldn't process that link — it may be private, region-locked, or the platform changed its page format.",
    };
  }
}

export async function POST(request: NextRequest) {
  if (isRateLimited(clientKey(request))) {
    return NextResponse.json(
      { error: "Too many requests in a short time — wait a few seconds and try again." },
      { status: 429 }
    );
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const raw = body.url ?? "";
  if (!raw) {
    return NextResponse.json({ error: "Missing url." }, { status: 400 });
  }

  const validated = validateSubmittedLink(raw);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.reason }, { status: 422 });
  }

  const result = await resolveWithProvider(validated.url, validated.platformSlug);
  return NextResponse.json(result, { status: 200 });
}

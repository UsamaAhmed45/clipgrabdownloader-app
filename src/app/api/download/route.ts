import { NextRequest, NextResponse } from "next/server";
import { validateSubmittedLink } from "@/lib/validateLink";
import { extractMedia } from "@/lib/mediaExtract";
import { createDownloadToken } from "@/lib/downloadTokens";
import { isRateLimited } from "@/lib/rateLimit";

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
function filenameFor(title: string, ext: string) {
  const safe = title.replace(/[^\w\-\s]/g, "").trim().slice(0, 80) || "media";
  return `${safe}.${ext}`;
}

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

async function resolveWithProvider(url: URL, platformSlug: string) {
  try {
    const result = await extractMedia(platformSlug, url.toString());

    if (result.formats.length === 0) {
      return {
        status: "extraction_failed" as const,
        platformSlug,
        message: "No downloadable format was found for this link. It may be private, live, or unsupported.",
      };
    }

    const formats = result.formats.slice(0, 6).map((f) => ({
      label: f.label,
      token: createDownloadToken(f.url, filenameFor(result.title, f.ext)),
    }));

    return {
      status: "ready" as const,
      platformSlug,
      title: result.title,
      formats,
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

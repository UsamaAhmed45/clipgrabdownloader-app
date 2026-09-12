import { NextRequest, NextResponse } from "next/server";
import { resolveDownloadToken } from "@/lib/downloadTokens";
import { isRateLimited } from "@/lib/rateLimit";
import { checkUrlIsSafeToFetch } from "@/lib/ssrfGuard";

export const dynamic = "force-dynamic";

/**
 * Streams the actual file to the browser. Deliberately takes an opaque
 * token, never a raw URL — the real upstream URL only ever lives
 * server-side (see src/lib/downloadTokens.ts), so this can't be used as an
 * open proxy for arbitrary URLs.
 */

// Extension → MIME type, used to set Content-Type ourselves rather than
// trust whatever the upstream CDN reports. Some upstream responses come
// back with a generic/incorrect content-type (e.g. application/
// octet-stream, or even text/plain from a proxy layer) — if that generic
// type reaches Android's DownloadManager, the saved file gets registered
// with the wrong MIME type, and tapping it later can open a text/hex
// viewer instead of a video player even though the file itself is a
// perfectly valid video. Deriving it from the extension we ourselves
// chose (see mediaExtract.ts) is more reliable than trusting the network.
const MIME_BY_EXTENSION: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
};

function mimeForFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[ext] ?? "application/octet-stream";
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "invalid-url";
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// A real browser/WebView navigation (as opposed to our own DownloadForm's
// fetch() call) sends Accept: text/html — that's exactly what happens
// inside the Android app, which deliberately does a plain navigation
// here instead of a fetch so Android's native download system can catch
// it (see src/lib/androidBridge.ts). Without this, an error response
// (expired token, upstream failure) would render as raw unstyled JSON
// text with no way back, which is what was happening.
function wantsHtml(request: NextRequest): boolean {
  return (request.headers.get("accept") ?? "").includes("text/html");
}

function errorResponse(request: NextRequest, message: string, status: number) {
  if (!wantsHtml(request)) {
    return NextResponse.json({ error: message }, { status });
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Download problem</title>
<style>
  body { margin: 0; font-family: -apple-system, "Segoe UI", Roboto, sans-serif; background: #F7F6F3; color: #12141A; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
  .card { max-width: 420px; text-align: center; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p { color: #6B6A64; line-height: 1.5; margin: 0 0 24px; }
  button, a.btn { display: inline-block; background: linear-gradient(100deg, #2FCFFF, #1E63EE 60%, #123FB8); color: #fff; border: none; border-radius: 10px; padding: 12px 22px; font-size: 15px; font-weight: 600; cursor: pointer; text-decoration: none; }
</style>
</head>
<body>
  <div class="card">
    <h1>Couldn't finish that download</h1>
    <p>${escapeHtml(message)}</p>
    <button onclick="if (history.length > 1) { history.back(); } else { location.href = '/'; }">Go back</button>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(request: NextRequest) {
  try {
    return await handleFileDownload(request);
  } catch (err) {
    // A safety net around the whole handler — without this, an
    // unexpected exception anywhere above (a malformed URL, a
    // programming error) produces Next's own raw error response instead
    // of JSON, which the client can't parse — that's what was showing up
    // as an unhelpful generic "this link stopped working" message with
    // no real detail. Now it's always at least a real, logged reason.
    console.error("[download/file] Unhandled error:", err instanceof Error ? err.message : err);
    return errorResponse(request, "Something went wrong on our end. Please try again.", 500);
  }
}

async function handleFileDownload(request: NextRequest): Promise<Response> {
  const forwarded = request.headers.get("x-forwarded-for");
  const clientIp = forwarded?.split(",")[0]?.trim() || "unknown";

  // A separate, stricter budget from link-resolution (see
  // src/app/api/download/route.ts) — every request here is a real
  // outbound fetch of someone else's file through this server, which is
  // the more expensive operation actually worth limiting harder.
  if (isRateLimited(`download:${clientIp}`, { windowMs: 60_000, maxRequests: 10 })) {
    return errorResponse(request, "Too many downloads from this connection right now. Please wait a moment and try again.", 429);
  }

  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return errorResponse(request, "Missing download token.", 400);
  }

  const entry = resolveDownloadToken(token);
  if (!entry) {
    return errorResponse(request, "This download link expired. Go back and submit the link again.", 410);
  }

  // Defense-in-depth: an HLS manifest (.m3u8) is a text playlist of
  // segment URLs, not a single video file — streaming one through here
  // as if it were an mp4 would silently hand back a tiny broken file
  // that looks like a successful download but won't play. The
  // extractors are meant to filter these out before creating a token
  // (see mediaExtract.ts's Pinterest handling), but this check exists so
  // that a future extractor change can't reintroduce the same bug
  // unnoticed.
  if (/\.m3u8(\?|$)/i.test(entry.url)) {
    return errorResponse(
      request,
      "This video is only available as a streaming format we can't save as a file yet. Try a different quality option, or check back later.",
      422
    );
  }

  // The URL being fetched here came from an upstream extraction source
  // (see src/lib/adapters), not from the person using the site directly —
  // but this server is still the one making the outbound request, so it
  // gets the same scrutiny as any other server-side fetch of an
  // externally-supplied URL. See ssrfGuard.ts for what this actually
  // checks (protocol, literal private/loopback addresses, and where the
  // hostname really resolves to).
  const ssrfCheck = await checkUrlIsSafeToFetch(entry.url);
  if (!ssrfCheck.safe) {
    console.error(`[download/file] SSRF check rejected upstream URL: ${ssrfCheck.reason} (host: ${safeHostname(entry.url)})`);
    return errorResponse(request, "This download source couldn't be verified as safe. Please try again.", 502);
  }

  let upstream: Response;
  try {
    upstream = await fetch(entry.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        ...(entry.referer ? { Referer: entry.referer } : {}),
      },
      // Connecting to the upstream CDN shouldn't hang indefinitely — fail
      // within 20s so the browser gets a clear error instead of spinning.
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    console.error(`[download/file] Upstream fetch threw for host ${safeHostname(entry.url)}:`, err instanceof Error ? err.message : err);
    return errorResponse(request, "Couldn't reach the source server. It may be slow or down — try again.", 502);
  }

  if (!upstream.ok || !upstream.body) {
    console.error(`[download/file] Upstream returned non-ok for host ${safeHostname(entry.url)}: status ${upstream.status} ${upstream.statusText}`);
    return errorResponse(request, "The source server refused this download.", 502);
  }

  const headers = new Headers();
  headers.set("Content-Type", mimeForFilename(entry.filename));
  headers.set("Content-Disposition", `attachment; filename="${entry.filename}"`);
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);

  return new NextResponse(upstream.body, { headers });
}

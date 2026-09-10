import { NextRequest, NextResponse } from "next/server";
import { resolveDownloadToken } from "@/lib/downloadTokens";

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
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return errorResponse(request, "Missing download token.", 400);
  }

  const entry = resolveDownloadToken(token);
  if (!entry) {
    return errorResponse(request, "This download link expired. Go back and submit the link again.", 410);
  }

  let upstream: Response;
  try {
    upstream = await fetch(entry.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      },
      // Connecting to the upstream CDN shouldn't hang indefinitely — fail
      // within 20s so the browser gets a clear error instead of spinning.
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return errorResponse(request, "Couldn't reach the source server. It may be slow or down — try again.", 502);
  }

  if (!upstream.ok || !upstream.body) {
    return errorResponse(request, "The source server refused this download.", 502);
  }

  const headers = new Headers();
  headers.set("Content-Type", mimeForFilename(entry.filename));
  headers.set("Content-Disposition", `attachment; filename="${entry.filename}"`);
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);

  return new NextResponse(upstream.body, { headers });
}

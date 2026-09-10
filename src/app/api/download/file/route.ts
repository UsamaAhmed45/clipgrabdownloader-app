import { NextRequest, NextResponse } from "next/server";
import { resolveDownloadToken } from "@/lib/downloadTokens";

export const dynamic = "force-dynamic";

/**
 * Streams the actual file to the browser. Deliberately takes an opaque
 * token, never a raw URL — the real upstream URL only ever lives
 * server-side (see src/lib/downloadTokens.ts), so this can't be used as an
 * open proxy for arbitrary URLs.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const entry = resolveDownloadToken(token);
  if (!entry) {
    return NextResponse.json(
      { error: "This download link expired. Go back and submit the link again." },
      { status: 410 }
    );
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
    return NextResponse.json({ error: "Couldn't reach the source server. It may be slow or down — try again." }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "The source server refused this download." }, { status: 502 });
  }

  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") ?? "application/octet-stream");
  headers.set("Content-Disposition", `attachment; filename="${entry.filename}"`);
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);

  return new NextResponse(upstream.body, { headers });
}

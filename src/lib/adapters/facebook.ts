import { fbdown } from "btch-downloader";
import type { ExtractedFormat, ExtractedMedia } from "./types";
import { checkUrlIsSafeToFetch } from "../ssrfGuard";

export async function extractFacebook(url: string): Promise<ExtractedMedia> {
  const resolvedUrl = await resolveFacebookShareLink(url);
  const res = await fbdown(resolvedUrl);
  const formats: ExtractedFormat[] = [];

  if (res.HD) formats.push({ label: "HD · MP4", url: res.HD, ext: "mp4" });
  if (res.Normal_video) formats.push({ label: "SD · MP4", url: res.Normal_video, ext: "mp4" });

  if (formats.length === 0) throw new Error("NOT_FOUND");
  return { title: "Facebook video", formats };
}

/**
 * Facebook's newer "facebook.com/share/..." links are short redirect
 * URLs, not the canonical post/video URL — the extractor needs the real
 * URL (e.g. .../videos/123..., .../reel/123...) to work. This just
 * follows the HTTP redirect chain, the same thing a browser does when
 * you paste the link in — not a scraping workaround, standard redirect
 * resolution.
 */
async function resolveFacebookShareLink(url: string): Promise<string> {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return url;
  }
  if (!target.pathname.startsWith("/share/")) return url;

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      },
      signal: AbortSignal.timeout(8_000),
    });
    const resolved = res.url || url;
    // facebook.com's own redirect should always land somewhere on
    // facebook.com — checking the final destination costs nothing and
    // means a compromised or unexpected redirect target can't quietly
    // turn this into a request to an internal address.
    const safety = await checkUrlIsSafeToFetch(resolved);
    return safety.safe ? resolved : url;
  } catch {
    return url;
  }
}

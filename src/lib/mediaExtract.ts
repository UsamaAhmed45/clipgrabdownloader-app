import { igdl, ttdl, youtube, fbdown, twitter, pinterest } from "btch-downloader";

export interface ExtractedFormat {
  label: string;
  url: string;
  ext: string;
}

export interface ExtractedMedia {
  title: string;
  formats: ExtractedFormat[];
}

function guessExt(url: string, fallback: string): string {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]{2,4})$/);
    return match ? match[1].toLowerCase() : fallback;
  } catch {
    return fallback;
  }
}

async function extractInstagram(url: string): Promise<ExtractedMedia> {
  const res = await igdl(url);
  const items = res.result ?? [];
  if (items.length === 0) throw new Error("NOT_FOUND");

  const formats = items.map((item, i) => ({
    label: items.length > 1 ? `Item ${i + 1}` : "Original quality",
    url: item.url,
    ext: guessExt(item.url, "mp4"),
  }));
  return { title: "Instagram media", formats };
}

async function extractTikTok(url: string): Promise<ExtractedMedia> {
  const res = await ttdl(url);
  const formats: ExtractedFormat[] = [];

  (res.video ?? []).forEach((u, i) =>
    formats.push({
      label: (res.video?.length ?? 0) > 1 ? `Video ${i + 1} (no watermark)` : "Video (no watermark)",
      url: u,
      ext: "mp4",
    })
  );
  (res.audio ?? []).forEach((u, i) =>
    formats.push({
      label: (res.audio?.length ?? 0) > 1 ? `Audio ${i + 1}` : "Audio only",
      url: u,
      ext: "mp3",
    })
  );

  if (formats.length === 0) throw new Error("NOT_FOUND");
  return { title: res.title ?? "TikTok video", formats };
}

async function extractYouTube(url: string): Promise<ExtractedMedia> {
  const res = await youtube(url);
  const formats: ExtractedFormat[] = [];

  if (res.mp4) formats.push({ label: "Video · MP4", url: res.mp4, ext: "mp4" });
  if (res.mp3) formats.push({ label: "Audio only · MP3", url: res.mp3, ext: "mp3" });

  if (formats.length === 0) throw new Error("NOT_FOUND");
  return { title: res.title ?? "YouTube video", formats };
}

async function extractFacebook(url: string): Promise<ExtractedMedia> {
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
    return res.url || url;
  } catch {
    // If resolution fails for any reason, fall back to the original URL
    // rather than throwing here — let the real extractor attempt (and
    // report) the failure with its own clearer error path.
    return url;
  }
}

async function extractX(url: string): Promise<ExtractedMedia> {
  const res = await twitter(url);
  if (!res.url) throw new Error("NOT_FOUND");
  return { title: res.title ?? "X video", formats: [{ label: "Video · MP4", url: res.url, ext: "mp4" }] };
}

async function extractPinterest(url: string): Promise<ExtractedMedia> {
  const res = await pinterest(url);
  const pin = res.result;
  if (!pin) throw new Error("NOT_FOUND");

  const formats: ExtractedFormat[] = [];
  if (pin.video_url) formats.push({ label: "Video · MP4", url: pin.video_url, ext: "mp4" });
  if (pin.videos) {
    for (const [quality, video] of Object.entries(pin.videos)) {
      if (video?.url) formats.push({ label: `Video ${quality}`, url: video.url, ext: "mp4" });
    }
  }
  if (formats.length === 0 && pin.image) {
    formats.push({ label: "Image · JPG", url: pin.image, ext: "jpg" });
  }

  if (formats.length === 0) throw new Error("NOT_FOUND");
  return { title: pin.title ?? "Pinterest pin", formats };
}

const extractors: Record<string, (url: string) => Promise<ExtractedMedia>> = {
  "instagram-video-downloader": extractInstagram,
  "tiktok-video-downloader": extractTikTok,
  "youtube-video-downloader": extractYouTube,
  "facebook-video-downloader": extractFacebook,
  "x-video-downloader": extractX,
  "pinterest-video-downloader": extractPinterest,
};

const EXTRACTION_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("EXTRACTION_TIMEOUT")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Resolves a validated link into downloadable format URLs using the
 * btch-downloader npm package — no separate binary or install step beyond
 * `npm install`, unlike the yt-dlp path in src/lib/ytdlp.ts (kept in the
 * repo as an optional alternative; see README).
 *
 * Wrapped with a hard timeout so a hanging upstream request fails fast
 * with a clear error instead of leaving the person staring at a spinner
 * indefinitely.
 */
export async function extractMedia(platformSlug: string, url: string): Promise<ExtractedMedia> {
  const extractor = extractors[platformSlug];
  if (!extractor) throw new Error("UNSUPPORTED_PLATFORM");
  return withTimeout(extractor(url), EXTRACTION_TIMEOUT_MS);
}

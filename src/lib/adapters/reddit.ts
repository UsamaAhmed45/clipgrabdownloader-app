import type { ExtractedMedia } from "./types";
import { guessExt } from "./types";

interface RedditPostData {
  is_video?: boolean;
  media?: {
    reddit_video?: {
      fallback_url?: string;
    };
  };
  url_overridden_by_dest?: string;
  title?: string;
  thumbnail?: string;
}

// Reddit uses these literal strings in the thumbnail field instead of a
// real URL when there's genuinely no preview image — treating any of
// these as "no thumbnail" rather than fetching them as if they were an
// image URL (which would just 404 or show a broken image).
const REDDIT_THUMBNAIL_PLACEHOLDERS = new Set(["self", "default", "nsfw", "spoiler", "image", ""]);

function realRedditThumbnail(thumbnail: string | undefined): string | undefined {
  if (!thumbnail) return undefined;
  if (REDDIT_THUMBNAIL_PLACEHOLDERS.has(thumbnail.toLowerCase())) return undefined;
  if (!thumbnail.startsWith("http")) return undefined;
  return thumbnail;
}

/**
 * Reddit is a genuinely different case from every other adapter in this
 * folder: appending ".json" to any Reddit post URL is Reddit's own,
 * publicly documented way to fetch that post as structured data — the
 * exact same data your browser already receives to render the page, and
 * the same format Reddit's own official apps and reddit.com's frontend
 * consume. This isn't reverse-engineering an internal API; it's Reddit's
 * own public data format, openly documented and used by countless
 * legitimate tools.
 */
export async function extractReddit(url: string): Promise<ExtractedMedia> {
  const jsonUrl = buildJsonUrl(url);

  const res = await fetch(jsonUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
    },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error("NOT_FOUND");

  const data = await res.json();
  const post: RedditPostData | undefined = data?.[0]?.data?.children?.[0]?.data;
  if (!post) throw new Error("NOT_FOUND");

  const title = post.title ? decodeHtmlEntities(post.title) : "Reddit post";

  if (post.is_video && post.media?.reddit_video?.fallback_url) {
    // Reddit stores a video post's audio as a separate DASH track from
    // the video itself — combining them back into one file needs
    // server-side muxing (ffmpeg), which this project doesn't do. Rather
    // than silently hand over a video that plays with no sound and look
    // broken, the format label says exactly what it is.
    return {
      title,
      formats: [
        { label: "Video · MP4 (no audio track)", url: post.media.reddit_video.fallback_url, ext: "mp4" },
      ],
      thumbnail: realRedditThumbnail(post.thumbnail),
    };
  }

  if (post.url_overridden_by_dest && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(post.url_overridden_by_dest)) {
    const imageUrl = post.url_overridden_by_dest;
    return { title, formats: [{ label: "Image", url: imageUrl, ext: guessExt(imageUrl, "jpg") }] };
  }

  throw new Error("NOT_FOUND");
}

function buildJsonUrl(url: string): string {
  const clean = url.split("?")[0].replace(/\/+$/, "");
  return `${clean}.json`;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

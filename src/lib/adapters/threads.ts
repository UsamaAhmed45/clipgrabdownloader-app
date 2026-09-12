import { threads } from "btch-downloader";
import type { ExtractedMedia } from "./types";
import { tryYtDlp } from "../ytdlp";

export async function extractThreads(url: string): Promise<ExtractedMedia> {
  // Same reasoning as the X adapter — tryYtDlp() attempts every
  // available yt-dlp path before this falls back to the original
  // method. See ytdlp.ts.
  const ytDlpResult = await tryYtDlp(url);
  if (ytDlpResult) {
    const best = ytDlpResult.formats.find((f) => f.hasVideo) ?? ytDlpResult.formats[0];
    return {
      title: ytDlpResult.title,
      thumbnail: ytDlpResult.thumbnail,
      formats: [{ label: `${best.hasVideo ? "Video" : "Image"} · ${best.ext.toUpperCase()}`, url: best.url, ext: best.ext }],
    };
  }

  const res = await threads(url);
  const post = res.result;
  if (!post) throw new Error("NOT_FOUND");

  if (post.type === "video" && post.video) {
    return {
      title: "Threads post",
      formats: [{ label: "Video · MP4", url: post.video, ext: "mp4" }],
      thumbnail: post.image || undefined,
    };
  }
  if (post.image) {
    return { title: "Threads post", formats: [{ label: "Image · JPG", url: post.image, ext: "jpg" }] };
  }

  throw new Error("NOT_FOUND");
}

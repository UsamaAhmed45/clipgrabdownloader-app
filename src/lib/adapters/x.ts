import { twitter } from "btch-downloader";
import type { ExtractedMedia } from "./types";
import { tryYtDlp } from "../ytdlp";

export async function extractX(url: string): Promise<ExtractedMedia> {
  // X overhauled its anti-scraping measures in 2025 (request signing,
  // datacenter-IP blocking) — actively-maintained yt-dlp keeps up with
  // that within days of a change, while the simpler scraping approach
  // below does not, which is why X specifically has been the least
  // reliable platform here. tryYtDlp() attempts every available yt-dlp
  // path (local binary, then the Vercel Python function) before this
  // falls back to the original method — see ytdlp.ts.
  const ytDlpResult = await tryYtDlp(url);
  if (ytDlpResult) {
    const best = ytDlpResult.formats.find((f) => f.hasVideo) ?? ytDlpResult.formats[0];
    return {
      title: ytDlpResult.title,
      thumbnail: ytDlpResult.thumbnail,
      formats: [{ label: `Video · ${best.ext.toUpperCase()}`, url: best.url, ext: best.ext }],
    };
  }

  const res = await twitter(url);
  if (!res.url) throw new Error("NOT_FOUND");
  return { title: res.title ?? "X video", formats: [{ label: "Video · MP4", url: res.url, ext: "mp4" }] };
}

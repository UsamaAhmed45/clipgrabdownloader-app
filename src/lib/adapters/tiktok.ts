import { ttdl } from "btch-downloader";
import type { ExtractedFormat, ExtractedMedia } from "./types";

export async function extractTikTok(url: string): Promise<ExtractedMedia> {
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
  return { title: res.title ?? "TikTok video", formats, thumbnail: res.thumbnail || undefined };
}

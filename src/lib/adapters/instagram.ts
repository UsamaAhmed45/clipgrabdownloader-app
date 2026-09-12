import { igdl } from "btch-downloader";
import type { ExtractedMedia } from "./types";
import { guessExt } from "./types";

export async function extractInstagram(url: string): Promise<ExtractedMedia> {
  const res = await igdl(url);
  const items = res.result ?? [];
  if (items.length === 0) throw new Error("NOT_FOUND");

  const formats = items.map((item, i) => ({
    label: items.length > 1 ? `Item ${i + 1}` : "Original quality",
    url: item.url,
    ext: guessExt(item.url, "mp4"),
  }));
  return { title: "Instagram media", formats, thumbnail: items[0]?.thumbnail || undefined };
}

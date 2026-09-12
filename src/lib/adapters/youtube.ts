import { youtube } from "btch-downloader";
import type { ExtractedFormat, ExtractedMedia } from "./types";

export async function extractYouTube(url: string): Promise<ExtractedMedia> {
  const res = await youtube(url);
  const formats: ExtractedFormat[] = [];

  if (res.mp4) formats.push({ label: "Video · MP4", url: res.mp4, ext: "mp4" });
  if (res.mp3) formats.push({ label: "Audio only · MP3", url: res.mp3, ext: "mp3" });

  if (formats.length === 0) throw new Error("NOT_FOUND");
  return {
    title: res.title ?? "YouTube video",
    formats,
    author: res.author || undefined,
    thumbnail: res.thumbnail || undefined,
  };
}

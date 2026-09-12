import { pinterest } from "btch-downloader";
import type { ExtractedMedia } from "./types";

export async function extractPinterest(url: string): Promise<ExtractedMedia> {
  const res = await pinterest(url);
  const pin = res.result;
  if (!pin) throw new Error("NOT_FOUND");

  const formats: ExtractedMedia["formats"] = [];
  const seen = new Set<string>();

  // Pinterest very commonly serves video as an HLS manifest (a .m3u8
  // playlist listing segment URLs) rather than a single downloadable
  // file. Our download pipeline fetches one URL and streams it straight
  // through — an .m3u8 URL fetched that way returns a tiny text
  // playlist, not a video, producing a broken "download" that looks
  // successful but won't play. Every candidate URL is checked for this
  // before being offered as a format.
  function isDirectFile(candidateUrl: string): boolean {
    return !/\.m3u8(\?|$)/i.test(candidateUrl);
  }

  function addVideoFormat(label: string, candidateUrl: string | undefined | null) {
    if (!candidateUrl || seen.has(candidateUrl) || !isDirectFile(candidateUrl)) return;
    seen.add(candidateUrl);
    formats.push({ label, url: candidateUrl, ext: "mp4" });
  }

  addVideoFormat("Video · MP4", pin.video_url);

  // The library's own TypeScript types describe `videos` as a flat
  // { quality: { url } } map, but unofficial scrapers like this one
  // don't always match their own declared types at runtime — Pinterest's
  // actual internal API nests video variants one level deeper, under a
  // `video_list` key, with entries like V_720P / V_HLSV4. Checking both
  // shapes costs nothing and means this doesn't silently break the
  // moment the real response shape turns out to be the nested one.
  const videoMaps = [pin.videos, (pin.videos as Record<string, unknown> | undefined)?.video_list].filter(
    (m): m is Record<string, { url?: string }> => !!m && typeof m === "object"
  );
  for (const map of videoMaps) {
    for (const [quality, video] of Object.entries(map)) {
      addVideoFormat(`Video ${quality}`, video?.url);
    }
  }

  if (formats.length === 0 && pin.image) {
    formats.push({ label: "Image · JPG", url: pin.image, ext: "jpg" });
  }

  if (formats.length === 0) throw new Error("NOT_FOUND");
  // pin.image is a thumbnail-suitable preview image on Pinterest's own
  // response even for video pins (it's separate from the video URL
  // itself) — only used as a thumbnail here when the actual downloadable
  // format is the video, not when it's already being offered as the
  // format (the fallback branch above), to avoid describing the same
  // URL as both "the download" and "a preview of the download".
  const isImageTheOnlyFormat = formats.length === 1 && formats[0].url === pin.image;
  return {
    title: pin.title ?? "Pinterest pin",
    formats,
    thumbnail: !isImageTheOnlyFormat ? pin.image || undefined : undefined,
  };
}

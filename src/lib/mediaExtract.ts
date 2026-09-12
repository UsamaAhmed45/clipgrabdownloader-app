import type { ExtractedMedia, PlatformAdapter } from "./adapters/types";
import { extractInstagram } from "./adapters/instagram";
import { extractTikTok } from "./adapters/tiktok";
import { extractYouTube } from "./adapters/youtube";
import { extractFacebook } from "./adapters/facebook";
import { extractX } from "./adapters/x";
import { extractPinterest } from "./adapters/pinterest";
import { extractThreads } from "./adapters/threads";
import { extractReddit } from "./adapters/reddit";

export type { ExtractedFormat, ExtractedMedia } from "./adapters/types";

/**
 * Detector → Adapter → Metadata/Formats → (caller streams the file).
 * Adding a platform means writing one new file in ./adapters and adding
 * one line here — nothing else in the pipeline needs to change.
 */
const adapters: Record<string, PlatformAdapter> = {
  "instagram-video-downloader": extractInstagram,
  "tiktok-video-downloader": extractTikTok,
  "youtube-video-downloader": extractYouTube,
  "facebook-video-downloader": extractFacebook,
  "x-video-downloader": extractX,
  "pinterest-video-downloader": extractPinterest,
  "threads-video-downloader": extractThreads,
  "reddit-video-downloader": extractReddit,
};

/**
 * Every platform's real support level, for anything (UI, docs, a future
 * status page) that wants to say more than just "works" or "doesn't" —
 * SUPPORTED platforms use either an official public data format (Reddit)
 * or the same unofficial-extraction approach every video downloader in
 * this category uses, since none of these platforms publish an official
 * API for downloading arbitrary video files. NOT_AVAILABLE is reserved
 * for platforms with no such path at all, public or otherwise.
 */
export type PlatformSupportLevel = "SUPPORTED" | "NOT_AVAILABLE";

export const PLATFORM_SUPPORT: Record<string, PlatformSupportLevel> = Object.fromEntries(
  Object.keys(adapters).map((slug) => [slug, "SUPPORTED" as const])
);

// Deliberately generous — the earlier value (9s) was tuned to fit inside
// a fixed 25s client-side timeout that no longer exists (the download
// queue now uses per-job AbortControllers the person can cancel manually
// instead of ceiling the wait at a fixed number). Real-world evidence
// (a YouTube extraction that timed out at 9s but wasn't actually dead —
// just slow from that connection) showed 9s was too tight for a
// perfectly healthy request over a slower or higher-latency network path
// to this project's third-party extraction backend.
const EXTRACTION_TIMEOUT_MS = 25_000;

// Retried up to this many extra times (so 3 attempts total) with
// increasing pauses in between — including retrying an outright timeout
// now, not just other errors. With no fixed client-side ceiling forcing
// an early give-up anymore, giving a slow-but-not-dead backend a couple
// of extra chances costs the person a longer wait on a genuine failure,
// but meaningfully raises the odds a real, working link actually
// succeeds instead of failing on what was just one bad moment for a
// shared third-party service.
const MAX_EXTRACTION_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [1000, 2500];

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolves a validated link into downloadable format URLs via the
 * matching adapter. Wrapped with a hard timeout so a hanging upstream
 * request fails fast with a clear error instead of leaving the person
 * staring at a spinner indefinitely — and with a few automatic retries,
 * since unofficial extraction is the flakiest part of this whole
 * pipeline by nature (see README "How downloading works"): a meaningful
 * share of "sometimes it just fails" reports are a transient upstream
 * hiccup, not a genuinely dead link.
 */
export async function extractMedia(platformSlug: string, url: string): Promise<ExtractedMedia> {
  const adapter = adapters[platformSlug];
  if (!adapter) throw new Error("UNSUPPORTED_PLATFORM");

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_EXTRACTION_ATTEMPTS; attempt++) {
    try {
      return await withTimeout(adapter(url), EXTRACTION_TIMEOUT_MS);
    } catch (err) {
      lastError = err;
      const isLastAttempt = attempt === MAX_EXTRACTION_ATTEMPTS - 1;
      if (isLastAttempt) break;
      await delay(RETRY_BACKOFF_MS[attempt] ?? 2500);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("EXTRACTION_FAILED");
}

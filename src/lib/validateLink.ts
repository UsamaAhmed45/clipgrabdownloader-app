import { getPublishedPlatforms } from "@/config/platforms";

// Domains this tool claims to support, derived from the published platform
// list rather than duplicated by hand.
const ALLOWED_HOSTS: Record<string, string> = {
  "instagram.com": "instagram-video-downloader",
  "www.instagram.com": "instagram-video-downloader",
  "m.instagram.com": "instagram-video-downloader",
  "facebook.com": "facebook-video-downloader",
  "www.facebook.com": "facebook-video-downloader",
  "m.facebook.com": "facebook-video-downloader",
  "fb.watch": "facebook-video-downloader",
  "tiktok.com": "tiktok-video-downloader",
  "www.tiktok.com": "tiktok-video-downloader",
  "m.tiktok.com": "tiktok-video-downloader",
  "vm.tiktok.com": "tiktok-video-downloader",
  "vt.tiktok.com": "tiktok-video-downloader",
  "youtube.com": "youtube-video-downloader",
  "www.youtube.com": "youtube-video-downloader",
  "m.youtube.com": "youtube-video-downloader",
  "youtu.be": "youtube-video-downloader",
  "x.com": "x-video-downloader",
  "www.x.com": "x-video-downloader",
  "twitter.com": "x-video-downloader",
  "www.twitter.com": "x-video-downloader",
  "mobile.twitter.com": "x-video-downloader",
  "pinterest.com": "pinterest-video-downloader",
  "www.pinterest.com": "pinterest-video-downloader",
  "pin.it": "pinterest-video-downloader",
};

export interface ValidatedLink {
  ok: true;
  url: URL;
  platformSlug: string;
}
export interface RejectedLink {
  ok: false;
  reason: string;
}

/**
 * Validates a submitted link before it ever reaches a fetch/extraction
 * step. This is the SSRF/abuse boundary described in the SEO brief
 * (section 40): only http(s) URLs on an explicit allowlist of supported
 * public hosts are accepted. Everything else — internal IPs, unknown
 * domains, non-http(s) schemes, malformed input — is rejected here,
 * before any outbound request would be made.
 */
export function validateSubmittedLink(raw: string): ValidatedLink | RejectedLink {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "That doesn't look like a valid link." };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, reason: "Only http/https links are supported." };
  }

  const host = url.hostname.toLowerCase();
  const platformSlug = ALLOWED_HOSTS[host];
  if (!platformSlug) {
    return {
      ok: false,
      reason: "This link isn't from a platform we currently support.",
    };
  }

  const platform = getPublishedPlatforms().find((p) => p.slug === platformSlug);
  if (!platform) {
    return { ok: false, reason: "This platform isn't available yet." };
  }

  return { ok: true, url, platformSlug };
}

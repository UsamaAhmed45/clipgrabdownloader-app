/**
 * Central site configuration.
 * Everything here is sourced from environment variables so the same codebase
 * can be deployed to staging/production without code changes and without
 * ever hard-coding a fake domain into canonicals, sitemaps, or JSON-LD.
 *
 * See .env.example for the full list of variables.
 */

function required(name: string, fallback: string): string {
  const value = process.env[name];
  if (value && value.trim().length > 0) return value.trim();
  return fallback;
}

// Fallback values are safe local-dev defaults only — production deployments
// must set the real env vars (see README "Environment configuration").
export const siteConfig = {
  // Fallback stays localhost on purpose (see comment above) — the real
  // domain belongs in .env.local / your host's env settings, sourced from
  // .env.example, not hard-coded here as a fallback that could silently
  // apply to a preview/staging build that forgot to set SITE_URL.
  url: required("SITE_URL", "http://localhost:3000").replace(/\/+$/, ""),
  name: required("SITE_NAME", "ClipGrab Downloader"),
  shortName: required("SITE_SHORT_NAME", "ClipGrab"),
  description: required(
    "SITE_DESCRIPTION",
    "Download public videos and Reels from Instagram, TikTok, YouTube, Facebook, X, and Pinterest — just paste a link. Fast, free, and mobile-friendly."
  ),
  defaultOgImage: required("DEFAULT_OG_IMAGE", "/images/og/default.png"),
  twitterHandle: required("TWITTER_HANDLE", "@clipgrabapp"),
  googleSiteVerification: process.env.GOOGLE_SITE_VERIFICATION ?? "",
  contactEmail: required("CONTACT_EMAIL", "aureviaqatar@gmail.com"),
  locale: "en_US",
  alternateName: "GrabClip",
  poweredBy: {
    name: "Aurevia Solution",
    url: "https://www.aureviasolution.art/",
  },
  // Optional — empty until you actually have somewhere for it to point
  // (an APK on this site, or a Play Store listing). The "Download our
  // app" banner only renders when this is set, so there's never a dead
  // link on the live site while the app doesn't exist yet.
  androidAppUrl: process.env.ANDROID_APP_URL?.trim() || "",
} as const;

export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}

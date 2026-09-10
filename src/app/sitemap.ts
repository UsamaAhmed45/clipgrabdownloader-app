import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getIndexableRoutes } from "@/config/routes";

// Generated entirely from getIndexableRoutes() — see that file's docstring
// for the "only real, canonical, 200-status URLs" rule this must follow.
//
// lastModified is only set when a route actually has a known date (e.g. a
// blog post's real publish/update date). Falling back to "now" on every
// build would signal false freshness to search engines for pages that
// haven't actually changed — better to omit the field and let it infer
// freshness from HTTP headers/crawl history instead.
export default function sitemap(): MetadataRoute.Sitemap {
  return getIndexableRoutes().map((route) => ({
    url: `${siteConfig.url}${route.path}`,
    ...(route.lastModified ? { lastModified: route.lastModified } : {}),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

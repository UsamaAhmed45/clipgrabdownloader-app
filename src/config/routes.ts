import { getPublishedPlatforms } from "./platforms";
import { getPublishedPosts } from "./blog";

export interface RouteEntry {
  path: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  lastModified?: string;
}

/**
 * Single source of truth for every indexable URL on the site.
 * sitemap.ts reads this list directly — nothing else should hand-maintain
 * a duplicate list of routes (see SEO checklist: "no duplicate route lists").
 */
export function getIndexableRoutes(): RouteEntry[] {
  const staticRoutes: RouteEntry[] = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/about", priority: 0.4, changeFrequency: "monthly" },
    { path: "/how-it-works", priority: 0.6, changeFrequency: "monthly" },
    { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/contact", priority: 0.4, changeFrequency: "yearly" },
    { path: "/blog", priority: 0.5, changeFrequency: "weekly" },
  ];

  const platformRoutes: RouteEntry[] = getPublishedPlatforms().map((p) => ({
    path: `/${p.slug}`,
    priority: 0.9,
    changeFrequency: "monthly",
    ...(p.lastUpdated ? { lastModified: p.lastUpdated } : {}),
  }));

  const blogRoutes: RouteEntry[] = getPublishedPosts().map((post) => ({
    path: `/blog/${post.slug}`,
    priority: 0.5,
    changeFrequency: "monthly",
    lastModified: post.updatedDate ?? post.publishedDate,
  }));

  return [...staticRoutes, ...platformRoutes, ...blogRoutes];
}

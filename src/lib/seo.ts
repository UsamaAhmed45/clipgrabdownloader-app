import type { Metadata } from "next";
import { absoluteUrl, siteConfig } from "@/config/site";

interface PageSeoInput {
  title: string;
  description: string;
  path: string; // e.g. "/" or "/instagram-video-downloader"
  ogImage?: string;
  noIndex?: boolean;
  type?: "website" | "article";
}

/**
 * Builds a single page's <title>, meta description, canonical, robots,
 * Open Graph, and Twitter card metadata from one call site. Centralizing
 * this avoids the duplicate-metadata problem across dozens of pages
 * (see SEO config: "Do NOT duplicate metadata across pages").
 */
export function buildMetadata(input: PageSeoInput): Metadata {
  const url = absoluteUrl(input.path);
  const ogImage = absoluteUrl(input.ogImage ?? siteConfig.defaultOgImage);

  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical: url,
      types: {
        "application/rss+xml": [{ url: "/blog/rss.xml", title: `${siteConfig.name} Blog` }],
      },
    },
    robots: input.noIndex
      ? { index: false, follow: true }
      : {
          index: true,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
          "max-video-preview": -1,
        },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: siteConfig.name,
      type: input.type ?? "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: input.title }],
      locale: siteConfig.locale,
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [ogImage],
      site: siteConfig.twitterHandle,
    },
  };
}

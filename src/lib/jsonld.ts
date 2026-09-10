import { absoluteUrl, siteConfig } from "@/config/site";
import type { FaqItem } from "@/config/platforms";

// All builders return plain objects; render them with <JsonLd data={...} />.

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    alternateName: siteConfig.alternateName,
    url: siteConfig.url,
    logo: absoluteUrl("/icons/icon-512.png"),
    email: siteConfig.contactEmail,
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    alternateName: siteConfig.alternateName,
    url: siteConfig.url,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteConfig.url}/blog?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function webApplicationJsonLd(input: {
  name: string;
  description: string;
  url: string;
  category: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: input.name,
    description: input.description,
    url: input.url,
    applicationCategory: input.category,
    operatingSystem: "Any (web-based)",
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

// Only call this with FAQs that are actually rendered visibly on the same
// page — never generate hidden FAQ content purely for search engines.
export function faqJsonLd(faqs: FaqItem[]) {
  if (faqs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

export function articleJsonLd(input: {
  title: string;
  description: string;
  path: string;
  author: string;
  publishedDate: string;
  updatedDate?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    url: absoluteUrl(input.path),
    author: { "@type": "Organization", name: input.author },
    datePublished: input.publishedDate,
    dateModified: input.updatedDate ?? input.publishedDate,
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: { "@type": "ImageObject", url: absoluteUrl("/icons/icon-512.png") },
    },
  };
}

// Only call this with steps that are actually rendered as the visible,
// numbered "how to" list on the same page — matches the FAQPage rule of
// never generating structured data for content that isn't really there.
export function howToJsonLd(input: { name: string; description: string; steps: string[] }) {
  if (input.steps.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: input.name,
    description: input.description,
    step: input.steps.map((text, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      text,
    })),
  };
}

// For the homepage's platform grid — a genuine, visible list of the tools
// on the page, not a fabricated ranking (no ratings/positions implying
// quality judgments beyond the display order already on the page).
export function itemListJsonLd(items: { name: string; path: string }[]) {
  if (items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}

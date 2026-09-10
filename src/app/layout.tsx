import type { Metadata, Viewport } from "next";
import "./globals.css";
import { siteConfig, absoluteUrl } from "@/config/site";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationJsonLd, websiteJsonLd } from "@/lib/jsonld";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { CursorTrail } from "@/components/ui/CursorTrail";

// NOTE: This build environment has no network access to
// fonts.googleapis.com, so this scaffold ships with a CSS-only fallback
// font stack (see globals.css --font-display / --font-sans) instead of
// next/font/google. In an environment with normal internet access, swap
// in next/font/google (Fraunces + Inter, per DESIGN.md) or self-host the
// font files with next/font/local — either drops straight into the
// --font-display / --font-sans variables already wired through Tailwind.
// See README "Fonts" for the exact swap.

export const viewport: Viewport = {
  themeColor: "#2653D8",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.shortName} – Video Downloader`,
    template: `%s | ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  verification: siteConfig.googleSiteVerification
    ? { google: siteConfig.googleSiteVerification }
    : undefined,
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  // Makes "Add to Home Screen" on iOS behave like a real installed app
  // (own title, no Safari chrome) instead of just a bookmarked tab.
  appleWebApp: {
    capable: true,
    title: siteConfig.shortName,
    statusBarStyle: "default",
  },
  alternates: {
    types: {
      "application/rss+xml": [{ url: "/blog/rss.xml", title: `${siteConfig.name} Blog` }],
    },
  },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    type: "website",
    images: [{ url: absoluteUrl(siteConfig.defaultOgImage), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    site: siteConfig.twitterHandle,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <Header />
        <main id="main-content">{children}</main>
        <Footer />
        <ServiceWorkerRegister />
        <InstallPrompt />
        <CursorTrail />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { buildMetadata } from "@/lib/seo";
import { siteConfig } from "@/config/site";
import { getPublishedPlatforms } from "@/config/platforms";
import { DownloadForm } from "@/components/ui/DownloadForm";
import { PlatformIconBadge } from "@/components/ui/PlatformIcon";
import { JsonLd } from "@/components/seo/JsonLd";
import { webApplicationJsonLd, itemListJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = buildMetadata({
  title: "ClipGrab – Video Downloader for Instagram, TikTok & YouTube",
  description: siteConfig.description,
  path: "/",
});

export default function HomePage() {
  const platforms = getPublishedPlatforms();

  return (
    <>
      <JsonLd
        data={webApplicationJsonLd({
          name: siteConfig.name,
          description: siteConfig.description,
          url: siteConfig.url,
          category: "MultimediaApplication",
        })}
      />
      <JsonLd
        data={itemListJsonLd(platforms.map((p) => ({ name: `${p.name} downloader`, path: `/${p.slug}` })))}
      />

      <section className="mx-auto max-w-5xl px-5 pb-10 pt-8 sm:pb-10 sm:pt-12">
        <div className="grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-start md:gap-10">
          <div className="animate-rise-in">
            <span className="brand-gradient-text text-xs font-bold uppercase tracking-[0.2em] sm:text-sm">
              Video Downloader
            </span>
            <h1 className="mt-3 font-display text-[2.5rem] leading-[1.08] tracking-tight sm:text-5xl">
              Download videos.
              <br />
              Simply.
            </h1>
          </div>

          <div className="animate-rise-in animate-rise-in-1">
            <Suspense fallback={<div className="loading-pattern h-[68px] w-full rounded-2xl border border-line" />}>
              <DownloadForm />
            </Suspense>
            <p className="mt-3 text-base text-muted">
              Works with{" "}
              {platforms.map((p, i) => (
                <span key={p.slug}>
                  <Link href={`/${p.slug}`} className="underline decoration-line hover:text-accent hover:decoration-accent">
                    {p.name}
                  </Link>
                  {i < platforms.length - 1 ? ", " : ""}
                </span>
              ))}{" "}
              and more — paste any public video link above.
            </p>
          </div>
        </div>
      </section>

      <section id="platforms" className="mx-auto max-w-5xl px-5 py-8">
        <h2 className="font-display text-2xl">Choose a platform</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {platforms.map((p) => (
            <Link
              key={p.slug}
              href={`/${p.slug}`}
              className="platform-glass-card group relative flex h-full items-center gap-3.5 overflow-hidden rounded-2xl p-4"
              style={{ "--card-accent": p.color } as CSSProperties}
            >
              {/* Colored wash bleeding from the corner, like light through glass. */}
              <span
                className="pointer-events-none absolute -bottom-6 -right-6 h-28 w-28 rounded-full opacity-25 blur-2xl transition-opacity duration-300 group-hover:opacity-40"
                style={{ background: p.color }}
                aria-hidden
              />

              <PlatformIconBadge
                slug={p.slug}
                color={p.color}
                size="lg"
                className="relative transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-2"
              />
              <span
                className="relative h-9 w-px shrink-0 opacity-60"
                style={{ background: `linear-gradient(to bottom, transparent, ${p.color}, transparent)` }}
                aria-hidden
              />
              <div className="relative min-w-0 flex-1">
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="mt-0.5 line-clamp-1 text-sm text-muted">{p.tagline}</p>
              </div>
              <svg
                className="card-arrow relative h-5 w-5 shrink-0 text-muted"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
              >
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-10">
        <h2 className="font-display text-3xl">How it works</h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-3">
          {[
            { title: "Copy the link", body: "Find the video and copy its share link from the platform's own share button." },
            { title: "Paste it above", body: "Drop the link into the box and press Download — no account or app install needed." },
            { title: "Save the file", body: "Choose a quality if more than one is offered, then save it to your device." },
          ].map((step, i) => (
            <li key={step.title}>
              <span className="text-base font-semibold text-accent">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-1.5 text-lg font-medium">{step.title}</h3>
              <p className="mt-1.5 text-base leading-relaxed text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-10">
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl">What this supports</h2>
            <p className="mt-3 text-base leading-relaxed text-muted">
              Public videos, Reels, and Shorts from the platforms listed above. If a video plays
              without logging in, it&apos;s generally supported here too.
            </p>
          </div>
          <div>
            <h2 className="font-display text-2xl">What this doesn&apos;t support</h2>
            <p className="mt-3 text-base leading-relaxed text-muted">
              Private accounts, friends-only posts, age-restricted or region-locked videos, and
              any content the poster has specifically restricted from sharing. These limits are
              intentional, not technical gaps.
            </p>
          </div>
        </div>
      </section>

      {siteConfig.androidAppUrl && (
        <section className="mx-auto max-w-5xl px-5 py-10">
          <div className="surface-card flex flex-col items-center gap-5 rounded-2xl p-8 text-center sm:flex-row sm:text-left">
            <Image
              src="/logo/logo-icon-gradient.svg"
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 shrink-0"
            />
            <div className="flex-1">
              <h2 className="font-display text-2xl">Get the {siteConfig.shortName} app</h2>
              <p className="mt-1.5 text-base text-muted">
                Download our app for daily use — faster access, right from your home screen, and
                share videos straight into it from Instagram, TikTok, and more.
              </p>
            </div>
            <a
              href={siteConfig.androidAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="brand-gradient-bg shrink-0 whitespace-nowrap rounded-xl px-7 py-3.5 font-semibold text-white shadow-[0_8px_20px_rgba(30,99,238,0.35)]"
            >
              Download for Android
            </a>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-5xl px-5 py-10">
        <h2 className="font-display text-2xl">Privacy &amp; responsible downloading</h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
          Links you submit are used only to process that download and aren&apos;t stored longer
          than needed to complete the request. Downloading is meant for content you have the
          right to save — your own uploads, or public content you have permission to keep.
          Re-publishing someone else&apos;s work without permission is a separate question from
          downloading it, and remains subject to copyright law regardless of how the file was
          obtained. See the <Link href="/privacy" className="underline hover:text-accent">Privacy Policy</Link> for details.
        </p>
      </section>
    </>
  );
}

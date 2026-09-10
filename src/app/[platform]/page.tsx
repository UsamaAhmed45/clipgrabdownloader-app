import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { getPlatformBySlug, getPublishedPlatforms } from "@/config/platforms";
import { DownloadForm } from "@/components/ui/DownloadForm";
import { PlatformIconBadge } from "@/components/ui/PlatformIcon";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, faqJsonLd, howToJsonLd, webApplicationJsonLd } from "@/lib/jsonld";
import { siteConfig } from "@/config/site";

interface Props {
  params: Promise<{ platform: string }>;
}

export async function generateStaticParams() {
  return getPublishedPlatforms().map((p) => ({ platform: p.slug }));
}

function resolvePlatform(slug: string) {
  const platform = getPlatformBySlug(slug);
  if (!platform) return null;
  if (platform.redirectTo) return { redirectTo: platform.redirectTo };
  if (!platform.published) return null;
  return { platform };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { platform: slug } = await params;
  const resolved = resolvePlatform(slug);
  if (!resolved || "redirectTo" in resolved) return {};
  const { platform } = resolved;

  return buildMetadata({
    title: platform.title,
    description: platform.metaDescription,
    path: `/${platform.slug}`,
  });
}

export default async function PlatformPage({ params }: Props) {
  const { platform: slug } = await params;
  const resolved = resolvePlatform(slug);

  if (!resolved) notFound();
  if ("redirectTo" in resolved) redirect(`/${resolved.redirectTo}`);

  const { platform } = resolved;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: platform.name, path: `/${platform.slug}` },
        ])}
      />
      <JsonLd data={faqJsonLd(platform.faq)} />
      <JsonLd
        data={howToJsonLd({
          name: `How to download ${platform.name} videos`,
          description: platform.tagline,
          steps: platform.howTo,
        })}
      />
      <JsonLd
        data={webApplicationJsonLd({
          name: platform.title,
          description: platform.metaDescription,
          url: `${siteConfig.url}/${platform.slug}`,
          category: "MultimediaApplication",
        })}
      />

      <nav aria-label="Breadcrumb" className="mx-auto max-w-3xl px-5 pt-6 text-[15px] text-muted">
        <Link href="/" className="hover:text-accent">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/#platforms" className="hover:text-accent">Platforms</Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{platform.name}</span>
      </nav>

      <header
        className="mx-auto max-w-3xl border-l-[3px] px-5 py-8"
        style={{ borderColor: platform.color }}
      >
        <div className="flex items-center gap-4">
          <PlatformIconBadge slug={platform.slug} color={platform.color} size="lg" />
          <div>
            <h1 className="font-display text-3xl sm:text-4xl">{platform.h1}</h1>
            <p className="mt-1.5 text-base text-muted">{platform.tagline}</p>
          </div>
        </div>
        <div className="mt-6">
          <Suspense fallback={<div className="loading-pattern h-[68px] w-full rounded-2xl border border-line" />}>
            <DownloadForm placeholder={`Paste an ${platform.name} link`} />
          </Suspense>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-10">
        <section>
          {platform.intro.map((para, i) => (
            <p key={i} className="mt-4 text-base leading-relaxed text-ink/90 first:mt-0">
              {para}
            </p>
          ))}
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl">How to download</h2>
          <ol className="mt-4 space-y-3">
            {platform.howTo.map((step, i) => (
              <li key={i} className="flex gap-3 text-base leading-relaxed">
                <span className="mt-0.5 shrink-0 text-base font-semibold text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl">Supported {platform.name} links</h2>
          <ul className="mt-4 space-y-1.5 text-[15px]">
            {platform.urlExamples.map((ex) => (
              <li key={ex} className="overflow-x-auto rounded bg-paper-raised px-3 py-2.5 font-mono text-sm text-muted">
                {ex}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl">Available formats</h2>
          <dl className="mt-4 divide-y divide-line border-y border-line">
            {platform.formats.map((f) => (
              <div key={f.label} className="py-4">
                <dt className="text-[17px] font-medium">{f.label}</dt>
                <dd className="mt-1 text-base text-muted">{f.detail}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl">Troubleshooting</h2>
          <dl className="mt-4 divide-y divide-line border-y border-line">
            {platform.troubleshooting.map((t) => (
              <div key={t.issue} className="py-4">
                <dt className="text-[17px] font-medium">{t.issue}</dt>
                <dd className="mt-1 text-base leading-relaxed text-muted">{t.explanation}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl">Privacy</h2>
          <p className="mt-4 text-base leading-relaxed text-ink/90">
            Links you submit here are used only to process that download and aren&apos;t stored
            longer than needed to complete the request. See the{" "}
            <Link href="/privacy" className="underline hover:text-accent">Privacy Policy</Link> for
            full details.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl">FAQ</h2>
          <dl className="mt-4 divide-y divide-line border-y border-line">
            {platform.faq.map((item) => (
              <div key={item.q} className="py-4">
                <dt className="text-[17px] font-medium">{item.q}</dt>
                <dd className="mt-1 text-base leading-relaxed text-muted">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {platform.relatedSlugs.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl">Related platforms</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {platform.relatedSlugs.map((slug) => {
                const related = getPlatformBySlug(slug);
                if (!related || !related.published) return null;
                return (
                  <Link
                    key={slug}
                    href={`/${slug}`}
                    className="pill-hover flex items-center gap-2 rounded-lg border px-4 py-2.5 text-base"
                    style={{ "--card-accent": related.color } as CSSProperties}
                  >
                    <PlatformIconBadge slug={related.slug} color={related.color} size="sm" />
                    {related.name} downloader
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </article>
    </>
  );
}

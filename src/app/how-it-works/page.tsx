import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, howToJsonLd } from "@/lib/jsonld";
import { getPublishedPlatforms } from "@/config/platforms";
import { PlatformIconBadge } from "@/components/ui/PlatformIcon";

export const metadata: Metadata = buildMetadata({
  title: "How It Works",
  description:
    "A step-by-step look at how the downloader processes a link, what happens to the data you submit, and why some videos can't be downloaded.",
  path: "/how-it-works",
});

export default function HowItWorksPage() {
  const platforms = getPublishedPlatforms();

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "How It Works", path: "/how-it-works" }])} />
      <JsonLd
        data={howToJsonLd({
          name: "How to download a video",
          description: "How the downloader processes a link, from pasting it to saving the file.",
          steps: [
            "Copy a video's share link directly from the platform's own share button.",
            "Paste the link in — it's checked against supported platforms, not stored.",
            "Choose a format and quality, then save it to your device.",
          ],
        })}
      />

      <article className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="font-display text-3xl">How it works</h1>

        <div className="mt-8 space-y-10 text-base leading-relaxed">
          <section>
            <h2 className="font-display text-xl">1. You paste a public link</h2>
            <p className="mt-3 text-ink/90">
              Copy a video&apos;s share link directly from the platform&apos;s own share button —
              not a screenshot, not a search result, the actual link the platform generates for
              that specific post.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">2. The link is checked, not stored</h2>
            <p className="mt-3 text-ink/90">
              The link is validated against the platforms this tool supports and used only to
              locate the public video it points to. It isn&apos;t kept longer than needed to
              complete that one request.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">3. You choose a format and save it</h2>
            <p className="mt-3 text-ink/90">
              When more than one quality or format is available for that video, they&apos;re all
              listed so you can pick — there&apos;s no hidden &quot;best&quot; option chosen for
              you.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">What this tool can&apos;t do</h2>
            <p className="mt-3 text-ink/90">
              Private accounts, friends-only posts, age-restricted videos, and region-locked
              content stay restricted here the same way they are on the platform itself — that
              isn&apos;t a limitation of this tool, it&apos;s the platform&apos;s own access
              control working as intended.
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-line pt-8">
          <h2 className="font-display text-xl">Platform-specific instructions</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {platforms.map((p) => (
              <Link
                key={p.slug}
                href={`/${p.slug}`}
                className="flex items-center gap-2 rounded-md border border-line px-4 py-2 text-base hover:border-accent hover:text-accent"
              >
                <PlatformIconBadge slug={p.slug} color={p.color} size="sm" />
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      </article>
    </>
  );
}

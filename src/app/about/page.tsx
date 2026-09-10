import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = buildMetadata({
  title: "About",
  description: `What ${siteConfig.name} is, who builds it, how the downloader actually works behind the scenes, and how to get in touch with questions or feedback.`,
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "About", path: "/about" }])} />
      <article className="mx-auto max-w-2xl px-5 py-12 text-base leading-relaxed">
        <h1 className="font-display text-3xl">About {siteConfig.name}</h1>

        <p className="mt-4 text-ink/90">
          {siteConfig.name} is a straightforward way to save a public video or Reel you come
          across — paste a link, get the file, done. No account, no app install, no upsells. It
          covers Instagram, Facebook, TikTok, YouTube, X, and Pinterest, with a dedicated page for
          each platform&apos;s own quirks (URL formats, quality options, common errors).
        </p>

        <p className="mt-4 text-ink/90">
          It&apos;s built and maintained by{" "}
          <a
            href={siteConfig.poweredBy.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-accent"
          >
            {siteConfig.poweredBy.name}
          </a>
          , built by Usama Ahmed.
        </p>

        <p className="mt-4 text-ink/90">
          Questions, bug reports, or ideas for what to add next go to the{" "}
          <Link href="/contact" className="underline hover:text-accent">Help Centre</Link>, and
          common questions are answered on the{" "}
          <Link href="/faq" className="underline hover:text-accent">FAQ page</Link>.
        </p>
      </article>
    </>
  );
}

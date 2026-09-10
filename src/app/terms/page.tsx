import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = buildMetadata({
  title: "Terms of Service",
  description: `The terms for using ${siteConfig.name}, including acceptable use, platform affiliation, and what to expect if a download link doesn't work as intended.`,
  path: "/terms",
});

export default function TermsPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Terms", path: "/terms" }])} />
      <article className="mx-auto max-w-2xl px-5 py-12 text-base leading-relaxed">
        <h1 className="font-display text-3xl">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted">Last updated: a date you set when this goes live.</p>

        <section className="mt-8">
          <h2 className="font-display text-xl">Acceptable use</h2>
          <p className="mt-3 text-ink/90">
            This tool is intended for downloading content you have the right to save — your own
            uploads, or public content you have permission to keep for personal use. You&apos;re
            responsible for how you use anything you download, including complying with the
            copyright of the original creator and the terms of the platform the content came
            from.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl">No affiliation</h2>
          <p className="mt-3 text-ink/90">
            {siteConfig.name} is not affiliated with, endorsed by, or sponsored by Instagram,
            Facebook, TikTok, YouTube, X, Pinterest, or any other platform referenced on this
            site. Platform names are used only to describe compatibility.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl">No guarantees</h2>
          <p className="mt-3 text-ink/90">
            Availability depends on the source platform and the privacy settings of the specific
            content — we don&apos;t guarantee that every link will resolve, or that quality
            options will always match what&apos;s shown here.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl">Prohibited use</h2>
          <p className="mt-3 text-ink/90">
            Using this tool to access private or restricted content without authorization, to
            infringe someone else&apos;s copyright, or to abuse the service (excessive automated
            requests, attempts to bypass rate limits, or attacks on the underlying
            infrastructure) is not permitted.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl">Changes</h2>
          <p className="mt-3 text-ink/90">
            These terms may be updated from time to time; continued use after a change means you
            accept the updated terms.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl">Contact</h2>
          <p className="mt-3 text-ink/90">Questions can be sent to {siteConfig.contactEmail}.</p>
        </section>
      </article>
    </>
  );
}

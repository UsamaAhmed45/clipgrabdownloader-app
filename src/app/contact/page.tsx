import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = buildMetadata({
  title: "Help Centre",
  description: `Get support, report an issue, or send a suggestion to the ${siteConfig.name} team.`,
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Help Centre", path: "/contact" }])} />
      <article className="mx-auto max-w-2xl px-5 py-12 text-base leading-relaxed">
        <h1 className="font-display text-3xl">Help Centre</h1>
        <p className="mt-4 text-ink/90">
          Most questions are answered on the{" "}
          <Link href="/faq" className="underline hover:text-accent">FAQ page</Link> or on the
          specific platform&apos;s own page (Instagram, Facebook, TikTok, YouTube, X, Pinterest).
          If you&apos;re still stuck, reach us directly.
        </p>

        <div className="surface-card mt-8 rounded-xl p-6">
          <h2 className="font-display text-xl">Email support</h2>
          <p className="mt-2 text-ink/90">
            For support, bug reports, or a copyright concern about content processed through this
            tool:
          </p>
          <a
            href={`mailto:${siteConfig.contactEmail}`}
            className="brand-gradient-text mt-2 inline-block text-lg font-semibold"
          >
            {siteConfig.contactEmail}
          </a>
          <p className="mt-4 text-ink/90">
            If you&apos;re a rights holder requesting removal or reporting misuse, please include
            the specific link involved so we can look into it promptly.
          </p>
        </div>

        <div className="surface-card mt-6 rounded-xl p-6">
          <h2 className="font-display text-xl">Suggestions &amp; feature requests</h2>
          <p className="mt-2 text-ink/90">
            Want a platform added, spotted something broken, or have an idea that would make this
            more useful? Send it to the same email above — every suggestion gets read.
          </p>
        </div>
      </article>
    </>
  );
}

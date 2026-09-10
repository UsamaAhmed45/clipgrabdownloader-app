import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description: `How ${siteConfig.name} handles the links and data you submit.`,
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Privacy", path: "/privacy" }])} />
      <article className="mx-auto max-w-2xl px-5 py-12 text-base leading-relaxed">
        <h1 className="font-display text-3xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted">Last updated: a date you set when this goes live.</p>

        <section className="mt-8">
          <h2 className="font-display text-xl">What we collect</h2>
          <p className="mt-3 text-ink/90">
            When you submit a link, we process it only to locate and prepare the requested video.
            We don&apos;t require an account, and we don&apos;t collect names, emails, or payment
            details to use the core downloader.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl">Submitted links</h2>
          <p className="mt-3 text-ink/90">
            Links are used only for the request you made and aren&apos;t retained longer than
            necessary to complete it. We don&apos;t build a history of what you&apos;ve downloaded.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl">Analytics and cookies</h2>
          <p className="mt-3 text-ink/90">
            If analytics are enabled on this deployment, they measure aggregate traffic (pages
            viewed, general location, device type) and are configured to avoid identifying
            individual visitors where possible. Analytics are optional and can be disabled in the
            site configuration — see <code>SEO ENVIRONMENT CONFIG</code> in the README. This
            section should be updated to name the specific analytics provider in use, if any,
            before publishing.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl">Third parties</h2>
          <p className="mt-3 text-ink/90">
            Processing a download may involve requesting the public video from the source
            platform&apos;s own servers. We don&apos;t sell submitted links or personal data to
            third parties.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl">Contact</h2>
          <p className="mt-3 text-ink/90">
            Questions about this policy can be sent to {siteConfig.contactEmail}.
          </p>
        </section>
      </article>
    </>
  );
}

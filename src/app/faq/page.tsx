import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/jsonld";
import type { FaqItem } from "@/config/platforms";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = buildMetadata({
  title: "Frequently Asked Questions",
  description: "Answers to common questions about downloading public videos, supported platforms, video quality and formats, privacy, and account requirements.",
  path: "/faq",
});

const generalFaq: FaqItem[] = [
  { q: "Do I need to create an account?", a: "No. Paste a link and download — there's no signup, login, or app install required." },
  { q: "Is this free to use?", a: "Yes, downloading supported public videos is free." },
  { q: "Is ClipGrab the same as GrabClip?", a: "Yes — people often search for this tool as \"GrabClip\" as well as \"ClipGrab.\" Both point to the same site." },
  { q: "Can I use this as an Insta downloader?", a: "Yes. The Instagram video downloader page handles public Reels, posts, and IGTV videos — see the Instagram page for details." },
  { q: "Why can't I download a private account's video?", a: "Private and friends-only content is restricted by the platform itself, and that restriction applies here the same way it applies to viewing it directly." },
  { q: "Does downloading a video notify the poster?", a: "No — viewing and downloading a public video works the same way loading the page does, and doesn't trigger a notification to the poster." },
  { q: "Can I use downloaded videos commercially?", a: "That depends entirely on the rights to that specific video, not on how it was downloaded. If you didn't create it and don't have permission, treat it as copyrighted material." },
  { q: "Why does quality vary between platforms?", a: "Each platform encodes and compresses video differently, and only offers the resolutions it originally generated for that specific upload." },
];

export default function FaqPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "FAQ", path: "/faq" }])} />
      <JsonLd data={faqJsonLd(generalFaq)} />

      <article className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="font-display text-3xl">Frequently asked questions</h1>
        <p className="mt-3 text-muted">
          For platform-specific questions — Instagram watermarks, TikTok slideshows, and so on —
          see that platform&apos;s own page.
        </p>

        <dl className="mt-8 divide-y divide-line border-y border-line">
          {generalFaq.map((item) => (
            <div key={item.q} className="py-5">
              <dt className="text-[17px] font-medium">{item.q}</dt>
              <dd className="mt-2 text-base leading-relaxed text-muted">{item.a}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-8 text-base text-muted">
          Still stuck, or have a suggestion? Visit the{" "}
          <Link href="/contact" className="underline hover:text-accent">Help Centre</Link> or email{" "}
          <a href={`mailto:${siteConfig.contactEmail}`} className="underline hover:text-accent">
            {siteConfig.contactEmail}
          </a>
          .
        </p>
      </article>
    </>
  );
}

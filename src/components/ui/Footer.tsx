import Link from "next/link";
import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto max-w-5xl px-5 py-10 text-base text-muted">
        <p className="max-w-2xl">
          {siteConfig.name} is an independent tool and is not affiliated with, endorsed by, or
          sponsored by Instagram, Facebook, TikTok, YouTube, X, or Pinterest. Platform names are
          used only to describe compatibility. Use this tool to save content you have the right
          to download — your own uploads, or public content you have permission to keep.
        </p>

        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/about" className="hover:text-accent">About</Link>
          <Link href="/how-it-works" className="hover:text-accent">How it works</Link>
          <Link href="/faq" className="hover:text-accent">FAQ</Link>
          <Link href="/blog" className="hover:text-accent">Blog</Link>
          <Link href="/privacy" className="hover:text-accent">Privacy</Link>
          <Link href="/terms" className="hover:text-accent">Terms</Link>
          <Link href="/contact" className="hover:text-accent">Help Centre</Link>
        </div>

        <p className="mt-6 text-base">
          Questions or suggestions?{" "}
          <a href={`mailto:${siteConfig.contactEmail}`} className="hover:text-accent underline">
            {siteConfig.contactEmail}
          </a>
        </p>

        <div className="mt-8 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>

          <a
            href={siteConfig.poweredBy.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 self-start rounded-full border border-line bg-paper-raised px-4 py-2 text-sm shadow-sm transition-all hover:border-accent hover:shadow-md sm:self-auto"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: "#2653D8" }}
              aria-hidden
            />
            <span className="text-muted">Powered by</span>
            <span className="brand-gradient-text font-semibold">{siteConfig.poweredBy.name}</span>
            <svg
              className="h-3.5 w-3.5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </a>
        </div>

        <p className="mt-4 text-sm text-muted">Built by Usama Ahmed</p>
      </div>
    </footer>
  );
}

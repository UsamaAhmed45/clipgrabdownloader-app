"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Platform } from "@/config/platforms";
import { PlatformIconBadge } from "./PlatformIcon";

const staticLinks = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/faq", label: "FAQ" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Help Centre" },
];

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`relative py-1 transition-colors ${active ? "text-accent" : "text-ink/80 hover:text-accent"}`}
    >
      {label}
      <span
        className={`absolute -bottom-[5px] left-0 h-[2px] rounded-full bg-accent transition-all duration-200 ${
          active ? "w-full" : "w-0 group-hover:w-full"
        }`}
        aria-hidden
      />
    </Link>
  );
}

export function NavLinks({ platforms }: { platforms: Platform[] }) {
  const pathname = usePathname();
  const platformsActive = platforms.some((p) => pathname === `/${p.slug}`);

  return (
    <nav aria-label="Primary" className="hidden items-center gap-7 text-base md:flex">
      <div className="group relative">
        <button
          type="button"
          className={`flex items-center gap-1 py-1 transition-colors ${
            platformsActive ? "text-accent" : "text-ink/80 hover:text-accent"
          }`}
        >
          Platforms
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180"
            aria-hidden
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>
        <div className="invisible absolute left-1/2 top-full z-10 w-72 -translate-x-1/2 translate-y-1 rounded-xl border border-line bg-paper-raised p-2 opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-hover:translate-y-2 group-hover:opacity-100">
          {platforms.map((p) => (
            <Link
              key={p.slug}
              href={`/${p.slug}`}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[15px] text-ink/80 hover:bg-paper hover:text-accent"
            >
              <PlatformIconBadge slug={p.slug} color={p.color} size="sm" />
              {p.name} downloader
            </Link>
          ))}
        </div>
      </div>

      {staticLinks.map((link) => (
        <span key={link.href} className="group">
          <NavLink href={link.href} label={link.label} active={pathname === link.href} />
        </span>
      ))}
    </nav>
  );
}

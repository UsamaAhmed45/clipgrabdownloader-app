"use client";

import { useState } from "react";
import Link from "next/link";
import type { Platform } from "@/config/platforms";
import { PlatformIconBadge } from "./PlatformIcon";

export function MobileMenu({ platforms }: { platforms: Platform[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex h-10 w-10 items-center justify-center rounded-md border border-line"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {open && (
        <nav
          aria-label="Primary"
          className="absolute inset-x-0 top-full z-20 border-b border-line bg-paper-raised px-5 py-4 shadow-lg"
        >
          <p className="px-1 text-sm font-semibold uppercase tracking-wide text-muted">Platforms</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {platforms.map((p) => (
              <Link
                key={p.slug}
                href={`/${p.slug}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-base hover:bg-paper"
              >
                <PlatformIconBadge slug={p.slug} color={p.color} size="sm" />
                {p.name}
              </Link>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-1 border-t border-line pt-4 text-base">
            <Link href="/how-it-works" onClick={() => setOpen(false)} className="rounded-lg px-2 py-2.5 hover:bg-paper">
              How it works
            </Link>
            <Link href="/faq" onClick={() => setOpen(false)} className="rounded-lg px-2 py-2.5 hover:bg-paper">
              FAQ
            </Link>
            <Link href="/blog" onClick={() => setOpen(false)} className="rounded-lg px-2 py-2.5 hover:bg-paper">
              Blog
            </Link>
            <Link href="/contact" onClick={() => setOpen(false)} className="rounded-lg px-2 py-2.5 hover:bg-paper">
              Help Centre
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { getPublishedPlatforms } from "@/config/platforms";
import { ThemeToggle } from "./ThemeToggle";
import { MobileMenu } from "./MobileMenu";
import { NavLinks } from "./NavLinks";

export function Header() {
  const platforms = getPublishedPlatforms();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md supports-[backdrop-filter]:bg-paper/70">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3.5">
        <Link href="/" className="group flex items-center gap-2.5" aria-label={siteConfig.name}>
          <Image
            src="/logo/logo-icon-gradient.svg"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 drop-shadow-[0_2px_6px_rgba(30,99,238,0.25)] transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3"
            priority
          />
          <span className="flex flex-col leading-none">
            <span className="brand-gradient-text text-2xl font-extrabold tracking-tight">
              {siteConfig.shortName}
            </span>
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-muted sm:block">
              Video Downloader
            </span>
          </span>
        </Link>

        <NavLinks platforms={platforms} />

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <MobileMenu platforms={platforms} />
        </div>
      </div>
    </header>
  );
}

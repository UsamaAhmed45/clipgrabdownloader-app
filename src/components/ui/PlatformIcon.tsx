import type { ReactElement } from "react";

interface IconProps {
  className?: string;
}

function CameraIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.6l1-1.6A1 1 0 0 1 9.95 5h4.1a1 1 0 0 1 .85.5l1 1.5h2.6A1.5 1.5 0 0 1 20 8.5v8A1.5 1.5 0 0 1 18.5 18h-13A1.5 1.5 0 0 1 4 16.5v-8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.2" r="3.1" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

// A plain letterform, not a reproduction of Meta's specific stylized "f"
// logo mark (its particular weight/proportions/placement) — same
// reasoning as the plain cross-mark already used for X below: a single
// letter used as a generic reference is a different thing from copying a
// brand's own drawn logo file.
function LetterFIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <text
        x="12.5"
        y="17"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fontSize="18"
        fill="currentColor"
      >
        f
      </text>
    </svg>
  );
}

function MusicNoteIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 16.5a2.5 2.5 0 1 1-2.5-2.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path d="M10 16.5V5.8L17 4v3.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M17 14.5a2.5 2.5 0 1 1-2.5-2.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlayIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M8.5 6.2 18 12l-9.5 5.8V6.2Z" fill="currentColor" />
    </svg>
  );
}

function CrossMarkIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6 6.5 18 17.5M18 6.5 6 17.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

function PinIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 20s6-5.6 6-10.5A6 6 0 0 0 6 9.5C6 14.4 12 20 12 20Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.4" r="2.1" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

// A generic "conversation thread" pictogram (connected reply dots), not
// a reproduction of Threads' own stylized "@" logo mark.
function ThreadIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="6.5" r="1.8" fill="currentColor" />
      <circle cx="14" cy="12" r="1.8" fill="currentColor" />
      <circle cx="9" cy="17.5" r="1.8" fill="currentColor" />
      <path d="M8 8.3 13 11 M13 13 9 15.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// A generic upvote-arrow-in-a-circle pictogram — a common, universal
// symbol for a discussion/ranking forum, not a reproduction of Reddit's
// own Snoo character mark.
function UpvoteIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8.2 16 13 H13.2 V16 H10.8 V13 H8 Z" fill="currentColor" />
    </svg>
  );
}

const platformIcons: Record<string, (props: IconProps) => ReactElement> = {
  "instagram-video-downloader": CameraIcon,
  "facebook-video-downloader": LetterFIcon,
  "tiktok-video-downloader": MusicNoteIcon,
  "youtube-video-downloader": PlayIcon,
  "x-video-downloader": CrossMarkIcon,
  "pinterest-video-downloader": PinIcon,
  "threads-video-downloader": ThreadIcon,
  "reddit-video-downloader": UpvoteIcon,
};

export function PlatformIconBadge({
  slug,
  color,
  size = "md",
  className = "",
}: {
  slug: string;
  color: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const Icon = platformIcons[slug] ?? CameraIcon;
  const sizeClasses = {
    sm: "h-8 w-8 rounded-lg [&>svg]:h-4 [&>svg]:w-4",
    md: "h-11 w-11 rounded-xl [&>svg]:h-5 [&>svg]:w-5",
    lg: "h-14 w-14 rounded-xl [&>svg]:h-6 [&>svg]:w-6",
    xl: "h-16 w-16 rounded-2xl [&>svg]:h-7 [&>svg]:w-7",
  }[size];

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center text-white ${sizeClasses} ${className}`}
      style={{
        background: `linear-gradient(145deg, color-mix(in srgb, ${color} 78%, white) 0%, ${color} 55%, color-mix(in srgb, ${color} 82%, black) 100%)`,
        boxShadow: `0 6px 16px -4px color-mix(in srgb, ${color} 55%, transparent), inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -2px 3px rgba(0,0,0,0.15)`,
      }}
    >
      {/* Glossy highlight sweep, like a real app icon under light. */}
      <span
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background: "linear-gradient(140deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.08) 35%, rgba(255,255,255,0) 55%)",
        }}
        aria-hidden
      />
      <Icon className="relative drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]" />
    </span>
  );
}

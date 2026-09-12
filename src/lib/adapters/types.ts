export interface ExtractedFormat {
  label: string;
  url: string;
  ext: string;
}

export interface ExtractedMedia {
  title: string;
  formats: ExtractedFormat[];
  // Only ever set when the adapter's upstream source genuinely returned
  // it — never fabricated or defaulted to a placeholder string. A field
  // being absent here means the UI should hide it, not invent one.
  author?: string;
  thumbnail?: string;
}

/** One file per platform implements this — see adapters/index.ts for the registry. */
export type PlatformAdapter = (url: string) => Promise<ExtractedMedia>;

export function guessExt(url: string, fallback: string): string {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]{2,4})$/);
    return match ? match[1].toLowerCase() : fallback;
  } catch {
    return fallback;
  }
}

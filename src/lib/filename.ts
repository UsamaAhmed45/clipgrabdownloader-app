// Windows reserved device names — a file literally named "CON.mp4" or
// "con" causes real problems on Windows regardless of extension, so
// these are checked against the sanitized base name (before the
// extension) case-insensitively.
const WINDOWS_RESERVED_NAMES = new Set([
  "CON", "PRN", "AUX", "NUL",
  "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
  "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
]);

/**
 * Builds a safe filename from a platform-supplied title (untrusted —
 * this could be anything a video's uploader typed) and an extension this
 * codebase itself always chooses (see adapters/*.ts — never user input).
 *
 * Path traversal is prevented structurally, not by trying to spot ".."
 * — the allowed-character set for the base name has no "/", "\", or "."
 * in it at all, so there is no character sequence that could produce a
 * path segment in the first place.
 */
export function buildSafeFilename(title: string, ext: string): string {
  let base = title
    .replace(/[^\w\-\s]/g, "") // strips /, \, ., and everything else outside this allowlist
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

  if (!base || WINDOWS_RESERVED_NAMES.has(base.toUpperCase())) {
    base = "media";
  }

  const safeExt = /^[a-zA-Z0-9]{1,8}$/.test(ext) ? ext : "bin";
  return `${base}.${safeExt}`;
}

// Query parameters that identify where a link was shared from, not what
// content it points to — stripping them means the same video pasted from
// two different share contexts normalizes to the same URL, and adapters
// never have to deal with this noise themselves.
const TRACKING_PARAM_PREFIXES = ["utm_", "igshid", "igsh", "fbclid", "gclid", "si", "feature", "spm", "ref_src", "ref"];

/**
 * One shared normalizer instead of every adapter reinventing its own
 * tracking-param stripping. Adapter-specific URL rewriting (like
 * Facebook's /share/ link redirect resolution) still lives in that
 * adapter, since it depends on that platform's own redirect behavior —
 * this only handles the generic, cross-platform cleanup that applies to
 * every submitted link the same way.
 */
export function normalizeSubmittedUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return rawUrl.trim();
  }

  for (const key of [...url.searchParams.keys()]) {
    const lowerKey = key.toLowerCase();
    if (TRACKING_PARAM_PREFIXES.some((prefix) => lowerKey === prefix || lowerKey.startsWith(prefix))) {
      url.searchParams.delete(key);
    }
  }

  // Strip a lone trailing "?" left behind once every param is removed.
  let result = url.toString();
  if (result.endsWith("?")) result = result.slice(0, -1);

  // Trailing slash on the path (but not when the path is just "/") is
  // cosmetic noise that doesn't change which post/video a link points
  // to, and normalizing it means "example.com/reel/123" and
  // "example.com/reel/123/" are treated as the same submission.
  const parsed = new URL(result);
  if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.slice(0, -1);
    result = parsed.toString();
  }

  return result;
}

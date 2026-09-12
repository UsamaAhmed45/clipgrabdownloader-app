interface Bucket {
  timestamps: number[];
}

// In-memory by design — resets on restart and doesn't share state across
// multiple server instances. Fine for a single dev/small deployment; a
// production deployment behind a load balancer needs a shared store
// (Redis, etc.) for this to work correctly across instances.
const buckets = new Map<string, Bucket>();

const DEFAULT_WINDOW_MS = 30_000;
const DEFAULT_MAX_REQUESTS = 6;

export interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
}

/**
 * Each call site passes its own `key` (already prefixed per operation —
 * see callers) so link-resolution and actual file-downloads track
 * separate budgets against the same visitor rather than sharing one pool.
 * Downloads get a stricter window than resolution: analyzing a link is
 * cheap, but every download is a real outbound fetch of someone else's
 * file through this server, which is the operation actually worth
 * limiting harder.
 */
export function isRateLimited(key: string, options: RateLimitOptions = {}): boolean {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = options.maxRequests ?? DEFAULT_MAX_REQUESTS;

  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= maxRequests) {
    buckets.set(key, bucket);
    return true;
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  cleanupOccasionally();
  return false;
}

let requestCount = 0;
function cleanupOccasionally() {
  requestCount++;
  if (requestCount % 50 !== 0) return;
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    // Conservative cleanup TTL — long enough to cover any caller's
    // window, since this shared cleanup doesn't know each bucket's
    // specific window size.
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < 10 * 60_000);
    if (bucket.timestamps.length === 0) buckets.delete(key);
  }
}

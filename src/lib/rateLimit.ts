interface Bucket {
  timestamps: number[];
}

// In-memory by design — resets on restart and doesn't share state across
// multiple server instances. Fine for a single dev/small deployment; a
// production deployment behind a load balancer needs a shared store
// (Redis, etc.) for this to work correctly across instances.
const buckets = new Map<string, Bucket>();

const WINDOW_MS = 30_000;
const MAX_REQUESTS_PER_WINDOW = 6;

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < WINDOW_MS);

  if (bucket.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
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
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < WINDOW_MS);
    if (bucket.timestamps.length === 0) buckets.delete(key);
  }
}

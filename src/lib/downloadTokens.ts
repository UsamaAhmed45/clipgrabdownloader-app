import { randomUUID } from "node:crypto";

interface TokenEntry {
  url: string;
  filename: string;
  expiresAt: number;
  // Sent as the Referer header when the file is actually streamed (see
  // src/app/api/download/file/route.ts). Several platforms' CDNs —
  // YouTube's especially — reject a file request that doesn't carry a
  // Referer matching the platform's own site, even when the signed URL
  // itself is completely valid. Without this, extraction can succeed
  // (title/formats show up fine) while the actual download silently
  // fails right after.
  referer?: string;
}

// In-memory by design for this scaffold — fine for a single dev/small
// deployment. A multi-instance production deployment needs a shared store
// (Redis, etc.) instead, since tokens created on one instance wouldn't be
// visible to another.
const tokens = new Map<string, TokenEntry>();
const TTL_MS = 10 * 60 * 1000;

export function createDownloadToken(url: string, filename: string, referer?: string): string {
  const token = randomUUID();
  tokens.set(token, { url, filename, expiresAt: Date.now() + TTL_MS, referer });
  cleanupExpired();
  return token;
}

export function resolveDownloadToken(token: string): TokenEntry | null {
  const entry = tokens.get(token);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    tokens.delete(token);
    return null;
  }
  return entry;
}

function cleanupExpired() {
  const now = Date.now();
  for (const [key, value] of tokens) {
    if (value.expiresAt < now) tokens.delete(key);
  }
}

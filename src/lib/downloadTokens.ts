import { randomUUID } from "node:crypto";

interface TokenEntry {
  url: string;
  filename: string;
  expiresAt: number;
}

// In-memory by design for this scaffold — fine for a single dev/small
// deployment. A multi-instance production deployment needs a shared store
// (Redis, etc.) instead, since tokens created on one instance wouldn't be
// visible to another.
const tokens = new Map<string, TokenEntry>();
const TTL_MS = 10 * 60 * 1000;

export function createDownloadToken(url: string, filename: string): string {
  const token = randomUUID();
  tokens.set(token, { url, filename, expiresAt: Date.now() + TTL_MS });
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

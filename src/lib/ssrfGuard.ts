/**
 * A second, independent SSRF boundary from validateLink.ts's submitted-URL
 * allowlist. That allowlist protects the *first* URL a person pastes in —
 * but the actual file this server later fetches comes from wherever the
 * extraction adapter says the video lives (an upstream CDN URL neither
 * this server nor the person submitting it controls). This catches the
 * blatant cases: a non-http(s) protocol, or a URL that's *literally*
 * spelled as localhost or a private/loopback/link-local IP address.
 *
 * This deliberately does NOT resolve the hostname via DNS to check where
 * it "really" points — an earlier version did, and it caused real,
 * reproducible false positives: some networks and ISPs transparently
 * proxy CDN/media traffic, which can make a completely legitimate
 * hostname (e.g. a Pinterest or X video CDN) resolve to a private-range
 * address purely as an artifact of how that network routes things
 * internally, not because anything is actually unsafe. Blocking a
 * download because of how the *user's own network* happens to resolve a
 * hostname is a worse trade-off than the narrow threat it defends
 * against (a compromised upstream extraction source deliberately crafting
 * a DNS-rebinding attack) — especially since the extraction sources here
 * are real platforms' own CDNs, not attacker-controlled infrastructure.
 */
export interface SsrfCheckResult {
  safe: boolean;
  reason?: string;
}

const PRIVATE_IPV4_RANGES: Array<[number, number]> = [
  [ipToInt("0.0.0.0"), ipToInt("0.255.255.255")], // "this" network
  [ipToInt("10.0.0.0"), ipToInt("10.255.255.255")], // RFC1918
  [ipToInt("100.64.0.0"), ipToInt("100.127.255.255")], // carrier-grade NAT
  [ipToInt("127.0.0.0"), ipToInt("127.255.255.255")], // loopback
  [ipToInt("169.254.0.0"), ipToInt("169.254.255.255")], // link-local (incl. cloud metadata endpoints)
  [ipToInt("172.16.0.0"), ipToInt("172.31.255.255")], // RFC1918
  [ipToInt("192.0.0.0"), ipToInt("192.0.0.255")], // IETF protocol assignments
  [ipToInt("192.168.0.0"), ipToInt("192.168.255.255")], // RFC1918
  [ipToInt("198.18.0.0"), ipToInt("198.19.255.255")], // benchmark testing
  [ipToInt("224.0.0.0"), ipToInt("255.255.255.255")], // multicast + reserved
];

function ipToInt(ip: string): number {
  const parts = ip.split(".").map(Number);
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function isPrivateIPv4(ip: string): boolean {
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return false;
  const value = ipToInt(ip);
  return PRIVATE_IPV4_RANGES.some(([start, end]) => value >= start && value <= end);
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return (
    lower === "::1" || // loopback
    lower === "::" || // unspecified
    lower.startsWith("fe80:") || // link-local
    lower.startsWith("fc") ||
    lower.startsWith("fd") || // unique local (ULA)
    lower.startsWith("::ffff:127.") || // IPv4-mapped loopback
    lower.startsWith("::ffff:10.") ||
    lower.startsWith("::ffff:192.168.")
  );
}

/**
 * Checks a URL is http(s) and not *literally* addressed to localhost or
 * a private/loopback/link-local IP. Does not perform a DNS lookup — see
 * the module comment above for why that check was removed.
 */
export async function checkUrlIsSafeToFetch(rawUrl: string): Promise<SsrfCheckResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { safe: false, reason: "Not a valid URL." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { safe: false, reason: `Protocol "${url.protocol}" is not allowed.` };
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return { safe: false, reason: "Localhost is not allowed." };
  }

  // Node's URL.hostname includes the brackets for a literal IPv6 address
  // (e.g. "[::1]"), unlike IPv4 — strip them before comparing so the
  // check below actually matches.
  const bareHostname = hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;

  if (isPrivateIPv4(bareHostname)) {
    return { safe: false, reason: "Private IPv4 address is not allowed." };
  }
  if (bareHostname.includes(":") && isPrivateIPv6(bareHostname)) {
    return { safe: false, reason: "Private IPv6 address is not allowed." };
  }

  return { safe: true };
}

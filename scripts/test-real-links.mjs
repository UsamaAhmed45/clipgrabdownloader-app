#!/usr/bin/env node
/**
 * Pre-release smoke test — run this against real, current public video
 * links before you release, since nothing in this codebase (including
 * Claude, when this was built) can verify a real download against
 * Instagram/TikTok/YouTube/etc. from a sandboxed environment with no
 * access to those domains.
 *
 * Usage:
 *   1. Fill in a real, current, PUBLIC link for each platform below.
 *   2. npm run build && npm run start   (in one terminal)
 *   3. node scripts/test-real-links.mjs http://localhost:3000   (in another)
 *
 * For each platform this does the FULL pipeline, not just extraction:
 *   resolve -> get a token -> actually fetch the file -> confirm real
 *   bytes came back with a sane content-type and size. A platform that
 *   "resolves" but never actually streams a real file is still broken —
 *   this catches that, which just checking /api/download alone wouldn't.
 */

const baseUrl = process.argv[2] || "http://localhost:3000";

// Fill these in with real, current, PUBLIC links before running.
const LINKS = {
  "instagram-video-downloader": "",
  "tiktok-video-downloader": "",
  "youtube-video-downloader": "",
  "facebook-video-downloader": "",
  "x-video-downloader": "",
  "pinterest-video-downloader": "",
};

function fmtBytes(n) {
  if (!n) return "unknown size";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

async function testPlatform(slug, url) {
  if (!url) {
    return { slug, ok: null, note: "skipped — no link provided" };
  }

  const resolveRes = await fetch(`${baseUrl}/api/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  }).catch((err) => ({ networkError: err }));

  if (resolveRes.networkError) {
    return { slug, ok: false, note: `couldn't reach server: ${resolveRes.networkError.message}` };
  }

  const resolveBody = await resolveRes.json().catch(() => null);

  if (!resolveRes.ok) {
    return { slug, ok: false, note: `resolve returned ${resolveRes.status}: ${resolveBody?.error ?? "no error message"}` };
  }
  if (resolveBody?.status !== "ready") {
    return { slug, ok: false, note: `status was "${resolveBody?.status}": ${resolveBody?.message ?? ""}` };
  }
  if (!resolveBody.formats || resolveBody.formats.length === 0) {
    return { slug, ok: false, note: "resolved but returned zero formats" };
  }

  // Now actually fetch the first format — this is what proves the file
  // streaming half of the pipeline works, not just extraction.
  const token = resolveBody.formats[0].token;
  const fileRes = await fetch(`${baseUrl}/api/download/file?token=${token}`).catch((err) => ({ networkError: err }));

  if (fileRes.networkError) {
    return { slug, ok: false, note: `file fetch failed: ${fileRes.networkError.message}` };
  }
  if (!fileRes.ok) {
    const errBody = await fileRes.json().catch(() => null);
    return { slug, ok: false, note: `file download returned ${fileRes.status}: ${errBody?.error ?? "no error message"}` };
  }

  const contentType = fileRes.headers.get("content-type");
  const contentLength = fileRes.headers.get("content-length");
  const looksLikeMedia = /^(video|audio|image)\//.test(contentType ?? "");

  // Drain a small amount of the body to confirm real bytes are flowing,
  // without downloading the entire file just to run a smoke test.
  const reader = fileRes.body?.getReader();
  let receivedSome = false;
  if (reader) {
    const { value } = await reader.read();
    receivedSome = !!value && value.length > 0;
    await reader.cancel();
  }

  if (!looksLikeMedia) {
    return {
      slug,
      ok: false,
      note: `title "${resolveBody.title}" resolved and streamed, but content-type was "${contentType}" (expected video/audio/image) — check mediaExtract.ts's ext mapping for this platform`,
    };
  }
  if (!receivedSome) {
    return { slug, ok: false, note: "file response had no body bytes" };
  }

  return {
    slug,
    ok: true,
    note: `"${resolveBody.title}" — ${resolveBody.formats.length} format(s), ${contentType}, ${fmtBytes(contentLength ? parseInt(contentLength, 10) : 0)}`,
  };
}

async function main() {
  console.log(`Testing against ${baseUrl}\n`);
  const results = [];
  for (const [slug, url] of Object.entries(LINKS)) {
    process.stdout.write(`${slug.padEnd(28)} ... `);
    const result = await testPlatform(slug, url);
    results.push(result);
    console.log(result.ok === null ? "SKIPPED" : result.ok ? "PASS" : "FAIL", "—", result.note);
  }

  const tested = results.filter((r) => r.ok !== null);
  const passed = tested.filter((r) => r.ok).length;
  const skipped = results.length - tested.length;

  console.log(`\n${passed}/${tested.length} passed` + (skipped ? ` (${skipped} skipped — no link provided)` : ""));

  if (skipped === results.length) {
    console.log("\nNo links were provided — edit the LINKS object at the top of this file with real, current, public links for each platform, then run again.");
  }

  process.exit(tested.some((r) => !r.ok) ? 1 : 0);
}

main();

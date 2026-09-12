#!/usr/bin/env -S npx tsx
/**
 * Tests the parts of the pipeline that don't need real network access to
 * a live platform to verify correctly — URL validation, the SSRF guard,
 * and URL normalization. These import the actual production modules
 * directly (not reimplemented copies), so a real regression in the real
 * code fails these tests, not just a stale mirror of it.
 *
 * For testing real extraction against live platforms, see
 * scripts/test-real-links.mjs instead — that needs actual network access
 * this script deliberately doesn't require, so it can run anywhere,
 * including CI, with zero setup.
 *
 * Usage: npx tsx scripts/test-security.ts
 */
import { checkUrlIsSafeToFetch } from "../src/lib/ssrfGuard";
import { normalizeSubmittedUrl } from "../src/lib/urlNormalize";
import { isRateLimited } from "../src/lib/rateLimit";
import { buildSafeFilename } from "../src/lib/filename";
import { findDuplicateJob, countActiveDownloads, canStartDownload, nextWaitingJob, type Job } from "../src/lib/downloadQueue";

function makeJob(overrides: Partial<Job>): Job {
  return {
    id: "test-id",
    originalUrl: "https://example.com/1",
    normalizedUrl: "https://example.com/1",
    status: "ready",
    title: "Test",
    formats: [],
    selectedFormatToken: null,
    error: null,
    createdAt: Date.now(),
    completedAt: null,
    retryCount: 0,
    downloadProgress: null,
    ...overrides,
  };
}

let passed = 0;
let failed = 0;

function check(description: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  PASS  ${description}`);
  } else {
    failed++;
    console.log(`  FAIL  ${description}`);
  }
}

async function main() {
  console.log("=== SSRF guard ===");

  check("rejects file:// protocol", !(await checkUrlIsSafeToFetch("file:///etc/passwd")).safe);
  check("rejects javascript: protocol", !(await checkUrlIsSafeToFetch("javascript:alert(1)")).safe);
  check("rejects localhost", !(await checkUrlIsSafeToFetch("http://localhost:3000/secret")).safe);
  check("rejects loopback IPv4 (127.0.0.1)", !(await checkUrlIsSafeToFetch("http://127.0.0.1/admin")).safe);
  check("rejects RFC1918 10.x", !(await checkUrlIsSafeToFetch("http://10.0.0.5/internal")).safe);
  check("rejects RFC1918 192.168.x", !(await checkUrlIsSafeToFetch("http://192.168.1.1/router")).safe);
  check("rejects RFC1918 172.16-31.x", !(await checkUrlIsSafeToFetch("http://172.20.0.1/")).safe);
  check(
    "rejects link-local / cloud metadata endpoint (169.254.169.254)",
    !(await checkUrlIsSafeToFetch("http://169.254.169.254/latest/meta-data/")).safe
  );
  check("rejects IPv6 loopback (::1)", !(await checkUrlIsSafeToFetch("http://[::1]/")).safe);
  check("accepts a genuine public https URL", (await checkUrlIsSafeToFetch("https://www.wikipedia.org/")).safe);
  check("accepts a genuine public http URL", (await checkUrlIsSafeToFetch("http://example.com/")).safe);
  check("rejects malformed URL", !(await checkUrlIsSafeToFetch("not a url at all")).safe);

  console.log("\n=== URL normalization ===");

  check(
    "strips utm_ tracking params",
    normalizeSubmittedUrl("https://example.com/video?utm_source=ig&utm_medium=share") === "https://example.com/video"
  );
  check(
    "strips igshid",
    normalizeSubmittedUrl("https://instagram.com/reel/abc123?igshid=xyz") === "https://instagram.com/reel/abc123"
  );
  check(
    "strips fbclid",
    normalizeSubmittedUrl("https://facebook.com/watch?v=1&fbclid=abc") === "https://facebook.com/watch?v=1"
  );
  check(
    "removes trailing slash on non-root path",
    normalizeSubmittedUrl("https://example.com/reel/123/") === "https://example.com/reel/123"
  );
  check(
    "leaves root path slash alone",
    normalizeSubmittedUrl("https://example.com/") === "https://example.com/"
  );
  check(
    "leaves a clean URL with no tracking params unchanged",
    normalizeSubmittedUrl("https://example.com/video/123") === "https://example.com/video/123"
  );
  check(
    "doesn't throw on malformed input, returns it trimmed",
    normalizeSubmittedUrl("  not a url  ") === "not a url"
  );

  console.log("\n=== Rate limiter ===");

  const testKey1 = `test:${Date.now()}:a`;
  let allowedCount = 0;
  for (let i = 0; i < 10; i++) {
    if (!isRateLimited(testKey1, { windowMs: 1000, maxRequests: 3 })) allowedCount++;
  }
  check("allows exactly maxRequests before limiting", allowedCount === 3);

  const testKey2 = `test:${Date.now()}:b`;
  check("separate keys have independent budgets", !isRateLimited(testKey2, { windowMs: 1000, maxRequests: 1 }));
  check("same key's second request is limited", isRateLimited(testKey2, { windowMs: 1000, maxRequests: 1 }));

  console.log("\n=== Filename sanitization ===");

  check(
    "strips path traversal characters entirely",
    !buildSafeFilename("../../etc/passwd", "mp4").includes("..") &&
      !buildSafeFilename("../../etc/passwd", "mp4").includes("/")
  );
  check(
    "strips backslashes (Windows path separator)",
    !buildSafeFilename("C:\\Windows\\System32", "mp4").includes("\\")
  );
  check("keeps a normal title readable", buildSafeFilename("My Cool Video", "mp4") === "My Cool Video.mp4");
  check(
    "falls back to 'media' for an empty-after-sanitizing title",
    buildSafeFilename("💯🔥✨", "mp4") === "media.mp4"
  );
  check(
    "falls back to 'media' for a Windows reserved device name",
    buildSafeFilename("CON", "mp4") === "media.mp4" && buildSafeFilename("con", "mp4") === "media.mp4"
  );
  check("truncates an excessively long title", buildSafeFilename("a".repeat(500), "mp4").length <= 84);
  check(
    "collapses repeated whitespace",
    buildSafeFilename("too    many     spaces", "mp4") === "too many spaces.mp4"
  );
  check(
    "falls back to a safe extension if given a suspicious one",
    buildSafeFilename("video", "mp4/../../etc").endsWith(".bin")
  );
  check("accepts a normal extension unchanged", buildSafeFilename("video", "mp3").endsWith(".mp3"));

  console.log("\n=== Download queue logic ===");

  check(
    "detects an exact-duplicate URL already in the queue",
    !!findDuplicateJob([makeJob({ normalizedUrl: "https://example.com/reel/1" })], "https://example.com/reel/1")
  );
  check(
    "detects a duplicate after tracking-param normalization",
    !!findDuplicateJob(
      [makeJob({ normalizedUrl: "https://example.com/reel/1" })],
      "https://example.com/reel/1?utm_source=ig&utm_medium=share"
    )
  );
  check(
    "does not flag two genuinely different URLs as duplicates",
    !findDuplicateJob([makeJob({ normalizedUrl: "https://example.com/reel/1" })], "https://example.com/reel/2")
  );
  check(
    "a cancelled job doesn't block resubmitting the same URL",
    !findDuplicateJob(
      [makeJob({ normalizedUrl: "https://example.com/reel/1", status: "cancelled" })],
      "https://example.com/reel/1"
    )
  );
  check(
    "a failed job doesn't block resubmitting the same URL",
    !findDuplicateJob(
      [makeJob({ normalizedUrl: "https://example.com/reel/1", status: "failed" })],
      "https://example.com/reel/1"
    )
  );

  check(
    "counts only jobs actually downloading, not ready/analyzing ones",
    countActiveDownloads([
      makeJob({ status: "downloading" }),
      makeJob({ status: "ready" }),
      makeJob({ status: "analyzing" }),
      makeJob({ status: "downloading" }),
    ]) === 2
  );

  check(
    "allows starting a download when under the concurrency limit",
    canStartDownload([makeJob({ status: "downloading" })], 2)
  );
  check(
    "blocks starting a download at the concurrency limit",
    !canStartDownload([makeJob({ status: "downloading" }), makeJob({ status: "downloading" })], 2)
  );

  check(
    "picks the oldest waiting job first (FIFO, no starvation)",
    nextWaitingJob([
      makeJob({ id: "newer", status: "ready", selectedFormatToken: "t1", createdAt: 2000 }),
      makeJob({ id: "older", status: "ready", selectedFormatToken: "t2", createdAt: 1000 }),
    ])?.id === "older"
  );
  check(
    "skips a ready job with no format selected yet",
    nextWaitingJob([makeJob({ status: "ready", selectedFormatToken: null })]) === undefined
  );
  check(
    "skips jobs that aren't in the ready state",
    nextWaitingJob([makeJob({ status: "downloading", selectedFormatToken: "t1" })]) === undefined
  );

  console.log(`\n${passed}/${passed + failed} passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
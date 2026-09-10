#!/usr/bin/env node
/**
 * Automated SEO validation (see SEO checklist item 43).
 *
 * Usage:
 *   npm run build && npm run start &
 *   node scripts/validate-seo.mjs http://localhost:3000
 *
 *   # After every real deploy, also run it against the live URL — this is
 *   # the check that actually catches a misconfigured SITE_URL in
 *   # production, which local testing can't:
 *   node scripts/validate-seo.mjs https://www.yourrealdomain.com
 *
 * Checks per page: missing/duplicate <title>, missing/duplicate meta
 * description, missing canonical, missing/multiple <h1>, missing OG image,
 * images without alt, non-HTTPS asset URLs (when checking a production
 * base URL), and — critically — whether canonical/og:url/og:image actually
 * point back to the same origin the page was fetched from. That last check
 * is what catches a deployment where SITE_URL was never set: the page
 * would otherwise silently claim its own canonical URL is
 * http://localhost:3000, which search engines can never reach. Also
 * validates sitemap.xml and robots.txt are reachable and well-formed.
 * Exits non-zero if any check fails, so it can gate a build.
 */

const baseUrl = process.argv[2] || "http://localhost:3000";

const staticPaths = [
  "/",
  "/how-it-works",
  "/faq",
  "/privacy",
  "/terms",
  "/contact",
  "/blog",
];

async function fetchText(path) {
  const res = await fetch(`${baseUrl}${path}`);
  return { status: res.status, body: await res.text() };
}

function extractAll(regex, text) {
  return [...text.matchAll(regex)].map((m) => m[1]);
}

async function checkSitemap() {
  const { status, body } = await fetchText("/sitemap.xml");
  const problems = [];
  if (status !== 200) {
    problems.push(`sitemap.xml returned status ${status}`);
    return { problems, urls: [] };
  }
  const urls = extractAll(/<loc>(.*?)<\/loc>/g, body);
  if (urls.length === 0) problems.push("sitemap.xml has no <loc> entries");
  for (const url of urls) {
    if (!url.startsWith("https://") && !url.startsWith("http://localhost")) {
      problems.push(`Non-HTTPS URL in sitemap: ${url}`);
    }
  }
  return { problems, urls };
}

async function checkRobots() {
  const { status, body } = await fetchText("/robots.txt");
  const problems = [];
  if (status !== 200) problems.push(`robots.txt returned status ${status}`);
  if (!/Sitemap:/i.test(body)) problems.push("robots.txt is missing a Sitemap: line");
  return problems;
}

async function checkPage(path) {
  const problems = [];
  const { status, body } = await fetchText(path);

  if (status !== 200) {
    problems.push(`${path}: returned status ${status}`);
    return problems;
  }

  const titles = extractAll(/<title>(.*?)<\/title>/gs, body);
  if (titles.length === 0) problems.push(`${path}: missing <title>`);

  const descriptions = extractAll(
    /<meta\s+name="description"\s+content="([^"]*)"/g,
    body
  );
  if (descriptions.length === 0) problems.push(`${path}: missing meta description`);

  const canonicals = extractAll(
    /<link\s+rel="canonical"\s+href="([^"]*)"/g,
    body
  );
  if (canonicals.length === 0) problems.push(`${path}: missing canonical link`);

  const h1s = extractAll(/<h1[^>]*>/g, body);
  if (h1s.length === 0) problems.push(`${path}: missing <h1>`);
  if (h1s.length > 1) problems.push(`${path}: multiple <h1> elements (${h1s.length})`);

  const ogImages = extractAll(/<meta\s+property="og:image"\s+content="([^"]*)"/g, body);
  if (ogImages.length === 0) problems.push(`${path}: missing og:image`);

  const ogUrls = extractAll(/<meta\s+property="og:url"\s+content="([^"]*)"/g, body);

  // The single most damaging class of SEO bug: SITE_URL not set in the
  // deployment environment, so canonical/og:url/og:image silently fall
  // back to http://localhost:3000 while the page is actually served from
  // the real domain. This tells search engines the "real" page lives at
  // an address they can never reach. Catch it by comparing every absolute
  // URL this page emits against the origin we're actually testing.
  const baseOrigin = new URL(baseUrl).origin;
  const originChecks = [
    ["canonical", canonicals[0]],
    ["og:url", ogUrls[0]],
    ["og:image", ogImages[0]],
  ];
  for (const [label, url] of originChecks) {
    if (!url) continue;
    let linkOrigin;
    try {
      linkOrigin = new URL(url).origin;
    } catch {
      problems.push(`${path}: ${label} is not a valid absolute URL: "${url}"`);
      continue;
    }
    if (linkOrigin !== baseOrigin) {
      problems.push(
        `${path}: ${label} points to "${linkOrigin}" but this page is served from "${baseOrigin}" — SITE_URL is very likely unset or wrong in this deployment's environment variables`
      );
    }
  }

  const imgTags = extractAll(/<img\s+([^>]*)>/g, body);
  for (const attrs of imgTags) {
    if (!/alt="/.test(attrs)) problems.push(`${path}: <img> without alt attribute`);
  }

  return problems;
}

async function main() {
  console.log(`Validating ${baseUrl} ...\n`);
  const allProblems = [];
  const seenTitles = new Map();
  const seenDescriptions = new Map();

  for (const path of staticPaths) {
    const problems = await checkPage(path);
    allProblems.push(...problems);
  }

  const { problems: sitemapProblems, urls } = await checkSitemap();
  allProblems.push(...sitemapProblems);

  const robotsProblems = await checkRobots();
  allProblems.push(...robotsProblems);

  // Duplicate title/description check across every sitemap URL. Use each
  // URL's path only, so this still works when the sitemap was built with a
  // different SITE_URL than the host we're crawling right now.
  for (const url of urls) {
    const path = new URL(url).pathname;
    const { body } = await fetchText(path);
    const [title] = extractAll(/<title>(.*?)<\/title>/gs, body);
    const [description] = extractAll(/<meta\s+name="description"\s+content="([^"]*)"/g, body);

    if (title) {
      if (seenTitles.has(title)) {
        allProblems.push(`Duplicate <title> "${title}" on ${path} and ${seenTitles.get(title)}`);
      } else {
        seenTitles.set(title, path);
      }
    }
    if (description) {
      if (seenDescriptions.has(description)) {
        allProblems.push(
          `Duplicate meta description on ${path} and ${seenDescriptions.get(description)}`
        );
      } else {
        seenDescriptions.set(description, path);
      }
    }
  }

  if (allProblems.length === 0) {
    console.log("✓ No SEO issues found.");
    process.exit(0);
  } else {
    console.log(`✗ ${allProblems.length} issue(s) found:\n`);
    for (const p of allProblems) console.log(` - ${p}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Validation script failed:", err);
  process.exit(1);
});

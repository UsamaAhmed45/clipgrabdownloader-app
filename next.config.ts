import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // URL normalization: enforce one canonical URL shape (see README "URL
  // normalization"). Trailing slashes are stripped by default in Next.js;
  // host/scheme normalization (non-www → www or vice versa, http → https)
  // belongs at the edge/CDN layer in production (e.g. a platform-level
  // redirect rule), since it needs to run before the app even boots.
  trailingSlash: false,

  async redirects() {
    return [
      // Twitter was rebranded to X; keep one canonical content page instead
      // of two near-duplicate platform pages (see platforms.ts redirectTo).
      {
        source: "/twitter-video-downloader",
        destination: "/x-video-downloader",
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

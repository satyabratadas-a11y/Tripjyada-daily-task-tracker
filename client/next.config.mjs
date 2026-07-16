/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Gemini image extraction can take longer than Next's 30-second rewrite default. Keep the
    // same-origin dev proxy alive long enough for the API to return its scan result.
    proxyTimeout: 120_000,
  },
  // Dev-only: proxy /api/* to the local Express server so the browser only ever talks to the
  // Next.js dev server's own origin. Without this, hitting the client via a LAN IP (needed to
  // test camera features on a phone) while the client hardcodes an absolute API URL makes every
  // API call cross-origin, and the login cookie — set with the default SameSite=Lax in dev — gets
  // silently dropped, so the app "logs in" but every follow-up request comes back 401. Proxying
  // keeps client + API on the same origin regardless of which host/IP the browser used to get here.
  async rewrites() {
    if (process.env.NODE_ENV === 'production') return [];
    return [{ source: '/api/:path*', destination: 'http://localhost:4000/api/:path*' }];
  },
  // Hostinger's CDN edge was caching every response — including page HTML — for a full year
  // (s-maxage=31536000). That's correct for hashed /_next/static files but not for pages: a
  // stale-cached page keeps referencing asset filenames from an older deploy that no longer
  // exist post-redeploy, so the CSS/JS 404 silently and the page renders unstyled on whichever
  // device/edge-node still has the old page cached. Force pages to always revalidate, and
  // re-assert the long-lived immutable cache only for the actual hashed static assets.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
  webpack: (config, { dev, isServer }) => {
    // The on-disk webpack cache repeatedly got corrupted here (Windows + this dev workflow's
    // frequent restarts interrupt its pack-file writes). Disabling it in dev trades a bit of
    // rebuild speed for no longer needing to manually wipe .next when the server 500s.
    if (dev) {
      config.cache = false;
    }

    // In this Windows setup, Next dev was emitting server chunks into `.next/server/chunks`
    // while the generated server runtime still tried to require them from `.next/server`.
    // Point the server chunk filename template at `chunks/*.js` so the runtime resolves the
    // actual emitted location instead of crashing with "Cannot find module './819.js'".
    if (dev && isServer && config.output) {
      config.output.chunkFilename = 'chunks/[id].js';
    }

    return config;
  },
};

export default nextConfig;

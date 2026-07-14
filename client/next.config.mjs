/** @type {import('next').NextConfig} */
const nextConfig = {
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

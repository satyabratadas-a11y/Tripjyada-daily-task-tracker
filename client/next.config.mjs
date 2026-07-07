/** @type {import('next').NextConfig} */
const nextConfig = {
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

const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.svgrepo.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
        ],
      },
    ];
  },
  async redirects() {
    const demoVideo = process.env.DEMO_VIDEO_URL || "https://www.youtube.com/";
    const pitchDeck =
      process.env.PITCH_DECK_URL || "https://example.com/";

    return [
      {
        source: "/demo-video",
        destination: demoVideo,
        permanent: false,
      },
      {
        source: "/pitch-deck",
        destination: pitchDeck,
        permanent: false,
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": path.resolve(
        __dirname,
        "src/lib/shims/asyncStorage.ts"
      ),
    };
    return config;
  },
};

module.exports = nextConfig;

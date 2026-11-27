
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep these for your Three.js ecosystem if currently required.
  transpilePackages: [
    "three",
    "@react-three/fiber",
    "@react-three/drei",
  ],

  experimental: {
    // Development-time feedback for coding agents.
    agentFeedback: true,
  },

  // Cache Components and Partial Prefetching.
  cacheComponents: true,
  partialPrefetching: true,

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  images: {
    // Only allow these image quality values.
    qualities: [75, 90],

    // Serve modern formats through next/image.
    formats: ["image/avif", "image/webp"],

    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

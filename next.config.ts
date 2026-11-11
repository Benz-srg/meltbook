import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // addresses shared before the shelf existed keep working
  async redirects() {
    return [
      { source: "/meltbook.epub", destination: "/epub/vol-1.epub", permanent: true },
      { source: "/book", destination: "/", permanent: false },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

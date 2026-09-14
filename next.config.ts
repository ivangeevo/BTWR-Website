import type { NextConfig } from "next";

// Served from the btwr.org custom domain, so no basePath is needed —
// a custom domain serves from the root, unlike the prior
// username.github.io/BTWR-Website/ project-page URL.
const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

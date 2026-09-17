import type { NextConfig } from "next";

// Served from the btwr.org custom domain, so no basePath is needed —
// a custom domain serves from the root, unlike the prior
// username.github.io/BTWR-Website/ project-page URL.
const nextConfig: NextConfig = {
  output: "export",
  // Export each route as <route>/index.html rather than <route>.html, so a
  // hard refresh or direct link resolves on any plain static file server
  // (e.g. the VS Code Live Server extension used for local previews), not
  // just hosts like GitHub Pages that resolve extension-less paths on their own.
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

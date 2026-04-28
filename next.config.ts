import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
    // Allow blob: URLs for local preview
    dangerouslyAllowSVG: false,
  },
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;

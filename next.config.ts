import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Set the root directory to fix the lockfile warning
    root: process.cwd(),
  },
};

export default nextConfig;

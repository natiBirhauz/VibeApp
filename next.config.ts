import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Required for Sandpack
    esmExternals: "loose",
  },
};

export default nextConfig;

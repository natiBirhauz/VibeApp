/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Required for Sandpack
    esmExternals: "loose",
  },
};

export default nextConfig;


import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: { root: process.cwd() },
  experimental: {
    cpus: process.platform === "win32" ? 1 : undefined,
    staticGenerationMaxConcurrency: process.platform === "win32" ? 1 : undefined,
  },
};

export default nextConfig;


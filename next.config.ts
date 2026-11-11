import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["c38jgp5g-3000.asse.devtunnels.ms"],
  experimental: {
    agentFeedback: true,
    serverActions: {
      allowedOrigins: ["c38jgp5g-3000.asse.devtunnels.ms"],
    },
  },
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;

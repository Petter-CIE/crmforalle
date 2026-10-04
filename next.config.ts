import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Lets the open app notice that a newer version has been deployed (see AppUpdates).
    NEXT_PUBLIC_APP_VERSION: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
  },
};

export default nextConfig;

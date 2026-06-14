import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Cover uploads run through a Server Action; the default 1 MB body limit
    // is too small for photos. Covers are stored as-is, so keep a sane cap.
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;

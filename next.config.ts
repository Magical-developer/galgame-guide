import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.krzacg.com",
      },
    ],
  },
};

export default nextConfig;

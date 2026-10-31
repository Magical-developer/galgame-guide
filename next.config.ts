import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.krzacg.com",
      },
      {
        protocol: "https",
        hostname: "upload-cdn.b-cdn.net",
      },
    ],
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [256, 384],
  },
  async rewrites() {
    // Umami 脚本会从自身 src 推导上报地址：src 是 /stats/script.js，
    // 它就往 /stats/api/send 上报。两个路径都代理过去，HTML 里就只剩同源地址。
    return [
      {
        source: "/stats/script.js",
        destination: "https://umami.krzacg.com/script.js",
      },
      {
        source: "/stats/api/send",
        destination: "https://umami.krzacg.com/api/send",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
      {
        source: "/api/cron/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;

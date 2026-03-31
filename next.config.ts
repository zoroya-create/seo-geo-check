import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer", "cheerio"],
  experimental: {},
};

export default nextConfig;

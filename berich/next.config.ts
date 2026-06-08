import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/berich',
  serverExternalPackages: ["tesseract.js", "sharp"],
};

export default nextConfig;

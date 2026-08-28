import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local dev access via 127.0.0.1 as well as localhost.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;

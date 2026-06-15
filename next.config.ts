import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: [
    'closing-upward-mite.ngrok-free.app',
    'bb4a-2409-40e4-1000-b1b9-3c06-b130-2560-c6b.ngrok-free.app',
  ],
};

export default nextConfig;

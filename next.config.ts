import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const localDevOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  ...Object.values(networkInterfaces())
    .flatMap((entries) => entries ?? [])
    .filter((entry) => entry.family === "IPv4" && !entry.internal)
    .map((entry) => `http://${entry.address}:3000`),
];

const nextConfig: NextConfig = {
  // NEXT_DIST_DIR: opsional, untuk verifikasi build lokal ke folder terpisah
  // (default tetap .next di produksi).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  allowedDevOrigins: localDevOrigins,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
      {
        protocol: "https",
        hostname: "jualrumahproperty.com",
      },
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const s3Base = process.env.S3_PUBLIC_BASE_URL ?? "http://localhost:4566/tycoma-media";
const s3Url = new URL(s3Base);
const s3Port = s3Url.port ? { port: s3Url.port } : {};

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: s3Url.protocol === "https:" ? "https" : "http",
        hostname: s3Url.hostname,
        ...s3Port,
      },
    ],
    dangerouslyAllowSVG: true,
  },
};

export default nextConfig;
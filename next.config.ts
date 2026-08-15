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
    // The S3 origin runs on localhost (LocalStack) in the dev environment; the
    // default SSRF guard would block image optimization for it. Production uses
    // a public S3 origin, so this flag is a no-op there.
    dangerouslyAllowLocalIP: true,
  },
};

export default nextConfig;
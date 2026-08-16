import { createHash, createHmac } from "node:crypto";
import { env } from "@/shared/env-instance";
import { SIGNED_URL_TTL_SECONDS } from "../domain/signed-url";
import type { ObjectStorage } from "../domain/types";

/**
 * Re-export for the framework composition root that imports the adapter
 * directly. The single source of truth is `domain/signed-url.ts`.
 */
export { SIGNED_URL_TTL_SECONDS };

function config() {
  return {
    endpoint: env.S3_ENDPOINT,
    bucket: env.S3_BUCKET,
    publicBase: env.S3_PUBLIC_BASE_URL,
    region: env.S3_REGION,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  };
}

async function ensureBucket(endpoint: string, bucket: string) {
  const url = `${endpoint.replace(/\/$/, "")}/${bucket}`;
  const head = await fetch(url, { method: "HEAD" });
  if (head.ok || head.status === 403) return;
  await fetch(url, { method: "PUT" });
}

function sha256Hex(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

function toAmzDate(date: Date): { amzDate: string; dateStamp: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const amzDate =
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
  const dateStamp = `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
  return { amzDate, dateStamp };
}

/**
 * Build an AWS SigV4 presigned GET URL for a private object. Works against
 * real S3 and LocalStack without pulling in `@aws-sdk/*` — we use `node:crypto`
 * only. See https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html.
 */
function buildSignedUrl(opts: {
  endpoint: string;
  bucket: string;
  key: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  ttlSeconds: number;
}): string {
  const { endpoint, bucket, key, region, accessKeyId, secretAccessKey, ttlSeconds } = opts;
  const now = new Date();
  const { amzDate, dateStamp } = toAmzDate(now);
  const host = `${bucket}.${endpoint.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  const canonicalUri = `/${encodeURI(key)}`;
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;

  const params = new URLSearchParams();
  params.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
  params.set("X-Amz-Credential", `${accessKeyId}/${credentialScope}`);
  params.set("X-Amz-Date", amzDate);
  params.set("X-Amz-Expires", String(ttlSeconds));
  params.set("X-Amz-SignedHeaders", "host");

  const canonicalQueryString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = "host";
  const payloadHash = "UNSIGNED-PAYLOAD";
  const canonicalRequest = ["GET", canonicalUri, canonicalQueryString, canonicalHeaders, signedHeaders, payloadHash].join("\n");

  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256Hex(canonicalRequest)].join("\n");

  const kDate = hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, "s3");
  const kSigning = hmacSha256(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  params.set("X-Amz-Signature", signature);

  return `https://${host}${canonicalUri}?${params.toString()}`;
}

export const s3ObjectStorage: ObjectStorage = {
  async put(key, body, contentType) {
    const { endpoint, bucket, publicBase } = config();
    await ensureBucket(endpoint, bucket);
    const url = `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: new Uint8Array(body),
    });
    if (!res.ok) {
      throw new Error(`S3 upload failed: ${res.status} ${await res.text()}`);
    }
    return { url: `${publicBase.replace(/\/$/, "")}/${key}` };
  },
  async delete(key) {
    const { endpoint, bucket } = config();
    const url = `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) {
      throw new Error(`S3 delete failed: ${res.status} ${await res.text()}`);
    }
  },
  async getSignedUrl(key, ttlSeconds) {
    const cfg = config();
    return buildSignedUrl({
      endpoint: cfg.endpoint,
      bucket: cfg.bucket,
      key,
      region: cfg.region,
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
      ttlSeconds,
    });
  },
};

import { env } from "@/shared/env-instance";
import { SIGNED_URL_TTL_SECONDS } from "../domain/signed-url";
import type { ObjectStorage } from "../domain/types";
import { buildSignedUrl, resolveTarget } from "./s3-presign";

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
    forcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
  };
}

async function ensureBucket(endpoint: string, bucket: string, forcePathStyle: boolean) {
  const { scheme, host, bucketPrefix } = resolveTarget({ endpoint, bucket, forcePathStyle });
  const url = `${scheme}://${host}${bucketPrefix}`;
  const head = await fetch(url, { method: "HEAD" });
  if (head.ok || head.status === 403) return;
  await fetch(url, { method: "PUT" });
}

export const s3ObjectStorage: ObjectStorage = {
  async put(key, body, contentType) {
    const { endpoint, bucket, publicBase, forcePathStyle } = config();
    await ensureBucket(endpoint, bucket, forcePathStyle);
    const { scheme, host, bucketPrefix } = resolveTarget({ endpoint, bucket, forcePathStyle });
    const url = `${scheme}://${host}${bucketPrefix}/${encodeURI(key)}`;
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
    const { endpoint, bucket, forcePathStyle } = config();
    const { scheme, host, bucketPrefix } = resolveTarget({ endpoint, bucket, forcePathStyle });
    const url = `${scheme}://${host}${bucketPrefix}/${encodeURI(key)}`;
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
      forcePathStyle: cfg.forcePathStyle,
    });
  },
};
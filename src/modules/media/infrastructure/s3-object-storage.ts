import { env } from "@/shared/env-instance";
import type { ObjectStorage } from "../domain/types";

function config() {
  return {
    endpoint: env.S3_ENDPOINT,
    bucket: env.S3_BUCKET,
    publicBase: env.S3_PUBLIC_BASE_URL,
  };
}

async function ensureBucket(endpoint: string, bucket: string) {
  const url = `${endpoint.replace(/\/$/, "")}/${bucket}`;
  const head = await fetch(url, { method: "HEAD" });
  if (head.ok || head.status === 403) return;
  await fetch(url, { method: "PUT" });
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
};

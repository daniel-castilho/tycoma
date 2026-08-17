import { createHash, createHmac } from "node:crypto";

export type EndpointInfo = { scheme: "http" | "https"; host: string };

export type S3Target = {
  scheme: "http" | "https";
  host: string;
  bucketPrefix: string;
};

export type SignedUrlOptions = {
  endpoint: string;
  bucket: string;
  key: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  ttlSeconds: number;
  forcePathStyle: boolean;
};

/**
 * Split an S3 endpoint into scheme + host. Missing scheme defaults to `https`
 * (real S3); `http://localhost:4566` keeps `http` for LocalStack.
 */
export function parseEndpoint(endpoint: string): EndpointInfo {
  const trimmed = endpoint.replace(/\/+$/, "");
  const match = /^(https?):\/\/(.+)$/.exec(trimmed);
  if (match) {
    return { scheme: match[1] === "http" ? "http" : "https", host: match[2] };
  }
  return { scheme: "https", host: trimmed };
}

/**
 * Resolve the addressing style used for every S3 call. Path-style
 * (`S3_FORCE_PATH_STYLE=true`, the LocalStack default) keeps the bucket in the
 * path; virtual-host (`false`, real S3) puts it in the host. The host value is
 * exactly what SigV4 signs (`host:` header), so upload, delete and presign MUST
 * share this function.
 */
export function resolveTarget(opts: {
  endpoint: string;
  bucket: string;
  forcePathStyle: boolean;
}): S3Target {
  const { scheme, host } = parseEndpoint(opts.endpoint);
  if (opts.forcePathStyle) {
    return { scheme, host, bucketPrefix: `/${opts.bucket}` };
  }
  return { scheme, host: `${opts.bucket}.${host}`, bucketPrefix: "" };
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
export function buildSignedUrl(opts: SignedUrlOptions): string {
  const { endpoint, bucket, key, region, accessKeyId, secretAccessKey, ttlSeconds, forcePathStyle } = opts;
  const target = resolveTarget({ endpoint, bucket, forcePathStyle });
  const now = new Date();
  const { amzDate, dateStamp } = toAmzDate(now);
  const canonicalUri = `${target.bucketPrefix}/${encodeURI(key)}`;
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

  const canonicalHeaders = `host:${target.host}\n`;
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

  return `${target.scheme}://${target.host}${canonicalUri}?${params.toString()}`;
}
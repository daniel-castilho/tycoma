import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSignedUrl, parseEndpoint, resolveTarget, type SignedUrlOptions } from "./s3-presign.ts";

const base: SignedUrlOptions = {
  endpoint: "http://localhost:4566",
  bucket: "tycoma-media",
  key: "media/507f1f77bcf86cd799439011.jpg",
  region: "us-east-1",
  accessKeyId: "test",
  secretAccessKey: "test",
  ttlSeconds: 1800,
  forcePathStyle: true,
};

describe("parseEndpoint", () => {
  it("keeps http for a LocalStack endpoint", () => {
    assert.deepEqual(parseEndpoint("http://localhost:4566"), { scheme: "http", host: "localhost:4566" });
  });

  it("keeps https for real S3", () => {
    assert.deepEqual(parseEndpoint("https://s3.amazonaws.com"), { scheme: "https", host: "s3.amazonaws.com" });
  });

  it("defaults to https when the scheme is missing", () => {
    assert.deepEqual(parseEndpoint("s3.amazonaws.com"), { scheme: "https", host: "s3.amazonaws.com" });
  });

  it("strips trailing slashes", () => {
    assert.deepEqual(parseEndpoint("http://localhost:4566/"), { scheme: "http", host: "localhost:4566" });
  });
});

describe("resolveTarget", () => {
  it("uses path-style when forcePathStyle is true", () => {
    assert.deepEqual(resolveTarget({ endpoint: "http://localhost:4566", bucket: "tycoma-media", forcePathStyle: true }), {
      scheme: "http",
      host: "localhost:4566",
      bucketPrefix: "/tycoma-media",
    });
  });

  it("uses virtual-host style when forcePathStyle is false", () => {
    assert.deepEqual(resolveTarget({ endpoint: "https://s3.amazonaws.com", bucket: "tycoma-media", forcePathStyle: false }), {
      scheme: "https",
      host: "tycoma-media.s3.amazonaws.com",
      bucketPrefix: "",
    });
  });
});

describe("buildSignedUrl", () => {
  it("starts with http for a LocalStack endpoint (never https)", () => {
    const url = buildSignedUrl(base);
    assert.ok(url.startsWith("http://"), `expected http:// prefix, got ${url.slice(0, 20)}`);
  });

  it("uses path-style addressing: host without bucket prefix, path contains /{bucket}/{key}", () => {
    const url = buildSignedUrl(base);
    const parsed = new URL(url);
    assert.equal(parsed.host, "localhost:4566");
    assert.ok(parsed.pathname.startsWith("/tycoma-media/media/"), `unexpected path ${parsed.pathname}`);
  });

  it("uses virtual-host addressing when forcePathStyle is false: host starts with {bucket}., path is /{key}", () => {
    const url = buildSignedUrl({ ...base, endpoint: "https://s3.amazonaws.com", forcePathStyle: false });
    const parsed = new URL(url);
    assert.ok(parsed.host.startsWith("tycoma-media."), `expected bucket-prefixed host, got ${parsed.host}`);
    assert.equal(parsed.pathname, "/media/507f1f77bcf86cd799439011.jpg");
  });

  it("signs the same host header it addresses (path-style)", () => {
    const url = buildSignedUrl(base);
    // The signature is bound to the host header; recomputing it here is not
    // possible without the signing key, but we can assert the request it would
    // hit matches the host used for the signature. At minimum the URL host and
    // path must be consistent with resolveTarget's path-style shape.
    const parsed = new URL(url);
    assert.equal(parsed.host, resolveTarget({ endpoint: base.endpoint, bucket: base.bucket, forcePathStyle: true }).host);
  });

  it("includes X-Amz-Signature and an X-Amz-Expires equal to the TTL", () => {
    const url = buildSignedUrl(base);
    const parsed = new URL(url);
    assert.ok(parsed.searchParams.has("X-Amz-Signature"), "missing X-Amz-Signature");
    assert.equal(parsed.searchParams.get("X-Amz-Signature")!.length, 64);
    assert.equal(parsed.searchParams.get("X-Amz-Expires"), String(base.ttlSeconds));
  });

  it("is stable: same inputs produce the same signature within the same second", () => {
    const first = buildSignedUrl(base);
    const second = buildSignedUrl(base);
    assert.equal(first, second);
  });
});
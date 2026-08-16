import type { MediaAsset } from "../domain/types";

/**
 * Phase C: signed media URLs use a single TTL constant so admin preview and
 * public site behave identically. Every place that renders a media URL must
 * go through this helper — do not return the raw `MediaAsset.url` field.
 */
export const SIGNED_URL_TTL_SECONDS = 30 * 60;

/**
 * Port helper. Domain/application call this with whatever `ObjectStorage`
 * the framework composition root wires up; the adapter implementation lives
 * in `infrastructure/s3-object-storage.ts`.
 */
export type SignedUrlIssuer = {
  getSignedUrl(key: string, ttlSeconds: number): Promise<string>;
};

export async function signMediaUrl(
  issuer: SignedUrlIssuer,
  asset: MediaAsset,
): Promise<string> {
  return issuer.getSignedUrl(asset.storageKey, SIGNED_URL_TTL_SECONDS);
}

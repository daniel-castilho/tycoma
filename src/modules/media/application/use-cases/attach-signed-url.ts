import type { MediaAsset } from "../../domain/types";
import type { SignedUrlIssuer } from "../../domain/signed-url";
import { signMediaUrl } from "../../domain/signed-url";

export type MediaAssetWithUrl = MediaAsset & { signedUrl: string };

export async function attachSignedUrl(
  issuer: SignedUrlIssuer,
  asset: MediaAsset,
): Promise<MediaAssetWithUrl> {
  return { ...asset, signedUrl: await signMediaUrl(issuer, asset) };
}

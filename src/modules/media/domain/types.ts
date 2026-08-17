export type MediaAsset = {
  id: string;
  filename: string;
  storageKey: string;
  url: string;
  mimeType: string;
  size: number;
  alt: string | null;
  caption: string | null;
  createdAt: Date;
};

export type MediaReader = {
  list(query: { search?: string; mimePrefix?: string }): Promise<MediaAsset[]>;
  findById(id: string): Promise<MediaAsset | null>;
  count(): Promise<number>;
  totalBytes(): Promise<number>;
};

export type MediaWriter = {
  create(data: Omit<MediaAsset, "id" | "createdAt">): Promise<MediaAsset>;
  update(
    id: string,
    data: Partial<Pick<MediaAsset, "alt" | "caption">>,
  ): Promise<MediaAsset>;
  delete(id: string): Promise<void>;
};

export type MediaRepository = MediaReader & MediaWriter;

export type ObjectStorage = {
  put(key: string, body: Uint8Array, contentType: string): Promise<{ url: string }>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, ttlSeconds: number): Promise<string>;
};

export type MediaUsageReference =
  | { type: "post"; id: string }
  | { type: "page"; id: string }
  | { type: "entry"; id: string };

export type MediaUsageLookup = {
  findUsages(mediaId: string): Promise<MediaUsageReference[]>;
};

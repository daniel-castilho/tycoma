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

export type MediaRepository = {
  list(query: { search?: string; mimePrefix?: string }): Promise<MediaAsset[]>;
  findById(id: string): Promise<MediaAsset | null>;
  create(data: Omit<MediaAsset, "id" | "createdAt">): Promise<MediaAsset>;
  update(
    id: string,
    data: Partial<Pick<MediaAsset, "alt" | "caption">>,
  ): Promise<MediaAsset>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
  totalBytes(): Promise<number>;
};

export type ObjectStorage = {
  put(key: string, body: Uint8Array, contentType: string): Promise<{ url: string }>;
  delete(key: string): Promise<void>;
};

export type MediaUsageLookup = {
  findUsages(mediaId: string): Promise<{ type: "post" | "page"; id: string }[]>;
};

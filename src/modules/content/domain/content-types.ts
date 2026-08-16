export type ContentFieldType = "text" | "longtext" | "number" | "boolean" | "date" | "media";

export type ContentTypeField = {
  name: string;
  label: string;
  type: ContentFieldType;
  required: boolean;
};

export type ContentType = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  fields: ContentTypeField[];
  createdAt: Date;
  updatedAt: Date;
};

export type ContentTypeWrite = {
  name: string;
  slug: string;
  description?: string | null;
  fields: ContentTypeField[];
};

export type ContentEntry = {
  id: string;
  contentTypeId: string;
  slug: string;
  title: string;
  status: "draft" | "scheduled" | "published";
  fields: Record<string, unknown>;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ContentEntryWrite = {
  contentTypeId: string;
  slug: string;
  title: string;
  status: "draft" | "scheduled" | "published";
  fields: Record<string, unknown>;
  publishedAt?: Date | null;
  scheduledAt?: Date | null;
};

export type ListContentEntriesQuery = {
  contentTypeId: string;
  status?: "draft" | "scheduled" | "published";
  search?: string;
};

export type ContentTypeRepository = {
  list(): Promise<ContentType[]>;
  findById(id: string): Promise<ContentType | null>;
  findBySlug(slug: string): Promise<ContentType | null>;
  create(data: ContentTypeWrite): Promise<ContentType>;
  update(id: string, data: Partial<ContentTypeWrite>): Promise<ContentType>;
  delete(id: string): Promise<void>;
  countEntries(contentTypeId: string): Promise<number>;
};

export type ContentEntryReader = {
  list(query: ListContentEntriesQuery): Promise<ContentEntry[]>;
  findById(id: string): Promise<ContentEntry | null>;
  findBySlug(contentTypeId: string, slug: string): Promise<ContentEntry | null>;
};

export type ContentEntryWriter = {
  create(data: ContentEntryWrite): Promise<ContentEntry>;
  update(id: string, data: Partial<ContentEntryWrite>): Promise<ContentEntry>;
  delete(id: string): Promise<void>;
};

export type ContentEntryRepository = ContentEntryReader & ContentEntryWriter;

export type ContentEntryFieldError = { name: string; message: string };
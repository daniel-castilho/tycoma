export type ContentStatus = "draft" | "scheduled" | "published";

export type Post = {
  id: string;
  title: string;
  slug: string;
  body: string;
  status: ContentStatus;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  featuredImageId: string | null;
  categoryIds: string[];
  tagIds: string[];
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Page = {
  id: string;
  title: string;
  slug: string;
  body: string;
  status: ContentStatus;
  parentId: string | null;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  featuredImageId: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
};

export type Tag = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type Menu = {
  id: string;
  name: string;
  slug: string;
};

export type MenuItemType = "post" | "page" | "category" | "custom";

export type MenuItem = {
  id: string;
  menuId: string;
  parentId: string | null;
  label: string;
  type: MenuItemType;
  refId: string | null;
  url: string | null;
  sortOrder: number;
};

export type MenuItemDraft = {
  label: string;
  type: MenuItemType;
  refId: string | null;
  url: string | null;
  sortOrder: number;
  children: MenuItemDraft[];
};

export type SiteSettings = {
  title: string;
  description: string;
  logoMediaId: string | null;
  faviconMediaId: string | null;
  timezone: string;
  baseUrl: string;
  defaultMetaTitle: string;
  defaultMetaDescription: string;
  sitemapGeneratedAt: string | null;
};

export type ListPostsQuery = {
  status?: ContentStatus;
  categoryId?: string;
  tagId?: string;
  search?: string;
  from?: Date;
  to?: Date;
  sort?: "updatedAt" | "title" | "publishedAt";
  order?: "asc" | "desc";
};

export type PostWrite = {
  title: string;
  slug?: string;
  body: string;
  status: ContentStatus;
  publishedAt?: Date | null;
  scheduledAt?: Date | null;
  featuredImageId?: string | null;
  categoryIds?: string[];
  tagIds?: string[];
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImageId?: string | null;
};

export type PageWrite = {
  title: string;
  slug?: string;
  body: string;
  status: ContentStatus;
  parentId?: string | null;
  publishedAt?: Date | null;
  scheduledAt?: Date | null;
  featuredImageId?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImageId?: string | null;
};

export type PostReader = {
  list(query: ListPostsQuery): Promise<Post[]>;
  findById(id: string): Promise<Post | null>;
  findBySlug(slug: string): Promise<Post | null>;
  countByStatus(): Promise<Record<string, number>>;
  countByCategory(categoryId: string): Promise<number>;
  countByTag(tagId: string): Promise<number>;
  latestUpdated(limit: number): Promise<Post[]>;
  idsUsingMedia(mediaId: string): Promise<string[]>;
};

export type PostWriter = {
  create(data: Post): Promise<Post>;
  update(id: string, data: Partial<Post>): Promise<Post>;
  deleteMany(ids: string[]): Promise<number>;
};

export type PostRepository = PostReader & PostWriter;

export type PageReader = {
  list(): Promise<Page[]>;
  findById(id: string): Promise<Page | null>;
  findBySlug(slug: string): Promise<Page | null>;
  countByStatus(): Promise<Record<string, number>>;
  idsUsingMedia(mediaId: string): Promise<string[]>;
};

export type PageWriter = {
  create(data: Page): Promise<Page>;
  update(id: string, data: Partial<Page>): Promise<Page>;
  delete(id: string): Promise<void>;
};

export type PageRepository = PageReader & PageWriter;

export type CategoryRepository = {
  list(): Promise<Category[]>;
  findById(id: string): Promise<Category | null>;
  findBySlug(slug: string): Promise<Category | null>;
  create(data: Category): Promise<Category>;
  update(id: string, data: Partial<Category>): Promise<Category>;
  delete(id: string): Promise<void>;
};

export type TagRepository = {
  list(): Promise<Tag[]>;
  findById(id: string): Promise<Tag | null>;
  findBySlug(slug: string): Promise<Tag | null>;
  create(data: Tag): Promise<Tag>;
  update(id: string, data: Partial<Tag>): Promise<Tag>;
  delete(id: string): Promise<void>;
};

export type MenuReader = {
  list(): Promise<Menu[]>;
  findById(id: string): Promise<Menu | null>;
  listItems(menuId: string): Promise<MenuItem[]>;
};

export type MenuWriter = {
  create(data: Menu): Promise<Menu>;
  update(id: string, data: Partial<Menu>): Promise<Menu>;
  delete(id: string): Promise<void>;
  replaceItems(menuId: string, items: MenuItem[]): Promise<void>;
};

export type MenuRepository = MenuReader & MenuWriter;

export type SettingsRepository = {
  getAll(): Promise<Record<string, string>>;
  setMany(entries: Record<string, string>): Promise<void>;
};

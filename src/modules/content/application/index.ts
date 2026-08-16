import type { AuditEventWriter } from "@/modules/audit/domain/types";
import type { StepUpStore } from "@/modules/auth/domain/step-up";
import {
  prismaCategoryRepository,
  prismaMenuRepository,
  prismaPageRepository,
  prismaPostRepository,
  prismaSettingsRepository,
  prismaTagRepository,
} from "../infrastructure/prisma-content-repositories";
import {
  prismaContentEntryRepository,
  prismaContentTypeRepository,
} from "../infrastructure/prisma-content-type-repositories";
import {
  createDeleteContentType,
  createCreateEntry,
  createDeleteEntry,
  createGetContentType,
  createGetContentTypeBySlug,
  createGetEntry,
  createGetPublishedEntryByTypeAndSlug,
  createListContentTypes,
  createListEntries,
  createListPublishedEntriesByTypeSlug,
  createPublishEntry,
  createSaveContentType,
  createUpdateEntry,
} from "./use-cases/content-types";
import { createGetDashboardKpis } from "./use-cases/dashboard";
import {
  createDeleteMenu,
  createGetMenuItems,
  createListMenus,
  createSaveMenu,
  createSaveMenuItems,
} from "./use-cases/menus";
import {
  createCreatePage,
  createDeletePage,
  createGetPage,
  createListPages,
  createUpdatePage,
} from "./use-cases/pages";
import {
  createBulkPosts,
  createCreatePost,
  createDeletePost,
  createGetPost,
  createListPosts,
  createPublishPost,
  createUpdatePost,
} from "./use-cases/posts";
import { createGetSettings, createTouchSitemap, createUpdateSettings } from "./use-cases/settings";
import {
  createDeleteCategory,
  createDeleteTag,
  createListCategories,
  createListTags,
  createSaveCategory,
  createSaveTag,
} from "./use-cases/taxonomy";
import {
  createGetCategoryBySlug,
  createGetPageBreadcrumb,
  createGetPublishedPageBySlug,
  createGetPublishedPostBySlug,
  createGetPublicNav,
  createGetTagBySlug,
  createListPublishedPages,
  createListPublishedPosts,
  createListPublishedPostsByCategory,
  createListPublishedPostsByTag,
} from "./use-cases/public";

/**
 * Composition root for the `content` module. Wires this module's own
 * infrastructure adapters into its use cases. Cross-module ports (the audit
 * writer and the step-up store) are injected — the wiring itself lives in
 * the framework layer (`src/app/_lib/modules.ts`).
 */
export function createContentApplication(auditEventWriter: AuditEventWriter, stepUp: StepUpStore) {
  return {
    listPosts: createListPosts(prismaPostRepository),
    getPost: createGetPost(prismaPostRepository),
    createPost: createCreatePost(prismaPostRepository, auditEventWriter),
    updatePost: createUpdatePost(prismaPostRepository, auditEventWriter),
    publishPost: createPublishPost(prismaPostRepository, auditEventWriter),
    deletePost: createDeletePost(prismaPostRepository, auditEventWriter, stepUp),
    bulkPosts: createBulkPosts(prismaPostRepository, auditEventWriter, stepUp),

    listPages: createListPages(prismaPageRepository),
    getPage: createGetPage(prismaPageRepository),
    createPage: createCreatePage(prismaPageRepository),
    updatePage: createUpdatePage(prismaPageRepository),
    deletePage: createDeletePage(prismaPageRepository, auditEventWriter, stepUp),

    listCategories: createListCategories(prismaCategoryRepository, prismaPostRepository),
    saveCategory: createSaveCategory(prismaCategoryRepository),
    deleteCategory: createDeleteCategory(prismaCategoryRepository, prismaPostRepository, auditEventWriter),
    listTags: createListTags(prismaTagRepository, prismaPostRepository),
    saveTag: createSaveTag(prismaTagRepository),
    deleteTag: createDeleteTag(prismaTagRepository, prismaPostRepository, auditEventWriter),

    getSettings: createGetSettings(prismaSettingsRepository),
    updateSettings: createUpdateSettings(prismaSettingsRepository, auditEventWriter, () =>
      createGetSettings(prismaSettingsRepository)(),
    ),
    touchSitemap: createTouchSitemap(prismaSettingsRepository, auditEventWriter),

    listMenus: createListMenus(prismaMenuRepository),
    saveMenu: createSaveMenu(prismaMenuRepository, auditEventWriter),
    deleteMenu: createDeleteMenu(prismaMenuRepository, auditEventWriter),
    getMenuItems: createGetMenuItems(prismaMenuRepository),
    saveMenuItems: createSaveMenuItems(prismaMenuRepository, auditEventWriter),

    getDashboardKpis: createGetDashboardKpis(prismaPostRepository, prismaPageRepository),

    listPublishedPosts: createListPublishedPosts(prismaPostRepository),
    getPublishedPostBySlug: createGetPublishedPostBySlug(prismaPostRepository),
    listPublishedPages: createListPublishedPages(prismaPageRepository),
    getPublishedPageBySlug: createGetPublishedPageBySlug(prismaPageRepository),
    getPageBreadcrumb: createGetPageBreadcrumb(prismaPageRepository),
    getCategoryBySlug: createGetCategoryBySlug(prismaCategoryRepository),
    getTagBySlug: createGetTagBySlug(prismaTagRepository),
    listPublishedPostsByCategory: createListPublishedPostsByCategory(prismaPostRepository),
    listPublishedPostsByTag: createListPublishedPostsByTag(prismaPostRepository),
    getPublicNav: createGetPublicNav(
      prismaMenuRepository,
      prismaPostRepository,
      prismaPageRepository,
      prismaCategoryRepository,
    ),

    listContentTypes: createListContentTypes(prismaContentTypeRepository),
    getContentType: createGetContentType(prismaContentTypeRepository),
    getContentTypeBySlug: createGetContentTypeBySlug(prismaContentTypeRepository),
    saveContentType: createSaveContentType(prismaContentTypeRepository, auditEventWriter),
    deleteContentType: createDeleteContentType(prismaContentTypeRepository, auditEventWriter),

    listEntries: createListEntries(prismaContentEntryRepository),
    getEntry: createGetEntry(prismaContentEntryRepository),
    createEntry: createCreateEntry(prismaContentEntryRepository, prismaContentTypeRepository, auditEventWriter),
    updateEntry: createUpdateEntry(prismaContentEntryRepository, prismaContentTypeRepository, auditEventWriter),
    publishEntry: createPublishEntry(prismaContentEntryRepository, auditEventWriter),
    deleteEntry: createDeleteEntry(prismaContentEntryRepository, auditEventWriter),

    listPublishedEntriesByTypeSlug: createListPublishedEntriesByTypeSlug(
      prismaContentTypeRepository,
      prismaContentEntryRepository,
    ),
    getPublishedEntryByTypeAndSlug: createGetPublishedEntryByTypeAndSlug(
      prismaContentTypeRepository,
      prismaContentEntryRepository,
    ),
  };
}

export type ContentApplication = ReturnType<typeof createContentApplication>;
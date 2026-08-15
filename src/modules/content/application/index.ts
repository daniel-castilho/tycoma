import {
  prismaCategoryRepository,
  prismaMenuRepository,
  prismaPageRepository,
  prismaPostRepository,
  prismaSettingsRepository,
  prismaTagRepository,
} from "../infrastructure/prisma-content-repositories";
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

export const listPosts = createListPosts(prismaPostRepository);
export const getPost = createGetPost(prismaPostRepository);
export const createPost = createCreatePost(prismaPostRepository);
export const updatePost = createUpdatePost(prismaPostRepository);
export const publishPost = createPublishPost(prismaPostRepository);
export const bulkPosts = createBulkPosts(prismaPostRepository);

export const listPages = createListPages(prismaPageRepository);
export const getPage = createGetPage(prismaPageRepository);
export const createPage = createCreatePage(prismaPageRepository);
export const updatePage = createUpdatePage(prismaPageRepository);
export const deletePage = createDeletePage(prismaPageRepository);

export const listCategories = createListCategories(prismaCategoryRepository, prismaPostRepository);
export const saveCategory = createSaveCategory(prismaCategoryRepository);
export const deleteCategory = createDeleteCategory(prismaCategoryRepository, prismaPostRepository);
export const listTags = createListTags(prismaTagRepository, prismaPostRepository);
export const saveTag = createSaveTag(prismaTagRepository);
export const deleteTag = createDeleteTag(prismaTagRepository, prismaPostRepository);

export const getSettings = createGetSettings(prismaSettingsRepository);
export const updateSettings = createUpdateSettings(prismaSettingsRepository);
export const touchSitemap = createTouchSitemap(prismaSettingsRepository);

export const listMenus = createListMenus(prismaMenuRepository);
export const saveMenu = createSaveMenu(prismaMenuRepository);
export const deleteMenu = createDeleteMenu(prismaMenuRepository);
export const getMenuItems = createGetMenuItems(prismaMenuRepository);
export const saveMenuItems = createSaveMenuItems(prismaMenuRepository);

export const getDashboardKpis = createGetDashboardKpis(
  prismaPostRepository,
  prismaPageRepository,
);

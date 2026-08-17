/**
 * Content module constants. Centralised so policy lives in one place and
 * tests can pin the values without scattering magic numbers across use cases
 * and adapters.
 */
export const LATEST_POSTS_LIMIT = 5;

export const POST_LIST_DEFAULT_SORT = "updatedAt" as const;
export const POST_LIST_DEFAULT_ORDER = "desc" as const;
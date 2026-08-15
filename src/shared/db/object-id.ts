import { randomUUID } from "node:crypto";

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

/**
 * Tells whether a value looks like a MongoDB ObjectId (24 lowercase/uppercase
 * hex characters). Prisma's MongoDB adapter throws on any other value passed
 * to an `ObjectId` field (`P2023`), so adapters check this before querying and
 * degrade to "not found" instead of leaking a 500 to the caller.
 */
export function isObjectId(id: string | null | undefined): boolean {
  return typeof id === "string" && OBJECT_ID_PATTERN.test(id);
}

/**
 * Generates a fresh 24-character hex string that matches the MongoDB ObjectId
 * shape. Use case factories call this instead of duplicating the UUID truncation
 * recipe across every `create*` use case.
 */
export function newObjectId(): string {
  return randomUUID().replace(/-/g, "").slice(0, 24);
}
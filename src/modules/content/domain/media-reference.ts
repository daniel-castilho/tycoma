import type { ContentTypeField } from "./content-types";

/**
 * Field kinds that store media object ids. Extend this allowlist when a new
 * media field kind (e.g. `media-multi`) is added — do NOT fall back to
 * "any string in the tree", which would treat a text value containing the same
 * 24-char hex as a real media reference and block media deletion forever.
 */
const MEDIA_FIELD_TYPES: ReadonlySet<ContentTypeField["type"]> = new Set(["media"]);

function valueMatchesMedia(value: unknown, mediaId: string): boolean {
  if (typeof value === "string") return value === mediaId;
  if (Array.isArray(value)) return value.some((item) => valueMatchesMedia(item, mediaId));
  if (value !== null && typeof value === "object") {
    return Object.values(value).some((nested) => valueMatchesMedia(nested, mediaId));
  }
  return false;
}

/**
 * Pure domain rule for "does this entry reference `mediaId`?". Only fields
 * whose declared type is a media kind are inspected; inside a media field the
 * value is walked recursively (string equality, array elements, nested object
 * values) so structured media payloads are caught. Numbers, booleans and null
 * never match.
 */
export function containsMediaReference(
  fields: Record<string, unknown>,
  fieldDefs: ContentTypeField[],
  mediaId: string,
): boolean {
  for (const field of fieldDefs) {
    if (!MEDIA_FIELD_TYPES.has(field.type)) continue;
    if (valueMatchesMedia(fields[field.name], mediaId)) return true;
  }
  return false;
}
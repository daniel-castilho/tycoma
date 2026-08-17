import { isObjectId } from "@/shared/kernel/object-id";
import type {
  ContentEntryFieldError,
  ContentFieldType,
  ContentType,
} from "./content-types";

/**
 * Strategy registry: one coercer per field kind. Adding a new field type is a
 * one-line entry in FIELD_COERCERS instead of a new branch in a switch.
 */
export type FieldCoercer = (raw: unknown) => unknown;

const textCoercer: FieldCoercer = (raw) => (typeof raw === "string" ? raw : undefined);

const numberCoercer: FieldCoercer = (raw) => {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : undefined;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

const booleanCoercer: FieldCoercer = (raw) => {
  if (typeof raw === "boolean") return raw;
  if (raw === "true" || raw === "on" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return undefined;
};

const dateCoercer: FieldCoercer = (raw) => {
  if (raw instanceof Date) return isNaN(raw.getTime()) ? undefined : raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
};

const mediaCoercer: FieldCoercer = (raw) =>
  typeof raw === "string" && isObjectId(raw) ? raw : undefined;

export const FIELD_COERCERS: Record<ContentFieldType, FieldCoercer> = {
  text: textCoercer,
  longtext: textCoercer,
  number: numberCoercer,
  boolean: booleanCoercer,
  date: dateCoercer,
  media: mediaCoercer,
};

/**
 * Pure domain validation: checks entry field values against the content type's
 * field definitions. Unknown field names are dropped, required fields enforced,
 * and each value is run through the coercer for its declared kind.
 */
export function validateEntryFields(
  type: Pick<ContentType, "fields">,
  fields: Record<string, unknown>,
): { value: Record<string, unknown>; errors: ContentEntryFieldError[] } {
  const errors: ContentEntryFieldError[] = [];
  const value: Record<string, unknown> = {};

  for (const field of type.fields) {
    const raw = fields[field.name];
    const missing = raw === undefined || raw === null || raw === "";
    if (missing) {
      if (field.required) {
        errors.push({ name: field.name, message: `${field.label} is required.` });
      }
      continue;
    }
    const parsed = FIELD_COERCERS[field.type](raw);
    if (parsed === undefined) {
      errors.push({ name: field.name, message: `${field.label} has an invalid value.` });
      continue;
    }
    value[field.name] = parsed;
  }

  return { value, errors };
}

export function isContentFieldType(value: string): value is ContentFieldType {
  return value in FIELD_COERCERS;
}
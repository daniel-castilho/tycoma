"use client";

import { useActionState } from "react";
import type { ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import { SelectField, TextField, TextArea } from "@/app/admin/(authed)/_components/form-field";
import { SubmitButton } from "@/app/admin/(authed)/_components/submit-button";
import type { ContentEntry, ContentType, ContentTypeField } from "@/modules/content/domain/content-types";
import {
  emptyPostState,
  type PostActionState,
} from "@/app/admin/_lib/action-state";

type MediaPickerAsset = { id: string; filename: string; url: string; alt: string | null };

type Props = {
  action: (prev: PostActionState, formData: FormData) => Promise<PostActionState>;
  type: ContentType;
  entry?: ContentEntry;
  mediaAssets: MediaPickerAsset[];
};

function isoLocal(value: Date | null): string {
  if (!value) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

type FieldProps = {
  field: ContentTypeField;
  defaultValue: string;
  mediaAssets: MediaPickerAsset[];
};

type FieldRenderer = ComponentType<FieldProps>;

function TextInputRenderer({ field, defaultValue }: FieldProps) {
  return (
    <TextField
      name={`field_${field.name}`}
      label={field.label}
      defaultValue={defaultValue}
      required={field.required}
      autoComplete="off"
    />
  );
}

function LongTextRenderer({ field, defaultValue }: FieldProps) {
  return (
    <TextArea
      name={`field_${field.name}`}
      label={field.label}
      defaultValue={defaultValue}
      required={field.required}
      hint="Preformatted / plain text. Markdown is not rendered here."
    />
  );
}

function NumberRenderer({ field, defaultValue }: FieldProps) {
  return (
    <TextField
      name={`field_${field.name}`}
      label={field.label}
      type="number"
      step="any"
      defaultValue={defaultValue}
      required={field.required}
      autoComplete="off"
    />
  );
}

function BooleanRenderer({ field, defaultValue }: FieldProps) {
  return (
    <label className="field checkbox-inline">
      <input
        type="checkbox"
        name={`field_${field.name}`}
        defaultChecked={defaultValue === "true" || defaultValue === "1" || defaultValue === "on"}
      />
      <span>{field.label}</span>
    </label>
  );
}

function DateRenderer({ field, defaultValue }: FieldProps) {
  return (
    <TextField
      name={`field_${field.name}`}
      label={field.label}
      type="datetime-local"
      defaultValue={defaultValue}
      required={field.required}
    />
  );
}

function MediaRenderer({ field, defaultValue, mediaAssets }: FieldProps) {
  const selected = mediaAssets.find((asset) => asset.id === defaultValue) ?? null;
  return (
    <div className="field">
      <label htmlFor={`field_${field.name}`}>{field.label}</label>
      <select
        id={`field_${field.name}`}
        name={`field_${field.name}`}
        defaultValue={defaultValue}
        required={field.required}
      >
        <option value="">— Selecione uma mídia —</option>
        {mediaAssets.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {asset.filename}
          </option>
        ))}
      </select>
      {selected ? (
        <div className="media-picker-preview">
          <Image
            src={selected.url}
            alt={selected.alt ?? selected.filename}
            width={50}
            height={50}
            unoptimized
          />
          <span>{selected.filename}</span>
        </div>
      ) : (
        <p className="hint">Upload media in <Link href="/admin/media">Media library</Link> first.</p>
      )}
    </div>
  );
}

/**
 * Strategy registry: one renderer per field kind. Adding a new field kind is a
 * one-line entry here instead of a new branch in a switch.
 */
const FIELD_RENDERERS: Record<ContentTypeField["type"], FieldRenderer> = {
  text: TextInputRenderer,
  longtext: LongTextRenderer,
  number: NumberRenderer,
  boolean: BooleanRenderer,
  date: DateRenderer,
  media: MediaRenderer,
};

function displayValue(field: ContentTypeField, entry?: ContentEntry): string {
  const value = entry?.fields[field.name];
  if (value === undefined || value === null) return "";
  if (field.type === "date") {
    const date = value instanceof Date ? value : new Date(String(value));
    return isNaN(date.getTime()) ? "" : isoLocal(date);
  }
  return String(value);
}

export function ContentEntryForm({ action, type, entry, mediaAssets }: Props) {
  const [state, formAction] = useActionState(action, emptyPostState);

  return (
    <form action={formAction} className="form-stack">
      {entry ? <input type="hidden" name="id" value={entry.id} /> : null}
      <input type="hidden" name="contentTypeId" value={type.id} />
      <TextField name="title" label="Title" defaultValue={entry?.title ?? ""} autoComplete="off" required />
      <TextField
        name="slug"
        label="Slug"
        defaultValue={entry?.slug ?? ""}
        hint="Leave blank to auto-generate from the title."
        autoComplete="off"
      />
      <SelectField name="status" label="Status" defaultValue={entry?.status ?? "draft"}>
        <option value="draft">Draft</option>
        <option value="scheduled">Scheduled</option>
        <option value="published">Published</option>
      </SelectField>
      <TextField
        name="scheduledAt"
        label="Scheduled at"
        type="datetime-local"
        defaultValue={isoLocal(entry?.scheduledAt ?? null)}
        hint="Used when status is Scheduled."
      />
      <TextField
        name="publishedAt"
        label="Published at"
        type="datetime-local"
        defaultValue={isoLocal(entry?.publishedAt ?? null)}
        hint="Optional; defaults to now when publishing."
      />

      {type.fields.map((field) => {
        const RenderField = FIELD_RENDERERS[field.type];
        return <RenderField key={field.name} field={field} defaultValue={displayValue(field, entry)} mediaAssets={mediaAssets} />;
      })}

      {state.error ? <p className="flash flash-error">{state.error}</p> : null}
      <SubmitButton label={entry ? "Save changes" : "Create entry"} />
    </form>
  );
}

export type { ContentType };
"use client";

import { useActionState, useState } from "react";
import { TextField, TextArea } from "@/app/admin/(authed)/_components/form-field";
import { SubmitButton } from "@/app/admin/(authed)/_components/submit-button";
import type { ContentType, ContentTypeField } from "@/modules/content/domain/content-types";
import {
  emptyPostState,
  type PostActionState,
} from "@/app/admin/_lib/action-state";
import { isContentFieldType } from "@/modules/content/domain/content-type-fields";

type Props = {
  action: (prev: PostActionState, formData: FormData) => Promise<PostActionState>;
  type?: ContentType;
};

const FIELD_KINDS = ["text", "longtext", "number", "boolean", "date"] as const;

function rowsFor(fields: ContentTypeField[] | undefined): ContentTypeField[] {
  if (fields && fields.length > 0) return fields;
  return [{ name: "", label: "", type: "text", required: false }];
}

export function ContentTypeForm({ action, type }: Props) {
  const [state, formAction] = useActionState(action, emptyPostState);
  const [rows, setRows] = useState<ContentTypeField[]>(() => rowsFor(type?.fields));

  const setRow = (index: number, patch: Partial<ContentTypeField>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  return (
    <form action={formAction} className="form-stack">
      {type ? <input type="hidden" name="id" value={type.id} /> : null}
      <TextField name="name" label="Name" defaultValue={type?.name ?? ""} autoComplete="off" required />
      <TextField
        name="slug"
        label="Slug"
        defaultValue={type?.slug ?? ""}
        hint="Leave blank to auto-generate from the name."
        autoComplete="off"
      />
      <TextArea
        name="description"
        label="Description"
        defaultValue={type?.description ?? ""}
        hint="Optional, shown as a lead on the public index."
        rows={2}
      />

      <fieldset className="field-set">
        <legend>Fields</legend>
        <p className="hint" style={{ marginTop: 0 }}>
          Each field becomes an input on the entry form. Kinds: text, long text, number, boolean, date.
        </p>
        {rows.map((row, index) => (
          <div key={index} className="field-row">
            <input
              className="btn-secondary"
              name="fieldName"
              defaultValue={row.name}
              placeholder="name (e.g. sku)"
              pattern="[a-z][a-z0-9_]*"
              title="Lowercase letters, digits and underscores."
              required
              onChange={(e) => setRow(index, { name: e.target.value })}
            />
            <input
              className="btn-secondary"
              name="fieldLabel"
              defaultValue={row.label}
              placeholder="Label (e.g. SKU)"
              required
              onChange={(e) => setRow(index, { label: e.target.value })}
            />
            <select
              className="btn-secondary"
              name="fieldType"
              defaultValue={row.type}
              onChange={(e) => setRow(index, { type: isContentFieldType(e.target.value) ? e.target.value : "text" })}
            >
              {FIELD_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
            <label className="checkbox-inline">
              <input
                type="checkbox"
                name="fieldRequired"
                defaultChecked={row.required}
                onChange={(e) => setRow(index, { required: e.target.checked })}
              />
              Required
            </label>
            {rows.length > 1 ? (
              <button
                type="button"
                className="btn-danger btn-sm"
                onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setRows((prev) => [...prev, { name: "", label: "", type: "text", required: false }])}
        >
          + Add field
        </button>
      </fieldset>

      {state.error ? <p className="flash flash-error">{state.error}</p> : null}
      <SubmitButton label={type ? "Save changes" : "Create content type"} />
    </form>
  );
}
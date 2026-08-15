"use client";

import { useActionState } from "react";
import {
  SelectField,
  TextArea,
  TextField,
} from "@/app/admin/(authed)/_components/form-field";
import { SubmitButton } from "@/app/admin/(authed)/_components/submit-button";
import type { Page } from "@/modules/content/domain/types";
import {
  emptyPostState,
  type PostActionState,
} from "@/app/admin/_actions/content";

type Props = {
  action: (prev: PostActionState, formData: FormData) => Promise<PostActionState>;
  page?: Page;
  availableParents: { id: string; title: string; disabled?: boolean }[];
};

function isoLocal(value: Date | null): string {
  if (!value) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function PageForm({ action, page, availableParents }: Props) {
  const [state, formAction] = useActionState(action, emptyPostState);

  return (
    <form action={formAction} className="form-stack">
      {page ? <input type="hidden" name="id" value={page.id} /> : null}
      <TextField
        name="title"
        label="Title"
        defaultValue={page?.title ?? ""}
        autoComplete="off"
        required
      />
      <TextField
        name="slug"
        label="Slug"
        defaultValue={page?.slug ?? ""}
        hint="Leave blank to auto-generate from the title."
        autoComplete="off"
      />
      <TextArea
        name="body"
        label="Body"
        defaultValue={page?.body ?? ""}
      />
      <SelectField
        name="parentId"
        label="Parent page"
        defaultValue={page?.parentId ?? ""}
        hint="Optional. Pages can be nested to form a hierarchy."
      >
        <option value="">— No parent —</option>
        {availableParents.map((p) => (
          <option key={p.id} value={p.id} disabled={p.disabled}>
            {p.title}
            {p.disabled ? " (this page)" : ""}
          </option>
        ))}
      </SelectField>
      <SelectField name="status" label="Status" defaultValue={page?.status ?? "draft"}>
        <option value="draft">Draft</option>
        <option value="scheduled">Scheduled</option>
        <option value="published">Published</option>
      </SelectField>
      <TextField
        name="scheduledAt"
        label="Scheduled at"
        type="datetime-local"
        defaultValue={isoLocal(page?.scheduledAt ?? null)}
      />
      <TextField
        name="publishedAt"
        label="Published at"
        type="datetime-local"
        defaultValue={isoLocal(page?.publishedAt ?? null)}
      />
      <TextField
        name="metaTitle"
        label="Meta title"
        defaultValue={page?.metaTitle ?? ""}
      />
      <TextField
        name="metaDescription"
        label="Meta description"
        defaultValue={page?.metaDescription ?? ""}
      />
      {state.error ? <p className="flash flash-error">{state.error}</p> : null}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <SubmitButton label={page ? "Save changes" : "Create page"} />
        {page ? (
          <a
            href={`/admin/pages/${page.id}/preview`}
            className="btn-secondary"
            target="_blank"
            rel="noreferrer"
          >
            Preview
          </a>
        ) : null}
      </div>
    </form>
  );
}

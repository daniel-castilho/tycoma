"use client";

import { useActionState } from "react";
import {
  SelectField,
  TextArea,
  TextField,
} from "@/app/admin/(authed)/_components/form-field";
import { SubmitButton } from "@/app/admin/(authed)/_components/submit-button";
import type { ContentStatus, Post } from "@/modules/content/domain/types";
import {
  emptyPostState,
  type PostActionState,
} from "@/app/admin/_lib/action-state";

type Props = {
  action: (prev: PostActionState, formData: FormData) => Promise<PostActionState>;
  post?: Post;
};

function isoLocal(value: Date | null): string {
  if (!value) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function PostForm({ action, post }: Props) {
  const [state, formAction] = useActionState(action, emptyPostState);

  return (
    <form action={formAction} className="form-stack">
      {post ? <input type="hidden" name="id" value={post.id} /> : null}
      <TextField
        name="title"
        label="Title"
        defaultValue={post?.title ?? ""}
        autoComplete="off"
        required
      />
      <TextField
        name="slug"
        label="Slug"
        defaultValue={post?.slug ?? ""}
        hint="Leave blank to auto-generate from the title."
        autoComplete="off"
      />
      <TextArea
        name="body"
        label="Body"
        defaultValue={post?.body ?? ""}
        hint="Markdown is supported."
      />
      <SelectField name="status" label="Status" defaultValue={post?.status ?? "draft"}>
        <option value="draft">Draft</option>
        <option value="scheduled">Scheduled</option>
        <option value="published">Published</option>
      </SelectField>
      <TextField
        name="scheduledAt"
        label="Scheduled at"
        type="datetime-local"
        defaultValue={isoLocal(post?.scheduledAt ?? null)}
        hint="Used when status is Scheduled."
      />
      <TextField
        name="publishedAt"
        label="Published at"
        type="datetime-local"
        defaultValue={isoLocal(post?.publishedAt ?? null)}
        hint="Optional; defaults to now when publishing."
      />
      <TextField
        name="metaTitle"
        label="Meta title"
        defaultValue={post?.metaTitle ?? ""}
      />
      <TextField
        name="metaDescription"
        label="Meta description"
        defaultValue={post?.metaDescription ?? ""}
      />
      {state.error ? <p className="flash flash-error">{state.error}</p> : null}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <SubmitButton label={post ? "Save changes" : "Create post"} />
        {post ? (
          <a
            href={`/admin/posts/${post.id}/preview`}
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

export type { ContentStatus };

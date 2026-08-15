"use client";

import { useActionState } from "react";
import type { AuthActionState } from "../../_actions/auth";

const emptyAuthState: AuthActionState = { error: null, message: null };

type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  autoComplete?: string;
};

export function AuthForm({
  action,
  fields,
  submitLabel,
  hidden,
}: {
  action: (prev: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  fields: Field[];
  submitLabel: string;
  hidden?: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, emptyAuthState);

  return (
    <form action={formAction} className="auth-form">
      {hidden
        ? Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}
      {fields.map((field) => (
        <label key={field.name} className="field">
          <span>{field.label}</span>
          <input
            name={field.name}
            type={field.type ?? "text"}
            required={field.required ?? true}
            defaultValue={field.defaultValue}
            autoComplete={field.autoComplete}
          />
        </label>
      ))}
      {state.error ? <p className="flash flash-error">{state.error}</p> : null}
      {state.message ? <p className="flash flash-ok">{state.message}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? "Please wait…" : submitLabel}
      </button>
    </form>
  );
}

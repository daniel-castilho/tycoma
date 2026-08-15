import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

type BaseProps = {
  label: string;
  hint?: string;
};

export function TextField({
  label,
  hint,
  ...input
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...input} />
      {hint ? <span className="hint">{hint}</span> : null}
    </label>
  );
}

export function TextArea({
  label,
  hint,
  ...textarea
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea {...textarea} />
      {hint ? <span className="hint">{hint}</span> : null}
    </label>
  );
}

export function SelectField({
  label,
  hint,
  children,
  ...select
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select {...select}>{children}</select>
      {hint ? <span className="hint">{hint}</span> : null}
    </label>
  );
}

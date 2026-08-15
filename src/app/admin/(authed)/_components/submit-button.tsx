"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  label,
  pendingLabel = "Please wait…",
}: {
  label: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

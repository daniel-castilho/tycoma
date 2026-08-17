import { auth } from "@/app/_lib/modules";
import { stepUpAction } from "@/app/admin/_actions/account";
import { TextField } from "./form-field";
import { SubmitButton } from "./submit-button";

export async function StepUpHint({ userId }: { userId: string }) {
  const stepUp = await auth.getStepUpStatus(userId);
  const active = stepUp.active;
  const stepUpTtlMinutes = Math.round(stepUp.ttlSeconds / 60);
  return (
    <section
      className="form-stack"
      style={{
        gap: "1rem",
        marginBottom: "1rem",
        padding: "1rem",
        border: "1px solid var(--border, #d0d0d0)",
        borderRadius: "0.5rem",
      }}
    >
      <p className="hint">
        {active ? (
          <>
            Step-up confirmed. Destructive actions stay unlocked for the next{" "}
            {stepUpTtlMinutes} minutes.
          </>
        ) : (
          <>
            Confirm your current password before destructive actions (delete post / page / media).
            Confirmation stays valid for {stepUpTtlMinutes} minutes.
          </>
        )}
      </p>
      <form action={stepUpAction} className="form-stack" style={{ gap: "0.5rem" }}>
        <TextField
          label="Current password"
          name="currentPassword"
          type="password"
          required
          hint={active ? "Re-confirm to refresh the 10-minute window." : "Required before deleting."}
        />
        <SubmitButton label={active ? "Re-confirm password" : "Confirm password"} />
      </form>
    </section>
  );
}

import { notFound } from "next/navigation";
import { auth } from "@/app/_lib/modules";

export const dynamic = "force-dynamic";
import {
  changePasswordAction,
  saveProfileAction,
  stepUpAction,
} from "@/app/admin/_actions/account";
import { TextField } from "@/app/admin/(authed)/_components/form-field";
import { SubmitButton } from "@/app/admin/(authed)/_components/submit-button";
import { requireSession } from "@/app/admin/_lib/session";

export default async function AccountPage() {
  const session = await requireSession();
  const profile = await auth.getProfile(session.sub);
  if (!profile.ok) notFound();

  const stepUp = await auth.getStepUpStatus(session.sub);
  const stepUpActive = stepUp.active;
  const stepUpTtlMinutes = Math.round(stepUp.ttlSeconds / 60);

  return (
    <>
      <h2>Account</h2>
      <p className="lead">Your profile and sign-in credentials.</p>

      <div style={{ display: "grid", gap: "2rem", gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))" }}>
        <section>
          <h2 style={{ fontSize: "1rem" }}>Profile</h2>
          <form action={saveProfileAction} className="form-stack" style={{ gap: "1rem" }}>
            <TextField label="Name" name="name" defaultValue={profile.value.name} required />
            <TextField label="Email" name="email" type="email" defaultValue={profile.value.email} required />
            <TextField
              label="Avatar media ID"
              name="avatarMediaId"
              defaultValue={profile.value.avatarMediaId ?? ""}
              hint="Optional media asset ID for your avatar."
            />
            <SubmitButton label="Save profile" />
          </form>
        </section>

        <section>
          <h2 style={{ fontSize: "1rem" }}>Change password</h2>
          <p className="hint">
            Phase B: confirm your current password before changing it. The confirmation
            stays valid for {stepUpTtlMinutes} minutes.
          </p>
          <form action={stepUpAction} className="form-stack" style={{ gap: "1rem", marginBottom: "1rem" }}>
            <TextField
              label="Confirm current password"
              name="currentPassword"
              type="password"
              required
              hint={
                stepUpActive
                  ? "Re-confirm to refresh the 10-minute window."
                  : "Required before changing your password."
              }
            />
            <SubmitButton label={stepUpActive ? "Re-confirm password" : "Confirm password"} />
          </form>
          <form action={changePasswordAction} className="form-stack" style={{ gap: "1rem" }}>
            <TextField
              label="Current password"
              name="currentPassword"
              type="password"
              required
              hint={stepUpActive ? "Step-up confirmed — change allowed." : "Confirm your password above first."}
            />
            <TextField label="New password" name="newPassword" type="password" hint="At least 8 characters." required />
            <TextField label="Confirm new password" name="confirmPassword" type="password" required />
            <SubmitButton label="Update password" />
          </form>
        </section>
      </div>
    </>
  );
}
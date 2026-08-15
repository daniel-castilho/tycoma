import Link from "next/link";
import { resetPasswordAction } from "../../_actions/auth";
import { AuthForm } from "../_components/auth-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <>
        <h1>Reset your password</h1>
        <p className="auth-lead">
          This reset link is missing a token. Request a new one from the{" "}
          <Link href="/admin/forgot-password">forgot password</Link> page.
        </p>
      </>
    );
  }

  return (
    <>
      <h1>Reset your password</h1>
      <p className="auth-lead">Choose a new password for your admin account.</p>
      <AuthForm
        action={resetPasswordAction}
        submitLabel="Update password"
        hidden={{ token }}
        fields={[
          {
            name: "password",
            label: "New password",
            type: "password",
            autoComplete: "new-password",
          },
        ]}
      />
      <p className="auth-foot">
        <Link href="/admin/login">Back to sign in</Link>
      </p>
    </>
  );
}

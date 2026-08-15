import Link from "next/link";
import { countUsers } from "@/modules/auth/application";
import { forgotPasswordAction } from "../../_actions/auth";
import { AuthForm } from "../_components/auth-form";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const users = await countUsers();
  if (users === 0) {
    return (
      <>
        <h1>Password recovery</h1>
        <p className="auth-lead">
          No admin account exists yet. Use <Link href="/admin/setup">setup</Link> to create one.
        </p>
      </>
    );
  }

  return (
    <>
      <h1>Forgot your password?</h1>
      <p className="auth-lead">
        Enter your email and we will send a link to reset your password.
      </p>
      <AuthForm
        action={forgotPasswordAction}
        submitLabel="Send reset link"
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
        ]}
      />
      <p className="auth-foot">
        <Link href="/admin/login">Back to sign in</Link>
      </p>
    </>
  );
}

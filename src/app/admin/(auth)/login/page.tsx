import Link from "next/link";
import { redirect } from "next/navigation";
import { countUsers } from "@/modules/auth/application";
import { loginAction } from "../../_actions/auth";
import { AuthForm } from "../_components/auth-form";

export default async function LoginPage() {
  const users = await countUsers();
  if (users === 0) {
    redirect("/admin/setup");
  }

  return (
    <>
      <h1>Sign in</h1>
      <p className="auth-lead">Use the admin account to access the dashboard.</p>
      <AuthForm
        action={loginAction}
        submitLabel="Sign in"
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
        ]}
      />
      <p className="auth-foot">
        <Link href="/admin/forgot-password">Forgot your password?</Link>
      </p>
    </>
  );
}

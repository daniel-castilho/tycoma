import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/app/_lib/modules";
import { loginAction } from "../../_actions/auth";
import { AuthForm } from "../_components/auth-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const users = await auth.countUsers();
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

import { redirect } from "next/navigation";
import { auth } from "@/app/_lib/modules";
import { setupAction } from "../../_actions/auth";
import { AuthForm } from "../_components/auth-form";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const users = await auth.countUsers();
  if (users > 0) {
    redirect("/admin/login");
  }

  return (
    <>
      <h1>Create the admin account</h1>
      <p className="auth-lead">
        This is a one-time setup. After this account exists, this page stays locked.
      </p>
      <AuthForm
        action={setupAction}
        submitLabel="Create account"
        fields={[
          { name: "name", label: "Name", autoComplete: "name" },
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          {
            name: "password",
            label: "Password",
            type: "password",
            autoComplete: "new-password",
          },
        ]}
      />
    </>
  );
}

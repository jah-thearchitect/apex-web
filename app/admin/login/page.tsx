import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { getAdminId } from "@/lib/session";
import { LogoMark } from "@/components/LogoMark";

export const metadata = { title: "Sign in" };

export default async function AdminLogin() {
  if (await getAdminId()) redirect("/admin");
  return (
    <main className="admin-login">
      <a className="brand" href="/">
        <LogoMark width={46} />
        <span className="brand-box">Apex</span>
      </a>
      <div className="inquiry-panel">
        <p className="eyebrow">ADMIN</p>
        <h3>Sign in</h3>
        <LoginForm />
      </div>
    </main>
  );
}

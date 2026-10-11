"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form className="inquiry-form" action={action}>
      <input type="email" name="email" placeholder="Email" required autoComplete="username" aria-label="Email" />
      <input type="password" name="password" placeholder="Password" required autoComplete="current-password" aria-label="Password" />
      <button type="submit" className="btn-solid" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      <p className="inquiry-status" role="status">{error}</p>
    </form>
  );
}

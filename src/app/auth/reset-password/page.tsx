import Link from "next/link";
import { PasswordUpdateForm } from "@/features/auth/PasswordUpdateForm";

export default function ResetPasswordPage() {
  return (
    <main id="main" tabIndex={-1} className="content-page">
      <span className="eyebrow">Account recovery</span>
      <h1>Choose a new password</h1>
      <section className="plan-card">
        <PasswordUpdateForm />
      </section>
      <Link className="secondary-button" href="/auth/forgot-password">
        Request a new reset link
      </Link>
    </main>
  );
}

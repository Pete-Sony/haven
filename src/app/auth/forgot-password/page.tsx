import Link from "next/link";
import { PasswordResetRequestForm } from "@/features/auth/PasswordResetRequestForm";

export default function ForgotPasswordPage() {
  return (
    <main id="main" tabIndex={-1} className="content-page">
      <span className="eyebrow">Account recovery</span>
      <h1>Reset your password</h1>
      <p>
        Haven uses the same response whether or not an account exists, which
        helps keep account membership private.
      </p>
      <section className="plan-card">
        <PasswordResetRequestForm />
      </section>
      <Link className="secondary-button" href="/auth">
        Return to sign in
      </Link>
    </main>
  );
}

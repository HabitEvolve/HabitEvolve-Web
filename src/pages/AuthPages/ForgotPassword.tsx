import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, MailCheck } from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import authApi from "../../api/authApi";
import {
  AuthError,
  AuthField,
  AuthGate,
  AuthPane,
  AuthSubmit,
  authLink,
} from "../../components/auth/authSky";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError(t("auth.errors.emailRequired")); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await authApi.resetPassword(email.trim());
      if (res.success) {
        setSent(true);
      } else {
        setError(res.message || "Could not send reset instructions. Please try again.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not send reset instructions. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageMeta title="Habit - Forgot Password" description="Reset your HabitEvolve account password." />
      <AuthLayout>
        {/* Same gate as sign-in/sign-up so the three screens are one flow — the old
            inline dark panel and warm pill styles are gone. */}
        <AuthGate
          mascotAlt={t("auth.gate.mascotAlt")}
          slogan="Forgot Password?"
          tagline="Enter your email and we'll send you a temporary password."
        />

        <AuthPane
          title="Forgot Password?"
          subtitle="Enter your email and we'll send you a temporary password."
        >
          {sent ? (
            <div className="space-y-6 text-center">
              {/* Success is teal, never green — rail + tint + glyph, three cues. */}
              <div className="relative overflow-hidden rounded-sky-md bg-sky-teal/10 px-4 py-5 ring-1 ring-sky-teal/28">
                <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-teal" aria-hidden="true" />
                <span className="inline-grid place-items-center w-10 h-10 mx-auto mb-3 rounded-full bg-sky-teal-bg text-sky-teal">
                  <MailCheck className="w-5 h-5" aria-hidden="true" />
                </span>
                <p className="text-sm font-medium text-sky-ink-2">
                  If an account exists for{" "}
                  <strong className="font-semibold text-sky-ink">{email}</strong>, a temporary
                  password has been sent to that email address.
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-teal">
                  <Check className="w-3.5 h-3.5" aria-hidden="true" /> Instructions sent
                </p>
              </div>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-sky-md bg-linear-to-b from-sky-deep-lo to-sky-deep px-8 py-3.5 font-display text-base font-semibold text-white shadow-[0_10px_24px_-10px_rgba(36,52,77,0.55)] ring-1 ring-sky-deep/30 transition-all duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {error && <AuthError message={error} />}

              <AuthField
                id="reset-email"
                name="email"
                type="email"
                label={t("auth.common.emailLabel")}
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                placeholder={t("auth.common.emailPlaceholder")}
              />

              <AuthSubmit loading={submitting}>
                {submitting ? "Sending…" : "Send Reset Instructions"}
              </AuthSubmit>

              <div className="text-center">
                <Link to="/login" className={`inline-flex items-center gap-1.5 text-sm ${authLink}`}>
                  <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </AuthPane>
      </AuthLayout>
    </>
  );
}

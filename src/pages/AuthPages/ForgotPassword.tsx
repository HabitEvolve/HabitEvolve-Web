import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import authApi from "../../api/authApi";

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
        <section
          className="hidden md:flex w-1/2 items-center justify-center relative p-12"
          style={{ backgroundColor: "#1D2939" }}
        >
          <img
            alt="Hero Fox Mascot"
            className="w-full h-full object-cover relative z-10"
            src="https://saiseocacvyfegzkewop.supabase.co/storage/v1/object/public/image/icon%20(1).png"
          />
        </section>

        <section className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-16 lg:p-24">
          <div className="w-full max-w-md flex flex-col items-center">
            <div className="text-center mb-6">
              <h1 className="text-4xl md:text-5xl font-bold mb-3" style={{ color: "#5d3b2a" }}>
                Forgot Password?
              </h1>
              <p className="text-gray-500 text-lg">
                Enter your email and we'll send you a temporary password.
              </p>
            </div>

            {sent ? (
              <div className="w-full space-y-6 text-center">
                <div className="w-full p-4 bg-green-100 text-green-700 text-sm rounded-lg font-medium border border-green-200">
                  If an account exists for <strong>{email}</strong>, a temporary password has been sent to that email address.
                </div>
                <Link
                  to="/"
                  className="inline-block btn-primary py-4 px-8 text-white text-lg font-bold shadow-sm"
                  style={{ backgroundColor: "#f27b3d", borderRadius: "9999px" }}
                >
                  Back to Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="w-full space-y-4">
                {error && (
                  <div className="w-full p-3 bg-red-100 text-red-600 text-sm rounded-lg text-center font-medium border border-red-200">
                    {error}
                  </div>
                )}

                <div>
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    className="pill-input w-full border-2 focus:ring-0 text-gray-700 text-lg"
                    style={{ borderColor: "#a2e8c1", borderRadius: "9999px", paddingLeft: "1.5rem", paddingRight: "1.5rem", height: "3.5rem" }}
                    placeholder={t("auth.common.emailPlaceholder")}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`btn-primary w-full py-4 text-white text-xl font-bold mt-2 shadow-sm ${submitting ? "opacity-70 cursor-not-allowed" : ""}`}
                  style={{ backgroundColor: "#f27b3d", borderRadius: "9999px", transition: "background-color 0.2s" }}
                >
                  {submitting ? "Sending…" : "Send Reset Instructions"}
                </button>

                <div className="text-center mt-4">
                  <Link to="/" className="font-medium underline hover:opacity-80 text-sm" style={{ color: "#5d3b2a" }}>
                    Back to Sign In
                  </Link>
                </div>
              </form>
            )}
          </div>
        </section>
      </AuthLayout>
    </>
  );
}

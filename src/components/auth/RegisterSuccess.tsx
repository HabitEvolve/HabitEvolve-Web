import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { Check, LogIn, Mail } from "lucide-react";
import { AuthGate, AuthPane, authLabel } from "./authSky";

/**
 * Shown after `POST /User/register` succeeds. Registration does NOT return a
 * JWT — the user still has to sign in — so this page exists to say the account
 * was created and to hand them straight to the login form. Before it, a
 * successful submit silently redirected to "/" and looked indistinguishable
 * from a failure that ate the form.
 *
 * The registered email arrives via router state. It is only a confirmation
 * line, so the page renders fine without it (someone opening the URL directly,
 * or a browser that dropped the history state).
 */
interface RegisterSuccessState {
  email?: string;
}

export default function RegisterSuccess() {
  const { t } = useTranslation();
  const location = useLocation();
  const email = (location.state as RegisterSuccessState | null)?.email;

  return (
    <>
      {/* Left Panel — same visual gate as the form the user just came from */}
      <AuthGate
        mascotAlt={t("auth.gate.mascotAlt")}
        slogan={t("auth.gate.signUpSlogan")}
        tagline={t("auth.gate.signUpTagline")}
      />

      <AuthPane
        title={t("auth.registerSuccess.title")}
        subtitle={t("auth.registerSuccess.subtitle")}
        icon={
          <span
            className="grid h-16 w-16 place-items-center rounded-full bg-sky-teal-bg text-sky-teal ring-1 ring-sky-teal/26"
            aria-hidden="true"
          >
            <Check className="h-8 w-8" strokeWidth={2.6} />
          </span>
        }
      >
        <div className="flex flex-col gap-6">
          {email && (
            <div className="flex flex-col gap-1.5">
              <span className={authLabel}>{t("auth.registerSuccess.accountLabel")}</span>
              <p className="flex items-center gap-2.5 rounded-sky-md bg-white/72 px-4 py-3.5 ring-1 ring-white/85">
                <Mail className="h-4 w-4 shrink-0 text-sky-ink-3" aria-hidden="true" />
                <span className="truncate text-base font-medium text-sky-ink">{email}</span>
              </p>
            </div>
          )}

          <p className="text-sm leading-relaxed text-sky-ink-2">
            {t("auth.registerSuccess.nextStep")}
          </p>

          {/* A link, not a submit: there is nothing left to post from here. */}
          <Link
            to="/login"
            className={[
              "inline-flex w-full items-center justify-center gap-2 rounded-sky-md py-3.5",
              "bg-linear-to-b from-sky-deep-lo to-sky-deep font-display text-base font-semibold text-white",
              "shadow-[0_10px_24px_-10px_rgba(36,52,77,0.55)] ring-1 ring-sky-deep/30 transition-all duration-200",
              "hover:-translate-y-px hover:shadow-[0_14px_30px_-10px_rgba(36,52,77,0.6)] active:translate-y-0 active:scale-[0.99]",
            ].join(" ")}
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            {t("auth.registerSuccess.signInBtn")}
          </Link>
        </div>
      </AuthPane>
    </>
  );
}

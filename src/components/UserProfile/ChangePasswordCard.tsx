import { useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyRound, Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import authApi from "../../api/authApi";

// Self-contained card for POST /api/user/change-password. It is its own <form>
// with its own submit rather than a section of the profile edit form: it posts
// to a different endpoint and must never be swept along by "Save Changes".
//
// The confirm field is client-only — the BE takes just oldPassword/newPassword.
// The rest of the rules below mirror ChangePasswordCommandValidator so the user
// sees the failure inline instead of as a round-trip 400.
const PASSWORD_MIN_LENGTH = 6;

const eyebrow = "text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3";
const inputCls =
  "w-full px-3.5 py-2.5 rounded-sky-chip bg-white/70 ring-1 ring-white/80 text-sky-ink text-sm font-medium transition-shadow focus:outline-none focus:ring-2 focus:ring-sky-deep/45 placeholder:text-sky-ink-3";

interface PasswordFormState {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const EMPTY_FORM: PasswordFormState = {
  oldPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function ChangePasswordCard() {
  const { t } = useTranslation();
  const [form, setForm] = useState<PasswordFormState>(EMPTY_FORM);
  const [reveal, setReveal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = (key: keyof PasswordFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
    if (done) setDone(false);
  };

  const validate = (): string | null => {
    if (!form.oldPassword) return t("editProfile.password.errorOldRequired");
    if (!form.newPassword) return t("editProfile.password.errorNewRequired");
    if (form.newPassword.length < PASSWORD_MIN_LENGTH)
      // Named `min`, not `count`: passing `count` would switch i18next into
      // plural-resolution mode and go looking for _one/_other variants.
      return t("editProfile.password.errorTooShort", { min: PASSWORD_MIN_LENGTH });
    if (form.newPassword === form.oldPassword) return t("editProfile.password.errorSameAsOld");
    if (form.newPassword !== form.confirmPassword) return t("editProfile.password.errorMismatch");
    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await authApi.changePassword({
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
      });
      if (res.success) {
        // Clear immediately — leaving a plaintext password sitting in state after
        // a successful change buys nothing and the fields are now meaningless.
        setForm(EMPTY_FORM);
        setDone(true);
      } else {
        setError(res.message || t("editProfile.password.errorFailed"));
      }
    } catch (err: any) {
      // A wrong current password comes back as a 400 with the BE's own wording.
      setError(err?.response?.data?.message || t("editProfile.password.errorFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const field = (key: keyof PasswordFormState, label: string, autoComplete: string) => (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <KeyRound className="w-3.5 h-3.5 shrink-0 text-sky-ink-3" aria-hidden="true" />
        <label htmlFor={key} className={eyebrow}>{label}</label>
      </div>
      <input
        id={key}
        name={key}
        type={reveal ? "text" : "password"}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        autoComplete={autoComplete}
        className={inputCls}
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="sky-glass-admin rounded-sky-card overflow-hidden">
      <div className="px-5 py-5 space-y-5">
        <div className="flex items-center gap-2.5">
          <span className="grid place-items-center w-9 h-9 rounded-sky-chip bg-sky-deep/12 text-sky-deep shrink-0">
            <KeyRound className="w-4 h-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className={eyebrow}>{t("editProfile.password.sectionTitle")}</p>
            <p className="text-xs font-medium text-sky-ink-3 mt-0.5">
              {t("editProfile.password.sectionHint")}
            </p>
          </div>
        </div>

        {done && (
          <div className="sky-in relative overflow-hidden flex items-start gap-3 rounded-sky-md bg-sky-teal-bg/70 ring-1 ring-sky-teal/30 pl-5 pr-4 py-3">
            <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-sky-teal" aria-hidden="true" />
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-px text-sky-teal" aria-hidden="true" />
            <p className="text-sm font-semibold text-sky-ink">{t("editProfile.password.changed")}</p>
          </div>
        )}

        {error && (
          <div role="alert" className="sky-in relative overflow-hidden flex items-start gap-3 rounded-sky-md bg-sky-rose/10 ring-1 ring-sky-rose/25 pl-5 pr-4 py-3">
            <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-sky-rose" aria-hidden="true" />
            <AlertTriangle className="w-4 h-4 shrink-0 mt-px text-sky-rose-deep" aria-hidden="true" />
            <p className="text-sm font-semibold text-sky-rose-deep">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {field("oldPassword", t("editProfile.password.currentLabel"), "current-password")}
          {field("newPassword", t("editProfile.password.newLabel"), "new-password")}
          {field("confirmPassword", t("editProfile.password.confirmLabel"), "new-password")}
        </div>

        {/* One toggle for all three: checking that the new password matches the
            confirmation is the whole point, so revealing them separately is noise. */}
        <button
          type="button"
          onClick={() => setReveal((v) => !v)}
          className="inline-flex items-center gap-2 rounded-sky-chip px-1 py-0.5 text-xs font-semibold text-sky-ink-2 transition-colors hover:text-sky-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-deep/45"
        >
          {reveal
            ? <><EyeOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> {t("editProfile.password.hide")}</>
            : <><Eye className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> {t("editProfile.password.show")}</>}
        </button>
      </div>

      <div className="px-5 py-4 bg-white/45 border-t border-white/70 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-sky-chip bg-linear-to-b from-sky-deep-lo to-sky-deep text-white text-sm font-semibold shadow-sky-fill transition hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-deep/45"
        >
          {submitting
            ? <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" aria-hidden="true" />
            : <KeyRound className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
          {submitting ? t("editProfile.password.submitting") : t("editProfile.password.submit")}
        </button>
      </div>
    </form>
  );
}

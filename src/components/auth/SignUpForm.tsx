import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Check } from "lucide-react";
import authApi from "../../api/authApi";
import GoogleAuthButton from "./GoogleAuthButton";
import {
  AuthDivider,
  AuthError,
  AuthField,
  AuthGate,
  AuthPane,
  AuthSubmit,
  authLink,
} from "./authSky";

interface SignUpFormState {
  userName: string;
  email: string;
  password: string;
}

interface FormErrors {
  userName?: string;
  email?: string;
  password?: string;
  terms?: string;
  apiError?: string;
}

export default function SignUpForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isChecked, setIsChecked] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [formData, setFormData] = useState<SignUpFormState>({
    userName: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors] || errors.apiError) {
      setErrors((prev) => ({ ...prev, [name]: undefined, apiError: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    const newErrors: FormErrors = {};
    if (!formData.userName.trim()) newErrors.userName = t("auth.errors.usernameRequired");
    if (!formData.email.trim()) newErrors.email = t("auth.errors.emailRequired");
    if (!formData.password) newErrors.password = t("auth.errors.passwordRequired");
    if (!isChecked) newErrors.terms = t("auth.errors.termsRequired");

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsLoading(true);

      await authApi.register({
        username: formData.userName,
        email: formData.email,
        password: formData.password,
      });

      navigate("/");
    } catch (error: any) {
      console.error("Lỗi đăng ký:", error);
      setErrors({
        apiError: error.response?.data?.message || t("auth.errors.registrationFailed"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Left Panel — The Visual Gate */}
      <AuthGate
        mascotAlt={t("auth.gate.mascotAlt")}
        slogan={t("auth.gate.signUpSlogan")}
        tagline={t("auth.gate.signUpTagline")}
      />

      {/* Right Panel — The Input Forge */}
      <AuthPane title={t("auth.signUp.title")} subtitle={t("auth.signUp.subtitle")}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {errors.apiError && <AuthError message={errors.apiError} />}

          <AuthField
            id="userName"
            name="userName"
            type="text"
            label={t("auth.signUp.usernameLabel")}
            value={formData.userName}
            onChange={handleChange}
            placeholder={t("auth.signUp.usernamePlaceholder")}
            error={errors.userName}
          />

          <AuthField
            id="email"
            name="email"
            type="email"
            label={t("auth.common.emailLabel")}
            value={formData.email}
            onChange={handleChange}
            placeholder={t("auth.common.emailPlaceholder")}
            error={errors.email}
          />

          <AuthField
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            label={t("auth.common.passwordLabel")}
            value={formData.password}
            onChange={handleChange}
            placeholder={t("auth.common.passwordPlaceholder")}
            error={errors.password}
            revealed={showPassword}
            onToggleReveal={() => setShowPassword(!showPassword)}
            revealLabel={showPassword ? t("auth.common.hidePassword") : t("auth.common.showPassword")}
          />

          {/* Custom terms checkbox: the native control can't be tinted to a token
              without accentColor, so it is visually hidden and the label paints a
              deep-filled box with a Check glyph when set. */}
          <label className="mt-1 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="peer sr-only"
            />
            <span
              className={`mt-0.5 inline-grid h-5 w-5 shrink-0 place-items-center rounded-[7px] transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-sky-deep/45 ${
                isChecked
                  ? "bg-sky-deep text-white ring-1 ring-sky-deep"
                  : `bg-white/72 text-transparent ring-1 ${errors.terms ? "ring-sky-rose/50" : "ring-white/85"}`
              }`}
              aria-hidden="true"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            <span className="text-sm text-sky-ink-2">
              {t("auth.signUp.termsText")}{" "}
              <span className={authLink}>{t("auth.signUp.termsLink")}</span>{" "}
              {t("auth.signUp.and")}{" "}
              <span className={authLink}>{t("auth.signUp.privacyLink")}</span>
            </span>
          </label>
          {errors.terms && (
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-rose-deep">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {errors.terms}
            </p>
          )}

          <AuthSubmit loading={isLoading}>
            {isLoading ? t("auth.signUp.creatingBtn") : t("auth.signUp.createBtn")}
          </AuthSubmit>
        </form>

        <AuthDivider label={t("auth.signUp.orSignUpWith")} />

        <GoogleAuthButton mode="register" />

        <p className="mt-7 text-center text-sm text-sky-ink-2">
          {t("auth.signUp.haveAccount")}{" "}
          <Link to="/" className={authLink}>
            {t("auth.signUp.signInLink")}
          </Link>
        </p>
      </AuthPane>
    </>
  );
}

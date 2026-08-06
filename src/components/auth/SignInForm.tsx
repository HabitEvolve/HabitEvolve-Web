import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import authApi from "../../api/authApi";
import { useAuth } from "../../context/AuthContext";
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

interface FormState {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  apiError?: string;
}

export default function SignInForm() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [formData, setFormData] = useState<FormState>({
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
    if (!formData.email) newErrors.email = t("auth.errors.emailRequired");
    if (!formData.password) newErrors.password = t("auth.errors.passwordRequired");

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsLoading(true);

      const response = await authApi.login({
        email: formData.email,
        password: formData.password,
      });

      if (response?.success && response.data) {
        login(response.data);
        return;
      }

      setErrors({
        apiError: response?.message || t("auth.errors.invalidCredentials"),
      });
    } catch (error: any) {
      console.error("[SignIn] Unexpected error during login:", error);
      setErrors({
        apiError: error?.response?.data?.message || t("auth.errors.invalidCredentials"),
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
        slogan={t("auth.gate.signInSlogan")}
        tagline={t("auth.gate.signInTagline")}
      />

      {/* Right Panel — The Input Forge */}
      <AuthPane title={t("auth.signIn.title")} subtitle={t("auth.signIn.subtitle")}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {errors.apiError && <AuthError message={errors.apiError} />}

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

          <AuthSubmit loading={isLoading} className="mt-2">
            {isLoading ? t("auth.signIn.loggingIn") : t("auth.signIn.loginBtn")}
          </AuthSubmit>

          <div className="text-center">
            <Link to="/reset-password" className={`text-sm ${authLink}`}>
              {t("auth.signIn.forgotPassword")}
            </Link>
          </div>
        </form>

        <AuthDivider label={t("auth.signIn.orLoginWith")} />

        <GoogleAuthButton mode="login" />

        <p className="mt-7 text-center text-sm text-sky-ink-2">
          {t("auth.signIn.noAccount")}{" "}
          <Link to="/signup" className={authLink}>
            {t("auth.signIn.signUpLink")}
          </Link>
        </p>
      </AuthPane>
    </>
  );
}

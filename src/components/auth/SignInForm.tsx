import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { EyeCloseIcon, EyeIcon, AlertHexaIcon } from "../../icons";
import authApi from "../../api/authApi";
import { useAuth } from "../../context/AuthContext";
import GoogleAuthButton from "./GoogleAuthButton";

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
      <section className="hidden lg:flex lg:w-[45%] shrink-0 relative flex-col items-center justify-center overflow-hidden border-r-4 border-white/80 bg-linear-to-t from-brand-green-dark to-brand-green-light p-12">
        <div className="relative flex max-w-md flex-col items-center gap-8 text-center">
          <div className="relative h-98 w-98 md:h-112 md:w-112">
            <div className="absolute -top-4 -left-6 h-12 w-12">
              <img
                alt=""
                aria-hidden="true"
                className="h-full w-full -rotate-8 opacity-90 mix-blend-multiply"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAfd-gVHI9N8zzAoGGkMizsu9ZQFOyFHFfiHBzjXGVFN5m_qOSBPHlPmd4_2-Vhxofc7p3u8VqgEmM_mfOxh_ddxuiw2W5HFFpbsUAnu7RWHoq0KMpePvvVd2CG-uM7-TfemLq8XeG-JqWDLUIDvdLGZGz3PbWlFOVyEIe8AZdB02MN-2wEzws1ohwcN1dJpbuoRS1vVxtoyW77bLd408EvN0XB_unhAoVHyJKfGrsTdt7SyDkDReFEJ-dly3AxiUmYoeSk81zP30E"
              />
            </div>
            <div className="absolute -top-2 -right-8 h-14 w-14">
              <img
                alt=""
                aria-hidden="true"
                className="h-full w-full rotate-10 opacity-90 mix-blend-multiply"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZ1E_Xhf0DmUzFEVWJeSM-HH40hB2nN52QD-wnTG0DHhZ-o_74eNBwQONU7cYVgCLIHG46E1aEQQyaEr7n7vqXapjKBJEbCozDIFeS-TAsb18fKwUpvSR1om8mlUVz5DHurJMAVcC3MGzOPrcVM_qC3pmwdp3oqQKZLEWwtZ1MH36iHKVPYrh6y2vyAyTRMLo_q4yfE7101TQuA0Kx2jGEuK87G7FU6xxIsOqFTL_jrIg_DOdGc2gdXE9PaS38uPthOCkt-emmZYQ"
              />
            </div>
            <img
              alt={t("auth.gate.mascotAlt")}
              className="relative z-10 h-full w-full object-contain drop-shadow-[6px_6px_0_0_rgba(26,29,32,0.25)]"
              src="https://saiseocacvyfegzkewop.supabase.co/storage/v1/object/public/image/icon%20(1).png"
            />
            <div className="absolute top-[8%] left-[12%] h-2 w-2 rounded-sm bg-white/60" />
            <div className="absolute bottom-[10%] right-[10%] h-3 w-3 rounded-sm bg-white/60" />
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="text-balance font-space text-4xl font-black uppercase leading-[0.95] tracking-[-0.03em] text-white md:text-5xl">
              {t("auth.gate.signInSlogan")}
            </h2>
            <p className="font-space text-base font-bold text-white/70">
              {t("auth.gate.signInTagline")}
            </p>
          </div>
        </div>
      </section>

      {/* Right Panel — The Input Forge */}
      <section className="relative flex flex-1 items-center justify-center bg-game-bg bg-dot-pattern-light px-6 py-12 sm:px-10 lg:px-16 dark:bg-[#0f1720]">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border-4 border-[#1A1D20] bg-white p-8 shadow-[8px_8px_0_0_#1A1D20] dark:border-white dark:bg-slate-900 dark:shadow-[8px_8px_0_0_#ffffff]">
            <div className="mb-8 text-center">
              <h1 className="font-space text-3xl font-black tracking-[-0.02em] text-[#1A1D20] sm:text-4xl dark:text-white">
                {t("auth.signIn.title")}
              </h1>
              <p className="mt-2 font-space font-medium text-game-muted dark:text-gray-400">
                {t("auth.signIn.subtitle")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {errors.apiError && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border-4 border-[#1A1D20] bg-[#ff3b3b] px-4 py-3 shadow-[4px_4px_0_0_#1A1D20] dark:border-white dark:shadow-[4px_4px_0_0_#ffffff]"
                >
                  <AlertHexaIcon className="mt-0.5 h-5 w-5 shrink-0 text-white" />
                  <p className="font-space text-sm font-bold text-white">{errors.apiError}</p>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  className="font-space text-xs font-bold uppercase tracking-[0.04em] text-[#1A1D20] dark:text-white"
                >
                  {t("auth.common.emailLabel")}
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-xl border-4 border-[#1A1D20] bg-white p-4 font-space text-lg font-bold text-[#1A1D20] outline-none transition-colors focus:bg-amber-50 dark:border-white/70 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-700"
                  placeholder={t("auth.common.emailPlaceholder")}
                  required
                />
                {errors.email && (
                  <p className="font-space text-sm font-bold text-red-600 dark:text-red-400">{errors.email}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="password"
                  className="font-space text-xs font-bold uppercase tracking-[0.04em] text-[#1A1D20] dark:text-white"
                >
                  {t("auth.common.passwordLabel")}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full rounded-xl border-4 border-[#1A1D20] bg-white p-4 pr-14 font-space text-lg font-bold text-[#1A1D20] outline-none transition-colors focus:bg-amber-50 dark:border-white/70 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-700"
                    placeholder={t("auth.common.passwordPlaceholder")}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t("auth.common.hidePassword") : t("auth.common.showPassword")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1A1D20] hover:opacity-70 dark:text-white"
                  >
                    {showPassword ? <EyeIcon className="h-5 w-5" /> : <EyeCloseIcon className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="font-space text-sm font-bold text-red-600 dark:text-red-400">{errors.password}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={[
                  "mt-2 w-full rounded-xl border-4 border-[#1A1D20] bg-[#F27B3D] py-4 font-space text-xl font-black text-white",
                  "shadow-[5px_5px_0_0_#1A1D20] transition-all duration-150",
                  "dark:border-white dark:shadow-[5px_5px_0_0_#ffffff]",
                  isLoading
                    ? "cursor-not-allowed opacity-70"
                    : "hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0_0_#1A1D20] active:translate-x-0.75 active:translate-y-0.75 active:shadow-none dark:hover:shadow-[3px_3px_0_0_#ffffff]",
                ].join(" ")}
              >
                {isLoading ? t("auth.signIn.loggingIn") : t("auth.signIn.loginBtn")}
              </button>

              <div className="text-center">
                <Link
                  to="/reset-password"
                  className="font-space text-sm font-bold text-[#1A1D20] underline decoration-2 underline-offset-2 hover:text-[#F27B3D] dark:text-white dark:hover:text-[#F27B3D]"
                >
                  {t("auth.signIn.forgotPassword")}
                </Link>
              </div>
            </form>

            <div className="my-7 flex items-center gap-3">
              <span className="h-0.5 flex-1 bg-[#1A1D20]/15 dark:bg-white/15" />
              <span className="font-space text-xs font-bold uppercase tracking-[0.04em] text-game-muted dark:text-gray-400">
                {t("auth.signIn.orLoginWith")}
              </span>
              <span className="h-0.5 flex-1 bg-[#1A1D20]/15 dark:bg-white/15" />
            </div>

            <GoogleAuthButton mode="login" />

            <p className="mt-7 text-center font-space text-sm font-medium text-game-muted dark:text-gray-400">
              {t("auth.signIn.noAccount")}{" "}
              <Link
                to="/signup"
                className="font-bold text-[#1A1D20] underline decoration-2 underline-offset-2 hover:text-[#F27B3D] dark:text-white dark:hover:text-[#F27B3D]"
              >
                {t("auth.signIn.signUpLink")}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import authApi from "../../api/authApi";
import GoogleAuthButton from "./GoogleAuthButton";

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
      {/* Left Hero Section */}
      <section
        className="hidden md:flex w-1/2 items-center justify-center relative p-12"
        style={{ backgroundColor: "#1D2939" }}
      >
        <div className="relative w-full h-full">
          <img
            alt="Hero Fox Mascot"
            className="w-full h-full object-cover relative z-10"
            src="https://saiseocacvyfegzkewop.supabase.co/storage/v1/object/public/image/icon%20(1).png"
          />
          <div className="absolute top-[20%] left-[10%] w-12 h-12" style={{ backgroundColor: "#1D2939" }}>
            <img
              alt="Pixel Heart"
              className="w-full h-full opacity-80 mix-blend-multiply"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAfd-gVHI9N8zzAoGGkMizsu9ZQFOyFHFfiHBzjXGVFN5m_qOSBPHlPmd4_2-Vhxofc7p3u8VqgEmM_mfOxh_ddxuiw2W5HFFpbsUAnu7RWHoq0KMpePvvVd2CG-uM7-TfemLq8XeG-JqWDLUIDvdLGZGz3PbWlFOVyEIe8AZdB02MN-2wEzws1ohwcN1dJpbuoRS1vVxtoyW77bLd408EvN0XB_unhAoVHyJKfGrsTdt7SyDkDReFEJ-dly3AxiUmYoeSk81zP30E"
            />
          </div>
          <div className="absolute top-[15%] right-[10%] w-14 h-14">
            <img
              alt="Pixel Flag"
              className="w-full h-full opacity-80 mix-blend-multiply"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZ1E_Xhf0DmUzFEVWJeSM-HH40hB2nN52QD-wnTG0DHhZ-o_74eNBwQONU7cYVgCLIHG46E1aEQQyaEr7n7vqXapjKBJEbCozDIFeS-TAsb18fKwUpvSR1om8mlUVz5DHurJMAVcC3MGzOPrcVM_qC3pmwdp3oqQKZLEWwtZ1MH36iHKVPYrh6y2vyAyTRMLo_q4yfE7101TQuA0Kx2jGEuK87G7FU6xxIsOqFTL_jrIg_DOdGc2gdXE9PaS38uPthOCkt-emmZYQ"
            />
          </div>
          <div className="absolute bottom-[35%] right-[5%] w-10 h-10" style={{ backgroundColor: "#1D2939" }}>
            <img
              alt="Pixel Heart"
              className="w-full h-full opacity-80 mix-blend-multiply"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAfd-gVHI9N8zzAoGGkMizsu9ZQFOyFHFfiHBzjXGVFN5m_qOSBPHlPmd4_2-Vhxofc7p3u8VqgEmM_mfOxh_ddxuiw2W5HFFpbsUAnu7RWHoq0KMpePvvVd2CG-uM7-TfemLq8XeG-JqWDLUIDvdLGZGz3PbWlFOVyEIe8AZdB02MN-2wEzws1ohwcN1dJpbuoRS1vVxtoyW77bLd408EvN0XB_unhAoVHyJKfGrsTdt7SyDkDReFEJ-dly3AxiUmYoeSk81zP30E"
            />
          </div>
          <div className="absolute top-[30%] left-[30%] w-2 h-2 bg-white rounded-sm opacity-60" />
          <div className="absolute bottom-[20%] right-[30%] w-3 h-3 bg-white rounded-sm opacity-60" />
        </div>
      </section>

      {/* Right Sign Up Form Section */}
      <section className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-16 lg:p-24 overflow-y-auto">
        <div className="w-full max-w-md flex flex-col items-center">
          <div className="text-center mb-6">
            <h1 className="text-4xl md:text-5xl font-bold mb-3" style={{ color: "#5d3b2a" }}>
              {t("auth.signUp.title")}
            </h1>
            <p className="text-gray-500 text-lg">{t("auth.signUp.subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            {errors.apiError && (
              <div className="w-full p-3 bg-red-100 text-red-600 text-sm rounded-lg text-center font-medium border border-red-200">
                {errors.apiError}
              </div>
            )}

            <div>
              <input
                type="text"
                name="userName"
                value={formData.userName}
                onChange={handleChange}
                className="w-full border-2 focus:ring-0 text-gray-700 text-lg"
                style={{ borderColor: "#a2e8c1", borderRadius: "9999px", paddingLeft: "1.5rem", paddingRight: "1.5rem", height: "3.5rem" }}
                placeholder={t("auth.signUp.usernamePlaceholder")}
                required
              />
              {errors.userName && <p className="text-red-500 text-sm mt-1">{errors.userName}</p>}
            </div>

            <div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full border-2 focus:ring-0 text-gray-700 text-lg"
                style={{ borderColor: "#a2e8c1", borderRadius: "9999px", paddingLeft: "1.5rem", paddingRight: "1.5rem", height: "3.5rem" }}
                placeholder={t("auth.common.emailPlaceholder")}
                required
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full border-2 focus:ring-0 text-gray-700 text-lg"
                style={{ borderColor: "#a2e8c1", borderRadius: "9999px", paddingLeft: "1.5rem", paddingRight: "3rem", height: "3.5rem" }}
                placeholder={t("auth.common.passwordPlaceholder")}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeIcon className="w-5 h-5" /> : <EyeCloseIcon className="w-5 h-5" />}
              </button>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            <div className="flex items-start gap-3 mt-4">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="w-5 h-5 mt-1"
                style={{ accentColor: "#f27b3d" }}
              />
              <p className="text-sm text-gray-600">
                {t("auth.signUp.termsText")}{" "}
                <span className="font-semibold text-gray-800 cursor-pointer hover:underline">
                  {t("auth.signUp.termsLink")}
                </span>{" "}
                {t("auth.signUp.and")}{" "}
                <span className="font-semibold text-gray-800 cursor-pointer hover:underline">
                  {t("auth.signUp.privacyLink")}
                </span>
              </p>
            </div>
            {errors.terms && <p className="text-red-500 text-sm">{errors.terms}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 text-white text-xl font-bold mt-4 shadow-sm ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
              style={{ backgroundColor: "#f27b3d", borderRadius: "9999px", transition: "background-color 0.2s" }}
              onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = "#e66d2f"; }}
              onMouseLeave={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = "#f27b3d"; }}
            >
              {isLoading ? t("auth.signUp.creatingBtn") : t("auth.signUp.createBtn")}
            </button>
          </form>

          <div className="w-full flex items-center justify-center my-8">
            <span className="text-gray-500 font-medium">{t("auth.signUp.orSignUpWith")}</span>
          </div>

          <div className="w-full">
            <GoogleAuthButton mode="register" />
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600 text-sm">
              {t("auth.signUp.haveAccount")}{" "}
              <Link to="/" className="font-semibold hover:underline" style={{ color: "#f27b3d" }}>
                {t("auth.signUp.signInLink")}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

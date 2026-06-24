import { useState } from "react";
import { Link } from "react-router";
import { EyeCloseIcon, EyeIcon } from "../../icons";
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
  apiError?: string; // Thêm trường chứa lỗi trả về từ Backend
}

export default function SignInForm() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false); // State loading cho nút Login

  const [formData, setFormData] = useState<FormState>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Xóa lỗi khi người dùng bắt đầu gõ lại
    if (errors[name as keyof FormErrors] || errors.apiError) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
        apiError: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    const newErrors: FormErrors = {};
    if (!formData.email) {
      newErrors.email = "Email is required";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Xử lý gọi API Đăng nhập
    try {
      setIsLoading(true);

      const response = await authApi.login({
        email: formData.email,
        password: formData.password,
      });

      if (response?.success && response.data) {
        // response.data is AuthUser; roles is string[] from BE
        const userData = response.data;
        login(userData);
        // Navigation is handled by SignIn.tsx: after setUser() commits, isAuthenticated
        // becomes true there and it renders <Navigate> to the role-appropriate route.
        return;
      }

      // success: false — show the BE's own message (wrong password, account locked, etc.)
      setErrors({
        apiError: response?.message || "Invalid email or password. Please try again.",
      });

    } catch (error: any) {
      // Log the actual error so it is never hidden — useful to distinguish
      // a real API 4xx/5xx from a JS TypeError thrown inside this block.
      console.error("[SignIn] Unexpected error during login:", error);
      setErrors({
        apiError: error?.response?.data?.message || "Invalid email or password. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Left Hero Section - Hidden on mobile, visible on md+ */}
      <section
        className="hidden md:flex w-1/2 items-center justify-center relative p-12"
        style={{ backgroundColor: "#1D2939" }}
      >
        <div className="relative w-full h-full ">
          {/* Main Mascot */}
          <img
            alt="Hero Fox Mascot"
            className="w-full h-full object-cover relative z-10 "
            src="https://saiseocacvyfegzkewop.supabase.co/storage/v1/object/public/image/icon%20(1).png"
          />

          {/* Pixel Art Decorations */}
          {/* Heart top left */}
          <div className="absolute top-[20%] left-[10%] w-12 h-12">
            <img
              alt="Pixel Heart"
              className="w-full h-full opacity-80 mix-blend-multiply"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAfd-gVHI9N8zzAoGGkMizsu9ZQFOyFHFfiHBzjXGVFN5m_qOSBPHlPmd4_2-Vhxofc7p3u8VqgEmM_mfOxh_ddxuiw2W5HFFpbsUAnu7RWHoq0KMpePvvVd2CG-uM7-TfemLq8XeG-JqWDLUIDvdLGZGz3PbWlFOVyEIe8AZdB02MN-2wEzws1ohwcN1dJpbuoRS1vVxtoyW77bLd408EvN0XB_unhAoVHyJKfGrsTdt7SyDkDReFEJ-dly3AxiUmYoeSk81zP30E"
            />
          </div>

          {/* Flag top right */}
          <div className="absolute top-[15%] right-[10%] w-14 h-14">
            <img
              alt="Pixel Flag"
              className="w-full h-full opacity-80 mix-blend-multiply"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZ1E_Xhf0DmUzFEVWJeSM-HH40hB2nN52QD-wnTG0DHhZ-o_74eNBwQONU7cYVgCLIHG46E1aEQQyaEr7n7vqXapjKBJEbCozDIFeS-TAsb18fKwUpvSR1om8mlUVz5DHurJMAVcC3MGzOPrcVM_qC3pmwdp3oqQKZLEWwtZ1MH36iHKVPYrh6y2vyAyTRMLo_q4yfE7101TQuA0Kx2jGEuK87G7FU6xxIsOqFTL_jrIg_DOdGc2gdXE9PaS38uPthOCkt-emmZYQ"
            />
          </div>

          {/* Heart middle right */}
          <div className="absolute bottom-[35%] right-[5%] w-10 h-10" style={{ backgroundColor: "#1D2939" }}>
            <img
              alt="Pixel Heart"
              className="w-full h-full opacity-80 mix-blend-multiply"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAfd-gVHI9N8zzAoGGkMizsu9ZQFOyFHFfiHBzjXGVFN5m_qOSBPHlPmd4_2-Vhxofc7p3u8VqgEmM_mfOxh_ddxuiw2W5HFFpbsUAnu7RWHoq0KMpePvvVd2CG-uM7-TfemLq8XeG-JqWDLUIDvdLGZGz3PbWlFOVyEIe8AZdB02MN-2wEzws1ohwcN1dJpbuoRS1vVxtoyW77bLd408EvN0XB_unhAoVHyJKfGrsTdt7SyDkDReFEJ-dly3AxiUmYoeSk81zP30E"
            />
          </div>

          {/* Small decorative dots */}
          <div className="absolute top-[30%] left-[30%] w-2 h-2 bg-white rounded-sm opacity-60"></div>
          <div className="absolute bottom-[20%] right-[30%] w-3 h-3 bg-white rounded-sm opacity-60"></div>
        </div>
      </section>

      {/* Right Login Form Section */}
      <section className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-16 lg:p-24">
        <div className="w-full max-w-md flex flex-col items-center">
          {/* Header Text */}
          <div className="text-center mb-6">
            <h1
              className="text-4xl md:text-5xl font-bold mb-3"
              style={{ color: "#5d3b2a" }}
            >
              Welcome Back, Hero!
            </h1>
            <p className="text-gray-500 text-lg">
              Log in to continue your journey.
            </p>
          </div>

          {/* Sign In Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4">

            {/* Hiển thị lỗi API (sai thông tin đăng nhập) */}
            {errors.apiError && (
              <div className="w-full p-3 bg-red-100 text-red-600 text-sm rounded-lg text-center font-medium border border-red-200">
                {errors.apiError}
              </div>
            )}

            {/* Email Input */}
            <div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="pill-input w-full border-2 focus:ring-0 text-gray-700 text-lg"
                style={{
                  borderColor: "#a2e8c1",
                  borderRadius: "9999px",
                  paddingLeft: "1.5rem",
                  paddingRight: "1.5rem",
                  height: "3.5rem",
                }}
                placeholder="Email Address"
                required
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password Input */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="pill-input w-full border-2 focus:ring-0 text-gray-700 text-lg"
                style={{
                  borderColor: "#a2e8c1",
                  borderRadius: "9999px",
                  paddingLeft: "1.5rem",
                  paddingRight: "3rem",
                  height: "3.5rem",
                }}
                placeholder="Password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeIcon className="w-5 h-5" />
                ) : (
                  <EyeCloseIcon className="w-5 h-5" />
                )}
              </button>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`btn-primary w-full py-4 text-white text-xl font-bold mt-2 shadow-sm ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              style={{
                backgroundColor: "#f27b3d",
                borderRadius: "9999px",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = "#e66d2f";
              }}
              onMouseLeave={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = "#f27b3d";
              }}
            >
              {isLoading ? "Logging in..." : "Log In"}
            </button>

            {/* Forgot Password Link */}
            <div className="text-center mt-4">
              <Link
                to="/reset-password"
                className="font-medium underline hover:opacity-80 text-sm"
                style={{ color: "#5d3b2a" }}
              >
                Forgot Password?
              </Link>
            </div>
          </form>

          {/* Social Login Divider */}
          <div className="w-full flex items-center justify-center my-8">
            <span className="text-gray-500 font-medium">Or log in with:</span>
          </div>

          {/* Social Buttons */}
          <div className="w-full">
            <GoogleAuthButton mode="login" />
          </div>

          {/* Sign Up Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 text-sm">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-semibold hover:underline"
                style={{ color: "#f27b3d" }}
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
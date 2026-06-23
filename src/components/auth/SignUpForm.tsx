import { useState } from "react";
import { Link, useNavigate } from "react-router";
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
  apiError?: string; // Thêm field để hiển thị lỗi từ Backend trả về
}

export default function SignUpForm() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isChecked, setIsChecked] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false); // State quản lý loading

  const [formData, setFormData] = useState<SignUpFormState>({
    userName: "",
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
    // Clear error for this field when user starts typing
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

    // Validation
    const newErrors: FormErrors = {};
    if (!formData.userName.trim()) {
      newErrors.userName = "User name is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    }
    if (!isChecked) {
      newErrors.terms = "You must agree to the terms and conditions";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Call API Register
    try {
      setIsLoading(true);

      // Chú ý: Map 'userName' của form sang 'username' của API payload
      await authApi.register({
        username: formData.userName,
        email: formData.email,
        password: formData.password,
      });

      // Nếu API thành công (không throw error), chuyển hướng người dùng sang trang Sign In
      console.log("Đăng ký thành công!");
      navigate("/");

    } catch (error: any) {
      console.error("Lỗi đăng ký:", error);
      // Bắt lỗi từ Backend (ví dụ: Email đã tồn tại) và hiển thị lên UI
      setErrors({
        apiError: error.response?.data?.message || "Registration failed. Please try again.",
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
        style={{ backgroundColor: "#ABEDDF" }}
      >
        <div className="relative w-full h-full ">
          {/* Main Mascot */}
          <img
            alt="Hero Fox Mascot"
            className="w-full h-full object-cover relative z-10 "
            src="https://saiseocacvyfegzkewop.supabase.co/storage/v1/object/sign/image/logo.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84NWVhZmI4Yi1iNjNiLTQ3N2ItOTAxOC05YmVmMWNhYTAzM2EiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZS9sb2dvLmpwZyIsImlhdCI6MTc4MDkwNDY1NSwiZXhwIjoxODEyNDQwNjU1fQ.5L1-wFihH00__Fdwd2q91zDgXum2SQtO4eMW6TUyTvg"
          />

          {/* Pixel Art Decorations */}
          {/* Heart top left */}
          <div className="absolute top-[20%] left-[10%] w-12 h-12">
            <img
              alt="Pixel Heart"
              className="w-full h-full opacity-80"
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
          <div className="absolute bottom-[35%] right-[5%] w-10 h-10">
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

      {/* Right Sign Up Form Section */}
      <section className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-16 lg:p-24 overflow-y-auto">
        <div className="w-full max-w-md flex flex-col items-center">
          {/* Header Text */}
          <div className="text-center mb-6">
            <h1
              className="text-4xl md:text-5xl font-bold mb-3"
              style={{ color: "#5d3b2a" }}
            >
              Join the Adventure!
            </h1>
            <p className="text-gray-500 text-lg">
              Create your account to begin your journey.
            </p>
          </div>

          {/* Sign Up Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            {/* Hiển thị lỗi từ API (VD: Email đã được sử dụng) */}
            {errors.apiError && (
              <div className="w-full p-3 bg-red-100 text-red-600 text-sm rounded-lg text-center font-medium border border-red-200">
                {errors.apiError}
              </div>
            )}

            {/* First Name and Last Name */}
            <div>
              <input
                type="text"
                name="userName"
                value={formData.userName}
                onChange={handleChange}
                className="w-full border-2 focus:ring-0 text-gray-700 text-lg"
                style={{
                  borderColor: "#a2e8c1",
                  borderRadius: "9999px",
                  paddingLeft: "1.5rem",
                  paddingRight: "1.5rem",
                  height: "3.5rem",
                }}
                placeholder="User Name"
                required
              />
              {errors.userName && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.userName}
                </p>
              )}
            </div>

            {/* Email Input */}
            <div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full border-2 focus:ring-0 text-gray-700 text-lg"
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
                className="w-full border-2 focus:ring-0 text-gray-700 text-lg"
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

            {/* Terms Checkbox */}
            <div className="flex items-start gap-3 mt-4">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="w-5 h-5 mt-1 accent-orange-500"
                style={{ accentColor: "#f27b3d" }}
              />
              <p className="text-sm text-gray-600">
                By creating an account, I agree to the{" "}
                <span className="font-semibold text-gray-800 cursor-pointer hover:underline">
                  Terms and Conditions
                </span>{" "}
                and{" "}
                <span className="font-semibold text-gray-800 cursor-pointer hover:underline">
                  Privacy Policy
                </span>
              </p>
            </div>
            {errors.terms && (
              <p className="text-red-500 text-sm">{errors.terms}</p>
            )}

            {/* Sign Up Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 text-white text-xl font-bold mt-4 shadow-sm ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
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
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          {/* Social Divider */}
          <div className="w-full flex items-center justify-center my-8">
            <span className="text-gray-500 font-medium">Or sign up with:</span>
          </div>

          {/* Social Buttons */}
          <div className="w-full">
            <GoogleAuthButton mode="register" />
          </div>

          {/* Sign In Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 text-sm">
              Already have an account?{" "}
              <Link
                to="/signin"
                className="font-semibold hover:underline"
                style={{ color: "#f27b3d" }}
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
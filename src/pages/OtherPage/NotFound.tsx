import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import PageMeta from "../../components/common/PageMeta";

export default function NotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <>
      <PageMeta title="404 — HabitEvolve" description="Page not found" />

      <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center p-8 relative overflow-hidden">

        {/* Floating decorative blocks */}
        <div className="absolute top-12 left-12 w-20 h-20 bg-[#A7F3D0] border-4 border-black rounded-2xl rotate-12 shadow-[4px_4px_0_0_#1A1D20] hidden sm:block" />
        <div className="absolute top-24 right-16 w-12 h-12 bg-[#DDD6FE] border-4 border-black rounded-xl -rotate-6 shadow-[3px_3px_0_0_#1A1D20] hidden sm:block" />
        <div className="absolute bottom-16 left-20 w-10 h-10 bg-[#FEE2E2] border-4 border-black rounded-full shadow-[3px_3px_0_0_#1A1D20] hidden sm:block" />
        <div className="absolute bottom-20 right-24 w-16 h-16 bg-[#FDE68A] border-4 border-black rounded-2xl rotate-6 shadow-[4px_4px_0_0_#1A1D20] hidden sm:block" />

        <div className="w-full max-w-md relative z-10">

          {/* 404 number block */}
          <div className="bg-[#FEF3C7] border-4 border-b-0 border-black rounded-t-2xl px-10 pt-10 pb-2 text-center">
            <div className="text-[112px] font-black text-black leading-none tracking-tighter select-none">
              404
            </div>
            {/* divider icon */}
            <div className="flex items-center justify-center mt-3 -mb-5">
              <div className="w-10 h-10 bg-white border-4 border-black rounded-full shadow-[3px_3px_0_0_#1A1D20] flex items-center justify-center text-xl z-10">
                🧭
              </div>
            </div>
          </div>

          {/* Content block */}
          <div className="bg-white border-4 border-black rounded-b-2xl shadow-[8px_8px_0_0_#1A1D20] px-10 pt-10 pb-8 text-center">
            <h1 className="text-xl font-black text-black mb-3 uppercase tracking-tight">
              {t("pages.notFound.title")}
            </h1>
            <p className="text-gray-600 font-medium mb-8 text-sm leading-relaxed">
              {t("pages.notFound.message")}
            </p>
            <div className="flex flex-col gap-3">
              <Link
                to="/"
                className="w-full py-3 px-6 bg-[#A7F3D0] border-2 border-black rounded-xl font-bold text-black shadow-[3px_3px_0_0_#1A1D20] hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1A1D20] transition-all"
              >
                {t("pages.notFound.backHome")}
              </Link>
              <button
                onClick={() => navigate(-1)}
                className="w-full py-3 px-6 bg-white border-2 border-black rounded-xl font-bold text-black shadow-[3px_3px_0_0_#1A1D20] hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1A1D20] transition-all"
              >
                {t("pages.notFound.goBack")}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

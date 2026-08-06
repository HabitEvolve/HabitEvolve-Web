import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Compass, ArrowLeft, Home } from "lucide-react";
import PageMeta from "../../components/common/PageMeta";

export default function NotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <>
      <PageMeta title="404 — HabitEvolve" description="Page not found" />

      <div className="sky-mesh-bg min-h-screen flex items-center justify-center p-8 relative overflow-hidden">
        {/* Soft out-of-focus orbs instead of the old hard-edged confetti blocks.
            A dead end should feel quiet, so the decoration sits far behind the
            card and never competes with the two things that matter: what
            happened, and how to get out. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-20 w-80 h-80 rounded-full bg-sky-2/45 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -right-24 w-96 h-96 rounded-full bg-sky-violet/18 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/3 right-1/4 w-40 h-40 rounded-full bg-sky-peach/20 blur-3xl hidden sm:block"
        />

        <div className="w-full max-w-md relative z-10">
          <div className="sky-in sky-glass rounded-sky-card px-10 pt-11 pb-9 text-center">
            {/* A missing page is not a fault — nobody did anything wrong — so the
                numeral stays in quiet ink rather than taking the rose that the
                403 screen uses for a genuine refusal. */}
            <div className="font-display text-[104px] leading-none font-semibold tracking-tighter tabular-nums select-none bg-linear-to-b from-sky-ink/85 to-sky-ink/35 bg-clip-text text-transparent">
              404
            </div>

            <span className="grid place-items-center w-12 h-12 mx-auto -mt-2 mb-5 rounded-full bg-white/70 ring-1 ring-white/85 text-sky-deep shadow-sky-chip">
              <Compass className="w-5 h-5" aria-hidden="true" />
            </span>

            <h1 className="font-display text-sky-h3 font-semibold text-sky-ink mb-2.5">
              {t("pages.notFound.title")}
            </h1>
            <p className="text-sm font-medium text-sky-ink-2 leading-relaxed mb-8">
              {t("pages.notFound.message")}
            </p>

            <div className="flex flex-col gap-2.5">
              <Link
                to="/"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-sky-md bg-linear-to-b from-sky-deep-lo to-sky-deep font-display text-base font-semibold text-white ring-1 ring-sky-deep/30 shadow-[0_10px_24px_-10px_rgba(36,52,77,0.55)] transition-all duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-deep/50"
              >
                <Home className="w-4 h-4 shrink-0" aria-hidden="true" />
                {t("pages.notFound.backHome")}
              </Link>
              <button
                onClick={() => navigate(-1)}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-sky-md bg-white/65 ring-1 ring-white/85 font-display text-base font-semibold text-sky-ink-2 shadow-sky-chip transition-all duration-200 hover:bg-white/85 hover:text-sky-ink hover:-translate-y-px active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-deep/45"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
                {t("pages.notFound.goBack")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

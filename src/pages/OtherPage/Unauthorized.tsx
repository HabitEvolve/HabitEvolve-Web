import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ShieldOff, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Unauthorized() {
    const { t } = useTranslation();
    const { logout } = useAuth();

    return (
        <div className="sky-mesh-bg min-h-screen flex items-center justify-center p-8">
            <div className="w-full max-w-md text-center">
                {/* Unlike the 404, this one *is* a refusal — a door that exists and
                    is closed to you — so it carries the destructive accent on a
                    rail, with a glyph and heavier ink behind it. Never colour alone. */}
                <div className="sky-in relative overflow-hidden sky-glass rounded-sky-card px-10 pt-11 pb-9">
                    <span
                        aria-hidden="true"
                        className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-sky-rose to-sky-rose-deep"
                    />

                    <div className="font-display text-[104px] leading-none font-semibold tracking-tighter tabular-nums select-none bg-linear-to-b from-sky-rose to-sky-rose-deep bg-clip-text text-transparent">
                        403
                    </div>

                    <span className="grid place-items-center w-12 h-12 mx-auto -mt-2 mb-5 rounded-full bg-sky-rose/12 ring-1 ring-sky-rose/25 text-sky-rose-deep">
                        <ShieldOff className="w-5 h-5" aria-hidden="true" />
                    </span>

                    <h1 className="font-display text-sky-h3 font-semibold text-sky-ink mb-2.5">
                        {t("pages.unauthorized.title")}
                    </h1>
                    <p className="text-sm font-medium text-sky-ink-2 leading-relaxed mb-8">
                        {t("pages.unauthorized.message")}
                    </p>

                    <div className="flex flex-col gap-2.5">
                        <Link
                            to="/"
                            className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-sky-md bg-linear-to-b from-sky-deep-lo to-sky-deep font-display text-base font-semibold text-white ring-1 ring-sky-deep/30 shadow-[0_10px_24px_-10px_rgba(36,52,77,0.55)] transition-all duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-deep/50"
                        >
                            <LayoutDashboard className="w-4 h-4 shrink-0" aria-hidden="true" />
                            {t("pages.unauthorized.goToDashboard")}
                        </Link>
                        <button
                            onClick={logout}
                            className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-sky-md bg-white/65 ring-1 ring-white/85 font-display text-base font-semibold text-sky-ink-2 shadow-sky-chip transition-all duration-200 hover:bg-white/85 hover:text-sky-ink hover:-translate-y-px active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-deep/45"
                        >
                            <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
                            {t("pages.unauthorized.logOut")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

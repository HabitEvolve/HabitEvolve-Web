import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRoleBasedRedirect } from '../../utils/roleRedirect';

// Landing page for Google OAuth redirect.
// Supabase processes the auth code in the URL, fires SIGNED_IN in AuthContext,
// which calls the BE and stores the JWT. This page just shows a loader and
// navigates to /home once isAuthenticated flips to true.
export default function OAuthCallback() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isAuthenticated, user, oauthPending, oauthError, clearOauthError } = useAuth();

    useEffect(() => {
        if (isAuthenticated && user) {
            navigate(getRoleBasedRedirect(user.roles), { replace: true });
        }
    }, [isAuthenticated, user, navigate]);

    if (oauthError) {
        return (
            <div className="sky-mesh-bg min-h-screen flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* Rose rail + glyph + weight: a failed sign-in is a real fault,
                        so it carries the destructive accent — never colour alone. */}
                    <div className="sky-in relative overflow-hidden sky-glass rounded-sky-card p-9 text-center">
                        <span className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-sky-rose to-sky-rose-deep" aria-hidden="true" />
                        <span className="grid place-items-center w-16 h-16 mx-auto mb-4 rounded-full bg-sky-rose/12 ring-1 ring-sky-rose/25 text-sky-rose-deep">
                            <AlertTriangle className="w-7 h-7" aria-hidden="true" />
                        </span>
                        <h2 className="font-display text-xl font-semibold tracking-[-0.01em] text-sky-ink mb-2">
                            {t("pages.oauthCallback.loginFailed")}
                        </h2>
                        <p className="text-sm font-medium text-sky-ink-2 mb-7">{oauthError}</p>
                        <button
                            onClick={() => {
                                clearOauthError();
                                navigate('/', { replace: true });
                            }}
                            className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-sky-md bg-linear-to-b from-sky-deep-lo to-sky-deep font-display text-base font-semibold text-white ring-1 ring-sky-deep/30 shadow-[0_10px_24px_-10px_rgba(36,52,77,0.55)] transition-all duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-deep/50"
                        >
                            <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
                            {t("pages.oauthCallback.tryAgain")}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="sky-mesh-bg min-h-screen flex items-center justify-center p-8">
            {/* Waiting is neither success nor failure, so the panel stays neutral
                glass and lets the motion carry the state. */}
            <div className="sky-in sky-glass rounded-sky-card px-12 py-10 flex flex-col items-center gap-5">
                <span className="grid place-items-center w-14 h-14 rounded-full bg-sky-deep/10 ring-1 ring-white/70 text-sky-deep">
                    <Loader2 className="w-7 h-7 animate-spin" role="status" aria-label="Loading" />
                </span>
                <p className="font-display text-base font-semibold text-sky-ink text-center">
                    {oauthPending ? t("pages.oauthCallback.verifying") : t("pages.oauthCallback.processing")}
                </p>
            </div>
        </div>
    );
}

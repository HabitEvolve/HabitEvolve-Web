import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
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
            <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center p-8">
                <div className="w-full max-w-md text-center">
                    <div className="border-4 border-black rounded-2xl shadow-[8px_8px_0_0_#1A1D20] bg-[#FEE2E2] p-10">
                        <div className="text-6xl mb-4" role="img" aria-label="Warning">⚠️</div>
                        <h2 className="text-xl font-black text-black mb-3 uppercase tracking-tight">
                            {t("pages.oauthCallback.loginFailed")}
                        </h2>
                        <p className="text-gray-700 font-medium mb-8">{oauthError}</p>
                        <button
                            onClick={() => {
                                clearOauthError();
                                navigate('/', { replace: true });
                            }}
                            className="w-full py-3 px-6 bg-white border-2 border-black rounded-xl font-bold text-black shadow-[3px_3px_0_0_#1A1D20] hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1A1D20] transition-all"
                        >
                            {t("pages.oauthCallback.tryAgain")}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
            <div className="border-4 border-black rounded-2xl shadow-[8px_8px_0_0_#1A1D20] bg-[#A7F3D0] px-12 py-10 flex flex-col items-center gap-5">
                <div
                    className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"
                    role="status"
                    aria-label="Loading"
                />
                <p className="font-black text-black text-lg uppercase tracking-tight">
                    {oauthPending ? t("pages.oauthCallback.verifying") : t("pages.oauthCallback.processing")}
                </p>
            </div>
        </div>
    );
}

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AuthUser, GoogleLoginPayload } from '../types/api.types';
import { registerLogoutCallback } from '../api/authBridge';
import { supabase } from '../api/supabaseClient';
import authApi from '../api/authApi';

// ── Context shape ─────────────────────────────────────────────────────────────
interface AuthContextType {
    user: AuthUser | null;
    isAuthenticated: boolean;
    // OAuth state — watched by OAuthCallback to show loading/error UI
    oauthPending: boolean;
    oauthError: string | null;
    login: (userData: AuthUser) => void;
    logout: () => void;
    hasRole: (role: string) => boolean;
    clearOauthError: () => void;
}

const AUTH_STORAGE_KEY = 'auth_user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Helpers ───────────────────────────────────────────────────────────────────
// Read directly from storage — safe to call inside callbacks without stale-closure risk
const readStoredUser = (): AuthUser | null => {
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
        return null;
    }
};

// ── Provider ──────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(readStoredUser);
    const [oauthPending, setOauthPending] = useState(false);
    const [oauthError, setOauthError] = useState<string | null>(null);

    const login = useCallback((userData: AuthUser): void => {
        setUser(userData);
        // Primary canonical store
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
        // Legacy keys — axiosClient reads 'access_token'; userProfileApi reads 'user_id'
        localStorage.setItem('access_token', userData.accessToken);
        localStorage.setItem('user_id', String(userData.userId));
        if (userData.refreshToken) {
            localStorage.setItem('refresh_token', userData.refreshToken);
        }
    }, []);

    const logout = useCallback((): void => {
        setUser(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_id');
        // Sign out from Supabase so its session doesn't re-trigger SIGNED_IN on next load.
        // This fires SIGNED_OUT, but by then localStorage is already cleared so the
        // SIGNED_OUT handler below sees no stored user and does nothing — no loop.
        supabase.auth.signOut();
    }, []);

    const clearOauthError = useCallback((): void => {
        setOauthError(null);
    }, []);

    // Register the logout bridge so axiosClient can trigger logout on 401
    useEffect(() => {
        registerLogoutCallback(logout);
    }, [logout]);

    // ── Supabase auth state listener ─────────────────────────────────────────
    // Handles the Google OAuth callback: SIGNED_IN fires after the redirect back
    // from Google. We extract the Supabase user, call our BE to get the real JWT,
    // then store it via login(). The OAuthCallback page watches isAuthenticated to
    // navigate once this async flow completes.
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' && session?.user) {
                    // Skip if we already have a valid BE JWT — this also fires on normal
                    // page-load refresh when Supabase restores its session from storage.
                    if (readStoredUser()?.accessToken) return;

                    const supabaseUser = session.user;
                    const payload: GoogleLoginPayload = {
                        email: supabaseUser.email!,
                        // Google may provide full_name or name depending on OAuth scope
                        fullName: supabaseUser.user_metadata?.full_name
                            ?? supabaseUser.user_metadata?.name
                            ?? '',
                        avatarUrl: supabaseUser.user_metadata?.picture
                            ?? supabaseUser.user_metadata?.avatar_url
                            ?? null,
                        emailVerified: supabaseUser.user_metadata?.email_verified ?? false,
                        // Web is the Mentor portal — new Google accounts created from here
                        // are always MENTOR. Ignored by BE if the account already exists.
                        role: 'MENTOR',
                    };

                    setOauthPending(true);
                    setOauthError(null);

                    try {
                        const response = await authApi.continueWithGoogle(payload);
                        if (response.success && response.data) {
                            login(response.data);
                        } else {
                            setOauthError(
                                response.message ?? 'Google sign-in failed. Please try again.'
                            );
                        }
                    } catch (err: any) {
                        setOauthError(
                            err?.response?.data?.message ?? 'An unexpected error occurred.'
                        );
                    } finally {
                        setOauthPending(false);
                    }
                }

                // Cross-tab logout sync: if the user signs out in another tab,
                // Supabase broadcasts SIGNED_OUT here. Clear the BE JWT too.
                if (event === 'SIGNED_OUT') {
                    if (readStoredUser()) {
                        // Call setUser/localStorage directly to avoid re-triggering supabase.signOut()
                        setUser(null);
                        localStorage.removeItem(AUTH_STORAGE_KEY);
                        localStorage.removeItem('access_token');
                        localStorage.removeItem('refresh_token');
                        localStorage.removeItem('user_id');
                    }
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [login, logout]);

    const hasRole = useCallback((role: string): boolean => {
        // Double optional-chain: guards both user === null AND user.roles === null/undefined
        return user?.roles?.includes(role) ?? false;
    }, [user]);

    const isAuthenticated = user !== null && Boolean(user.accessToken);

    return (
        <AuthContext.Provider value={{
            user, isAuthenticated, oauthPending, oauthError,
            login, logout, hasRole, clearOauthError,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useAuth = (): AuthContextType => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
    return ctx;
};

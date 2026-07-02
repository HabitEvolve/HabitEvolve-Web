import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../api/supabaseClient';

type AuthMode = 'login' | 'register';

interface GoogleAuthButtonProps {
  mode: AuthMode;
  className?: string;
}

export default function GoogleAuthButton({ mode, className = '' }: GoogleAuthButtonProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = mode === 'login' ? t('auth.google.signIn') : t('auth.google.signUp');
  const loadingLabel = t('auth.google.connecting');

  const handleClick = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: 'select_account' },
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setIsLoading(false);
      }
      // On success Supabase redirects to Google — keep loading state during redirect.
    } catch (err: any) {
      setError(err?.message ?? t('auth.google.error'));
      setIsLoading(false);
    }
  };

  return (
    <div className={`w-full flex flex-col gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        aria-label={label}
        className={[
          'w-full flex items-center justify-center gap-3',
          'bg-white font-bold text-black text-base',
          'border-4 border-black rounded-xl',
          'shadow-[4px_4px_0_0_#1A1D20]',
          'transition-all duration-150',
          'px-6',
          'dark:bg-slate-800 dark:text-white dark:border-white dark:shadow-[4px_4px_0_0_#ffffff]',
          isLoading
            ? 'opacity-60 cursor-not-allowed'
            : 'hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1A1D20] active:translate-x-1 active:translate-y-1 active:shadow-none dark:hover:shadow-[2px_2px_0_0_#ffffff]',
        ].join(' ')}
        style={{ height: '3.5rem' }}
      >
        {isLoading ? (
          <>
            <div
              className="w-5 h-5 border-[3px] border-black border-t-transparent rounded-full animate-spin shrink-0 dark:border-white dark:border-t-transparent"
              role="status"
              aria-hidden="true"
            />
            <span>{loadingLabel}</span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5 shrink-0"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>{label}</span>
          </>
        )}
      </button>

      {error && (
        <p className="text-center text-sm font-bold text-red-600 border-2 border-red-400 rounded-lg px-3 py-2 bg-red-50 dark:text-red-400 dark:border-red-500/60 dark:bg-red-950/40">
          {error}
        </p>
      )}
    </div>
  );
}

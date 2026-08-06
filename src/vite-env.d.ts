/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend API base URL, e.g. https://habitevolve-be-2.onrender.com/api */
  readonly VITE_API_URL: string;
  /** Supabase project URL. Optional when VITE_USE_MOCK_SUPABASE=true. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon key. Optional when VITE_USE_MOCK_SUPABASE=true. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** 'true' swaps in the in-memory mock client (src/api/supabaseClient.mock.ts). */
  readonly VITE_USE_MOCK_SUPABASE?: string;
  /** Mock mode only: the email the fake Google sign-in reports to the BE. */
  readonly VITE_MOCK_GOOGLE_EMAIL?: string;
  /** Mock mode only: the display name the fake Google sign-in reports. */
  readonly VITE_MOCK_GOOGLE_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

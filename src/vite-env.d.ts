/// <reference types="vite/client" />

// Restored after deletion: without the `vite/client` reference Vite's CSS-module
// and asset declarations vanish, and `import.meta.env` falls back to the bare
// ImportMeta type — which broke `npx tsc -b` across ten call-sites (main.tsx's
// CSS imports, every `import.meta.env.VITE_*` read).

interface ImportMetaEnv {
  /** Backend API base URL, e.g. https://habitevolve-be-2.onrender.com/api */
  readonly VITE_API_URL: string;
  /** Supabase project URL. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon key. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Still read by supabaseClient.ts, though the mock client it selected is gone. */
  readonly VITE_USE_MOCK_SUPABASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// src/api/supabaseClient.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Vite only reads .env from the project root (default envDir) — a .env inside
// src/ is NOT picked up. Copy .env.example to ./.env at the repo root.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const useMock = import.meta.env.VITE_USE_MOCK_SUPABASE === 'true';

// Cast: the mock implements only the calls this app makes (auth.onAuthStateChange /
// signInWithOAuth / signOut, storage upload + getPublicUrl), not all of
// SupabaseClient. Consumers import `supabase` and stay unaware of which is live.
const resolveClient = (): SupabaseClient => {
    if (useMock) {
        console.info(
            '[supabase] MOCK mode (VITE_USE_MOCK_SUPABASE=true) — no requests will be sent to Supabase.',
        );
    }

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            'Thiếu biến môi trường Supabase. Tạo file .env ở thư mục gốc của project ' +
            '(xem .env.example) với VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY, ' +
            'hoặc đặt VITE_USE_MOCK_SUPABASE=true để chạy ở chế độ mock. ' +
            'Lưu ý: Vite không đọc .env nằm trong src/.',
        );
    }

    return createClient(supabaseUrl, supabaseAnonKey);
};

export const supabase = resolveClient();

/** True when the app is running against the mock client — handy for dev-only UI hints. */
export const isSupabaseMocked = useMock;

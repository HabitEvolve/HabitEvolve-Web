// src/api/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Khai báo biến môi trường trong file .env của bạn
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Thiếu biến môi trường Supabase trong file .env");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
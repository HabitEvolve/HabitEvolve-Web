// Mock Supabase client — no network, no credentials.
//
// Enabled by VITE_USE_MOCK_SUPABASE=true (see supabaseClient.ts). Exists so the
// app boots and the Google-login / avatar-upload paths stay walkable without real
// Supabase keys.
//
// Scope is deliberately narrow: it implements only the five calls this codebase
// actually makes, not the Supabase surface at large —
//   auth.onAuthStateChange   (AuthContext)
//   auth.signOut             (AuthContext)
//   auth.signInWithOAuth     (GoogleAuthButton)
//   storage.from().upload    (uploadApi)
//   storage.from().getPublicUrl
// Adding a new supabase.* call site means adding it here too, or the mock throws
// a clear error rather than failing silently.

// ── Minimal shapes ────────────────────────────────────────────────────────────
// Structurally compatible with the fields our call sites read, so the mock can be
// swapped in behind the same import without changing consumer code.
interface MockUser {
    id: string;
    email: string;
    user_metadata: {
        full_name?: string;
        name?: string;
        picture?: string | null;
        avatar_url?: string | null;
        email_verified?: boolean;
    };
}

interface MockSession {
    user: MockUser;
    access_token: string;
}

type AuthEvent = "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED";
type AuthCallback = (event: AuthEvent, session: MockSession | null) => void;

// The identity the fake Google flow returns. This email is what gets POSTed to
// the real BE (/User/google-login), so it must be a user the BE actually knows —
// override via VITE_MOCK_GOOGLE_EMAIL when testing a different account.
const MOCK_EMAIL = import.meta.env.VITE_MOCK_GOOGLE_EMAIL || "mentor.demo@habitevolve.dev";
const MOCK_NAME = import.meta.env.VITE_MOCK_GOOGLE_NAME || "Demo Mentor";

const SESSION_KEY = "mock_supabase_session";

const buildSession = (): MockSession => ({
    access_token: "mock-access-token",
    user: {
        id: "mock-user-0001",
        email: MOCK_EMAIL,
        user_metadata: {
            full_name: MOCK_NAME,
            name: MOCK_NAME,
            picture: null,
            avatar_url: null,
            email_verified: true,
        },
    },
});

const readSession = (): MockSession | null => {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        return raw ? (JSON.parse(raw) as MockSession) : null;
    } catch {
        return null;
    }
};

// ── Listener registry ─────────────────────────────────────────────────────────
const listeners = new Set<AuthCallback>();

const emit = (event: AuthEvent, session: MockSession | null): void => {
    // Async to match the real client: AuthContext's SIGNED_IN handler calls
    // setState, and firing synchronously inside signInWithOAuth would dispatch
    // mid-render on the caller's click handler.
    for (const cb of listeners) {
        setTimeout(() => cb(event, session), 0);
    }
};

const warn = (msg: string): void => {
    console.warn(`[mock-supabase] ${msg}`);
};

// ── auth ──────────────────────────────────────────────────────────────────────
const auth = {
    onAuthStateChange(callback: AuthCallback) {
        listeners.add(callback);

        // The real client replays a restored session shortly after subscribing —
        // this is what makes a page refresh keep you logged in. Mirror it, so the
        // "already have a BE JWT, skip" branch in AuthContext gets exercised too.
        const existing = readSession();
        if (existing) setTimeout(() => callback("SIGNED_IN", existing), 0);

        return {
            data: {
                subscription: {
                    unsubscribe: () => {
                        listeners.delete(callback);
                    },
                },
            },
        };
    },

    // Skips the Google redirect entirely and emits SIGNED_IN in place. AuthContext
    // then calls the real BE with MOCK_EMAIL, so login only succeeds if that user
    // exists server-side — the mock fakes the OAuth hop, not your backend.
    async signInWithOAuth(_options?: unknown) {
        void _options;
        warn(`signInWithOAuth → faking Google sign-in as ${MOCK_EMAIL} (no redirect)`);
        const session = buildSession();
        try {
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        } catch {
            // Private-mode / quota — the session just won't survive a refresh.
        }
        emit("SIGNED_IN", session);
        return { data: { provider: "google", url: null }, error: null };
    },

    async signOut() {
        localStorage.removeItem(SESSION_KEY);
        emit("SIGNED_OUT", null);
        return { error: null };
    },

    async getSession() {
        return { data: { session: readSession() }, error: null };
    },
};

// ── storage ───────────────────────────────────────────────────────────────────
// Uploads resolve to a local blob URL, so a picked avatar still previews in the
// UI. Blob URLs are per-page-load: they render now but 404 after a refresh, and
// the BE will store a URL it can't resolve. That's expected in mock mode.
const storage = {
    from(bucket: string) {
        const urls = new Map<string, string>();
        return {
            async upload(path: string, file: File, _opts?: unknown) {
                void _opts;
                urls.set(path, URL.createObjectURL(file));
                warn(`storage.upload → ${bucket}/${path} kept in-memory as a blob URL (not persisted)`);
                return { data: { path }, error: null };
            },
            getPublicUrl(path: string) {
                return {
                    data: {
                        publicUrl:
                            urls.get(path) ??
                            `https://mock.supabase.co/storage/v1/object/public/${bucket}/${path}`,
                    },
                };
            },
        };
    },
};

// Anything not implemented above should fail loudly instead of returning
// undefined and surfacing as a confusing "cannot read property of undefined"
// three frames deeper.
export const mockSupabase = new Proxy(
    { auth, storage },
    {
        get(target, prop: string) {
            if (prop in target) return target[prop as keyof typeof target];
            throw new Error(
                `[mock-supabase] supabase.${prop} is not mocked. Add it to src/api/supabaseClient.mock.ts, ` +
                `or set VITE_USE_MOCK_SUPABASE=false to use the real client.`,
            );
        },
    },
);

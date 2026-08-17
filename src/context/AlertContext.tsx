import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, Info, X, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
type AlertVariant = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: string;
  variant: AlertVariant;
  message: string;
  exiting: boolean;
}

export interface AlertContextType {
  success: (message: string) => void;
  error:   (message: string) => void;
  info:    (message: string) => void;
  warning: (message: string) => void;
}

// ── Timings ───────────────────────────────────────────────────────────────────
const VISIBLE_MS = 4000;
const EXIT_MS    = 350;

// ── Variant config ─────────────────────────────────────────────────────────────
// Sky-Pastel (§5). Each variant carries THREE cues, never colour alone: a 3px
// accent rail down the leading edge, a tinted icon chip, and the icon glyph
// itself. `rail` doubles as the icon-chip tint so the two always agree.
// The glyphs are lucide lines drawn in the variant's deep ink — pixel-art
// sprites at 16px turned to mush and clashed with every other icon in the app.
const VARIANT_CFG: Record<AlertVariant, { rail: string; chip: string; ink: string; Icon: LucideIcon }> = {
  // Teal for success — never green (§4).
  success: { rail: "bg-sky-teal",       chip: "bg-sky-teal-bg",  ink: "text-sky-teal",       Icon: Check         },
  error:   { rail: "bg-sky-rose",       chip: "bg-sky-rose/16",  ink: "text-sky-rose-deep",  Icon: XCircle       },
  warning: { rail: "bg-sky-peach-deep", chip: "bg-sky-peach/22", ink: "text-sky-peach-deep", Icon: AlertTriangle },
  info:    { rail: "bg-sky-deep",       chip: "bg-sky-deep/12",  ink: "text-sky-deep",       Icon: Info          },
};

// ── Context ───────────────────────────────────────────────────────────────────
const AlertContext = createContext<AlertContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────
export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    timers.current[id] = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      delete timers.current[id];
    }, EXIT_MS);
  }, []);

  const add = useCallback((variant: AlertVariant, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, variant, message, exiting: false }]);
    timers.current[id] = setTimeout(() => dismiss(id), VISIBLE_MS);
  }, [dismiss]);

  // Clean up all timers on unmount
  useEffect(() => {
    const t = timers.current;
    return () => Object.values(t).forEach(clearTimeout);
  }, []);

  const ctx: AlertContextType = {
    success: msg => add("success", msg),
    error:   msg => add("error",   msg),
    info:    msg => add("info",    msg),
    warning: msg => add("warning", msg),
  };

  return (
    <AlertContext.Provider value={ctx}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          aria-atomic="false"
          className="fixed top-4 right-4 z-[999999] flex flex-col gap-3 pointer-events-none"
          style={{ maxWidth: "380px", width: "calc(100vw - 2rem)" }}
        >
          {toasts.map(toast => {
            const cfg = VARIANT_CFG[toast.variant];
            return (
              <div
                key={toast.id}
                role="alert"
                className={`
                  pointer-events-auto relative overflow-hidden
                  flex items-start gap-3 pl-5 pr-4 py-3.5
                  rounded-sky-md sky-glass-menu
                  ${toast.exiting ? "habit-toast-exit" : "habit-toast-enter"}
                `}
              >
                {/* Accent rail — the primary status cue at a glance */}
                <span
                  className={`absolute left-0 top-0 bottom-0 w-[3px] ${cfg.rail}`}
                  aria-hidden="true"
                />
                <span
                  className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-full ${cfg.chip} ${cfg.ink}`}
                  aria-hidden="true"
                >
                  <cfg.Icon className="w-4 h-4" strokeWidth={2.5} />
                </span>
                <p className="flex-1 pt-1 text-sm font-medium text-sky-ink leading-snug break-words">
                  {toast.message}
                </p>
                <button
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss"
                  className="shrink-0 mt-1 w-5 h-5 flex items-center justify-center rounded-md text-sky-ink-3 hover:bg-sky-ink/8 hover:text-sky-ink transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </AlertContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useAlert = (): AlertContextType => {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlert must be used within <AlertProvider>");
  return ctx;
};

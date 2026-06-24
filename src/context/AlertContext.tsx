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
import { X } from "lucide-react";

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
const VARIANT_CFG: Record<AlertVariant, { bg: string; iconSrc: string }> = {
  success: { bg: "bg-green-400",  iconSrc: "/icon/UI/Checkmark/64px/Checkmark 1st 64px.png" },
  error:   { bg: "bg-red-400",    iconSrc: "/icon/UI/X/64px/X 1st 64px.png"                 },
  warning: { bg: "bg-yellow-400", iconSrc: "/icon/UI/Warning/64px/Warning 1st 64px.png"      },
  info:    { bg: "bg-sky-400",    iconSrc: "/icon/UI/Info/64px/Info 1st 64px.png"            },
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
                  pointer-events-auto
                  flex items-start gap-3 px-4 py-3
                  ${cfg.bg} border-4 border-black rounded-xl
                  shadow-[4px_4px_0_0_#1A1D20]
                  ${toast.exiting ? "habit-toast-exit" : "habit-toast-enter"}
                `}
              >
                <img
                  src={cfg.iconSrc}
                  alt=""
                  className="w-5 h-5 object-contain shrink-0 mt-0.5"
                />
                <p className="flex-1 text-sm font-black text-gray-900 leading-snug break-words">
                  {toast.message}
                </p>
                <button
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss"
                  className="shrink-0 w-5 h-5 flex items-center justify-center rounded-md hover:bg-black/15 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-gray-900" />
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

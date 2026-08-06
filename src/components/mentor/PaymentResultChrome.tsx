/**
 * Shared chrome for the two payment-outcome screens.
 *
 * `PaymentResultPage` (the SePay/VNPay redirect target) and `PaymentCallback`
 * render the same four outcomes — verifying, success, failed, cancelled — and
 * previously carried two independent copies of the layout. They now share this
 * one so the two never drift apart visually.
 *
 * Purely presentational: no routing, no data fetching, no state. Each page keeps
 * its own param resolution and navigation.
 *
 * Colour law: success is TEAL (never green), a declined payment is rose, and a
 * user-initiated cancel is peach — an interruption, not a failure.
 */
import { Gem, Sparkles } from "lucide-react";

/**
 * These screens render outside MentorLayout, so they paint their own mesh
 * background instead of inheriting one.
 */
export const PAYMENT_PAGE = "sky-mesh-bg min-h-screen flex items-center justify-center p-6";

export const paymentEyebrow = "text-[10px] font-semibold text-sky-ink-3 uppercase tracking-[0.16em]";

/** The three outcome accents, so a page picks an intent rather than a colour. */
export const PAYMENT_ACCENTS = {
    success: { rail: "bg-sky-teal", chip: "bg-sky-teal-bg text-sky-teal" },
    failed: { rail: "bg-sky-rose", chip: "bg-sky-rose/16 text-sky-rose-deep" },
    cancelled: {
        rail: "bg-linear-to-r from-sky-peach to-sky-peach-deep",
        chip: "bg-sky-peach/20 text-sky-peach-deep",
    },
} as const;

/** Order reference — identical treatment in every outcome view. */
export const OrderRef = ({ orderId, label = "Ref" }: { orderId: string; label?: string }) => (
    <p className="sky-glass-chip inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-sky-ink-2">
        {label}: <span className="font-mono font-semibold text-sky-ink tabular-nums">{orderId}</span>
    </p>
);

/**
 * One glass slab for every outcome. Only the accent changes — the outcome is
 * carried by the rail, the icon and the copy together, never by hue alone.
 */
export const ResultShell = ({
    accent, rail, icon, kicker, title, children,
}: {
    accent: string;
    rail: string;
    icon: React.ReactNode;
    kicker: string;
    title: string;
    children: React.ReactNode;
}) => (
    <div className={PAYMENT_PAGE}>
        <div className="sky-in sky-glass relative w-full max-w-md rounded-sky-card overflow-hidden p-8 sm:p-10">
            <span className={`absolute inset-x-0 top-0 h-1.5 ${rail}`} />
            <div className="relative flex flex-col items-center gap-6 text-center">
                <span className={`grid place-items-center w-20 h-20 rounded-full ${accent}`}>{icon}</span>
                <div>
                    <p className={`${paymentEyebrow} mb-2`}>{kicker}</p>
                    <h1 className="font-display text-2xl sm:text-3xl font-semibold text-sky-ink tracking-[-0.02em] leading-tight">
                        {title}
                    </h1>
                </div>
                {children}
            </div>
        </div>
    </div>
);

/** Primary CTA — deep gradient, the same weight as a hero button elsewhere. */
export const PrimaryCta = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button
        onClick={onClick}
        className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-sky-chip font-semibold text-sm text-white bg-linear-to-b from-sky-deep-lo to-sky-deep shadow-[0_6px_16px_rgba(36,52,77,0.24)] transition hover:-translate-y-px hover:shadow-[0_10px_22px_rgba(36,52,77,0.30)] active:translate-y-0"
    >
        {children}
    </button>
);

/** Secondary CTA — glass chip, so the safe option never out-shouts the primary. */
export const SecondaryCta = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button
        onClick={onClick}
        className="sky-glass-chip w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-sky-chip font-semibold text-sm text-sky-deep transition hover:-translate-y-px active:translate-y-0"
    >
        {children}
    </button>
);

/**
 * Balance read-out. The payoff of the whole flow, so it gets the display face,
 * the largest type on the page, and tabular figures so it can't shimmer.
 */
export const BalancePanel = ({ label, value }: { label: string; value: number }) => (
    <div className="relative w-full rounded-sky-md border border-white/70 bg-white/55 px-6 py-5 overflow-hidden">
        <Sparkles className="absolute -right-2 -top-2 w-16 h-16 text-sky-peach/18 pointer-events-none" />
        <p className={`relative ${paymentEyebrow} mb-1.5`}>{label}</p>
        <p className="relative flex items-center justify-center gap-2 font-display text-4xl font-semibold tabular-nums text-sky-ink leading-none">
            {value.toLocaleString()}
            <Gem className="w-7 h-7 text-sky-violet-deep" />
        </p>
    </div>
);

/**
 * Shared "waiting on the gateway" view. A slow orbit rather than a bounce —
 * calmer, and it reads as "working" instead of "alarming" while money is in flight.
 */
export const VerifyingView = ({ title, subtitle, hint }: { title: string; subtitle: string; hint?: string }) => (
    <div className={PAYMENT_PAGE}>
        <div className="sky-in w-full max-w-sm flex flex-col items-center gap-7 text-center">
            <div className="relative grid place-items-center w-28 h-28">
                <span className="absolute inset-0 rounded-full border-2 border-sky-deep/15" />
                <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-deep animate-spin [animation-duration:1.6s]" />
                <span className="absolute inset-3 rounded-full bg-sky-violet/10" />
                <Gem className="relative w-9 h-9 text-sky-violet-deep" />
            </div>

            <div className="sky-glass w-full rounded-sky-card p-7">
                <p className={`relative ${paymentEyebrow} mb-2.5`}>{title}</p>
                <h2 className="relative font-display text-xl font-semibold text-sky-ink tracking-[-0.015em] mb-2">
                    {subtitle}
                </h2>
                {hint && <p className="relative text-sm font-medium text-sky-ink-2 mb-5">{hint}</p>}
                <div className="relative flex items-center justify-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                        <span
                            key={i}
                            className="w-2 h-2 rounded-full bg-sky-deep/45 animate-bounce"
                            style={{ animationDelay: `${i * 0.18}s` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    </div>
);

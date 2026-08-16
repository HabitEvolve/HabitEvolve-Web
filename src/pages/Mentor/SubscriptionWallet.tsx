import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
    AlertTriangle,
    ArrowDownLeft,
    ArrowUpRight,
    Bot,
    Check,
    Clock,
    CreditCard,
    FlaskConical,
    Minus,
    Plus,
    RotateCcw,
    ScrollText,
    Sparkles,
    TrendingDown,
    X,
} from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageHeader from "../../components/common/PageHeader";
import Pagination from "../../components/common/SkyPagination";
import mentorApi from "../../api/mentorApi";
import mentorWalletApi, { submitSepayForm } from "../../api/mentorWalletApi";
import { useAlert } from "../../context/AlertContext";
import { useWallet } from "../../context/WalletContext";
import SkyCard from "../../components/ui/card/SkyCard";
import SkyButton from "../../components/ui/button/SkyButton";
import type {
    ActiveSubscriptionDto,
    MentorWalletDto,
    SubscriptionPackageDto,
    PurchaseSubscriptionResultDto,
} from "../../types/mentor.types";
import type { WalletPaymentMethod, GemTransactionDto } from "../../types/mentorWallet.types";

// ── DESIGN TOKENS ───────────────────────────────────────────────────────────────
// Sky-Pastel only — neo-brutalism ink borders/hard shadows retired (see DESIGN.md).
const easeExpo = "ease-[cubic-bezier(0.16,1,0.3,1)]";

const eyebrow = "text-[10px] font-semibold text-sky-ink-3 uppercase tracking-[0.14em]";
const sectionTitle = "font-display text-base font-semibold text-sky-ink";

// The gem is a brand asset shared with the mobile app and the mentor header
// chip, so it stays a PNG rather than becoming a lucide glyph — the currency has
// to read identically in the header and on this page. Centralised here so every
// former call-site sizes it from one place.
const GemIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <img
        src="/icon/Currency/Diamond/64px/Purple Diamond 1st 64px.png"
        alt=""
        aria-hidden="true"
        className={`inline object-contain align-text-bottom ${className}`}
    />
);

// ── PRICING CARD PIECES ───────────────────────────────────────────────────────
// Two rounds of notes, because the first pass fixed the wrong half of the problem.
//
// Round 1 split the flat seven-bullet feature list into QUOTAS (numbers you
// compare) and TRAITS (capabilities you check off). That was right, but it left
// every card weighing exactly the same — three identical rectangles side by
// side. A pricing grid where nothing is heavier than anything else is a spec
// sheet, not an offer: the mentor has to read all three in full before the page
// tells them anything.
//
// So this pass adds emphasis at two scales:
//
//   BETWEEN CARDS — one tier is featured (the mentor's actual next upgrade) and
//                   physically outweighs the others: lifted, violet-ringed,
//                   bigger price, filled CTA. The rest recede to a quiet ghost
//                   treatment so the featured one has something to be louder than.
//   INSIDE A CARD — the quotas were three equal numerals, which is the same
//                   flat-list mistake one level down. Seats-per-party is the
//                   number mentors actually shop on, so it becomes a hero
//                   numeral; parties and quests/day drop to a small inline pair.
//
// Comma-joined API strings ("EASY,NORMAL,HARD") are still split per value.

/** The one number a mentor shops on — oversized, with the unit beside it. */
const QuotaHero = ({ value, caption, big }: { value: number | string; caption: string; big: boolean }) => (
    <div className="flex items-baseline gap-2">
        <span
            className={`font-display font-semibold leading-none tabular-nums text-sky-ink ${big ? "text-[2.5rem]" : "text-[2rem]"
                }`}
        >
            {value}
        </span>
        <span className="text-xs font-semibold leading-tight text-sky-ink-2">{caption}</span>
    </div>
);

/** A supporting quota: figure and caption on one line, deliberately small. */
const QuotaStat = ({ value, caption }: { value: number | string; caption: string }) => (
    <div className="flex min-w-0 items-baseline gap-1.5">
        <span className="font-display text-sm font-semibold tabular-nums text-sky-ink">{value}</span>
        <span className="truncate text-[11px] font-medium text-sky-ink-3">{caption}</span>
    </div>
);

/** A capability group: fixed-width label, then one chip per comma-separated value. */
const TraitRow = ({
    label,
    value,
    tone = "neutral",
    icon,
}: {
    label: string;
    value: string;
    tone?: "neutral" | "violet";
    icon?: ReactNode;
}) => {
    const chip =
        tone === "violet"
            ? "bg-sky-violet/12 text-sky-violet-deep ring-sky-violet/22"
            : "bg-sky-deep/8 text-sky-deep ring-sky-deep/16";
    return (
        <div className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex w-[4.5rem] shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-ink-3">
                {icon}
                {label}
            </span>
            <span className="flex flex-wrap gap-1">
                {value.split(",").map((v) => (
                    <span
                        key={v}
                        className={`rounded-sky-chip px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${chip}`}
                    >
                        {v.trim().replace(/_/g, " ")}
                    </span>
                ))}
            </span>
        </div>
    );
};

/** Hairline rule between card sections — lighter than a border, enough to group. */
const CardRule = () => <div className="relative my-4 h-px bg-sky-ink/8" aria-hidden="true" />;

// ── HELPERS ───────────────────────────────────────────────────────────────────
const getMentorId = () => {
    const id = localStorage.getItem("user_id");
    return id ? parseInt(id, 10) : 0;
};

const Spinner = ({ size = 18 }: { size?: number }) => (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
);

/** Glass notice with an accent rail — the shared shape for the three page banners. */
const Notice = ({
    tone,
    icon,
    children,
    onDismiss,
}: {
    tone: "danger" | "success" | "attention";
    icon: ReactNode;
    children: ReactNode;
    onDismiss?: () => void;
}) => {
    const cfg = {
        danger: { rail: "bg-sky-rose", tint: "bg-sky-rose/8", text: "text-sky-rose-deep" },
        success: { rail: "bg-sky-teal", tint: "bg-sky-teal/10", text: "text-sky-teal" },
        attention: { rail: "bg-sky-peach", tint: "bg-sky-peach/12", text: "text-sky-peach-deep" },
    }[tone];
    return (
        <div className={`relative mb-6 overflow-hidden rounded-sky-chip ring-1 ring-white/70 ${cfg.tint}`}>
            <span className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.rail}`} aria-hidden="true" />
            <div className="flex items-center gap-3 py-3.5 pl-5 pr-3">
                <span className={`shrink-0 ${cfg.text}`}>{icon}</span>
                <p className="flex-1 text-sm font-semibold text-sky-ink">{children}</p>
                {onDismiss && (
                    <button
                        type="button"
                        onClick={onDismiss}
                        aria-label="Dismiss"
                        className={`inline-grid place-items-center w-7 h-7 shrink-0 rounded-sky-chip ${cfg.text} hover:bg-white/60 active:scale-95 transition-all duration-150`}
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
};

// ── SUB-COMPONENTS ────────────────────────────────────────────────────────────
const UsageBar = ({ label, used, max }: { label: string; used: number; max: number }) => {
    const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
    // Consumption is not a good/bad axis at the low end — teal here only means
    // "headroom left". Only ≥90% is a genuine warning, and it carries a glyph and
    // a bolder weight as well as the hue, so the state is never colour-only.
    const critical = pct >= 90;
    const near = pct >= 70 && !critical;
    const fill = critical ? "bg-sky-rose" : near ? "bg-sky-peach" : "bg-sky-teal";
    return (
        <div className="rounded-sky-chip bg-white/45 ring-1 ring-white/70 px-3.5 py-3">
            <div className="flex items-baseline justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-sky-ink truncate">{label}</span>
                <span
                    className={`inline-flex items-center gap-1 font-display text-sm tabular-nums ${critical ? "font-semibold text-sky-rose-deep" : "font-medium text-sky-ink-2"
                        }`}
                >
                    {critical && <AlertTriangle className="w-3.5 h-3.5" />}
                    {used}
                    <span className="text-sky-ink-3">/ {max === 0 ? "∞" : max}</span>
                </span>
            </div>
            <div className="relative h-2.5 rounded-full bg-sky-ink/8 overflow-hidden">
                <div
                    className={`h-full rounded-full ${fill} transition-[width] duration-500 ${easeExpo}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <p className="mt-1.5 text-[10px] font-medium text-sky-ink-3 tabular-nums">
                {Math.round(pct)}%
            </p>
        </div>
    );
};

// ── TRANSACTION LOGBOOK ───────────────────────────────────────────────────────
// Direction is the axis here, not good/bad: credits read teal (money arriving),
// debits rose (leaving), refunds deep (a correction, neither win nor loss).
const TX_META: Record<string, { icon: ReactNode; sign: "+" | "-"; color: string; ring: string }> = {
    TOPUP: {
        icon: <ArrowDownLeft className="w-4 h-4" />,
        sign: "+",
        color: "text-sky-teal",
        ring: "bg-sky-teal-bg text-sky-teal",
    },
    PURCHASE: {
        icon: <ArrowUpRight className="w-4 h-4" />,
        sign: "-",
        color: "text-sky-rose-deep",
        ring: "bg-sky-rose/14 text-sky-rose-deep",
    },
    REFUND: {
        icon: <RotateCcw className="w-4 h-4" />,
        sign: "+",
        color: "text-sky-deep",
        ring: "bg-sky-deep/12 text-sky-deep",
    },
};

const TX_STATUS_META: Record<string, { cls: string; icon: ReactNode }> = {
    Completed: { cls: "sky-badge-success", icon: <Check className="w-3 h-3" /> },
    Pending: { cls: "sky-badge-pending", icon: <Clock className="w-3 h-3" /> },
    Cancelled: { cls: "sky-badge-neutral", icon: <X className="w-3 h-3" /> },
};

const TransactionLogbook = ({
    transactions,
    loading,
    error,
}: {
    transactions: GemTransactionDto[];
    loading: boolean;
    error: string | null;
}) => {
    const { t } = useTranslation();

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-3 py-14 text-sky-ink-3">
                <Spinner size={22} />
                <span className="font-semibold text-sm">{t("mentor.subscriptionWallet.loadingTransactions", "Loading logbook…")}</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="relative overflow-hidden rounded-sky-chip bg-sky-rose/8 ring-1 ring-white/70 py-9 text-center">
                <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" aria-hidden="true" />
                <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-sky-rose-deep" />
                <p className="text-sm font-semibold text-sky-ink">{error}</p>
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="rounded-sky-chip bg-white/45 ring-1 ring-white/70 py-14 text-center">
                <span className="inline-grid place-items-center w-11 h-11 mb-3 rounded-full bg-sky-3/40 text-sky-ink-3">
                    <ScrollText className="w-5 h-5" />
                </span>
                <p className={sectionTitle}>{t("mentor.subscriptionWallet.noTransactions", "The logbook is empty")}</p>
                <p className="text-sm text-sky-ink-3 font-medium mt-1">{t("mentor.subscriptionWallet.noTransactionsHint", "Top up or purchase a plan and it'll show up here.")}</p>
            </div>
        );
    }

    return (
        <div>
            {transactions.map((tx, i) => {
                const meta = TX_META[tx.type] ?? TX_META.TOPUP;
                const status = TX_STATUS_META[tx.status] ?? TX_STATUS_META.Pending;
                const isLast = i === transactions.length - 1;
                return (
                    <div
                        key={tx.gemTransactionId}
                        className={`group flex gap-4 py-3.5 px-2 -mx-2 rounded-sky-chip transition-colors duration-150 hover:bg-white/55 ${isLast ? "" : "border-b border-sky-ink/8"
                            }`}
                    >
                        <span className={`inline-grid place-items-center w-10 h-10 rounded-full shrink-0 ring-1 ring-white/70 ${meta.ring}`}>
                            {meta.icon}
                        </span>
                        <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="font-semibold text-sm text-sky-ink truncate">
                                    {tx.description || tx.type}
                                </p>
                                <p className="text-xs text-sky-ink-2 font-medium mt-0.5 tabular-nums">
                                    {new Date(tx.createdAt).toLocaleString()}
                                    {tx.reference && <span className="ml-1.5 text-sky-ink-3">· {tx.reference}</span>}
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className={`font-display text-sm font-semibold tabular-nums ${meta.color}`}>
                                    {meta.sign}{tx.gemAmount.toLocaleString()}
                                    <GemIcon className="w-3.5 h-3.5 ml-1" />
                                </p>
                                <span className={`sky-badge ${status.cls} mt-1`}>
                                    {status.icon}
                                    {tx.status}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ── PURCHASE MODAL ────────────────────────────────────────────────────────────
interface PurchaseModalProps {
    pkg: SubscriptionPackageDto;
    onClose: () => void;
    onSuccess: (result: PurchaseSubscriptionResultDto) => void;
}

const PurchaseModal = ({ pkg, onClose, onSuccess }: PurchaseModalProps) => {
    const { t } = useTranslation();
    const alert = useAlert();
    const [loading, setLoading] = useState(false);

    const handlePurchase = async () => {
        setLoading(true);
        try {
            const res = await mentorApi.purchaseSubscription({
                mentorUserId: getMentorId(),
                packageId: pkg.packageId,
                billingCycle: "MONTHLY",
                paymentMethod: "DEMO",
            });
            if (res.success && res.data) {
                onSuccess(res.data);
            } else {
                alert.error(res.message || t("mentor.subscriptionWallet.purchaseFailed"));
            }
        } catch (e: any) {
            alert.error(e?.response?.data?.message || t("mentor.subscriptionWallet.unexpectedError"));
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div
            className="modal-content fixed inset-0 z-99999 flex items-center justify-center p-4 bg-sky-ink/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <SkyCard
                variant="mentor"
                className="w-full max-w-md sky-in"
                onClick={(e) => e.stopPropagation()}
            >
                <p className={`relative ${eyebrow}`}>{t("mentor.subscriptionWallet.availablePlans")}</p>
                <h2 className="relative font-display text-sky-h2 font-semibold text-sky-ink mt-1">{pkg.name}</h2>
                <p className="relative text-sky-body text-sky-ink-2 mb-4">{pkg.description}</p>

                <div className="relative rounded-sky-chip bg-white/50 ring-1 ring-white/70 p-4 mb-4 space-y-2">
                    {[
                        [t("mentor.subscriptionWallet.maxParties"), `${pkg.maxParties}`, null],
                        [t("mentor.subscriptionWallet.maxMembers"), `${pkg.maxMembersPerParty}`, null],
                        [t("mentor.subscriptionWallet.questsPerMember"), `${pkg.questsPerMemberPerDay}`, null],
                        [t("mentor.subscriptionWallet.partyQuestsPerWeek"), `${pkg.partyQuestsPerWeek}`, null],
                        [t("mentor.subscriptionWallet.bossModes"), pkg.bossModes, null],
                        ["Proof Types", pkg.proofTypes || "—", null],
                        ["AI Verification", pkg.aiVerificationBossModes ? "Included" : "Not included", <Bot key="bot" className="w-3.5 h-3.5 text-sky-violet-deep" />],
                        [t("mentor.subscriptionWallet.duration"), `${pkg.durationDays} ${t("mentor.subscriptionWallet.days")}`, null],
                    ].map(([k, v, icon]) => (
                        <div key={k as string} className="flex justify-between gap-3 text-sm font-medium">
                            <span className="inline-flex items-center gap-1.5 text-sky-ink-2">
                                {icon as ReactNode}
                                {k as string}
                            </span>
                            <span className="font-semibold text-sky-ink text-right tabular-nums">{v as string}</span>
                        </div>
                    ))}
                </div>

                <div className="relative flex items-center justify-between mb-4">
                    <span className="text-sky-small text-sky-ink-2 font-medium">{t("mentor.subscriptionWallet.cost")}</span>
                    <span className="font-display text-sky-h2 font-semibold text-sky-peach-deep tabular-nums">
                        {pkg.price.toLocaleString()} <GemIcon className="w-5 h-5" />
                    </span>
                </div>

                <div className="relative flex gap-3">
                    <SkyButton type="button" variant="secondary" onClick={onClose} className="flex-1">
                        {t("mentor.subscriptionWallet.cancel")}
                    </SkyButton>
                    <SkyButton type="button" variant="primary" onClick={handlePurchase} disabled={loading} className="flex-1">
                        {loading ? <><Spinner size={14} /> {t("mentor.subscriptionWallet.processing")}</> : t("mentor.subscriptionWallet.purchaseDemo")}
                    </SkyButton>
                </div>
            </SkyCard>
        </div>,
        document.body
    );
};

// ── GEM STORE MODAL ───────────────────────────────────────────────────────────
// Tier hues are a product axis, not a status one — peach for the popular tier,
// violet (epic) for the top tier. Neither borrows teal/rose.
const GEM_PACKAGES = [
    { gems: 5000, label: "Guild", face: "bg-sky-peach/16", accent: "text-sky-peach-deep", badge: "POPULAR" },
    { gems: 10000, label: "Legend", face: "bg-sky-violet/14", accent: "text-sky-violet-deep", badge: "BEST VALUE" },
] as const;

type GemPackage = typeof GEM_PACKAGES[number];

interface GemStoreModalProps {
    vndPerGem: number;
    onClose: () => void;
    onDemoSuccess: (newBalance: number) => void;
}

const GemStoreModal = ({ vndPerGem, onClose, onDemoSuccess }: GemStoreModalProps) => {
    const { t } = useTranslation();
    const alert = useAlert();
    const [selected, setSelected] = useState<GemPackage | null>(GEM_PACKAGES[0]);
    const [customAmount, setCustomAmount] = useState('');
    const [method, setMethod] = useState<WalletPaymentMethod>('SEPAY');
    const [loading, setLoading] = useState(false);
    const [redirecting, setRedirecting] = useState(false);

    const parsedCustom = parseInt(customAmount, 10);
    const effectiveGems = selected
        ? selected.gems
        : (Number.isFinite(parsedCustom) && parsedCustom > 0 ? parsedCustom : 0);

    const selectPackage = (pkg: GemPackage) => {
        setSelected(pkg);
        setCustomAmount('');
    };

    const handleCustomAmountChange = (value: string) => {
        setCustomAmount(value);
        setSelected(null);
    };

    const handleBuy = async () => {
        if (effectiveGems <= 0) {
            alert.error(t("mentor.subscriptionWallet.enterValidAmount", "Enter a valid gem amount."));
            return;
        }
        setLoading(true);
        let willRedirect = false;
        try {
            const res = await mentorWalletApi.topUpGems({
                mentorUserId: getMentorId(),
                gemAmount: effectiveGems,
                paymentMethod: method,
            });
            if (!res.success || !res.data) {
                alert.error(res.message || t("mentor.subscriptionWallet.topUpFailed"));
                return;
            }
            const data = res.data;
            if (data.requiresPayment && data.checkoutUrl && data.paymentFormFields) {
                willRedirect = true;
                setRedirecting(true);
                // Page navigates away — form submits to SePay, SePay redirects to /checkout/success or /checkout/fail
                submitSepayForm(data.checkoutUrl, data.paymentFormFields);
            } else {
                onDemoSuccess(data.gemsBalance);
            }
        } catch (e: any) {
            alert.error(e?.response?.data?.message || t("mentor.subscriptionWallet.unexpectedError"));
        } finally {
            if (!willRedirect) setLoading(false);
        }
    };

    const vndPrice = (effectiveGems * vndPerGem).toLocaleString();

    return createPortal(
        <div
            className="modal-content fixed inset-0 z-99999 flex items-center justify-center p-4 bg-sky-ink/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <SkyCard
                variant="mentor"
                className="w-full max-w-lg overflow-hidden sky-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Redirecting overlay — shown while SePay form is submitting */}
                {redirecting && (
                    <div className="absolute inset-0 bg-white/95 rounded-sky-card flex flex-col items-center justify-center gap-4 z-10">
                        <Spinner size={40} />
                        <p className="font-display text-xl font-semibold text-sky-ink">{t("mentor.subscriptionWallet.connectingSepay")}</p>
                        <p className="text-sm text-sky-ink-2 text-center max-w-xs font-medium">
                            {t("mentor.subscriptionWallet.redirectingPayment")}
                        </p>
                    </div>
                )}

                {/* Header */}
                <div className="relative flex items-start justify-between gap-3 mb-1">
                    <div>
                        <p className={eyebrow}>{t("mentor.subscriptionWallet.gemWallet")}</p>
                        <h2 className="font-display text-sky-h2 font-semibold text-sky-ink flex items-center gap-2 mt-0.5">
                            <GemIcon className="w-7 h-7" />
                            {t("mentor.subscriptionWallet.gemStore")}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t("mentor.subscriptionWallet.cancel")}
                        className="inline-grid place-items-center w-8 h-8 shrink-0 rounded-sky-chip text-sky-ink-2 hover:bg-white/70 hover:text-sky-ink active:scale-95 transition-all duration-150"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <p className="relative text-sky-small text-sky-ink-2 font-medium mb-5 tabular-nums">
                    Rate: 1 <GemIcon className="w-3.5 h-3.5" /> = {vndPerGem.toLocaleString()} VND
                </p>

                {/* Package grid — selection control, not a CTA: kept as a custom toggle
                    rather than SkyButton so the selected-state ring stays legible. */}
                <div className="relative grid grid-cols-2 gap-3 mb-3">
                    {GEM_PACKAGES.map((pkg) => {
                        const isSelected = selected?.gems === pkg.gems;
                        return (
                            <button
                                type="button"
                                key={pkg.gems}
                                aria-pressed={isSelected}
                                onClick={() => selectPackage(pkg)}
                                className={`relative text-left p-4 rounded-sky-chip ${pkg.face} transition-all duration-150 ${easeExpo} motion-safe:hover:-translate-y-px ${isSelected
                                        ? "ring-2 ring-sky-deep shadow-sky-chip"
                                        : "ring-1 ring-white/70 hover:ring-sky-deep/35"
                                    }`}
                            >
                                {/* Selection is not colour-only: the ring is joined by a tick. */}
                                {isSelected && (
                                    <span className="absolute -top-1.5 -left-1.5 inline-grid place-items-center w-5 h-5 rounded-full bg-sky-deep text-white shadow-sky-chip">
                                        <Check className="w-3 h-3" />
                                    </span>
                                )}
                                {pkg.badge && (
                                    <span className={`absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] rounded-full bg-white/75 ${pkg.accent}`}>
                                        {pkg.badge}
                                    </span>
                                )}
                                <div className="font-display text-3xl font-semibold text-sky-ink tabular-nums">
                                    {pkg.gems.toLocaleString()}
                                    <GemIcon className="w-6 h-6 ml-1" />
                                </div>
                                <div className={`text-xs font-semibold mt-0.5 ${pkg.accent}`}>{pkg.label}</div>
                                <div className="text-sm font-semibold text-sky-ink mt-1 tabular-nums">
                                    {(pkg.gems * vndPerGem).toLocaleString()} VND
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Custom amount */}
                <div className="relative mb-5">
                    <label className={`${eyebrow} block mb-1.5`}>
                        {t("mentor.subscriptionWallet.customAmount", "Or enter a custom amount")}
                    </label>
                    <div
                        className={`relative rounded-sky-chip bg-white/60 transition-all duration-150 ${!selected && customAmount
                                ? "ring-2 ring-sky-deep shadow-sky-chip"
                                : "ring-1 ring-white/80"
                            }`}
                    >
                        <input
                            type="number"
                            min={1}
                            inputMode="numeric"
                            value={customAmount}
                            onChange={(e) => handleCustomAmountChange(e.target.value)}
                            placeholder={t("mentor.subscriptionWallet.customAmountPlaceholder", "e.g. 2500")}
                            className="w-full px-4 py-3 pr-11 rounded-sky-chip bg-transparent font-display text-lg font-semibold text-sky-ink tabular-nums focus:outline-none placeholder:text-sky-ink-3 placeholder:font-medium placeholder:text-base"
                        />
                        <GemIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" />
                    </div>
                    {!selected && parsedCustom > 0 && (
                        <p className="text-xs font-semibold text-sky-ink-2 mt-1.5 tabular-nums">
                            = {(parsedCustom * vndPerGem).toLocaleString()} VND
                        </p>
                    )}
                </div>

                {/* Payment method toggle — segmented control, same reasoning as the
                    package grid above: custom, not SkyButton. */}
                <div className="relative flex gap-2 mb-5">
                    {(['SEPAY', 'DEMO'] as WalletPaymentMethod[]).map((m) => {
                        const isOn = method === m;
                        return (
                            <button
                                type="button"
                                key={m}
                                aria-pressed={isOn}
                                onClick={() => setMethod(m)}
                                className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-full font-semibold text-xs transition-all duration-150 ${easeExpo} ${isOn
                                        ? "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-chip"
                                        : "sky-glass-chip text-sky-ink-2 hover:text-sky-ink motion-safe:hover:-translate-y-px"
                                    }`}
                            >
                                {m === 'SEPAY' ? <CreditCard className="w-3.5 h-3.5" /> : <FlaskConical className="w-3.5 h-3.5" />}
                                {m === 'SEPAY' ? 'SePay (Real)' : 'DEMO (Dev)'}
                            </button>
                        );
                    })}
                </div>

                {/* Buy button */}
                <div className="relative flex gap-3">
                    <SkyButton type="button" variant="secondary" onClick={onClose} className="flex-1">
                        {t("mentor.subscriptionWallet.cancel")}
                    </SkyButton>
                    <SkyButton
                        type="button"
                        variant="primary"
                        onClick={handleBuy}
                        disabled={loading || effectiveGems <= 0}
                        className="flex-1"
                    >
                        {loading
                            ? <><Spinner size={14} /> {t("mentor.subscriptionWallet.processing")}</>
                            : effectiveGems > 0
                                ? <>{t("mentor.subscriptionWallet.buy")} {effectiveGems.toLocaleString()} <GemIcon className="w-4 h-4" /> — {vndPrice} VND</>
                                : t("mentor.subscriptionWallet.enterValidAmount", "Enter a valid gem amount.")
                        }
                    </SkyButton>
                </div>
            </SkyCard>
        </div>,
        document.body
    );
};

// ── CANCEL SUBSCRIPTION MODAL ────────────────────────────────────────────────
interface CancelSubModalProps {
    subscriptionId: number;
    planName: string;
    onClose: () => void;
    onSuccess: () => void;
}

const CancelSubModal = ({ subscriptionId, planName, onClose, onSuccess }: CancelSubModalProps) => {
    const { t } = useTranslation();
    const alert = useAlert();
    const [loading, setLoading] = useState(false);

    const handleConfirmCancel = async () => {
        setLoading(true);
        try {
            const res = await mentorApi.cancelSubscription(subscriptionId);
            if (res.success) {
                onSuccess();
            } else {
                alert.error(res.message || t("mentor.subscriptionWallet.cancellationFailed"));
            }
        } catch (e: any) {
            alert.error(e?.response?.data?.message || t("mentor.subscriptionWallet.unexpectedError"));
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div
            className="modal-content fixed inset-0 z-99999 flex items-center justify-center p-4 bg-sky-ink/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <SkyCard
                variant="mentor"
                className="w-full max-w-md sky-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative flex items-center gap-3 mb-5">
                    <div className="inline-grid place-items-center w-12 h-12 shrink-0 rounded-sky-chip bg-sky-rose/14 ring-1 ring-sky-rose/30 text-sky-rose-deep">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="font-display text-sky-h3 font-semibold text-sky-ink leading-tight">{t("mentor.subscriptionWallet.cancelSubTitle")}</h2>
                        <p className="text-xs text-sky-ink-2 font-medium mt-0.5 truncate">
                            {t("mentor.subscriptionWallet.currentPlan")}: <strong className="text-sky-ink font-semibold">{planName}</strong>
                        </p>
                    </div>
                </div>

                {/* Downgrade warning */}
                <div className="relative overflow-hidden rounded-sky-chip bg-sky-rose/8 ring-1 ring-white/70 p-4 pl-5 mb-5 space-y-3">
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" aria-hidden="true" />
                    <p className="text-sm font-semibold text-sky-ink">
                        {t("mentor.subscriptionWallet.cancelWarning", { freeTier: t("mentor.subscriptionWallet.freeTier") })}
                    </p>
                    <ul className="space-y-1.5">
                        {[
                            t("mentor.subscriptionWallet.cancelLimit1"),
                            t("mentor.subscriptionWallet.cancelLimit2"),
                            t("mentor.subscriptionWallet.cancelLimit3"),
                        ].map((item) => (
                            <li key={item} className="flex items-center gap-2 text-xs font-medium text-sky-ink-2">
                                <span className="inline-grid place-items-center w-4 h-4 shrink-0 rounded-full bg-sky-rose/18 text-sky-rose-deep">
                                    <TrendingDown className="w-2.5 h-2.5" />
                                </span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="relative flex gap-3">
                    {/* "Safe" choice always on the left */}
                    <SkyButton type="button" variant="secondary" onClick={onClose} disabled={loading} className="flex-1">
                        {t("mentor.subscriptionWallet.keepPlan")}
                    </SkyButton>
                    <SkyButton type="button" variant="destructive" onClick={handleConfirmCancel} disabled={loading} className="flex-1">
                        {loading ? <><Spinner size={14} /> {t("mentor.subscriptionWallet.cancelling")}</> : t("mentor.subscriptionWallet.yesCancelIt")}
                    </SkyButton>
                </div>
            </SkyCard>
        </div>,
        document.body
    );
};

// ── PAGE ──────────────────────────────────────────────────────────────────────
export default function SubscriptionWallet() {
    const { t } = useTranslation();
    const { refetchWallet } = useWallet();
    const [wallet, setWallet] = useState<MentorWalletDto | null>(null);
    const [activeSub, setActiveSub] = useState<ActiveSubscriptionDto | null>(null);
    const [packages, setPackages] = useState<SubscriptionPackageDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [purchasePkg, setPurchasePkg] = useState<SubscriptionPackageDto | null>(null);
    const [showTopUp, setShowTopUp] = useState(false);
    const [showCancel, setShowCancel] = useState(false);
    const [purchaseResult, setPurchaseResult] = useState<PurchaseSubscriptionResultDto | null>(null);
    const [cancelSuccess, setCancelSuccess] = useState(false);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [walletRes, subRes, pkgRes] = await Promise.all([
                mentorApi.getWallet(),
                mentorApi.getActiveSubscription(),
                mentorApi.getSubscriptionPackages(),
            ]);
            if (walletRes.success) setWallet(walletRes.data ?? null);
            if (subRes.success) setActiveSub(subRes.data ?? null);
            if (pkgRes.success) setPackages((pkgRes.data ?? []).filter((p) => p.isActive));
        } catch (e: any) {
            setError(e?.response?.data?.message || t("mentor.subscriptionWallet.failedToLoad"));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Which tier the grid should shout about. A pricing grid needs one card that
    // outweighs the others, and the honest candidate is the mentor's next step
    // up — the cheapest plan that costs more than what they're on (or, on the
    // free default, the cheapest paid plan). Falls back to the priciest tier when
    // they're already at the top, so the featured slot is never empty and never
    // lands on the plan they already own. Pure derivation from state already
    // fetched — no new request, no change to what's purchasable.
    const featuredPkgId = useMemo(() => {
        if (packages.length === 0) return null;
        const currentPrice = activeSub?.isDefaultFree ? 0 : (activeSub?.package.price ?? 0);
        const currentId = activeSub?.package.packageId;
        const upgrades = packages
            .filter((p) => p.packageId !== currentId && p.price > currentPrice)
            .sort((a, b) => a.price - b.price);
        if (upgrades.length > 0) return upgrades[0].packageId;
        const priciest = [...packages].sort((a, b) => b.price - a.price)[0];
        return priciest.packageId === currentId ? null : priciest.packageId;
    }, [packages, activeSub]);

    // ── TRANSACTION LOGBOOK — additive, wired to the already-implemented
    // GET /mentor/wallet/transactions endpoint (not previously called by this page).
    const [transactions, setTransactions] = useState<GemTransactionDto[]>([]);
    const [loadingTx, setLoadingTx] = useState(true);
    const [txError, setTxError] = useState<string | null>(null);

    const fetchTransactions = useCallback(async () => {
        setLoadingTx(true);
        setTxError(null);
        try {
            const res = await mentorWalletApi.getTransactions();
            if (res.success && res.data) setTransactions(res.data);
            else setTxError(res.message || t("mentor.subscriptionWallet.failedToLoad"));
        } catch (e: any) {
            setTxError(e?.response?.data?.message || t("mentor.subscriptionWallet.failedToLoad"));
        } finally {
            setLoadingTx(false);
        }
    }, [t]);

    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

    // Client-side pagination — GET /mentor/wallet/transactions doesn't accept
    // pageNumber/pageSize on the BE (unlike the Admin list endpoints), so there's no
    // server-side page to request. Paginating the already-fetched list locally still
    // gets the same standardized <Pagination /> UI without inventing BE support that
    // doesn't exist.
    const TX_PAGE_SIZE = 8;
    const [txPage, setTxPage] = useState(1);
    const txTotalPages = Math.max(1, Math.ceil(transactions.length / TX_PAGE_SIZE));
    const pagedTransactions = transactions.slice((txPage - 1) * TX_PAGE_SIZE, txPage * TX_PAGE_SIZE);
    useEffect(() => {
        if (txPage > txTotalPages) setTxPage(txTotalPages);
    }, [txPage, txTotalPages]);

    const handlePurchaseSuccess = (result: PurchaseSubscriptionResultDto) => {
        setPurchasePkg(null);
        setPurchaseResult(result);
        fetchAll();
        refetchWallet(); // purchase spends gems — keep the header chip in sync
    };

    const handleCancelSuccess = () => {
        setShowCancel(false);
        setCancelSuccess(true);
        fetchAll(); // re-fetch everything so usage bars + plan card reset to FREE tier
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-sky-deep">
                <Spinner size={40} />
            </div>
        );
    }

    const usage = activeSub?.usage;
    const plan = activeSub?.package;
    // Only show Cancel when the mentor has a real paid subscription that is currently active
    const canCancel = !activeSub?.isDefaultFree && (activeSub?.subscription?.isCurrentlyActive ?? false);

    return (
        <>
            <PageMeta title="Subscription & Wallet — HabitEvolve" description="Manage your plan and gems" />
            <PageBreadcrumb pageTitle={t("mentor.subscriptionWallet.pageTitle")} />

            <PageHeader
                className="mb-6"
                icon={<CreditCard className="w-6 h-6" strokeWidth={2.1} aria-hidden="true" />}
                tone="violet"
                title={t("mentor.subscriptionWallet.pageTitle")}
                description="Manage your plan and gems."
            />

            {error && (
                <Notice tone="danger" icon={<AlertTriangle className="w-5 h-5" />}>
                    {error}
                </Notice>
            )}

            {purchaseResult && (
                <Notice
                    tone="success"
                    icon={<Check className="w-5 h-5" />}
                    onDismiss={() => setPurchaseResult(null)}
                >
                    {t("mentor.subscriptionWallet.purchaseSuccessful", { plan: purchaseResult.subscription.packageName })}
                </Notice>
            )}

            {cancelSuccess && (
                <Notice
                    tone="attention"
                    icon={<TrendingDown className="w-5 h-5" />}
                    onDismiss={() => setCancelSuccess(false)}
                >
                    {t("mentor.subscriptionWallet.cancelledDowngrade")}
                </Notice>
            )}

            {/* Top Row: Gems Resource Container | Plan + Usage */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 sky-stagger">
                {/* ── Resource Container: Gems ──────────────────────────────── */}
                <SkyCard variant="mentor" className="flex flex-col gap-3">
                    <div className="relative w-full flex items-center justify-between">
                        <span className="sky-glass-chip inline-grid place-items-center w-10 h-10 shrink-0">
                            <GemIcon className="w-6 h-6" />
                        </span>
                        <SkyButton
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => setShowTopUp(true)}
                        >
                            <Plus className="w-3.5 h-3.5" /> {t("mentor.subscriptionWallet.topUp")}
                        </SkyButton>
                    </div>
                    {/* The balance is the loudest number on the page — everything
                        around it stays quiet so it can be. */}
                    <div className="relative mt-auto">
                        <p className={eyebrow}>{t("mentor.subscriptionWallet.gemWallet")}</p>
                        <div className="font-display text-5xl font-semibold text-sky-peach-deep leading-none tabular-nums mt-1.5">
                            {wallet ? wallet.gemsBalance.toLocaleString() : "—"}
                        </div>
                        {wallet && (
                            <p className="text-sky-small text-sky-ink-2 font-medium mt-2 tabular-nums">
                                Rate: 1 <GemIcon className="w-3.5 h-3.5" /> = {wallet.vndPerGem.toLocaleString()} VND
                            </p>
                        )}
                    </div>
                </SkyCard>

                {/* Current Plan + Usage — merged into one card spanning the remaining 2 columns */}
                <SkyCard variant="mentor" className="md:col-span-2 flex flex-col gap-4">
                    {/* Plan header: info on the left, Cancel pinned to the top-right */}
                    <div className="relative flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <p className={eyebrow}>{t("mentor.subscriptionWallet.currentPlan")}</p>
                            {plan ? (
                                <>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-display text-2xl font-semibold text-sky-ink">{plan.name}</span>
                                        {activeSub?.isDefaultFree && (
                                            <span className="sky-badge sky-badge-neutral">
                                                FREE
                                            </span>
                                        )}
                                        {activeSub?.subscription?.isCurrentlyActive && !activeSub.isDefaultFree && (
                                            <span className="sky-badge sky-badge-success">
                                                <Check className="w-3 h-3" />
                                                ACTIVE
                                            </span>
                                        )}
                                    </div>
                                    {activeSub?.subscription?.expiresAt && (
                                        <p className="inline-flex items-center gap-1.5 text-xs text-sky-ink-2 font-medium tabular-nums">
                                            <Clock className="w-3.5 h-3.5 text-sky-ink-3" />
                                            {t("mentor.subscriptionWallet.expires")}: {new Date(activeSub.subscription.expiresAt).toLocaleDateString()}
                                        </p>
                                    )}
                                    {plan.description && (
                                        <p className="text-xs text-sky-ink-2 font-medium">{plan.description}</p>
                                    )}
                                </>
                            ) : (
                                <p className="text-sky-ink-3 font-medium text-sm">{t("mentor.subscriptionWallet.noPlan")}</p>
                            )}
                        </div>
                        {/* Cancel — only for active paid subscriptions */}
                        {canCancel && (
                            <SkyButton
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => setShowCancel(true)}
                                className="shrink-0"
                            >
                                {t("mentor.subscriptionWallet.cancelSubscription")}
                            </SkyButton>
                        )}
                    </div>

                    <div className="relative border-t border-sky-ink/8" />

                    {/* Usage section */}
                    <div className="relative">
                        <p className={`${eyebrow} mb-3`}>
                            {t("mentor.subscriptionWallet.usageThisPeriod")}
                        </p>
                        {usage ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <UsageBar label={t("mentor.subscriptionWallet.usageParties")} used={usage.partiesUsed} max={usage.maxParties} />
                                <UsageBar label={t("mentor.subscriptionWallet.usageMembers")} used={usage.largestPartyMemberCount} max={usage.maxMembersPerParty} />
                                <UsageBar label={t("mentor.subscriptionWallet.usageQuestsToday")} used={usage.questsAssignedToday} max={usage.questsPerMemberPerDay} />
                                <UsageBar label={t("mentor.subscriptionWallet.usagePartyQuestsWeek")} used={usage.partyQuestsThisWeek} max={usage.partyQuestsPerWeek} />
                            </div>
                        ) : (
                            <p className="text-sky-ink-3 font-medium text-sm">{t("mentor.subscriptionWallet.noUsageData")}</p>
                        )}
                    </div>
                </SkyCard>
            </div>

            {/* ── Transaction Logbook ────────────────────────────────────────── */}
            <SkyCard variant="mentor" className="mb-8">
                <h2 className={`relative flex items-center gap-2 ${sectionTitle}`}>
                    <span className="inline-grid place-items-center w-7 h-7 rounded-full bg-sky-deep/12 text-sky-deep">
                        <ScrollText className="w-4 h-4" />
                    </span>
                    {t("mentor.subscriptionWallet.transactionLog", "Logbook")}
                </h2>
                <p className="relative text-sky-small text-sky-ink-2 font-medium mb-4 mt-1">
                    {t("mentor.subscriptionWallet.transactionLogHint", "Every top-up and purchase, in order.")}
                </p>
                <div className="relative">
                    <TransactionLogbook transactions={pagedTransactions} loading={loadingTx} error={txError} />
                    {!loadingTx && !txError && transactions.length > 0 && (
                        <Pagination currentPage={txPage} totalPages={txTotalPages} onPageChange={setTxPage} />
                    )}
                </div>
            </SkyCard>

            {/* Available Packages */}
            <div>
                {/* Eyebrow was "Gem Store", which belongs to the top-up modal, not to a
                    list of plans — it told the mentor they were somewhere they weren't. */}
                <p className={eyebrow}>{t("mentor.subscriptionWallet.plansEyebrow")}</p>
                <h2 className="font-display text-sky-h2 font-semibold text-sky-ink mt-1">{t("mentor.subscriptionWallet.availablePlans")}</h2>
                <p className="mb-8 mt-1 text-sky-small font-medium text-sky-ink-2">
                    {t("mentor.subscriptionWallet.plansHint")}
                </p>
                {/* items-stretch keeps all three the same height so the grid stays
                    tidy; the featured card then breaks out of that row with -my-3,
                    growing equally above and below. Doing it with negative margin
                    rather than align-end is deliberate — the cards carry h-full, and
                    height:100% resolves against the full grid area, so align-end
                    would have been silently cancelled. */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch sky-stagger">
                    {packages.map((pkg) => {
                        const isCurrent = activeSub?.package.packageId === pkg.packageId;
                        const isFeatured = !isCurrent && pkg.packageId === featuredPkgId;
                        return (
                            <SkyCard
                                key={pkg.packageId}
                                variant="mentor"
                                className={`relative flex h-full flex-col overflow-hidden transition-all duration-200 ${easeExpo} motion-safe:hover:-translate-y-0.5 ${isFeatured
                                        ? // The featured tier physically outweighs its neighbours:
                                        // taller box, violet ring, deeper shadow — a lift that
                                        // survives at rest rather than only on hover.
                                        "z-10 ring-2 ring-sky-violet/45 shadow-[0_24px_48px_-20px_rgba(36,52,77,0.34)] sm:-my-3"
                                        : isCurrent
                                            ? "ring-1 ring-sky-teal/35"
                                            : // Unfeatured tiers recede so the featured one has
                                            // something to be louder than.
                                            "ring-1 ring-white/60 opacity-[0.94]"
                                    }`}
                            >
                                {/* Current plan gets three cues: a teal rail, a teal wash
                                    and the badge — never the tint alone. */}
                                {isCurrent && (
                                    <>
                                        <span className="absolute left-0 right-0 top-0 h-1 bg-sky-teal" aria-hidden="true" />
                                        <div className="absolute inset-0 bg-sky-teal/5 pointer-events-none" aria-hidden="true" />
                                    </>
                                )}
                                {/* Featured gets the same three-cue treatment in violet, so
                                    the two states stay distinguishable without relying on
                                    hue alone (DESIGN.md: state is never colour-only). */}
                                {isFeatured && (
                                    <>
                                        <span className="absolute left-0 right-0 top-0 h-1 bg-sky-violet" aria-hidden="true" />
                                        <div className="absolute inset-0 bg-sky-violet/[0.06] pointer-events-none" aria-hidden="true" />
                                    </>
                                )}

                                {/* Status badge — one slot, so the name never has to reserve
                                    room for two. */}
                                {(isCurrent || isFeatured) && (
                                    <span
                                        className={`absolute top-3 right-3 sky-badge ${isCurrent ? "sky-badge-success" : "sky-badge-epic"
                                            }`}
                                    >
                                        {isCurrent ? <Check className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                                        {isCurrent
                                            ? t("mentor.subscriptionWallet.activeBadge")
                                            : t("mentor.subscriptionWallet.recommendedBadge")}
                                    </span>
                                )}

                                {/* Name + blurb. min-h keeps one- and two-line
                                    descriptions from shifting the price line
                                    between cards in the same row. */}
                                <div className="relative pr-24">
                                    <h3
                                        className={`font-display font-semibold text-sky-ink ${isFeatured ? "text-sky-h2" : "text-sky-h3"
                                            }`}
                                    >
                                        {pkg.name}
                                    </h3>
                                    <p className="mt-0.5 min-h-8 text-xs leading-snug text-sky-ink-2">{pkg.description}</p>
                                </div>

                                {/* Price is the decision the card exists to support, so it
                                    is the largest thing on it — and larger still when
                                    featured. */}
                                <div className="relative mt-4 flex items-baseline gap-1.5">
                                    <span
                                        className={`font-display font-semibold leading-none text-sky-peach-deep tabular-nums ${isFeatured ? "text-[2.75rem]" : "text-[2rem]"
                                            }`}
                                    >
                                        {pkg.price.toLocaleString()}
                                    </span>
                                    <GemIcon className={isFeatured ? "w-5 h-5" : "w-4 h-4"} />
                                    <span className="text-xs font-medium text-sky-ink-3">/ {pkg.durationDays}d</span>
                                </div>

                                <CardRule />

                                {/* Quotas. Seats-per-party is the figure mentors actually
                                    shop on, so it gets hero size; parties and quests/day
                                    are supporting detail on one quiet line below. Three
                                    equal numerals was the flat-list mistake one level down. */}
                                <div className="relative">
                                    <QuotaHero
                                        value={pkg.maxMembersPerParty}
                                        caption={t("mentor.subscriptionWallet.membersPerParty")}
                                        big={isFeatured}
                                    />
                                    <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                                        <QuotaStat value={pkg.maxParties} caption={t("mentor.subscriptionWallet.usageParties")} />
                                        <QuotaStat
                                            value={pkg.questsPerMemberPerDay}
                                            caption={t("mentor.subscriptionWallet.questsPerMemberDay")}
                                        />
                                    </div>
                                </div>

                                <CardRule />

                                {/* Traits — what you get, not how much. */}
                                <div className="relative space-y-2">
                                    <TraitRow label={t("mentor.subscriptionWallet.bossModes")} value={pkg.bossModes} />
                                    <TraitRow label={t("mentor.subscriptionWallet.rewardTier")} value={pkg.rewardTier} />
                                    {pkg.proofTypes && <TraitRow label="Proof" value={pkg.proofTypes} />}
                                    {pkg.aiVerificationBossModes ? (
                                        <TraitRow
                                            label="AI"
                                            value="Included"
                                            tone="violet"
                                            icon={<Bot className="w-3 h-3 shrink-0" aria-hidden="true" />}
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2 text-[10px] font-medium text-sky-ink-3">
                                            <span className="inline-flex w-[4.5rem] shrink-0 items-center gap-1 uppercase tracking-[0.08em]">
                                                <Minus className="w-3 h-3 shrink-0" aria-hidden="true" />
                                                AI
                                            </span>
                                            <span>Not included</span>
                                        </div>
                                    )}
                                </div>

                                {/* mt-auto lives on a wrapper, not the button: SkyButton
                                    merges className through twMerge, so mt-auto and mt-6
                                    would collide and one would be dropped. The wrapper
                                    absorbs the flex push, the margin stays a plain gap.
                                    Only the featured card carries a filled CTA — three
                                    primary buttons in a row is three cards asking equally
                                    loudly, which is no ask at all. */}
                                <div className="relative mt-auto pt-6">
                                    <SkyButton
                                        type="button"
                                        variant={isCurrent || !isFeatured ? "secondary" : "primary"}
                                        disabled={isCurrent}
                                        onClick={() => setPurchasePkg(pkg)}
                                        className="w-full"
                                    >
                                        {isCurrent ? t("mentor.subscriptionWallet.currentPlanBtn") : t("mentor.subscriptionWallet.buyUpgrade")}
                                    </SkyButton>
                                </div>
                            </SkyCard>
                        );
                    })}
                    {packages.length === 0 && (
                        // col-span-full, not col-span-3: the grid is 1 column on mobile and
                        // 2 at sm:, so a hardcoded 3 overflowed the row at both sizes.
                        <p className="col-span-full text-sky-ink-3 font-medium text-center py-12">
                            {t("mentor.subscriptionWallet.noPackages")}
                        </p>
                    )}
                </div>
            </div>

            {/* Modals */}
            {purchasePkg && (
                <PurchaseModal
                    pkg={purchasePkg}
                    onClose={() => setPurchasePkg(null)}
                    onSuccess={handlePurchaseSuccess}
                />
            )}
            {showTopUp && wallet && (
                <GemStoreModal
                    vndPerGem={wallet.vndPerGem}
                    onClose={() => setShowTopUp(false)}
                    onDemoSuccess={(newBalance) => {
                        setShowTopUp(false);
                        setWallet((prev) => prev ? { ...prev, gemsBalance: newBalance } : prev);
                        fetchTransactions();
                        refetchWallet(); // gems credited immediately — keep the header chip in sync
                    }}
                />
            )}
            {showCancel && activeSub?.subscription && (
                <CancelSubModal
                    subscriptionId={activeSub.subscription.mentorSubscriptionId}
                    planName={activeSub.package.name}
                    onClose={() => setShowCancel(false)}
                    onSuccess={handleCancelSuccess}
                />
            )}
        </>
    );
}

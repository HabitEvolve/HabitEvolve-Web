import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
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

// ── SUB-COMPONENTS ────────────────────────────────────────────────────────────
const UsageBar = ({ label, used, max }: { label: string; used: number; max: number }) => {
    const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
    const color = pct >= 90 ? "bg-error-500" : pct >= 70 ? "bg-warning-400" : "bg-success-500";
    return (
        <div>
            <div className="flex justify-between text-sky-small font-semibold mb-1.5 text-sky-ink">
                <span>{label}</span>
                <span className={pct >= 90 ? "text-error-600" : "text-sky-ink-2"}>
                    {used} / {max === 0 ? "∞" : max}
                </span>
            </div>
            <div className="h-3.5 bg-sky-3/40 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
};

// ── TRANSACTION LOGBOOK ───────────────────────────────────────────────────────
const TX_META: Record<string, { symbol: string; sign: "+" | "-"; color: string; ring: string }> = {
    TOPUP: { symbol: "↓", sign: "+", color: "text-success-600", ring: "bg-success-100" },
    PURCHASE: { symbol: "↑", sign: "-", color: "text-error-600", ring: "bg-error-100" },
    REFUND: { symbol: "↺", sign: "+", color: "text-brand-600", ring: "bg-brand-100" },
};

const TX_STATUS_STYLES: Record<string, string> = {
    Completed: "bg-success-100 text-success-800",
    Pending: "bg-warning-100 text-warning-800",
    Cancelled: "bg-gray-100 text-gray-600",
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
            <div className="text-center py-10 border border-dashed border-error-300 rounded-sky-chip bg-error-50">
                <p className="text-sm font-semibold text-error-600">{error}</p>
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="text-center py-14 border border-dashed border-sky-ink/15 rounded-sky-chip bg-white/40">
                <p className="font-bold text-sky-ink text-base">{t("mentor.subscriptionWallet.noTransactions", "The logbook is empty")}</p>
                <p className="text-sm text-sky-ink-3 font-medium mt-1">{t("mentor.subscriptionWallet.noTransactionsHint", "Top up or purchase a plan and it'll show up here.")}</p>
            </div>
        );
    }

    return (
        <div>
            {transactions.map((tx, i) => {
                const meta = TX_META[tx.type] ?? TX_META.TOPUP;
                const statusClass = TX_STATUS_STYLES[tx.status] ?? TX_STATUS_STYLES.Pending;
                const isLast = i === transactions.length - 1;
                return (
                    <div
                        key={tx.gemTransactionId}
                        className={`flex gap-4 py-4 ${isLast ? "" : "border-b border-dashed border-sky-ink/15"}`}
                    >
                        <span className={`flex items-center justify-center w-10 h-10 rounded-full border border-sky-surf-border ${meta.ring} font-bold text-lg shrink-0 text-sky-ink`}>
                            {meta.symbol}
                        </span>
                        <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="font-semibold text-sm text-sky-ink truncate">
                                    {tx.description || tx.type}
                                </p>
                                <p className="text-xs text-sky-ink-2 font-medium mt-0.5">
                                    {new Date(tx.createdAt).toLocaleString()}
                                    {tx.reference && <span className="ml-1.5 text-sky-ink-3">· {tx.reference}</span>}
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className={`font-bold text-sm ${meta.color}`}>
                                    {meta.sign}{tx.gemAmount.toLocaleString()}
                                    <img src="/icon/Currency/Diamond/64px/Purple Diamond 1st 64px.png" alt="" className="inline w-3.5 h-3.5 object-contain align-text-bottom ml-1" />
                                </p>
                                <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${statusClass}`}>
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
                className="w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-sky-h2 font-bold text-sky-ink mb-1">{pkg.name}</h2>
                <p className="text-sky-body text-sky-ink-2 mb-4">{pkg.description}</p>

                <div className="bg-sky-3/20 border border-sky-surf-border rounded-sky-chip p-4 mb-4 space-y-2">
                    {[
                        [t("mentor.subscriptionWallet.maxParties"), `${pkg.maxParties}`],
                        [t("mentor.subscriptionWallet.maxMembers"), `${pkg.maxMembersPerParty}`],
                        [t("mentor.subscriptionWallet.questsPerMember"), `${pkg.questsPerMemberPerDay}`],
                        [t("mentor.subscriptionWallet.partyQuestsPerWeek"), `${pkg.partyQuestsPerWeek}`],
                        [t("mentor.subscriptionWallet.bossModes"), pkg.bossModes],
                        ["Proof Types", pkg.proofTypes || "—"],
                        ["🤖 AI Verification", pkg.aiVerificationBossModes || "—"],
                        [t("mentor.subscriptionWallet.duration"), `${pkg.durationDays} ${t("mentor.subscriptionWallet.days")}`],
                    ].map(([k, v]) => (
                        <div key={k} className="flex justify-between text-sm font-medium">
                            <span className="text-sky-ink-2">{k}</span>
                            <span className="font-semibold text-sky-ink">{v}</span>
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-between mb-4">
                    <span className="text-sky-small text-sky-ink-2 font-medium">{t("mentor.subscriptionWallet.cost")}</span>
                    <span className="text-sky-h2 font-bold text-sky-peach-deep">
                        {pkg.price.toLocaleString()} <img src="/icon/Currency/Diamond/64px/Purple Diamond 1st 64px.png" alt="gem" className="inline w-5 h-5 object-contain align-text-bottom" />
                    </span>
                </div>

                <div className="flex gap-3">
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
const GEM_PACKAGES = [
    { gems: 5000,  label: "Guild",  color: "bg-warning-100", badge: "POPULAR" },
    { gems: 10000, label: "Legend", color: "bg-error-100",   badge: "BEST VALUE" },
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
                className="w-full max-w-lg overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Redirecting overlay — shown while SePay form is submitting */}
                {redirecting && (
                    <div className="absolute inset-0 bg-white/95 rounded-sky-card flex flex-col items-center justify-center gap-4 z-10">
                        <Spinner size={40} />
                        <p className="font-bold text-xl text-sky-ink">{t("mentor.subscriptionWallet.connectingSepay")}</p>
                        <p className="text-sm text-sky-ink-2 text-center max-w-xs font-medium">
                            {t("mentor.subscriptionWallet.redirectingPayment")}
                        </p>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-sky-h2 font-bold text-sky-ink flex items-center gap-2"><img src="/icon/Currency/Diamond/64px/Purple Diamond 1st 64px.png" alt="" className="w-7 h-7 object-contain" />{t("mentor.subscriptionWallet.gemStore")}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-sky-ink-2 hover:bg-sky-3/30 hover:text-sky-ink transition-colors text-lg"
                    >
                        ✕
                    </button>
                </div>
                <p className="text-sky-small text-sky-ink-2 font-medium mb-5">
                    Rate: 1 <img src="/icon/Currency/Diamond/64px/Purple Diamond 1st 64px.png" alt="gem" className="inline w-3.5 h-3.5 object-contain align-text-bottom" /> = {vndPerGem.toLocaleString()} VND
                </p>

                {/* Package grid — selection control, not a CTA: kept as a custom toggle
                    rather than SkyButton so the selected-state ring stays legible. */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                    {GEM_PACKAGES.map((pkg) => {
                        const isSelected = selected?.gems === pkg.gems;
                        return (
                            <button
                                type="button"
                                key={pkg.gems}
                                onClick={() => selectPackage(pkg)}
                                className={`relative text-left p-4 rounded-sky-chip transition-all ${pkg.color} ${isSelected
                                    ? "border-2 border-sky-deep shadow-sky-chip"
                                    : "border border-sky-surf-border hover:border-sky-deep/40"
                                }`}
                            >
                                {pkg.badge && (
                                    <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-semibold bg-sky-deep text-white rounded-full">
                                        {pkg.badge}
                                    </span>
                                )}
                                <div className="text-3xl font-extrabold text-sky-ink">
                                    {pkg.gems.toLocaleString()}
                                    <img src="/icon/Currency/Diamond/64px/Purple Diamond 1st 64px.png" alt="" className="inline w-6 h-6 object-contain align-text-bottom ml-1" />
                                </div>
                                <div className="text-xs font-semibold text-sky-ink-2 mt-0.5">{pkg.label}</div>
                                <div className="text-sm font-bold text-sky-ink mt-1">
                                    {(pkg.gems * vndPerGem).toLocaleString()} VND
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Custom amount */}
                <div className="mb-5">
                    <label className="block text-sky-small font-semibold uppercase tracking-wide text-sky-ink-2 mb-1.5">
                        {t("mentor.subscriptionWallet.customAmount", "Or enter a custom amount")}
                    </label>
                    <div
                        className={`relative rounded-sky-chip transition-all ${!selected && customAmount
                            ? "border-2 border-sky-deep shadow-sky-chip"
                            : "border border-sky-surf-border"
                        }`}
                    >
                        <input
                            type="number"
                            min={1}
                            inputMode="numeric"
                            value={customAmount}
                            onChange={(e) => handleCustomAmountChange(e.target.value)}
                            placeholder={t("mentor.subscriptionWallet.customAmountPlaceholder", "e.g. 2500")}
                            className="w-full px-4 py-3 rounded-sky-chip bg-transparent text-sky-ink font-bold text-lg focus:outline-none placeholder:text-sky-ink-3 placeholder:font-medium"
                        />
                        <img src="/icon/Currency/Diamond/64px/Purple Diamond 1st 64px.png" alt="" className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 object-contain pointer-events-none" />
                    </div>
                    {!selected && parsedCustom > 0 && (
                        <p className="text-xs font-semibold text-sky-ink-2 mt-1.5">
                            = {(parsedCustom * vndPerGem).toLocaleString()} VND
                        </p>
                    )}
                </div>

                {/* Payment method toggle — segmented control, same reasoning as the
                    package grid above: custom, not SkyButton. */}
                <div className="flex gap-2 mb-5">
                    {(['SEPAY', 'DEMO'] as WalletPaymentMethod[]).map((m) => (
                        <button
                            type="button"
                            key={m}
                            onClick={() => setMethod(m)}
                            className={`flex-1 py-2 rounded-full border font-semibold text-xs transition-all ${method === m
                                ? "border-sky-deep bg-sky-deep text-white"
                                : "border-sky-surf-border bg-white/60 text-sky-ink-2 hover:border-sky-deep/40"
                            }`}
                        >
                            {m === 'SEPAY' ? '💳 SePay (Real)' : '🧪 DEMO (Dev)'}
                        </button>
                    ))}
                </div>

                {/* Buy button */}
                <div className="flex gap-3">
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
                                ? <>{t("mentor.subscriptionWallet.buy")} {effectiveGems.toLocaleString()} <img src="/icon/Currency/Diamond/64px/Purple Diamond 1st 64px.png" alt="" className="inline w-4 h-4 object-contain align-text-bottom" /> — {vndPrice} VND</>
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
                className="w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 shrink-0 flex items-center justify-center bg-error-100 border border-error-300 rounded-sky-chip text-2xl select-none">
                        ⚠️
                    </div>
                    <div>
                        <h2 className="text-sky-h3 font-bold text-sky-ink leading-tight">{t("mentor.subscriptionWallet.cancelSubTitle")}</h2>
                        <p className="text-xs text-sky-ink-2 font-medium mt-0.5">
                            {t("mentor.subscriptionWallet.currentPlan")}: <strong className="text-sky-ink font-semibold">{planName}</strong>
                        </p>
                    </div>
                </div>

                {/* Downgrade warning */}
                <div className="bg-error-50 border border-error-300 rounded-sky-chip p-4 mb-5 space-y-3">
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
                                <span className="w-4 h-4 shrink-0 flex items-center justify-center bg-error-200 border border-error-400 rounded-full text-error-700 font-bold text-[10px]">
                                    ↓
                                </span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="flex gap-3">
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
            <div className="flex items-center justify-center h-64">
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

            {error && (
                <div className="mb-6 p-4 bg-error-100 border border-error-400 rounded-sky-chip font-semibold text-error-700">
                    {error}
                </div>
            )}

            {purchaseResult && (
                <div className="mb-6 p-4 bg-success-100 border border-success-400 rounded-sky-chip font-semibold text-success-800 flex items-center justify-between">
                    <span>
                        {t("mentor.subscriptionWallet.purchaseSuccessful", { plan: purchaseResult.subscription.packageName })}
                    </span>
                    <button type="button" onClick={() => setPurchaseResult(null)} className="text-success-600 hover:opacity-70 font-bold text-lg">✕</button>
                </div>
            )}

            {cancelSuccess && (
                <div className="mb-6 p-4 bg-warning-100 border border-warning-400 rounded-sky-chip font-semibold text-warning-900 flex items-center justify-between">
                    <span>
                        {t("mentor.subscriptionWallet.cancelledDowngrade")}
                    </span>
                    <button type="button" onClick={() => setCancelSuccess(false)} className="text-warning-700 hover:opacity-70 font-bold text-lg">✕</button>
                </div>
            )}

            {/* Top Row: Gems Resource Container | Plan + Usage */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* ── Resource Container: Gems ──────────────────────────────── */}
                <SkyCard variant="mentor" className="flex flex-col items-center text-center gap-3">
                    <div className="w-full flex items-center justify-between">
                        <span className="sky-glass-chip flex items-center justify-center w-10 h-10 shrink-0">
                            <img src="/icon/Currency/Diamond/64px/Purple Diamond 1st 64px.png" alt="" className="w-6 h-6 object-contain" />
                        </span>
                        <SkyButton
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => setShowTopUp(true)}
                        >
                            + {t("mentor.subscriptionWallet.topUp")}
                        </SkyButton>
                    </div>
                    <h2 className="text-sky-small font-semibold uppercase tracking-wider text-sky-ink-2">{t("mentor.subscriptionWallet.gemWallet")}</h2>
                    <div className="text-5xl font-extrabold text-sky-peach-deep leading-none">
                        {wallet ? wallet.gemsBalance.toLocaleString() : "—"}
                    </div>
                    {wallet && (
                        <p className="text-sky-small text-sky-ink-2 font-medium">
                            Rate: 1 <img src="/icon/Currency/Diamond/64px/Purple Diamond 1st 64px.png" alt="gem" className="inline w-3.5 h-3.5 object-contain align-text-bottom" /> = {wallet.vndPerGem.toLocaleString()} VND
                        </p>
                    )}
                </SkyCard>

                {/* Current Plan + Usage — merged into one card spanning the remaining 2 columns */}
                <SkyCard variant="mentor" className="md:col-span-2 flex flex-col gap-4">
                    {/* Plan header: info on the left, Cancel pinned to the top-right */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <h2 className="text-sky-h3 font-bold text-sky-ink">{t("mentor.subscriptionWallet.currentPlan")}</h2>
                            {plan ? (
                                <>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-2xl font-bold text-sky-ink">{plan.name}</span>
                                        {activeSub?.isDefaultFree && (
                                            <span className="px-2 py-0.5 text-xs font-semibold bg-gray-200 text-gray-700 rounded-full">
                                                FREE
                                            </span>
                                        )}
                                        {activeSub?.subscription?.isCurrentlyActive && !activeSub.isDefaultFree && (
                                            <span className="px-2 py-0.5 text-xs font-semibold bg-success-500 text-white rounded-full">
                                                ACTIVE
                                            </span>
                                        )}
                                    </div>
                                    {activeSub?.subscription?.expiresAt && (
                                        <p className="text-xs text-sky-ink-2 font-medium">
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

                    <div className="border-t border-sky-surf-border" />

                    {/* Usage section */}
                    <div>
                        <p className="text-sky-small font-semibold text-sky-ink-2 uppercase tracking-wider mb-3">
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
                <h2 className="text-sky-h3 font-bold text-sky-ink mb-1 flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-sky-3/30 text-sm">📜</span>
                    {t("mentor.subscriptionWallet.transactionLog", "Logbook")}
                </h2>
                <p className="text-sky-small text-sky-ink-2 font-medium mb-4">
                    {t("mentor.subscriptionWallet.transactionLogHint", "Every top-up and purchase, in order.")}
                </p>
                <TransactionLogbook transactions={pagedTransactions} loading={loadingTx} error={txError} />
                {!loadingTx && !txError && transactions.length > 0 && (
                    <Pagination currentPage={txPage} totalPages={txTotalPages} onPageChange={setTxPage} />
                )}
            </SkyCard>

            {/* Available Packages */}
            <div>
                <h2 className="text-sky-h2 font-bold text-sky-ink mb-4">{t("mentor.subscriptionWallet.availablePlans")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {packages.map((pkg) => {
                        const isCurrent = activeSub?.package.packageId === pkg.packageId;
                        return (
                            <SkyCard
                                key={pkg.packageId}
                                variant="mentor"
                                className={`relative flex flex-col gap-4 transition-transform duration-150 ${easeExpo} hover:scale-[1.01]`}
                            >
                                {isCurrent && (
                                    <div className="absolute inset-0 rounded-sky-card bg-success-500/5 pointer-events-none" aria-hidden="true" />
                                )}
                                {isCurrent && (
                                    <span className="absolute top-3 right-3 px-2 py-0.5 text-xs font-semibold bg-success-500 text-white rounded-full">
                                        CURRENT
                                    </span>
                                )}
                                <div>
                                    <h3 className="text-sky-h3 font-semibold text-sky-ink">{pkg.name}</h3>
                                    <p className="text-xs text-sky-ink-2 mt-0.5">{pkg.description}</p>
                                </div>
                                <div className="text-sky-h2 font-bold text-sky-peach-deep">
                                    {pkg.price.toLocaleString()} <span className="text-sm font-medium text-sky-ink-2 inline-flex items-center gap-0.5"><img src="/icon/Currency/Diamond/64px/Purple Diamond 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> / {pkg.durationDays}d</span>
                                </div>
                                <ul className="text-xs space-y-1 text-sky-ink-2 font-medium">
                                    <li>✦ {t("mentor.subscriptionWallet.upToParties", { count: pkg.maxParties })}</li>
                                    <li>✦ <strong className="text-sky-ink">{pkg.maxMembersPerParty}</strong> {t("mentor.subscriptionWallet.membersPerParty")}</li>
                                    <li>✦ <strong className="text-sky-ink">{pkg.questsPerMemberPerDay}</strong> {t("mentor.subscriptionWallet.questsPerMemberDay")}</li>
                                    <li>✦ {t("mentor.subscriptionWallet.bossModes")}: <strong className="text-sky-ink">{pkg.bossModes}</strong></li>
                                    <li>✦ {t("mentor.subscriptionWallet.rewardTier")}: <strong className="text-sky-ink">{pkg.rewardTier}</strong></li>
                                    {pkg.proofTypes && (
                                        <li>✦ Proof: <strong className="text-sky-ink">{pkg.proofTypes}</strong></li>
                                    )}
                                    {pkg.aiVerificationBossModes ? (
                                        <li className="flex items-center gap-1">
                                            <span>✦ 🤖 AI verify:</span>
                                            <strong className="text-sky-ink">{pkg.aiVerificationBossModes}</strong>
                                        </li>
                                    ) : (
                                        <li className="text-sky-ink-3">✦ 🤖 No AI verification</li>
                                    )}
                                </ul>
                                <SkyButton
                                    type="button"
                                    variant="primary"
                                    disabled={isCurrent}
                                    onClick={() => setPurchasePkg(pkg)}
                                    className="mt-auto"
                                >
                                    {isCurrent ? t("mentor.subscriptionWallet.currentPlanBtn") : t("mentor.subscriptionWallet.buyUpgrade")}
                                </SkyButton>
                            </SkyCard>
                        );
                    })}
                    {packages.length === 0 && (
                        <p className="col-span-3 text-sky-ink-3 font-medium text-center py-12">
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

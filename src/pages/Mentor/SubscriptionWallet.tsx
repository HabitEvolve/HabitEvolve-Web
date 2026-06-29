import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import mentorApi from "../../api/mentorApi";
import mentorWalletApi, { submitSepayForm } from "../../api/mentorWalletApi";
import { useAlert } from "../../context/AlertContext";
import type {
    ActiveSubscriptionDto,
    MentorWalletDto,
    SubscriptionPackageDto,
    PurchaseSubscriptionResultDto,
} from "../../types/mentor.types";
import type { WalletPaymentMethod } from "../../types/mentorWallet.types";

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
    const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "bg-emerald-500";
    return (
        <div>
            <div className="flex justify-between text-xs font-black mb-1.5">
                <span>{label}</span>
                <span className={pct >= 90 ? "text-red-600" : "text-gray-600"}>
                    {used} / {max === 0 ? "∞" : max}
                </span>
            </div>
            <div className="h-3.5 bg-gray-200 border-2 border-black rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                />
            </div>
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
            className="modal-content fixed inset-0 z-99999 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-md bg-[#FEF9C3] dark:bg-amber-900/40 border-4 border-black rounded-2xl shadow-[8px_8px_0_0_#1A1D20] p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-2xl font-black mb-1">{pkg.name}</h2>
                <p className="text-sm text-gray-600 mb-4">{pkg.description}</p>

                <div className="bg-white border-2 border-black rounded-xl p-4 mb-4 space-y-2">
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
                            <span className="text-gray-500">{k}</span>
                            <span className="font-black">{v}</span>
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-500 font-medium">{t("mentor.subscriptionWallet.cost")}</span>
                    <span className="text-2xl font-black text-amber-700">
                        {pkg.price.toLocaleString()} <img src="/icon/Currency/Diamond/64px/Purple Diamond 1st 64px.png" alt="gem" className="inline w-5 h-5 object-contain align-text-bottom" />
                    </span>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 border-2 border-black rounded-full font-black text-sm bg-white shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75 transition-all"
                    >
                        {t("mentor.subscriptionWallet.cancel")}
                    </button>
                    <button
                        onClick={handlePurchase}
                        disabled={loading}
                        className="flex-1 py-2.5 border-2 border-black rounded-full font-black text-sm bg-amber-400 shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75 disabled:opacity-60 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-2"
                    >
                        {loading ? <><Spinner size={14} /> {t("mentor.subscriptionWallet.processing")}</> : t("mentor.subscriptionWallet.purchaseDemo")}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ── GEM STORE MODAL ───────────────────────────────────────────────────────────
const GEM_PACKAGES = [
    { gems: 100,  label: "Starter",  color: "bg-emerald-100 dark:bg-emerald-900/50", badge: null },
    { gems: 500,  label: "Explorer", color: "bg-amber-100 dark:bg-amber-900/50",   badge: "POPULAR" },
    { gems: 1000, label: "Champion", color: "bg-violet-100 dark:bg-violet-900/50",  badge: null },
    { gems: 3000, label: "Legend",   color: "bg-[#FEE2E2] dark:bg-red-900/50",   badge: "BEST VALUE" },
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
    const [selected, setSelected] = useState<GemPackage>(GEM_PACKAGES[1]);
    const [method, setMethod] = useState<WalletPaymentMethod>('SEPAY');
    const [loading, setLoading] = useState(false);
    const [redirecting, setRedirecting] = useState(false);

    const handleBuy = async () => {
        setLoading(true);
        let willRedirect = false;
        try {
            const res = await mentorWalletApi.topUpGems({
                mentorUserId: getMentorId(),
                gemAmount: selected.gems,
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

    const vndPrice = (selected.gems * vndPerGem).toLocaleString();

    return createPortal(
        <div
            className="modal-content fixed inset-0 z-99999 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-lg bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0_0_#1A1D20] p-6 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Redirecting overlay — shown while SePay form is submitting */}
                {redirecting && (
                    <div className="absolute inset-0 bg-white/95 dark:bg-gray-900/95 rounded-xl flex flex-col items-center justify-center gap-4 z-10">
                        <Spinner size={40} />
                        <p className="font-black text-xl">{t("mentor.subscriptionWallet.connectingSepay")}</p>
                        <p className="text-sm text-gray-500 text-center max-w-xs font-medium">
                            {t("mentor.subscriptionWallet.redirectingPayment")}
                        </p>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-2xl font-black flex items-center gap-2"><img src="/icon/Currency/Diamond/64px/Purple Diamond 1st 64px.png" alt="" className="w-7 h-7 object-contain" />{t("mentor.subscriptionWallet.gemStore")}</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center border-2 border-black rounded-full font-black text-lg hover:bg-gray-100 transition-colors"
                    >
                        ✕
                    </button>
                </div>
                <p className="text-xs text-gray-500 font-medium mb-5">
                    Rate: 1 <img src="/icon/Currency/Diamond/64px/Purple Diamond 1st 64px.png" alt="gem" className="inline w-3.5 h-3.5 object-contain align-text-bottom" /> = {vndPerGem.toLocaleString()} VND
                </p>

                {/* Package grid */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                    {GEM_PACKAGES.map((pkg) => {
                        const isSelected = selected.gems === pkg.gems;
                        return (
                            <button
                                key={pkg.gems}
                                onClick={() => setSelected(pkg)}
                                className={`relative text-left p-4 rounded-2xl transition-all ${pkg.color} ${isSelected
                                    ? "border-4 border-black shadow-none translate-x-0.5 translate-y-0.5"
                                    : "border-2 border-gray-300 shadow-[3px_3px_0_0_#d1d5db] hover:border-black hover:shadow-[3px_3px_0_0_#1A1D20]"
                                }`}
                            >
                                {pkg.badge && (
                                    <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-black bg-black text-white rounded-full">
                                        {pkg.badge}
                                    </span>
                                )}
                                <div className="text-3xl font-black text-gray-900">
                                    {pkg.gems.toLocaleString()}
                                    <img src="/icon/Currency/Diamond/64px/Purple Diamond 1st 64px.png" alt="" className="inline w-6 h-6 object-contain align-text-bottom ml-1" />
                                </div>
                                <div className="text-xs font-black text-gray-600 mt-0.5">{pkg.label}</div>
                                <div className="text-sm font-black text-gray-800 mt-1">
                                    {(pkg.gems * vndPerGem).toLocaleString()} VND
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Payment method toggle */}
                <div className="flex gap-2 mb-5">
                    {(['SEPAY', 'DEMO'] as WalletPaymentMethod[]).map((m) => (
                        <button
                            key={m}
                            onClick={() => setMethod(m)}
                            className={`flex-1 py-2 rounded-full border-2 font-black text-xs transition-all ${method === m
                                ? "border-black bg-black text-white shadow-none"
                                : "border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-500"
                            }`}
                        >
                            {m === 'SEPAY' ? '💳 SePay (Real)' : '🧪 DEMO (Dev)'}
                        </button>
                    ))}
                </div>

                {/* Buy button */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 border-2 border-black rounded-full font-black text-sm bg-white shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75 transition-all"
                    >
                        {t("mentor.subscriptionWallet.cancel")}
                    </button>
                    <button
                        onClick={handleBuy}
                        disabled={loading}
                        className="flex-1 py-2.5 border-2 border-black rounded-full font-black text-sm bg-teal-400 shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75 disabled:opacity-60 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-2"
                    >
                        {loading
                            ? <><Spinner size={14} /> {t("mentor.subscriptionWallet.processing")}</>
                            : <>{t("mentor.subscriptionWallet.buy")} {selected.gems.toLocaleString()} <img src="/icon/Currency/Diamond/64px/Purple Diamond 1st 64px.png" alt="" className="inline w-4 h-4 object-contain align-text-bottom" /> — {vndPrice} VND</>
                        }
                    </button>
                </div>
            </div>
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
            className="modal-content fixed inset-0 z-99999 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-md bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0_0_#1A1D20] p-6"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 shrink-0 flex items-center justify-center bg-red-100 border-2 border-black rounded-xl text-2xl select-none">
                        ⚠️
                    </div>
                    <div>
                        <h2 className="text-xl font-black leading-tight">{t("mentor.subscriptionWallet.cancelSubTitle")}</h2>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                            {t("mentor.subscriptionWallet.currentPlan")}: <strong className="text-gray-800">{planName}</strong>
                        </p>
                    </div>
                </div>

                {/* Downgrade warning */}
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl p-4 mb-5 space-y-3">
                    <p className="text-sm font-bold text-gray-800">
                        {t("mentor.subscriptionWallet.cancelWarning", { freeTier: t("mentor.subscriptionWallet.freeTier") })}
                    </p>
                    <ul className="space-y-1.5">
                        {[
                            t("mentor.subscriptionWallet.cancelLimit1"),
                            t("mentor.subscriptionWallet.cancelLimit2"),
                            t("mentor.subscriptionWallet.cancelLimit3"),
                        ].map((item) => (
                            <li key={item} className="flex items-center gap-2 text-xs font-medium text-gray-700">
                                <span className="w-4 h-4 shrink-0 flex items-center justify-center bg-red-200 border border-red-400 rounded-full text-red-700 font-black text-[10px]">
                                    ↓
                                </span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="flex gap-3">
                    {/* Ghost/secondary — "safe" choice always on the left */}
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-2.5 border-2 border-black rounded-full font-black text-sm bg-gray-100 text-gray-700 shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                    >
                        {t("mentor.subscriptionWallet.keepPlan")}
                    </button>
                    {/* Primary destructive */}
                    <button
                        onClick={handleConfirmCancel}
                        disabled={loading}
                        className="flex-1 py-2.5 border-2 border-black rounded-full font-black text-sm bg-red-500 text-white shadow-[3px_3px_0_0_#991b1b] hover:bg-red-600 hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75 disabled:opacity-60 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-2"
                    >
                        {loading ? <><Spinner size={14} /> {t("mentor.subscriptionWallet.cancelling")}</> : t("mentor.subscriptionWallet.yesCancelIt")}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ── PAGE ──────────────────────────────────────────────────────────────────────
export default function SubscriptionWallet() {
    const { t } = useTranslation();
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

    const handlePurchaseSuccess = (result: PurchaseSubscriptionResultDto) => {
        setPurchasePkg(null);
        setPurchaseResult(result);
        fetchAll();
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
                <div className="mb-6 p-4 bg-red-100 border-4 border-red-400 rounded-2xl font-bold text-red-700">
                    {error}
                </div>
            )}

            {purchaseResult && (
                <div className="mb-6 p-4 bg-emerald-100 border-4 border-emerald-400 rounded-2xl font-bold text-emerald-800 flex items-center justify-between">
                    <span>
                        {t("mentor.subscriptionWallet.purchaseSuccessful", { plan: purchaseResult.subscription.packageName })}
                    </span>
                    <button onClick={() => setPurchaseResult(null)} className="text-emerald-600 hover:text-emerald-900 font-black text-lg">✕</button>
                </div>
            )}

            {cancelSuccess && (
                <div className="mb-6 p-4 bg-amber-100 border-4 border-amber-400 rounded-2xl font-bold text-amber-900 flex items-center justify-between">
                    <span>
                        {t("mentor.subscriptionWallet.cancelledDowngrade")}
                    </span>
                    <button onClick={() => setCancelSuccess(false)} className="text-amber-700 hover:text-amber-900 font-black text-lg">✕</button>
                </div>
            )}

            {/* Top Row: Wallet | Plan + Usage (merged) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Wallet Card */}
                <div className="bg-[#FEF9C3] dark:bg-amber-900/30 border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-black flex items-center gap-2">{t("mentor.subscriptionWallet.gemWallet")} <img src="/icon/Currency/Diamond/64px/Purple Diamond 1st 64px.png" alt="" className="w-5 h-5 object-contain" /></h2>
                        <button
                            onClick={() => setShowTopUp(true)}
                            className="px-3 py-1.5 text-xs border-2 border-black rounded-full font-black bg-amber-400 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                        >
                            + {t("mentor.subscriptionWallet.topUp")}
                        </button>
                    </div>
                    <div className="text-5xl font-black text-amber-700">
                        {wallet ? wallet.gemsBalance.toLocaleString() : "—"}
                        <img src="/icon/Currency/Diamond/64px/Purple Diamond 1st 64px.png" alt="" className="inline w-8 h-8 object-contain align-text-bottom ml-1" />
                    </div>
                    {wallet && (
                        <p className="text-xs text-gray-500 font-medium">
                            Rate: 1 <img src="/icon/Currency/Diamond/64px/Purple Diamond 1st 64px.png" alt="gem" className="inline w-3.5 h-3.5 object-contain align-text-bottom" /> = {wallet.vndPerGem.toLocaleString()} VND
                        </p>
                    )}
                </div>

                {/* Current Plan + Usage — merged into one card spanning the remaining 2 columns */}
                <div className="md:col-span-2 bg-[#EDE9FE] dark:bg-violet-900/30 border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] p-6 flex flex-col gap-4">
                    {/* Plan header: info on the left, Cancel pinned to the top-right */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <h2 className="text-lg font-black">{t("mentor.subscriptionWallet.currentPlan")}</h2>
                            {plan ? (
                                <>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-2xl font-black">{plan.name}</span>
                                        {activeSub?.isDefaultFree && (
                                            <span className="px-2 py-0.5 text-xs font-black bg-gray-200 dark:bg-gray-700 dark:text-gray-200 border-2 border-black rounded-full">
                                                FREE
                                            </span>
                                        )}
                                        {activeSub?.subscription?.isCurrentlyActive && !activeSub.isDefaultFree && (
                                            <span className="px-2 py-0.5 text-xs font-black bg-violet-500 text-white border-2 border-black rounded-full">
                                                ACTIVE
                                            </span>
                                        )}
                                    </div>
                                    {activeSub?.subscription?.expiresAt && (
                                        <p className="text-xs text-gray-500 font-medium">
                                            {t("mentor.subscriptionWallet.expires")}: {new Date(activeSub.subscription.expiresAt).toLocaleDateString()}
                                        </p>
                                    )}
                                    {plan.description && (
                                        <p className="text-xs text-gray-600 font-medium">{plan.description}</p>
                                    )}
                                </>
                            ) : (
                                <p className="text-gray-400 font-medium text-sm">{t("mentor.subscriptionWallet.noPlan")}</p>
                            )}
                        </div>
                        {/* Cancel — only for active paid subscriptions */}
                        {canCancel && (
                            <button
                                onClick={() => setShowCancel(true)}
                                className="shrink-0 px-3 py-1.5 border-2 border-black rounded-xl font-black text-xs bg-red-400 hover:bg-red-500 shadow-[2px_2px_0_0_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                            >
                                {t("mentor.subscriptionWallet.cancelSubscription")}
                            </button>
                        )}
                    </div>

                    <div className="border-t-2 border-black/10" />

                    {/* Usage section */}
                    <div>
                        <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">
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
                            <p className="text-gray-400 font-medium text-sm">{t("mentor.subscriptionWallet.noUsageData")}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Available Packages */}
            <div>
                <h2 className="text-2xl font-black mb-4">{t("mentor.subscriptionWallet.availablePlans")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {packages.map((pkg) => {
                        const isCurrent = activeSub?.package.packageId === pkg.packageId;
                        return (
                            <div
                                key={pkg.packageId}
                                className={`relative flex flex-col gap-4 p-5 border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] ${isCurrent ? "bg-[#D1FAE5] dark:bg-emerald-900/30" : "bg-white"
                                    }`}
                            >
                                {isCurrent && (
                                    <span className="absolute top-3 right-3 px-2 py-0.5 text-xs font-black bg-emerald-500 text-white border-2 border-black rounded-full">
                                        CURRENT
                                    </span>
                                )}
                                <div>
                                    <h3 className="text-xl font-black">{pkg.name}</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">{pkg.description}</p>
                                </div>
                                <div className="text-2xl font-black text-amber-700">
                                    {pkg.price.toLocaleString()} <span className="text-sm font-medium text-gray-500 inline-flex items-center gap-0.5"><img src="/icon/Currency/Diamond/64px/Purple Diamond 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> / {pkg.durationDays}d</span>
                                </div>
                                <ul className="text-xs space-y-1 text-gray-700 font-medium">
                                    <li>✦ {t("mentor.subscriptionWallet.upToParties", { count: pkg.maxParties })}</li>
                                    <li>✦ <strong>{pkg.maxMembersPerParty}</strong> {t("mentor.subscriptionWallet.membersPerParty")}</li>
                                    <li>✦ <strong>{pkg.questsPerMemberPerDay}</strong> {t("mentor.subscriptionWallet.questsPerMemberDay")}</li>
                                    <li>✦ {t("mentor.subscriptionWallet.bossModes")}: <strong>{pkg.bossModes}</strong></li>
                                    <li>✦ {t("mentor.subscriptionWallet.rewardTier")}: <strong>{pkg.rewardTier}</strong></li>
                                    {pkg.proofTypes && (
                                        <li>✦ Proof: <strong>{pkg.proofTypes}</strong></li>
                                    )}
                                    {pkg.aiVerificationBossModes ? (
                                        <li className="flex items-center gap-1">
                                            <span>✦ 🤖 AI verify:</span>
                                            <strong>{pkg.aiVerificationBossModes}</strong>
                                        </li>
                                    ) : (
                                        <li className="text-gray-400">✦ 🤖 No AI verification</li>
                                    )}
                                </ul>
                                <button
                                    disabled={isCurrent}
                                    onClick={() => setPurchasePkg(pkg)}
                                    className="mt-auto py-2.5 border-2 border-black rounded-full font-black text-sm bg-amber-400 shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[3px_3px_0_0_#1A1D20] transition-all"
                                >
                                    {isCurrent ? t("mentor.subscriptionWallet.currentPlanBtn") : t("mentor.subscriptionWallet.buyUpgrade")}
                                </button>
                            </div>
                        );
                    })}
                    {packages.length === 0 && (
                        <p className="col-span-3 text-gray-400 font-medium text-center py-12">
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

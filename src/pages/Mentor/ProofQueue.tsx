import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import mentorApi from "../../api/mentorApi";
import type { ProofDto, AiVerdict } from "../../types/mentor.types";
import { useAlert } from "../../context/AlertContext";

const Spinner = ({ size = 18 }: { size?: number }) => (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
);

// ── REJECT MODAL ──────────────────────────────────────────────────────────────
interface RejectModalProps {
    proof: ProofDto;
    onClose: () => void;
    onRejected: (proofId: number) => void;
}

const RejectModal = ({ proof, onClose, onRejected }: RejectModalProps) => {
    const { t } = useTranslation();
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleReject = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await mentorApi.rejectProof(proof.proofId, reason || undefined);
            if (res.success) {
                onRejected(proof.proofId);
            } else {
                setError(res.message || t("mentor.proofQueue.rejectModal.rejectionFailed"));
            }
        } catch (e: any) {
            setError(e?.response?.data?.message || t("mentor.proofQueue.rejectModal.errorOccurred"));
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
                className="w-full max-w-md bg-[#FEE2E2] dark:bg-red-900/40 border-4 border-black rounded-2xl shadow-[8px_8px_0_0_#1A1D20] p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-black mb-1">{t("mentor.proofQueue.rejectModal.title")}</h2>
                <p className="text-sm text-gray-600 mb-4">
                    <strong>{proof.username}</strong> — {proof.questTitle}
                </p>

                <label className="block text-xs font-black uppercase tracking-wider mb-2">
                    {t("mentor.proofQueue.rejectModal.reason")}
                </label>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t("mentor.proofQueue.rejectModal.placeholder")}
                    rows={4}
                    className="w-full px-3 py-2.5 border-2 border-black rounded-xl text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-red-300 resize-none placeholder:text-gray-400"
                />

                {error && (
                    <p className="mt-3 p-2.5 bg-red-100 border-2 border-red-400 rounded-xl text-sm font-bold text-red-700">
                        {error}
                    </p>
                )}

                <div className="flex gap-3 mt-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 border-2 border-black rounded-full font-black text-sm bg-white shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75 transition-all"
                    >
                        {t("mentor.proofQueue.rejectModal.cancel")}
                    </button>
                    <button
                        onClick={handleReject}
                        disabled={loading}
                        className="flex-1 py-2.5 border-2 border-black rounded-full font-black text-sm bg-red-400 shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75 disabled:opacity-60 transition-all inline-flex items-center justify-center gap-2"
                    >
                        {loading ? <><Spinner size={14} /> {t("mentor.proofQueue.rejectModal.rejecting")}</> : t("mentor.proofQueue.rejectModal.rejectProof")}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ── AI STATUS BADGE ───────────────────────────────────────────────────────────
const AI_STATUS_STYLES: Record<AiVerdict, { bg: string; text: string; icon: string }> = {
    "Not Used": { bg: "bg-gray-100 border-gray-300", text: "text-gray-500",    icon: "—" },
    "Approved": { bg: "bg-emerald-100 border-emerald-400", text: "text-emerald-800", icon: "✓" },
    "Suspicious": { bg: "bg-amber-100 border-amber-400",   text: "text-amber-800",   icon: "⚠" },
    "Rejected":  { bg: "bg-red-100 border-red-400",        text: "text-red-800",     icon: "✕" },
};

const AiStatusBadge = ({ status }: { status: AiVerdict }) => {
    const s = AI_STATUS_STYLES[status];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-black border-2 rounded-full ${s.bg} ${s.text}`}>
            🤖 {s.icon} {status}
        </span>
    );
};

// ── PROOF CARD ────────────────────────────────────────────────────────────────
interface ProofCardProps {
    proof: ProofDto;
    onApprove: (id: number) => void;
    onReject: (proof: ProofDto) => void;
    actionLoading: boolean;
    isAiQueue?: boolean;
}

const ProofCard = ({ proof, onApprove, onReject, actionLoading, isAiQueue = false }: ProofCardProps) => {
    const { t } = useTranslation();
    const isSuspicious = proof.status === "Suspicious" || proof.status === "AiChecking";
    const hasMedia = proof.mediaUrls && proof.mediaUrls.length > 0;
    const isOverdue = proof.deadlineAt && new Date(proof.deadlineAt) < new Date();

    return (
        <div className={`bg-white border-4 rounded-2xl shadow-[4px_4px_0_0_#1A1D20] overflow-hidden flex flex-col ${
            isAiQueue ? "border-violet-500" : "border-black"
        }`}>
            {/* Media preview */}
            {hasMedia ? (
                <div className={`relative w-full h-48 bg-gray-100 overflow-hidden ${isSuspicious ? "blur-sm" : ""}`}>
                    <img
                        src={proof.mediaUrls[0]}
                        alt="Proof"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = ""; }}
                    />
                    {isSuspicious && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 blur-none">
                            <span className="bg-amber-400 border-2 border-black rounded-full px-3 py-1 text-xs font-black">
                                🤖 {t("mentor.proofQueue.aiFlagged")}
                            </span>
                        </div>
                    )}
                    {proof.mediaUrls.length > 1 && (
                        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-black px-2 py-0.5 rounded-full">
                            +{proof.mediaUrls.length - 1} more
                        </span>
                    )}
                </div>
            ) : (
                <div className="w-full h-24 bg-gray-50 flex items-center justify-center border-b-2 border-gray-200">
                    <span className="text-gray-400 text-xs font-bold">{t("mentor.proofQueue.noMedia")}</span>
                </div>
            )}

            {/* Info */}
            <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <p className="font-black text-sm truncate">{proof.questTitle ?? `Quest #${proof.questId}`}</p>
                        <p className="text-xs text-gray-500 font-medium">by <strong>{proof.username ?? `User #${proof.userId}`}</strong></p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 text-xs font-black border-2 rounded-full ${
                        isSuspicious ? "bg-amber-100 border-amber-400 text-amber-800" : "bg-teal-100 border-teal-400 text-teal-800"
                    }`}>
                        {proof.status}
                    </span>
                </div>

                {/* AI Status + Review Type row */}
                <div className="flex flex-wrap gap-1.5 items-center">
                    {proof.aiStatus && proof.aiStatus !== "Not Used" && (
                        <AiStatusBadge status={proof.aiStatus} />
                    )}
                    {proof.reviewType && (
                        <span className={`px-2 py-0.5 text-xs font-bold border-2 rounded-full ${
                            proof.reviewType === "AI + Mentor"
                                ? "bg-violet-100 border-violet-400 text-violet-700"
                                : "bg-gray-100 border-gray-300 text-gray-600"
                        }`}>
                            {proof.reviewType}
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-gray-500 font-medium">
                    <span className="px-2 py-0.5 bg-gray-100 border-2 border-gray-300 rounded-full">{proof.proofType}</span>
                    <span>{new Date(proof.submittedAt).toLocaleString()}</span>
                    {proof.deadlineMet && (
                        <span className="px-2 py-0.5 bg-emerald-100 border-2 border-emerald-300 rounded-full text-emerald-700">{t("mentor.proofQueue.onTime")} ✓</span>
                    )}
                </div>

                {/* Deadline */}
                {proof.deadlineAt && (
                    <div className={`text-xs font-bold px-2 py-1 rounded-lg border ${
                        isOverdue
                            ? "bg-red-50 border-red-300 text-red-600"
                            : "bg-gray-50 border-gray-200 text-gray-500"
                    }`}>
                        {isOverdue ? "⚠ Overdue" : "⏰ Deadline"}:{" "}
                        {new Date(proof.deadlineAt).toLocaleString()}
                    </div>
                )}

                {proof.textNote && (
                    <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-2 italic line-clamp-2">
                        "{proof.textNote}"
                    </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-auto pt-2">
                    <button
                        onClick={() => onApprove(proof.proofId)}
                        disabled={actionLoading}
                        className="flex-1 py-2 border-2 border-black rounded-full font-black text-xs bg-emerald-400 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-1"
                    >
                        {actionLoading ? <Spinner size={12} /> : `✓ ${t("mentor.proofQueue.approve")}`}
                    </button>
                    <button
                        onClick={() => onReject(proof)}
                        disabled={actionLoading}
                        className="flex-1 py-2 border-2 border-black rounded-full font-black text-xs bg-red-300 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-1"
                    >
                        ✕ {t("mentor.proofQueue.reject")}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── QUEUE SECTION ─────────────────────────────────────────────────────────────
interface QueueSectionProps {
    title: string;
    count: number;
    proofs: ProofDto[];
    loading: boolean;
    onApprove: (id: number) => void;
    onReject: (proof: ProofDto) => void;
    actionLoading: number | null;
    emptyIcon: string;
    emptyText: string;
    isAiQueue?: boolean;
}

const QueueSection = ({
    title, count, proofs, loading, onApprove, onReject,
    actionLoading, emptyIcon, emptyText, isAiQueue = false,
}: QueueSectionProps) => (
    <div>
        <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-black">{title}</h2>
            <span className={`px-3 py-1 text-sm font-black border-2 border-black rounded-full ${
                isAiQueue ? "bg-violet-400 text-white" : "bg-teal-500 text-white"
            }`}>
                {count}
            </span>
            {loading && <Spinner size={16} />}
        </div>

        {loading && proofs.length === 0 ? (
            <div className="flex items-center justify-center h-40 gap-3 text-gray-400">
                <Spinner size={28} />
            </div>
        ) : proofs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl">
                <span className="text-4xl">{emptyIcon}</span>
                <p className="text-sm font-black text-gray-400">{emptyText}</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {proofs.map((proof) => (
                    <ProofCard
                        key={proof.proofId}
                        proof={proof}
                        onApprove={onApprove}
                        onReject={onReject}
                        actionLoading={actionLoading === proof.proofId}
                        isAiQueue={isAiQueue}
                    />
                ))}
            </div>
        )}
    </div>
);

// ── PAGE ──────────────────────────────────────────────────────────────────────
type QueueTab = "manual" | "ai";

export default function ProofQueue() {
    const { t } = useTranslation();
    const alert = useAlert();
    const [activeTab, setActiveTab] = useState<QueueTab>("manual");
    const [manualProofs, setManualProofs] = useState<ProofDto[]>([]);
    const [aiProofs, setAiProofs] = useState<ProofDto[]>([]);
    const [loadingManual, setLoadingManual] = useState(true);
    const [loadingAi, setLoadingAi] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [rejectTarget, setRejectTarget] = useState<ProofDto | null>(null);

    const fetchQueues = useCallback(async () => {
        setError(null);
        setLoadingManual(true);
        setLoadingAi(true);
        try {
            const [manualRes, aiRes] = await Promise.all([
                mentorApi.getProofQueue(),
                mentorApi.getAiProofQueue(),
            ]);
            if (manualRes.success) setManualProofs(manualRes.data ?? []);
            if (aiRes.success) setAiProofs(aiRes.data ?? []);
            if (!manualRes.success && !aiRes.success) {
                setError(manualRes.message || t("mentor.proofQueue.failedToLoad"));
            }
        } catch (e: any) {
            setError(e?.response?.data?.message || t("mentor.proofQueue.errorOccurred"));
        } finally {
            setLoadingManual(false);
            setLoadingAi(false);
        }
    }, []);

    useEffect(() => { fetchQueues(); }, [fetchQueues]);

    const handleApprove = async (proofId: number) => {
        setActionLoading(proofId);
        try {
            const res = await mentorApi.approveProof(proofId);
            if (res.success) {
                setManualProofs((prev) => prev.filter((p) => p.proofId !== proofId));
                setAiProofs((prev) => prev.filter((p) => p.proofId !== proofId));
                alert.success(t("mentor.proofQueue.approvedSuccess"));
            } else {
                alert.error(res.message || t("mentor.proofQueue.approvalFailed"));
            }
        } catch (e: any) {
            alert.error(e?.response?.data?.message || t("mentor.proofQueue.errorOccurred"));
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejected = (proofId: number) => {
        setRejectTarget(null);
        setManualProofs((prev) => prev.filter((p) => p.proofId !== proofId));
        setAiProofs((prev) => prev.filter((p) => p.proofId !== proofId));
        alert.success(t("mentor.proofQueue.rejectedSuccess"));
    };

    const totalCount = manualProofs.length + aiProofs.length;

    return (
        <>
            <PageMeta title="Proof Queue — HabitEvolve" description="Review and judge submitted proof" />
            <PageBreadcrumb pageTitle={t("mentor.proofQueue.pageTitle")} />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-black">{t("mentor.proofQueue.pendingReviews")}</h1>
                    <span className="px-3 py-1 bg-teal-500 text-white text-sm font-black border-2 border-black rounded-full">
                        {totalCount}
                    </span>
                </div>
                <button
                    onClick={fetchQueues}
                    disabled={loadingManual && loadingAi}
                    className="px-4 py-2 border-2 border-black rounded-full font-black text-sm bg-white shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75 disabled:opacity-60 transition-all inline-flex items-center gap-2"
                >
                    {loadingManual || loadingAi ? <Spinner size={14} /> : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    )}
                    {t("mentor.proofQueue.refresh")}
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-100 border-4 border-red-400 rounded-2xl font-bold text-red-700">
                    {error}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b-4 border-black pb-0">
                {(["manual", "ai"] as QueueTab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2.5 text-sm font-black border-2 border-black rounded-t-xl transition-all ${
                            activeTab === tab
                                ? tab === "ai"
                                    ? "bg-violet-500 text-white -mb-0.5"
                                    : "bg-teal-500 text-white -mb-0.5"
                                : "bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                    >
                        {tab === "manual" ? `👤 ${t("mentor.proofQueue.manualQueue")}` : `🤖 ${t("mentor.proofQueue.aiQueue")}`}
                        <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-black/20">
                            {tab === "manual" ? manualProofs.length : aiProofs.length}
                        </span>
                    </button>
                ))}
            </div>

            {/* Active queue */}
            {activeTab === "manual" ? (
                <QueueSection
                    title={t("mentor.proofQueue.manualQueue")}
                    count={manualProofs.length}
                    proofs={manualProofs}
                    loading={loadingManual}
                    onApprove={handleApprove}
                    onReject={setRejectTarget}
                    actionLoading={actionLoading}
                    emptyIcon="⚖️"
                    emptyText={t("mentor.proofQueue.queueEmpty")}
                />
            ) : (
                <QueueSection
                    title={t("mentor.proofQueue.aiQueue")}
                    count={aiProofs.length}
                    proofs={aiProofs}
                    loading={loadingAi}
                    onApprove={handleApprove}
                    onReject={setRejectTarget}
                    actionLoading={actionLoading}
                    emptyIcon="🤖"
                    emptyText={t("mentor.proofQueue.aiQueueEmpty")}
                    isAiQueue
                />
            )}

            {rejectTarget && (
                <RejectModal
                    proof={rejectTarget}
                    onClose={() => setRejectTarget(null)}
                    onRejected={handleRejected}
                />
            )}
        </>
    );
}

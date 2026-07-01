import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";
import mentorApi from "../../../api/mentorApi";
import type { ProofDto, AiVerdict } from "../../../types/mentor.types";
import { useAlert } from "../../../context/AlertContext";
import { Bot, UserRoundPen } from "lucide-react";
import { inkBorder, shadowSm, shadowMd, shadowLg, easeExpo, Spinner } from "./shared";
import type { PartyWorkspaceContext } from "./PartyWorkspace";

const btnPress =
    `hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] ` +
    `active:shadow-none active:translate-x-[3px] active:translate-y-[3px] ` +
    `disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 ` +
    `transition-all duration-150 ${easeExpo}`;
// Reserved for AI-flagged cards only — a genuine neon-red glow, not the
// project's usual soft ink shadow. Deliberate one-off, not a reusable pattern.
const flagGlow =
    "shadow-[0_0_0_3px_rgba(240,68,56,0.55),0_0_28px_rgba(240,68,56,0.5)] " +
    "dark:shadow-[0_0_0_3px_rgba(249,112,102,0.6),0_0_32px_rgba(249,112,102,0.55)]";

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
            className="modal-content fixed inset-0 z-99999 flex items-center justify-center p-4 bg-game-outline/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className={`w-full max-w-md bg-error-100 dark:bg-error-500/15 border-4 ${inkBorder} rounded-2xl ${shadowLg} p-6`}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-black text-gray-900 mb-1">{t("mentor.proofQueue.rejectModal.title")}</h2>
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
                    className={`w-full p-3 border-[3px] ${inkBorder} rounded-xl text-sm font-medium bg-gray-25 dark:bg-gray-800 focus:outline-none focus:ring-4 focus:ring-error-200 dark:focus:ring-error-500/20 resize-none placeholder:text-gray-400`}
                />

                {error && (
                    <p className="mt-3 p-2.5 bg-error-100 dark:bg-error-500/20 border-2 border-error-400 rounded-xl text-sm font-bold text-error-700 dark:text-error-300">
                        {error}
                    </p>
                )}

                <div className="flex gap-3 mt-4">
                    <button
                        onClick={onClose}
                        className={`flex-1 py-2.5 border-2 ${inkBorder} rounded-full font-black text-sm bg-gray-25 dark:bg-gray-800 ${shadowSm} ${btnPress}`}
                    >
                        {t("mentor.proofQueue.rejectModal.cancel")}
                    </button>
                    <button
                        onClick={handleReject}
                        disabled={loading}
                        className={`flex-1 py-2.5 border-2 ${inkBorder} rounded-full font-black text-sm bg-error-400 text-game-outline ${shadowSm} ${btnPress} inline-flex items-center justify-center gap-2`}
                    >
                        {loading ? <><Spinner size={14} /> {t("mentor.proofQueue.rejectModal.rejecting")}</> : t("mentor.proofQueue.rejectModal.rejectProof")}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ── COMPARISON OVERLAY: Requirement (left) vs Submitted Proof (right) ────────
interface ComparisonModalProps {
    proof: ProofDto;
    onClose: () => void;
}

const ComparisonModal = ({ proof, onClose }: ComparisonModalProps) => {
    const { t } = useTranslation();
    const hasMedia = proof.mediaUrls && proof.mediaUrls.length > 0;

    return createPortal(
        <div
            className="modal-content fixed inset-0 z-99999 flex items-center justify-center p-4 bg-game-outline/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className={`w-full max-w-3xl bg-gray-25 dark:bg-gray-800 border-4 ${inkBorder} rounded-2xl ${shadowLg} overflow-hidden`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`flex items-center justify-between px-5 py-4 border-b-4 ${inkBorder}`}>
                    <div>
                        <p className="text-xs font-black uppercase tracking-wider text-gray-500">{t("mentor.proofQueue.grid.comparisonTitle")}</p>
                        <h2 className="text-lg font-black leading-tight text-gray-900">{proof.questTitle ?? `Quest #${proof.questId}`}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className={`w-8 h-8 flex items-center justify-center border-2 ${inkBorder} rounded-full font-black hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                        aria-label={t("mentor.proofQueue.grid.comparisonClose")}
                    >
                        <img src="/icon/UI/Close Button/64px/Close Button 1st 64px.png" alt="" className="w-4 h-4 object-contain" />
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-dashed divide-game-outline/25 dark:divide-brand-300/25">
                    <div className="p-5">
                        <span className="inline-block text-[11px] font-black uppercase tracking-[0.14em] text-purple-600 dark:text-purple-300 mb-3">
                            {t("mentor.proofQueue.grid.comparisonRequirement")}
                        </span>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs font-black text-gray-500 uppercase">{t("mentor.proofQueue.grid.comparisonQuestType")}</p>
                                <p className="text-sm font-bold">{proof.questType ?? "—"}</p>
                            </div>
                            <div>
                                <p className="text-xs font-black text-gray-500 uppercase">{t("mentor.proofQueue.grid.comparisonProofType")}</p>
                                <p className={`inline-block mt-0.5 px-2.5 py-1 border-2 ${inkBorder} rounded-full text-xs font-black bg-purple-100 dark:bg-purple-500/15`}>
                                    {proof.proofType}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-black text-gray-500 uppercase">{t("mentor.proofQueue.grid.comparisonDeadline")}</p>
                                <p className="text-sm font-bold">
                                    {proof.deadlineAt ? new Date(proof.deadlineAt).toLocaleString() : t("mentor.proofQueue.grid.comparisonNoDeadline")}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-5">
                        <span className="inline-block text-[11px] font-black uppercase tracking-[0.14em] text-orange-600 dark:text-orange-300 mb-3">
                            {t("mentor.proofQueue.grid.comparisonSubmitted")}
                        </span>
                        {hasMedia ? (
                            <div className={`w-full rounded-xl overflow-hidden border-[3px] ${inkBorder} bg-gray-100 dark:bg-gray-900 mb-3`}>
                                <img src={proof.mediaUrls[0]} alt="Submitted proof" className="w-full max-h-72 object-contain" />
                            </div>
                        ) : (
                            <div className={`w-full h-40 rounded-xl border-[3px] border-dashed ${inkBorder} bg-gray-50 dark:bg-gray-900 flex items-center justify-center mb-3`}>
                                <span className="text-gray-400 text-xs font-bold">{t("mentor.proofQueue.noMedia")}</span>
                            </div>
                        )}
                        <p className="text-xs font-black text-gray-500 uppercase">{new Date(proof.submittedAt).toLocaleString()}</p>
                        {proof.textNote && (
                            <div className="mt-2">
                                <p className="text-xs font-black text-gray-500 uppercase">{t("mentor.proofQueue.grid.comparisonPlayerNote")}</p>
                                <p className="text-sm italic text-gray-700 dark:text-gray-300">"{proof.textNote}"</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ── AI STATUS BADGE ───────────────────────────────────────────────────────────
const AI_STATUS_STYLES: Record<AiVerdict, { bg: string; text: string; icon: string | null }> = {
    "Not Used": { bg: "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600", text: "text-gray-500 dark:text-gray-400", icon: null },
    "Approved": { bg: "bg-success-100 dark:bg-success-500/15 border-success-400", text: "text-success-800 dark:text-success-300", icon: "/icon/UI/Checkmark/64px/Checkmark 1st 64px.png" },
    "Suspicious": { bg: "bg-warning-100 dark:bg-warning-500/15 border-warning-400", text: "text-warning-800 dark:text-warning-300", icon: "/icon/UI/Warning/64px/Warning 1st 64px.png" },
    "Rejected": { bg: "bg-error-100 dark:bg-error-500/15 border-error-400", text: "text-error-800 dark:text-error-300", icon: "/icon/UI/X/64px/X 1st 64px.png" },
};

const AiStatusBadge = ({ status }: { status: AiVerdict }) => {
    const s = AI_STATUS_STYLES[status];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-black border-2 rounded-full ${s.bg} ${s.text}`}>
            <Bot className="w-3 h-3" aria-hidden="true" />
            {s.icon && <img src={s.icon} alt="" className="w-3 h-3 object-contain" />}
            {status}
        </span>
    );
};

// ── PROOF CARD ────────────────────────────────────────────────────────────────
interface ProofCardProps {
    proof: ProofDto;
    onApprove: (id: number) => void;
    onReject: (proof: ProofDto) => void;
    onCompare: (proof: ProofDto) => void;
    actionLoading: boolean;
    isSelected: boolean;
    onToggleSelect: (id: number) => void;
}

const ProofCard = ({ proof, onApprove, onReject, onCompare, actionLoading, isSelected, onToggleSelect }: ProofCardProps) => {
    const { t } = useTranslation();
    const isSuspicious = proof.status === "Suspicious" || proof.status === "AiChecking" || proof.aiStatus === "Suspicious";
    const hasMedia = proof.mediaUrls && proof.mediaUrls.length > 0;
    const isOverdue = proof.deadlineAt && new Date(proof.deadlineAt) < new Date();

    return (
        <div className={[
            "relative bg-gray-25 dark:bg-gray-800 border-4 rounded-2xl overflow-hidden flex flex-col",
            isSuspicious ? `border-error-500 ${flagGlow}` : `${inkBorder} ${shadowMd}`,
        ].join(" ")}>
            <label className="absolute top-3 left-3 z-10 flex items-center justify-center">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(proof.proofId)}
                    aria-label={t("mentor.proofQueue.grid.selectAria")}
                    className={`w-5 h-5 rounded-md border-[3px] ${inkBorder} accent-orange-500 bg-gray-25 cursor-pointer`}
                />
            </label>

            {isSuspicious && (
                <div className="bg-error-500 text-white text-center py-1.5 text-[11px] font-black tracking-wide uppercase inline-flex items-center justify-center gap-1.5 w-full">
                    <img src="/icon/UI/Warning/64px/Warning White 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> {t("mentor.proofQueue.grid.aiWarningTag")}
                </div>
            )}

            {hasMedia ? (
                <button
                    type="button"
                    onClick={() => onCompare(proof)}
                    className="relative w-full h-64 bg-gray-100 dark:bg-gray-900 overflow-hidden group cursor-zoom-in"
                    title={t("mentor.proofQueue.grid.viewComparison")}
                >
                    <img
                        src={proof.mediaUrls[0]}
                        alt="Proof"
                        className={`w-full h-full object-cover transition-transform duration-300 ${easeExpo} group-hover:scale-105 ${isSuspicious ? "blur-sm" : ""}`}
                        onError={(e) => { (e.target as HTMLImageElement).src = ""; }}
                    />
                    <div className="absolute inset-0 bg-game-outline/0 group-hover:bg-game-outline/30 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-25 border-2 border-game-outline rounded-full text-xs font-black">
                            <img src="/icon/Main/Magnifying Glass/64w/Magnifying Glass 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> {t("mentor.proofQueue.grid.viewComparison")}
                        </span>
                    </div>
                    {isSuspicious && (
                        <div className="absolute inset-0 flex items-center justify-center bg-error-900/30">
                            <span className="inline-flex items-center gap-1.5 bg-warning-400 border-2 border-game-outline rounded-full px-3 py-1 text-xs font-black text-gray-900">
                                <Bot className="w-3.5 h-3.5" aria-hidden="true" /> {t("mentor.proofQueue.aiFlagged")}
                            </span>
                        </div>
                    )}
                    {proof.mediaUrls.length > 1 && (
                        <span className="absolute bottom-2 right-2 bg-game-outline/80 text-white text-xs font-black px-2 py-0.5 rounded-full">
                            +{proof.mediaUrls.length - 1} more
                        </span>
                    )}
                </button>
            ) : (
                <div className="w-full h-24 bg-gray-50 dark:bg-gray-900 flex items-center justify-center border-b-2 border-gray-200 dark:border-gray-700">
                    <span className="text-gray-400 text-xs font-bold">{t("mentor.proofQueue.noMedia")}</span>
                </div>
            )}

            <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="font-black text-sm truncate">{proof.questTitle ?? `Quest #${proof.questId}`}</p>
                        <p className="text-xs text-gray-500 font-medium truncate">by <strong>{proof.username ?? `User #${proof.userId}`}</strong></p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 text-xs font-black border-2 rounded-full ${isSuspicious ? "bg-warning-100 dark:bg-warning-500/15 border-warning-400 text-warning-800 dark:text-warning-300" : "bg-teal-100 dark:bg-teal-500/15 border-teal-400 text-teal-800 dark:text-teal-300"
                        }`}>
                        {proof.status}
                    </span>
                </div>

                <div className="flex flex-wrap gap-1.5 items-center">
                    {proof.aiStatus && proof.aiStatus !== "Not Used" && (
                        <AiStatusBadge status={proof.aiStatus} />
                    )}
                    {proof.reviewType && (
                        <span className={`px-2 py-0.5 text-xs font-bold border-2 rounded-full ${proof.reviewType === "AI + Mentor"
                            ? "bg-purple-100 dark:bg-purple-500/15 border-purple-400 text-purple-700 dark:text-purple-300"
                            : "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300"
                            }`}>
                            {proof.reviewType}
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-gray-500 font-medium">
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-full">{proof.proofType}</span>
                    <span>{new Date(proof.submittedAt).toLocaleString()}</span>
                    {proof.deadlineMet && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-success-100 dark:bg-success-500/15 border-2 border-success-300 dark:border-success-500/40 rounded-full text-success-700 dark:text-success-300">
                            {t("mentor.proofQueue.onTime")} <img src="/icon/UI/Checkmark/64px/Checkmark 1st 64px.png" alt="" className="w-3 h-3 object-contain" />
                        </span>
                    )}
                </div>

                {proof.deadlineAt && (
                    <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-lg border ${isOverdue
                        ? "bg-error-50 dark:bg-error-500/15 border-error-300 text-error-600 dark:text-error-300"
                        : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500"
                        }`}>
                        <img
                            src={isOverdue ? "/icon/UI/Warning/64px/Warning 1st 64px.png" : "/icon/Item/Clock/64px/Clock 1st 64px.png"}
                            alt=""
                            className="w-3.5 h-3.5 object-contain"
                        />
                        {isOverdue ? "Overdue" : "Deadline"}:{" "}
                        {new Date(proof.deadlineAt).toLocaleString()}
                    </div>
                )}

                {proof.textNote && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 italic line-clamp-2">
                        "{proof.textNote}"
                    </p>
                )}

                <div className="flex gap-2 mt-auto pt-2">
                    <button
                        onClick={() => onApprove(proof.proofId)}
                        disabled={actionLoading}
                        className={`flex-1 py-2.5 border-2 ${inkBorder} rounded-full font-black text-sm bg-brand-400 text-game-outline ${shadowSm} ${btnPress} inline-flex items-center justify-center gap-1.5`}
                    >
                        {actionLoading
                            ? <Spinner size={14} />
                            : <><img src="/icon/UI/Checkmark/64px/Checkmark 1st 64px.png" alt="" className="w-4 h-4 object-contain" /> {t("mentor.proofQueue.approve")}</>
                        }
                    </button>
                    <button
                        onClick={() => onReject(proof)}
                        disabled={actionLoading}
                        className={`flex-1 py-2.5 border-2 ${inkBorder} rounded-full font-black text-sm bg-error-400 text-white ${shadowSm} ${btnPress} inline-flex items-center justify-center gap-1.5`}
                    >
                        <img src="/icon/UI/X/64px/X 1st 64px.png" alt="" className="w-4 h-4 object-contain" /> {t("mentor.proofQueue.reject")}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── FILTER BAR ────────────────────────────────────────────────────────────────
type QueueFilter = "all" | "flagged" | "recent";

const FilterBar = ({ filter, onChange }: { filter: QueueFilter; onChange: (f: QueueFilter) => void }) => {
    const { t } = useTranslation();
    const options: { key: QueueFilter; label: string; icon: React.ReactNode }[] = [
        { key: "all", label: t("mentor.proofQueue.grid.filterAll"), icon: null },
        { key: "flagged", label: t("mentor.proofQueue.grid.filterFlagged"), icon: <Bot className="w-3.5 h-3.5" aria-hidden="true" /> },
        { key: "recent", label: t("mentor.proofQueue.grid.filterRecent"), icon: <img src="/icon/Item/Clock/64px/Clock 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> },
    ];
    return (
        <div className="flex flex-wrap gap-2">
            {options.map((o) => {
                const isActive = filter === o.key;
                return (
                    <button
                        key={o.key}
                        type="button"
                        onClick={() => onChange(o.key)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 border-[3px] ${inkBorder} rounded-full text-xs font-black transition-all duration-150 ${easeExpo} ${
                            isActive ? "bg-orange-500 text-white shadow-none translate-x-0.5 translate-y-0.5" : `bg-gray-25 dark:bg-gray-800 text-gray-700 dark:text-gray-200 ${shadowSm} hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5`
                        }`}
                    >
                        {o.icon}
                        {o.label}
                    </button>
                );
            })}
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
    onCompare: (proof: ProofDto) => void;
    actionLoading: number | null;
    emptyIcon: React.ReactNode;
    emptyText: string;
    isAiQueue?: boolean;
    selectedIds: Set<number>;
    onToggleSelect: (id: number) => void;
}

const QueueSection = ({
    title, count, proofs, loading, onApprove, onReject, onCompare,
    actionLoading, emptyIcon, emptyText, isAiQueue = false, selectedIds, onToggleSelect,
}: QueueSectionProps) => {
    const { t } = useTranslation();
    return (
        <div>
            <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xl font-black text-gray-900">{title}</h2>
                <span className={`px-3 py-1 text-sm font-black border-2 ${inkBorder} rounded-full ${isAiQueue ? "bg-purple-400 text-white" : "bg-teal-500 text-white"
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
                <div className={`flex flex-col items-center justify-center py-14 gap-3 bg-gray-25 dark:bg-gray-800 border-[3px] border-dashed ${inkBorder} rounded-2xl`}>
                    <span className={`flex items-center justify-center w-16 h-16 rounded-full border-[3px] ${inkBorder} bg-orange-100 dark:bg-orange-500/15 text-orange-500 dark:text-orange-300`}>
                        {emptyIcon}
                    </span>
                    <p className="text-base font-black text-gray-600">{t("mentor.proofQueue.grid.mascotEmptyTitle")}</p>
                    <p className="text-sm font-medium text-gray-400">{emptyText || t("mentor.proofQueue.grid.mascotEmptySubtitle")}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {proofs.map((proof) => (
                        <ProofCard
                            key={proof.proofId}
                            proof={proof}
                            onApprove={onApprove}
                            onReject={onReject}
                            onCompare={onCompare}
                            actionLoading={actionLoading === proof.proofId}
                            isSelected={selectedIds.has(proof.proofId)}
                            onToggleSelect={onToggleSelect}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// ── TAB ───────────────────────────────────────────────────────────────────────
type QueueTab = "manual" | "ai";

export default function ProofsTab() {
    const { partyId } = useOutletContext<PartyWorkspaceContext>();
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

    // ── Party scoping — the queue endpoints are global (no partyId anywhere on
    // ProofDto or the request), so this is reconstructed via a client-side join
    // against this party's own quest IDs (getMentorQuests already supports a
    // partyId filter). Not fake scoping — an accurate join, just not a
    // server-side filter.
    const [partyQuestIds, setPartyQuestIds] = useState<Set<number> | null>(null);

    useEffect(() => {
        setPartyQuestIds(null);
        mentorApi.getMentorQuests(partyId).then((res) => {
            if (res.success) setPartyQuestIds(new Set((res.data ?? []).map((q) => q.questId)));
            else setPartyQuestIds(new Set());
        });
    }, [partyId]);

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

    // ── Filter bar (client-side; no new API calls) ───────────────────────────
    const [filter, setFilter] = useState<QueueFilter>("all");

    const isFlagged = (p: ProofDto) => p.status === "Suspicious" || p.status === "AiChecking" || p.aiStatus === "Suspicious";

    const applyFilter = useCallback((list: ProofDto[]) => {
        if (filter === "flagged") return list.filter(isFlagged);
        if (filter === "recent") return [...list].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        return list;
    }, [filter]);

    const visibleManual = useMemo(() => {
        if (!partyQuestIds) return [];
        return applyFilter(manualProofs.filter((p) => partyQuestIds.has(p.questId)));
    }, [manualProofs, applyFilter, partyQuestIds]);

    const visibleAi = useMemo(() => {
        if (!partyQuestIds) return [];
        return applyFilter(aiProofs.filter((p) => partyQuestIds.has(p.questId)));
    }, [aiProofs, applyFilter, partyQuestIds]);

    const scopingLoading = partyQuestIds === null;

    // ── Batch review — reuses handleApprove for every selected id ────────────
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [batchApproving, setBatchApproving] = useState(false);

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleApproveSelected = async () => {
        setBatchApproving(true);
        const ids = Array.from(selectedIds);
        for (const id of ids) {
            await handleApprove(id);
        }
        setSelectedIds(new Set());
        setBatchApproving(false);
    };

    const [compareTarget, setCompareTarget] = useState<ProofDto | null>(null);

    const totalCount = visibleManual.length + visibleAi.length;

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-black text-gray-900">{t("mentor.proofQueue.pendingReviews")}</h1>
                    <span className={`px-3 py-1 bg-teal-500 text-white text-sm font-black border-2 ${inkBorder} rounded-full`}>
                        {totalCount}
                    </span>
                </div>
                <button
                    onClick={fetchQueues}
                    disabled={loadingManual && loadingAi}
                    className={`px-4 py-2 border-2 ${inkBorder} rounded-full font-black text-sm bg-gray-25 dark:bg-gray-800 ${shadowSm} ${btnPress} inline-flex items-center gap-2`}
                >
                    {loadingManual || loadingAi ? <Spinner size={14} /> : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    )}
                    {t("mentor.proofQueue.refresh")}
                </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <FilterBar filter={filter} onChange={setFilter} />
                {selectedIds.size > 0 && (
                    <div className={`flex items-center gap-3 px-3 py-2 border-[3px] ${inkBorder} rounded-full bg-orange-50 dark:bg-orange-500/15 ${shadowSm}`}>
                        <span className="text-xs font-black text-orange-700 dark:text-orange-300">
                            {t("mentor.proofQueue.grid.selectedCount", { count: selectedIds.size })}
                        </span>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            disabled={batchApproving}
                            className="text-xs font-bold text-gray-500 hover:text-gray-700 disabled:opacity-50"
                        >
                            {t("mentor.proofQueue.grid.clearSelection")}
                        </button>
                        <button
                            onClick={handleApproveSelected}
                            disabled={batchApproving}
                            className={`px-3 py-1.5 border-2 ${inkBorder} rounded-full font-black text-xs bg-brand-400 text-game-outline ${shadowSm} ${btnPress} inline-flex items-center gap-1.5`}
                        >
                            {batchApproving ? <><Spinner size={12} /> {t("mentor.proofQueue.grid.approvingSelected")}</> : <><img src="/icon/UI/Checkmark/64px/Checkmark 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> {t("mentor.proofQueue.grid.approveSelected")}</>}
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <div className="mb-6 p-4 bg-error-100 dark:bg-error-500/15 border-4 border-error-400 rounded-2xl font-bold text-error-700 dark:text-error-300">
                    {error}
                </div>
            )}

            <div className={`flex gap-2 mb-6 border-b-4 ${inkBorder} pb-0`}>
                {(["manual", "ai"] as QueueTab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-black border-2 ${inkBorder} rounded-t-xl transition-all ${activeTab === tab
                            ? tab === "ai"
                                ? "bg-purple-500 text-white -mb-0.5"
                                : "bg-teal-500 text-white -mb-0.5"
                            : "bg-gray-25 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            }`}
                    >
                        {tab === "manual"
                            ? <img src="/icon/Player/Player/64px/Player 1st 64px.png" alt="" className="w-4 h-4 object-contain" />
                            : <Bot className="w-4 h-4" aria-hidden="true" />}
                        {tab === "manual" ? t("Manual") : t("AI")}
                        <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-black/20">
                            {tab === "manual" ? visibleManual.length : visibleAi.length}
                        </span>
                    </button>
                ))}
            </div>

            {activeTab === "manual" ? (
                <QueueSection
                    title={t("Manual Review Queue")}
                    count={visibleManual.length}
                    proofs={visibleManual}
                    loading={loadingManual || scopingLoading}
                    onApprove={handleApprove}
                    onReject={setRejectTarget}
                    onCompare={setCompareTarget}
                    actionLoading={actionLoading}
                    emptyIcon={<UserRoundPen className="w-5 h-5" />}
                    emptyText={t("Manual review queue is empty. All proofs have been reviewed!")}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                />
            ) : (
                <QueueSection
                    title={t("AI Review Queue")}
                    count={visibleAi.length}
                    proofs={visibleAi}
                    loading={loadingAi || scopingLoading}
                    onApprove={handleApprove}
                    onReject={setRejectTarget}
                    onCompare={setCompareTarget}
                    actionLoading={actionLoading}
                    emptyIcon={<Bot className="w-5 h-5" />}
                    emptyText={t("AI review queue is empty. All proofs have been reviewed!")}
                    isAiQueue
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                />
            )}

            {rejectTarget && (
                <RejectModal
                    proof={rejectTarget}
                    onClose={() => setRejectTarget(null)}
                    onRejected={handleRejected}
                />
            )}

            {compareTarget && (
                <ComparisonModal
                    proof={compareTarget}
                    onClose={() => setCompareTarget(null)}
                />
            )}
        </>
    );
}

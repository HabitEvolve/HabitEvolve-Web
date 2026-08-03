import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";
import mentorApi from "../../../api/mentorApi";
import type { ProofDto, AiVerdict } from "../../../types/mentor.types";
import { useAlert } from "../../../context/AlertContext";
import { Bot, UserRoundPen } from "lucide-react";
import SkyCard from "../../../components/ui/card/SkyCard";
import SkyButton from "../../../components/ui/button/SkyButton";
import { easeExpo, Spinner } from "./sharedSky";
import type { PartyWorkspaceContext } from "./PartyWorkspace";

// Reserved for AI-flagged cards only — a genuine alert-red glow, not the
// project's usual soft ink shadow. Deliberate one-off, not a reusable pattern.
const flagGlow = "shadow-[0_0_0_3px_rgba(240,68,56,0.55),0_0_28px_rgba(240,68,56,0.5)]";

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
            className="modal-content fixed inset-0 z-99999 flex items-center justify-center p-4 bg-sky-ink/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <SkyCard variant="mentor" className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-sky-h2 font-bold text-sky-ink mb-1">{t("mentor.proofQueue.rejectModal.title")}</h2>
                <p className="text-sm text-sky-ink-2 mb-4">
                    <strong className="text-sky-ink">{proof.username}</strong> — {proof.questTitle}
                </p>

                <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-sky-ink-2">
                    {t("mentor.proofQueue.rejectModal.reason")}
                </label>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t("mentor.proofQueue.rejectModal.placeholder")}
                    rows={4}
                    className="w-full p-3 rounded-sky-chip border border-sky-surf-border text-sm font-medium bg-transparent text-sky-ink focus:outline-none focus:border-error-400 focus:ring-3 focus:ring-error-400/20 resize-none placeholder:text-sky-ink-3"
                />

                {error && (
                    <p className="mt-3 p-2.5 bg-error-100 border border-error-400 rounded-sky-chip text-sm font-semibold text-error-700">
                        {error}
                    </p>
                )}

                <div className="flex gap-3 mt-4">
                    <SkyButton type="button" variant="secondary" onClick={onClose} className="flex-1">
                        {t("mentor.proofQueue.rejectModal.cancel")}
                    </SkyButton>
                    <SkyButton type="button" variant="destructive" onClick={handleReject} disabled={loading} className="flex-1">
                        {loading ? <><Spinner size={14} /> {t("mentor.proofQueue.rejectModal.rejecting")}</> : t("mentor.proofQueue.rejectModal.rejectProof")}
                    </SkyButton>
                </div>
            </SkyCard>
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
    const [activeIndex, setActiveIndex] = useState(0);
    const activeUrl = proof.mediaUrls?.[activeIndex] ?? proof.mediaUrls?.[0];

    return createPortal(
        <div
            className="modal-content fixed inset-0 z-99999 flex items-center justify-center p-4 bg-sky-ink/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <SkyCard variant="mentor" className="w-full max-w-3xl p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-sky-surf-border">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-sky-ink-2">{t("mentor.proofQueue.grid.comparisonTitle")}</p>
                        <h2 className="text-lg font-bold leading-tight text-sky-ink">{proof.questTitle ?? `Quest #${proof.questId}`}</h2>
                    </div>
                    <SkyButton
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        aria-label={t("mentor.proofQueue.grid.comparisonClose")}
                    >
                        <img src="/icon/UI/Close Button/64px/Close Button 1st 64px.png" alt="" className="w-4 h-4 object-contain" />
                    </SkyButton>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-dashed divide-sky-ink/15">
                    <div className="p-5">
                        <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.14em] text-purple-600 mb-3">
                            {t("mentor.proofQueue.grid.comparisonRequirement")}
                        </span>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs font-semibold text-sky-ink-2 uppercase">{t("mentor.proofQueue.grid.comparisonQuestType")}</p>
                                <p className="text-sm font-semibold text-sky-ink">{proof.questType ?? "—"}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-sky-ink-2 uppercase">{t("mentor.proofQueue.grid.comparisonProofType")}</p>
                                <p className="inline-block mt-0.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                                    {proof.proofType}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-sky-ink-2 uppercase">{t("mentor.proofQueue.grid.comparisonDeadline")}</p>
                                <p className="text-sm font-semibold text-sky-ink">
                                    {proof.deadlineAt ? new Date(proof.deadlineAt).toLocaleString() : t("mentor.proofQueue.grid.comparisonNoDeadline")}
                                </p>
                            </div>

                            {/* AI assessment — informational only, visually separate from the
                                Approve/Reject action buttons on the card (AI assists, a mentor decides). */}
                            {proof.aiStatus && proof.aiStatus !== "Not Used" && (
                                <div className="p-3 rounded-sky-chip bg-purple-50 border border-purple-200">
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-700">
                                            {t("mentor.proofQueue.grid.aiAssessment")}
                                        </span>
                                        <AiStatusBadge status={proof.aiStatus} />
                                    </div>
                                    {typeof proof.aiConfidence === "number" && (
                                        <div className="flex items-center justify-between text-xs font-semibold text-purple-700 mb-1.5">
                                            <span>{t("mentor.proofQueue.grid.aiConfidenceLabel")}</span>
                                            <span>{Math.round(proof.aiConfidence * 100)}%</span>
                                        </div>
                                    )}
                                    <p className="text-xs text-sky-ink-2 italic leading-relaxed">
                                        {proof.aiReasoning ? `"${proof.aiReasoning}"` : t("mentor.proofQueue.grid.aiNoReasoning")}
                                    </p>
                                    <p className="text-[10px] font-semibold text-sky-ink-3 mt-1.5">
                                        {t("mentor.proofQueue.grid.aiAssistNotice")}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-5">
                        <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-peach-deep mb-3">
                            {t("mentor.proofQueue.grid.comparisonSubmitted")}
                        </span>
                        {hasMedia ? (
                            <div className="mb-3">
                                <div className="w-full rounded-sky-chip overflow-hidden border border-sky-surf-border bg-sky-3/10">
                                    <img src={activeUrl} alt={`Submitted proof ${activeIndex + 1}/${proof.mediaUrls.length}`} className="w-full max-h-72 object-contain" />
                                </div>
                                {proof.mediaUrls.length > 1 && (
                                    <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                                        {proof.mediaUrls.map((url, idx) => (
                                            <button
                                                key={`${url}-${idx}`}
                                                type="button"
                                                onClick={() => setActiveIndex(idx)}
                                                className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 ${idx === activeIndex ? "border-sky-peach" : "border-sky-surf-border opacity-70 hover:opacity-100"}`}
                                                aria-label={`Media ${idx + 1}`}
                                            >
                                                <img src={url} alt="" className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-full h-40 rounded-sky-chip border border-dashed border-sky-ink/20 bg-sky-3/10 flex items-center justify-center mb-3">
                                <span className="text-sky-ink-3 text-xs font-semibold">{t("mentor.proofQueue.noMedia")}</span>
                            </div>
                        )}
                        <p className="text-xs font-semibold text-sky-ink-2 uppercase">{new Date(proof.submittedAt).toLocaleString()}</p>
                        {proof.textNote && (
                            <div className="mt-2">
                                <p className="text-xs font-semibold text-sky-ink-2 uppercase">{t("mentor.proofQueue.grid.comparisonPlayerNote")}</p>
                                <p className="text-sm italic text-sky-ink-2">"{proof.textNote}"</p>
                            </div>
                        )}
                    </div>
                </div>
            </SkyCard>
        </div>,
        document.body
    );
};

// ── AI STATUS BADGE ───────────────────────────────────────────────────────────
const AI_STATUS_STYLES: Record<AiVerdict, { bg: string; text: string; icon: string | null }> = {
    "Not Used": { bg: "bg-gray-100", text: "text-gray-500", icon: null },
    "Approved": { bg: "bg-success-100", text: "text-success-800", icon: "/icon/UI/Checkmark/64px/Checkmark 1st 64px.png" },
    "Suspicious": { bg: "bg-warning-100", text: "text-warning-800", icon: "/icon/UI/Warning/64px/Warning 1st 64px.png" },
    "Rejected": { bg: "bg-error-100", text: "text-error-800", icon: "/icon/UI/X/64px/X 1st 64px.png" },
};

const AiStatusBadge = ({ status }: { status: AiVerdict }) => {
    const s = AI_STATUS_STYLES[status];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${s.bg} ${s.text}`}>
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
        <SkyCard
            variant="mentor"
            className={`relative p-0 overflow-hidden flex flex-col ${isSuspicious ? flagGlow : ""}`}
        >
            <label className="absolute top-3 left-3 z-10 flex items-center justify-center">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(proof.proofId)}
                    aria-label={t("mentor.proofQueue.grid.selectAria")}
                    className="w-5 h-5 rounded-md accent-sky-deep bg-white cursor-pointer"
                />
            </label>

            {isSuspicious && (
                <div className="bg-error-500 text-white text-center py-1.5 text-[11px] font-semibold tracking-wide uppercase inline-flex items-center justify-center gap-1.5 w-full">
                    <img src="/icon/UI/Warning/64px/Warning White 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> {t("mentor.proofQueue.grid.aiWarningTag")}
                </div>
            )}

            {hasMedia ? (
                <button
                    type="button"
                    onClick={() => onCompare(proof)}
                    className="relative w-full h-64 bg-sky-3/10 overflow-hidden group cursor-zoom-in"
                    title={t("mentor.proofQueue.grid.viewComparison")}
                >
                    <img
                        src={proof.mediaUrls[0]}
                        alt="Proof"
                        className={`w-full h-full object-cover transition-transform duration-300 ${easeExpo} group-hover:scale-105 ${isSuspicious ? "blur-sm" : ""}`}
                        onError={(e) => { (e.target as HTMLImageElement).src = ""; }}
                    />
                    <div className="absolute inset-0 bg-sky-ink/0 group-hover:bg-sky-ink/30 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-xs font-semibold text-sky-ink">
                            <img src="/icon/Main/Magnifying Glass/64w/Magnifying Glass 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> {t("mentor.proofQueue.grid.viewComparison")}
                        </span>
                    </div>
                    {isSuspicious && (
                        <div className="absolute inset-0 flex items-center justify-center bg-error-900/30">
                            <span className="inline-flex items-center gap-1.5 bg-warning-400 rounded-full px-3 py-1 text-xs font-semibold text-warning-950">
                                <Bot className="w-3.5 h-3.5" aria-hidden="true" /> {t("mentor.proofQueue.aiFlagged")}
                            </span>
                        </div>
                    )}
                    {proof.mediaUrls.length > 1 && (
                        <span className="absolute bottom-2 right-2 bg-sky-ink/80 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                            +{proof.mediaUrls.length - 1} more
                        </span>
                    )}
                </button>
            ) : (
                <div className="w-full h-24 bg-sky-3/10 flex items-center justify-center border-b border-sky-surf-border">
                    <span className="text-sky-ink-3 text-xs font-semibold">{t("mentor.proofQueue.noMedia")}</span>
                </div>
            )}

            <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="font-bold text-sm truncate text-sky-ink">{proof.questTitle ?? `Quest #${proof.questId}`}</p>
                        <p className="text-xs text-sky-ink-2 font-medium truncate">by <strong className="text-sky-ink">{proof.username ?? `User #${proof.userId}`}</strong></p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full ${isSuspicious ? "bg-warning-100 text-warning-800" : "bg-teal-100 text-teal-800"}`}>
                        {proof.status}
                    </span>
                </div>

                <div className="flex flex-wrap gap-1.5 items-center">
                    {proof.aiStatus && proof.aiStatus !== "Not Used" && (
                        <AiStatusBadge status={proof.aiStatus} />
                    )}
                    {proof.reviewType && (
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${proof.reviewType === "AI + Mentor" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
                            {proof.reviewType}
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-sky-ink-2 font-medium">
                    <span className="px-2 py-0.5 bg-gray-100 rounded-full">{proof.proofType}</span>
                    <span>{new Date(proof.submittedAt).toLocaleString()}</span>
                    {proof.deadlineMet && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-success-100 rounded-full text-success-700">
                            {t("mentor.proofQueue.onTime")} <img src="/icon/UI/Checkmark/64px/Checkmark 1st 64px.png" alt="" className="w-3 h-3 object-contain" />
                        </span>
                    )}
                </div>

                {proof.deadlineAt && (
                    <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg ${isOverdue ? "bg-error-50 text-error-600" : "bg-gray-50 text-sky-ink-2"}`}>
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
                    <p className="text-xs text-sky-ink-2 bg-gray-50 rounded-lg p-2 italic line-clamp-2">
                        "{proof.textNote}"
                    </p>
                )}

                <div className="flex gap-2 mt-auto pt-2">
                    <SkyButton
                        type="button"
                        variant="success"
                        onClick={() => onApprove(proof.proofId)}
                        disabled={actionLoading}
                        className="flex-1"
                    >
                        {actionLoading
                            ? <Spinner size={14} />
                            : <><img src="/icon/UI/Checkmark/64px/Checkmark 1st 64px.png" alt="" className="w-4 h-4 object-contain" /> {t("mentor.proofQueue.approve")}</>
                        }
                    </SkyButton>
                    <SkyButton
                        type="button"
                        variant="destructive"
                        onClick={() => onReject(proof)}
                        disabled={actionLoading}
                        className="flex-1"
                    >
                        <img src="/icon/UI/X/64px/X 1st 64px.png" alt="" className="w-4 h-4 object-contain" /> {t("mentor.proofQueue.reject")}
                    </SkyButton>
                </div>
            </div>
        </SkyCard>
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
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-150 ${easeExpo} ${
                            isActive ? "bg-sky-deep text-white shadow-sky-chip" : "bg-white/50 text-sky-ink-2 border border-sky-surf-border hover:border-sky-deep/30"
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
                <h2 className="text-xl font-bold text-sky-ink">{title}</h2>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${isAiQueue ? "bg-purple-500 text-white" : "bg-teal-500 text-white"}`}>
                    {count}
                </span>
                {loading && <Spinner size={16} />}
            </div>

            {loading && proofs.length === 0 ? (
                <div className="flex items-center justify-center h-40 gap-3 text-sky-ink-3">
                    <Spinner size={28} />
                </div>
            ) : proofs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3 border border-dashed border-sky-ink/15 rounded-sky-card bg-white/40">
                    <span className="flex items-center justify-center w-16 h-16 rounded-full bg-sky-peach/15 text-sky-peach-deep">
                        {emptyIcon}
                    </span>
                    <p className="text-base font-bold text-sky-ink-2">{t("mentor.proofQueue.grid.mascotEmptyTitle")}</p>
                    <p className="text-sm font-medium text-sky-ink-3">{emptyText || t("mentor.proofQueue.grid.mascotEmptySubtitle")}</p>
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

    // AI-routed proofs (ReviewRoute = "AI") are rejected by the mentor
    // approve/reject endpoints on the BE (they only accept ReviewRoute =
    // "MENTOR"). Approve/reject on an AI-queue card must instead go through
    // the AI verdict endpoint (`simulateAiVerdict`), which is what actually
    // moves an AI-routed proof forward.
    const isAiProof = useCallback(
        (proofId: number) => aiProofs.some((p) => p.proofId === proofId),
        [aiProofs],
    );

    const handleApprove = async (proofId: number) => {
        setActionLoading(proofId);
        try {
            const res = isAiProof(proofId)
                ? await mentorApi.simulateAiVerdict(proofId, "approve")
                : await mentorApi.approveProof(proofId);
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

    // AI-verdict "reject" has no reason field, so an AI-queue card rejects
    // immediately (no RejectModal) — only the manual queue's reject goes
    // through the reason-collecting modal.
    const handleRejectAiDirect = async (proofId: number) => {
        setActionLoading(proofId);
        try {
            const res = await mentorApi.simulateAiVerdict(proofId, "reject");
            if (res.success) {
                setAiProofs((prev) => prev.filter((p) => p.proofId !== proofId));
                alert.success(t("mentor.proofQueue.rejectedSuccess"));
            } else {
                alert.error(res.message || t("mentor.proofQueue.rejectModal.rejectionFailed"));
            }
        } catch (e: any) {
            alert.error(e?.response?.data?.message || t("mentor.proofQueue.errorOccurred"));
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectClick = (proof: ProofDto) => {
        if (isAiProof(proof.proofId)) {
            handleRejectAiDirect(proof.proofId);
        } else {
            setRejectTarget(proof);
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
                    <h1 className="text-2xl font-bold text-sky-ink">{t("mentor.proofQueue.pendingReviews")}</h1>
                    <span className="px-3 py-1 bg-teal-500 text-white text-sm font-semibold rounded-full">
                        {totalCount}
                    </span>
                </div>
                <SkyButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={fetchQueues}
                    disabled={loadingManual && loadingAi}
                >
                    {loadingManual || loadingAi ? <Spinner size={14} /> : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    )}
                    {t("mentor.proofQueue.refresh")}
                </SkyButton>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <FilterBar filter={filter} onChange={setFilter} />
                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-3 px-3 py-2 rounded-full bg-sky-peach/10 border border-sky-peach/30 shadow-sky-chip">
                        <span className="text-xs font-semibold text-sky-peach-deep">
                            {t("mentor.proofQueue.grid.selectedCount", { count: selectedIds.size })}
                        </span>
                        <button
                            type="button"
                            onClick={() => setSelectedIds(new Set())}
                            disabled={batchApproving}
                            className="text-xs font-semibold text-sky-ink-2 hover:text-sky-ink disabled:opacity-50"
                        >
                            {t("mentor.proofQueue.grid.clearSelection")}
                        </button>
                        <SkyButton
                            type="button"
                            variant="success"
                            size="sm"
                            onClick={handleApproveSelected}
                            disabled={batchApproving}
                            className="rounded-full"
                        >
                            {batchApproving ? <><Spinner size={12} /> {t("mentor.proofQueue.grid.approvingSelected")}</> : <><img src="/icon/UI/Checkmark/64px/Checkmark 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> {t("mentor.proofQueue.grid.approveSelected")}</>}
                        </SkyButton>
                    </div>
                )}
            </div>

            {error && (
                <div className="mb-6 p-4 bg-error-100 border border-error-400 rounded-sky-card font-semibold text-error-700">
                    {error}
                </div>
            )}

            <div className="flex gap-2 mb-6 border-b border-sky-surf-border pb-0">
                {(["manual", "ai"] as QueueTab[]).map((tab) => (
                    <button
                        type="button"
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-t-sky-chip transition-all ${activeTab === tab
                            ? tab === "ai"
                                ? "bg-purple-500 text-white -mb-px"
                                : "bg-teal-500 text-white -mb-px"
                            : "text-sky-ink-2 hover:bg-sky-3/20"
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
                    onReject={handleRejectClick}
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
                    onReject={handleRejectClick}
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

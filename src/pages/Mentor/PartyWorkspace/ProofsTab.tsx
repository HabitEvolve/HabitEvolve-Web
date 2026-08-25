import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";
import mentorApi from "../../../api/mentorApi";
import type { ProofDto, AiVerdict } from "../../../types/mentor.types";
import { useAlert } from "../../../context/AlertContext";
import {
    UserRoundPen, X, Check, AlertTriangle, Clock, ShieldQuestion,
    RefreshCw, Inbox, ZoomIn, MinusCircle, History, Video,
} from "lucide-react";
import SkyCard from "../../../components/ui/card/SkyCard";
import SkyButton from "../../../components/ui/button/SkyButton";
import StatusBadge from "../../../components/common/StatusBadge";
import { FilterDropdown } from "../../../components/common/FilterDropdown";
import ProofMedia, { isVideoUrl } from "../../../components/common/ProofMedia";
import type { FilterField } from "../../../hooks/useTableFilters";
import { easeExpo, Spinner } from "./sharedSky";
import type { PartyWorkspaceContext } from "./PartyWorkspace";

// Reserved for AI-flagged cards only — a rose halo rather than the project's
// usual soft ink shadow. Deliberate one-off, not a reusable pattern: it is the
// single strongest visual signal on the page, so nothing else may borrow it.
const flagGlow = "shadow-[0_0_0_3px_rgba(196,112,138,0.5),0_0_28px_rgba(196,112,138,0.42)]";

const eyebrow = "text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3";
const fieldLabel = "text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3";

// A proof's `status` reads "Suspicious" for two different reasons: the AI itself was unsure
// (genuine flag), or the quest just has AI Check enabled — in which case every AI verdict,
// including "approve", gets forced through RouteToMentor() on the BE, which sets status to
// Suspicious regardless (see Proof.RouteToMentor). Without this, an AI-approved proof still
// shows the scary "AI SUSPICIOUS" banner/blur it doesn't deserve. `aiStatus` carries the AI's
// actual verdict, so defer to it whenever one exists.
const isFlaggedForReview = (proof: ProofDto) => {
    if (proof.aiStatus === "Suspicious") return true;
    if (proof.aiStatus === "Approved") return false;
    return proof.status === "Suspicious" || proof.status === "AiChecking";
};

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
            <SkyCard variant="mentor" className="w-full max-w-md sky-in" onClick={(e) => e.stopPropagation()}>
                {/* Rose rail — this modal only ever ends in a rejection. */}
                <span className="absolute left-0 top-6 bottom-6 w-1 rounded-r-full bg-sky-rose" aria-hidden="true" />

                <div className="relative flex items-start gap-3 mb-4">
                    <span className="grid place-items-center w-10 h-10 shrink-0 rounded-sky-chip bg-sky-rose/14 text-sky-rose-deep">
                        <MinusCircle className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <h2 className="font-display text-sky-h3 font-semibold text-sky-ink">{t("mentor.proofQueue.rejectModal.title")}</h2>
                        <p className="text-sm text-sky-ink-2 truncate">
                            <strong className="font-semibold text-sky-ink">{proof.username}</strong> — {proof.questTitle}
                        </p>
                    </div>
                </div>

                <label className={`relative block mb-2 ${fieldLabel}`}>
                    {t("mentor.proofQueue.rejectModal.reason")}
                </label>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t("mentor.proofQueue.rejectModal.placeholder")}
                    rows={4}
                    className="relative w-full p-3 rounded-sky-chip bg-white/70 ring-1 ring-white/80 text-sm font-medium text-sky-ink transition-shadow focus:outline-none focus:ring-2 focus:ring-sky-rose/45 resize-none placeholder:text-sky-ink-3"
                />

                {error && (
                    <p className="relative mt-3 inline-flex items-start gap-2 w-full p-2.5 rounded-sky-chip bg-sky-rose/12 ring-1 ring-sky-rose/28 text-sm font-semibold text-sky-rose-deep">
                        <AlertTriangle className="w-4 h-4 mt-px shrink-0" aria-hidden="true" /> {error}
                    </p>
                )}

                <div className="relative flex gap-3 mt-4">
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

const SpecRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <p className={fieldLabel}>{label}</p>
        <div className="mt-0.5 text-sm font-semibold text-sky-ink">{children}</div>
    </div>
);

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
            <SkyCard variant="mentor" className="w-full max-w-3xl p-0 overflow-hidden sky-in" onClick={(e) => e.stopPropagation()}>
                <div className="relative flex items-center justify-between gap-4 px-5 py-4 border-b border-sky-ink/10">
                    <div className="min-w-0">
                        <p className={eyebrow}>{t("mentor.proofQueue.grid.comparisonTitle")}</p>
                        <h2 className="font-display text-lg font-semibold leading-tight text-sky-ink truncate">{proof.questTitle ?? `Quest #${proof.questId}`}</h2>
                    </div>
                    <SkyButton
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        aria-label={t("mentor.proofQueue.grid.comparisonClose")}
                    >
                        <X className="w-4 h-4" />
                    </SkyButton>
                </div>

                {/* Two columns, violet (what was asked) against peach (what came
                    back) — a comparison, so neither side may read as a verdict. */}
                <div className="relative grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-dashed divide-sky-ink/15">
                    <div className="p-5">
                        <span className="inline-flex items-center gap-1.5 mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-violet-deep">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-violet" aria-hidden="true" />
                            {t("mentor.proofQueue.grid.comparisonRequirement")}
                        </span>
                        <div className="space-y-3">
                            <SpecRow label={t("mentor.proofQueue.grid.comparisonQuestType")}>{proof.questType ?? "—"}</SpecRow>
                            {proof.questHowToSubmit && (
                                <SpecRow label={t("mentor.proofQueue.grid.comparisonInstructions")}>
                                    <span className="whitespace-pre-line">{proof.questHowToSubmit}</span>
                                </SpecRow>
                            )}
                            <SpecRow label={t("mentor.proofQueue.grid.comparisonProofType")}>
                                <span className="inline-block px-2.5 py-1 rounded-sky-chip bg-sky-violet/14 text-xs font-semibold text-sky-violet-deep">
                                    {proof.proofType}
                                </span>
                            </SpecRow>
                            <SpecRow label={t("mentor.proofQueue.grid.comparisonDeadline")}>
                                <span className="tabular-nums">
                                    {proof.deadlineAt ? new Date(proof.deadlineAt).toLocaleString() : t("mentor.proofQueue.grid.comparisonNoDeadline")}
                                </span>
                            </SpecRow>

                            {/* AI assessment — informational only, visually separate from the
                                Approve/Reject action buttons on the card (AI assists, a mentor decides). */}
                            {proof.aiStatus && proof.aiStatus !== "Not Used" && (
                                <div className="p-3 rounded-sky-chip bg-sky-violet/8 ring-1 ring-sky-violet/22">
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-violet-deep">
                                            {t("mentor.proofQueue.grid.aiAssessment")}
                                        </span>
                                        <AiStatusBadge status={proof.aiStatus} />
                                    </div>
                                    {typeof proof.aiConfidence === "number" && (
                                        <div className="mb-2">
                                            <div className="flex items-center justify-between text-xs font-semibold text-sky-violet-deep mb-1">
                                                <span>{t("mentor.proofQueue.grid.aiConfidenceLabel")}</span>
                                                <span className="tabular-nums">{Math.round(proof.aiConfidence * 100)}%</span>
                                            </div>
                                            {/* Confidence as a bar as well as a number — the
                                                mentor should feel the strength at a glance. */}
                                            <div className="h-1.5 rounded-full bg-sky-ink/10 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-sky-violet transition-[width] duration-500"
                                                    style={{ width: `${Math.round(proof.aiConfidence * 100)}%` }}
                                                />
                                            </div>
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
                        <span className="inline-flex items-center gap-1.5 mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-peach-deep">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-peach" aria-hidden="true" />
                            {t("mentor.proofQueue.grid.comparisonSubmitted")}
                        </span>
                        {hasMedia ? (
                            <div className="mb-3">
                                <div className="w-full rounded-sky-chip overflow-hidden ring-1 ring-white/80 bg-sky-ink/6">
                                    <ProofMedia url={activeUrl} alt={`Submitted proof ${activeIndex + 1}/${proof.mediaUrls.length}`} className="w-full max-h-72 object-contain" />
                                </div>
                                {proof.mediaUrls.length > 1 && (
                                    <div className="flex gap-2 mt-2 overflow-x-auto pb-1 custom-scrollbar">
                                        {proof.mediaUrls.map((url, idx) => (
                                            <button
                                                key={`${url}-${idx}`}
                                                type="button"
                                                onClick={() => setActiveIndex(idx)}
                                                aria-current={idx === activeIndex}
                                                className={`shrink-0 w-14 h-14 rounded-sky-chip overflow-hidden transition-all duration-150 ${easeExpo} ${idx === activeIndex
                                                        ? "ring-2 ring-sky-peach-deep ring-offset-2 ring-offset-white/70"
                                                        : "ring-1 ring-white/80 opacity-65 hover:opacity-100"
                                                    }`}
                                                aria-label={`Media ${idx + 1}`}
                                            >
                                                {isVideoUrl(url) ? (
                                                    <span className="w-full h-full grid place-items-center bg-sky-ink/10 text-sky-ink-2">
                                                        <Video className="w-4 h-4" aria-hidden="true" />
                                                    </span>
                                                ) : (
                                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-full h-40 rounded-sky-chip border border-dashed border-sky-ink/20 bg-sky-ink/4 flex flex-col items-center justify-center gap-2 mb-3 text-sky-ink-3">
                                <Inbox className="w-5 h-5" aria-hidden="true" />
                                <span className="text-xs font-semibold">{t("mentor.proofQueue.noMedia")}</span>
                            </div>
                        )}
                        <p className={`tabular-nums ${fieldLabel}`}>{new Date(proof.submittedAt).toLocaleString()}</p>
                        {proof.textNote && (
                            <div className="mt-2">
                                <p className={fieldLabel}>{t("mentor.proofQueue.grid.comparisonPlayerNote")}</p>
                                <p className="mt-1 pl-3 border-l-2 border-sky-peach/45 text-sm italic text-sky-ink-2">"{proof.textNote}"</p>
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
// Delegates to the shared lifecycle StatusBadge. "Suspicious" isn't in its
// default STATUS_MAP (falls back to neutral), so tone/icon are pinned here to
// keep the original peach/AlertTriangle "needs a look" read instead of a flat
// neutral chip.
const AiStatusBadge = ({ status }: { status: AiVerdict }) => (
    <StatusBadge
        status={status}
        toneOverride={status === "Suspicious" ? "pending" : undefined}
        iconOverride={status === "Suspicious" ? AlertTriangle : undefined}
    />
);

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
    const isSuspicious = isFlaggedForReview(proof);
    const hasMedia = proof.mediaUrls && proof.mediaUrls.length > 0;
    const isOverdue = proof.deadlineAt && new Date(proof.deadlineAt) < new Date();

    return (
        <SkyCard
            variant="mentor"
            className={`relative p-0 overflow-hidden flex flex-col transition-shadow duration-300 ${isSuspicious ? flagGlow : ""
                } ${isSelected ? "ring-2 ring-sky-deep" : ""}`}
        >
            <label className="absolute top-3 left-3 z-10 grid place-items-center w-7 h-7 rounded-sky-chip bg-white/85 ring-1 ring-white shadow-sky-chip cursor-pointer">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(proof.proofId)}
                    aria-label={t("mentor.proofQueue.grid.selectAria")}
                    className="w-4 h-4 rounded accent-sky-deep cursor-pointer"
                />
            </label>

            {isSuspicious && (
                <div className="w-full inline-flex items-center justify-center gap-1.5 bg-linear-to-r from-sky-rose to-sky-rose-deep text-white text-center py-1.5 text-[11px] font-semibold tracking-[0.1em] uppercase">
                    <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> {t("mentor.proofQueue.grid.aiWarningTag")}
                </div>
            )}

            {hasMedia ? (
                <button
                    type="button"
                    onClick={() => onCompare(proof)}
                    className="relative w-full h-64 bg-sky-ink/6 overflow-hidden group cursor-zoom-in"
                    title={t("mentor.proofQueue.grid.viewComparison")}
                >
                    <img
                        src={proof.mediaUrls[0]}
                        alt="Proof"
                        className={`w-full h-full object-cover transition-transform duration-300 ${easeExpo} group-hover:scale-105 ${isSuspicious ? "blur-sm" : ""}`}
                        onError={(e) => { (e.target as HTMLImageElement).src = ""; }}
                    />
                    <div className="absolute inset-0 bg-sky-ink/0 group-hover:bg-sky-ink/35 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/92 rounded-sky-chip text-xs font-semibold text-sky-ink shadow-sky-chip">
                            <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" /> {t("mentor.proofQueue.grid.viewComparison")}
                        </span>
                    </div>
                    {proof.mediaUrls.length > 1 && (
                        <span className="absolute bottom-2 right-2 bg-sky-ink/78 text-white text-xs font-semibold px-2 py-0.5 rounded-sky-chip tabular-nums">
                            +{proof.mediaUrls.length - 1} more
                        </span>
                    )}
                </button>
            ) : (
                <div className="w-full h-24 bg-sky-ink/5 flex items-center justify-center gap-2 border-b border-sky-ink/10 text-sky-ink-3">
                    <Inbox className="w-4 h-4" aria-hidden="true" />
                    <span className="text-xs font-semibold">{t("mentor.proofQueue.noMedia")}</span>
                </div>
            )}

            <div className="relative p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="font-display text-sm font-semibold truncate text-sky-ink">{proof.questTitle ?? `Quest #${proof.questId}`}</p>
                        <p className="text-xs text-sky-ink-2 font-medium truncate">by <strong className="font-semibold text-sky-ink">{proof.username ?? `User #${proof.userId}`}</strong></p>
                    </div>
                    {/* Pending review is peach when flagged, cool blue otherwise —
                        it is a waiting state, so it never wears the success hue. The raw BE
                        status reads "Suspicious" even when the AI itself approved (that value
                        just means "AI Check routed this to you" — see isFlaggedForReview), so
                        once it's not actually flagged this shows a plain waiting label instead
                        of the alarming word. */}
                    <span className={`shrink-0 px-2 py-0.5 text-xs font-semibold rounded-sky-chip ${isSuspicious ? "bg-sky-peach/22 text-sky-peach-deep" : "bg-sky-deep/12 text-sky-deep"}`}>
                        {proof.status === "Suspicious" && !isSuspicious ? t("mentor.proofQueue.grid.pendingReviewLabel") : proof.status}
                    </span>
                </div>

                <div className="flex flex-wrap gap-1.5 items-center">
                    {proof.aiStatus && proof.aiStatus !== "Not Used" && (
                        <AiStatusBadge status={proof.aiStatus} />
                    )}
                    {proof.reviewType && (
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-sky-chip ${proof.reviewType === "AI + Mentor" ? "bg-sky-violet/14 text-sky-violet-deep" : "bg-sky-ink/8 text-sky-ink-2"}`}>
                            {proof.reviewType}
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 items-center text-xs text-sky-ink-2 font-medium">
                    <span className="px-2 py-0.5 rounded-sky-chip bg-sky-ink/7">{proof.proofType}</span>
                    <span className="tabular-nums">{new Date(proof.submittedAt).toLocaleString()}</span>
                    {proof.deadlineMet && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sky-chip bg-sky-teal-bg text-sky-teal">
                            <Check className="w-3 h-3" aria-hidden="true" /> {t("mentor.proofQueue.onTime")}
                        </span>
                    )}
                </div>

                {proof.deadlineAt && (
                    <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-sky-chip tabular-nums ${isOverdue ? "bg-sky-rose/12 text-sky-rose-deep" : "bg-sky-ink/6 text-sky-ink-2"}`}>
                        {isOverdue
                            ? <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            : <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                        {isOverdue ? "Overdue" : "Deadline"}:{" "}
                        {new Date(proof.deadlineAt).toLocaleString()}
                    </div>
                )}

                {proof.textNote && (
                    <p className="text-xs text-sky-ink-2 pl-3 border-l-2 border-sky-ink/12 italic line-clamp-2">
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
                            : <><Check className="w-4 h-4" /> {t("mentor.proofQueue.approve")}</>
                        }
                    </SkyButton>
                    <SkyButton
                        type="button"
                        variant="destructive"
                        onClick={() => onReject(proof)}
                        disabled={actionLoading}
                        className="flex-1"
                    >
                        <X className="w-4 h-4" /> {t("mentor.proofQueue.reject")}
                    </SkyButton>
                </div>
            </div>
        </SkyCard>
    );
};

// ── HISTORY CARD ──────────────────────────────────────────────────────────────
// Read-only record of a past decision — no Approve/Reject actions, since the
// verdict is already final. Tapping the thumbnail still opens the comparison
// view so a mentor can double-check what was submitted.
interface HistoryCardProps {
    proof: ProofDto;
    onCompare: (proof: ProofDto) => void;
}

const HistoryCard = ({ proof, onCompare }: HistoryCardProps) => {
    const { t } = useTranslation();
    const hasMedia = proof.mediaUrls && proof.mediaUrls.length > 0;
    const isApproved = proof.status === "Approved";

    return (
        <SkyCard variant="mentor" className="relative p-0 overflow-hidden flex flex-col">
            {hasMedia ? (
                <button
                    type="button"
                    onClick={() => onCompare(proof)}
                    className="relative w-full h-40 bg-sky-ink/6 overflow-hidden group cursor-zoom-in"
                    title={t("mentor.proofQueue.grid.viewComparison")}
                >
                    <img
                        src={proof.mediaUrls[0]}
                        alt="Proof"
                        className={`w-full h-full object-cover transition-transform duration-300 ${easeExpo} group-hover:scale-105 ${!isApproved ? "grayscale-[0.35]" : ""}`}
                        onError={(e) => { (e.target as HTMLImageElement).src = ""; }}
                    />
                    <div className="absolute inset-0 bg-sky-ink/0 group-hover:bg-sky-ink/35 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/92 rounded-sky-chip text-xs font-semibold text-sky-ink shadow-sky-chip">
                            <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" /> {t("mentor.proofQueue.grid.viewComparison")}
                        </span>
                    </div>
                </button>
            ) : (
                <div className="w-full h-16 bg-sky-ink/5 flex items-center justify-center gap-2 border-b border-sky-ink/10 text-sky-ink-3">
                    <Inbox className="w-4 h-4" aria-hidden="true" />
                    <span className="text-xs font-semibold">{t("mentor.proofQueue.noMedia")}</span>
                </div>
            )}

            <div className="relative p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="font-display text-sm font-semibold truncate text-sky-ink">{proof.questTitle ?? `Quest #${proof.questId}`}</p>
                        <p className="text-xs text-sky-ink-2 font-medium truncate">by <strong className="font-semibold text-sky-ink">{proof.username ?? `User #${proof.userId}`}</strong></p>
                    </div>
                    <StatusBadge status={proof.status} />
                </div>

                <div className="flex flex-wrap gap-2 items-center text-xs text-sky-ink-2 font-medium">
                    <span className="px-2 py-0.5 rounded-sky-chip bg-sky-ink/7">{proof.proofType}</span>
                    {proof.reviewedAt && (
                        <span className="tabular-nums">
                            {t("mentor.proofQueue.history.reviewedAt")}: {new Date(proof.reviewedAt).toLocaleString()}
                        </span>
                    )}
                </div>

                <p className="text-xs text-sky-ink-2">
                    {proof.reviewedByUserId
                        ? t("mentor.proofQueue.history.reviewedBy", { id: proof.reviewedByUserId })
                        : t("mentor.proofQueue.history.autoApproved")}
                </p>

                {!isApproved && (
                    <p className="text-xs text-sky-rose-deep pl-3 border-l-2 border-sky-rose/45 italic line-clamp-2">
                        "{proof.rejectReason || t("mentor.proofQueue.history.noReasonGiven")}"
                    </p>
                )}
            </div>
        </SkyCard>
    );
};

// ── FILTER BAR ────────────────────────────────────────────────────────────────
type QueueFilter = "all" | "flagged" | "recent";

const FilterBar = ({ filter, onChange }: { filter: QueueFilter; onChange: (f: QueueFilter) => void }) => {
    const { t } = useTranslation();
    const fields: FilterField[] = [
        {
            key: "queue",
            label: t("mentor.proofQueue.grid.filterAll"),
            type: "select",
            options: [
                { label: t("mentor.proofQueue.grid.filterFlagged"), value: "flagged" },
                { label: t("mentor.proofQueue.grid.filterRecent"), value: "recent" },
            ],
        },
    ];
    return (
        <FilterDropdown<{ queue: string }>
            fields={fields}
            filters={{ queue: filter === "all" ? "" : filter }}
            onFilterChange={(_, value) => onChange((value || "all") as QueueFilter)}
            onClear={() => onChange("all")}
            hasActiveFilters={filter !== "all"}
            align="left"
        />
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
    selectedIds: Set<number>;
    onToggleSelect: (id: number) => void;
}

const QueueSection = ({
    title, count, proofs, loading, onApprove, onReject, onCompare,
    actionLoading, emptyIcon, emptyText, selectedIds, onToggleSelect,
}: QueueSectionProps) => {
    const { t } = useTranslation();
    return (
        <div>
            <div className="flex items-center gap-3 mb-4">
                <h2 className="font-display text-xl font-semibold text-sky-ink">{title}</h2>
                <span className="inline-grid place-items-center min-w-7 h-7 px-2 text-sm font-display font-semibold rounded-sky-chip tabular-nums bg-sky-deep/12 text-sky-deep">
                    {count}
                </span>
                {loading && <Spinner size={16} />}
            </div>

            {loading && proofs.length === 0 ? (
                /* Skeletons in the grid's own shape — the page keeps its
                   silhouette while data lands instead of collapsing. */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="rounded-sky-card bg-white/45 ring-1 ring-white/65 overflow-hidden animate-pulse">
                            <div className="h-40 bg-sky-ink/7" />
                            <div className="p-4 space-y-2">
                                <div className="h-3.5 w-2/3 rounded-full bg-sky-ink/10" />
                                <div className="h-3 w-1/3 rounded-full bg-sky-ink/8" />
                                <div className="h-8 mt-3 rounded-sky-chip bg-sky-ink/7" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : proofs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3 rounded-sky-card border border-dashed border-sky-ink/15 bg-white/45">
                    {/* Teal — an empty queue is the good outcome here. */}
                    <span className="grid place-items-center w-16 h-16 rounded-full bg-sky-teal-bg text-sky-teal ring-1 ring-sky-teal/20">
                        {emptyIcon}
                    </span>
                    <p className="font-display text-base font-semibold text-sky-ink">{t("mentor.proofQueue.grid.mascotEmptyTitle")}</p>
                    <p className="text-sm font-medium text-sky-ink-2 max-w-sm text-center">{emptyText || t("mentor.proofQueue.grid.mascotEmptySubtitle")}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sky-stagger">
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

// ── HISTORY SECTION ───────────────────────────────────────────────────────────
interface HistorySectionProps {
    proofs: ProofDto[];
    loading: boolean;
    onCompare: (proof: ProofDto) => void;
}

const HistorySection = ({ proofs, loading, onCompare }: HistorySectionProps) => {
    const { t } = useTranslation();
    return (
        <div>
            <div className="flex items-center gap-3 mb-4">
                <h2 className="font-display text-xl font-semibold text-sky-ink">{t("mentor.proofQueue.history.title")}</h2>
                <span className="inline-grid place-items-center min-w-7 h-7 px-2 text-sm font-display font-semibold rounded-sky-chip tabular-nums bg-sky-ink/8 text-sky-ink-2">
                    {proofs.length}
                </span>
                {loading && <Spinner size={16} />}
            </div>

            {loading && proofs.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="rounded-sky-card bg-white/45 ring-1 ring-white/65 overflow-hidden animate-pulse">
                            <div className="h-28 bg-sky-ink/7" />
                            <div className="p-4 space-y-2">
                                <div className="h-3.5 w-2/3 rounded-full bg-sky-ink/10" />
                                <div className="h-3 w-1/3 rounded-full bg-sky-ink/8" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : proofs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3 rounded-sky-card border border-dashed border-sky-ink/15 bg-white/45">
                    <span className="grid place-items-center w-16 h-16 rounded-full bg-sky-deep/10 text-sky-deep ring-1 ring-sky-deep/20">
                        <History className="w-6 h-6" aria-hidden="true" />
                    </span>
                    <p className="font-display text-base font-semibold text-sky-ink">{t("mentor.proofQueue.history.mascotEmptyTitle")}</p>
                    <p className="text-sm font-medium text-sky-ink-2 max-w-sm text-center">{t("mentor.proofQueue.history.mascotEmptySubtitle")}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sky-stagger">
                    {proofs.map((proof) => (
                        <HistoryCard key={proof.proofId} proof={proof} onCompare={onCompare} />
                    ))}
                </div>
            )}
        </div>
    );
};

// ── TAB ───────────────────────────────────────────────────────────────────────
type QueueTab = "manual" | "history";

export default function ProofsTab() {
    const { partyId } = useOutletContext<PartyWorkspaceContext>();
    const { t } = useTranslation();
    const alert = useAlert();
    const [activeTab, setActiveTab] = useState<QueueTab>("manual");
    const [manualProofs, setManualProofs] = useState<ProofDto[]>([]);
    const [historyProofs, setHistoryProofs] = useState<ProofDto[]>([]);
    const [loadingManual, setLoadingManual] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [rejectTarget, setRejectTarget] = useState<ProofDto | null>(null);

    const fetchQueues = useCallback(async () => {
        setError(null);
        setLoadingManual(true);
        setLoadingHistory(true);
        try {
            const [manualRes, historyRes] = await Promise.all([
                mentorApi.getProofQueue(),
                mentorApi.getProofHistory(),
            ]);
            if (manualRes.success) setManualProofs(manualRes.data ?? []);
            if (historyRes.success) setHistoryProofs(historyRes.data ?? []);
            if (!manualRes.success) {
                setError(manualRes.message || t("mentor.proofQueue.failedToLoad"));
            }
        } catch (e: any) {
            setError(e?.response?.data?.message || t("mentor.proofQueue.errorOccurred"));
        } finally {
            setLoadingManual(false);
            setLoadingHistory(false);
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

    const handleRejectClick = (proof: ProofDto) => {
        setRejectTarget(proof);
    };

    const handleRejected = (proofId: number) => {
        setRejectTarget(null);
        setManualProofs((prev) => prev.filter((p) => p.proofId !== proofId));
        alert.success(t("mentor.proofQueue.rejectedSuccess"));
    };

    // ── Filter bar (client-side; no new API calls) ───────────────────────────
    const [filter, setFilter] = useState<QueueFilter>("all");

    const isFlagged = isFlaggedForReview;

    const applyFilter = useCallback((list: ProofDto[]) => {
        if (filter === "flagged") return list.filter(isFlagged);
        if (filter === "recent") return [...list].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        return list;
    }, [filter]);

    const visibleManual = useMemo(() => {
        if (!partyQuestIds) return [];
        return applyFilter(manualProofs.filter((p) => partyQuestIds.has(p.questId)));
    }, [manualProofs, applyFilter, partyQuestIds]);

    // History is already newest-reviewed-first from the BE — no filter bar applies here.
    const visibleHistory = useMemo(() => {
        if (!partyQuestIds) return [];
        return historyProofs.filter((p) => partyQuestIds.has(p.questId));
    }, [historyProofs, partyQuestIds]);

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

    const totalCount = visibleManual.length;

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                    <span className="grid place-items-center w-10 h-10 shrink-0 rounded-sky-chip bg-sky-deep/10 ring-1 ring-sky-deep/18 text-sky-deep">
                        <ShieldQuestion className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <h1 className="font-display text-2xl font-semibold text-sky-ink">{t("mentor.proofQueue.pendingReviews")}</h1>
                    <span className="inline-grid place-items-center min-w-7 h-7 px-2 rounded-sky-chip bg-sky-deep/12 text-sky-deep text-sm font-display font-semibold tabular-nums">
                        {totalCount}
                    </span>
                </div>
                <SkyButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={fetchQueues}
                    disabled={loadingManual}
                >
                    {loadingManual ? <Spinner size={14} /> : <RefreshCw className="w-4 h-4" />}
                    {t("mentor.proofQueue.refresh")}
                </SkyButton>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <FilterBar filter={filter} onChange={setFilter} />
                {selectedIds.size > 0 && (
                    /* Selection tray — peach, because a pending batch is
                       something demanding attention, not yet an outcome. */
                    <div className="flex items-center gap-3 px-3 py-2 rounded-sky-chip bg-sky-peach/12 ring-1 ring-sky-peach/30 shadow-sky-chip sky-in">
                        <span className="text-xs font-semibold text-sky-peach-deep tabular-nums">
                            {t("mentor.proofQueue.grid.selectedCount", { count: selectedIds.size })}
                        </span>
                        <button
                            type="button"
                            onClick={() => setSelectedIds(new Set())}
                            disabled={batchApproving}
                            className="text-xs font-semibold text-sky-ink-2 underline decoration-sky-ink/25 underline-offset-2 hover:text-sky-ink hover:decoration-sky-ink/50 disabled:opacity-50"
                        >
                            {t("mentor.proofQueue.grid.clearSelection")}
                        </button>
                        <SkyButton
                            type="button"
                            variant="success"
                            size="sm"
                            onClick={handleApproveSelected}
                            disabled={batchApproving}
                        >
                            {batchApproving ? <><Spinner size={12} /> {t("mentor.proofQueue.grid.approvingSelected")}</> : <><Check className="w-3.5 h-3.5" /> {t("mentor.proofQueue.grid.approveSelected")}</>}
                        </SkyButton>
                    </div>
                )}
            </div>

            {error && (
                <div className="relative mb-6 overflow-hidden rounded-sky-card sky-glass p-4 pl-5">
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" aria-hidden="true" />
                    <p className="relative inline-flex items-start gap-2 text-sm font-semibold text-sky-rose-deep">
                        <AlertTriangle className="w-4 h-4 mt-px shrink-0" aria-hidden="true" /> {error}
                    </p>
                </div>
            )}

            {/* Queue switcher — the active tab lifts on a deep fill and grows an
                underline, so it never relies on hue alone. */}
            <div className="flex gap-2 mb-6 border-b border-sky-ink/10">
                {(["manual", "history"] as QueueTab[]).map((tab) => {
                    const isActive = activeTab === tab;
                    const count = tab === "manual" ? visibleManual.length : visibleHistory.length;
                    return (
                        <button
                            type="button"
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            aria-pressed={isActive}
                            className={`relative inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-t-sky-chip transition-all duration-150 ${easeExpo} ${isActive
                                    ? tab === "history"
                                        ? "bg-linear-to-b from-sky-ink-2 to-sky-ink text-white shadow-sky-chip"
                                        : "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-chip"
                                    : "text-sky-ink-2 hover:text-sky-ink hover:bg-white/50"
                                }`}
                        >
                            {tab === "manual"
                                ? <UserRoundPen className="w-4 h-4" aria-hidden="true" />
                                : <History className="w-4 h-4" aria-hidden="true" />}
                            {tab === "manual" ? t("Proofs") : t("mentor.proofQueue.history.tab")}
                            <span className={`ml-1 inline-grid place-items-center min-w-5 h-5 px-1.5 text-[11px] font-semibold rounded-full tabular-nums ${isActive ? "bg-white/22 text-white" : "bg-sky-ink/8 text-sky-ink-2"
                                }`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {activeTab === "manual" ? (
                <QueueSection
                    title={t("Proofs")}
                    count={visibleManual.length}
                    proofs={visibleManual}
                    loading={loadingManual || scopingLoading}
                    onApprove={handleApprove}
                    onReject={handleRejectClick}
                    onCompare={setCompareTarget}
                    actionLoading={actionLoading}
                    emptyIcon={<UserRoundPen className="w-6 h-6" />}
                    emptyText={t("The proof queue is empty. All proofs have been reviewed!")}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                />
            ) : (
                <HistorySection
                    proofs={visibleHistory}
                    loading={loadingHistory || scopingLoading}
                    onCompare={setCompareTarget}
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

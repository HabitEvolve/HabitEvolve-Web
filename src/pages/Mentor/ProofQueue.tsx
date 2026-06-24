import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import mentorApi from "../../api/mentorApi";
import type { ProofDto } from "../../types/mentor.types";
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
                setError(res.message || "Rejection failed.");
            }
        } catch (e: any) {
            setError(e?.response?.data?.message || "An error occurred.");
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
                <h2 className="text-xl font-black mb-1">Reject Proof</h2>
                <p className="text-sm text-gray-600 mb-4">
                    <strong>{proof.username}</strong> — {proof.questTitle}
                </p>

                <label className="block text-xs font-black uppercase tracking-wider mb-2">
                    Rejection Reason (shown to player)
                </label>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain why this proof was rejected…"
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
                        Cancel
                    </button>
                    <button
                        onClick={handleReject}
                        disabled={loading}
                        className="flex-1 py-2.5 border-2 border-black rounded-full font-black text-sm bg-red-400 shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75 disabled:opacity-60 transition-all inline-flex items-center justify-center gap-2"
                    >
                        {loading ? <><Spinner size={14} /> Rejecting…</> : "Reject Proof"}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ── PROOF CARD ────────────────────────────────────────────────────────────────
interface ProofCardProps {
    proof: ProofDto;
    onApprove: (id: number) => void;
    onReject: (proof: ProofDto) => void;
    actionLoading: boolean;
}

const ProofCard = ({ proof, onApprove, onReject, actionLoading }: ProofCardProps) => {
    const isSuspicious = proof.status === "Suspicious" || proof.status === "AiChecking";
    const hasMedia = proof.mediaUrls && proof.mediaUrls.length > 0;

    return (
        <div className="bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] overflow-hidden flex flex-col">
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
                                🤖 AI Flagged — Blurred
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
                    <span className="text-gray-400 text-xs font-bold">No media</span>
                </div>
            )}

            {/* Info */}
            <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <p className="font-black text-sm truncate">{proof.questTitle ?? `Quest #${proof.questId}`}</p>
                        <p className="text-xs text-gray-500 font-medium">by <strong>{proof.username ?? `User #${proof.userId}`}</strong></p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 text-xs font-black border-2 rounded-full ${isSuspicious ? "bg-amber-100 border-amber-400 text-amber-800" : "bg-teal-100 border-teal-400 text-teal-800"}`}>
                        {proof.status}
                    </span>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-gray-500 font-medium">
                    <span className="px-2 py-0.5 bg-gray-100 border-2 border-gray-300 rounded-full">{proof.proofType}</span>
                    <span>{new Date(proof.submittedAt).toLocaleString()}</span>
                    {proof.deadlineMet && (
                        <span className="px-2 py-0.5 bg-emerald-100 border-2 border-emerald-300 rounded-full text-emerald-700">On Time ✓</span>
                    )}
                </div>

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
                        {actionLoading ? <Spinner size={12} /> : "✓ Approve"}
                    </button>
                    <button
                        onClick={() => onReject(proof)}
                        disabled={actionLoading}
                        className="flex-1 py-2 border-2 border-black rounded-full font-black text-xs bg-red-300 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-1"
                    >
                        ✕ Reject
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── PAGE ──────────────────────────────────────────────────────────────────────
export default function ProofQueue() {
    const alert = useAlert();
    const [proofs, setProofs] = useState<ProofDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [rejectTarget, setRejectTarget] = useState<ProofDto | null>(null);

    const fetchQueue = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await mentorApi.getProofQueue();
            if (res.success) {
                setProofs(res.data ?? []);
            } else {
                setError(res.message || "Failed to load proof queue.");
            }
        } catch (e: any) {
            setError(e?.response?.data?.message || "An error occurred.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchQueue(); }, [fetchQueue]);

    const handleApprove = async (proofId: number) => {
        setActionLoading(proofId);
        try {
            const res = await mentorApi.approveProof(proofId);
            if (res.success) {
                setProofs((prev) => prev.filter((p) => p.proofId !== proofId));
                alert.success("Proof approved! Player rewarded.");
            } else {
                alert.error(res.message || "Approval failed.");
            }
        } catch (e: any) {
            alert.error(e?.response?.data?.message || "An error occurred.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejected = (proofId: number) => {
        setRejectTarget(null);
        setProofs((prev) => prev.filter((p) => p.proofId !== proofId));
        alert.success("Proof rejected. Player has been notified.");
    };

    return (
        <>
            <PageMeta title="Proof Queue — HabitEvolve" description="Review and judge submitted proof" />
            <PageBreadcrumb pageTitle="The Judgement Hall" />


            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black">Pending Reviews</h2>
                    <span className="px-3 py-1 bg-teal-500 text-white text-sm font-black border-2 border-black rounded-full">
                        {proofs.length}
                    </span>
                </div>
                <button
                    onClick={fetchQueue}
                    disabled={loading}
                    className="px-4 py-2 border-2 border-black rounded-full font-black text-sm bg-white shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75 disabled:opacity-60 transition-all inline-flex items-center gap-2"
                >
                    {loading ? <Spinner size={14} /> : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    )}
                    Refresh
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-100 border-4 border-red-400 rounded-2xl font-bold text-red-700">
                    {error}
                </div>
            )}

            {loading && proofs.length === 0 ? (
                <div className="flex items-center justify-center h-64 gap-3 text-gray-500">
                    <Spinner size={32} /> Loading queue…
                </div>
            ) : proofs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <div className="text-6xl">⚖️</div>
                    <p className="text-xl font-black text-gray-400">Queue is empty</p>
                    <p className="text-sm text-gray-400 font-medium">All proofs have been reviewed. Check back later.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {proofs.map((proof) => (
                        <ProofCard
                            key={proof.proofId}
                            proof={proof}
                            onApprove={handleApprove}
                            onReject={setRejectTarget}
                            actionLoading={actionLoading === proof.proofId}
                        />
                    ))}
                </div>
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

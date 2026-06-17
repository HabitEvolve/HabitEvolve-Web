import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { adminCourtApi } from "../api/adminCourtApi";
import type {
  CourtCaseDto,
  ResolveVerdictPayload,
  KarmaLeaderboardDto,
} from "../types/adminCourt.types";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "⏳ Pending", value: "Pending" },
  { label: "✅ Approved", value: "Approved" },
  { label: "❌ Rejected", value: "Rejected" },
  { label: "🏆 Valid Approve", value: "ValidApprove" },
  { label: "🚫 Fraud Reject", value: "FraudReject" },
  { label: "⚖️ Admin Override", value: "AdminOverride" },
  { label: "⌛ Expired", value: "Expired" },
];

// ── SHARED STYLES ─────────────────────────────────────────────────────────────
const btnBase =
  "inline-flex items-center gap-2 px-4 py-2 font-black text-sm border-2 border-black rounded-full " +
  "shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 " +
  "disabled:shadow-[3px_3px_0_0_#1A1D20] transition-all";

const inputCls =
  "w-full px-4 py-2.5 border-2 border-black rounded-2xl text-sm font-medium bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-amber-300 placeholder:text-gray-400";

// ── HELPERS ───────────────────────────────────────────────────────────────────
const errMsg = (err: unknown) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

// ── ICONS ─────────────────────────────────────────────────────────────────────
const GavelIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m14.5 12.5-8 8a2.119 2.119 0 0 1-3-3l8-8" />
    <path d="m16 16 6-6" /><path d="m8 8 6-6" /><path d="m9 7 8 8" />
  </svg>
);
const TrophyIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);
const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const ChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const Spinner = ({ size = 20 }: { size?: number }) => (
  <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);
const ImgOffIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
    <line x1="2" y1="2" x2="22" y2="22" />
    <path d="M10.41 10.41a2 2 0 1 1-2.83-2.83" />
    <path d="M3 7h2l16 16" /><rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
  </svg>
);

// ── STATUS BADGE ──────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { bg: string; border: string; text: string; emoji: string }> = {
  Pending:       { bg: "bg-amber-100",   border: "border-amber-400",   text: "text-amber-800",   emoji: "⏳" },
  Approved:      { bg: "bg-green-100",   border: "border-green-400",   text: "text-green-800",   emoji: "✅" },
  Rejected:      { bg: "bg-red-100",     border: "border-red-400",     text: "text-red-800",     emoji: "❌" },
  ValidApprove:  { bg: "bg-emerald-100", border: "border-emerald-400", text: "text-emerald-800", emoji: "🏆" },
  FraudReject:   { bg: "bg-orange-100",  border: "border-orange-400",  text: "text-orange-800",  emoji: "🚫" },
  AdminOverride: { bg: "bg-blue-100",    border: "border-blue-400",    text: "text-blue-800",    emoji: "⚖️" },
  Expired:       { bg: "bg-gray-100",    border: "border-gray-400",    text: "text-gray-600",    emoji: "⌛" },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CFG[status] ?? { bg: "bg-gray-100", border: "border-gray-400", text: "text-gray-600", emoji: "?" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      {cfg.emoji} {status}
    </span>
  );
};

// ── PROOF TYPE BADGE ──────────────────────────────────────────────────────────
const PROOF_CFG: Record<string, { bg: string; border: string; text: string; emoji: string }> = {
  PHOTO:      { bg: "bg-violet-100", border: "border-violet-400", text: "text-violet-800", emoji: "📷" },
  VIDEO:      { bg: "bg-pink-100",   border: "border-pink-400",   text: "text-pink-800",   emoji: "🎬" },
  SCREENSHOT: { bg: "bg-cyan-100",   border: "border-cyan-400",   text: "text-cyan-800",   emoji: "🖼️" },
  GPS:        { bg: "bg-green-100",  border: "border-green-400",  text: "text-green-800",  emoji: "📍" },
  TEXT:       { bg: "bg-gray-100",   border: "border-gray-400",   text: "text-gray-700",   emoji: "📝" },
};

const ProofTypeBadge = ({ type }: { type: string }) => {
  const cfg = PROOF_CFG[type] ?? PROOF_CFG.TEXT;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      {cfg.emoji} {type}
    </span>
  );
};

// ── MEDAL RANK ────────────────────────────────────────────────────────────────
const MedalRank = ({ rank }: { rank: number }) => {
  if (rank === 1) return <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-yellow-400 border-2 border-yellow-600 shadow-[2px_2px_0_0_#854d0e] text-base">🥇</span>;
  if (rank === 2) return <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-slate-300 border-2 border-slate-500 shadow-[2px_2px_0_0_#334155] text-base">🥈</span>;
  if (rank === 3) return <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-orange-300 border-2 border-orange-500 shadow-[2px_2px_0_0_#7c2d12] text-base">🥉</span>;
  return <span className="inline-flex items-center justify-center w-9 h-9 rounded-full border-2 border-gray-300 text-gray-600 font-black text-sm">#{rank}</span>;
};

// ── REVIEW CASE MODAL ─────────────────────────────────────────────────────────
interface ReviewCaseModalProps {
  caseItem: CourtCaseDto;
  onClose: () => void;
  onSuccess: (caseId: number) => void;
}

const ReviewCaseModal = ({ caseItem, onClose, onSuccess }: ReviewCaseModalProps) => {
  const [data, setData] = useState<CourtCaseDto>(caseItem);
  const [detailLoading, setDetailLoading] = useState(true);
  const [verdict, setVerdict] = useState<"Approved" | "Rejected" | "">("");
  const [adminNote, setAdminNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setDetailLoading(true);
    adminCourtApi.getCaseById(caseItem.caseId)
      .then(res => { if (res.success && res.data) setData(res.data); })
      .catch(() => { /* keep caseItem as fallback */ })
      .finally(() => setDetailLoading(false));
  }, [caseItem.caseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verdict) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: ResolveVerdictPayload = { verdict, adminNote };
      await adminCourtApi.resolveCase(caseItem.caseId, payload);
      onSuccess(caseItem.caseId);
    } catch (err) {
      setSubmitError(errMsg(err) ?? "Failed to resolve case. Please try again.");
      setSubmitting(false);
    }
  };

  const isMedia = ["PHOTO", "VIDEO", "SCREENSHOT", "GPS"].includes(data.proofType);
  const alreadyResolved = ["Approved", "Rejected", "ValidApprove", "FraudReject", "AdminOverride"].includes(data.status);

  const overlay = (
    <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="relative bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0_0_#1A1D20] w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black bg-amber-50 shrink-0 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-300 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#1A1D20]">
              <GavelIcon size={17} />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900">Review & Resolve Case</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs font-medium text-gray-500">Case #{caseItem.caseId}</p>
                <StatusBadge status={data.status} />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-white hover:bg-red-50 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
          >
            <XIcon />
          </button>
        </div>

        {/* Modal Body */}
        {detailLoading ? (
          <div className="flex-1 flex items-center justify-center gap-3 p-16">
            <Spinner size={32} />
            <p className="text-sm font-bold text-gray-500">Loading case details…</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col lg:flex-row">

              {/* ── LEFT: EVIDENCE PANEL ──────────────────────────────── */}
              <div className="lg:w-[58%] p-6 space-y-5 border-b-2 lg:border-b-0 lg:border-r-2 border-black/10">

                {/* Quest info */}
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Quest / Task</p>
                  <p className="text-sm font-black text-gray-900 leading-snug">{data.questTitleMasked}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <ProofTypeBadge type={data.proofType} />
                    <span className="text-xs font-medium text-gray-400">
                      Submitted {fmtDate(data.createdAt)}
                    </span>
                    {data.expiresAt && (
                      <span className="text-xs font-medium text-orange-500">
                        · Expires {fmtDateTime(data.expiresAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Media gallery */}
                {isMedia && data.mediaUrls.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      Evidence Media ({data.mediaUrls.length} file{data.mediaUrls.length !== 1 ? "s" : ""})
                    </p>
                    <div className={`grid gap-2 ${data.mediaUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                      {data.mediaUrls.map((url, i) => (
                        <div key={i} className="aspect-video rounded-2xl border-2 border-black overflow-hidden bg-gray-100 shadow-[2px_2px_0_0_#1A1D20]">
                          {imgErrors[i] ? (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gray-50">
                              <ImgOffIcon />
                              <p className="text-[10px] font-medium text-gray-400">Media unavailable</p>
                            </div>
                          ) : (
                            <img
                              src={url}
                              alt={`Evidence ${i + 1}`}
                              className="w-full h-full object-cover"
                              onError={() => setImgErrors(p => ({ ...p, [i]: true }))}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Text note */}
                {data.textNote && (
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Text Note</p>
                    <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-700 font-medium leading-relaxed">
                      {data.textNote}
                    </div>
                  </div>
                )}

                {/* Vote summary bar */}
                <div className="flex items-center gap-4 px-4 py-3 bg-white border-2 border-black/10 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👍</span>
                    <div>
                      <p className="text-base font-black text-green-700">{data.validVotes}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Valid</p>
                    </div>
                  </div>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                    {(data.validVotes + data.fraudVotes) > 0 && (
                      <div
                        className="h-full bg-green-400 rounded-full"
                        style={{ width: `${(data.validVotes / (data.validVotes + data.fraudVotes)) * 100}%` }}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-base font-black text-red-700">{data.fraudVotes}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Fraud</p>
                    </div>
                    <span className="text-xl">👎</span>
                  </div>
                </div>

                {/* Community votes list */}
                {data.votes && data.votes.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      Community Votes ({data.votes.length})
                    </p>
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {data.votes.map(v => {
                        const isValid = v.vote?.toLowerCase() === "valid";
                        return (
                          <div
                            key={v.voteId}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                          >
                            <span className="text-base shrink-0">{isValid ? "👍" : "👎"}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-gray-700">User #{v.reviewerUserId}</p>
                              {v.reasonCode && (
                                <p className="text-[10px] text-gray-400 font-medium truncate">{v.reasonCode}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {v.wasCorrect !== null && (
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full border ${
                                  v.wasCorrect
                                    ? "bg-green-50 border-green-300 text-green-700"
                                    : "bg-red-50 border-red-300 text-red-700"
                                }`}>
                                  {v.wasCorrect ? "✓ Correct" : "✗ Wrong"}
                                </span>
                              )}
                              {v.karmaEarned > 0 && (
                                <span className="text-[10px] font-black text-yellow-700 bg-yellow-50 border border-yellow-300 px-1.5 py-0.5 rounded-full">
                                  +{v.karmaEarned}✨
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* ── RIGHT: ADMIN FORM ─────────────────────────────────── */}
              <div className="lg:w-[42%] p-6 bg-gray-50/40">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-7 h-7 rounded-xl bg-amber-300 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#1A1D20]">
                    <GavelIcon size={13} />
                  </div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Admin Verdict</h3>
                </div>

                {/* Existing admin note if case was previously resolved */}
                {data.adminNote && (
                  <div className="mb-4 px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-2xl">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-wide mb-1">Previous Admin Note</p>
                    <p className="text-xs font-medium text-blue-800">{data.adminNote}</p>
                  </div>
                )}

                {alreadyResolved && (
                  <div className="mb-4 flex items-start gap-2.5 px-3.5 py-3 bg-amber-50 border-2 border-amber-300 rounded-2xl">
                    <span className="text-sm shrink-0">⚠️</span>
                    <p className="text-xs font-semibold text-amber-800">
                      Status is already <strong>{data.status}</strong>. Your verdict will override the existing resolution.
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Verdict select */}
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wide mb-1.5">
                      Final Verdict *
                    </label>
                    <select
                      required
                      value={verdict}
                      onChange={e => setVerdict(e.target.value as typeof verdict)}
                      className={inputCls}
                    >
                      <option value="">— Select Verdict —</option>
                      <option value="Approved">✅ Approved</option>
                      <option value="Rejected">❌ Rejected</option>
                    </select>
                    {verdict && (
                      <div className={`mt-2 px-3 py-2 rounded-xl text-xs font-bold border-2 ${
                        verdict === "Approved"
                          ? "bg-green-50 border-green-300 text-green-700"
                          : "bg-red-50 border-red-300 text-red-700"
                      }`}>
                        {verdict === "Approved"
                          ? "✅ Submission APPROVED — karma will be awarded to the submitter."
                          : "❌ Submission REJECTED — no karma awarded."}
                      </div>
                    )}
                  </div>

                  {/* Admin note */}
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wide mb-1.5">
                      Admin Note
                      <span className="ml-1.5 font-semibold normal-case text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      value={adminNote}
                      onChange={e => setAdminNote(e.target.value)}
                      rows={4}
                      placeholder="Reason for this verdict override…"
                      className={`${inputCls} resize-none`}
                    />
                  </div>

                  {submitError && (
                    <p className="text-xs font-bold text-red-600 bg-red-50 border-2 border-red-300 rounded-xl px-3 py-2">
                      {submitError}
                    </p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={submitting}
                      className={`${btnBase} flex-1 justify-center bg-white text-gray-700`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !verdict}
                      className={`${btnBase} flex-1 justify-center ${
                        verdict === "Approved" ? "bg-green-300 text-green-900" :
                        verdict === "Rejected" ? "bg-red-300 text-red-900" :
                        "bg-amber-200 text-amber-900"
                      }`}
                    >
                      {submitting
                        ? <><Spinner size={13} /> Resolving…</>
                        : <><GavelIcon size={13} /> Resolve Case</>}
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
};

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
type ActiveTab = "cases" | "karma";

export default function CourtManagement() {
  // ── ALERT ─────────────────────────────────────────────────────────────────
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 4500);
    return () => clearTimeout(t);
  }, [alert]);

  // ── TABS ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>("cases");

  // ── CASES STATE ───────────────────────────────────────────────────────────
  const [cases, setCases] = useState<CourtCaseDto[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [casesError, setCasesError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [reviewingCase, setReviewingCase] = useState<CourtCaseDto | null>(null);

  const fetchCases = useCallback(async () => {
    setCasesLoading(true);
    setCasesError(null);
    try {
      const res = await adminCourtApi.getCases({
        page,
        pageSize: PAGE_SIZE,
        status: statusFilter || undefined,
      });
      if (res.success && res.data) setCases(res.data);
      else setCasesError("Failed to load cases.");
    } catch (err) {
      setCasesError(errMsg(err) ?? "Network error fetching cases.");
    } finally {
      setCasesLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    if (activeTab === "cases") fetchCases();
  }, [activeTab, fetchCases]);

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  // ── KARMA STATE ───────────────────────────────────────────────────────────
  const [leaderboard, setLeaderboard] = useState<KarmaLeaderboardDto[]>([]);
  const [karmaLoading, setKarmaLoading] = useState(false);
  const [karmaError, setKarmaError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setKarmaLoading(true);
    setKarmaError(null);
    try {
      const res = await adminCourtApi.getKarmaLeaderboard(50);
      if (res.success && res.data) setLeaderboard(res.data);
      else setKarmaError("Failed to load leaderboard.");
    } catch (err) {
      setKarmaError(errMsg(err) ?? "Network error fetching leaderboard.");
    } finally {
      setKarmaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "karma") fetchLeaderboard();
  }, [activeTab, fetchLeaderboard]);

  const hasMore = cases.length >= PAGE_SIZE;

  // ── STATUS COUNTS (current page) ──────────────────────────────────────────
  const statusCounts = cases.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  // ── KARMA PODIUM (top 3 by rank) ──────────────────────────────────────────
  const top3 = [1, 2, 3].map(r => leaderboard.find(e => e.rank === r) ?? null);

  return (
    <>
      <PageMeta title="Court & Karma Management" description="Review community court cases and manage karma rankings" />
      <PageBreadcrumb pageTitle="Court & Karma" />

      {/* Alert Toast */}
      {alert && (
        <div className={`fixed top-4 right-4 z-99998 flex items-center gap-3 px-5 py-3 rounded-2xl border-2 border-black font-bold text-sm shadow-[4px_4px_0_0_#1A1D20] ${
          alert.type === "success" ? "bg-green-300 text-green-900" : "bg-red-300 text-red-900"
        }`}>
          {alert.type === "success" ? "✅" : "❌"} {alert.message}
        </div>
      )}

      <div className="space-y-6 p-1">

        {/* Page Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-300 border-2 border-black flex items-center justify-center shadow-[3px_3px_0_0_#1A1D20] shrink-0">
            <GavelIcon size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Community Court & Karma</h1>
            <p className="text-sm text-gray-500 font-medium mt-0.5">
              Review proof submissions, issue verdicts, and track karma rankings.
            </p>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex items-end gap-1 border-b-2 border-black/10">
          {([
            { id: "cases" as ActiveTab, label: "Court Cases",      icon: "⚖️" },
            { id: "karma" as ActiveTab, label: "Karma Leaderboard", icon: "🏆" },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 font-black text-sm rounded-t-2xl border-2 transition-all ${
                activeTab === tab.id
                  ? "bg-amber-300 border-black text-gray-900 shadow-[3px_0_0_0_#1A1D20,0_3px_0_0_#1A1D20] -mb-0.5 relative z-10"
                  : "bg-white border-black/20 text-gray-500 hover:bg-gray-50 hover:border-black/40"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════ TAB A: COURT CASES ══════════════════════════════ */}
        {activeTab === "cases" && (
          <div className="space-y-4">

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3 p-4 bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0_0_#1A1D20]">
              <span className="text-sm font-black text-gray-700">🔍 Status:</span>
              <select
                value={statusFilter}
                onChange={e => handleStatusChange(e.target.value)}
                className="px-4 py-2 border-2 border-black rounded-full text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {statusFilter && (
                <button
                  onClick={() => handleStatusChange("")}
                  className="px-3 py-1.5 text-xs font-black border-2 border-black rounded-full bg-gray-100 hover:bg-gray-200 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                >
                  ✕ Clear
                </button>
              )}
              <button
                onClick={fetchCases}
                disabled={casesLoading}
                className={`${btnBase} ml-auto bg-amber-200 text-amber-900 py-1.5`}
              >
                {casesLoading ? <><Spinner size={13} /> Loading…</> : "↺ Refresh"}
              </button>
            </div>

            {/* Status count pills */}
            {Object.keys(statusCounts).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(statusCounts).map(([status, count]) => {
                  const cfg = STATUS_CFG[status];
                  return (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(statusFilter === status ? "" : status)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border-2 transition-all shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 ${
                        statusFilter === status ? "ring-2 ring-black ring-offset-1" : ""
                      } ${cfg?.bg ?? "bg-gray-100"} ${cfg?.border ?? "border-gray-400"} ${cfg?.text ?? "text-gray-600"}`}
                    >
                      {cfg?.emoji} {status}: {count}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Cases Table */}
            <div className="bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] overflow-hidden">
              {casesError ? (
                <div className="flex flex-col items-center gap-3 py-16">
                  <span className="text-4xl">⚠️</span>
                  <p className="font-black text-gray-700">Failed to load cases</p>
                  <p className="text-sm text-gray-400 font-medium">{casesError}</p>
                  <button onClick={fetchCases} className={`${btnBase} bg-red-100 text-red-800`}>↺ Retry</button>
                </div>
              ) : casesLoading && cases.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                  <Spinner size={32} />
                  <p className="font-bold text-sm">Loading court cases…</p>
                </div>
              ) : cases.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                  <span className="text-5xl">⚖️</span>
                  <p className="font-black text-lg text-gray-500">No cases found</p>
                  <p className="text-sm font-medium">
                    {statusFilter ? `No cases with status "${statusFilter}"` : "The court docket is empty!"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-200 bg-gray-50/60">
                        {["#", "Quest / Task", "Proof Type", "Status", "Votes", "Submitted", "Action"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {cases.map((c, idx) => (
                        <tr key={c.caseId} className="hover:bg-amber-50/40 transition-colors">
                          <td className="px-4 py-3 text-xs font-black text-gray-400">
                            {(page - 1) * PAGE_SIZE + idx + 1}
                          </td>
                          <td className="px-4 py-3 max-w-55">
                            <p className="font-bold text-gray-800 truncate">{c.questTitleMasked}</p>
                            <p className="text-xs text-gray-400 font-medium mt-0.5">ID #{c.caseId}</p>
                          </td>
                          <td className="px-4 py-3">
                            <ProofTypeBadge type={c.proofType} />
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={c.status} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-xs font-black whitespace-nowrap">
                              <span className="text-green-700">👍 {c.validVotes}</span>
                              <span className="text-gray-300 mx-0.5">|</span>
                              <span className="text-red-700">👎 {c.fraudVotes}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">
                            {fmtDate(c.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setReviewingCase(c)}
                              className={`${btnBase} bg-amber-200 text-amber-900 py-1.5 px-3 text-xs`}
                            >
                              <GavelIcon size={12} /> Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination */}
            {!casesError && (cases.length > 0 || page > 1) && (
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-500">
                  Page {page} · {cases.length} case{cases.length !== 1 ? "s" : ""}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || casesLoading}
                    className={`${btnBase} bg-white text-gray-700 py-1.5 px-3 text-xs`}
                  >
                    <ChevronLeft /> Prev
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={!hasMore || casesLoading}
                    className={`${btnBase} bg-white text-gray-700 py-1.5 px-3 text-xs`}
                  >
                    Next <ChevronRight />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════ TAB B: KARMA LEADERBOARD ════════════════════════ */}
        {activeTab === "karma" && (
          <div className="space-y-5">

            {/* Leaderboard Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-yellow-300 border-2 border-black flex items-center justify-center shadow-[3px_3px_0_0_#1A1D20]">
                  <TrophyIcon size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900">Karma Champions</h2>
                  <p className="text-xs text-gray-500 font-medium">Top 50 community reviewers by accumulated karma</p>
                </div>
              </div>
              <button onClick={fetchLeaderboard} disabled={karmaLoading}
                className={`${btnBase} bg-yellow-200 text-yellow-900 py-1.5`}>
                {karmaLoading ? <><Spinner size={13} /> Loading…</> : "↺ Refresh"}
              </button>
            </div>

            {karmaError ? (
              <div className="flex flex-col items-center gap-3 py-16 bg-white border-2 border-black rounded-2xl">
                <span className="text-4xl">⚠️</span>
                <p className="font-black text-gray-700">Failed to load leaderboard</p>
                <p className="text-sm text-gray-400">{karmaError}</p>
                <button onClick={fetchLeaderboard} className={`${btnBase} bg-red-100 text-red-800`}>↺ Retry</button>
              </div>
            ) : karmaLoading ? (
              <div className="flex flex-col items-center gap-3 py-16 bg-white border-2 border-black rounded-2xl">
                <Spinner size={32} />
                <p className="font-bold text-sm text-gray-400">Loading karma leaderboard…</p>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 bg-white border-2 border-black rounded-2xl text-gray-400">
                <span className="text-5xl">🏆</span>
                <p className="font-black text-lg text-gray-500">No karma data yet</p>
                <p className="text-sm font-medium text-center max-w-xs">
                  Users appear here after reviewing community proof submissions.
                </p>
              </div>
            ) : (
              <div className="space-y-4">

                {/* Podium — Top 3 displayed as: 2nd | 1st | 3rd */}
                {top3.some(Boolean) && (
                  <div className="grid grid-cols-3 gap-3">
                    {([top3[1], top3[0], top3[2]] as const).map((entry, podIdx) => {
                      if (!entry) return <div key={podIdx} />;
                      const podCfg = [
                        { bg: "bg-slate-100",  border: "border-slate-400",  pt: "pt-8",  karma: "text-slate-700"  },
                        { bg: "bg-yellow-50",  border: "border-yellow-500", pt: "pt-3",  karma: "text-yellow-700" },
                        { bg: "bg-orange-50",  border: "border-orange-400", pt: "pt-12", karma: "text-orange-700" },
                      ][podIdx];
                      return (
                        <div
                          key={entry.userId}
                          className={`flex flex-col items-center pb-4 ${podCfg.pt} border-2 ${podCfg.border} ${podCfg.bg} rounded-2xl shadow-[3px_3px_0_0_#1A1D20]`}
                        >
                          <MedalRank rank={entry.rank} />
                          <p className="text-xs font-black text-gray-600 mt-2">User #{entry.userId}</p>
                          <p className={`text-xl font-black mt-0.5 ${podCfg.karma}`}>
                            {entry.totalKarma.toLocaleString()}
                          </p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">karma pts</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Full leaderboard table */}
                <div className="bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-gray-200 bg-gray-50/60">
                          {["Rank", "User ID", "Karma Points", "Badge"].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {leaderboard.map(entry => {
                          const rowBg =
                            entry.rank === 1 ? "bg-yellow-50/70 hover:bg-yellow-100/50" :
                            entry.rank === 2 ? "bg-slate-50/70 hover:bg-slate-100/50" :
                            entry.rank === 3 ? "bg-orange-50/70 hover:bg-orange-100/50" :
                            "hover:bg-gray-50/50";
                          const karmaColor =
                            entry.rank === 1 ? "text-yellow-700" :
                            entry.rank === 2 ? "text-slate-600" :
                            entry.rank === 3 ? "text-orange-700" :
                            "text-gray-700";
                          return (
                            <tr key={entry.userId} className={`transition-colors ${rowBg}`}>
                              <td className="px-4 py-3"><MedalRank rank={entry.rank} /></td>
                              <td className="px-4 py-3 font-black text-gray-800">User #{entry.userId}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span>✨</span>
                                  <span className={`text-base font-black ${karmaColor}`}>
                                    {entry.totalKarma.toLocaleString()}
                                  </span>
                                  <span className="text-xs text-gray-400 font-medium">pts</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {entry.rank === 1 && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border-2 bg-yellow-100 border-yellow-400 text-yellow-800">
                                    🥇 Champion
                                  </span>
                                )}
                                {entry.rank === 2 && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border-2 bg-slate-100 border-slate-400 text-slate-700">
                                    🥈 Runner-up
                                  </span>
                                )}
                                {entry.rank === 3 && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border-2 bg-orange-100 border-orange-400 text-orange-800">
                                    🥉 Third
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── PORTAL: REVIEW CASE MODAL ───────────────────────────────────────── */}
      {reviewingCase && (
        <ReviewCaseModal
          caseItem={reviewingCase}
          onClose={() => setReviewingCase(null)}
          onSuccess={caseId => {
            setAlert({ type: "success", message: `Case #${caseId} resolved successfully!` });
            setReviewingCase(null);
            fetchCases();
          }}
        />
      )}
    </>
  );
}

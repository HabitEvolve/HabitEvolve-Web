import { useState, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Loader2, ImageOff, Filter, Camera, Video, Monitor } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAlert } from "../context/AlertContext";
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

const SI = (src: string) => (
  <img src={src} alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
);

const STATUS_CONFIG: Record<string, {
  label: string; bg: string; border: string; text: string; icon: ReactNode;
}> = {
  "": { label: "All", bg: "bg-gray-100", border: "border-gray-400", text: "text-gray-700", icon: <Filter className="w-3.5 h-3.5 shrink-0" /> },
  Pending: { label: "Pending", bg: "bg-amber-100", border: "border-amber-400", text: "text-amber-800", icon: SI("/icon/UI/Exclamation Mark/64px/Exclamation Mark 1st 64px.png") },
  Approved: { label: "Approved", bg: "bg-green-100", border: "border-green-400", text: "text-green-800", icon: SI("/icon/UI/Checkmark/64px/Checkmark 1st 64px.png") },
  Rejected: { label: "Rejected", bg: "bg-red-100", border: "border-red-400", text: "text-red-800", icon: SI("/icon/UI/X/64px/X 1st 64px.png") },
  AdminResolved: { label: "Admin Resolved", bg: "bg-blue-100", border: "border-blue-400", text: "text-blue-800", icon: <img src="/icon/Item/Hammer/64px/Hammer 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain shrink-0" /> },
  ExpiredAutoApproved: { label: "Expired (Auto-Approved)", bg: "bg-gray-100", border: "border-gray-400", text: "text-gray-600", icon: SI("/icon/UI/Skip/64w/Skip 1st 64px.png") },
};

const STATUS_KEYS = ["", "Pending", "Approved", "Rejected", "AdminResolved", "ExpiredAutoApproved"] as const;

// ── SHARED STYLES ─────────────────────────────────────────────────────────────
const btnBase =
  "inline-flex items-center gap-2 px-4 py-2 font-black text-sm border-2 border-black rounded-full " +
  "shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 " +
  "disabled:shadow-[3px_3px_0_0_#1A1D20] transition-all";

const inputCls =
  "w-full px-4 py-2.5 border-2 border-black dark:border-gray-600 rounded-2xl text-sm font-medium " +
  "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 " +
  "focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-amber-600 " +
  "placeholder:text-gray-400 dark:placeholder:text-gray-500";

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

// ── ICONS (game icons) ────────────────────────────────────────────────────────
const GavelIcon = ({ size = 16 }: { size?: number }) => (
  <img src="/icon/Item/Hammer/64px/Hammer 1st 64px.png" alt="" style={{ width: size, height: size }} className="object-contain shrink-0" />
);
const TrophyIcon = ({ size = 16 }: { size?: number }) => (
  <img src="/icon/Item/Trophy/64w/Golden Trophy 1st 64px.png" alt="" style={{ width: size, height: size }} className="object-contain shrink-0" />
);
const XIcon = () => <X className="w-4 h-4" />;
const ChevronLeftIcon = () => <ChevronLeft className="w-3.5 h-3.5" />;
const ChevronRightIcon = () => <ChevronRight className="w-3.5 h-3.5" />;
const Spinner = ({ size = 20 }: { size?: number }) => <Loader2 className="animate-spin" width={size} height={size} />;
const ImgOffIcon = () => <ImageOff className="w-7 h-7 text-gray-400" />;

// ── STATUS BADGE ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["Rejected"];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      {cfg.icon} {status}
    </span>
  );
};

// ── PROOF TYPE BADGE ──────────────────────────────────────────────────────────
const PROOF_CFG: Record<string, { bg: string; border: string; text: string; icon: ReactNode }> = {
  PHOTO: { bg: "bg-violet-100", border: "border-violet-400", text: "text-violet-800", icon: <Camera className="w-3 h-3 shrink-0" /> },
  VIDEO: { bg: "bg-pink-100", border: "border-pink-400", text: "text-pink-800", icon: <Video className="w-3 h-3 shrink-0" /> },
  SCREENSHOT: { bg: "bg-cyan-100", border: "border-cyan-400", text: "text-cyan-800", icon: <Monitor className="w-3 h-3 shrink-0" /> },
  GPS: { bg: "bg-green-100", border: "border-green-400", text: "text-green-800", icon: SI("/icon/Item/Location Pin/64px/Location Pin 1st 64px.png") },
  TEXT: { bg: "bg-gray-100", border: "border-gray-400", text: "text-gray-700", icon: SI("/icon/Item/Scroll/64px/Scroll 1st 64px.png") },
};

const ProofTypeBadge = ({ type }: { type: string }) => {
  const cfg = PROOF_CFG[type] ?? PROOF_CFG.TEXT;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      {cfg.icon} {type}
    </span>
  );
};

// ── AI VERDICT BADGE ──────────────────────────────────────────────────────────
const AI_VERDICT_CFG: Record<string, { bg: string; border: string; text: string; label: string }> = {
  approve:    { bg: "bg-green-100",  border: "border-green-400",  text: "text-green-800",  label: "AI: Approve" },
  reject:     { bg: "bg-red-100",    border: "border-red-400",    text: "text-red-800",    label: "AI: Reject" },
  suspicious: { bg: "bg-amber-100",  border: "border-amber-400",  text: "text-amber-800",  label: "AI: Suspicious" },
};

const AiVerdictPanel = ({ data }: { data: CourtCaseDto }) => {
  const { t } = useTranslation();
  if (!data.aiVerdict) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800/40 border-2 border-gray-200 dark:border-gray-700 rounded-2xl">
        <span className="text-lg">🤖</span>
        <p className="text-xs font-semibold text-gray-500">{t("admin.courtManagement.reviewModal.aiNotUsed")}</p>
      </div>
    );
  }
  const cfg = AI_VERDICT_CFG[data.aiVerdict] ?? AI_VERDICT_CFG.suspicious;
  const confidencePct = data.aiConfidence !== null ? Math.round(data.aiConfidence * 100) : null;
  return (
    <div className={`px-4 py-3 border-2 rounded-2xl ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 text-xs font-black ${cfg.text}`}>
          🤖 {cfg.label}
        </span>
        {confidencePct !== null && (
          <span className={`text-sm font-black ${cfg.text}`}>{confidencePct}%</span>
        )}
      </div>
      {confidencePct !== null && (
        <div className="mt-2 h-1.5 bg-white/60 dark:bg-black/20 rounded-full overflow-hidden border border-black/10">
          <div className={`h-full rounded-full ${cfg.text.replace("text-", "bg-")}`} style={{ width: `${confidencePct}%` }} />
        </div>
      )}
      {(data.aiVerdictRaw || data.aiVerdictFinal) && (
        <p className={`text-[10px] font-semibold mt-2 ${cfg.text} opacity-80`}>
          {data.aiVerdictRaw && `CV: ${data.aiVerdictRaw}`}
          {data.aiVerdictRaw && data.aiVerdictFinal && " · "}
          {data.aiVerdictFinal && `Result: ${data.aiVerdictFinal}`}
        </p>
      )}
    </div>
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
  const { t } = useTranslation();
  const alert = useAlert();
  const [data, setData] = useState<CourtCaseDto>(caseItem);
  const [detailLoading, setDetailLoading] = useState(true);
  const [verdict, setVerdict] = useState<"Approved" | "Rejected" | "">("");
  const [adminNote, setAdminNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
    try {
      const payload: ResolveVerdictPayload = { verdict, adminNote };
      await adminCourtApi.resolveCase(caseItem.caseId, payload);
      onSuccess(caseItem.caseId);
    } catch (err) {
      alert.error(errMsg(err) ?? "Failed to resolve case. Please try again.");
      setSubmitting(false);
    }
  };

  const isMedia = ["PHOTO", "VIDEO", "SCREENSHOT", "GPS"].includes(data.proofType);
  const alreadyResolved = ["Approved", "Rejected", "AdminResolved", "ExpiredAutoApproved"].includes(data.status);

  const overlay = (
    <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="modal-content relative bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[8px_8px_0_0_#1A1D20] w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black bg-amber-50 dark:bg-amber-900/20 shrink-0 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-300 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#1A1D20]">
              <GavelIcon size={17} />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900">{t("admin.courtManagement.reviewModal.title")}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs font-medium text-gray-500">
                  {t("admin.courtManagement.reviewModal.submittedBy", "Submitted by")} <span className="font-bold text-gray-700">{data.proofOwnerUsername}</span>
                </p>
                <StatusBadge status={data.status} />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
          >
            <XIcon />
          </button>
        </div>

        {/* Modal Body */}
        {detailLoading ? (
          <div className="flex-1 flex items-center justify-center gap-3 p-16">
            <Spinner size={32} />
            <p className="text-sm font-bold text-gray-500">{t("admin.courtManagement.loadingCaseDetails")}</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col lg:flex-row">

              {/* ── LEFT: EVIDENCE PANEL ──────────────────────────────── */}
              <div className="lg:w-[58%] p-6 space-y-5 border-b-2 lg:border-b-0 lg:border-r-2 border-black/10">

                {/* Quest info */}
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t("admin.courtManagement.reviewModal.questTask")}</p>
                  <p className="text-sm font-black text-gray-900 leading-snug">{data.questTitle ?? data.questTitleMasked}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <ProofTypeBadge type={data.proofType} />
                    <span className="text-xs font-medium text-gray-400">
                      {t("admin.courtManagement.submittedDate", { date: fmtDate(data.createdAt) })}
                    </span>
                    {data.expiresAt && (
                      <span className="text-xs font-medium text-orange-500">
                        {t("admin.courtManagement.expiresDate", { date: fmtDateTime(data.expiresAt) })}
                      </span>
                    )}
                  </div>
                </div>

                {/* AI assessment — why this proof was routed to Court */}
                <AiVerdictPanel data={data} />

                {/* Media gallery */}
                {isMedia && data.mediaUrls.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      {t("admin.courtManagement.reviewModal.evidenceMedia")} ({data.mediaUrls.length} file{data.mediaUrls.length !== 1 ? "s" : ""})
                    </p>
                    <div className={`grid gap-2 ${data.mediaUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                      {data.mediaUrls.map((url, i) => (
                        <div key={i} className="aspect-video rounded-2xl border-2 border-black overflow-hidden bg-gray-100 shadow-[2px_2px_0_0_#1A1D20]">
                          {imgErrors[i] ? (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gray-50">
                              <ImgOffIcon />
                              <p className="text-[10px] font-medium text-gray-400">{t("admin.courtManagement.mediaUnavailable")}</p>
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
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{t("admin.courtManagement.reviewModal.textNote")}</p>
                    <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-700 font-medium leading-relaxed">
                      {data.textNote}
                    </div>
                  </div>
                )}

                {/* Vote summary bar */}
                <div className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-gray-800 border-2 border-black/10 dark:border-white/10 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👍</span>
                    <div>
                      <p className="text-base font-black text-green-700">{data.validVotes}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">{t("admin.courtManagement.reviewModal.valid")}</p>
                    </div>
                  </div>
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden border border-gray-300 dark:border-gray-600">
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
                      <p className="text-[10px] font-bold text-gray-400 uppercase">{t("admin.courtManagement.reviewModal.fraud")}</p>
                    </div>
                    <span className="text-xl">👎</span>
                  </div>
                </div>

                {/* Community votes list */}
                {data.votes && data.votes.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      {t("admin.courtManagement.reviewModal.communityVotes")} ({data.votes.length})
                    </p>
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {data.votes.map(v => {
                        const isValid = v.vote?.toLowerCase() === "valid";
                        return (
                          <div
                            key={v.voteId}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <span className="text-base shrink-0">{isValid ? "👍" : "👎"}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-gray-700">{v.reviewerUsername}</p>
                              {v.reasonCode && (
                                <p className="text-[10px] text-gray-400 font-medium truncate">{v.reasonCode}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {v.wasCorrect !== null && (
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full border ${v.wasCorrect
                                  ? "bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300"
                                  : "bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300"
                                  }`}>
                                  {v.wasCorrect ? t("admin.courtManagement.voteCorrect") : t("admin.courtManagement.voteWrong")}
                                </span>
                              )}
                              {v.karmaEarned > 0 && (
                                <span className="text-[10px] font-black text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 px-1.5 py-0.5 rounded-full">
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
              <div className="lg:w-[42%] p-6 bg-gray-50/40 dark:bg-gray-800/30">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-7 h-7 rounded-xl bg-amber-300 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#1A1D20]">
                    <GavelIcon size={13} />
                  </div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">{t("admin.courtManagement.reviewModal.adminVerdict")}</h3>
                </div>

                {/* Existing admin note if case was previously resolved */}
                {data.adminNote && (
                  <div className="mb-4 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-2xl">
                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">{t("admin.courtManagement.reviewModal.prevAdminNote")}</p>
                    <p className="text-xs font-medium text-blue-800 dark:text-blue-300">{data.adminNote}</p>
                  </div>
                )}

                {alreadyResolved && (
                  <div className="mb-4 flex items-start gap-2.5 px-3.5 py-3 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-2xl">
                    <img src="/icon/UI/Warning/64px/Warning 1st 64px.png" alt="" className="w-4 h-4 object-contain shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                      {t("admin.courtManagement.alreadyResolved")} <strong>{data.status}</strong>. {t("admin.courtManagement.reviewModal.overrideWarning")}
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Verdict select */}
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wide mb-1.5">
                      {t("admin.courtManagement.reviewModal.finalVerdictLabel")}
                    </label>
                    <div className="flex gap-2">
                      {(["Approved", "Rejected"] as const).map(v => {
                        const isApproved = v === "Approved";
                        const active = verdict === v;
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setVerdict(active ? "" : v)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 border-2 rounded-2xl font-black text-sm transition-all ${active
                                ? isApproved
                                  ? "bg-green-200 border-green-600 text-green-900 shadow-none translate-x-0.5 translate-y-0.5"
                                  : "bg-red-200 border-red-600 text-red-900 shadow-none translate-x-0.5 translate-y-0.5"
                                : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
                              }`}
                          >
                            <img
                              src={isApproved ? "/icon/UI/Checkmark/64px/Checkmark 1st 64px.png" : "/icon/UI/X/64px/X 1st 64px.png"}
                              alt=""
                              className="w-4 h-4 object-contain shrink-0"
                            />
                            {v}
                          </button>
                        );
                      })}
                    </div>
                    {verdict && (
                      <div className={`mt-2 px-3 py-2 rounded-xl text-xs font-bold border-2 flex items-center gap-2 ${verdict === "Approved"
                        ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300"
                        : "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300"
                        }`}>
                        <img
                          src={verdict === "Approved" ? "/icon/UI/Checkmark/64px/Checkmark 1st 64px.png" : "/icon/UI/X/64px/X 1st 64px.png"}
                          alt=""
                          className="w-3.5 h-3.5 object-contain shrink-0"
                        />
                        {verdict === "Approved"
                          ? t("admin.courtManagement.reviewModal.approvedInfo")
                          : t("admin.courtManagement.reviewModal.rejectedInfo")}
                      </div>
                    )}
                  </div>

                  {/* Admin note */}
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wide mb-1.5">
                      {t("admin.courtManagement.reviewModal.adminNoteLabel")}
                      <span className="ml-1.5 font-semibold normal-case text-gray-400">{t("admin.courtManagement.reviewModal.optional")}</span>
                    </label>
                    <textarea
                      value={adminNote}
                      onChange={e => setAdminNote(e.target.value)}
                      rows={4}
                      placeholder={t("admin.courtManagement.reviewModal.reasonPlaceholder")}
                      className={`${inputCls} resize-none`}
                    />
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={submitting}
                      className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}
                    >
                      {t("admin.courtManagement.reviewModal.cancel")}
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !verdict}
                      className={`${btnBase} flex-1 justify-center ${verdict === "Approved" ? "bg-green-300 text-green-900" :
                        verdict === "Rejected" ? "bg-red-300 text-red-900" :
                          "bg-amber-200 text-amber-900"
                        }`}
                    >
                      {submitting
                        ? <><Spinner size={13} /> {t("admin.courtManagement.reviewModal.resolving")}</>
                        : <><GavelIcon size={13} /> {t("admin.courtManagement.reviewModal.resolve")}</>}
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
  const { t } = useTranslation();

  // ── ALERT ─────────────────────────────────────────────────────────────────
  const globalAlert = useAlert();
  const setAlert = useCallback(
    (a: { type: "success" | "error"; message: string }) =>
      a.type === "success" ? globalAlert.success(a.message) : globalAlert.error(a.message),
    [globalAlert]
  );

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

  // Tab definitions — labels resolved at render time via t()
  const tabs = [
    { id: "cases" as ActiveTab, label: t("admin.courtManagement.tabs.cases"), icon: "⚖️" },
    { id: "karma" as ActiveTab, label: t("admin.courtManagement.tabs.karma"), icon: "🏆" },
  ];

  // Cases table headers
  const caseTableHeaders = [
    t("admin.courtManagement.table.num"),
    t("admin.courtManagement.table.quest"),
    t("admin.courtManagement.table.proofType"),
    t("admin.courtManagement.table.status"),
    t("admin.courtManagement.table.votes"),
    t("admin.courtManagement.table.submitted"),
    t("admin.courtManagement.table.action"),
  ];

  // Karma table headers
  const karmaTableHeaders = [
    t("admin.courtManagement.table.rank"),
    t("admin.courtManagement.table.userId"),
    t("admin.courtManagement.table.karma"),
    t("admin.courtManagement.table.badge"),
  ];

  return (
    <>
      <PageMeta title={t("admin.courtManagement.pageTitle")} description={t("admin.courtManagement.pageSubtitle")} />
      <PageBreadcrumb pageTitle={t("admin.courtManagement.pageTitle")} />


      <div className="space-y-6 p-1">

        {/* Page Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-300 border-2 border-black flex items-center justify-center shadow-[3px_3px_0_0_#1A1D20] shrink-0">
            <GavelIcon size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">{t("admin.courtManagement.pageTitle")}</h1>
            <p className="text-sm text-gray-500 font-medium mt-0.5">
              {t("admin.courtManagement.pageSubtitle")}
            </p>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex items-end gap-1 border-b-2 border-black/10">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 font-black text-sm rounded-t-2xl border-2 transition-all ${activeTab === tab.id
                ? "bg-amber-300 border-black text-gray-900 shadow-[3px_0_0_0_#1A1D20,0_3px_0_0_#1A1D20] -mb-0.5 relative z-10"
                : "bg-white dark:bg-gray-800 border-black/20 dark:border-white/20 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-black/40"
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
            <div className="flex flex-wrap items-center gap-2 p-4 bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0_0_#1A1D20]">
              <span className="text-sm font-black text-gray-700 flex items-center gap-1.5 mr-1 shrink-0">
                <Filter className="w-4 h-4" /> {t("admin.courtManagement.filterStatus")}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_KEYS.map(key => {
                  const cfg = STATUS_CONFIG[key];
                  return (
                    <button
                      key={key}
                      onClick={() => handleStatusChange(key)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border-2 transition-all shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 ${cfg.bg} ${cfg.border} ${cfg.text} ${statusFilter === key ? "ring-2 ring-black ring-offset-1" : ""}`}
                    >
                      {cfg.icon} {cfg.label}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={fetchCases}
                disabled={casesLoading}
                className={`${btnBase} ml-auto bg-amber-200 text-amber-900 py-1.5`}
              >
                {casesLoading ? <><Spinner size={13} /> {t("admin.courtManagement.loading")}</> : t("admin.courtManagement.refresh")}
              </button>
            </div>

            {/* Status count pills */}
            {Object.keys(statusCounts).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(statusCounts).map(([status, count]) => {
                  const cfg = STATUS_CONFIG[status];
                  return (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(statusFilter === status ? "" : status)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border-2 transition-all shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 ${statusFilter === status ? "ring-2 ring-black ring-offset-1" : ""
                        } ${cfg?.bg ?? "bg-gray-100"} ${cfg?.border ?? "border-gray-400"} ${cfg?.text ?? "text-gray-600"}`}
                    >
                      {cfg?.icon} {status}: {count}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Cases Table */}
            <div className="bg-white dark:bg-[#1e2a3a] border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] overflow-hidden">
              {casesError ? (
                <div className="flex flex-col items-center gap-3 py-16">
                  <span className="text-4xl">⚠️</span>
                  <p className="font-black text-gray-700">{t("admin.courtManagement.loadFailed")}</p>
                  <p className="text-sm text-gray-400 font-medium">{casesError}</p>
                  <button onClick={fetchCases} className={`${btnBase} bg-red-100 text-red-800`}>{t("admin.courtManagement.retry")}</button>
                </div>
              ) : casesLoading && cases.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                  <Spinner size={32} />
                  <p className="font-bold text-sm">{t("admin.courtManagement.loading")}</p>
                </div>
              ) : cases.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                  <span className="text-5xl">⚖️</span>
                  <p className="font-black text-lg text-gray-500">{t("admin.courtManagement.noCases")}</p>
                  <p className="text-sm font-medium">
                    {statusFilter
                      ? t("admin.courtManagement.noCasesFiltered", { status: statusFilter })
                      : t("admin.courtManagement.docketEmpty")}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-gray-800/60">
                        {caseTableHeaders.map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {cases.map((c, idx) => (
                        <tr key={c.caseId} className="hover:bg-amber-50/40 dark:hover:bg-amber-900/10 transition-colors">
                          <td className="px-4 py-3 text-xs font-black text-gray-400">
                            {(page - 1) * PAGE_SIZE + idx + 1}
                          </td>
                          <td className="px-4 py-3 max-w-55">
                            <p className="font-bold text-gray-800 dark:text-gray-100 truncate">{c.questTitle ?? c.questTitleMasked}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5 truncate">
                              {t("admin.courtManagement.table.by", "by")} {c.proofOwnerUsername}
                            </p>
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
                              <GavelIcon size={12} /> {t("admin.courtManagement.review")}
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
                  {t(`admin.courtManagement.pagination${cases.length !== 1 ? "_plural" : ""}`, { page, count: cases.length })}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || casesLoading}
                    className={`${btnBase} bg-white text-gray-700 py-1.5 px-3 text-xs`}
                  >
                    <ChevronLeftIcon /> Prev
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={!hasMore || casesLoading}
                    className={`${btnBase} bg-white text-gray-700 py-1.5 px-3 text-xs`}
                  >
                    Next <ChevronRightIcon />
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
                  <h2 className="text-lg font-black text-gray-900">{t("admin.courtManagement.karma.title")}</h2>
                  <p className="text-xs text-gray-500 font-medium">{t("admin.courtManagement.karma.subtitle")}</p>
                </div>
              </div>
              <button onClick={fetchLeaderboard} disabled={karmaLoading}
                className={`${btnBase} bg-yellow-200 text-yellow-900 py-1.5`}>
                {karmaLoading ? <><Spinner size={13} /> {t("admin.courtManagement.karma.loading")}</> : t("admin.courtManagement.refresh")}
              </button>
            </div>

            {karmaError ? (
              <div className="flex flex-col items-center gap-3 py-16 bg-white dark:bg-[#1e2a3a] border-2 border-black rounded-2xl">
                <span className="text-4xl">⚠️</span>
                <p className="font-black text-gray-700">{t("admin.courtManagement.karma.loadFailed")}</p>
                <p className="text-sm text-gray-400">{karmaError}</p>
                <button onClick={fetchLeaderboard} className={`${btnBase} bg-red-100 text-red-800`}>{t("admin.courtManagement.retry")}</button>
              </div>
            ) : karmaLoading ? (
              <div className="flex flex-col items-center gap-3 py-16 bg-white dark:bg-[#1e2a3a] border-2 border-black rounded-2xl">
                <Spinner size={32} />
                <p className="font-bold text-sm text-gray-400">{t("admin.courtManagement.karma.loading")}</p>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 bg-white dark:bg-[#1e2a3a] border-2 border-black rounded-2xl text-gray-400">
                <span className="text-5xl">🏆</span>
                <p className="font-black text-lg text-gray-500">{t("admin.courtManagement.karma.noData")}</p>
                <p className="text-sm font-medium text-center max-w-xs">
                  {t("admin.courtManagement.karma.noDataSubtitle")}
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
                        { bg: "bg-slate-100 dark:bg-slate-800/60", border: "border-slate-400 dark:border-slate-600", pt: "pt-8", karma: "text-slate-700 dark:text-slate-300" },
                        { bg: "bg-yellow-50 dark:bg-yellow-900/20", border: "border-yellow-500 dark:border-yellow-700", pt: "pt-3", karma: "text-yellow-700 dark:text-yellow-300" },
                        { bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-400 dark:border-orange-700", pt: "pt-12", karma: "text-orange-700 dark:text-orange-300" },
                      ][podIdx];
                      return (
                        <div
                          key={entry.userId}
                          className={`flex flex-col items-center pb-4 ${podCfg.pt} border-2 ${podCfg.border} ${podCfg.bg} rounded-2xl shadow-[3px_3px_0_0_#1A1D20]`}
                        >
                          <MedalRank rank={entry.rank} />
                          <p className="text-xs font-black text-gray-600 dark:text-gray-300 mt-2">User #{entry.userId}</p>
                          <p className={`text-xl font-black mt-0.5 ${podCfg.karma}`}>
                            {entry.totalKarma.toLocaleString()}
                          </p>
                          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{t("admin.courtManagement.karma.karmaPts")}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Full leaderboard table */}
                <div className="bg-white dark:bg-[#1e2a3a] border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-gray-800/60">
                          {karmaTableHeaders.map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {leaderboard.map(entry => {
                          const rowBg =
                            entry.rank === 1 ? "bg-yellow-50/70 dark:bg-yellow-900/10 hover:bg-yellow-100/50 dark:hover:bg-yellow-900/20" :
                              entry.rank === 2 ? "bg-slate-50/70 dark:bg-slate-800/30 hover:bg-slate-100/50 dark:hover:bg-slate-700/30" :
                                entry.rank === 3 ? "bg-orange-50/70 dark:bg-orange-900/10 hover:bg-orange-100/50 dark:hover:bg-orange-900/20" :
                                  "hover:bg-gray-50/50 dark:hover:bg-gray-700/30";
                          const karmaColor =
                            entry.rank === 1 ? "text-yellow-700 dark:text-yellow-300" :
                              entry.rank === 2 ? "text-slate-600 dark:text-slate-300" :
                                entry.rank === 3 ? "text-orange-700 dark:text-orange-300" :
                                  "text-gray-700 dark:text-gray-300";
                          return (
                            <tr key={entry.userId} className={`transition-colors ${rowBg}`}>
                              <td className="px-4 py-3"><MedalRank rank={entry.rank} /></td>
                              <td className="px-4 py-3 font-black text-gray-800 dark:text-gray-100">User #{entry.userId}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span>✨</span>
                                  <span className={`text-base font-black ${karmaColor}`}>
                                    {entry.totalKarma.toLocaleString()}
                                  </span>
                                  <span className="text-xs text-gray-400 font-medium">{t("admin.courtManagement.karma.pts")}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {entry.rank === 1 && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border-2 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-300">
                                    {t("admin.courtManagement.karma.champion")}
                                  </span>
                                )}
                                {entry.rank === 2 && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border-2 bg-slate-100 dark:bg-slate-800/60 border-slate-400 dark:border-slate-600 text-slate-700 dark:text-slate-300">
                                    {t("admin.courtManagement.karma.runnerUp")}
                                  </span>
                                )}
                                {entry.rank === 3 && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border-2 bg-orange-100 dark:bg-orange-900/30 border-orange-400 dark:border-orange-600 text-orange-800 dark:text-orange-300">
                                    {t("admin.courtManagement.karma.third")}
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

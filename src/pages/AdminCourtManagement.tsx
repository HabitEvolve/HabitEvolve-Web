import { useState, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Loader2, ImageOff, Filter, Camera, Video, Monitor, Timer, Footprints, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAlert } from "../context/AlertContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { adminCourtApi } from "../api/adminCourtApi";
import SkyCard from "../components/ui/card/SkyCard";
import SkyButton from "../components/ui/button/SkyButton";
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
  label: string; cls: string; icon: ReactNode;
}> = {
  "": { label: "All", cls: "bg-gray-100 text-gray-700", icon: <Filter className="w-3.5 h-3.5 shrink-0" /> },
  Pending: { label: "Pending", cls: "bg-warning-100 text-warning-800", icon: SI("/icon/UI/Exclamation Mark/64px/Exclamation Mark 1st 64px.png") },
  Approved: { label: "Approved", cls: "bg-success-100 text-success-800", icon: SI("/icon/UI/Checkmark/64px/Checkmark 1st 64px.png") },
  Rejected: { label: "Rejected", cls: "bg-error-100 text-error-800", icon: SI("/icon/UI/X/64px/X 1st 64px.png") },
  AdminResolved: { label: "Admin Resolved", cls: "bg-blue-100 text-blue-800", icon: <img src="/icon/Item/Hammer/64px/Hammer 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain shrink-0" /> },
  ExpiredAutoApproved: { label: "Expired (Auto-Approved)", cls: "bg-gray-100 text-gray-600", icon: SI("/icon/UI/Skip/64w/Skip 1st 64px.png") },
};

const STATUS_KEYS = ["", "Pending", "Approved", "Rejected", "AdminResolved", "ExpiredAutoApproved"] as const;

// ── SHARED STYLES ─────────────────────────────────────────────────────────────
const inputCls = [
  "w-full px-4 py-2.5 rounded-sky-chip border border-sky-surf-border bg-white",
  "text-sm font-medium text-sky-ink",
  "focus:outline-none focus:border-sky-deep focus:ring-3 focus:ring-sky-deep/20",
  "placeholder:text-sky-ink-3",
].join(" ");

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
const ChevronLeftIcon = () => <ChevronLeft className="w-3.5 h-3.5" />;
const ChevronRightIcon = () => <ChevronRight className="w-3.5 h-3.5" />;
const Spinner = ({ size = 20 }: { size?: number }) => <Loader2 className="animate-spin" width={size} height={size} />;
const ImgOffIcon = () => <ImageOff className="w-7 h-7 text-sky-ink-3" />;

// ── STATUS BADGE ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["Rejected"];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.cls}`}>
      {cfg.icon} {status}
    </span>
  );
};

// ── PROOF TYPE BADGE ──────────────────────────────────────────────────────────
const PROOF_CFG: Record<string, { cls: string; icon: ReactNode }> = {
  PHOTO: { cls: "bg-violet-100 text-violet-800", icon: <Camera className="w-3 h-3 shrink-0" /> },
  VIDEO: { cls: "bg-pink-100 text-pink-800", icon: <Video className="w-3 h-3 shrink-0" /> },
  SCREENSHOT: { cls: "bg-cyan-100 text-cyan-800", icon: <Monitor className="w-3 h-3 shrink-0" /> },
  TIMER: { cls: "bg-sky-deep/10 text-sky-deep", icon: <Timer className="w-3 h-3 shrink-0" /> },
  GPS: { cls: "bg-success-100 text-success-800", icon: SI("/icon/Item/Location Pin/64px/Location Pin 1st 64px.png") },
  STEP_COUNTER: { cls: "bg-lime-100 text-lime-800", icon: <Footprints className="w-3 h-3 shrink-0" /> },
  TEXT_LOG: { cls: "bg-gray-100 text-gray-700", icon: SI("/icon/Item/Scroll/64px/Scroll 1st 64px.png") },
  SELF_CHECK: { cls: "bg-teal-100 text-teal-800", icon: <CheckCircle2 className="w-3 h-3 shrink-0" /> },
};

const ProofTypeBadge = ({ type }: { type: string }) => {
  const cfg = PROOF_CFG[type] ?? PROOF_CFG.TEXT_LOG;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.cls}`}>
      {cfg.icon} {type}
    </span>
  );
};

// ── AI VERDICT BADGE ──────────────────────────────────────────────────────────
const AI_VERDICT_CFG: Record<string, { cls: string; label: string }> = {
  approve: { cls: "bg-success-50 text-success-800", label: "AI: Approve" },
  reject: { cls: "bg-error-50 text-error-800", label: "AI: Reject" },
  suspicious: { cls: "bg-warning-50 text-warning-800", label: "AI: Suspicious" },
};

const AiVerdictPanel = ({ data }: { data: CourtCaseDto }) => {
  const { t } = useTranslation();
  if (!data.aiVerdict) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-sky-chip">
        <span className="text-lg">🤖</span>
        <p className="text-xs font-semibold text-sky-ink-3">{t("admin.courtManagement.reviewModal.aiNotUsed")}</p>
      </div>
    );
  }
  const cfg = AI_VERDICT_CFG[data.aiVerdict] ?? AI_VERDICT_CFG.suspicious;
  const confidencePct = data.aiConfidence !== null ? Math.round(data.aiConfidence * 100) : null;
  return (
    <div className={`px-4 py-3 rounded-sky-chip ${cfg.cls}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold">
          🤖 {cfg.label}
        </span>
        {confidencePct !== null && (
          <span className="text-sm font-bold">{confidencePct}%</span>
        )}
      </div>
      {confidencePct !== null && (
        <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-current opacity-70" style={{ width: `${confidencePct}%` }} />
        </div>
      )}
      {(data.aiVerdictRaw || data.aiVerdictFinal) && (
        <p className="text-[10px] font-semibold mt-2 opacity-80">
          {data.aiVerdictRaw && `CV: ${data.aiVerdictRaw}`}
          {data.aiVerdictRaw && data.aiVerdictFinal && " · "}
          {data.aiVerdictFinal && `Result: ${data.aiVerdictFinal}`}
        </p>
      )}
      {data.aiReasoning && (
        <div className="mt-2 pt-2 border-t border-black/10">
          <p className="text-[10px] font-bold uppercase tracking-wide opacity-80 mb-0.5">
            {t("admin.courtManagement.reviewModal.aiReasoningLabel")}
          </p>
          <p className="text-xs font-medium leading-relaxed">{data.aiReasoning}</p>
        </div>
      )}
    </div>
  );
};

// ── MEDAL RANK ────────────────────────────────────────────────────────────────
const MedalRank = ({ rank }: { rank: number }) => {
  if (rank === 1) return <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-yellow-100 text-base">🥇</span>;
  if (rank === 2) return <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 text-base">🥈</span>;
  if (rank === 3) return <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-orange-100 text-base">🥉</span>;
  return <span className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-sky-surf-border text-sky-ink-2 font-bold text-sm">#{rank}</span>;
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

  // Every ProofType requires mediaUrls except SELF_CHECK / TEXT_LOG (docs/PROOF_REQUIREMENTS.md §1).
  const isMedia = !["SELF_CHECK", "TEXT_LOG"].includes(data.proofType);
  const alreadyResolved = ["Approved", "Rejected", "AdminResolved", "ExpiredAutoApproved"].includes(data.status);

  const overlay = (
    <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center bg-sky-ink/60 backdrop-blur-md p-4">
      <SkyCard variant="admin" className="modal-content relative p-0 overflow-hidden w-full max-w-5xl max-h-[92vh] flex flex-col">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-warning-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sky-chip bg-warning-100 flex items-center justify-center">
              <GavelIcon size={17} />
            </div>
            <div>
              <h2 className="text-base font-bold text-sky-ink">{t("admin.courtManagement.reviewModal.title")}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs font-medium text-sky-ink-3">
                  {t("admin.courtManagement.reviewModal.submittedBy", "Submitted by")} <span className="font-bold text-sky-ink-2">{data.proofOwnerUsername}</span>
                </p>
                <StatusBadge status={data.status} />
              </div>
            </div>
          </div>
          <SkyButton type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </SkyButton>
        </div>

        {/* Modal Body */}
        {detailLoading ? (
          <div className="flex-1 flex items-center justify-center gap-3 p-16">
            <Spinner size={32} />
            <p className="text-sm font-bold text-sky-ink-3">{t("admin.courtManagement.loadingCaseDetails")}</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col lg:flex-row">

              {/* ── LEFT: EVIDENCE PANEL ──────────────────────────────── */}
              <div className="lg:w-[58%] p-6 space-y-5 border-b lg:border-b-0 lg:border-r border-gray-200">

                {/* Quest info */}
                <div>
                  <p className="text-[10px] font-bold text-sky-ink-3 uppercase tracking-widest mb-1">{t("admin.courtManagement.reviewModal.questTask")}</p>
                  <p className="text-sm font-bold text-sky-ink leading-snug">{data.questTitle ?? data.questTitleMasked}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <ProofTypeBadge type={data.proofType} />
                    <span className="text-xs font-medium text-sky-ink-3">
                      {t("admin.courtManagement.submittedDate", { date: fmtDate(data.createdAt) })}
                    </span>
                    {data.expiresAt && (
                      <span className="text-xs font-medium text-sky-peach-deep">
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
                    <p className="text-[10px] font-bold text-sky-ink-3 uppercase tracking-widest mb-2">
                      {t("admin.courtManagement.reviewModal.evidenceMedia")} ({data.mediaUrls.length} file{data.mediaUrls.length !== 1 ? "s" : ""})
                    </p>
                    <div className={`grid gap-2 ${data.mediaUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                      {data.mediaUrls.map((url, i) => (
                        <div key={i} className="aspect-video rounded-sky-chip overflow-hidden bg-gray-100">
                          {imgErrors[i] ? (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gray-50">
                              <ImgOffIcon />
                              <p className="text-[10px] font-medium text-sky-ink-3">{t("admin.courtManagement.mediaUnavailable")}</p>
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
                    <p className="text-[10px] font-bold text-sky-ink-3 uppercase tracking-widest mb-1.5">{t("admin.courtManagement.reviewModal.textNote")}</p>
                    <div className="bg-gray-50 rounded-sky-chip px-4 py-3 text-sm text-sky-ink-2 font-medium leading-relaxed">
                      {data.textNote}
                    </div>
                  </div>
                )}

                {/* Vote summary bar */}
                <div className="flex items-center gap-4 px-4 py-3 bg-white border border-gray-200 rounded-sky-chip">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👍</span>
                    <div>
                      <p className="text-base font-bold text-success-700">{data.validVotes}</p>
                      <p className="text-[10px] font-bold text-sky-ink-3 uppercase">{t("admin.courtManagement.reviewModal.valid")}</p>
                    </div>
                  </div>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    {(data.validVotes + data.fraudVotes) > 0 && (
                      <div
                        className="h-full bg-success-400 rounded-full"
                        style={{ width: `${(data.validVotes / (data.validVotes + data.fraudVotes)) * 100}%` }}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-base font-bold text-error-700">{data.fraudVotes}</p>
                      <p className="text-[10px] font-bold text-sky-ink-3 uppercase">{t("admin.courtManagement.reviewModal.fraud")}</p>
                    </div>
                    <span className="text-xl">👎</span>
                  </div>
                </div>

                {/* Community votes list */}
                {data.votes && data.votes.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-sky-ink-3 uppercase tracking-widest mb-2">
                      {t("admin.courtManagement.reviewModal.communityVotes")} ({data.votes.length})
                    </p>
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {data.votes.map(v => {
                        const isValid = v.vote?.toLowerCase() === "valid";
                        return (
                          <div
                            key={v.voteId}
                            className="flex items-center gap-3 px-3 py-2 rounded-sky-chip border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                          >
                            <span className="text-base shrink-0">{isValid ? "👍" : "👎"}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-sky-ink-2">{v.reviewerUsername}</p>
                              {v.reasonCode && (
                                <p className="text-[10px] text-sky-ink-3 font-medium truncate">{v.reasonCode}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {v.wasCorrect !== null && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${v.wasCorrect
                                  ? "bg-success-50 text-success-700"
                                  : "bg-error-50 text-error-700"
                                  }`}>
                                  {v.wasCorrect ? t("admin.courtManagement.voteCorrect") : t("admin.courtManagement.voteWrong")}
                                </span>
                              )}
                              {v.karmaEarned > 0 && (
                                <span className="text-[10px] font-bold text-warning-700 bg-warning-50 px-1.5 py-0.5 rounded-full">
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
              <div className="lg:w-[42%] p-6 bg-gray-50/60">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-7 h-7 rounded-sky-chip bg-warning-100 flex items-center justify-center">
                    <GavelIcon size={13} />
                  </div>
                  <h3 className="text-sm font-bold text-sky-ink uppercase tracking-wide">{t("admin.courtManagement.reviewModal.adminVerdict")}</h3>
                </div>

                {/* Existing admin note if case was previously resolved */}
                {data.adminNote && (
                  <div className="mb-4 px-4 py-3 bg-blue-50 rounded-sky-chip">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-1">{t("admin.courtManagement.reviewModal.prevAdminNote")}</p>
                    <p className="text-xs font-medium text-blue-800">{data.adminNote}</p>
                  </div>
                )}

                {alreadyResolved && (
                  <div className="mb-4 flex items-start gap-2.5 px-3.5 py-3 bg-warning-50 rounded-sky-chip">
                    <img src="/icon/UI/Warning/64px/Warning 1st 64px.png" alt="" className="w-4 h-4 object-contain shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-warning-800">
                      {t("admin.courtManagement.alreadyResolved")} <strong>{data.status}</strong>. {t("admin.courtManagement.reviewModal.overrideWarning")}
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Verdict select */}
                  <div>
                    <label className="block text-xs font-bold text-sky-ink-2 uppercase tracking-wide mb-1.5">
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
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-sky-chip font-bold text-sm transition-all ${active
                              ? isApproved
                                ? "bg-success-200 text-success-900"
                                : "bg-error-200 text-error-900"
                              : "bg-white border border-sky-surf-border text-sky-ink-3 hover:bg-gray-50"
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
                      <div className={`mt-2 px-3 py-2 rounded-sky-chip text-xs font-bold flex items-center gap-2 ${verdict === "Approved"
                        ? "bg-success-50 text-success-700"
                        : "bg-error-50 text-error-700"
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
                    <label className="block text-xs font-bold text-sky-ink-2 uppercase tracking-wide mb-1.5">
                      {t("admin.courtManagement.reviewModal.adminNoteLabel")}
                      <span className="ml-1.5 font-semibold normal-case text-sky-ink-3">{t("admin.courtManagement.reviewModal.optional")}</span>
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
                    <SkyButton type="button" variant="secondary" onClick={onClose} disabled={submitting} className="flex-1">
                      {t("admin.courtManagement.reviewModal.cancel")}
                    </SkyButton>
                    <SkyButton
                      type="submit"
                      variant={verdict === "Approved" ? "success" : verdict === "Rejected" ? "destructive" : "primary"}
                      disabled={submitting || !verdict}
                      className="flex-1"
                    >
                      {submitting
                        ? <><Spinner size={13} /> {t("admin.courtManagement.reviewModal.resolving")}</>
                        : <><GavelIcon size={13} /> {t("admin.courtManagement.reviewModal.resolve")}</>}
                    </SkyButton>
                  </div>
                </form>
              </div>

            </div>
          </div>
        )}
      </SkyCard>
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
          <div className="w-12 h-12 rounded-sky-chip bg-warning-100 flex items-center justify-center shrink-0">
            <GavelIcon size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-sky-ink">{t("admin.courtManagement.pageTitle")}</h1>
            <p className="text-sm text-sky-ink-2 font-medium mt-0.5">
              {t("admin.courtManagement.pageSubtitle")}
            </p>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex items-end gap-1 border-b border-gray-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 font-bold text-sm rounded-t-sky-chip transition-all ${activeTab === tab.id
                ? "bg-warning-100 text-sky-ink -mb-px border-b-2 border-warning-400"
                : "text-sky-ink-3 hover:bg-gray-50"
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
            <SkyCard variant="admin" className="p-4 flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-sky-ink-2 flex items-center gap-1.5 mr-1 shrink-0">
                <Filter className="w-4 h-4" /> {t("admin.courtManagement.filterStatus")}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_KEYS.map(key => {
                  const cfg = STATUS_CONFIG[key];
                  return (
                    <button
                      key={key}
                      onClick={() => handleStatusChange(key)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${cfg.cls} ${statusFilter === key ? "ring-2 ring-sky-deep ring-offset-1" : ""}`}
                    >
                      {cfg.icon} {cfg.label}
                    </button>
                  );
                })}
              </div>
              <SkyButton type="button" variant="secondary" size="sm" onClick={fetchCases} disabled={casesLoading} className="ml-auto">
                {casesLoading ? <><Spinner size={13} /> {t("admin.courtManagement.loading")}</> : t("admin.courtManagement.refresh")}
              </SkyButton>
            </SkyCard>

            {/* Status count pills */}
            {Object.keys(statusCounts).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(statusCounts).map(([status, count]) => {
                  const cfg = STATUS_CONFIG[status];
                  return (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(statusFilter === status ? "" : status)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${statusFilter === status ? "ring-2 ring-sky-deep ring-offset-1" : ""
                        } ${cfg?.cls ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {cfg?.icon} {status}: {count}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Cases Table */}
            <SkyCard variant="admin" className="p-0 overflow-hidden">
              {casesError ? (
                <div className="flex flex-col items-center gap-3 py-16">
                  <span className="text-4xl">⚠️</span>
                  <p className="font-bold text-sky-ink-2">{t("admin.courtManagement.loadFailed")}</p>
                  <p className="text-sm text-sky-ink-3 font-medium">{casesError}</p>
                  <SkyButton type="button" variant="destructive" size="sm" onClick={fetchCases}>{t("admin.courtManagement.retry")}</SkyButton>
                </div>
              ) : casesLoading && cases.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-sky-ink-3">
                  <Spinner size={32} />
                  <p className="font-bold text-sm">{t("admin.courtManagement.loading")}</p>
                </div>
              ) : cases.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-sky-ink-3">
                  <span className="text-5xl">⚖️</span>
                  <p className="font-bold text-lg text-sky-ink-2">{t("admin.courtManagement.noCases")}</p>
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
                      <tr className="border-b border-gray-200 bg-gray-50/60">
                        {caseTableHeaders.map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-sky-ink-3">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cases.map((c, idx) => (
                        <tr key={c.caseId} className="sky-table-row">
                          <td className="px-4 py-3 text-xs font-bold text-sky-ink-3">
                            {(page - 1) * PAGE_SIZE + idx + 1}
                          </td>
                          <td className="px-4 py-3 max-w-55">
                            <p className="font-bold text-sky-ink truncate">{c.questTitle ?? c.questTitleMasked}</p>
                            <p className="text-xs text-sky-ink-3 font-medium mt-0.5 truncate">
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
                            <div className="flex items-center gap-1 text-xs font-bold whitespace-nowrap">
                              <span className="text-success-700">👍 {c.validVotes}</span>
                              <span className="text-sky-ink-3 mx-0.5">|</span>
                              <span className="text-error-700">👎 {c.fraudVotes}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-sky-ink-3 font-medium whitespace-nowrap">
                            {fmtDate(c.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <SkyButton type="button" variant="secondary" size="sm" onClick={() => setReviewingCase(c)}>
                              <GavelIcon size={12} /> {t("admin.courtManagement.review")}
                            </SkyButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SkyCard>

            {/* Pagination */}
            {!casesError && (cases.length > 0 || page > 1) && (
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-sky-ink-3">
                  {t(`admin.courtManagement.pagination${cases.length !== 1 ? "_plural" : ""}`, { page, count: cases.length })}
                </p>
                <div className="flex gap-2">
                  <SkyButton type="button" variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || casesLoading}>
                    <ChevronLeftIcon /> Prev
                  </SkyButton>
                  <SkyButton type="button" variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={!hasMore || casesLoading}>
                    Next <ChevronRightIcon />
                  </SkyButton>
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
                <div className="w-10 h-10 rounded-sky-chip bg-warning-100 flex items-center justify-center">
                  <TrophyIcon size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-sky-ink">{t("admin.courtManagement.karma.title")}</h2>
                  <p className="text-xs text-sky-ink-3 font-medium">{t("admin.courtManagement.karma.subtitle")}</p>
                </div>
              </div>
              <SkyButton type="button" variant="secondary" size="sm" onClick={fetchLeaderboard} disabled={karmaLoading}>
                {karmaLoading ? <><Spinner size={13} /> {t("admin.courtManagement.karma.loading")}</> : t("admin.courtManagement.refresh")}
              </SkyButton>
            </div>

            {karmaError ? (
              <SkyCard variant="admin" className="flex flex-col items-center gap-3 py-16">
                <span className="text-4xl">⚠️</span>
                <p className="font-bold text-sky-ink-2">{t("admin.courtManagement.karma.loadFailed")}</p>
                <p className="text-sm text-sky-ink-3">{karmaError}</p>
                <SkyButton type="button" variant="destructive" size="sm" onClick={fetchLeaderboard}>{t("admin.courtManagement.retry")}</SkyButton>
              </SkyCard>
            ) : karmaLoading ? (
              <SkyCard variant="admin" className="flex flex-col items-center gap-3 py-16">
                <Spinner size={32} />
                <p className="font-bold text-sm text-sky-ink-3">{t("admin.courtManagement.karma.loading")}</p>
              </SkyCard>
            ) : leaderboard.length === 0 ? (
              <SkyCard variant="admin" className="flex flex-col items-center gap-3 py-16 text-sky-ink-3">
                <span className="text-5xl">🏆</span>
                <p className="font-bold text-lg text-sky-ink-2">{t("admin.courtManagement.karma.noData")}</p>
                <p className="text-sm font-medium text-center max-w-xs">
                  {t("admin.courtManagement.karma.noDataSubtitle")}
                </p>
              </SkyCard>
            ) : (
              <div className="space-y-4">

                {/* Podium — Top 3 displayed as: 2nd | 1st | 3rd */}
                {top3.some(Boolean) && (
                  <div className="grid grid-cols-3 gap-3">
                    {([top3[1], top3[0], top3[2]] as const).map((entry, podIdx) => {
                      if (!entry) return <div key={podIdx} />;
                      const podCfg = [
                        { bg: "bg-slate-50", pt: "pt-8", karma: "text-slate-700" },
                        { bg: "bg-warning-50", pt: "pt-3", karma: "text-warning-700" },
                        { bg: "bg-orange-50", pt: "pt-12", karma: "text-orange-700" },
                      ][podIdx];
                      return (
                        <div
                          key={entry.userId}
                          className={`flex flex-col items-center pb-4 ${podCfg.pt} ${podCfg.bg} rounded-sky-card`}
                        >
                          <MedalRank rank={entry.rank} />
                          <p className="text-xs font-bold text-sky-ink-2 mt-2">User #{entry.userId}</p>
                          <p className={`text-xl font-bold mt-0.5 ${podCfg.karma}`}>
                            {entry.totalKarma.toLocaleString()}
                          </p>
                          <p className="text-[10px] font-bold text-sky-ink-3 uppercase tracking-wide">{t("admin.courtManagement.karma.karmaPts")}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Full leaderboard table */}
                <SkyCard variant="admin" className="p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50/60">
                          {karmaTableHeaders.map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-sky-ink-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map(entry => {
                          const rowBg =
                            entry.rank === 1 ? "bg-warning-50/70" :
                              entry.rank === 2 ? "bg-slate-50/70" :
                                entry.rank === 3 ? "bg-orange-50/70" :
                                  "";
                          const karmaColor =
                            entry.rank === 1 ? "text-warning-700" :
                              entry.rank === 2 ? "text-slate-600" :
                                entry.rank === 3 ? "text-orange-700" :
                                  "text-sky-ink-2";
                          return (
                            <tr key={entry.userId} className={`sky-table-row ${rowBg}`}>
                              <td className="px-4 py-3"><MedalRank rank={entry.rank} /></td>
                              <td className="px-4 py-3 font-bold text-sky-ink">User #{entry.userId}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span>✨</span>
                                  <span className={`text-base font-bold ${karmaColor}`}>
                                    {entry.totalKarma.toLocaleString()}
                                  </span>
                                  <span className="text-xs text-sky-ink-3 font-medium">{t("admin.courtManagement.karma.pts")}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {entry.rank === 1 && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-warning-100 text-warning-800">
                                    {t("admin.courtManagement.karma.champion")}
                                  </span>
                                )}
                                {entry.rank === 2 && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                                    {t("admin.courtManagement.karma.runnerUp")}
                                  </span>
                                )}
                                {entry.rank === 3 && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
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
                </SkyCard>
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

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Loader2, ImageOff, Filter, Camera, Video, Monitor, Timer, Footprints, CheckCircle2, ThumbsUp, ThumbsDown, Bot, Sparkles, AlertTriangle, ScrollText, MapPin, Gavel, Trophy, Check, XCircle, CircleAlert, SkipForward } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

const STATUS_CONFIG: Record<string, {
  label: string; cls: string; Icon: LucideIcon;
}> = {
  "": { label: "All", cls: "sky-badge-neutral", Icon: Filter },
  Pending: { label: "Pending", cls: "sky-badge-pending", Icon: CircleAlert },
  Approved: { label: "Approved", cls: "sky-badge-success", Icon: Check },
  Rejected: { label: "Rejected", cls: "sky-badge-danger", Icon: XCircle },
  AdminResolved: { label: "Admin Resolved", cls: "sky-badge-info", Icon: Gavel },
  ExpiredAutoApproved: { label: "Expired (Auto-Approved)", cls: "sky-badge-neutral", Icon: SkipForward },
};

const STATUS_KEYS = ["", "Pending", "Approved", "Rejected", "AdminResolved", "ExpiredAutoApproved"] as const;

// ── SHARED STYLES ─────────────────────────────────────────────────────────────
const inputCls = [
  "w-full px-4 py-2.5 rounded-sky-chip border border-white/80 bg-white/60",
  "text-sm text-sky-ink transition",
  "focus:outline-hidden focus:border-sky-deep focus:bg-white/85 focus:ring-3 focus:ring-sky-deep/18",
  "placeholder:text-sky-ink-3",
].join(" ");

// Section eyebrow — small-caps ink-3 label that opens each evidence block.
const eyebrow = "text-[10px] font-semibold text-sky-ink-3 uppercase tracking-[0.14em]";

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
// Court and karma each keep one identifying glyph, sized by the caller so a
// header, a table button and an empty state can share the same mark. They take
// the warm accent — a verdict is attention-worthy, never an operational action.
const GavelIcon = ({ size = 16 }: { size?: number }) => (
  <Gavel width={size} height={size} className="shrink-0 text-sky-peach-deep" />
);
const TrophyIcon = ({ size = 16 }: { size?: number }) => (
  <Trophy width={size} height={size} className="shrink-0 text-sky-peach-deep" />
);
const ChevronLeftIcon = () => <ChevronLeft className="w-3.5 h-3.5" />;
const ChevronRightIcon = () => <ChevronRight className="w-3.5 h-3.5" />;
const Spinner = ({ size = 20 }: { size?: number }) => <Loader2 className="animate-spin" width={size} height={size} />;
const ImgOffIcon = () => <ImageOff className="w-7 h-7 text-sky-ink-3" />;

// ── STATUS BADGE ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["Rejected"];
  return (
    <span className={`sky-badge gap-1.5 ${cfg.cls}`}>
      <cfg.Icon className="w-3 h-3 shrink-0" /> {status}
    </span>
  );
};

// ── PROOF TYPE BADGE ──────────────────────────────────────────────────────────
// Proof type is a taxonomy, not a status — so it never borrows the success/danger
// hues. It rides the two neutral-ish accents (deep = capture, violet = media)
// with the glyph carrying the distinction, per "state is never colour-only".
const PROOF_CFG: Record<string, { cls: string; Icon: LucideIcon }> = {
  PHOTO: { cls: "bg-sky-violet/12 text-sky-violet-deep", Icon: Camera },
  VIDEO: { cls: "bg-sky-violet/12 text-sky-violet-deep", Icon: Video },
  SCREENSHOT: { cls: "bg-sky-violet/12 text-sky-violet-deep", Icon: Monitor },
  TIMER: { cls: "bg-sky-deep/10 text-sky-deep", Icon: Timer },
  GPS: { cls: "bg-sky-deep/10 text-sky-deep", Icon: MapPin },
  STEP_COUNTER: { cls: "bg-sky-deep/10 text-sky-deep", Icon: Footprints },
  TEXT_LOG: { cls: "bg-sky-ink/7 text-sky-ink-2", Icon: ScrollText },
  SELF_CHECK: { cls: "bg-sky-ink/7 text-sky-ink-2", Icon: CheckCircle2 },
};

const ProofTypeBadge = ({ type }: { type: string }) => {
  const cfg = PROOF_CFG[type] ?? PROOF_CFG.TEXT_LOG;
  return (
    <span className={`sky-badge ${cfg.cls}`}>
      <cfg.Icon className="w-3 h-3 shrink-0" /> {type}
    </span>
  );
};

// ── AI VERDICT BADGE ──────────────────────────────────────────────────────────
const AI_VERDICT_CFG: Record<string, { rail: string; tint: string; text: string; label: string }> = {
  approve: { rail: "bg-sky-teal", tint: "bg-sky-teal-bg", text: "text-sky-teal", label: "AI: Approve" },
  reject: { rail: "bg-sky-rose", tint: "bg-sky-rose/12", text: "text-sky-rose-deep", label: "AI: Reject" },
  suspicious: { rail: "bg-sky-peach-deep", tint: "bg-sky-peach/18", text: "text-sky-peach-deep", label: "AI: Suspicious" },
};

const AiVerdictPanel = ({ data }: { data: CourtCaseDto }) => {
  const { t } = useTranslation();
  if (!data.aiVerdict) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-sky-chip sky-glass-chip">
        <Bot className="w-4 h-4 text-sky-ink-3 shrink-0" />
        <p className="text-xs font-medium text-sky-ink-3">{t("admin.courtManagement.reviewModal.aiNotUsed")}</p>
      </div>
    );
  }
  const cfg = AI_VERDICT_CFG[data.aiVerdict] ?? AI_VERDICT_CFG.suspicious;
  const confidencePct = data.aiConfidence !== null ? Math.round(data.aiConfidence * 100) : null;
  return (
    // Three cues, never colour alone: accent rail + tint + the Bot glyph.
    <div className={`relative overflow-hidden pl-4 pr-4 py-3 rounded-sky-chip ${cfg.tint} ${cfg.text}`}>
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.rail}`} />
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
          <Bot className="w-3.5 h-3.5 shrink-0" /> {cfg.label}
        </span>
        {confidencePct !== null && (
          <span className="font-display text-sm font-semibold tabular-nums">{confidencePct}%</span>
        )}
      </div>
      {confidencePct !== null && (
        <div className="mt-2 h-1.5 bg-white/55 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-current opacity-70" style={{ width: `${confidencePct}%` }} />
        </div>
      )}
      {(data.aiVerdictRaw || data.aiVerdictFinal) && (
        <p className="text-[10px] font-medium mt-2 opacity-80">
          {data.aiVerdictRaw && `CV: ${data.aiVerdictRaw}`}
          {data.aiVerdictRaw && data.aiVerdictFinal && " · "}
          {data.aiVerdictFinal && `Result: ${data.aiVerdictFinal}`}
        </p>
      )}
      {data.aiReasoning && (
        <div className="mt-2 pt-2 border-t border-current/15">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-80 mb-0.5">
            {t("admin.courtManagement.reviewModal.aiReasoningLabel")}
          </p>
          <p className="text-xs leading-relaxed">{data.aiReasoning}</p>
        </div>
      )}
    </div>
  );
};

// ── MEDAL RANK ────────────────────────────────────────────────────────────────
// Drawn medallions instead of 🥇🥈🥉 — a ranked numeral inside a metal-tinted
// disc keeps the podium readable at 9px and stays inside the token palette.
const MEDAL_CFG: Record<number, { ring: string; face: string }> = {
  1: { ring: "ring-sky-peach-deep/45", face: "bg-linear-to-b from-sky-peach/45 to-sky-peach/25 text-sky-peach-deep" },
  2: { ring: "ring-sky-ink/20", face: "bg-linear-to-b from-white/85 to-sky-ink/8 text-sky-ink-2" },
  3: { ring: "ring-sky-violet/35", face: "bg-linear-to-b from-sky-violet/22 to-sky-violet/10 text-sky-violet-deep" },
};

const MedalRank = ({ rank }: { rank: number }) => {
  const cfg = MEDAL_CFG[rank];
  if (!cfg) {
    return <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-sky-ink/6 text-sky-ink-3 font-display font-semibold text-sm tabular-nums">{rank}</span>;
  }
  return (
    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full ring-2 shadow-[0_4px_10px_-4px_rgba(36,52,77,0.35)] font-display text-sm font-semibold tabular-nums ${cfg.ring} ${cfg.face}`}>
      {rank}
    </span>
  );
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
    <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center bg-sky-ink/45 backdrop-blur-[18px] p-4">
      <SkyCard variant="admin" className="modal-content relative p-0 overflow-hidden w-full max-w-5xl max-h-[92vh] flex flex-col sky-in">
        {/* Peach rail: Court is an attention/adjudication surface, not destructive. */}
        <span className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-sky-peach to-sky-peach-deep z-10" />

        {/* Modal Header */}
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-white/70 bg-white/45 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sky-chip bg-sky-peach/20 flex items-center justify-center shrink-0">
              <GavelIcon size={17} />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-sky-ink">{t("admin.courtManagement.reviewModal.title")}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-sky-ink-3">
                  {t("admin.courtManagement.reviewModal.submittedBy", "Submitted by")} <span className="font-semibold text-sky-ink-2">{data.proofOwnerUsername}</span>
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
          <div className="relative flex-1 flex items-center justify-center gap-3 p-16">
            <Spinner size={32} />
            <p className="text-sm font-medium text-sky-ink-3">{t("admin.courtManagement.loadingCaseDetails")}</p>
          </div>
        ) : (
          <div className="relative flex-1 overflow-y-auto">
            <div className="flex flex-col lg:flex-row">

              {/* ── LEFT: EVIDENCE PANEL ──────────────────────────────── */}
              <div className="lg:w-[58%] p-6 space-y-5 border-b lg:border-b-0 lg:border-r border-white/70">

                {/* Quest info */}
                <div>
                  <p className={`${eyebrow} mb-1`}>{t("admin.courtManagement.reviewModal.questTask")}</p>
                  <p className="font-display text-base font-semibold text-sky-ink leading-snug">{data.questTitle ?? data.questTitleMasked}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <ProofTypeBadge type={data.proofType} />
                    <span className="text-xs text-sky-ink-3">
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
                    <p className={`${eyebrow} mb-2`}>
                      {t("admin.courtManagement.reviewModal.evidenceMedia")} ({data.mediaUrls.length} file{data.mediaUrls.length !== 1 ? "s" : ""})
                    </p>
                    <div className={`grid gap-2 ${data.mediaUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                      {data.mediaUrls.map((url, i) => (
                        <div key={i} className="aspect-video rounded-sky-chip overflow-hidden border border-white/80 bg-sky-ink/5">
                          {imgErrors[i] ? (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
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
                    <p className={`${eyebrow} mb-1.5`}>{t("admin.courtManagement.reviewModal.textNote")}</p>
                    <div className="sky-glass-chip rounded-sky-chip px-4 py-3 text-sm text-sky-ink-2 leading-relaxed">
                      {data.textNote}
                    </div>
                  </div>
                )}

                {/* Vote summary bar */}
                <div className="flex items-center gap-4 px-4 py-3 rounded-sky-chip border border-white/80 bg-white/55">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-sky-chip bg-sky-teal-bg text-sky-teal shrink-0">
                      <ThumbsUp className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="font-display text-base font-semibold text-sky-teal tabular-nums leading-none">{data.validVotes}</p>
                      <p className={`${eyebrow} mt-1`}>{t("admin.courtManagement.reviewModal.valid")}</p>
                    </div>
                  </div>
                  <div className="flex-1 h-2 bg-sky-rose/20 rounded-full overflow-hidden">
                    {(data.validVotes + data.fraudVotes) > 0 && (
                      <div
                        className="h-full bg-sky-teal rounded-full transition-[width] duration-500"
                        style={{ width: `${(data.validVotes / (data.validVotes + data.fraudVotes)) * 100}%` }}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="font-display text-base font-semibold text-sky-rose-deep tabular-nums leading-none">{data.fraudVotes}</p>
                      <p className={`${eyebrow} mt-1`}>{t("admin.courtManagement.reviewModal.fraud")}</p>
                    </div>
                    <span className="flex items-center justify-center w-8 h-8 rounded-sky-chip bg-sky-rose/12 text-sky-rose-deep shrink-0">
                      <ThumbsDown className="w-4 h-4" />
                    </span>
                  </div>
                </div>

                {/* Community votes list */}
                {data.votes && data.votes.length > 0 && (
                  <div>
                    <p className={`${eyebrow} mb-2`}>
                      {t("admin.courtManagement.reviewModal.communityVotes")} ({data.votes.length})
                    </p>
                    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                      {data.votes.map(v => {
                        const isValid = v.vote?.toLowerCase() === "valid";
                        return (
                          <div
                            key={v.voteId}
                            className="flex items-center gap-3 px-3 py-2 rounded-sky-chip border border-white/80 bg-white/55 hover:bg-white/80 transition-colors"
                          >
                            <span className={`flex items-center justify-center w-6 h-6 rounded-full shrink-0 ${isValid ? "bg-sky-teal-bg text-sky-teal" : "bg-sky-rose/12 text-sky-rose-deep"}`}>
                              {isValid ? <ThumbsUp className="w-3 h-3" /> : <ThumbsDown className="w-3 h-3" />}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-sky-ink-2">{v.reviewerUsername}</p>
                              {v.reasonCode && (
                                <p className="text-[10px] text-sky-ink-3 truncate">{v.reasonCode}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {v.wasCorrect !== null && (
                                <span className={`sky-badge text-[10px] ${v.wasCorrect ? "sky-badge-success" : "sky-badge-danger"}`}>
                                  {v.wasCorrect ? t("admin.courtManagement.voteCorrect") : t("admin.courtManagement.voteWrong")}
                                </span>
                              )}
                              {v.karmaEarned > 0 && (
                                <span className="sky-badge sky-badge-pending text-[10px] tabular-nums">
                                  <Sparkles className="w-2.5 h-2.5" /> +{v.karmaEarned}
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
              <div className="lg:w-[42%] p-6 bg-sky-ink/[0.035]">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-7 h-7 rounded-sky-chip bg-sky-peach/20 flex items-center justify-center shrink-0">
                    <GavelIcon size={13} />
                  </div>
                  <h3 className="font-display text-sm font-semibold text-sky-ink uppercase tracking-[0.08em]">{t("admin.courtManagement.reviewModal.adminVerdict")}</h3>
                </div>

                {/* Existing admin note if case was previously resolved */}
                {data.adminNote && (
                  <div className="relative mb-4 overflow-hidden px-4 py-3 rounded-sky-chip bg-sky-deep/8">
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-deep" />
                    <p className="text-[10px] font-semibold text-sky-deep uppercase tracking-[0.12em] mb-1">{t("admin.courtManagement.reviewModal.prevAdminNote")}</p>
                    <p className="text-xs text-sky-ink-2">{data.adminNote}</p>
                  </div>
                )}

                {alreadyResolved && (
                  <div className="relative mb-4 overflow-hidden flex items-start gap-2.5 pl-4 pr-3.5 py-3 rounded-sky-chip bg-sky-peach/18">
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-peach-deep" />
                    <AlertTriangle className="w-4 h-4 text-sky-peach-deep shrink-0 mt-px" />
                    <p className="text-xs font-medium text-sky-peach-deep">
                      {t("admin.courtManagement.alreadyResolved")} <strong className="font-semibold">{data.status}</strong>. {t("admin.courtManagement.reviewModal.overrideWarning")}
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Verdict select */}
                  <div>
                    <label className={`block ${eyebrow} mb-1.5`}>
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
                            aria-pressed={active}
                            onClick={() => setVerdict(active ? "" : v)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-sky-chip font-semibold text-sm transition ${active
                              ? isApproved
                                ? "bg-sky-teal text-white shadow-[0_10px_20px_-10px_rgba(46,156,142,0.95)]"
                                : "bg-sky-rose text-white shadow-[0_10px_20px_-10px_rgba(196,112,138,0.95)]"
                              : "border border-white/80 bg-white/55 text-sky-ink-3 hover:bg-white/85 hover:text-sky-ink-2"
                              }`}
                          >
                            {isApproved
                              ? <Check className="w-4 h-4 shrink-0" />
                              : <XCircle className="w-4 h-4 shrink-0" />}
                            {v}
                          </button>
                        );
                      })}
                    </div>
                    {verdict && (
                      <div className={`mt-2 px-3 py-2 rounded-sky-chip text-xs font-medium flex items-center gap-2 ${verdict === "Approved"
                        ? "bg-sky-teal-bg text-sky-teal"
                        : "bg-sky-rose/12 text-sky-rose-deep"
                        }`}>
                        {verdict === "Approved"
                          ? <Check className="w-3.5 h-3.5 shrink-0" />
                          : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                        {verdict === "Approved"
                          ? t("admin.courtManagement.reviewModal.approvedInfo")
                          : t("admin.courtManagement.reviewModal.rejectedInfo")}
                      </div>
                    )}
                  </div>

                  {/* Admin note */}
                  <div>
                    <label className={`block ${eyebrow} mb-1.5`}>
                      {t("admin.courtManagement.reviewModal.adminNoteLabel")}
                      <span className="ml-1.5 normal-case tracking-normal text-sky-ink-3">{t("admin.courtManagement.reviewModal.optional")}</span>
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
    { id: "cases" as ActiveTab, label: t("admin.courtManagement.tabs.cases"), Icon: Gavel },
    { id: "karma" as ActiveTab, label: t("admin.courtManagement.tabs.karma"), Icon: Trophy },
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
          <div className="w-12 h-12 rounded-sky-md bg-sky-peach/20 flex items-center justify-center shrink-0">
            <GavelIcon size={22} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-sky-ink">{t("admin.courtManagement.pageTitle")}</h1>
            <p className="text-sm text-sky-ink-2 mt-0.5">
              {t("admin.courtManagement.pageSubtitle")}
            </p>
          </div>
        </div>

        {/* Tab Strip — segmented control on glass, deep fill for the active tab */}
        <div className="inline-flex gap-1 p-1 rounded-sky-chip sky-glass-chip">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-sky-chip font-medium text-sm transition ${activeTab === tab.id
                ? "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-fill"
                : "text-sky-ink-2 hover:text-sky-ink hover:bg-white/55"
                }`}
            >
              <tab.Icon className="w-4 h-4 shrink-0" /> {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════ TAB A: COURT CASES ══════════════════════════════ */}
        {activeTab === "cases" && (
          <div className="space-y-4">

            {/* Filter Bar */}
            <SkyCard variant="admin" className="p-4 flex flex-wrap items-center gap-2">
              <span className="relative text-sm font-medium text-sky-ink-2 flex items-center gap-1.5 mr-1 shrink-0">
                <Filter className="w-4 h-4" /> {t("admin.courtManagement.filterStatus")}
              </span>
              <div className="relative flex flex-wrap gap-1.5 rounded-sky-md bg-white/42 ring-1 ring-white/70 p-1.5">
                {STATUS_KEYS.map(key => {
                  const cfg = STATUS_CONFIG[key];
                  const on = statusFilter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => handleStatusChange(key)}
                      className={`sky-badge gap-1.5 px-3 py-1.5 transition ${cfg.cls} ${on ? "shadow-sky-chip ring-2 ring-sky-deep/70" : "opacity-65 hover:opacity-100"}`}
                    >
                      <cfg.Icon className="w-3 h-3 shrink-0" /> {cfg.label}
                    </button>
                  );
                })}
              </div>
              <SkyButton type="button" variant="secondary" size="sm" onClick={fetchCases} disabled={casesLoading} className="relative ml-auto">
                {casesLoading ? <><Spinner size={13} /> {t("admin.courtManagement.loading")}</> : t("admin.courtManagement.refresh")}
              </SkyButton>
            </SkyCard>

            {/* Status count pills */}
            {Object.keys(statusCounts).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(statusCounts).map(([status, count]) => {
                  const cfg = STATUS_CONFIG[status];
                  const on = statusFilter === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      aria-pressed={on}
                      onClick={() => handleStatusChange(on ? "" : status)}
                      className={`sky-badge gap-1.5 px-3 py-1.5 transition ${cfg?.cls ?? "sky-badge-neutral"} ${on ? "shadow-sky-chip ring-2 ring-sky-deep/70" : "opacity-65 hover:opacity-100"}`}
                    >
                      {cfg && <cfg.Icon className="w-3 h-3 shrink-0" />} {status}
                      <span className="font-display font-semibold tabular-nums">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Cases Table */}
            <SkyCard variant="admin" className="p-0 overflow-hidden">
              {casesError ? (
                <div className="relative flex flex-col items-center gap-3 py-16">
                  <span className="flex items-center justify-center w-14 h-14 rounded-full bg-sky-rose/12 text-sky-rose-deep">
                    <AlertTriangle className="w-6 h-6" />
                  </span>
                  <p className="font-display font-semibold text-sky-ink">{t("admin.courtManagement.loadFailed")}</p>
                  <p className="text-sm text-sky-ink-2">{casesError}</p>
                  <SkyButton type="button" variant="secondary" size="sm" onClick={fetchCases}>{t("admin.courtManagement.retry")}</SkyButton>
                </div>
              ) : casesLoading && cases.length === 0 ? (
                <div className="relative flex flex-col items-center gap-3 py-16 text-sky-ink-2">
                  <Spinner size={32} />
                  <p className="text-sm font-medium">{t("admin.courtManagement.loading")}</p>
                </div>
              ) : cases.length === 0 ? (
                <div className="relative flex flex-col items-center gap-3 py-16">
                  <span className="flex items-center justify-center w-16 h-16 rounded-full bg-sky-peach/18">
                    <GavelIcon size={30} />
                  </span>
                  <p className="font-display font-semibold text-lg text-sky-ink">{t("admin.courtManagement.noCases")}</p>
                  <p className="text-sm text-sky-ink-2">
                    {statusFilter
                      ? t("admin.courtManagement.noCasesFiltered", { status: statusFilter })
                      : t("admin.courtManagement.docketEmpty")}
                  </p>
                </div>
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="sky-table-head">
                        {caseTableHeaders.map(h => (
                          <th key={h} className="px-4 py-3 text-left whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cases.map((c, idx) => (
                        <tr key={c.caseId} className="sky-table-row">
                          <td className="px-4 py-3 text-xs font-medium text-sky-ink-3 tabular-nums">
                            {(page - 1) * PAGE_SIZE + idx + 1}
                          </td>
                          <td className="px-4 py-3 max-w-55">
                            <p className="font-medium text-sky-ink truncate">{c.questTitle ?? c.questTitleMasked}</p>
                            <p className="text-xs text-sky-ink-3 mt-0.5 truncate">
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
                            <div className="flex items-center gap-2 text-xs font-semibold whitespace-nowrap tabular-nums">
                              <span className="inline-flex items-center gap-1 text-sky-teal"><ThumbsUp className="w-3 h-3" /> {c.validVotes}</span>
                              <span className="text-sky-ink/20">|</span>
                              <span className="inline-flex items-center gap-1 text-sky-rose-deep"><ThumbsDown className="w-3 h-3" /> {c.fraudVotes}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-sky-ink-3 whitespace-nowrap">
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
                <p className="text-xs font-medium text-sky-ink-3 tabular-nums">
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
                <div className="w-10 h-10 rounded-sky-md bg-sky-peach/20 flex items-center justify-center shrink-0">
                  <TrophyIcon size={20} />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold text-sky-ink">{t("admin.courtManagement.karma.title")}</h2>
                  <p className="text-xs text-sky-ink-3">{t("admin.courtManagement.karma.subtitle")}</p>
                </div>
              </div>
              <SkyButton type="button" variant="secondary" size="sm" onClick={fetchLeaderboard} disabled={karmaLoading}>
                {karmaLoading ? <><Spinner size={13} /> {t("admin.courtManagement.karma.loading")}</> : t("admin.courtManagement.refresh")}
              </SkyButton>
            </div>

            {karmaError ? (
              <SkyCard variant="admin" className="flex flex-col items-center gap-3 py-16">
                <span className="relative flex items-center justify-center w-14 h-14 rounded-full bg-sky-rose/12 text-sky-rose-deep">
                  <AlertTriangle className="w-6 h-6" />
                </span>
                <p className="relative font-display font-semibold text-sky-ink">{t("admin.courtManagement.karma.loadFailed")}</p>
                <p className="relative text-sm text-sky-ink-2">{karmaError}</p>
                <SkyButton type="button" variant="secondary" size="sm" onClick={fetchLeaderboard}>{t("admin.courtManagement.retry")}</SkyButton>
              </SkyCard>
            ) : karmaLoading ? (
              <SkyCard variant="admin" className="flex flex-col items-center gap-3 py-16">
                <span className="relative text-sky-ink-2"><Spinner size={32} /></span>
                <p className="relative text-sm font-medium text-sky-ink-2">{t("admin.courtManagement.karma.loading")}</p>
              </SkyCard>
            ) : leaderboard.length === 0 ? (
              <SkyCard variant="admin" className="flex flex-col items-center gap-3 py-16">
                <span className="relative flex items-center justify-center w-16 h-16 rounded-full bg-sky-peach/18">
                  <TrophyIcon size={30} />
                </span>
                <p className="relative font-display font-semibold text-lg text-sky-ink">{t("admin.courtManagement.karma.noData")}</p>
                <p className="relative text-sm text-sky-ink-2 text-center max-w-xs">
                  {t("admin.courtManagement.karma.noDataSubtitle")}
                </p>
              </SkyCard>
            ) : (
              <div className="space-y-4">

                {/* Podium — Top 3 displayed as: 2nd | 1st | 3rd */}
                {top3.some(Boolean) && (
                  <div className="grid grid-cols-3 gap-3 items-end sky-stagger">
                    {([top3[1], top3[0], top3[2]] as const).map((entry, podIdx) => {
                      if (!entry) return <div key={podIdx} />;
                      // Podium tiers: silver (ink wash), gold (peach), bronze (violet).
                      // Height + rail weight carry the ranking as much as the hue does.
                      const podCfg = [
                        { tint: "bg-white/55", pt: "pt-7", karma: "text-sky-ink-2", rail: "bg-sky-ink/25" },
                        { tint: "bg-sky-peach/18", pt: "pt-4", karma: "text-sky-peach-deep", rail: "bg-linear-to-r from-sky-peach to-sky-peach-deep" },
                        { tint: "bg-sky-violet/10", pt: "pt-11", karma: "text-sky-violet-deep", rail: "bg-sky-violet/50" },
                      ][podIdx];
                      return (
                        <div
                          key={entry.userId}
                          className={`relative overflow-hidden flex flex-col items-center pb-4 rounded-sky-card border border-white/75 ${podCfg.pt} ${podCfg.tint} sky-lift`}
                        >
                          <span className={`absolute inset-x-0 top-0 h-1 ${podCfg.rail}`} />
                          <MedalRank rank={entry.rank} />
                          <p className="text-xs font-medium text-sky-ink-2 mt-2">User #{entry.userId}</p>
                          <p className={`font-display text-xl font-semibold mt-0.5 tabular-nums ${podCfg.karma}`}>
                            {entry.totalKarma.toLocaleString()}
                          </p>
                          <p className={eyebrow}>{t("admin.courtManagement.karma.karmaPts")}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Full leaderboard table */}
                <SkyCard variant="admin" className="p-0 overflow-hidden">
                  <div className="relative overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="sky-table-head">
                          {karmaTableHeaders.map(h => (
                            <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map(entry => {
                          const rowBg =
                            entry.rank === 1 ? "bg-sky-peach/12" :
                              entry.rank === 2 ? "bg-sky-ink/4" :
                                entry.rank === 3 ? "bg-sky-violet/7" :
                                  "";
                          const karmaColor =
                            entry.rank === 1 ? "text-sky-peach-deep" :
                              entry.rank === 2 ? "text-sky-ink-2" :
                                entry.rank === 3 ? "text-sky-violet-deep" :
                                  "text-sky-ink-2";
                          return (
                            <tr key={entry.userId} className={`sky-table-row ${rowBg}`}>
                              <td className="px-4 py-3"><MedalRank rank={entry.rank} /></td>
                              <td className="px-4 py-3 font-medium text-sky-ink">User #{entry.userId}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="w-3.5 h-3.5 text-sky-peach-deep shrink-0" />
                                  <span className={`font-display text-base font-semibold tabular-nums ${karmaColor}`}>
                                    {entry.totalKarma.toLocaleString()}
                                  </span>
                                  <span className="text-xs text-sky-ink-3">{t("admin.courtManagement.karma.pts")}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {entry.rank === 1 && (
                                  <span className="sky-badge sky-badge-pending">
                                    {t("admin.courtManagement.karma.champion")}
                                  </span>
                                )}
                                {entry.rank === 2 && (
                                  <span className="sky-badge sky-badge-neutral">
                                    {t("admin.courtManagement.karma.runnerUp")}
                                  </span>
                                )}
                                {entry.rank === 3 && (
                                  <span className="sky-badge sky-badge-epic">
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

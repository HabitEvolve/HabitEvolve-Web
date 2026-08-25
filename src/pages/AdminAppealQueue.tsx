import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Scale, CheckCircle, XCircle, Loader2, X, AlertTriangle, Inbox, MessageSquareQuote, RefreshCw, User } from "lucide-react";
import { useAlert } from "../context/AlertContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import PageHeader from "../components/common/PageHeader";
import { adminAppealApi } from "../api/adminAppealApi";
import SkyCard from "../components/ui/card/SkyCard";
import SkyButton from "../components/ui/button/SkyButton";
import StatusBadge from "../components/common/StatusBadge";
import ProofMedia, { isVideoUrl } from "../components/common/ProofMedia";
import type { AppealQueueItemDto, AppealDecision } from "../types/adminAppeal.types";

const errMsg = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

const eyebrow = "text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3";
const fieldLabel = `block mb-1.5 ${eyebrow}`;

function ResolveModal({ appeal, onClose, onResolved }: { appeal: AppealQueueItemDto; onClose: () => void; onResolved: () => void }) {
  const [decision, setDecision] = useState<AppealDecision | "">("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decision) return;
    setSubmitting(true); setErr(null);
    try {
      await adminAppealApi.resolve(appeal.appealId, { decision, adminNote: note || undefined });
      onResolved();
      onClose();
    } catch (ex) {
      setErr(errMsg(ex) ?? "Failed to resolve appeal.");
    } finally { setSubmitting(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-99999 w-screen h-screen flex items-center justify-center bg-sky-abyss/45 backdrop-blur-md p-4">
      <SkyCard variant="admin" className="sky-in relative p-0 overflow-hidden w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        {/* Warm rail: this dialog is the queue's outstanding item, not an
            operational form — it stays keyed to the pending accent until a
            decision is picked below. */}
        <span className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-sky-peach to-sky-peach-deep z-10" />
        <div className="relative flex items-center justify-between gap-3 px-6 py-4 border-b border-white/70 bg-white/45">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid place-items-center w-9 h-9 rounded-sky-chip bg-sky-peach/18 text-sky-peach-deep shrink-0">
              <Scale className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className={eyebrow}>Appeal #{appeal.appealId}</p>
              <h2 className="font-display text-base font-semibold text-sky-ink truncate">Resolve appeal</h2>
            </div>
          </div>
          <SkyButton type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </SkyButton>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* The case being judged. Without this the reviewer only saw a reason string and two IDs,
              which is not enough to rule on anything. */}
          <div>
            <p className={fieldLabel}>Case</p>
            <div className="rounded-sky-md bg-white/55 ring-1 ring-white/75 px-4 py-3 space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-sky-ink truncate" title={appeal.questTitle ?? undefined}>
                  {appeal.questTitle ?? `Quest #${appeal.questId ?? "—"}`}
                </p>
                {appeal.questType && (
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-sky-ink-3">{appeal.questType}</span>
                )}
              </div>
              <p className="text-xs font-medium text-sky-ink-2">
                <User className="inline w-3 h-3 mr-1 -mt-0.5" />
                {appeal.username ?? `User #${appeal.userId}`}
                {appeal.proofType && <> · {appeal.proofType}</>}
                {appeal.submittedAt && <> · submitted {fmtDateTime(appeal.submittedAt)}</>}
              </p>
              {appeal.rejectReason && (
                <p className="text-xs font-medium text-sky-rose-deep">
                  <XCircle className="inline w-3 h-3 mr-1 -mt-0.5" />
                  Rejected{appeal.reviewRoute ? ` by ${appeal.reviewRoute}` : ""}: {appeal.rejectReason}
                </p>
              )}
              {typeof appeal.aiConfidence === "number" && (
                <p className="text-[11px] font-medium text-sky-ink-3">
                  AI hint · confidence {Math.round(appeal.aiConfidence * 100)}%
                  {appeal.aiReasoning ? ` — ${appeal.aiReasoning}` : ""}
                </p>
              )}
            </div>
          </div>

          {/* The evidence itself — the admin sees the unblurred original, unlike a Court reviewer. */}
          {!!appeal.mediaUrls?.length && (
            <div>
              <p className={fieldLabel}>Evidence</p>
              <div className="flex flex-wrap gap-2">
                {appeal.mediaUrls.map((url) => (
                  isVideoUrl(url) ? (
                    // Playable inline — a clip has to be watched to be judged, and wrapping a
                    // <video> in a link would swallow its controls.
                    <div key={url} className="w-44 rounded-sky-md overflow-hidden ring-1 ring-white/75">
                      <ProofMedia url={url} alt="Submitted proof" className="w-full h-28 object-contain bg-black/80" />
                    </div>
                  ) : (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                       className="block w-28 h-28 rounded-sky-md overflow-hidden ring-1 ring-white/75 hover:ring-sky-deep/45 transition">
                      <ProofMedia url={url} alt="Submitted proof" className="w-full h-full object-cover" />
                    </a>
                  )
                ))}
              </div>
              {appeal.textNote && <p className="text-xs font-medium text-sky-ink-2 mt-2">Note: {appeal.textNote}</p>}
            </div>
          )}

          <div>
            <p className={fieldLabel}>Player reason</p>
            {/* The player's own words are the evidence, so they get a quoted
                block with its own rail rather than a flat grey box. */}
            <div className="relative overflow-hidden rounded-sky-md bg-white/55 ring-1 ring-white/75 pl-5 pr-4 py-3.5">
              <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-deep/35" />
              <div className="flex items-start gap-2.5">
                <MessageSquareQuote className="w-4 h-4 shrink-0 mt-0.5 text-sky-deep/70" />
                <p className="text-sm font-medium text-sky-ink leading-relaxed">{appeal.reason}</p>
              </div>
            </div>
            <p className="text-[11px] font-medium text-sky-ink-3 mt-2 tabular-nums">Proof #{appeal.proofId} · User #{appeal.userId} · Submitted {fmtDateTime(appeal.createdAt)}</p>
          </div>
          <div>
            <p className={fieldLabel}>Decision *</p>
            {/* Selection toggle, not a plain CTA — kept custom (same reasoning
                as every other segmented control in this migration) so the
                selected state stays legible; SkyButton's variants don't
                express a persistent "chosen" ring. */}
            <div className="flex gap-1 rounded-sky-md bg-white/42 ring-1 ring-white/70 p-1">
              <button type="button" onClick={() => setDecision("accept")} aria-pressed={decision === "accept"}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-sky-chip text-sm transition ${decision === "accept" ? "bg-linear-to-b from-sky-teal to-sky-teal/85 text-white font-semibold shadow-sky-chip" : "text-sky-ink-2 font-medium hover:bg-white/70 hover:text-sky-ink"}`}>
                <CheckCircle className="w-4 h-4 shrink-0" /> Accept
              </button>
              <button type="button" onClick={() => setDecision("reject")} aria-pressed={decision === "reject"}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-sky-chip text-sm transition ${decision === "reject" ? "bg-linear-to-b from-sky-rose to-sky-rose-deep text-white font-semibold shadow-sky-chip" : "text-sky-ink-2 font-medium hover:bg-white/70 hover:text-sky-ink"}`}>
                <XCircle className="w-4 h-4 shrink-0" /> Reject
              </button>
            </div>
          </div>
          <div>
            <p className={fieldLabel}>Admin note (optional)</p>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              className="w-full px-4 py-2.5 rounded-sky-chip bg-white/70 ring-1 ring-white/80 text-sm font-medium text-sky-ink transition-shadow focus:outline-none focus:ring-2 focus:ring-sky-deep/45 placeholder:text-sky-ink-3 resize-none"
              placeholder="Reason shown internally…" />
          </div>
          {err && (
            <div className="relative flex items-start gap-2.5 overflow-hidden rounded-sky-chip bg-sky-rose/12 ring-1 ring-sky-rose/25 pl-4 pr-3 py-2.5">
              <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" />
              <AlertTriangle className="w-4 h-4 shrink-0 mt-px text-sky-rose-deep" />
              <p className="text-xs font-semibold text-sky-rose-deep">{err}</p>
            </div>
          )}
          <div className="flex gap-3 pt-3 border-t border-white/70">
            <SkyButton type="button" variant="secondary" onClick={onClose} disabled={submitting} className="flex-1">Cancel</SkyButton>
            <SkyButton
              type="submit"
              variant={decision === "accept" ? "success" : decision === "reject" ? "destructive" : "secondary"}
              disabled={submitting || !decision}
              className="flex-1"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Resolving…</> : <><Scale className="w-4 h-4" /> Resolve</>}
            </SkyButton>
          </div>
        </form>
      </SkyCard>
    </div>,
    document.body
  );
}

export default function AdminAppealQueue() {
  const globalAlert = useAlert();
  const [appeals, setAppeals] = useState<AppealQueueItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<AppealQueueItemDto | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await adminAppealApi.getQueue();
      if (res.success) setAppeals(res.data ?? []);
      else setError(res.message ?? "Failed to load appeals.");
    } catch (ex) {
      setError(errMsg(ex) ?? "Network error fetching appeals.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  return (
    <>
      <PageMeta title="Appeal Queue" description="Review player appeals for rejected proofs." />
      <PageBreadcrumb pageTitle="Appeal Queue" />

      <div className="space-y-6 p-1">
        <PageHeader
          icon={<Scale className="w-6 h-6" />}
          tone="peach"
          title="Appeal Queue"
          description="Review player appeals submitted for rejected proofs."
          actions={
            <>
              {/* The outstanding count is the reason to be on this screen, so it reads
                  as a quantity next to the title rather than hiding in the table. */}
              {appeals.length > 0 && (
                <span className="hidden sm:inline-flex items-baseline gap-1.5 shrink-0 rounded-sky-chip bg-white/55 ring-1 ring-white/80 px-3.5 py-2">
                  <span className="font-display text-lg font-semibold text-sky-ink tabular-nums leading-none">{appeals.length}</span>
                  <span className={eyebrow}>in queue</span>
                </span>
              )}
              <SkyButton type="button" variant="secondary" size="sm" onClick={fetchQueue} disabled={loading} className="shrink-0">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} {loading ? "Loading…" : "Refresh"}
              </SkyButton>
            </>
          }
        />

        <SkyCard variant="admin" className="p-0 overflow-hidden">
          {error ? (
            <div className="p-5">
              <div className="relative flex items-start gap-3 overflow-hidden rounded-sky-md bg-sky-rose/10 ring-1 ring-sky-rose/25 pl-5 pr-4 py-4">
                <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" />
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-sky-rose-deep" />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-semibold text-sky-rose-deep">Failed to load</p>
                  <p className="text-xs font-medium text-sky-ink-2 mt-1">{error}</p>
                </div>
                <SkyButton type="button" variant="secondary" size="sm" onClick={fetchQueue} className="shrink-0">Retry</SkyButton>
              </div>
            </div>
          ) : loading && appeals.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-sky-ink-3">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm font-semibold">Loading…</p>
            </div>
          ) : appeals.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <span className="grid place-items-center w-14 h-14 mb-1 rounded-full bg-sky-teal-bg text-sky-teal"><Inbox className="w-6 h-6" /></span>
              <p className="font-display text-base font-semibold text-sky-ink">No pending appeals</p>
              <p className="text-xs font-medium text-sky-ink-3">Everything submitted has been reviewed — nothing is waiting on you.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="sky-table-head">
                    {["Player", "Quest", "Rejected because", "Reason", "Status", "Submitted", "Action"].map(h => (
                      <th key={h} className={`px-4 py-3 ${h === "Action" ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="sky-stagger">
                  {appeals.map(a => (
                    <tr key={a.appealId} className="sky-table-row group">
                      <td className="px-4 py-3 text-xs font-medium text-sky-ink whitespace-nowrap">
                        {a.username ?? `User #${a.userId}`}
                      </td>
                      <td className="px-4 py-3 max-w-56 text-xs font-medium text-sky-ink" title={a.questTitle ?? undefined}>
                        <span className="block truncate">{a.questTitle ?? `Quest #${a.questId ?? "—"}`}</span>
                        {a.questType && <span className="block text-[10px] font-semibold uppercase tracking-wide text-sky-ink-3">{a.questType}</span>}
                      </td>
                      <td className="px-4 py-3 max-w-64 text-xs font-medium text-sky-ink-2" title={a.rejectReason ?? undefined}>
                        <span className="block truncate">{a.rejectReason ?? "—"}</span>
                        {a.reviewRoute && <span className="block text-[10px] font-semibold uppercase tracking-wide text-sky-ink-3">by {a.reviewRoute}</span>}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-xs font-medium text-sky-ink" title={a.reason}>{a.reason}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-sky-ink-2 whitespace-nowrap tabular-nums">{fmtDateTime(a.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        {a.status === "Pending" ? (
                          <SkyButton type="button" variant="secondary" size="sm" onClick={() => setResolving(a)} className="opacity-70 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                            <Scale className="w-3 h-3" /> Resolve
                          </SkyButton>
                        ) : (
                          <span className="text-xs font-medium text-sky-ink-3">Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SkyCard>
      </div>

      {resolving && (
        <ResolveModal
          appeal={resolving}
          onClose={() => setResolving(null)}
          onResolved={() => { globalAlert.success(`Appeal #${resolving.appealId} resolved.`); fetchQueue(); }}
        />
      )}
    </>
  );
}

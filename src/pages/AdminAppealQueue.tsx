import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Scale, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useAlert } from "../context/AlertContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { adminAppealApi } from "../api/adminAppealApi";
import SkyCard from "../components/ui/card/SkyCard";
import SkyButton from "../components/ui/button/SkyButton";
import type { AppealDto, AppealDecision } from "../types/adminAppeal.types";

const errMsg = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

const STATUS_CFG: Record<string, string> = {
  Pending: "bg-warning-100 text-warning-800",
  Accepted: "bg-success-100 text-success-800",
  Rejected: "bg-error-100 text-error-800",
};

function ResolveModal({ appeal, onClose, onResolved }: { appeal: AppealDto; onClose: () => void; onResolved: () => void }) {
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
    <div className="fixed inset-0 z-99999 w-screen h-screen flex items-center justify-center bg-sky-ink/60 backdrop-blur-sm p-4">
      <SkyCard variant="admin" className="p-0 overflow-hidden w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-sky-ink">Resolve Appeal #{appeal.appealId}</h2>
          <SkyButton type="button" variant="ghost" size="icon" onClick={onClose}>
            <XCircle className="w-4 h-4" />
          </SkyButton>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold text-sky-ink-3 uppercase tracking-widest mb-1">Player Reason</p>
            <div className="bg-gray-50 border border-gray-200 rounded-sky-chip px-4 py-3 text-sm text-sky-ink-2">{appeal.reason}</div>
            <p className="text-xs text-sky-ink-3 mt-2">Proof #{appeal.proofId} · User #{appeal.userId} · Submitted {fmtDateTime(appeal.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-sky-ink-2 uppercase tracking-wide mb-1.5">Decision *</p>
            {/* Selection toggle, not a plain CTA — kept custom (same reasoning
                as every other segmented control in this migration) so the
                selected state stays legible; SkyButton's variants don't
                express a persistent "chosen" ring. */}
            <div className="flex gap-2">
              <button type="button" onClick={() => setDecision("accept")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-sky-chip font-semibold text-sm transition-all ${decision === "accept" ? "bg-success-100 ring-2 ring-success-500 text-success-800" : "border border-sky-surf-border text-sky-ink-2"}`}>
                <CheckCircle className="w-4 h-4" /> Accept
              </button>
              <button type="button" onClick={() => setDecision("reject")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-sky-chip font-semibold text-sm transition-all ${decision === "reject" ? "bg-error-100 ring-2 ring-error-500 text-error-800" : "border border-sky-surf-border text-sky-ink-2"}`}>
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-sky-ink-2 uppercase tracking-wide mb-1.5">Admin Note (optional)</p>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              className="w-full px-4 py-2.5 rounded-sky-chip border border-sky-surf-border text-sm font-medium bg-white text-sky-ink focus:outline-none focus:border-sky-deep focus:ring-3 focus:ring-sky-deep/20 resize-none"
              placeholder="Reason shown internally…" />
          </div>
          {err && <p className="text-xs font-semibold text-error-600 bg-error-50 border border-error-300 rounded-sky-chip px-3 py-2">{err}</p>}
          <div className="flex gap-3 pt-1">
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
  const [appeals, setAppeals] = useState<AppealDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<AppealDto | null>(null);

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
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-sky-chip bg-warning-100 flex items-center justify-center shrink-0">
            <Scale className="w-6 h-6 text-warning-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-sky-ink">Appeal Queue</h1>
            <p className="text-sm text-sky-ink-2 font-medium mt-0.5">Review player appeals submitted for rejected proofs.</p>
          </div>
          <SkyButton type="button" variant="secondary" size="sm" onClick={fetchQueue} disabled={loading} className="ml-auto">
            {loading ? "Loading…" : "Refresh"}
          </SkyButton>
        </div>

        <SkyCard variant="admin" className="p-0 overflow-hidden">
          {error ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <p className="font-bold text-sky-ink-2">Failed to load</p>
              <p className="text-sm text-sky-ink-3">{error}</p>
              <SkyButton type="button" variant="secondary" size="sm" onClick={fetchQueue}>Retry</SkyButton>
            </div>
          ) : loading && appeals.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-sky-ink-3"><Loader2 className="w-8 h-8 animate-spin" /> Loading…</div>
          ) : appeals.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-sky-ink-3">
              <Scale className="w-14 h-14 opacity-40" />
              <p className="font-black text-lg text-sky-ink-2">No pending appeals</p>
              <p className="text-sm">The appeal queue is empty. 🎉</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-sky-admin-bg-deep border-b border-slate-200">
                    {["#", "Proof", "User", "Reason", "Status", "Submitted", "Action"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-sky-ink">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {appeals.map(a => (
                    <tr key={a.appealId} className="sky-table-row">
                      <td className="px-4 py-3 text-xs font-semibold text-sky-ink-3">{a.appealId}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-sky-ink-2">#{a.proofId}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-sky-ink-2">User #{a.userId}</td>
                      <td className="px-4 py-3 max-w-xs truncate text-xs text-sky-ink-2" title={a.reason}>{a.reason}</td>
                      <td className="px-4 py-3"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_CFG[a.status] ?? STATUS_CFG.Pending}`}>{a.status}</span></td>
                      <td className="px-4 py-3 text-xs text-sky-ink-2 whitespace-nowrap">{fmtDateTime(a.createdAt)}</td>
                      <td className="px-4 py-3">
                        {a.status === "Pending" ? (
                          <SkyButton type="button" variant="secondary" size="sm" onClick={() => setResolving(a)}>
                            <Scale className="w-3 h-3" /> Resolve
                          </SkyButton>
                        ) : (
                          <span className="text-xs text-sky-ink-3 italic">Resolved</span>
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

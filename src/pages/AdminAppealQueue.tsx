import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Scale, CheckCircle, XCircle, Loader2, X } from "lucide-react";
import { useAlert } from "../context/AlertContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { adminAppealApi } from "../api/adminAppealApi";
import type { AppealDto, AppealDecision } from "../types/adminAppeal.types";

const btnBase =
  "inline-flex items-center gap-2 px-4 py-2 font-black text-sm border-2 border-black rounded-full " +
  "shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 " +
  "disabled:shadow-[3px_3px_0_0_#1A1D20] transition-all";

const errMsg = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

const STATUS_CFG: Record<string, string> = {
  Pending: "bg-amber-100 border-amber-400 text-amber-800",
  Accepted: "bg-green-100 border-green-400 text-green-800",
  Rejected: "bg-red-100 border-red-400 text-red-800",
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
    <div className="fixed inset-0 z-99999 w-screen h-screen flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[8px_8px_0_0_#1A1D20] w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black bg-amber-50 dark:bg-amber-900/20">
          <h2 className="text-base font-black text-gray-900 dark:text-gray-100">Resolve Appeal #{appeal.appealId}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-white dark:bg-gray-700 hover:bg-red-50 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Player Reason</p>
            <div className="bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{appeal.reason}</div>
            <p className="text-xs text-gray-400 mt-2">Proof #{appeal.proofId} · User #{appeal.userId} · Submitted {fmtDateTime(appeal.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">Decision *</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDecision("accept")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 border-2 rounded-2xl font-black text-sm transition-all ${decision === "accept" ? "bg-green-200 border-green-600 text-green-900" : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500"}`}>
                <CheckCircle className="w-4 h-4" /> Accept
              </button>
              <button type="button" onClick={() => setDecision("reject")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 border-2 rounded-2xl font-black text-sm transition-all ${decision === "reject" ? "bg-red-200 border-red-600 text-red-900" : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500"}`}>
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">Admin Note (optional)</p>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              className="w-full px-4 py-2.5 border-2 border-black dark:border-gray-600 rounded-2xl text-sm font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
              placeholder="Reason shown internally…" />
          </div>
          {err && <p className="text-xs font-bold text-red-600 bg-red-50 border-2 border-red-300 rounded-xl px-3 py-2">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={submitting} className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>Cancel</button>
            <button type="submit" disabled={submitting || !decision} className={`${btnBase} flex-1 justify-center ${decision === "accept" ? "bg-green-300 text-green-900" : decision === "reject" ? "bg-red-300 text-red-900" : "bg-amber-200 text-amber-900"}`}>
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Resolving…</> : <><Scale className="w-4 h-4" /> Resolve</>}
            </button>
          </div>
        </form>
      </div>
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
          <div className="w-12 h-12 rounded-2xl bg-amber-300 border-2 border-black flex items-center justify-center shadow-[3px_3px_0_0_#1A1D20] shrink-0">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Appeal Queue</h1>
            <p className="text-sm text-gray-500 font-medium mt-0.5">Review player appeals submitted for rejected proofs.</p>
          </div>
          <button onClick={fetchQueue} disabled={loading} className={`${btnBase} ml-auto bg-amber-100 text-amber-900 py-1.5`}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        <div className="bg-white dark:bg-[#1e2a3a] border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] overflow-hidden">
          {error ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <p className="font-black text-gray-700 dark:text-gray-200">Failed to load</p>
              <p className="text-sm text-gray-400">{error}</p>
              <button onClick={fetchQueue} className={`${btnBase} bg-red-100 text-red-800`}>Retry</button>
            </div>
          ) : loading && appeals.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-gray-400"><Loader2 className="w-8 h-8 animate-spin" /> Loading…</div>
          ) : appeals.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
              <Scale className="w-14 h-14 opacity-40" />
              <p className="font-black text-lg text-gray-500">No pending appeals</p>
              <p className="text-sm">The appeal queue is empty. 🎉</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-gray-800/60">
                    {["#", "Proof", "User", "Reason", "Status", "Submitted", "Action"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {appeals.map(a => (
                    <tr key={a.appealId} className="hover:bg-amber-50/30 dark:hover:bg-amber-900/10 transition-colors">
                      <td className="px-4 py-3 text-xs font-black text-gray-400">{a.appealId}</td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-300">#{a.proofId}</td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-300">User #{a.userId}</td>
                      <td className="px-4 py-3 max-w-xs truncate text-xs text-gray-600 dark:text-gray-300" title={a.reason}>{a.reason}</td>
                      <td className="px-4 py-3"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black border ${STATUS_CFG[a.status] ?? STATUS_CFG.Pending}`}>{a.status}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDateTime(a.createdAt)}</td>
                      <td className="px-4 py-3">
                        {a.status === "Pending" ? (
                          <button onClick={() => setResolving(a)} className={`${btnBase} bg-amber-200 text-amber-900 py-1.5 px-3 text-xs`}>
                            <Scale className="w-3 h-3" /> Resolve
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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

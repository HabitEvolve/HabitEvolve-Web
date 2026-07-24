import { useState, useEffect, useCallback } from "react";
import { FileClock, ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { useAlert } from "../context/AlertContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { adminAuditApi } from "../api/adminAuditApi";
import type { AuditLogDto } from "../types/adminAudit.types";

const PAGE_SIZE = 20;

const btnBase =
  "inline-flex items-center gap-2 px-4 py-2 font-black text-sm border-2 border-black rounded-full " +
  "shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 " +
  "disabled:shadow-[3px_3px_0_0_#1A1D20] transition-all";

const inputCls =
  "px-3.5 py-2 border-2 border-black dark:border-gray-600 rounded-xl text-sm font-medium " +
  "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 " +
  "focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-600 " +
  "placeholder:text-gray-400 dark:placeholder:text-gray-500";

const errMsg = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export default function AdminAuditLog() {
  const globalAlert = useAlert();
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [actorFilter, setActorFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAuditApi.getAuditLogs({
        pageNumber: page,
        pageSize: PAGE_SIZE,
        actorUserId: actorFilter ? Number(actorFilter) : undefined,
        action: actionFilter || undefined,
      });
      setLogs(res.data ?? []);
      setTotalPages(res.totalPages ?? 1);
      setTotalRecords(res.totalRecords ?? 0);
      setHasNext(res.hasNextPage ?? false);
    } catch (ex) {
      globalAlert.error(errMsg(ex) ?? "Failed to load audit logs.");
    } finally { setLoading(false); }
  }, [page, actorFilter, actionFilter, globalAlert]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const applyFilters = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchLogs(); };

  return (
    <>
      <PageMeta title="Audit Log" description="Review sensitive admin actions (bans, config changes, resolutions...)." />
      <PageBreadcrumb pageTitle="Audit Log" />

      <div className="space-y-6 p-1">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-300 border-2 border-black flex items-center justify-center shadow-[3px_3px_0_0_#1A1D20] shrink-0">
            <FileClock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Audit Log</h1>
            <p className="text-sm text-gray-500 font-medium mt-0.5">Trace sensitive operations performed across the platform.</p>
          </div>
        </div>

        <form onSubmit={applyFilters} className="flex flex-wrap items-center gap-2 p-4 bg-white dark:bg-gray-800 border-2 border-black rounded-2xl shadow-[3px_3px_0_0_#1A1D20]">
          <input value={actorFilter} onChange={e => setActorFilter(e.target.value)} placeholder="Actor User ID" className={`${inputCls} w-36`} />
          <input value={actionFilter} onChange={e => setActionFilter(e.target.value)} placeholder="Action (e.g. BAN_USER)" className={`${inputCls} w-56`} />
          <button type="submit" className={`${btnBase} bg-indigo-200 text-indigo-900 py-1.5`}><Search className="w-3.5 h-3.5" /> Filter</button>
          <button type="button" onClick={fetchLogs} disabled={loading} className={`${btnBase} ml-auto bg-indigo-100 text-indigo-900 py-1.5`}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </form>

        <div className="bg-white dark:bg-[#1e2a3a] border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] overflow-hidden">
          {loading && logs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-gray-400"><Loader2 className="w-8 h-8 animate-spin" /> Loading…</div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
              <FileClock className="w-14 h-14 opacity-40" />
              <p className="font-black text-lg text-gray-500">No audit log entries found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-gray-800/60">
                    {["#", "Actor", "Action", "Target", "Note", "When"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {logs.map(log => (
                    <tr key={log.auditLogId} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                      <td className="px-4 py-3 text-xs font-black text-gray-400">{log.auditLogId}</td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-300">{log.actorUserId != null ? `User #${log.actorUserId}` : "SYSTEM"}</td>
                      <td className="px-4 py-3"><span className="text-xs font-black px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700">{log.action}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{log.targetType}{log.targetId != null ? ` #${log.targetId}` : ""}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate" title={log.note ?? ""}>{log.note ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDateTime(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {logs.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500">Page {page} of {totalPages} · {totalRecords} total</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading} className={`${btnBase} bg-white text-gray-700 py-1.5 px-3 text-xs`}><ChevronLeft className="w-3.5 h-3.5" /> Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={!hasNext || loading} className={`${btnBase} bg-white text-gray-700 py-1.5 px-3 text-xs`}>Next <ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

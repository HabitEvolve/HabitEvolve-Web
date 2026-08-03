import { useState, useEffect, useCallback } from "react";
import { FileClock, ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { useAlert } from "../context/AlertContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { adminAuditApi } from "../api/adminAuditApi";
import SkyCard from "../components/ui/card/SkyCard";
import SkyButton from "../components/ui/button/SkyButton";
import type { AuditLogDto } from "../types/adminAudit.types";

const PAGE_SIZE = 20;

const inputCls =
  "px-3.5 py-2 rounded-sky-chip border border-sky-surf-border text-sm font-medium " +
  "bg-white text-sky-ink focus:outline-none focus:border-sky-deep focus:ring-3 focus:ring-sky-deep/20 " +
  "placeholder:text-sky-ink-3";

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
          <div className="w-12 h-12 rounded-sky-chip bg-indigo-100 flex items-center justify-center shrink-0">
            <FileClock className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-sky-ink">Audit Log</h1>
            <p className="text-sm text-sky-ink-2 font-medium mt-0.5">Trace sensitive operations performed across the platform.</p>
          </div>
        </div>

        <SkyCard variant="admin" className="p-4">
          <form onSubmit={applyFilters} className="flex flex-wrap items-center gap-2">
            <input value={actorFilter} onChange={e => setActorFilter(e.target.value)} placeholder="Actor User ID" className={`${inputCls} w-36`} />
            <input value={actionFilter} onChange={e => setActionFilter(e.target.value)} placeholder="Action (e.g. BAN_USER)" className={`${inputCls} w-56`} />
            <SkyButton type="submit" variant="secondary" size="sm"><Search className="w-3.5 h-3.5" /> Filter</SkyButton>
            <SkyButton type="button" variant="secondary" size="sm" onClick={fetchLogs} disabled={loading} className="ml-auto">
              {loading ? "Loading…" : "Refresh"}
            </SkyButton>
          </form>
        </SkyCard>

        <SkyCard variant="admin" className="p-0 overflow-hidden">
          {loading && logs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-sky-ink-3"><Loader2 className="w-8 h-8 animate-spin" /> Loading…</div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-sky-ink-3">
              <FileClock className="w-14 h-14 opacity-40" />
              <p className="font-black text-lg text-sky-ink-2">No audit log entries found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-sky-admin-bg-deep border-b border-slate-200">
                    {["#", "Actor", "Action", "Target", "Note", "When"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-sky-ink">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.auditLogId} className="sky-table-row">
                      <td className="px-4 py-3 text-xs font-semibold text-sky-ink-3">{log.auditLogId}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-sky-ink-2">{log.actorUserId != null ? `User #${log.actorUserId}` : "SYSTEM"}</td>
                      <td className="px-4 py-3"><span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">{log.action}</span></td>
                      <td className="px-4 py-3 text-xs text-sky-ink-2">{log.targetType}{log.targetId != null ? ` #${log.targetId}` : ""}</td>
                      <td className="px-4 py-3 text-xs text-sky-ink-2 max-w-xs truncate" title={log.note ?? ""}>{log.note ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-sky-ink-2 whitespace-nowrap">{fmtDateTime(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SkyCard>

        {logs.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-sky-ink-2">Page {page} of {totalPages} · {totalRecords} total</p>
            <div className="flex gap-2">
              <SkyButton type="button" variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </SkyButton>
              <SkyButton type="button" variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={!hasNext || loading}>
                Next <ChevronRight className="w-3.5 h-3.5" />
              </SkyButton>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

import { useState, useEffect, useCallback } from "react";
import { FileClock, ChevronLeft, ChevronRight, Loader2, Search, RefreshCw, Inbox, Ban, ShieldAlert, Settings2, Gavel, Terminal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAlert } from "../context/AlertContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { adminAuditApi } from "../api/adminAuditApi";
import SkyCard from "../components/ui/card/SkyCard";
import SkyButton from "../components/ui/button/SkyButton";
import type { AuditLogDto } from "../types/adminAudit.types";

const PAGE_SIZE = 20;

const eyebrow = "text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3";

const inputCls = [
  "px-3.5 py-2.5 rounded-sky-chip bg-white/70 ring-1 ring-white/80",
  "text-sky-ink text-sm font-medium transition-shadow",
  "focus:outline-none focus:ring-2 focus:ring-sky-deep/45",
  "placeholder:text-sky-ink-3",
].join(" ");

// The action string is free-form on the BE, so the badge classifies by keyword
// rather than an enum: anything that takes something away from a user reads
// destructive, moderation verdicts read violet (the judicial accent used on the
// court screens), configuration reads operational, and everything else stays
// neutral. This is presentation only — the raw `action` value is still shown.
const actionLook = (action: string): { cls: string; Icon: LucideIcon } => {
  const a = action.toUpperCase();
  if (/BAN|DELETE|REMOVE|REVOKE|SUSPEND|DISBAND/.test(a)) return { cls: "sky-badge-danger", Icon: Ban };
  if (/REJECT|WARN|FLAG|APPEAL/.test(a)) return { cls: "sky-badge-pending", Icon: ShieldAlert };
  if (/RESOLVE|VERDICT|COURT|APPROVE/.test(a)) return { cls: "sky-badge-epic", Icon: Gavel };
  if (/CONFIG|SETTING|UPDATE|EDIT|CREATE/.test(a)) return { cls: "sky-badge-info", Icon: Settings2 };
  return { cls: "sky-badge-neutral", Icon: Terminal };
};

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
        <div className="sky-in flex items-center gap-4">
          <span className="grid place-items-center w-12 h-12 rounded-sky-md bg-sky-violet/14 text-sky-violet-deep shrink-0">
            <FileClock className="w-6 h-6" />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold text-sky-ink tracking-[-0.01em]">Audit Log</h1>
            <p className="text-sm text-sky-ink-2 font-medium mt-0.5">Trace sensitive operations performed across the platform.</p>
          </div>
          {totalRecords > 0 && (
            <span className="hidden sm:inline-flex items-baseline gap-1.5 shrink-0 ml-auto rounded-sky-chip bg-white/55 ring-1 ring-white/80 px-3.5 py-2">
              <span className="font-display text-lg font-semibold text-sky-ink tabular-nums leading-none">{totalRecords.toLocaleString()}</span>
              <span className={eyebrow}>entries</span>
            </span>
          )}
        </div>

        <SkyCard variant="admin" className="p-4">
          <form onSubmit={applyFilters} className="flex flex-wrap items-center gap-2.5 rounded-sky-md bg-white/42 ring-1 ring-white/70 p-2.5">
            <span className={`${eyebrow} shrink-0 pl-1`}>Narrow by</span>
            <input value={actorFilter} onChange={e => setActorFilter(e.target.value)} aria-label="Actor user ID" placeholder="Actor User ID" className={`${inputCls} w-36 tabular-nums`} />
            <input value={actionFilter} onChange={e => setActionFilter(e.target.value)} aria-label="Action" placeholder="Action (e.g. BAN_USER)" className={`${inputCls} w-56`} />
            <SkyButton type="submit" variant="primary" size="sm"><Search className="w-3.5 h-3.5" /> Filter</SkyButton>
            <SkyButton type="button" variant="secondary" size="sm" onClick={fetchLogs} disabled={loading} className="ml-auto">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} {loading ? "Loading…" : "Refresh"}
            </SkyButton>
          </form>
        </SkyCard>

        <SkyCard variant="admin" className="p-0 overflow-hidden">
          {loading && logs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-sky-ink-3">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm font-semibold">Loading…</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <span className="grid place-items-center w-14 h-14 mb-1 rounded-full bg-sky-violet/10 text-sky-violet-deep">
                {actorFilter || actionFilter ? <Search className="w-6 h-6" /> : <Inbox className="w-6 h-6" />}
              </span>
              <p className="font-display text-base font-semibold text-sky-ink">No audit log entries found</p>
              <p className="text-xs font-medium text-sky-ink-3">
                {actorFilter || actionFilter ? "Nothing matches this actor and action — try widening the filter." : "Sensitive operations will be recorded here as they happen."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="sky-table-head">
                    {["#", "Actor", "Action", "Target", "Note", "When"].map(h => (
                      <th key={h} className="px-4 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="sky-stagger">
                  {logs.map(log => (
                    <tr key={log.auditLogId} className="sky-table-row group">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-sky-ink-3 tabular-nums">{log.auditLogId}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.actorUserId != null ? (
                          <span className="text-xs font-medium text-sky-ink tabular-nums">User #{log.actorUserId}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-ink-3">
                            <Terminal className="w-3 h-3 shrink-0" /> System
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const c = actionLook(log.action);
                          return (
                            <span className={`sky-badge ${c.cls} font-mono tracking-[0.04em]`}>
                              <c.Icon className="w-3 h-3 shrink-0" /> {log.action}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-sky-ink-2 whitespace-nowrap">
                        {log.targetType}
                        {log.targetId != null && <span className="text-sky-ink-3 tabular-nums"> #{log.targetId}</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-sky-ink-2 max-w-xs truncate" title={log.note ?? ""}>{log.note ?? <span className="text-sky-ink-3">—</span>}</td>
                      <td className="px-4 py-3 text-xs font-medium text-sky-ink-2 whitespace-nowrap tabular-nums">{fmtDateTime(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SkyCard>

        {logs.length > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-sky-md bg-white/45 ring-1 ring-white/70 px-4 py-3">
            <p className="text-xs font-medium text-sky-ink-2">
              <span className={eyebrow}>page</span>{" "}
              <span className="font-display text-sm font-semibold text-sky-ink tabular-nums">{page}</span>
              <span className="text-sky-ink-3 tabular-nums"> / {totalPages}</span>
              <span className="text-sky-ink-3"> · {totalRecords.toLocaleString()} total</span>
            </p>
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

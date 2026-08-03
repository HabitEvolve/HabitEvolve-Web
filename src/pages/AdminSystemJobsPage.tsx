import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Cog, Play, Zap, Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { useAlert } from "../context/AlertContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Pagination from "../components/common/SkyPagination";
import { adminJobsApi } from "../api/adminJobsApi";
import SkyCard from "../components/ui/card/SkyCard";
import SkyButton from "../components/ui/button/SkyButton";
import type { JobExecutionLogDto } from "../types/adminJobs.types";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

const inputCls =
    "w-full px-4 py-2.5 rounded-sky-chip border border-sky-surf-border text-sm font-medium " +
    "bg-white text-sky-ink focus:outline-none focus:border-sky-deep focus:ring-3 focus:ring-sky-deep/20 " +
    "placeholder:text-sky-ink-3";

const errMsg = (e: unknown) =>
    (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const Spinner = ({ size = 18 }: { size?: number }) => <Loader2 className="animate-spin" width={size} height={size} />;

// BE JobExecutionLogDto only exposes a `success` boolean (no "Running" state — the log row is
// written after the job finishes), so the badge collapses to Success/Failed.
const STATUS_CFG: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    Success: { bg: "bg-success-100", text: "text-success-800", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    Failed: { bg: "bg-error-100", text: "text-error-800", icon: <XCircle className="w-3.5 h-3.5" /> },
};
const StatusBadge = ({ success }: { success: boolean }) => {
    const status = success ? "Success" : "Failed";
    const c = STATUS_CFG[status];
    return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>{c.icon} {status}</span>;
};

const fmtDateTime = (d: string | null) =>
    d ? new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

// ── CONFIRM MODAL ─────────────────────────────────────────────────────────────
interface ConfirmModalProps {
    title: string;
    message: string;
    confirmLabel: string;
    loading: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

const ConfirmModal = ({ title, message, confirmLabel, loading, onConfirm, onClose }: ConfirmModalProps) =>
    createPortal(
        <div className="fixed inset-0 z-99999 w-screen h-screen flex items-center justify-center bg-sky-ink/60 backdrop-blur-sm p-4">
            <SkyCard variant="admin" className="modal-content w-full max-w-sm space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-sky-chip bg-warning-100 flex items-center justify-center shrink-0">
                        <Zap className="w-4.5 h-4.5 text-warning-600" />
                    </div>
                    <h3 className="font-bold text-sky-ink">{title}</h3>
                </div>
                <p className="text-sm font-medium text-sky-ink-2">{message}</p>
                <div className="flex gap-3 pt-1">
                    <SkyButton type="button" variant="secondary" onClick={onClose} disabled={loading} className="flex-1">Cancel</SkyButton>
                    <SkyButton type="button" variant="primary" onClick={onConfirm} disabled={loading} className="flex-1">
                        {loading ? <><Spinner size={13} /> Running…</> : <><Play className="w-3.5 h-3.5" /> {confirmLabel}</>}
                    </SkyButton>
                </div>
            </SkyCard>
        </div>,
        document.body
    );

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function AdminSystemJobsPage() {
    const alert = useAlert();
    const [logs, setLogs] = useState<JobExecutionLogDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [jobName, setJobName] = useState("");

    const [confirmRunAll, setConfirmRunAll] = useState(false);
    const [confirmRunOne, setConfirmRunOne] = useState<string | null>(null);
    const [running, setRunning] = useState(false);
    const [page, setPage] = useState(1);

    // BE GET /admin/jobs/recent?count= has no pageNumber/pageSize concept — it just returns the
    // N most recent rows. Fetch a generous batch once and paginate client-side.
    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await adminJobsApi.getRecent(200);
            if (res.success) {
                setLogs(res.data ?? []);
            } else {
                setError(res.message || "Failed to load job logs.");
            }
        } catch (err) {
            setError(errMsg(err) ?? "Network error fetching job logs.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
    const pagedLogs = useMemo(
        () => logs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        [logs, page]
    );

    // Distinct job names seen in recent logs — quick-trigger chips
    const knownJobNames = Array.from(new Set(logs.map(l => l.jobName))).sort();

    const handleRunAll = async () => {
        setRunning(true);
        try {
            const res = await adminJobsApi.runAll();
            if (res.success) {
                const count = res.data?.length ?? 0;
                alert.success(`Triggered ${count} job(s).`);
                fetchLogs();
            } else {
                alert.error(res.message || "Failed to run all jobs.");
            }
        } catch (err) {
            alert.error(errMsg(err) ?? "Failed to run all jobs.");
        } finally {
            setRunning(false);
            setConfirmRunAll(false);
        }
    };

    const handleRunOne = async (name: string) => {
        setRunning(true);
        try {
            // POST /admin/jobs/run/{jobName} is fire-and-forget — BE returns no Data payload,
            // just success + a message. Actual result shows up in the log table after refresh.
            const res = await adminJobsApi.runJob(name);
            if (res.success) {
                alert.success(res.message || `"${name}" triggered.`);
                fetchLogs();
            } else {
                alert.error(res.message || `Failed to run "${name}".`);
            }
        } catch (err) {
            alert.error(errMsg(err) ?? `Failed to run "${name}".`);
        } finally {
            setRunning(false);
            setConfirmRunOne(null);
        }
    };

    return (
        <>
            <PageMeta title="System Jobs | HabitEvolve Admin" description="View job execution logs and trigger background jobs" />
            <PageBreadcrumb pageTitle="System Jobs" />

            <div className="space-y-6 p-1">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-sky-chip bg-warning-100 flex items-center justify-center shrink-0">
                            <Cog className="w-6 h-6 text-warning-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-sky-ink">System Jobs</h1>
                            <p className="text-sm text-sky-ink-2 font-medium mt-0.5">Trigger background jobs and review recent execution logs</p>
                        </div>
                    </div>
                    <SkyButton type="button" variant="primary" onClick={() => setConfirmRunAll(true)} disabled={running} className="shrink-0">
                        <Zap className="w-3.5 h-3.5" /> Run All Jobs
                    </SkyButton>
                </div>

                {/* Run specific job */}
                <SkyCard variant="admin" className="p-0 overflow-hidden">
                    <div className="bg-warning-50 px-5 py-4 border-b border-gray-200">
                        <h3 className="font-bold text-sky-ink">Run a Specific Job</h3>
                    </div>
                    <div className="px-5 py-5 space-y-4">
                        {knownJobNames.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {knownJobNames.map(name => (
                                    <button key={name} type="button" onClick={() => setJobName(name)}
                                        className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-sky-ink-2 hover:bg-warning-100 transition-colors">
                                        {name}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="flex gap-3">
                            <input value={jobName} onChange={e => setJobName(e.target.value)}
                                placeholder="e.g. DailyStreakFinalizer" className={inputCls} />
                            <SkyButton
                                type="button"
                                variant="primary"
                                onClick={() => jobName.trim() && setConfirmRunOne(jobName.trim())}
                                disabled={running || !jobName.trim()}
                                className="shrink-0"
                            >
                                <Play className="w-3.5 h-3.5" /> Run
                            </SkyButton>
                        </div>
                    </div>
                </SkyCard>

                {/* Recent logs table */}
                <SkyCard variant="admin" className="p-0 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                        <h3 className="font-bold text-sky-ink">Recent Job Logs</h3>
                        <SkyButton type="button" variant="secondary" size="sm" onClick={fetchLogs} disabled={loading}>
                            {loading ? <Spinner size={13} /> : <RefreshCw className="w-3.5 h-3.5" />} Refresh
                        </SkyButton>
                    </div>

                    {error ? (
                        <div className="flex flex-col items-center gap-3 py-16">
                            <p className="font-bold text-sky-ink-2">Couldn't load logs</p>
                            <p className="text-sm text-sky-ink-3">{error}</p>
                            <SkyButton type="button" variant="secondary" size="sm" onClick={fetchLogs}>Retry</SkyButton>
                        </div>
                    ) : loading && logs.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16 text-sky-ink-3">
                            <Spinner size={32} /><p className="font-semibold text-sm">Loading logs…</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16 text-sky-ink-3">
                            <Cog className="w-12 h-12" />
                            <p className="font-black text-lg text-sky-ink-2">No job runs yet</p>
                        </div>
                    ) : (
                        <div className={`overflow-x-auto max-h-125 overflow-y-auto transition-opacity ${loading ? "opacity-50 pointer-events-none" : ""}`}>
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-sky-admin-bg-deep z-10">
                                    <tr className="border-b border-slate-200">
                                        {["Job", "Status", "Started", "Finished", "Message"].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-sky-ink">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedLogs.map((log, index) => (
                                        <tr key={log.jobExecutionLogId ?? index} className="sky-table-row">
                                            <td className="px-4 py-3 font-semibold text-sky-ink whitespace-nowrap">{log.jobName}</td>
                                            <td className="px-4 py-3"><StatusBadge success={log.success} /></td>
                                            <td className="px-4 py-3 text-xs text-sky-ink-2 whitespace-nowrap">{fmtDateTime(log.startedAt)}</td>
                                            <td className="px-4 py-3 text-xs text-sky-ink-2 whitespace-nowrap">{fmtDateTime(log.finishedAt)}</td>
                                            <td className="px-4 py-3 text-xs text-sky-ink-2 max-w-70 truncate" title={log.resultSummary ?? log.errorMessage ?? ""}>{log.resultSummary ?? log.errorMessage ?? "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                </SkyCard>
            </div>

            {confirmRunAll && (
                <ConfirmModal
                    title="Run All Jobs?"
                    message="This triggers every registered background job immediately. This can be expensive — make sure you mean to run all of them right now."
                    confirmLabel="Run All"
                    loading={running}
                    onConfirm={handleRunAll}
                    onClose={() => setConfirmRunAll(false)}
                />
            )}
            {confirmRunOne && (
                <ConfirmModal
                    title={`Run "${confirmRunOne}"?`}
                    message="This triggers the job immediately, outside its normal schedule."
                    confirmLabel="Run Job"
                    loading={running}
                    onConfirm={() => handleRunOne(confirmRunOne)}
                    onClose={() => setConfirmRunOne(null)}
                />
            )}
        </>
    );
}

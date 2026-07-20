import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Cog, Play, Zap, Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { useAlert } from "../context/AlertContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Pagination from "../components/common/Pagination";
import { adminJobsApi } from "../api/adminJobsApi";
import type { JobLogDto, JobRunStatus } from "../types/adminJobs.types";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

// ── STYLES ────────────────────────────────────────────────────────────────────
const btnBase =
    "inline-flex items-center gap-2 px-4 py-2 font-black text-sm border-2 border-black rounded-full " +
    "shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] " +
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 " +
    "disabled:shadow-[3px_3px_0_0_#1A1D20] transition-all";

const inputCls =
    "w-full px-4 py-2.5 border-2 border-black dark:border-gray-600 rounded-2xl text-sm font-medium " +
    "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 " +
    "focus:outline-none focus:ring-2 focus:ring-purple-300 dark:focus:ring-purple-600 " +
    "placeholder:text-gray-400 dark:placeholder:text-gray-500";

const errMsg = (e: unknown) =>
    (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const Spinner = ({ size = 18 }: { size?: number }) => <Loader2 className="animate-spin" width={size} height={size} />;

const STATUS_CFG: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
    Success: { bg: "bg-green-100 dark:bg-green-900/30", border: "border-green-400", text: "text-green-800 dark:text-green-300", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    Failed: { bg: "bg-red-100 dark:bg-red-900/30", border: "border-red-400", text: "text-red-800 dark:text-red-300", icon: <XCircle className="w-3.5 h-3.5" /> },
    Running: { bg: "bg-amber-100 dark:bg-amber-900/30", border: "border-amber-400", text: "text-amber-800 dark:text-amber-300", icon: <Spinner size={13} /> },
};
const StatusBadge = ({ status }: { status: JobRunStatus }) => {
    const c = STATUS_CFG[status] ?? { bg: "bg-gray-100", border: "border-gray-400", text: "text-gray-700", icon: null };
    return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border ${c.bg} ${c.border} ${c.text}`}>{c.icon} {status}</span>;
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
        <div className="fixed inset-0 z-99999 w-screen h-screen flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="modal-content bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[8px_8px_0_0_#1A1D20] w-full max-w-sm p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-amber-300 dark:bg-amber-700 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#1A1D20] shrink-0">
                        <Zap className="w-4.5 h-4.5" />
                    </div>
                    <h3 className="font-black text-gray-900 dark:text-gray-100">{title}</h3>
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{message}</p>
                <div className="flex gap-3 pt-1">
                    <button onClick={onClose} disabled={loading}
                        className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>Cancel</button>
                    <button onClick={onConfirm} disabled={loading}
                        className={`${btnBase} flex-1 justify-center bg-amber-300 dark:bg-amber-700 text-amber-900 dark:text-white`}>
                        {loading ? <><Spinner size={13} /> Running…</> : <><Play className="w-3.5 h-3.5" /> {confirmLabel}</>}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function AdminSystemJobsPage() {
    const alert = useAlert();
    const [logs, setLogs] = useState<JobLogDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [jobName, setJobName] = useState("");

    const [confirmRunAll, setConfirmRunAll] = useState(false);
    const [confirmRunOne, setConfirmRunOne] = useState<string | null>(null);
    const [running, setRunning] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await adminJobsApi.getRecentLogs({ pageNumber: page, pageSize: PAGE_SIZE });
            if (res.success) {
                setLogs(res.data ?? []);
                setTotalPages(res.totalPages ?? 1);
            } else {
                setError(res.message || "Failed to load job logs.");
            }
        } catch (err) {
            setError(errMsg(err) ?? "Network error fetching job logs.");
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

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
            const res = await adminJobsApi.runOne(name);
            if (res.success && res.data) {
                alert.success(`"${name}" finished — ${res.data.status}.`);
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
                        <div className="w-12 h-12 rounded-2xl bg-amber-300 border-2 border-black flex items-center justify-center shadow-[3px_3px_0_0_#1A1D20] shrink-0">
                            <Cog className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">System Jobs</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">Trigger background jobs and review recent execution logs</p>
                        </div>
                    </div>
                    <button onClick={() => setConfirmRunAll(true)} disabled={running}
                        className={`${btnBase} bg-amber-300 text-amber-900 shrink-0`}>
                        <Zap className="w-3.5 h-3.5" /> Run All Jobs
                    </button>
                </div>

                {/* Run specific job */}
                <div className="border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] overflow-hidden">
                    <div className="bg-[#fde8c8] dark:bg-amber-900/30 px-5 py-4 border-b-4 border-black">
                        <h3 className="font-black text-gray-900 dark:text-gray-100">Run a Specific Job</h3>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-0.5">POST /api/admin/jobs/run/{"{jobName}"}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 px-5 py-5 space-y-4">
                        {knownJobNames.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {knownJobNames.map(name => (
                                    <button key={name} onClick={() => setJobName(name)}
                                        className="px-3 py-1 rounded-full border-2 border-black text-xs font-black bg-gray-50 dark:bg-gray-800 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                                        {name}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="flex gap-3">
                            <input value={jobName} onChange={e => setJobName(e.target.value)}
                                placeholder="e.g. DailyStreakFinalizer" className={inputCls} />
                            <button
                                onClick={() => jobName.trim() && setConfirmRunOne(jobName.trim())}
                                disabled={running || !jobName.trim()}
                                className={`${btnBase} bg-black text-white shrink-0`}
                            >
                                <Play className="w-3.5 h-3.5" /> Run
                            </button>
                        </div>
                    </div>
                </div>

                {/* Recent logs table */}
                <div className="bg-white dark:bg-gray-900 border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b-2 border-gray-100 dark:border-gray-700">
                        <h3 className="font-black text-gray-900 dark:text-gray-100">Recent Job Logs</h3>
                        <button onClick={fetchLogs} disabled={loading} className={`${btnBase} bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 py-1.5`}>
                            {loading ? <Spinner size={13} /> : <RefreshCw className="w-3.5 h-3.5" />} Refresh
                        </button>
                    </div>

                    {error ? (
                        <div className="flex flex-col items-center gap-3 py-16">
                            <p className="font-black text-gray-700 dark:text-gray-300">Couldn't load logs</p>
                            <p className="text-sm text-gray-400">{error}</p>
                            <button onClick={fetchLogs} className={`${btnBase} bg-red-100 text-red-800`}>Retry</button>
                        </div>
                    ) : loading && logs.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                            <Spinner size={32} /><p className="font-bold text-sm">Loading logs…</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                            <Cog className="w-12 h-12" />
                            <p className="font-black text-lg text-gray-500 dark:text-gray-300">No job runs yet</p>
                        </div>
                    ) : (
                        <div className={`overflow-x-auto max-h-125 overflow-y-auto transition-opacity ${loading ? "opacity-50 pointer-events-none" : ""}`}>
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
                                    <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                                        {["Job", "Status", "Records", "Started", "Finished", "Message"].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {logs.map((log, index) => (
                                        <tr key={log.jobLogId ?? index} className="hover:bg-amber-50/30 dark:hover:bg-amber-900/10 transition-colors">
                                            <td className="px-4 py-3 font-black text-gray-900 dark:text-gray-100 whitespace-nowrap">{log.jobName}</td>
                                            <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">{log.recordsAffected ?? "—"}</td>
                                            <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDateTime(log.startedAt)}</td>
                                            <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDateTime(log.finishedAt)}</td>
                                            <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-70 truncate">{log.message || "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
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

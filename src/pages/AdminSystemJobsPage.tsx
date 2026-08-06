import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Cog, Play, Zap, Loader2, RefreshCw, AlertTriangle, Inbox, Terminal } from "lucide-react";
import { useAlert } from "../context/AlertContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import PageHeader from "../components/common/PageHeader";
import Pagination from "../components/common/SkyPagination";
import { adminJobsApi } from "../api/adminJobsApi";
import SkyCard from "../components/ui/card/SkyCard";
import SkyButton from "../components/ui/button/SkyButton";
import SharedStatusBadge from "../components/common/StatusBadge";
import type { JobExecutionLogDto } from "../types/adminJobs.types";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

const eyebrow = "text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3";

const inputCls = [
    "w-full px-4 py-2.5 rounded-sky-chip bg-white/70 ring-1 ring-white/80",
    "text-sky-ink text-sm font-medium transition-shadow",
    "focus:outline-none focus:ring-2 focus:ring-sky-deep/45",
    "placeholder:text-sky-ink-3",
].join(" ");

const errMsg = (e: unknown) =>
    (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const Spinner = ({ size = 18 }: { size?: number }) => <Loader2 className="animate-spin" width={size} height={size} />;

// BE JobExecutionLogDto only exposes a `success` boolean (no "Running" state — the log row is
// written after the job finishes), so the badge collapses to Success/Failed.
// Thin adapter over the shared StatusBadge — "success"/"failed" already
// resolve to the same success/danger tones the old bespoke badge used.
const StatusBadge = ({ success }: { success: boolean }) => (
    <SharedStatusBadge status={success ? "Success" : "Failed"} />
);

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
        <div className="fixed inset-0 z-99999 w-screen h-screen flex items-center justify-center bg-sky-abyss/45 backdrop-blur-md p-4">
            <SkyCard variant="admin" className="modal-content sky-in relative w-full max-w-sm space-y-4 overflow-hidden">
                <span className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-sky-peach to-sky-peach-deep" />
                <div className="flex items-center gap-3 pt-1">
                    <span className="grid place-items-center w-9 h-9 rounded-sky-chip bg-sky-peach/18 text-sky-peach-deep shrink-0">
                        <Zap className="w-4 h-4" />
                    </span>
                    <h3 className="font-display text-base font-semibold text-sky-ink">{title}</h3>
                </div>
                <p className="text-sm font-medium text-sky-ink-2">{message}</p>
                <div className="flex gap-3 pt-2 border-t border-white/70">
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
                <PageHeader
                    icon={<Cog className="w-6 h-6" />}
                    tone="peach"
                    title="System Jobs"
                    description="Trigger background jobs and review recent execution logs"
                    actions={
                        <SkyButton type="button" variant="primary" onClick={() => setConfirmRunAll(true)} disabled={running} className="shrink-0">
                            <Zap className="w-3.5 h-3.5" /> Run All Jobs
                        </SkyButton>
                    }
                />

                {/* Run specific job */}
                <SkyCard variant="admin" className="p-0 overflow-hidden">
                    <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/70 bg-white/45">
                        <Play className="w-4 h-4 shrink-0 text-sky-deep" />
                        <h3 className="font-display text-base font-semibold text-sky-ink">Run a Specific Job</h3>
                    </div>
                    <div className="px-5 py-5 space-y-4">
                        {/* The chips are a picker for the field below, so they live in one
                            recessed well and the chip matching the field lifts — the link
                            between the two controls is visible without a label saying so. */}
                        {knownJobNames.length > 0 && (
                            <div>
                                <p className={`${eyebrow} mb-2`}>Seen recently</p>
                                <div className="flex flex-wrap gap-1.5 rounded-sky-md bg-white/42 ring-1 ring-white/70 p-2">
                                    {knownJobNames.map(name => {
                                        const on = jobName.trim() === name;
                                        return (
                                            <button key={name} type="button" onClick={() => setJobName(name)} aria-pressed={on}
                                                className={`px-3 py-1.5 rounded-sky-chip text-xs transition ${
                                                    on
                                                        ? "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white font-semibold shadow-sky-chip"
                                                        : "text-sky-ink-2 font-medium hover:bg-white/70 hover:text-sky-ink"
                                                }`}>
                                                {name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <input value={jobName} onChange={e => setJobName(e.target.value)} aria-label="Job name"
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
                    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/70 bg-white/45">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <Terminal className="w-4 h-4 shrink-0 text-sky-deep" />
                            <h3 className="font-display text-base font-semibold text-sky-ink truncate">Recent Job Logs</h3>
                            {logs.length > 0 && (
                                <span className="inline-flex items-baseline gap-1 shrink-0">
                                    <span className="font-display text-sm font-semibold text-sky-ink tabular-nums">{logs.length}</span>
                                    <span className={eyebrow}>runs</span>
                                </span>
                            )}
                        </div>
                        <SkyButton type="button" variant="secondary" size="sm" onClick={fetchLogs} disabled={loading}>
                            {loading ? <Spinner size={13} /> : <RefreshCw className="w-3.5 h-3.5" />} Refresh
                        </SkyButton>
                    </div>

                    {error ? (
                        <div className="p-5">
                            <div className="relative flex items-start gap-3 overflow-hidden rounded-sky-md bg-sky-rose/10 ring-1 ring-sky-rose/25 pl-5 pr-4 py-4">
                                <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" />
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-sky-rose-deep" />
                                <div className="min-w-0 flex-1">
                                    <p className="font-display text-sm font-semibold text-sky-rose-deep">Couldn't load logs</p>
                                    <p className="text-xs font-medium text-sky-ink-2 mt-1">{error}</p>
                                </div>
                                <SkyButton type="button" variant="secondary" size="sm" onClick={fetchLogs} className="shrink-0">Retry</SkyButton>
                            </div>
                        </div>
                    ) : loading && logs.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16 text-sky-ink-3">
                            <Spinner size={32} /><p className="font-semibold text-sm">Loading logs…</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-16 text-center">
                            <span className="grid place-items-center w-14 h-14 mb-1 rounded-full bg-sky-deep/8 text-sky-deep"><Inbox className="w-6 h-6" /></span>
                            <p className="font-display text-base font-semibold text-sky-ink">No job runs yet</p>
                            <p className="text-xs font-medium text-sky-ink-3">Trigger a job above and its result will land here.</p>
                        </div>
                    ) : (
                        <div className={`overflow-x-auto max-h-125 overflow-y-auto transition-opacity ${loading ? "opacity-50 pointer-events-none" : ""}`}>
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm">
                                    <tr className="sky-table-head">
                                        {["Job", "Status", "Started", "Finished", "Message"].map(h => (
                                            <th key={h} className="px-4 py-3 text-left">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="sky-stagger">
                                    {pagedLogs.map((log, index) => (
                                        <tr key={log.jobExecutionLogId ?? index} className="sky-table-row">
                                            <td className="px-4 py-3 font-display text-sm font-semibold text-sky-ink whitespace-nowrap">{log.jobName}</td>
                                            <td className="px-4 py-3"><StatusBadge success={log.success} /></td>
                                            <td className="px-4 py-3 text-xs font-medium text-sky-ink-2 whitespace-nowrap tabular-nums">{fmtDateTime(log.startedAt)}</td>
                                            <td className="px-4 py-3 text-xs font-medium text-sky-ink-2 whitespace-nowrap tabular-nums">{fmtDateTime(log.finishedAt)}</td>
                                            <td className={`px-4 py-3 text-xs max-w-70 truncate ${log.success ? "text-sky-ink-2" : "font-medium text-sky-rose-deep"}`} title={log.resultSummary ?? log.errorMessage ?? ""}>{log.resultSummary ?? log.errorMessage ?? <span className="text-sky-ink-3">—</span>}</td>
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

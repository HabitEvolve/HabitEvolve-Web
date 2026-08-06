import { useState, useEffect, useCallback } from "react";
import { Cpu, Play, PlayCircle, Loader2, CheckCircle2, XCircle, RefreshCw, Inbox } from "lucide-react";
import { useAlert } from "../context/AlertContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { adminJobsApi } from "../api/adminJobsApi";
import SkyCard from "../components/ui/card/SkyCard";
import SkyButton from "../components/ui/button/SkyButton";
import type { JobExecutionLogDto } from "../types/adminJobs.types";

const errMsg = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const KNOWN_JOBS = ["PeriodicScan", "MidnightBatch"];

const fmtDateTime = (d: string | null) =>
  d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";

const durationMs = (start: string, end: string | null) =>
  end ? `${(new Date(end).getTime() - new Date(start).getTime())} ms` : "—";

const eyebrow = "text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3";

export default function AdminJobsMonitor() {
  const globalAlert = useAlert();
  const [logs, setLogs] = useState<JobExecutionLogDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningAll, setRunningAll] = useState(false);
  const [runningJob, setRunningJob] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminJobsApi.getRecent(30);
      if (res.success) setLogs(res.data ?? []);
    } catch (ex) {
      globalAlert.error(errMsg(ex) ?? "Failed to load job history.");
    } finally { setLoading(false); }
  }, [globalAlert]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleRunAll = async () => {
    setRunningAll(true);
    try {
      await adminJobsApi.runAll();
      globalAlert.success("All jobs triggered.");
      fetchLogs();
    } catch (ex) {
      globalAlert.error(errMsg(ex) ?? "Run-all failed.");
    } finally { setRunningAll(false); }
  };

  const handleRunOne = async (jobName: string) => {
    setRunningJob(jobName);
    try {
      await adminJobsApi.runJob(jobName);
      globalAlert.success(`"${jobName}" triggered.`);
      fetchLogs();
    } catch (ex) {
      globalAlert.error(errMsg(ex) ?? `Failed to run "${jobName}".`);
    } finally { setRunningJob(null); }
  };

  return (
    <>
      <PageMeta title="Jobs Monitor" description="Trigger and monitor background jobs (Quartz)." />
      <PageBreadcrumb pageTitle="Jobs Monitor" />

      <div className="space-y-6 p-1">
        <div className="sky-in flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid place-items-center w-12 h-12 rounded-sky-md bg-sky-deep/12 text-sky-deep shrink-0">
              <Cpu className="w-6 h-6" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-semibold text-sky-ink tracking-[-0.01em]">Jobs Monitor</h1>
              <p className="text-sm text-sky-ink-2 font-medium mt-0.5">Trigger scheduled jobs manually and inspect execution history.</p>
            </div>
          </div>
          <SkyButton type="button" variant="primary" onClick={handleRunAll} disabled={runningAll} className="shrink-0">
            {runningAll ? <><Loader2 className="w-4 h-4 animate-spin" /> Running…</> : <><PlayCircle className="w-4 h-4" /> Run All Jobs</>}
          </SkyButton>
        </div>

        <SkyCard variant="admin" className="p-4 space-y-3">
          <p className={eyebrow}>Trigger manually</p>
          <div className="flex flex-wrap items-center gap-2.5">
            {KNOWN_JOBS.map(jobName => (
              <SkyButton
                key={jobName}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleRunOne(jobName)}
                disabled={runningJob === jobName}
              >
                {runningJob === jobName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Run "{jobName}"
              </SkyButton>
            ))}
            <SkyButton type="button" variant="secondary" size="sm" onClick={fetchLogs} disabled={loading} className="ml-auto">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} {loading ? "Loading…" : "Refresh"}
            </SkyButton>
          </div>
        </SkyCard>

        <SkyCard variant="admin" className="p-0 overflow-hidden">
          {loading && logs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-sky-ink-3">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm font-semibold">Loading…</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <span className="grid place-items-center w-14 h-14 mb-1 rounded-full bg-sky-deep/8 text-sky-deep"><Inbox className="w-6 h-6" /></span>
              <p className="font-display text-base font-semibold text-sky-ink">No job executions logged yet</p>
              <p className="text-xs font-medium text-sky-ink-3">Trigger a job above and its run will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="sky-table-head">
                    {["#", "Job Name", "Started At", "Duration", "Result", "Summary"].map(h => (
                      <th key={h} className="px-4 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="sky-stagger">
                  {logs.map(log => (
                    <tr key={log.jobExecutionLogId} className="sky-table-row group">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-sky-ink-3 tabular-nums">{log.jobExecutionLogId}</td>
                      <td className="px-4 py-3 font-display text-sm font-semibold text-sky-ink whitespace-nowrap">{log.jobName}</td>
                      <td className="px-4 py-3 text-xs font-medium text-sky-ink-2 whitespace-nowrap tabular-nums">{fmtDateTime(log.startedAt)}</td>
                      <td className="px-4 py-3 text-xs font-medium text-sky-ink-2 whitespace-nowrap tabular-nums">{durationMs(log.startedAt, log.finishedAt)}</td>
                      <td className="px-4 py-3">
                        {log.success ? (
                          <span className="sky-badge sky-badge-success"><CheckCircle2 className="w-3 h-3 shrink-0" /> Success</span>
                        ) : (
                          <span className="sky-badge sky-badge-danger"><XCircle className="w-3 h-3 shrink-0" /> Failed</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-xs max-w-xs truncate ${log.success ? "text-sky-ink-2" : "font-medium text-sky-rose-deep"}`} title={log.resultSummary ?? log.errorMessage ?? ""}>
                        {log.errorMessage ?? log.resultSummary ?? <span className="text-sky-ink-3">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SkyCard>
      </div>
    </>
  );
}

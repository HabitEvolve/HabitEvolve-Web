import { useState, useEffect, useCallback } from "react";
import { Cpu, Play, PlayCircle, Loader2, CheckCircle2, XCircle } from "lucide-react";
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-sky-chip bg-blue-100 flex items-center justify-center shrink-0">
              <Cpu className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-sky-ink">Jobs Monitor</h1>
              <p className="text-sm text-sky-ink-2 font-medium mt-0.5">Trigger scheduled jobs manually and inspect execution history.</p>
            </div>
          </div>
          <SkyButton type="button" variant="primary" onClick={handleRunAll} disabled={runningAll} className="shrink-0">
            {runningAll ? <><Loader2 className="w-4 h-4 animate-spin" /> Running…</> : <><PlayCircle className="w-4 h-4" /> Run All Jobs</>}
          </SkyButton>
        </div>

        <SkyCard variant="admin" className="p-4">
          <div className="flex flex-wrap gap-3">
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
              {loading ? "Loading…" : "Refresh"}
            </SkyButton>
          </div>
        </SkyCard>

        <SkyCard variant="admin" className="p-0 overflow-hidden">
          {loading && logs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-sky-ink-3"><Loader2 className="w-8 h-8 animate-spin" /> Loading…</div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-sky-ink-3">
              <Cpu className="w-14 h-14 opacity-40" />
              <p className="font-black text-lg text-sky-ink-2">No job executions logged yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-sky-admin-bg-deep border-b border-slate-200">
                    {["#", "Job Name", "Started At", "Duration", "Result", "Summary"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-sky-ink">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.jobExecutionLogId} className="sky-table-row">
                      <td className="px-4 py-3 text-xs font-semibold text-sky-ink-3">{log.jobExecutionLogId}</td>
                      <td className="px-4 py-3 font-semibold text-sky-ink">{log.jobName}</td>
                      <td className="px-4 py-3 text-xs text-sky-ink-2 whitespace-nowrap">{fmtDateTime(log.startedAt)}</td>
                      <td className="px-4 py-3 text-xs text-sky-ink-2">{durationMs(log.startedAt, log.finishedAt)}</td>
                      <td className="px-4 py-3">
                        {log.success ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-success-700"><CheckCircle2 className="w-3.5 h-3.5" /> Success</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-error-700"><XCircle className="w-3.5 h-3.5" /> Failed</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-sky-ink-2 max-w-xs truncate" title={log.resultSummary ?? log.errorMessage ?? ""}>
                        {log.errorMessage ?? log.resultSummary ?? "—"}
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

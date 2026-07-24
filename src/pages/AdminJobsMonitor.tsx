import { useState, useEffect, useCallback } from "react";
import { Cpu, Play, PlayCircle, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useAlert } from "../context/AlertContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { adminJobsApi } from "../api/adminJobsApi";
import type { JobExecutionLogDto } from "../types/adminJobs.types";

const btnBase =
  "inline-flex items-center gap-2 px-4 py-2 font-black text-sm border-2 border-black rounded-full " +
  "shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 " +
  "disabled:shadow-[3px_3px_0_0_#1A1D20] transition-all";

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
            <div className="w-12 h-12 rounded-2xl bg-sky-300 border-2 border-black flex items-center justify-center shadow-[3px_3px_0_0_#1A1D20] shrink-0">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Jobs Monitor</h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">Trigger scheduled jobs manually and inspect execution history.</p>
            </div>
          </div>
          <button onClick={handleRunAll} disabled={runningAll} className={`${btnBase} bg-sky-200 text-sky-900 shrink-0`}>
            {runningAll ? <><Loader2 className="w-4 h-4 animate-spin" /> Running…</> : <><PlayCircle className="w-4 h-4" /> Run All Jobs</>}
          </button>
        </div>

        <div className="flex flex-wrap gap-3 p-4 bg-white dark:bg-gray-800 border-2 border-black rounded-2xl shadow-[3px_3px_0_0_#1A1D20]">
          {KNOWN_JOBS.map(jobName => (
            <button key={jobName} onClick={() => handleRunOne(jobName)} disabled={runningJob === jobName}
              className={`${btnBase} bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200`}>
              {runningJob === jobName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Run "{jobName}"
            </button>
          ))}
          <button onClick={fetchLogs} disabled={loading} className={`${btnBase} ml-auto bg-sky-100 text-sky-900 py-1.5`}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        <div className="bg-white dark:bg-[#1e2a3a] border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] overflow-hidden">
          {loading && logs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-gray-400"><Loader2 className="w-8 h-8 animate-spin" /> Loading…</div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
              <Cpu className="w-14 h-14 opacity-40" />
              <p className="font-black text-lg text-gray-500">No job executions logged yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-gray-800/60">
                    {["#", "Job Name", "Started At", "Duration", "Result", "Summary"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {logs.map(log => (
                    <tr key={log.jobExecutionLogId} className="hover:bg-sky-50/30 dark:hover:bg-sky-900/10 transition-colors">
                      <td className="px-4 py-3 text-xs font-black text-gray-400">{log.jobExecutionLogId}</td>
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100">{log.jobName}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">{fmtDateTime(log.startedAt)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{durationMs(log.startedAt, log.finishedAt)}</td>
                      <td className="px-4 py-3">
                        {log.success ? (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-green-700"><CheckCircle2 className="w-3.5 h-3.5" /> Success</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-red-700"><XCircle className="w-3.5 h-3.5" /> Failed</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate" title={log.resultSummary ?? log.errorMessage ?? ""}>
                        {log.errorMessage ?? log.resultSummary ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

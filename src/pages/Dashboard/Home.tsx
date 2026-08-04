import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { RefreshCw, ShieldAlert, Swords, Users, ChevronRight, ExternalLink } from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import DatePicker from "../../components/form/date-picker";
import { adminDashboardApi } from "../../api/adminDashboardApi";
import SkyCard from "../../components/ui/card/SkyCard";
import SkyButton from "../../components/ui/button/SkyButton";
import type {
    AdminDashboardSummaryDto,
    RecentTransactionDto,
    CriticalSystemLogDto,
} from "../../types/adminDashboard.types";

// ── STYLES ────────────────────────────────────────────────────────────────────
// SkyCard variant="admin" everywhere on this page (see MetricCard etc. below) —
// restrained glass per PRODUCT.md, no neo-brutalism, no Mentor-strength mesh.
const chartFont = { fontFamily: "Space Grotesk, sans-serif" };

// ── HELPERS ───────────────────────────────────────────────────────────────────
const errMsg = (e: unknown) =>
    (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const toIso = (d: Date) => d.toISOString().slice(0, 10);

const defaultRange = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 29);
    return { startDate: toIso(start), endDate: toIso(end) };
};

const fmtVnd = (n: number) => `${n.toLocaleString("vi-VN")} ₫`;

const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleString("en-US", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });

// ── SKELETONS ─────────────────────────────────────────────────────────────────
const SkeletonLine = ({ className = "" }: { className?: string }) => (
    <div className={`animate-pulse bg-gray-200 rounded-md ${className}`} />
);

const MetricSkeleton = () => (
    <SkyCard variant="admin" className="flex flex-col justify-between">
        <SkeletonLine className="h-4 w-28 mb-4" />
        <SkeletonLine className="h-8 w-24" />
    </SkyCard>
);

const ChartSkeleton = ({ height = 280 }: { height?: number }) => (
    <div className="flex flex-col gap-3" style={{ height }}>
        <SkeletonLine className="h-full w-full" />
    </div>
);

const RowSkeleton = () => (
    <div className="flex items-center gap-3 px-4 py-3">
        <SkeletonLine className="h-9 w-9 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
            <SkeletonLine className="h-3.5 w-2/3" />
            <SkeletonLine className="h-3 w-1/3" />
        </div>
    </div>
);

// ── METRIC CARD ───────────────────────────────────────────────────────────────
interface MetricCardProps {
    icon: React.ReactNode;
    iconBg: string;
    label: string;
    value: string;
    sub?: React.ReactNode;
}
const MetricCard = ({ icon, iconBg, label, value, sub }: MetricCardProps) => (
    <SkyCard variant="admin" className="flex flex-col justify-between">
        <div className="flex items-center space-x-3 mb-4">
            <div className={`p-2 rounded-lg ${iconBg}`}>{icon}</div>
            <span className="font-bold text-sky-ink-2">{label}</span>
        </div>
        <div>
            <div className="text-3xl font-black text-sky-ink mb-1">{value}</div>
            {sub && <div className="text-xs font-semibold">{sub}</div>}
        </div>
    </SkyCard>
);

const CurrencyDelta = ({ label, delta }: { label: string; delta: number }) => (
    <div className="flex items-center justify-between text-xs font-bold">
        <span className="text-sky-ink-2">{label}</span>
        <span className={delta >= 0 ? "text-success-600" : "text-error-600"}>
            {delta >= 0 ? "+" : ""}{delta.toLocaleString()}
        </span>
    </div>
);

// ── ACTION REQUIRED CARD ─────────────────────────────────────────────────────
interface ActionRequiredCardProps {
    icon: React.ReactNode;
    label: string;
    hint: string;
    count: number;
    onClick: () => void;
}
const ActionRequiredCard = ({ icon, label, hint, count, onClick }: ActionRequiredCardProps) => {
    const alert = count > 0;
    return (
        <SkyCard
            variant="admin"
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onClick(); }}
            className={`cursor-pointer transition-transform hover:scale-[1.01] ${
                alert ? "ring-2 ring-warning-400 bg-warning-50" : ""
            }`}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2.5 rounded-lg shrink-0 ${alert ? "bg-warning-200 text-warning-800" : "bg-gray-100 text-sky-ink-3"}`}>
                        {icon}
                    </div>
                    <div className="min-w-0">
                        <div className="font-bold text-sky-ink-2 text-sm truncate">{label}</div>
                        <div className="text-xs text-sky-ink-3 truncate">{hint}</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-3xl font-black ${alert ? "text-warning-700" : "text-sky-ink"}`}>{count}</span>
                    <ChevronRight className="w-4 h-4 text-sky-ink-3" />
                </div>
            </div>
        </SkyCard>
    );
};

// ── RECENT TRANSACTIONS TABLE ────────────────────────────────────────────────
const TX_STATUS_CLS: Record<string, string> = {
    COMPLETED: "bg-success-100 text-success-800",
    PENDING: "bg-warning-100 text-warning-800",
    CANCELLED: "bg-gray-100 text-gray-500",
};

const RecentTransactionsCard = ({ loading, rows }: { loading: boolean; rows: RecentTransactionDto[] }) => (
    <SkyCard variant="admin" className="p-0 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <h3 className="text-xl font-bold text-sky-ink">Recent Transactions</h3>
            <span className="text-xs text-sky-ink-3 font-medium">Top 5 · real-money Gems top-ups</span>
        </div>
        {loading ? (
            <div className="divide-y divide-gray-100">
                {Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)}
            </div>
        ) : rows.length === 0 ? (
            <p className="text-sm text-sky-ink-3 font-medium py-14 text-center px-6">
                Hệ thống vận hành mượt mà — chưa có giao dịch nào gần đây.
            </p>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 bg-gray-50/60">
                            {["User", "Package", "Amount", "Status", "Time"].map(h => (
                                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-sky-ink-3">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(tx => (
                            <tr key={tx.id} className="sky-table-row">
                                <td className="px-4 py-3 max-w-40">
                                    <p className="font-bold text-sky-ink truncate">{tx.userName}</p>
                                    <p className="text-xs text-sky-ink-3 truncate">{tx.userEmail}</p>
                                </td>
                                <td className="px-4 py-3 text-sky-ink-2 max-w-32 truncate">{tx.packageName}</td>
                                <td className="px-4 py-3 font-bold text-sky-ink whitespace-nowrap">{fmtVnd(tx.amount)}</td>
                                <td className="px-4 py-3">
                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${TX_STATUS_CLS[tx.status] ?? "bg-gray-100 text-gray-500"}`}>
                                        {tx.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-xs text-sky-ink-3 whitespace-nowrap">{fmtDateTime(tx.createdAt)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </SkyCard>
);

// ── CRITICAL SYSTEM LOGS FEED ────────────────────────────────────────────────
const LOG_LEVEL_CLS: Record<string, string> = {
    CRITICAL: "bg-error-100 text-error-700",
    WARNING: "bg-warning-100 text-warning-800",
};

const CriticalLogsCard = ({
    loading, rows, onViewAll,
}: { loading: boolean; rows: CriticalSystemLogDto[]; onViewAll: () => void }) => (
    <SkyCard variant="admin" className="p-0 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <h3 className="text-xl font-bold text-sky-ink">Critical System & Abuse Logs</h3>
            <SkyButton type="button" variant="ghost" size="sm" onClick={onViewAll}>
                View All Logs <ExternalLink className="w-3.5 h-3.5" />
            </SkyButton>
        </div>
        {loading ? (
            <div className="divide-y divide-gray-100">
                {Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)}
            </div>
        ) : rows.length === 0 ? (
            <p className="text-sm text-sky-ink-3 font-medium py-14 text-center px-6">
                Hệ thống vận hành mượt mà, không có cảnh báo.
            </p>
        ) : (
            <div className="divide-y divide-gray-100">
                {rows.map(log => (
                    <div key={log.id} className="flex items-start gap-3 px-6 py-3">
                        <span className={`shrink-0 mt-0.5 text-[10px] font-black px-2 py-0.5 rounded-full ${LOG_LEVEL_CLS[log.level] ?? "bg-gray-100 text-gray-500"}`}>
                            {log.level}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-sky-ink leading-snug">{log.title}</p>
                            <p className="text-xs text-sky-ink-3 mt-0.5">
                                {log.source} · {fmtDateTime(log.createdAt)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </SkyCard>
);

// ── PAGE ──────────────────────────────────────────────────────────────────────
export default function Home() {
    const navigate = useNavigate();
    const [range, setRange] = useState(defaultRange());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<AdminDashboardSummaryDto | null>(null);

    const fetchSummary = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // BE query params are "from"/"to" (AdminDashboardController), not startDate/endDate —
            // keep the local range state named for the DatePicker and translate at the call site.
            const params = { from: range.startDate, to: range.endDate };
            const res = await adminDashboardApi.getSummary(params);
            if (res.success) setSummary(res.data ?? null);
            else setError(res.message || "Failed to load dashboard data.");
        } catch (err) {
            setError(errMsg(err) ?? "Network error fetching dashboard data.");
        } finally {
            setLoading(false);
        }
    }, [range]);

    useEffect(() => { fetchSummary(); }, [fetchSummary]);

    // ── Safe, guaranteed-array views of each report ──────────────────────────
    // BE reports are aggregate-over-range, not a day-by-day time series: economy is one row
    // per currency (byCurrency), quest completion is one row per QuestType (byQuestType), and
    // user activity is just two totals for the whole range (no array at all). Normalize the
    // array-shaped ones once, here, and read the scalar ones straight off `userActivity`.
    const economyByCurrency = summary?.economy.byCurrency ?? [];
    const questByType = summary?.questCompletion.byQuestType ?? [];
    const userActivity = summary?.userActivity;

    // ── Derived metrics ──────────────────────────────────────────────────────
    const findCurrency = (code: string) => economyByCurrency.find(c => c?.currency === code);
    const netGold = findCurrency("GOLD")?.net ?? 0;
    const netGems = findCurrency("GEMS")?.net ?? 0;
    const netMGold = findCurrency("MGOLD")?.net ?? 0;

    // ── Economy chart — Earned vs Spent per currency (BE gives range totals, not daily) ──────
    const economyOptions: ApexOptions = {
        chart: { ...chartFont, height: 280, type: "bar", toolbar: { show: false } },
        colors: ["#12b76a", "#f04438"],
        plotOptions: { bar: { borderRadius: 6, columnWidth: "45%" } },
        dataLabels: { enabled: false },
        legend: { position: "top", horizontalAlign: "left" },
        xaxis: { categories: economyByCurrency.map(c => c?.currency ?? ""), labels: { style: { fontSize: "11px" } } },
        yaxis: { labels: { style: { fontSize: "11px" } } },
        grid: { xaxis: { lines: { show: false } }, borderColor: "rgba(148,163,184,0.2)" },
    };
    const economySeries = [
        { name: "Earned", data: economyByCurrency.map(c => c?.earned ?? 0) },
        { name: "Spent", data: economyByCurrency.map(c => c?.spent ?? 0) },
    ];

    // ── Quest completion chart ───────────────────────────────────────────────
    const questOptions: ApexOptions = {
        chart: { ...chartFont, height: 280, type: "bar", toolbar: { show: false } },
        colors: ["#7C3AED"],
        plotOptions: { bar: { borderRadius: 6, columnWidth: "45%" } },
        dataLabels: { enabled: true, formatter: (v: number) => `${(v ?? 0).toFixed(0)}%` },
        xaxis: { categories: questByType.map(e => e?.questType ?? "Unknown"), labels: { style: { fontSize: "11px" } } },
        yaxis: { max: 100, labels: { formatter: (v: number) => `${v ?? 0}%`, style: { fontSize: "11px" } } },
        grid: { xaxis: { lines: { show: false } }, borderColor: "rgba(148,163,184,0.2)" },
    };
    // BE completionRate is a 0–1 fraction (Math.Round(Approved/Total, 4)) — scale to a percentage.
    const questSeries = [{ name: "Completion Rate", data: questByType.map(e => Math.round((e?.completionRate ?? 0) * 100)) }];

    // Nothing has loaded yet on this mount/range change — show a full-page skeleton
    // instead of partially-empty cards flashing in.
    const isInitialLoading = loading && !summary;
    if (isInitialLoading) {
        return (
            <>
                <PageMeta title="HabitEvolve Admin Dashboard" description="Loading dashboard…" />
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                    <MetricSkeleton /><MetricSkeleton /><MetricSkeleton /><MetricSkeleton />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                    <MetricSkeleton /><MetricSkeleton />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <SkyCard variant="admin"><ChartSkeleton /></SkyCard>
                    <SkyCard variant="admin"><ChartSkeleton /></SkyCard>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SkyCard variant="admin" className="p-0"><div className="p-6"><ChartSkeleton height={200} /></div></SkyCard>
                    <SkyCard variant="admin" className="p-0"><div className="p-6"><ChartSkeleton height={200} /></div></SkyCard>
                </div>
            </>
        );
    }

    return (
        <>
            <PageMeta
                title="HabitEvolve Admin Dashboard"
                description="HabitEvolve Admin Dashboard - real-time economy, quest, and user activity reporting"
            />

            {/* Header + global date filter */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-sky-ink">Dashboard</h1>
                    <p className="text-sm text-sky-ink-2 font-medium mt-0.5">
                        Economy, quest completion, and user activity for the selected range
                    </p>
                </div>
                <div className="flex items-end gap-3">
                    <div className="w-56">
                        <DatePicker
                            id="dashboard-date-range"
                            mode="range"
                            label="Date Range"
                            defaultDate={[range.startDate, range.endDate]}
                            onChange={(dates) => {
                                if (dates.length === 2) {
                                    setRange({ startDate: toIso(dates[0]), endDate: toIso(dates[1]) });
                                }
                            }}
                        />
                    </div>
                    <SkyButton type="button" variant="primary" onClick={fetchSummary} disabled={loading} className="h-11">
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                    </SkyButton>
                </div>
            </div>

            {error && (
                <div className="mb-8 p-4 bg-error-50 border border-error-200 rounded-sky-card font-bold text-error-700 text-sm flex items-center justify-between">
                    {error}
                    <button type="button" onClick={fetchSummary} className="underline underline-offset-2 shrink-0 ml-4">Retry</button>
                </div>
            )}

            {/* Row 1 — Metrics Overview */}
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
                {loading && !userActivity ? <MetricSkeleton /> : (
                    <MetricCard
                        label="Active Users"
                        value={(userActivity?.activeUsers ?? 0).toLocaleString()}
                        iconBg="bg-blue-100"
                        icon={
                            <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                            </svg>
                        }
                        sub={<span className="text-sky-ink-3">In selected range</span>}
                    />
                )}

                {loading && !userActivity ? <MetricSkeleton /> : (
                    <MetricCard
                        label="New Signups"
                        value={(userActivity?.newUsers ?? 0).toLocaleString()}
                        iconBg="bg-orange-100"
                        icon={
                            <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3.005 3.005 0 013.75-2.906z" />
                            </svg>
                        }
                        sub={<span className="text-sky-ink-3">In selected range</span>}
                    />
                )}

                {loading && !summary ? <MetricSkeleton /> : (
                    <SkyCard variant="admin" className="flex flex-col justify-between">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                                    <path clipRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" fillRule="evenodd" />
                                </svg>
                            </div>
                            <span className="font-bold text-sky-ink-2">Net Economy (In − Out)</span>
                        </div>
                        <div className="space-y-1.5">
                            <CurrencyDelta label="Gold" delta={netGold} />
                            <CurrencyDelta label="Gems" delta={netGems} />
                            <CurrencyDelta label="M-Gold" delta={netMGold} />
                        </div>
                    </SkyCard>
                )}

                {loading && !summary ? <MetricSkeleton /> : (
                    <MetricCard
                        label="Total Active Mentors"
                        value={(summary?.totalActiveMentors ?? 0).toLocaleString()}
                        iconBg="bg-purple-100"
                        icon={<Users className="w-6 h-6 text-purple-600" />}
                        sub={<span className="text-sky-ink-3">Role = MENTOR, Status = Active</span>}
                    />
                )}
            </section>

            {/* Row 1.5 — Action Required */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                {loading && !summary ? <><MetricSkeleton /><MetricSkeleton /></> : (
                    <>
                        <ActionRequiredCard
                            icon={<ShieldAlert className="w-5 h-5" />}
                            label="Pending Court Cases"
                            hint="Community proof disputes awaiting admin override"
                            count={summary?.actionRequired.pendingCourtCases ?? 0}
                            onClick={() => navigate("/court-management")}
                        />
                        <ActionRequiredCard
                            icon={<Swords className="w-5 h-5" />}
                            label="Missing Weekly Bosses"
                            hint="Active parties with no boss scheduled for next week"
                            count={summary?.actionRequired.missingWeeklyBosses ?? 0}
                            onClick={() => navigate("/boss-management")}
                        />
                    </>
                )}
            </section>

            {/* Row 2 — Charts */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <SkyCard variant="admin">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-sky-ink">Economy — Earned vs Spent</h3>
                        <div className="text-sm text-sky-ink-2">{range.startDate} → {range.endDate}</div>
                    </div>
                    {loading && !summary ? <ChartSkeleton /> : economyByCurrency.length > 0 ? (
                        <div className="max-w-full overflow-x-auto">
                            <div className="min-w-100">
                                <Chart options={economyOptions} series={economySeries} type="bar" height={280} />
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-sky-ink-3 font-medium py-16 text-center">No economy data for this range.</p>
                    )}
                </SkyCard>

                <SkyCard variant="admin">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-sky-ink">Quest Completion Rate</h3>
                        <div className="text-sm text-sky-ink-2">by Quest Type</div>
                    </div>
                    {loading && !summary ? <ChartSkeleton /> : questByType.length > 0 ? (
                        <div className="max-w-full overflow-x-auto">
                            <div className="min-w-100">
                                <Chart options={questOptions} series={questSeries} type="bar" height={280} />
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-sky-ink-3 font-medium py-16 text-center">No quest completion data for this range.</p>
                    )}
                </SkyCard>
            </section>

            {/* Row 3 — Live Feeds */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RecentTransactionsCard loading={loading && !summary} rows={summary?.recentTransactions ?? []} />
                <CriticalLogsCard
                    loading={loading && !summary}
                    rows={summary?.criticalSystemLogs ?? []}
                    onViewAll={() => navigate("/admin/audit-log")}
                />
            </section>
        </>
    );
}

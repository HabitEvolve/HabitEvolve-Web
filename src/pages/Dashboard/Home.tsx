import { useState, useEffect, useCallback } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { RefreshCw } from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import DatePicker from "../../components/form/date-picker";
import { adminReportsApi } from "../../api/adminReportsApi";
import SkyCard from "../../components/ui/card/SkyCard";
import SkyButton from "../../components/ui/button/SkyButton";
import type {
    EconomyReportDto,
    QuestCompletionReportDto,
    UserActivityReportDto,
} from "../../types/adminReports.types";

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

// ── PAGE ──────────────────────────────────────────────────────────────────────
export default function Home() {
    const [range, setRange] = useState(defaultRange());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [economy, setEconomy] = useState<EconomyReportDto | null>(null);
    const [questCompletion, setQuestCompletion] = useState<QuestCompletionReportDto | null>(null);
    const [userActivity, setUserActivity] = useState<UserActivityReportDto | null>(null);

    const fetchReports = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // BE query params are "from"/"to" (AdminReportingController), not startDate/endDate —
            // keep the local range state named for the DatePicker and translate at the call site.
            const params = { from: range.startDate, to: range.endDate };
            const [econRes, questRes, activityRes] = await Promise.all([
                adminReportsApi.getEconomyReport(params),
                adminReportsApi.getQuestCompletionReport(params),
                adminReportsApi.getUserActivityReport(params),
            ]);
            if (econRes.success) setEconomy(econRes.data ?? null);
            if (questRes.success) setQuestCompletion(questRes.data ?? null);
            if (activityRes.success) setUserActivity(activityRes.data ?? null);
            if (!econRes.success && !questRes.success && !activityRes.success) {
                setError(econRes.message || "Failed to load dashboard data.");
            }
        } catch (err) {
            setError(errMsg(err) ?? "Network error fetching dashboard data.");
        } finally {
            setLoading(false);
        }
    }, [range]);

    useEffect(() => { fetchReports(); }, [fetchReports]);

    // ── Safe, guaranteed-array views of each report ──────────────────────────
    // BE reports are aggregate-over-range, not a day-by-day time series: economy is one row
    // per currency (byCurrency), quest completion is one row per QuestType (byQuestType), and
    // user activity is just two totals for the whole range (no array at all). Normalize the
    // array-shaped ones once, here, and read the scalar ones straight off `userActivity`.
    const economyByCurrency = economy?.byCurrency ?? [];
    const questByType = questCompletion?.byQuestType ?? [];

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
    const isInitialLoading = loading && !economy && !questCompletion && !userActivity;
    if (isInitialLoading) {
        return (
            <>
                <PageMeta title="HabitEvolve Admin Dashboard" description="Loading dashboard…" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                    <MetricSkeleton /><MetricSkeleton /><MetricSkeleton />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SkyCard variant="admin"><ChartSkeleton /></SkyCard>
                    <SkyCard variant="admin"><ChartSkeleton /></SkyCard>
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
                    <SkyButton type="button" variant="primary" onClick={fetchReports} disabled={loading} className="h-11">
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                    </SkyButton>
                </div>
            </div>

            {error && (
                <div className="mb-8 p-4 bg-error-50 border border-error-200 rounded-sky-card font-bold text-error-700 text-sm flex items-center justify-between">
                    {error}
                    <button type="button" onClick={fetchReports} className="underline underline-offset-2 shrink-0 ml-4">Retry</button>
                </div>
            )}

            {/* Row 1 — Metrics Overview */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
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

                {loading && !economy ? <MetricSkeleton /> : (
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
            </section>

            {/* Row 2 — Charts */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <SkyCard variant="admin">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-sky-ink">Economy — Earned vs Spent</h3>
                        <div className="text-sm text-sky-ink-2">{range.startDate} → {range.endDate}</div>
                    </div>
                    {loading && !economy ? <ChartSkeleton /> : economyByCurrency.length > 0 ? (
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
                    {loading && !questCompletion ? <ChartSkeleton /> : questByType.length > 0 ? (
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
        </>
    );
}

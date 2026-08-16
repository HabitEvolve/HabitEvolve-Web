import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import {
    RefreshCw, ShieldAlert, Swords, Users, ChevronRight, ExternalLink,
    UserPlus, Coins, GraduationCap, ArrowUp, ArrowDown, AlertTriangle,
    Check, Clock, X, Receipt, ScrollText, LayoutDashboard,
} from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import DatePicker from "../../components/form/date-picker";
import { adminDashboardApi } from "../../api/adminDashboardApi";
import SkyCard from "../../components/ui/card/SkyCard";
import SkyButton from "../../components/ui/button/SkyButton";
import { SKY, skyChartBase, skyBarPlotOptions } from "../../utils/skyChart";
import type {
    AdminDashboardSummaryDto,
    RecentTransactionDto,
    CriticalSystemLogDto,
} from "../../types/adminDashboard.types";

// ── STYLES ────────────────────────────────────────────────────────────────────
// SkyCard variant="admin" everywhere on this page (see MetricCard etc. below) —
// restrained glass per PRODUCT.md, no neo-brutalism, no Mentor-strength mesh.
// Chart typography/palette comes from utils/skyChart so this page owns no hexes.
const eyebrow = "text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3";

// ── HELPERS ───────────────────────────────────────────────────────────────────
const errMsg = (e: unknown) =>
    (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const toIso = (d: Date) => d.toISOString().slice(0, 10);

// Default filter = the calendar month containing today (1st → last day), not a rolling
// 30-day window — e.g. on 2026-08-16 that's 2026-08-01 → 2026-08-31.
const defaultRange = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { startDate: toIso(start), endDate: toIso(end) };
};

const fmtVnd = (n: number) => `${n.toLocaleString("vi-VN")} ₫`;

const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleString("en-US", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });

// ── SKELETONS ─────────────────────────────────────────────────────────────────
// Navy at low alpha rather than a neutral gray, so the placeholder reads as the
// same material as the card it sits in.
const SkeletonLine = ({ className = "" }: { className?: string }) => (
    <div className={`animate-pulse bg-sky-ink/8 rounded-sky-chip ${className}`} />
);

const MetricSkeleton = () => (
    <SkyCard variant="admin" className="flex flex-col justify-between">
        <SkeletonLine className="h-3 w-24 mb-6" />
        <SkeletonLine className="h-8 w-28" />
    </SkyCard>
);

const ChartSkeleton = ({ height = 280 }: { height?: number }) => (
    <div className="flex flex-col gap-3" style={{ height }}>
        <SkeletonLine className="h-full w-full" />
    </div>
);

const RowSkeleton = () => (
    <div className="flex items-center gap-3 px-6 py-3.5">
        <SkeletonLine className="h-9 w-9 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
            <SkeletonLine className="h-3.5 w-2/3" />
            <SkeletonLine className="h-3 w-1/3" />
        </div>
    </div>
);

// ── CARD HEADER ───────────────────────────────────────────────────────────────
// One shape for every panel head on the page: display title, quiet meta line,
// optional trailing action. `relative` because sky-glass paints an ::after sheen.
const CardHead = ({ icon, title, meta, action }: {
    icon: React.ReactNode;
    title: string;
    meta?: string;
    action?: React.ReactNode;
}) => (
    <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
            <span className="inline-grid place-items-center w-8 h-8 shrink-0 rounded-sky-chip bg-sky-deep/10 text-sky-deep">
                {icon}
            </span>
            <div className="min-w-0">
                <h3 className="font-display text-base font-semibold text-sky-ink leading-tight">{title}</h3>
                {meta && <p className="mt-0.5 text-xs text-sky-ink-3 truncate">{meta}</p>}
            </div>
        </div>
        {action}
    </div>
);

// ── METRIC CARD ───────────────────────────────────────────────────────────────
// Hue is an identity axis here, not a status one: deep = the primary population
// measure, deep-lo = its growth sibling, peach = currency/reward, violet =
// mentor. None of them borrows teal (success) or rose (destructive).
interface MetricCardProps {
    icon: React.ReactNode;
    rail: string;
    chip: string;
    label: string;
    value: string;
    sub?: React.ReactNode;
}
const MetricCard = ({ icon, rail, chip, label, value, sub }: MetricCardProps) => (
    <SkyCard variant="admin" className="sky-lift flex flex-col justify-between overflow-hidden">
        <span className={`absolute inset-x-0 top-0 h-[3px] ${rail}`} aria-hidden="true" />
        <div className="relative flex items-start justify-between gap-3">
            <span className={eyebrow}>{label}</span>
            <span className={`inline-grid place-items-center w-9 h-9 shrink-0 rounded-sky-chip ${chip}`}>{icon}</span>
        </div>
        <div className="relative mt-6">
            <div className="font-display text-[2rem] leading-none font-semibold text-sky-ink tabular-nums">{value}</div>
            {sub && <div className="mt-1.5 text-xs">{sub}</div>}
        </div>
    </SkyCard>
);

// Direction is the axis: a rising balance reads teal, a falling one rose. Sign
// character + arrow glyph + hue, so the number is never colour-only.
const CurrencyDelta = ({ label, delta }: { label: string; delta: number }) => {
    const up = delta >= 0;
    return (
        <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-sky-ink-2 font-medium">{label}</span>
            <span className={`inline-flex items-center gap-1 font-semibold tabular-nums ${up ? "text-sky-teal" : "text-sky-rose-deep"}`}>
                {up ? <ArrowUp className="w-3 h-3" aria-hidden="true" /> : <ArrowDown className="w-3 h-3" aria-hidden="true" />}
                {up ? "+" : ""}{delta.toLocaleString()}
            </span>
        </div>
    );
};

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
            className={`group cursor-pointer overflow-hidden transition-all duration-200 hover:-translate-y-px ${
                alert ? "ring-1 ring-sky-peach/40 bg-sky-peach/8" : ""
            }`}
        >
            {/* A queue with work in it gets a rail, a wash, a glyph and a warm
                count — four cues, so "needs attention" survives colour-blindness. */}
            {alert && <span className="absolute inset-x-0 top-0 h-[3px] bg-sky-peach" aria-hidden="true" />}
            <div className="relative flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <span className={`inline-grid place-items-center w-10 h-10 shrink-0 rounded-sky-chip ${
                        alert ? "bg-sky-peach/18 text-sky-peach-deep" : "bg-sky-deep/8 text-sky-ink-3"
                    }`}>
                        {icon}
                    </span>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="font-display text-sm font-semibold text-sky-ink truncate">{label}</span>
                            {alert && <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-sky-peach-deep" aria-hidden="true" />}
                        </div>
                        <div className="text-xs text-sky-ink-3 truncate">{hint}</div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`font-display text-[1.75rem] leading-none font-semibold tabular-nums ${
                        alert ? "text-sky-peach-deep" : "text-sky-ink-3"
                    }`}>
                        {count}
                    </span>
                    <ChevronRight className="w-4 h-4 text-sky-ink-3 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                </div>
            </div>
        </SkyCard>
    );
};

// ── RECENT TRANSACTIONS TABLE ────────────────────────────────────────────────
const TX_STATUS_META: Record<string, { cls: string; icon: React.ReactNode }> = {
    COMPLETED: { cls: "sky-badge-success", icon: <Check className="w-3 h-3" aria-hidden="true" /> },
    PENDING: { cls: "sky-badge-pending", icon: <Clock className="w-3 h-3" aria-hidden="true" /> },
    CANCELLED: { cls: "sky-badge-neutral", icon: <X className="w-3 h-3" aria-hidden="true" /> },
};

const RecentTransactionsCard = ({ loading, rows }: { loading: boolean; rows: RecentTransactionDto[] }) => (
    <SkyCard variant="admin" className="p-0 overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-4">
            <CardHead icon={<Receipt className="w-4 h-4" />} title="Recent Transactions" meta="Top 5 · real-money Gems top-ups" />
        </div>
        {loading ? (
            <div className="divide-y divide-white/60">
                {Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)}
            </div>
        ) : rows.length === 0 ? (
            <p className="text-sm text-sky-ink-3 font-medium py-14 text-center px-6">
                Hệ thống vận hành mượt mà — chưa có giao dịch nào gần đây.
            </p>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="sky-table-head">
                        <tr>
                            {["User", "Package", "Amount", "Status", "Time"].map(h => (
                                <th key={h} className={`px-4 py-2.5 text-left ${eyebrow}`}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(tx => {
                            const st = TX_STATUS_META[tx.status];
                            return (
                                <tr key={tx.id} className="sky-table-row">
                                    <td className="px-4 py-3 max-w-40">
                                        <p className="font-semibold text-sky-ink truncate">{tx.userName}</p>
                                        <p className="text-xs text-sky-ink-3 truncate">{tx.userEmail}</p>
                                    </td>
                                    <td className="px-4 py-3 text-sky-ink-2 max-w-32 truncate">{tx.packageName}</td>
                                    <td className="px-4 py-3 font-semibold text-sky-ink tabular-nums whitespace-nowrap">{fmtVnd(tx.amount)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`sky-badge ${st?.cls ?? "sky-badge-neutral"} inline-flex items-center gap-1`}>
                                            {st?.icon}{tx.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-sky-ink-3 tabular-nums whitespace-nowrap">{fmtDateTime(tx.createdAt)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )}
    </SkyCard>
);

// ── CRITICAL SYSTEM LOGS FEED ────────────────────────────────────────────────
// Rose is reserved for the genuinely destructive end (CRITICAL); WARNING takes
// peach so the two tiers are distinguishable at a glance without either reading
// as "fine".
const LOG_LEVEL_META: Record<string, { cls: string; rail: string }> = {
    CRITICAL: { cls: "sky-badge-danger", rail: "bg-sky-rose" },
    WARNING: { cls: "sky-badge-pending", rail: "bg-sky-peach" },
};

const CriticalLogsCard = ({
    loading, rows, onViewAll,
}: { loading: boolean; rows: CriticalSystemLogDto[]; onViewAll: () => void }) => (
    <SkyCard variant="admin" className="p-0 overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-4">
            <CardHead
                icon={<ScrollText className="w-4 h-4" />}
                title="Critical System & Abuse Logs"
                meta="Highest-severity events in range"
                action={
                    <SkyButton type="button" variant="ghost" size="sm" onClick={onViewAll} className="relative shrink-0">
                        View All Logs <ExternalLink className="w-3.5 h-3.5" />
                    </SkyButton>
                }
            />
        </div>
        {loading ? (
            <div className="divide-y divide-white/60">
                {Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)}
            </div>
        ) : rows.length === 0 ? (
            <p className="text-sm text-sky-ink-3 font-medium py-14 text-center px-6">
                Hệ thống vận hành mượt mà, không có cảnh báo.
            </p>
        ) : (
            <div className="divide-y divide-white/60">
                {rows.map(log => {
                    const lv = LOG_LEVEL_META[log.level];
                    return (
                        <div key={log.id} className="relative flex items-start gap-3 px-6 py-3.5 transition-colors hover:bg-white/45">
                            <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${lv?.rail ?? "bg-sky-ink/15"}`} aria-hidden="true" />
                            <span className={`sky-badge ${lv?.cls ?? "sky-badge-neutral"} shrink-0 mt-0.5`}>
                                {log.level}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-sky-ink leading-snug">{log.title}</p>
                                <p className="text-xs text-sky-ink-3 mt-0.5">
                                    {log.source} · {fmtDateTime(log.createdAt)}
                                </p>
                            </div>
                        </div>
                    );
                })}
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
    // Faucet/sink is a direction axis, matched to the wallet ledger: value arriving
    // is teal, value leaving is rose. (Was green/red — §4.)
    const economyOptions: ApexOptions = {
        ...skyChartBase,
        chart: { ...skyChartBase.chart, height: 280, type: "bar" },
        colors: [SKY.teal, SKY.rose],
        plotOptions: { bar: { ...skyBarPlotOptions.bar, columnWidth: "42%" } },
        legend: { ...skyChartBase.legend, position: "top", horizontalAlign: "left" },
        xaxis: { ...skyChartBase.xaxis, categories: economyByCurrency.map(c => c?.currency ?? "") },
        yaxis: { ...skyChartBase.yaxis, labels: { ...skyChartBase.yaxis.labels, formatter: (v: number) => (v ?? 0).toLocaleString() } },
    };
    const economySeries = [
        { name: "Earned", data: economyByCurrency.map(c => c?.earned ?? 0) },
        { name: "Spent", data: economyByCurrency.map(c => c?.spent ?? 0) },
    ];

    // ── Quest completion chart ───────────────────────────────────────────────
    // Violet: quests are game content, not an operational success metric.
    const questOptions: ApexOptions = {
        ...skyChartBase,
        chart: { ...skyChartBase.chart, height: 280, type: "bar" },
        colors: [SKY.violet],
        plotOptions: { bar: { ...skyBarPlotOptions.bar, columnWidth: "42%" } },
        dataLabels: {
            enabled: true,
            formatter: (v: number) => `${(v ?? 0).toFixed(0)}%`,
            offsetY: -20,
            style: { fontFamily: "Bricolage Grotesque, sans-serif", fontSize: "11px", fontWeight: 600, colors: [SKY.violetDeep] },
        },
        xaxis: { ...skyChartBase.xaxis, categories: questByType.map(e => e?.questType ?? "Unknown") },
        yaxis: { ...skyChartBase.yaxis, max: 100, labels: { ...skyChartBase.yaxis.labels, formatter: (v: number) => `${v ?? 0}%` } },
    };
    // BE completionRate is a 0–1 fraction (Math.Round(Approved/Total, 4)) — scale to a percentage.
    const questSeries = [{ name: "Completion Rate", data: questByType.map(e => Math.round((e?.completionRate ?? 0) * 100)) }];

    // Nothing has loaded yet on this mount/range change — show a full-page skeleton
    // instead of partially-empty cards flashing in. Mirrors the bento spans below so
    // the layout does not reflow when data lands.
    const isInitialLoading = loading && !summary;
    if (isInitialLoading) {
        return (
            <>
                <PageMeta title="HabitEvolve Admin Dashboard" description="Loading dashboard…" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5">
                    <div className="lg:col-span-3"><MetricSkeleton /></div>
                    <div className="lg:col-span-3"><MetricSkeleton /></div>
                    <div className="lg:col-span-3"><MetricSkeleton /></div>
                    <div className="lg:col-span-3"><MetricSkeleton /></div>
                    <div className="sm:col-span-2 lg:col-span-6"><MetricSkeleton /></div>
                    <div className="sm:col-span-2 lg:col-span-6"><MetricSkeleton /></div>
                    <div className="sm:col-span-2 lg:col-span-7"><SkyCard variant="admin"><ChartSkeleton /></SkyCard></div>
                    <div className="sm:col-span-2 lg:col-span-5"><SkyCard variant="admin"><ChartSkeleton /></SkyCard></div>
                    <div className="sm:col-span-2 lg:col-span-7"><SkyCard variant="admin"><ChartSkeleton height={220} /></SkyCard></div>
                    <div className="sm:col-span-2 lg:col-span-5"><SkyCard variant="admin"><ChartSkeleton height={220} /></SkyCard></div>
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
            <PageHeader
                className="mb-7 items-end"
                icon={<LayoutDashboard className="w-6 h-6" strokeWidth={2.1} aria-hidden="true" />}
                tone="deep"
                eyebrow="Admin console"
                title="Dashboard"
                description="Economy, quest completion, and user activity for the selected range"
                actions={
                    <>
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
                    </>
                }
            />

            {error && (
                <div className="relative overflow-hidden mb-7 p-4 rounded-sky-card sky-glass-admin flex items-center justify-between gap-4">
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" aria-hidden="true" />
                    <span className="relative inline-flex items-center gap-2 text-sm font-semibold text-sky-rose-deep">
                        <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" /> {error}
                    </span>
                    <button type="button" onClick={fetchSummary} className="relative shrink-0 text-sm font-semibold text-sky-deep underline underline-offset-2 hover:text-sky-abyss transition-colors">Retry</button>
                </div>
            )}

            {/* Bento — one 12-column grid so the metric strip, the action queues,
                the charts and the feeds all share a rhythm. Deliberately uneven
                7/5 chart split: the economy chart carries more series. */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5 sky-stagger">
                {/* Row 1 — Metrics Overview */}
                <div className="lg:col-span-3">
                    {loading && !userActivity ? <MetricSkeleton /> : (
                        <MetricCard
                            label="Active Users"
                            value={(userActivity?.activeUsers ?? 0).toLocaleString()}
                            rail="bg-sky-deep"
                            chip="bg-sky-deep/12 text-sky-deep"
                            icon={<Users className="w-[1.05rem] h-[1.05rem]" aria-hidden="true" />}
                            sub={<span className="text-sky-ink-3">In selected range</span>}
                        />
                    )}
                </div>

                <div className="lg:col-span-3">
                    {loading && !userActivity ? <MetricSkeleton /> : (
                        <MetricCard
                            label="New Signups"
                            value={(userActivity?.newUsers ?? 0).toLocaleString()}
                            rail="bg-sky-deep-lo"
                            chip="bg-sky-deep-lo/14 text-sky-deep"
                            icon={<UserPlus className="w-[1.05rem] h-[1.05rem]" aria-hidden="true" />}
                            sub={<span className="text-sky-ink-3">In selected range</span>}
                        />
                    )}
                </div>

                <div className="lg:col-span-3">
                    {loading && !summary ? <MetricSkeleton /> : (
                        <SkyCard variant="admin" className="sky-lift flex flex-col justify-between overflow-hidden">
                            <span className="absolute inset-x-0 top-0 h-[3px] bg-sky-peach" aria-hidden="true" />
                            <div className="relative flex items-start justify-between gap-3">
                                <span className={eyebrow}>Net Economy (In − Out)</span>
                                <span className="inline-grid place-items-center w-9 h-9 shrink-0 rounded-sky-chip bg-sky-peach/16 text-sky-peach-deep">
                                    <Coins className="w-[1.05rem] h-[1.05rem]" aria-hidden="true" />
                                </span>
                            </div>
                            <div className="relative mt-5 space-y-1.5">
                                <CurrencyDelta label="Gold" delta={netGold} />
                                <CurrencyDelta label="Gems" delta={netGems} />
                                <CurrencyDelta label="M-Gold" delta={netMGold} />
                            </div>
                        </SkyCard>
                    )}
                </div>

                <div className="lg:col-span-3">
                    {loading && !summary ? <MetricSkeleton /> : (
                        <MetricCard
                            label="Total Active Mentors"
                            value={(summary?.totalActiveMentors ?? 0).toLocaleString()}
                            rail="bg-sky-violet"
                            chip="bg-sky-violet/14 text-sky-violet-deep"
                            icon={<GraduationCap className="w-[1.05rem] h-[1.05rem]" aria-hidden="true" />}
                            sub={<span className="text-sky-ink-3">Role = MENTOR, Status = Active</span>}
                        />
                    )}
                </div>

                {/* Row 2 — Action Required */}
                {loading && !summary ? (
                    <>
                        <div className="sm:col-span-2 lg:col-span-6"><MetricSkeleton /></div>
                        <div className="sm:col-span-2 lg:col-span-6"><MetricSkeleton /></div>
                    </>
                ) : (
                    <>
                        <div className="sm:col-span-2 lg:col-span-6">
                            <ActionRequiredCard
                                icon={<ShieldAlert className="w-5 h-5" />}
                                label="Pending Court Cases"
                                hint="Community proof disputes awaiting admin override"
                                count={summary?.actionRequired.pendingCourtCases ?? 0}
                                onClick={() => navigate("/court-management")}
                            />
                        </div>
                        <div className="sm:col-span-2 lg:col-span-6">
                            <ActionRequiredCard
                                icon={<Swords className="w-5 h-5" />}
                                label="Missing Weekly Bosses"
                                hint="Active parties with no boss scheduled for next week"
                                count={summary?.actionRequired.missingWeeklyBosses ?? 0}
                                onClick={() => navigate("/boss-management")}
                            />
                        </div>
                    </>
                )}

                {/* Row 3 — Charts */}
                <div className="sm:col-span-2 lg:col-span-7">
                    <SkyCard variant="admin" className="h-full">
                        <CardHead
                            icon={<Coins className="w-4 h-4" />}
                            title="Economy — Earned vs Spent"
                            meta={`${range.startDate} → ${range.endDate}`}
                        />
                        <div className="relative mt-5">
                            {loading && !summary ? <ChartSkeleton /> : economyByCurrency.length > 0 ? (
                                <div className="max-w-full overflow-x-auto">
                                    {/* pl matches the CardHead icon (w-8) + gap-2.5 above, so the chart's own
                                        legend/bars line up under the title text instead of sitting flush left. */}
                                    <div className="min-w-100 pl-10.5">
                                        <Chart options={economyOptions} series={economySeries} type="bar" height={280} />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-sky-ink-3 font-medium py-16 text-center">No economy data for this range.</p>
                            )}
                        </div>
                    </SkyCard>
                </div>

                <div className="sm:col-span-2 lg:col-span-5">
                    <SkyCard variant="admin" className="h-full">
                        <CardHead
                            icon={<Swords className="w-4 h-4" />}
                            title="Quest Completion Rate"
                            meta="by Quest Type"
                        />
                        <div className="relative mt-5">
                            {loading && !summary ? <ChartSkeleton /> : questByType.length > 0 ? (
                                <div className="max-w-full overflow-x-auto">
                                    <div className="min-w-100 pl-10.5">
                                        <Chart options={questOptions} series={questSeries} type="bar" height={280} />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-sky-ink-3 font-medium py-16 text-center">No quest completion data for this range.</p>
                            )}
                        </div>
                    </SkyCard>
                </div>

                {/* Row 4 — Live Feeds */}
                <div className="sm:col-span-2 lg:col-span-7">
                    <RecentTransactionsCard loading={loading && !summary} rows={summary?.recentTransactions ?? []} />
                </div>
                <div className="sm:col-span-2 lg:col-span-5">
                    <CriticalLogsCard
                        loading={loading && !summary}
                        rows={summary?.criticalSystemLogs ?? []}
                        onViewAll={() => navigate("/admin/audit-log")}
                    />
                </div>
            </section>
        </>
    );
}

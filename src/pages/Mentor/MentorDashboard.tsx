import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
    ShieldAlert, HeartPulse, CheckCircle2, UserPlus, ChevronRight,
    Trophy, Swords, Camera, TrendingDown, Sparkles, Users, RefreshCw,
    Layers, Scroll, Wallet as WalletIcon,
} from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import { useAuth } from "../../context/AuthContext";
import { mentorDashboardApi } from "../../api/mentorDashboardApi";
import SkyCard from "../../components/ui/card/SkyCard";
import SkyButton from "../../components/ui/button/SkyButton";
import type {
    MentorDashboardSummaryDto,
    PartyRankingDto,
    UpcomingBossFightDto,
    MemberActivityDto,
    MemberActivityActionType,
} from "../../types/mentorDashboard.types";

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
// Same "Guild Command Center" neo-brutalism accent system as MentorHeader.tsx —
// layered on top of the Sky-Pastel base (SkyCard variant="mentor"), reserved for
// game-flavored widgets (resource badges, alerts, HP bars), not the whole page.
const inkBorder = "border-game-outline dark:border-brand-300";
const shadowSm = "shadow-[2px_2px_0_0_var(--color-game-outline)] dark:shadow-[2px_2px_0_0_var(--color-brand-300)]";
const shadowMd = "shadow-[3px_3px_0_0_var(--color-game-outline)] dark:shadow-[3px_3px_0_0_var(--color-brand-300)]";
const hazardStripe = { backgroundImage: "repeating-linear-gradient(45deg, #f0ac72 0 10px, #24344D 10px 20px)" };

// ── HELPERS ───────────────────────────────────────────────────────────────────
const errMsg = (e: unknown) =>
    (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

// ── SKELETONS ─────────────────────────────────────────────────────────────────
const SkeletonLine = ({ className = "" }: { className?: string }) => (
    <div className={`animate-pulse bg-gray-200 rounded-md ${className}`} />
);
const CardSkeleton = ({ className = "" }: { className?: string }) => (
    <SkyCard variant="mentor" className={className}>
        <SkeletonLine className="h-4 w-1/3 mb-4" />
        <SkeletonLine className="h-8 w-2/3" />
    </SkyCard>
);
const RowSkeleton = () => (
    <div className="flex items-center gap-3 py-3">
        <SkeletonLine className="h-9 w-9 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
            <SkeletonLine className="h-3.5 w-2/3" />
            <SkeletonLine className="h-3 w-1/3" />
        </div>
    </div>
);

// ── RESOURCE BADGE (Gems / M-Gold) ───────────────────────────────────────────
const ResourceBadge = ({ icon, value, label }: { icon: string; value: number; label: string }) => (
    <div className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border-[3px] ${inkBorder} ${shadowSm}`}>
        <img src={icon} alt="" className="w-5 h-5 object-contain" />
        <span className="text-sm font-black text-sky-ink">{value.toLocaleString()}</span>
        <span className="text-[10px] font-bold text-sky-ink-3 uppercase hidden sm:inline">{label}</span>
    </div>
);

// ── URGENT ALERTS CARD ────────────────────────────────────────────────────────
const UrgentAlertsCard = ({
    playersLosingStreak, partiesLowSharedHp, onClick,
}: { playersLosingStreak: number; partiesLowSharedHp: number; onClick: () => void }) => {
    const hasAlerts = playersLosingStreak > 0 || partiesLowSharedHp > 0;
    return (
        <SkyCard
            variant="mentor"
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onClick(); }}
            className={`p-0 overflow-hidden cursor-pointer transition-transform hover:scale-[1.01] ${hasAlerts ? `border-[3px] ${inkBorder} ${shadowMd}` : ""}`}
        >
            {hasAlerts && <div className="h-2 w-full" style={hazardStripe} />}
            <div className="p-5 flex items-center gap-4">
                <div className={`p-2.5 rounded-lg shrink-0 ${hasAlerts ? "bg-error-100 text-error-600" : "bg-success-100 text-success-600"}`}>
                    <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-sky-ink text-sm">Urgent Alerts</p>
                    <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-sky-ink-2 flex items-center gap-1">
                            <TrendingDown className="w-3.5 h-3.5 text-error-500" />
                            <span className="font-black text-sky-ink">{playersLosingStreak}</span> streak risk
                        </span>
                        <span className="text-xs text-sky-ink-2 flex items-center gap-1">
                            <HeartPulse className="w-3.5 h-3.5 text-error-500" />
                            <span className="font-black text-sky-ink">{partiesLowSharedHp}</span> low HP
                        </span>
                    </div>
                </div>
                <ChevronRight className="w-4 h-4 text-sky-ink-3 shrink-0" />
            </div>
        </SkyCard>
    );
};

// ── PENDING ACTION PILL ───────────────────────────────────────────────────────
const PendingActionPill = ({
    icon, label, count, onClick,
}: { icon: React.ReactNode; label: string; count: number; onClick: () => void }) => (
    <button
        type="button"
        onClick={onClick}
        className={`relative flex-1 flex items-center gap-3 px-4 py-4 rounded-2xl bg-white border-[3px] ${inkBorder} ${shadowSm} hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-left`}
    >
        <div className="p-2 rounded-lg bg-warning-100 text-warning-700 shrink-0">{icon}</div>
        <span className="font-bold text-sm text-sky-ink flex-1">{label}</span>
        {count > 0 && (
            <span className={`inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-error-500 text-white text-xs font-black border-2 ${inkBorder}`}>
                {count}
            </span>
        )}
    </button>
);

// ── PARTY RANKING ROW ─────────────────────────────────────────────────────────
const RANK_MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

const PartyRankingRow = ({ ranking }: { ranking: PartyRankingDto }) => {
    const hasHp = ranking.maxSharedHp > 0;
    const pct = hasHp ? Math.max(0, Math.min(100, (ranking.sharedHp / ranking.maxSharedHp) * 100)) : 0;
    return (
        <div className="flex items-center gap-3 py-3">
            <span className="w-7 text-center text-lg shrink-0">{RANK_MEDAL[ranking.rank] ?? `#${ranking.rank}`}</span>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm text-sky-ink truncate">{ranking.partyName}</p>
                    <span className="text-xs font-black text-purple-600 shrink-0">{ranking.totalExp.toLocaleString()} EXP</span>
                </div>
                {hasHp ? (
                    <div className="mt-1.5 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${pct < 30 ? "bg-error-500" : "bg-success-500"}`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                ) : (
                    <p className="text-[10px] text-sky-ink-3 mt-1">No active raid this week</p>
                )}
            </div>
        </div>
    );
};

// ── UPCOMING BOSS FIGHT CARD ──────────────────────────────────────────────────
const BossFightCard = ({ fight }: { fight: UpcomingBossFightDto }) => (
    <div className={`flex items-center gap-3 p-3 rounded-2xl bg-purple-50 border-[3px] ${inkBorder}`}>
        <div className="p-2 rounded-lg bg-purple-200 text-purple-800 shrink-0">
            <Swords className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-sky-ink truncate">{fight.bossName}</p>
            <p className="text-xs text-sky-ink-3">{fight.partyName} · {fight.bossHp.toLocaleString()} HP</p>
        </div>
        <span className="text-xs font-black text-purple-700 shrink-0">{fmtDate(fight.startAt)}</span>
    </div>
);

// ── ACTIVITY FEED ROW ─────────────────────────────────────────────────────────
const ACTIVITY_CFG: Record<MemberActivityActionType, { icon: React.ReactNode; cls: string }> = {
    PROOF_SUBMITTED: { icon: <Camera className="w-3.5 h-3.5" />, cls: "bg-blue-100 text-blue-700" },
    QUEST_COMPLETED: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, cls: "bg-success-100 text-success-700" },
    LEVEL_UP: { icon: <Sparkles className="w-3.5 h-3.5" />, cls: "bg-purple-100 text-purple-700" },
    HP_DEDUCTED: { icon: <TrendingDown className="w-3.5 h-3.5" />, cls: "bg-error-100 text-error-700" },
};

const ActivityRow = ({ activity }: { activity: MemberActivityDto }) => {
    const cfg = ACTIVITY_CFG[activity.actionType] ?? ACTIVITY_CFG.PROOF_SUBMITTED;
    return (
        <div className="flex items-start gap-3 py-3">
            <div className={`p-1.5 rounded-full shrink-0 mt-0.5 ${cfg.cls}`}>{cfg.icon}</div>
            <div className="min-w-0 flex-1">
                <p className="text-sm text-sky-ink leading-snug">
                    <span className="font-bold">{activity.playerName}</span> — {activity.description}
                </p>
                <p className="text-xs text-sky-ink-3 mt-0.5">
                    {activity.partyName} · {new Date(activity.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
            </div>
        </div>
    );
};

// ── QUICK TOOLS GRID ──────────────────────────────────────────────────────────
const QUICK_TOOLS = [
    { labelKey: "mentor.dashboard.quickTools.parties", icon: <Users className="w-5 h-5" />, path: "/mentor/parties" },
    { labelKey: "mentor.dashboard.quickTools.createQuest", icon: <Scroll className="w-5 h-5" />, path: "/mentor/parties" },
    { labelKey: "mentor.dashboard.quickTools.bossVault", icon: <Layers className="w-5 h-5" />, path: "/mentor/parties" },
    { labelKey: "mentor.dashboard.quickTools.wallet", icon: <WalletIcon className="w-5 h-5" />, path: "/mentor/wallet" },
] as const;

// ── PAGE ──────────────────────────────────────────────────────────────────────
export default function MentorDashboard() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [summary, setSummary] = useState<MentorDashboardSummaryDto | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSummary = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await mentorDashboardApi.getSummary();
            if (res.success) setSummary(res.data ?? null);
            else setError(res.message || "Failed to load dashboard data.");
        } catch (err) {
            setError(errMsg(err) ?? "Network error fetching dashboard data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSummary(); }, [fetchSummary]);

    // First-ranked party is used as the deep-link target for "Review Proofs"/"Join Requests" —
    // both live per-party (no standalone /mentor/proofs route exists), so we jump straight to
    // that party's tab; with no parties yet, fall back to the party list.
    const firstPartyId = summary?.partyRankings[0]?.partyId;
    const goToProofs = () => navigate(firstPartyId ? `/mentor/parties/${firstPartyId}/proofs` : "/mentor/parties");
    const goToJoinRequests = () => navigate(firstPartyId ? `/mentor/parties/${firstPartyId}/overview` : "/mentor/parties");
    const goToAtRiskParties = () => navigate("/mentor/parties");

    const guildStatus = summary?.guildStatus;
    const urgentAlerts = summary?.urgentAlerts;
    const pendingActions = summary?.pendingActions;
    const resourceStash = summary?.resourceStash;
    const partyRankings = summary?.partyRankings ?? [];
    const upcomingBossFights = summary?.upcomingBossFights ?? [];
    const recentMemberActivities = summary?.recentMemberActivities ?? [];

    const allClear =
        (urgentAlerts?.playersLosingStreak ?? 0) === 0 &&
        (urgentAlerts?.partiesLowSharedHp ?? 0) === 0 &&
        (pendingActions?.pendingProofReviews ?? 0) === 0 &&
        (pendingActions?.pendingJoinRequests ?? 0) === 0;

    const isInitialLoading = loading && !summary;

    return (
        <>
            <PageMeta title="Mentor Dashboard — HabitEvolve" description="Your guild command centre" />

            {/* Header — Welcome + Resource Stash */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
                <div>
                    <div className="inline-flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 text-xs font-bold bg-mentor-active text-white rounded-full">
                            {t("mentor.dashboard.badge")}
                        </span>
                    </div>
                    <h1 className="text-sky-h1 font-extrabold text-sky-ink">
                        Chào mừng Quản trò {user?.username ?? ""} trở lại Sảnh chỉ huy!
                    </h1>
                    {guildStatus && (
                        <p className="text-sky-body text-sky-ink-2 mt-1">
                            Đang dẫn dắt <span className="font-bold text-sky-ink">{guildStatus.totalManagedParties}</span> Party với{" "}
                            <span className="font-bold text-sky-ink">{guildStatus.totalPartyMembers}</span> học viên
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {resourceStash && (
                        <>
                            <ResourceBadge icon="/icon/Currency/Diamond/64px/Purple Diamond 1st 64px.png" value={resourceStash.gemsBalance} label="Gems" />
                            <ResourceBadge icon="/icon/Currency/Coin/64px/Golden Coin 1st 64px.png" value={resourceStash.mGoldBalance} label="M-Gold" />
                        </>
                    )}
                    <SkyButton type="button" variant="secondary" size="icon" onClick={fetchSummary} disabled={loading} title="Refresh">
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </SkyButton>
                </div>
            </div>

            {error && (
                <div className="mb-8 p-4 bg-error-50 border border-error-200 rounded-sky-card font-bold text-error-700 text-sm flex items-center justify-between">
                    {error}
                    <button type="button" onClick={fetchSummary} className="underline underline-offset-2 shrink-0 ml-4">Retry</button>
                </div>
            )}

            {isInitialLoading ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                        <CardSkeleton className="sm:col-span-2" /><CardSkeleton />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <SkyCard variant="mentor">{Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)}</SkyCard>
                        <SkyCard variant="mentor">{Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)}</SkyCard>
                    </div>
                </>
            ) : (
                <>
                    {/* Section 1 — Urgent Alerts & Pending Actions */}
                    {allClear ? (
                        <SkyCard variant="mentor" className="mb-8 flex items-center gap-4">
                            <div className="p-3 rounded-full bg-success-100 text-success-600 shrink-0">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="font-bold text-sky-ink">Tất cả các tổ đội đều đang vận hành ổn định!</p>
                                <p className="text-sm text-sky-ink-2">Không có cảnh báo hay việc cần xử lý gấp lúc này.</p>
                            </div>
                        </SkyCard>
                    ) : (
                        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                            <div className="sm:col-span-1">
                                <UrgentAlertsCard
                                    playersLosingStreak={urgentAlerts?.playersLosingStreak ?? 0}
                                    partiesLowSharedHp={urgentAlerts?.partiesLowSharedHp ?? 0}
                                    onClick={goToAtRiskParties}
                                />
                            </div>
                            <div className="sm:col-span-2 flex flex-col sm:flex-row gap-3">
                                <PendingActionPill
                                    icon={<CheckCircle2 className="w-4 h-4" />}
                                    label="Duyệt Bằng Chứng"
                                    count={pendingActions?.pendingProofReviews ?? 0}
                                    onClick={goToProofs}
                                />
                                <PendingActionPill
                                    icon={<UserPlus className="w-4 h-4" />}
                                    label="Yêu Cầu Gia Nhập"
                                    count={pendingActions?.pendingJoinRequests ?? 0}
                                    onClick={goToJoinRequests}
                                />
                            </div>
                        </section>
                    )}

                    {/* Section 2 — Rankings/Boss Fights (left) + Activity Feed (right) */}
                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <div className="flex flex-col gap-6">
                            <SkyCard variant="mentor">
                                <div className="flex items-center gap-2 mb-3">
                                    <Trophy className="w-5 h-5 text-warning-600" />
                                    <h3 className="text-sky-h3 font-bold text-sky-ink">Guild Leaderboard</h3>
                                </div>
                                {partyRankings.length === 0 ? (
                                    <p className="text-sm text-sky-ink-3 py-6 text-center">Chưa có Party nào để xếp hạng.</p>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {partyRankings.map(r => <PartyRankingRow key={r.partyId} ranking={r} />)}
                                    </div>
                                )}
                            </SkyCard>

                            <SkyCard variant="mentor">
                                <div className="flex items-center gap-2 mb-3">
                                    <Swords className="w-5 h-5 text-purple-600" />
                                    <h3 className="text-sky-h3 font-bold text-sky-ink">Upcoming Boss Fights</h3>
                                </div>
                                {upcomingBossFights.length === 0 ? (
                                    <p className="text-sm text-sky-ink-3 py-6 text-center">Chưa có trận Boss nào sắp diễn ra.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {upcomingBossFights.map(f => <BossFightCard key={`${f.partyId}-${f.startAt}`} fight={f} />)}
                                    </div>
                                )}
                            </SkyCard>
                        </div>

                        <SkyCard variant="mentor" className="flex flex-col">
                            <h3 className="text-sky-h3 font-bold text-sky-ink mb-1">Adventure Log</h3>
                            <p className="text-xs text-sky-ink-3 mb-2">Hoạt động gần nhất của học viên</p>
                            {recentMemberActivities.length === 0 ? (
                                <p className="text-sm text-sky-ink-3 py-10 text-center flex-1">Chưa có hoạt động nào gần đây.</p>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {recentMemberActivities.map(a => <ActivityRow key={a.id} activity={a} />)}
                                </div>
                            )}
                        </SkyCard>
                    </section>


                </>
            )}
        </>
    );
}

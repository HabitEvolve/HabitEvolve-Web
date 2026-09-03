import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
    ShieldAlert, HeartPulse, CheckCircle2, UserPlus, ChevronRight,
    Trophy, Swords, Camera, TrendingDown, Sparkles, RefreshCw,
    Gem, Coins, AlertTriangle, CalendarClock, Activity,
} from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import PageHeader from "../../components/common/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { mentorDashboardApi } from "../../api/mentorDashboardApi";
import mentorApi from "../../api/mentorApi";
import partyMentorApi from "../../api/mentorPartyApi";
import SkyCard from "../../components/ui/card/SkyCard";
import SkyButton from "../../components/ui/button/SkyButton";
import { SkyModal, Spinner } from "./PartyWorkspace/sharedSky";
import type {
    MentorDashboardSummaryDto,
    PartyRankingDto,
    UpcomingBossFightDto,
    MemberActivityDto,
    MemberActivityActionType,
    LosingStreakPlayerDto,
} from "../../types/mentorDashboard.types";
import type { JoinRequestItem } from "../../types/api.types";

// ── SHARED ATOMS ──────────────────────────────────────────────────────────────
// The mentor portal keeps its violet identity, but the chrome is the same glass
// as the admin console — the old neo-brutalism ink borders and hard offset
// shadows are gone, since this is an operational screen, not a game surface.
const eyebrow = "text-[10px] font-semibold text-sky-ink-3 uppercase tracking-[0.14em]";
const sectionTitle = "font-display text-base font-semibold text-sky-ink";

// ── HELPERS ───────────────────────────────────────────────────────────────────
const errMsg = (e: unknown) =>
    (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

// ── SKELETONS ─────────────────────────────────────────────────────────────────
const SkeletonLine = ({ className = "" }: { className?: string }) => (
    <div className={`animate-pulse bg-sky-ink/8 rounded-sky-chip ${className}`} />
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
const ResourceBadge = ({ icon, value, label, tint }: {
    icon: React.ReactNode; value: number; label: string; tint: string;
}) => (
    <div className="sky-glass-chip inline-flex items-center gap-2 pl-2 pr-3.5 py-1.5 rounded-full">
        <span className={`grid place-items-center w-7 h-7 rounded-full shrink-0 ${tint}`}>{icon}</span>
        <span className="font-display text-sm font-semibold tabular-nums text-sky-ink">{value.toLocaleString()}</span>
        <span className={`${eyebrow} hidden sm:inline`}>{label}</span>
    </div>
);

// ── URGENT ALERTS CARD ────────────────────────────────────────────────────────
const UrgentAlertsCard = ({
    playersLosingStreak, partiesLowSharedHp, onClick,
}: { playersLosingStreak: number; partiesLowSharedHp: number; onClick: () => void }) => {
    const { t } = useTranslation();
    const hasAlerts = playersLosingStreak > 0 || partiesLowSharedHp > 0;
    return (
        <SkyCard
            variant="mentor"
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onClick(); }}
            className="group sky-lift relative p-0 overflow-hidden cursor-pointer h-full"
        >
            {/* A live alert gets a warm rail plus a tinted glyph — never colour alone.
                Peach, not rose: these are things to attend to, not failures. */}
            <span className={`absolute inset-x-0 top-0 h-1 ${hasAlerts ? "bg-linear-to-r from-sky-peach to-sky-peach-deep" : "bg-sky-teal/50"}`} />
            <div className="relative p-5 flex items-center gap-4 h-full">
                <span className={`grid place-items-center w-11 h-11 rounded-sky-md shrink-0 ${hasAlerts ? "bg-sky-peach/20 text-sky-peach-deep" : "bg-sky-teal-bg text-sky-teal"}`}>
                    <ShieldAlert className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                    <p className={eyebrow}>{t("mentor.dashboard.summary.urgentAlertsTitle")}</p>
                    <div className="flex items-center gap-4 mt-1.5">
                        <span className="text-xs font-medium text-sky-ink-2 flex items-center gap-1.5">
                            <TrendingDown className="w-3.5 h-3.5 text-sky-peach-deep shrink-0" />
                            <span className="font-display text-base font-semibold tabular-nums text-sky-ink leading-none">{playersLosingStreak}</span> {t("mentor.dashboard.summary.streakRisk")}
                        </span>
                        <span className="text-xs font-medium text-sky-ink-2 flex items-center gap-1.5">
                            <HeartPulse className="w-3.5 h-3.5 text-sky-rose-deep shrink-0" />
                            <span className="font-display text-base font-semibold tabular-nums text-sky-ink leading-none">{partiesLowSharedHp}</span> {t("mentor.dashboard.summary.lowHp")}
                        </span>
                    </div>
                </div>
                <ChevronRight className="w-4 h-4 text-sky-ink-3 shrink-0 transition-transform group-hover:translate-x-0.5" />
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
        className="sky-glass sky-lift group relative flex-1 flex items-center gap-3 px-4 py-4 rounded-sky-card text-left"
    >
        <span className="relative grid place-items-center w-10 h-10 rounded-sky-md bg-sky-violet/12 text-sky-violet-deep shrink-0">{icon}</span>
        <span className="relative font-semibold text-sm text-sky-ink flex-1">{label}</span>
        {count > 0 && (
            <span className="relative inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-linear-to-b from-sky-peach to-sky-peach-deep text-white text-xs font-semibold tabular-nums shadow-[0_2px_6px_rgba(36,52,77,0.28)]">
                {count}
            </span>
        )}
        <ChevronRight className="relative w-4 h-4 text-sky-ink-3 shrink-0 transition-transform group-hover:translate-x-0.5" />
    </button>
);

// ── PARTY RANKING ROW ─────────────────────────────────────────────────────────
// Drawn medallions rather than emoji: gold reads peach, silver an ink wash,
// bronze violet. The ring weight carries the ranking as much as the hue does.
const MEDAL_CFG: Record<number, { ring: string; face: string }> = {
    1: { ring: "ring-sky-peach-deep/45", face: "bg-linear-to-b from-sky-peach/45 to-sky-peach/25 text-sky-peach-deep" },
    2: { ring: "ring-sky-ink/20", face: "bg-linear-to-b from-white/85 to-sky-ink/8 text-sky-ink-2" },
    3: { ring: "ring-sky-violet/35", face: "bg-linear-to-b from-sky-violet/22 to-sky-violet/10 text-sky-violet-deep" },
};
const RankMedal = ({ rank }: { rank: number }) => {
    const cfg = MEDAL_CFG[rank];
    if (!cfg) {
        return <span className="w-7 shrink-0 text-center text-xs font-semibold tabular-nums text-sky-ink-3">#{rank}</span>;
    }
    return (
        <span className={`grid place-items-center w-7 h-7 shrink-0 rounded-full ring-2 ${cfg.ring} ${cfg.face} font-display text-xs font-semibold tabular-nums`}>
            {rank}
        </span>
    );
};

const PartyRankingRow = ({ ranking }: { ranking: PartyRankingDto }) => {
    const { t } = useTranslation();
    const hasHp = ranking.maxSharedHp > 0;
    const pct = hasHp ? Math.max(0, Math.min(100, (ranking.sharedHp / ranking.maxSharedHp) * 100)) : 0;
    const critical = pct < 30;
    return (
        <div className="flex items-center gap-3 py-3">
            <RankMedal rank={ranking.rank} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm text-sky-ink truncate">{ranking.partyName}</p>
                    <span className="font-display text-xs font-semibold tabular-nums text-sky-violet-deep shrink-0">{ranking.totalExp.toLocaleString()} EXP</span>
                </div>
                {hasHp ? (
                    <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-sky-ink/10 rounded-full overflow-hidden">
                            {/* Healthy is teal, never green; critical shifts to rose AND
                                gains a numeric read-out so the state isn't colour-only. */}
                            <div
                                className={`h-full rounded-full transition-[width] duration-500 ${critical ? "bg-sky-rose" : "bg-sky-teal"}`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <span className={`text-[10px] font-semibold tabular-nums shrink-0 ${critical ? "text-sky-rose-deep" : "text-sky-ink-3"}`}>
                            {Math.round(pct)}%
                        </span>
                    </div>
                ) : (
                    <p className="text-[10px] font-medium text-sky-ink-3 mt-1">{t("mentor.dashboard.summary.noActiveRaid")}</p>
                )}
            </div>
        </div>
    );
};

// ── UPCOMING BOSS FIGHT CARD ──────────────────────────────────────────────────
const BossFightCard = ({ fight }: { fight: UpcomingBossFightDto }) => (
    <div className="sky-lift flex items-center gap-3 p-3 rounded-sky-md border border-white/70 bg-sky-violet/8">
        <span className="grid place-items-center w-9 h-9 rounded-sky-chip bg-sky-violet/18 text-sky-violet-deep shrink-0">
            <Swords className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-sky-ink truncate">{fight.bossName}</p>
            <p className="text-xs font-medium text-sky-ink-3 truncate">{fight.partyName} · <span className="tabular-nums">{fight.bossHp.toLocaleString()}</span> HP</p>
        </div>
        <span className="font-display text-xs font-semibold tabular-nums text-sky-violet-deep shrink-0">{fmtDate(fight.startAt)}</span>
    </div>
);

// ── ACTIVITY FEED ROW ─────────────────────────────────────────────────────────
// Activity type is a taxonomy: cool for routine submissions, teal for a
// completion, violet for a level-up, peach for an HP hit (a warm consequence,
// not an application error).
const ACTIVITY_CFG: Record<MemberActivityActionType, { icon: React.ReactNode; cls: string }> = {
    PROOF_SUBMITTED: { icon: <Camera className="w-3.5 h-3.5" />, cls: "bg-sky-deep/12 text-sky-deep" },
    QUEST_COMPLETED: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, cls: "bg-sky-teal-bg text-sky-teal" },
    LEVEL_UP: { icon: <Sparkles className="w-3.5 h-3.5" />, cls: "bg-sky-violet/14 text-sky-violet-deep" },
    HP_DEDUCTED: { icon: <TrendingDown className="w-3.5 h-3.5" />, cls: "bg-sky-peach/22 text-sky-peach-deep" },
};

const ActivityRow = ({ activity }: { activity: MemberActivityDto }) => {
    const cfg = ACTIVITY_CFG[activity.actionType] ?? ACTIVITY_CFG.PROOF_SUBMITTED;
    return (
        <div className="flex items-start gap-3 py-3">
            <span className={`grid place-items-center w-7 h-7 rounded-full shrink-0 mt-0.5 ${cfg.cls}`}>{cfg.icon}</span>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-sky-ink-2 leading-snug">
                    <span className="font-semibold text-sky-ink">{activity.playerName}</span> — {activity.description}
                </p>
                <p className="text-xs font-medium text-sky-ink-3 mt-0.5">
                    {activity.partyName} · <span className="tabular-nums">{new Date(activity.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </p>
            </div>
        </div>
    );
};

// ── EMPTY STATE ───────────────────────────────────────────────────────────────
const PanelEmpty = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <div className="flex flex-col items-center gap-2.5 py-9">
        <span className="grid place-items-center w-12 h-12 rounded-full bg-sky-violet/10 text-sky-violet-deep">{icon}</span>
        <p className="text-sm font-medium text-sky-ink-3">{label}</p>
    </div>
);

// ── ACTION MODALS ─────────────────────────────────────────────────────────────
// Shared row for every "pending item" modal below — clicking a row deep-links to
// the exact page that lets a mentor process that one item (never a guessed party).
const ModalRow = ({
    icon, iconCls, primary, secondary, meta, onClick,
}: {
    icon: React.ReactNode; iconCls: string; primary: string; secondary?: string; meta?: string; onClick: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        className="group w-full flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-sky-chip text-left hover:bg-sky-3/20 transition-colors duration-150"
    >
        <span className={`grid place-items-center w-9 h-9 rounded-full shrink-0 ${iconCls}`}>{icon}</span>
        <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-sky-ink truncate">{primary}</p>
            {secondary && <p className="text-xs font-medium text-sky-ink-3 truncate mt-0.5">{secondary}</p>}
        </div>
        {meta && <span className="text-[10px] font-semibold text-sky-ink-3 shrink-0 whitespace-nowrap">{meta}</span>}
        <ChevronRight className="w-4 h-4 text-sky-ink-3 shrink-0 transition-transform group-hover:translate-x-0.5" />
    </button>
);

const ModalLoading = () => (
    <div className="flex items-center justify-center gap-3 py-10 text-sky-ink-3">
        <Spinner size={20} />
    </div>
);

const ModalError = ({ message, onRetry }: { message: string; onRetry: () => void }) => {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm font-semibold text-sky-rose-deep">{message}</p>
            <button type="button" onClick={onRetry} className="text-sm font-semibold text-sky-deep underline underline-offset-2 hover:no-underline">
                {t("mentor.dashboard.summary.retry")}
            </button>
        </div>
    );
};

const fmtRelative = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

// ── Review Proofs modal ──
// One row per party = party name + how many proofs are still unreviewed there.
// Tapping a row deep-links to that party's proof-review page; the modal itself
// stays a summary, not a per-proof list.
type ProofPartyGroup = { partyId: number | null; label: string; count: number };

const ProofsModal = ({ onClose, onNavigate }: { onClose: () => void; onNavigate: (path: string) => void }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [groups, setGroups] = useState<ProofPartyGroup[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // partyId/partyName come straight off the proof DTO — no second
            // getMentorQuests() fetch to build a questId→party map.
            const res = await mentorApi.getProofQueue();
            const byParty = new Map<string, ProofPartyGroup>();
            for (const p of res.data ?? []) {
                const pid = p.partyId ?? null;
                const key = pid != null ? `p${pid}` : "none";
                const existing = byParty.get(key);
                if (existing) {
                    existing.count += 1;
                } else {
                    byParty.set(key, {
                        partyId: pid,
                        label: p.partyName
                            ?? (pid != null ? `Party #${pid}` : t("mentor.dashboard.summary.modalProofsNoParty")),
                        count: 1,
                    });
                }
            }
            setGroups([...byParty.values()].sort((a, b) => b.count - a.count));
        } catch {
            setError(t("mentor.dashboard.summary.modalLoadFailed"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => { load(); }, [load]);

    return (
        <SkyModal title={t("mentor.dashboard.summary.modalProofsTitle")} onClose={onClose}>
            {loading ? <ModalLoading /> : error ? <ModalError message={error} onRetry={load} /> : groups.length === 0 ? (
                <PanelEmpty icon={<Camera className="w-5 h-5" />} label={t("mentor.dashboard.summary.modalEmptyProofs")} />
            ) : (
                <div className="divide-y divide-sky-ink/8 max-h-[60vh] overflow-y-auto">
                    {groups.map((g) => {
                        const clickable = g.partyId != null;
                        return (
                            <button
                                key={g.partyId ?? "none"}
                                type="button"
                                disabled={!clickable}
                                onClick={() => clickable && onNavigate(`/mentor/parties/${g.partyId}/proofs`)}
                                className="group w-full flex items-center gap-3 py-3 px-2 -mx-2 rounded-sky-chip text-left transition-colors duration-150 enabled:hover:bg-sky-3/20 disabled:opacity-70"
                            >
                                <span className="grid place-items-center w-9 h-9 rounded-full shrink-0 bg-sky-deep/12 text-sky-deep">
                                    <Swords className="w-4 h-4" />
                                </span>
                                <p className="flex-1 min-w-0 text-sm font-semibold text-sky-ink truncate">{g.label}</p>
                                <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-sky-peach/22 text-sky-peach-deep text-xs font-semibold tabular-nums shrink-0">
                                    {g.count}
                                </span>
                                {clickable && (
                                    <ChevronRight className="w-4 h-4 text-sky-ink-3 shrink-0 transition-transform group-hover:translate-x-0.5" />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </SkyModal>
    );
};

// ── Join Requests modal ──
const JoinRequestsModal = ({ onClose, onNavigate }: { onClose: () => void; onNavigate: (path: string) => void }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rows, setRows] = useState<JoinRequestItem[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const partiesRes = await partyMentorApi.getMentorParties();
            const activeParties = (partiesRes.data ?? []).filter((p) => p.status === "Active");
            const results = await Promise.all(activeParties.map((p) => partyMentorApi.getJoinRequests(p.partyId)));
            setRows(results.flatMap((res) => res.data ?? []));
        } catch {
            setError(t("mentor.dashboard.summary.modalLoadFailed"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => { load(); }, [load]);

    return (
        <SkyModal title={t("mentor.dashboard.summary.modalJoinRequestsTitle")} onClose={onClose}>
            {loading ? <ModalLoading /> : error ? <ModalError message={error} onRetry={load} /> : rows.length === 0 ? (
                <PanelEmpty icon={<UserPlus className="w-5 h-5" />} label={t("mentor.dashboard.summary.modalEmptyJoinRequests")} />
            ) : (
                <div className="divide-y divide-sky-ink/8 max-h-[60vh] overflow-y-auto">
                    {rows.map((r) => (
                        <ModalRow
                            key={r.requestId}
                            icon={<UserPlus className="w-4 h-4" />}
                            iconCls="bg-sky-violet/14 text-sky-violet-deep"
                            primary={r.username}
                            secondary={r.partyName}
                            meta={fmtRelative(r.requestedAt)}
                            onClick={() => onNavigate(`/mentor/parties/${r.partyId}/overview`)}
                        />
                    ))}
                </div>
            )}
        </SkyModal>
    );
};

// ── Urgent Alerts modal ──
const UrgentAlertsModal = ({
    partyRankings, onClose, onNavigate,
}: { partyRankings: PartyRankingDto[]; onClose: () => void; onNavigate: (path: string) => void }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [streakPlayers, setStreakPlayers] = useState<LosingStreakPlayerDto[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await partyMentorApi.getLosingStreakPlayers();
            setStreakPlayers(res.data ?? []);
        } catch {
            setError(t("mentor.dashboard.summary.modalLoadFailed"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => { load(); }, [load]);

    const lowHpParties = partyRankings.filter((r) => r.maxSharedHp > 0 && r.sharedHp / r.maxSharedHp < 0.30);
    const isEmpty = !loading && !error && lowHpParties.length === 0 && streakPlayers.length === 0;

    return (
        <SkyModal title={t("mentor.dashboard.summary.modalUrgentAlertsTitle")} onClose={onClose}>
            {loading ? <ModalLoading /> : error ? <ModalError message={error} onRetry={load} /> : isEmpty ? (
                <PanelEmpty icon={<ShieldAlert className="w-5 h-5" />} label={t("mentor.dashboard.summary.modalEmptyAlerts")} />
            ) : (
                <div className="max-h-[60vh] overflow-y-auto space-y-5">
                    {lowHpParties.length > 0 && (
                        <div>
                            <p className={`${eyebrow} mb-1.5`}>{t("mentor.dashboard.summary.modalLowHpSection")}</p>
                            <div className="divide-y divide-sky-ink/8">
                                {lowHpParties.map((r) => (
                                    <ModalRow
                                        key={r.partyId}
                                        icon={<HeartPulse className="w-4 h-4" />}
                                        iconCls="bg-sky-rose/14 text-sky-rose-deep"
                                        primary={r.partyName}
                                        meta={`${Math.round((r.sharedHp / r.maxSharedHp) * 100)}%`}
                                        onClick={() => onNavigate(`/mentor/parties/${r.partyId}/rally`)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    {streakPlayers.length > 0 && (
                        <div>
                            <p className={`${eyebrow} mb-1.5`}>{t("mentor.dashboard.summary.modalStreakSection")}</p>
                            <div className="divide-y divide-sky-ink/8">
                                {streakPlayers.map((p) => (
                                    <ModalRow
                                        key={p.userId}
                                        icon={<TrendingDown className="w-4 h-4" />}
                                        iconCls="bg-sky-peach/22 text-sky-peach-deep"
                                        primary={p.username}
                                        secondary={p.partyName}
                                        meta={t("mentor.dashboard.summary.modalStreakDays", { count: p.currentStreak })}
                                        onClick={() => onNavigate(`/mentor/parties/${p.partyId}/overview`)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </SkyModal>
    );
};

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
            else setError(res.message || t("mentor.dashboard.summary.loadFailed"));
        } catch (err) {
            setError(errMsg(err) ?? t("mentor.dashboard.summary.networkError"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => { fetchSummary(); }, [fetchSummary]);

    // Each tile opens a modal listing the actual pending items — clicking a row navigates
    // straight to the party that item belongs to, instead of guessing via partyRankings[0].
    const [openModal, setOpenModal] = useState<"proofs" | "joinRequests" | "alerts" | null>(null);
    const closeModal = () => setOpenModal(null);
    const navigateAndClose = (path: string) => { closeModal(); navigate(path); };

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
            <PageMeta title={t("mentor.dashboard.summary.metaTitle")} description={t("mentor.dashboard.summary.metaDescription")} />

            {/* Header — Welcome + Resource Stash */}
            <PageHeader
                className="mb-8 items-start"
                icon={<Swords className="w-6 h-6" strokeWidth={2.1} aria-hidden="true" />}
                tone="violet"
                size="h1"
                eyebrow={<span className="sky-badge sky-badge-epic">{t("mentor.dashboard.badge")}</span>}
                title={t("mentor.dashboard.summary.welcomeTitle", { username: user?.username ?? "" })}
                description={guildStatus && t("mentor.dashboard.summary.welcomeDescription", {
                    parties: guildStatus.totalManagedParties,
                    members: guildStatus.totalPartyMembers,
                })}
                actions={
                    <>
                        {resourceStash && (
                            <>
                                <ResourceBadge
                                    icon={<Gem className="w-4 h-4" />}
                                    value={resourceStash.gemsBalance}
                                    label={t("mentor.dashboard.summary.gemsLabel")}
                                    tint="bg-sky-violet/18 text-sky-violet-deep"
                                />
                                <ResourceBadge
                                    icon={<Coins className="w-4 h-4" />}
                                    value={resourceStash.mGoldBalance}
                                    label={t("mentor.dashboard.summary.mGoldLabel")}
                                    tint="bg-sky-peach/25 text-sky-peach-deep"
                                />
                            </>
                        )}
                        <SkyButton type="button" variant="secondary" size="icon" onClick={fetchSummary} disabled={loading} title={t("mentor.dashboard.summary.refreshTitle")}>
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        </SkyButton>
                    </>
                }
            />

            {error && (
                <div className="relative overflow-hidden sky-glass mb-8 rounded-sky-card pl-5 pr-4 py-4 flex items-center justify-between gap-4">
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" />
                    <p className="relative flex items-center gap-2.5 text-sm font-semibold text-sky-rose-deep">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        {error}
                    </p>
                    <button type="button" onClick={fetchSummary} className="relative text-sm font-semibold text-sky-rose-deep underline underline-offset-2 shrink-0 hover:no-underline">{t("mentor.dashboard.summary.retry")}</button>
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
                        <SkyCard variant="mentor" className="relative mb-8 overflow-hidden flex items-center gap-4">
                            <span className="absolute inset-x-0 top-0 h-1 bg-sky-teal" />
                            <span className="relative grid place-items-center w-12 h-12 rounded-full bg-sky-teal-bg text-sky-teal shrink-0">
                                <CheckCircle2 className="w-6 h-6" />
                            </span>
                            <div className="relative">
                                <p className="font-display text-base font-semibold text-sky-ink">{t("mentor.dashboard.summary.allClearTitle")}</p>
                                <p className="text-sm font-medium text-sky-ink-2 mt-0.5">{t("mentor.dashboard.summary.allClearSubtitle")}</p>
                            </div>
                        </SkyCard>
                    ) : (
                        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                            <div className="sm:col-span-1">
                                <UrgentAlertsCard
                                    playersLosingStreak={urgentAlerts?.playersLosingStreak ?? 0}
                                    partiesLowSharedHp={urgentAlerts?.partiesLowSharedHp ?? 0}
                                    onClick={() => setOpenModal("alerts")}
                                />
                            </div>
                            <div className="sm:col-span-2 flex flex-col sm:flex-row gap-3">
                                <PendingActionPill
                                    icon={<CheckCircle2 className="w-4 h-4" />}
                                    label={t("mentor.dashboard.summary.reviewProofs")}
                                    count={pendingActions?.pendingProofReviews ?? 0}
                                    onClick={() => setOpenModal("proofs")}
                                />
                                <PendingActionPill
                                    icon={<UserPlus className="w-4 h-4" />}
                                    label={t("mentor.dashboard.summary.joinRequests")}
                                    count={pendingActions?.pendingJoinRequests ?? 0}
                                    onClick={() => setOpenModal("joinRequests")}
                                />
                            </div>
                        </section>
                    )}

                    {/* Section 2 — Rankings/Boss Fights (left) + Activity Feed (right) */}
                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <div className="flex flex-col gap-6">
                            <SkyCard variant="mentor">
                                <div className="relative flex items-center gap-2.5 mb-3">
                                    <span className="grid place-items-center w-8 h-8 rounded-sky-chip bg-sky-peach/20 text-sky-peach-deep shrink-0">
                                        <Trophy className="w-4 h-4" />
                                    </span>
                                    <h3 className={sectionTitle}>{t("mentor.dashboard.summary.guildLeaderboard")}</h3>
                                </div>
                                {partyRankings.length === 0 ? (
                                    <PanelEmpty icon={<Trophy className="w-5 h-5" />} label={t("mentor.dashboard.summary.noPartiesToRank")} />
                                ) : (
                                    <div className="relative divide-y divide-sky-ink/8">
                                        {partyRankings.map(r => <PartyRankingRow key={r.partyId} ranking={r} />)}
                                    </div>
                                )}
                            </SkyCard>

                            <SkyCard variant="mentor">
                                <div className="relative flex items-center gap-2.5 mb-3">
                                    <span className="grid place-items-center w-8 h-8 rounded-sky-chip bg-sky-violet/14 text-sky-violet-deep shrink-0">
                                        <Swords className="w-4 h-4" />
                                    </span>
                                    <h3 className={sectionTitle}>{t("mentor.dashboard.summary.upcomingBossFights")}</h3>
                                </div>
                                {upcomingBossFights.length === 0 ? (
                                    <PanelEmpty icon={<CalendarClock className="w-5 h-5" />} label={t("mentor.dashboard.summary.noUpcomingBossFights")} />
                                ) : (
                                    <div className="relative space-y-2">
                                        {upcomingBossFights.map(f => <BossFightCard key={`${f.partyId}-${f.startAt}`} fight={f} />)}
                                    </div>
                                )}
                            </SkyCard>
                        </div>

                        <SkyCard variant="mentor" className="flex flex-col">
                            <div className="relative mb-2">
                                <h3 className={sectionTitle}>{t("mentor.dashboard.summary.adventureLog")}</h3>
                                <p className="text-xs font-medium text-sky-ink-3 mt-0.5">{t("mentor.dashboard.summary.adventureLogSubtitle")}</p>
                            </div>
                            {recentMemberActivities.length === 0 ? (
                                <PanelEmpty icon={<Activity className="w-5 h-5" />} label={t("mentor.dashboard.summary.noRecentActivity")} />
                            ) : (
                                <div className="relative divide-y divide-sky-ink/8">
                                    {recentMemberActivities.map(a => <ActivityRow key={a.id} activity={a} />)}
                                </div>
                            )}
                        </SkyCard>
                    </section>
                </>
            )}

            {openModal === "proofs" && <ProofsModal onClose={closeModal} onNavigate={navigateAndClose} />}
            {openModal === "joinRequests" && <JoinRequestsModal onClose={closeModal} onNavigate={navigateAndClose} />}
            {openModal === "alerts" && (
                <UrgentAlertsModal partyRankings={partyRankings} onClose={closeModal} onNavigate={navigateAndClose} />
            )}
        </>
    );
}

import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";
import {
    Bot, Circle, Lock, Swords, Coins, Trophy, Calendar, Clock, BookOpen,
    AlertTriangle, Check, CheckCircle2, ScrollText, Medal, Timer, Users, Skull,
} from "lucide-react";
import mentorApi from "../../../api/mentorApi";
import { useAlert } from "../../../context/AlertContext";
import SkyCard from "../../../components/ui/card/SkyCard";
import SkyButton from "../../../components/ui/button/SkyButton";
import { easeExpo, getMentorId, Spinner } from "./sharedSky";
import type { PartyWorkspaceContext } from "./PartyWorkspace";
import type {
    BossTemplateDto,
    BossModeConfigDto,
    ActiveSubscriptionDto,
    WeeklyBossStatusDto,
    WeeklyBossRegisterResultDto,
    WeeklyChestDto,
    SharedHpDto,
    RaidActivityDto,
    RaidHistoryDto,
    BossMode,
    MentorTier,
} from "../../../types/mentor.types";

// Pixel-art game assets are kept only where they render at 36px or larger —
// below that they turn to mush and clash with the lucide line vocabulary used
// for every other affordance on the screen.
const SKULL_ART = "/icon/Player/Skull/64px/Skull 1st 64px.png";
const CHEST_ART = "/icon/Item/Chest/64px/Chest 1st 64px.png";

const eyebrow = "text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3";
const metaChip = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sky-chip bg-white/62 ring-1 ring-white/75 text-xs font-semibold text-sky-ink-2";
const tile = "rounded-sky-chip bg-white/58 ring-1 ring-white/72 px-3 py-2.5 min-w-0";

// ── LIVE COUNTDOWN ────────────────────────────────────────────────────────────
const useNow = (intervalMs = 1000) => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);
    return now;
};

const CountdownTimer = ({ target }: { target: string | Date }) => {
    const { t } = useTranslation();
    const now = useNow(1000);
    const diff = new Date(target).getTime() - now;
    if (!Number.isFinite(diff) || diff <= 0) {
        return <span>{t("mentor.bossRaid.grimoire.countdownExpired")}</span>;
    }
    const d = Math.floor(diff / 86_400_000);
    const h = Math.floor((diff % 86_400_000) / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return <span>{t("mentor.bossRaid.grimoire.countdownFormat", { d, h, m })}</span>;
};

// ── STAT LINE (dotted leader — reads like a monster stat block) ───────────────
const StatLine = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-baseline gap-2 min-w-0">
        <dt className="shrink-0 text-sky-ink-2">{label}</dt>
        <span className="flex-1 border-b border-dotted border-sky-ink/20 -translate-y-0.5" aria-hidden="true" />
        <dd className="shrink-0 font-display font-semibold text-sky-ink tabular-nums">{value}</dd>
    </div>
);

// ── SEGMENTED "HAZARD" HP BAR ─────────────────────────────────────────────────
const SegmentedHpBar = ({
    current, max, label = "Boss HP", variant = "boss", size = "md", segments = 20,
}: {
    current: number; max: number; label?: string;
    variant?: "boss" | "shared"; size?: "md" | "lg"; segments?: number;
}) => {
    const pct = max > 0 ? Math.max(0, Math.min((current / max) * 100, 100)) : 0;
    const filled = Math.round((pct / 100) * segments);
    const heightCls = size === "lg" ? "h-7 sm:h-9" : "h-5";
    // Boss HP is the threat, so it burns warm (the damage family). Shared HP is
    // the party's own resource, so it stays cool blue — the "user" hue. Neither
    // borrows teal, which is reserved for success.
    const fillGrad = variant === "boss"
        ? "bg-linear-to-b from-sky-dmg to-sky-dmg-deep"
        : "bg-linear-to-b from-sky-deep-lo to-sky-deep";
    return (
        <div>
            <div className="flex justify-between items-baseline gap-3 mb-1.5">
                <span className={eyebrow}>{label}</span>
                {/* The percentage is spelled out so the bar is never the only cue. */}
                <span className={`font-display font-semibold text-sky-ink tabular-nums ${size === "lg" ? "text-base" : "text-xs"}`}>
                    {current.toLocaleString()}
                    <span className="text-sky-ink-3"> / {max.toLocaleString()}</span>
                    <span className="ml-2 text-sky-ink-2">{Math.round(pct)}%</span>
                </span>
            </div>
            <div className={`flex gap-0.75 ${heightCls} p-1 rounded-sky-chip bg-sky-ink/8 ring-1 ring-inset ring-white/55`}>
                {Array.from({ length: segments }).map((_, i) => (
                    <div
                        key={i}
                        className={`flex-1 rounded-xs transition-colors duration-300 ${i < filled ? fillGrad : "bg-white/45"}`}
                    />
                ))}
            </div>
        </div>
    );
};

const TIER_ORDER: Record<MentorTier, number> = { Free: 0, Basic: 1, Premium: 2 };
const CODE_TO_TIER: Record<string, MentorTier> = { FREE: "Free", BASIC: "Basic", PREMIUM: "Premium" };

// Risk is an ordered ramp on the party's own HP: calm → hot. Teal marks only
// the genuinely safe end and rose is held back for Critical, so the ramp never
// spends its loudest hue early.
const RISK_COLORS: Record<string, string> = {
    Low: "text-sky-teal",
    Medium: "text-sky-peach-deep",
    High: "text-sky-dmg-deep",
    Critical: "text-sky-rose-deep",
};

// Difficulty is a heat ramp, not a verdict — cool→warm rather than borrowing
// teal (success) or rose (destructive). Easy is the calm blue end, Hard the
// hottest ember.
const DIFF_META: Record<BossMode, { dot: string; badge: string; band: string; glow: string }> = {
    Easy:   { dot: "text-sky-deep",       badge: "bg-sky-deep/12 text-sky-deep",        band: "from-sky-deep-lo to-sky-deep",     glow: "bg-sky-1/60" },
    Normal: { dot: "text-sky-peach-deep", badge: "bg-sky-peach/22 text-sky-peach-deep", band: "from-sky-peach to-sky-peach-deep", glow: "bg-sky-peach/55" },
    Hard:   { dot: "text-sky-dmg-deep",   badge: "bg-sky-dmg/18 text-sky-dmg-deep",     band: "from-sky-dmg to-sky-dmg-deep",     glow: "bg-sky-dmg/55" },
};

// ── MONSTER GRIMOIRE CARD (TCG-style, one per difficulty mode) ───────────────
interface ModeCardProps {
    mode: BossModeConfigDto;
    enabled: boolean;
    hasAi: boolean;
    isSelected: boolean;
    summoning: boolean;
    onSummon: () => void;
}

const ModeCard = ({ mode, enabled, hasAi, isSelected, summoning, onSummon }: ModeCardProps) => {
    const { t } = useTranslation();
    const meta = DIFF_META[mode.mode];

    return (
        <SkyCard
            variant="mentor"
            className={[
                "group p-0 overflow-hidden h-full flex flex-col",
                "transition-all duration-300 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]",
                enabled
                    ? "motion-safe:hover:-translate-y-1 hover:shadow-[0_20px_44px_-20px_rgba(36,52,77,0.42)]"
                    : "opacity-60 saturate-50",
                isSelected ? "ring-2 ring-sky-deep" : "",
            ].join(" ")}
        >
            {/* Sigil band — the card's art box. The bloom sits behind the pixel
                sigil so it reads as lit from within rather than pasted on. */}
            <div className={`relative h-32 shrink-0 overflow-hidden bg-linear-to-br ${meta.band}`}>
                <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full blur-2xl ${meta.glow}`} aria-hidden="true" />
                <div className="absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-sky-ink/22 to-transparent" aria-hidden="true" />
                <img
                    src={SKULL_ART}
                    alt=""
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 object-contain drop-shadow-[0_8px_12px_rgba(36,52,77,0.42)] transition-transform duration-500 motion-safe:group-hover:scale-105"
                />
                {!enabled && (
                    <div className="absolute inset-0 bg-sky-ink/62 grid place-items-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sky-chip bg-white/16 ring-1 ring-white/30 text-white text-[11px] font-semibold">
                            <Lock className="w-3.5 h-3.5" /> {mode.minTier}+
                        </span>
                    </div>
                )}
            </div>

            <div className="relative flex flex-1 flex-col min-w-0 px-4 pb-4">
                {/* Difficulty ribbon overlaps the band so the card has a seam
                    instead of two stacked rectangles. */}
                <div className="relative -mt-4 mb-3 flex items-center justify-between gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sky-chip ring-1 ring-white/80 backdrop-blur-sm text-xs font-semibold shadow-sky-chip ${meta.badge}`}>
                        <Circle className={`w-2.5 h-2.5 fill-current ${meta.dot}`} aria-hidden="true" /> {mode.mode}
                    </span>
                    {hasAi && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-sky-chip bg-sky-violet/14 text-[10px] font-semibold text-sky-violet-deep">
                            <Bot className="w-3 h-3" /> AI
                        </span>
                    )}
                </div>

                <dl className="space-y-1.5 text-xs font-medium">
                    <StatLine label={t("mentor.bossRaid.bossHp")} value={mode.bossHp.toLocaleString()} />
                    <StatLine label={t("mentor.bossRaid.partySize")} value={`${mode.partyMin}–${mode.partyMax}`} />
                    <StatLine label={t("mentor.bossRaid.maxDmgPerQuest")} value={mode.maxDamagePerQuest} />
                </dl>

                <div className="flex items-center gap-2 mt-auto pt-3 border-t border-dashed border-sky-ink/15 min-w-0">
                    <span
                        className="inline-flex items-center gap-1 shrink-0 px-2 py-1 rounded-sky-chip bg-sky-peach/16 text-[11px] font-semibold text-sky-peach-deep tabular-nums"
                        title={t("mentor.bossRaid.grimoire.lootMGoldCap")}
                    >
                        <Coins className="w-3.5 h-3.5" /> {mode.mGoldRewardCapPerQuest}
                    </span>
                    <span
                        className="inline-flex items-center gap-1 min-w-0 px-2 py-1 rounded-sky-chip bg-sky-violet/12 text-[11px] font-semibold text-sky-violet-deep"
                        title={t("mentor.bossRaid.grimoire.lootRewardTier")}
                    >
                        <Trophy className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{mode.rewardTier}</span>
                    </span>
                </div>

                <SkyButton
                    type="button"
                    variant="primary"
                    onClick={onSummon}
                    disabled={!enabled || summoning}
                    className="w-full mt-3"
                >
                    {summoning ? (
                        <><Spinner size={14} /> {t("mentor.bossRaid.grimoire.summoning")}</>
                    ) : (
                        <><Swords className="w-4 h-4" /> {t("mentor.bossRaid.grimoire.summonBtn")}</>
                    )}
                </SkyButton>
            </div>
        </SkyCard>
    );
};

// ── TAB ───────────────────────────────────────────────────────────────────────
export default function BossRaidTab() {
    const { partyId } = useOutletContext<PartyWorkspaceContext>();
    const { t } = useTranslation();
    const alert = useAlert();
    const [boss, setBoss] = useState<BossTemplateDto | null>(null);
    const [activeSub, setActiveSub] = useState<ActiveSubscriptionDto | null>(null);
    const [selectedDifficulty, setSelectedDifficulty] = useState<BossMode | "">("");
    const [partyStatus, setPartyStatus] = useState<WeeklyBossStatusDto | null>(null);
    const [registerResult, setRegisterResult] = useState<WeeklyBossRegisterResultDto | null>(null);
    const [sharedHp, setSharedHp] = useState<SharedHpDto | null>(null);
    // All chests the party has earned, newest first — chests never expire, so a
    // party that has downed the Boss in several weeks holds several.
    const [chests, setChests] = useState<WeeklyChestDto[]>([]);
    const [activity, setActivity] = useState<RaidActivityDto[]>([]);
    // Every raid the party has run. Kept apart from partyStatus, which only ever
    // holds the current (or most recent) one.
    const [raidHistory, setRaidHistory] = useState<RaidHistoryDto[]>([]);
    const [view, setView] = useState<"current" | "history">("current");

    const [loading, setLoading] = useState(true);
    const [statusLoading, setStatusLoading] = useState(false);
    const [registerLoading, setRegisterLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load boss template + subscription (mentor-wide, not party-scoped)
    useEffect(() => {
        setLoading(true);
        Promise.all([
            mentorApi.getCurrentBoss(),
            mentorApi.getActiveSubscription(),
        ])
            .then(([bossRes, subRes]) => {
                if (bossRes.success) setBoss(bossRes.data ?? null);
                if (subRes.success) setActiveSub(subRes.data ?? null);
                if (!bossRes.success) setError(t("mentor.bossRaid.couldNotLoad"));
            })
            .catch((e) => setError(e?.response?.data?.message || t("mentor.bossRaid.failedToLoad")))
            .finally(() => setLoading(false));
    }, []);

    // Load this party's raid status + extra data
    const fetchPartyStatus = useCallback(async () => {
        setStatusLoading(true);
        setPartyStatus(null);
        setSharedHp(null);
        setChests([]);
        setActivity([]);
        setRaidHistory([]);

        // Chests and raid history describe the party across every week, so they are
        // fetched independently of the status call — that one 404s for a party with
        // no raid, and letting it short-circuit would blank the history tab.
        // Chests are also not gated on the current raid being Defeated: earlier
        // weeks' chests stay claimable while this week's Boss is still standing.
        const [chestRes, raidsRes] = await Promise.all([
            mentorApi.getWeeklyChests(partyId).catch(() => null),
            mentorApi.getPartyRaids(partyId).catch(() => null),
        ]);
        if (chestRes?.success) setChests(chestRes.data ?? []);
        if (raidsRes?.success) setRaidHistory(raidsRes.data ?? []);

        try {
            const res = await mentorApi.getPartyBossStatus(partyId);
            if (res.success && res.data) {
                const status = res.data;
                setPartyStatus(status);
                const [hpRes, actRes] = await Promise.all([
                    mentorApi.getSharedHp(status.raidId).catch(() => null),
                    mentorApi.getPartyActivity(partyId, status.raidId).catch(() => null),
                ]);
                if (hpRes?.success) setSharedHp(hpRes.data ?? null);
                if (actRes?.success) setActivity(actRes.data ?? []);
            }
        } catch {
            // 404 = no active raid — silent
        } finally {
            setStatusLoading(false);
        }
    }, [partyId]);

    useEffect(() => {
        fetchPartyStatus();
        setRegisterResult(null);
    }, [fetchPartyStatus]);

    // `diffOverride` is additive: existing callers keep working unchanged via
    // `selectedDifficulty`; the per-card Summon button passes its own difficulty
    // directly to avoid a stale-state round trip.
    const handleRegister = async (diffOverride?: BossMode) => {
        const diff = diffOverride ?? selectedDifficulty;
        if (!diff || !boss) return;
        setRegisterLoading(true);
        try {
            const res = await mentorApi.registerBossRaid({
                mentorUserId: getMentorId(),
                partyId,
                bossTemplateId: boss.bossTemplateId,
                difficulty: diff,
            });
            if (res.success && res.data) {
                setRegisterResult(res.data);
                alert.success(t("mentor.bossRaid.registrationSuccess"));
                fetchPartyStatus();
            } else {
                alert.error(res.message || t("mentor.bossRaid.registrationFailed"));
            }
        } catch (e: any) {
            alert.error(e?.response?.data?.message || t("mentor.bossRaid.unexpectedError"));
        } finally {
            setRegisterLoading(false);
        }
    };

    const handleSummon = (diff: BossMode) => {
        setSelectedDifficulty(diff);
        handleRegister(diff);
    };

    // ── Mode gating via ActiveSubscriptionDto ─────────────────────────────────
    // The package CSVs carry UPPERCASE tokens — EASY,NORMAL,HARD, enforced by
    // CreatePackageCommandValidator.ValidBossModes — while BossModeConfigDto.Mode
    // is the enum's ToString(), i.e. TitleCase ("Normal"). Normalise both sides to
    // upper case before comparing.
    //
    // Comparing them raw meant allowedModes.includes("Normal") against
    // ["EASY","NORMAL","HARD"], which is never true: every mode card was locked
    // and the Boss could not be registered at all, no matter the package. The
    // backend was never the obstacle — RegisterWeeklyBoss.PackageAllowsMode
    // compares with OrdinalIgnoreCase and would have accepted the request.
    const norm = (csv?: string): string[] =>
        csv ? csv.split(",").map((m) => m.trim().toUpperCase()).filter(Boolean) : [];

    const mentorTier: MentorTier = CODE_TO_TIER[activeSub?.package?.code ?? "FREE"] ?? "Free";
    const allowedModes: string[] = norm(activeSub?.package?.bossModes);
    const allowedProofTypes: string[] = norm(activeSub?.package?.proofTypes);
    const aiVerificationModes: string[] = norm(activeSub?.package?.aiVerificationBossModes);

    const isModeAllowed = (modeConfig: BossModeConfigDto): boolean => {
        const mentorTierLevel = TIER_ORDER[mentorTier] ?? 0;
        const requiredTierLevel = TIER_ORDER[modeConfig.minTier] ?? 0;
        return mentorTierLevel >= requiredTierLevel && allowedModes.includes(modeConfig.mode.toUpperCase());
    };

    // ── Difficulty filter over the Grimoire grid (client-side, purely visual) ─
    const [gridFilter, setGridFilter] = useState<BossMode | "all">("all");
    const visibleModes = boss?.modes?.filter((m) => gridFilter === "all" || m.mode === gridFilter) ?? [];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64"><Spinner size={40} /></div>
        );
    }

    // GetPartyBossStatus falls back to the party's most recent raid when none is
    // active, so a non-null partyStatus does NOT mean "registered for this week".
    // Once last week's Boss finished it kept returning that dead raid, the page
    // stayed on the encounter view, and the register grid never came back — the
    // party could not sign up for the new week at all.
    //
    // The BE keys one raid per (party, weekStart) and RegisterWeeklyBoss takes the
    // week from the schedule, so comparing week starts is the very test it runs.
    const currentWeekStart = boss?.activeWeekStart?.slice(0, 10);
    const registeredThisWeek =
        !!partyStatus && !!currentWeekStart && partyStatus.weekStartDate.slice(0, 10) === currentWeekStart;

    // A raid from an earlier week: worth showing as history, but it must never
    // stand in the way of registering the current week's Boss.
    const previousRaid = partyStatus && !registeredThisWeek ? partyStatus : null;

    // History = every week except the one on screen in the Current tab.
    const pastRaids = raidHistory.filter(
        (r) => !currentWeekStart || r.weekStartDate.slice(0, 10) !== currentWeekStart,
    );
    // Chests carry raidId, so each week's loot can sit with the raid that earned it.
    const chestByRaid = new Map(chests.map((c) => [c.raidId, c]));
    const currentChest = registeredThisWeek && partyStatus ? chestByRaid.get(partyStatus.raidId) : undefined;

    // Hue-for-hue translation of the original status ramp: teal replaces green,
    // peach replaces amber, rose replaces red. The wording carries the meaning.
    const statusBadge =
        partyStatus?.status === "Active" ? "sky-badge sky-badge-success"
        : partyStatus?.status === "Defeated" ? "sky-badge sky-badge-pending"
        : "sky-badge sky-badge-danger";

    return (
        <>
            {error && (
                <div className="relative mb-6 overflow-hidden rounded-sky-card sky-glass p-4 pl-5">
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" aria-hidden="true" />
                    <p className="relative inline-flex items-start gap-2 text-sm font-semibold text-sky-rose-deep">
                        <AlertTriangle className="w-4 h-4 mt-px shrink-0" aria-hidden="true" /> {error}
                    </p>
                </div>
            )}

            {/* ══════════════ VIEW SWITCH ══════════════ */}
            {/* Local state, not a route: this is a second reading of the same screen,
                not a sixth workspace destination. Sits above the !boss branch so past
                weeks stay reachable in a week with no Boss scheduled. */}
            <div className="mb-5 inline-flex gap-1.5 rounded-sky-chip bg-white/55 ring-1 ring-white/75 p-1">
                {([
                    ["current", t("mentor.bossRaid.view.current"), Skull],
                    ["history", t("mentor.bossRaid.view.history"), ScrollText],
                ] as const).map(([key, label, Icon]) => {
                    const isActive = view === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setView(key)}
                            aria-pressed={isActive}
                            className={[
                                "inline-flex items-center gap-2 px-4 py-2 rounded-sky-chip text-sm font-semibold",
                                `transition-all duration-200 ${easeExpo}`,
                                isActive
                                    ? "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-fill ring-1 ring-inset ring-white/25"
                                    : "text-sky-ink-2 hover:bg-white/70 hover:text-sky-ink",
                            ].join(" ")}
                        >
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-sky-ink-3"}`} strokeWidth={2.3} aria-hidden="true" />
                            {label}
                            {key === "history" && pastRaids.length > 0 && (
                                <span className={`ml-0.5 tabular-nums ${isActive ? "text-white/75" : "text-sky-ink-3"}`}>
                                    {pastRaids.length}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {view === "history" ? (
                /* ══════════════ HISTORY ══════════════ */
                pastRaids.length === 0 ? (
                    <div className="relative rounded-sky-card sky-glass p-10 text-center">
                        <span className="relative mx-auto mb-3 grid place-items-center w-14 h-14 rounded-full bg-sky-ink/6 ring-1 ring-sky-ink/12 text-sky-ink-3">
                            <ScrollText className="w-6 h-6" aria-hidden="true" />
                        </span>
                        <p className="relative font-display text-lg font-semibold text-sky-ink">{t("mentor.bossRaid.history.emptyTitle")}</p>
                        <p className="relative text-sm text-sky-ink-2 mt-1">{t("mentor.bossRaid.history.emptyHint")}</p>
                    </div>
                ) : (
                    <div className="space-y-5 sky-stagger">
                        {pastRaids.map((raid) => {
                            const chest = chestByRaid.get(raid.raidId);
                            const pending = chest ? Math.max(0, chest.eligibleMemberCount - chest.claimedCount) : 0;
                            return (
                                <div key={raid.raidId} className="relative overflow-hidden rounded-sky-card sky-glass p-5">
                                    {/* Quiet ink rail, not the damage rail of a live encounter:
                                        a finished week is a record, not a threat. */}
                                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-ink/22" aria-hidden="true" />

                                    <div className="relative flex flex-wrap items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2.5 flex-wrap">
                                                <h3 className="font-display text-xl font-semibold text-sky-ink wrap-break-word">{raid.bossName}</h3>
                                                <span className={
                                                    raid.status === "Defeated" ? "sky-badge sky-badge-success"
                                                    : raid.status === "Active" ? "sky-badge sky-badge-pending"
                                                    : "sky-badge sky-badge-danger"
                                                }>{raid.status}</span>
                                            </div>
                                            <p className="mt-1 text-xs font-medium text-sky-ink-3 tabular-nums">
                                                {new Date(raid.weekStartDate).toLocaleDateString()} → {new Date(raid.weekEndDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className={`${tile} shrink-0`}>
                                            <p className={`${eyebrow} truncate`}>{t("mentor.bossRaid.totalDamage")}</p>
                                            <p className="mt-1 font-display text-sm font-semibold text-sky-ink tabular-nums">
                                                {(raid.maxHp - raid.currentHp).toLocaleString()}
                                                <span className="text-sky-ink-3"> / {raid.maxHp.toLocaleString()}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="relative mt-4">
                                        <SegmentedHpBar current={raid.currentHp} max={raid.maxHp} label={t("mentor.bossRaid.bossHp")} variant="boss" segments={20} />
                                    </div>

                                    {/* The week's chest sits with the raid that earned it. */}
                                    {chest && (
                                        <div className="relative mt-4 overflow-hidden rounded-sky-md bg-sky-peach/12 ring-1 ring-sky-peach/28 p-4">
                                            <div className="flex items-center gap-3 mb-3">
                                                <img src={CHEST_ART} alt="" className="w-8 h-8 object-contain shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="font-display text-sm font-semibold text-sky-ink">{t("mentor.bossRaid.chest.title")}</p>
                                                    <p className="text-[11px] text-sky-ink-2 tabular-nums">
                                                        {t("mentor.bossRaid.chest.claimProgress", { claimed: chest.claimedCount, total: chest.eligibleMemberCount })}
                                                    </p>
                                                </div>
                                            </div>
                                            <dl className="space-y-1.5 text-xs font-medium">
                                                <StatLine label="Gold" value={<span className="text-sky-peach-deep">{chest.goldReward.toLocaleString()} <span className="font-normal text-sky-ink-3">/ {t("mentor.bossRaid.chest.perMember")}</span></span>} />
                                                <StatLine label="M-Gold" value={<span className="text-sky-peach-deep">{chest.mgoldReward.toLocaleString()} <span className="font-normal text-sky-ink-3">/ {t("mentor.bossRaid.chest.perMember")}</span></span>} />
                                                <StatLine label="Badge" value={<span className="inline-flex items-center gap-1"><Medal className="w-3.5 h-3.5 text-sky-peach-deep" aria-hidden="true" /> {chest.badge}</span>} />
                                            </dl>
                                            <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-sky-ink-2">
                                                {pending > 0
                                                    ? t("mentor.bossRaid.chest.pending", { n: pending })
                                                    : <><CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-sky-teal" aria-hidden="true" /> {t("mentor.bossRaid.chest.allClaimed")}</>}
                                            </p>
                                            <p className="mt-1.5 text-[11px] font-medium text-sky-ink-3 leading-relaxed">
                                                {t("mentor.bossRaid.chest.readonlyNote")}
                                            </p>
                                        </div>
                                    )}

                                    {/* A defeated Boss with no chest row is worth calling out —
                                        it means the reward never landed. */}
                                    {!chest && raid.status === "Defeated" && (
                                        <p className="relative mt-3 text-xs font-medium text-sky-ink-3">{t("mentor.bossRaid.history.noChestDefeated")}</p>
                                    )}
                                    {!chest && raid.status === "WipeOut" && (
                                        <p className="relative mt-3 text-xs font-medium text-sky-ink-3">{t("mentor.bossRaid.history.noChestWipe")}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            ) : !boss ? (
                <div className="relative mb-8 rounded-sky-card sky-glass p-10 text-center">
                    <span className="relative mx-auto mb-3 grid place-items-center w-14 h-14 rounded-full bg-sky-ink/6 ring-1 ring-sky-ink/12 text-sky-ink-3">
                        <Skull className="w-6 h-6" aria-hidden="true" />
                    </span>
                    <p className="relative font-display text-lg font-semibold text-sky-ink">{t("mentor.bossRaid.noActiveBoss")}</p>
                    <p className="relative text-sm text-sky-ink-2 mt-1">{t("mentor.bossRaid.checkBack")}</p>
                </div>
            ) : (
                <>
                    {/* ══════════════ THIS WEEK'S ANTAGONIST ══════════════ */}
                    <div className="relative mb-6 overflow-hidden rounded-sky-card sky-glass p-5 sm:p-6">
                        {/* Ember wash — the card leans into the damage family
                            without ever resorting to a flat red panel. */}
                        <div className="pointer-events-none absolute -top-20 -right-12 w-60 h-60 rounded-full bg-sky-dmg/12 blur-3xl" aria-hidden="true" />
                        <span className="absolute left-0 top-0 bottom-0 w-1 bg-linear-to-b from-sky-dmg to-sky-dmg-deep" aria-hidden="true" />

                        <div className="relative flex flex-wrap items-start justify-between gap-5">
                            <div className="min-w-0">
                                <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                                    <span className="grid place-items-center w-12 h-12 shrink-0 rounded-sky-chip bg-linear-to-b from-sky-dmg/22 to-sky-dmg/8 ring-1 ring-sky-dmg/25">
                                        <img src={SKULL_ART} alt="" className="w-9 h-9 object-contain" />
                                    </span>
                                    <h1 className="font-display text-2xl sm:text-3xl font-semibold text-sky-ink tracking-tight wrap-break-word">{boss.themeName}</h1>
                                    <span className={boss.status === "Published" ? "sky-badge sky-badge-success" : "sky-badge sky-badge-neutral"}>
                                        {boss.status}
                                    </span>
                                    {statusLoading && <Spinner size={16} />}
                                </div>
                                {boss.description && (
                                    <p className="text-sm text-sky-ink-2 font-medium mb-3 max-w-xl leading-relaxed wrap-break-word">{boss.description}</p>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    <span className={metaChip}>
                                        <Calendar className="w-3.5 h-3.5 text-sky-ink-3" aria-hidden="true" />
                                        <span className="tabular-nums">{boss.activeWeekStart} → {boss.activeWeekEnd}</span>
                                    </span>
                                    {boss.startTime && (
                                        <span className={metaChip}>
                                            <Clock className="w-3.5 h-3.5 text-sky-ink-3" aria-hidden="true" />
                                            <span className="tabular-nums">{boss.startTime} — {boss.endTime}</span>
                                        </span>
                                    )}
                                    {/* Static, not boss.registrationWindow / boss.lateRegistrationWindow.
                                        BR-13 was simplified: there is no early window and no late
                                        window any more — a Published Boss scheduled for a week can be
                                        registered at ANY point in that week (RegisterWeeklyBoss only
                                        rejects `today > weekEndDate`). Those two template columns are
                                        still stored and still carry their old seeded text, but nothing
                                        reads them for gating and the Admin UI cannot even edit them, so
                                        printing them told mentors about a deadline that no longer
                                        exists. The rule is global now, so it belongs in the locale. */}
                                    <span className={metaChip} title={t("mentor.bossRaid.registrationHint")}>
                                        <BookOpen className="w-3.5 h-3.5 text-sky-ink-3" aria-hidden="true" />
                                        <span>{t("mentor.bossRaid.registrationWindow")}</span>
                                    </span>
                                </div>
                            </div>

                            {activeSub && (
                                <div className="shrink-0 min-w-44 rounded-sky-chip bg-white/62 ring-1 ring-white/78 shadow-sky-tint px-5 py-4 space-y-2.5">
                                    <div className="text-center">
                                        <p className={eyebrow}>{t("mentor.bossRaid.yourTier")}</p>
                                        <p className="font-display text-2xl font-semibold text-sky-ink mt-0.5">{activeSub.package.name}</p>
                                        <p className="text-xs text-sky-ink-2 mt-0.5">{allowedModes.join(" · ")}</p>
                                    </div>
                                    {allowedProofTypes.length > 0 && (
                                        <div className="pt-2 border-t border-dashed border-sky-ink/12 text-xs text-sky-ink-2 text-center wrap-break-word">
                                            <span className="font-semibold text-sky-ink">Proof: </span>{allowedProofTypes.join(", ")}
                                        </div>
                                    )}
                                    {aiVerificationModes.length > 0 && (
                                        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-sky-violet-deep">
                                            <Bot className="w-3.5 h-3.5" aria-hidden="true" /> AI: {aiVerificationModes.join(", ")}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {registeredThisWeek ? (
                        /* ══════════════ ACTIVE ENCOUNTER HERO ══════════════ */
                        <div className="relative mb-8 overflow-hidden rounded-sky-card sky-glass p-6 sm:p-8">
                            <div className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full bg-sky-dmg/10 blur-3xl" aria-hidden="true" />
                            <div className="pointer-events-none absolute -bottom-24 -right-12 w-64 h-64 rounded-full bg-sky-violet/10 blur-3xl" aria-hidden="true" />

                            <div className="relative">
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-dmg-deep mb-2">
                                    <Swords className="w-3.5 h-3.5" aria-hidden="true" /> {t("mentor.bossRaid.grimoire.heroKicker")}
                                </span>

                                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                                    <div className="min-w-0">
                                        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-sky-ink wrap-break-word">{partyStatus!.bossName}</h1>
                                        <span className={`mt-2 ${statusBadge}`}>{partyStatus!.status}</span>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={`inline-flex items-center gap-1.5 justify-end ${eyebrow}`}>
                                            <Timer className="w-3 h-3" aria-hidden="true" /> {t("mentor.bossRaid.grimoire.heroTimeLeft")}
                                        </p>
                                        <p className="font-display text-2xl font-semibold text-sky-dmg-deep tabular-nums mt-0.5">
                                            <CountdownTimer target={partyStatus!.weekEndDate} />
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-5">
                                    <SegmentedHpBar current={partyStatus!.currentHp} max={partyStatus!.maxHp} label={t("mentor.bossRaid.bossHp")} variant="boss" size="lg" segments={24} />
                                    {sharedHp && (
                                        <div>
                                            <SegmentedHpBar current={sharedHp.sharedHpCurrent} max={sharedHp.sharedHpMax} label="Shared HP" variant="shared" segments={20} />
                                            <p className={`inline-flex items-center gap-1.5 text-xs font-semibold mt-1.5 ${RISK_COLORS[sharedHp.riskLevel] ?? "text-sky-ink-3"}`}>
                                                <Circle className="w-2 h-2 fill-current" aria-hidden="true" /> Risk: {sharedHp.riskLevel}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                                    {[
                                        [t("mentor.bossRaid.difficulty"), partyStatus!.difficulty],
                                        [t("mentor.bossRaid.totalDamage"), partyStatus!.totalDamageDealt.toLocaleString()],
                                        [t("mentor.bossRaid.grimoire.heroLoot"), partyStatus!.rewardTier],
                                        [t("mentor.bossRaid.weekEnds"), new Date(partyStatus!.weekEndDate).toLocaleDateString()],
                                    ].map(([k, v]) => (
                                        <div key={k} className={tile}>
                                            <p className={`${eyebrow} truncate`}>{k}</p>
                                            <p className="font-display text-sm font-semibold text-sky-ink truncate tabular-nums mt-1">{v}</p>
                                        </div>
                                    ))}
                                </div>

                                {partyStatus!.participants && partyStatus!.participants.length > 0 && (
                                    <div className="mb-6">
                                        <p className={`inline-flex items-center gap-1.5 mb-2 ${eyebrow}`}>
                                            <Users className="w-3 h-3" aria-hidden="true" /> {t("mentor.bossRaid.participants")}
                                        </p>
                                        <div className="space-y-1.5">
                                            {partyStatus!.participants.map((p, i) => (
                                                <div key={p.userId} className="flex items-center justify-between gap-3 rounded-sky-chip bg-white/58 ring-1 ring-white/72 px-3 py-2 text-sm">
                                                    <span className="inline-flex items-center gap-2 min-w-0">
                                                        <span className="grid place-items-center w-6 h-6 shrink-0 rounded-full bg-sky-ink/8 font-display text-[11px] font-semibold text-sky-ink-2 tabular-nums">{i + 1}</span>
                                                        <span className="font-semibold text-sky-ink truncate">User {p.userId}</span>
                                                    </span>
                                                    <div className="flex items-center gap-3 shrink-0 tabular-nums">
                                                        <span className="font-display font-semibold text-sky-dmg-deep">
                                                            {p.damageDealt}
                                                            <span className={`ml-1 font-sans ${eyebrow}`}>dmg</span>
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 font-display font-semibold text-sky-teal">
                                                            <Check className="w-3.5 h-3.5" aria-hidden="true" />{p.questsCompleted}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activity.length > 0 && (
                                    <div className="mb-6">
                                        <p className={`inline-flex items-center gap-1.5 mb-2 ${eyebrow}`}>
                                            <ScrollText className="w-3 h-3" aria-hidden="true" /> Recent Activity
                                        </p>
                                        <div className="space-y-1 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
                                            {activity.map((a, i) => (
                                                <div key={i} className="flex items-start gap-2 rounded-sky-chip bg-white/50 ring-1 ring-white/66 px-3 py-1.5 text-xs">
                                                    <span className="mt-1.5 w-1.5 h-1.5 shrink-0 rounded-full bg-sky-deep" aria-hidden="true" />
                                                    <p className="min-w-0">
                                                        <span className="font-semibold text-sky-deep">{a.username}</span>
                                                        <span className="text-sky-ink-2"> · {a.questTitle} · </span>
                                                        <span className="font-semibold text-sky-dmg-deep tabular-nums">-{a.damageDealt} HP</span>
                                                        <span className="text-sky-ink-3 ml-2 tabular-nums">({a.bossHpAfter.toLocaleString()} left)</span>
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>
                    ) : (
                        <>
                        {/* Last week's raid and its chest live in the History tab now, so this
                            branch stays focused on getting the new week started. The pointer
                            keeps that connection discoverable instead of silently moving
                            content the mentor was used to seeing here. */}
                        {previousRaid && (
                            <button
                                type="button"
                                onClick={() => setView("history")}
                                className={`mb-5 w-full text-left ${metaChip} justify-between gap-3 py-2.5 px-4 hover:bg-white/85 transition-colors`}
                            >
                                <span className="inline-flex items-center gap-2 min-w-0">
                                    <ScrollText className="w-3.5 h-3.5 shrink-0 text-sky-ink-3" aria-hidden="true" />
                                    <span className="truncate">
                                        {t("mentor.bossRaid.previous.pointer", { boss: previousRaid.bossName })}
                                    </span>
                                </span>
                                <span className="shrink-0 font-semibold text-sky-deep">{t("mentor.bossRaid.previous.pointerCta")}</span>
                            </button>
                        )}

                        {/* ══════════════ THE MONSTER GRIMOIRE ══════════════ */}
                        <div>
                            <div className="mb-4 flex items-start gap-3">
                                <span className="grid place-items-center w-10 h-10 shrink-0 rounded-sky-chip bg-sky-deep/10 ring-1 ring-sky-deep/18 text-sky-deep">
                                    <Swords className="w-5 h-5" aria-hidden="true" />
                                </span>
                                <div className="min-w-0">
                                    <h2 className="font-display text-2xl font-semibold tracking-tight text-sky-ink">
                                        {t("mentor.bossRaid.grimoire.sectionTitle")}
                                    </h2>
                                    <p className="text-sm text-sky-ink-2 font-medium">{t("mentor.bossRaid.grimoire.sectionSubtitle")}</p>
                                </div>
                            </div>

                            {boss.modes && boss.modes.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-5">
                                    {(["all", "Easy", "Normal", "Hard"] as (BossMode | "all")[]).map((f) => {
                                        const isActive = gridFilter === f;
                                        return (
                                            <button
                                                type="button"
                                                key={f}
                                                onClick={() => setGridFilter(f)}
                                                aria-pressed={isActive}
                                                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-sky-chip font-semibold text-sm transition-all duration-150 ${easeExpo} ${
                                                    isActive
                                                        ? "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-fill"
                                                        : "sky-glass-chip text-sky-ink-2 hover:text-sky-ink motion-safe:hover:-translate-y-px"
                                                }`}
                                            >
                                                {f !== "all" && <Circle className={`w-2.5 h-2.5 fill-current ${isActive ? "text-white" : DIFF_META[f].dot}`} aria-hidden="true" />}
                                                {f === "all" ? t("mentor.bossRaid.grimoire.filterAll") : f}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {!boss.modes || boss.modes.length === 0 ? (
                                <p className="text-sm text-sky-ink-3 font-medium">{t("mentor.bossRaid.grimoire.gridEmpty")}</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sky-stagger">
                                    {visibleModes.map((mode) => (
                                        <ModeCard
                                            key={mode.mode}
                                            mode={mode}
                                            enabled={isModeAllowed(mode)}
                                            hasAi={aiVerificationModes.includes(mode.mode.toUpperCase())}
                                            isSelected={selectedDifficulty === mode.mode}
                                            summoning={registerLoading && selectedDifficulty === mode.mode}
                                            onSummon={() => handleSummon(mode.mode)}
                                        />
                                    ))}
                                </div>
                            )}

                            {registerResult && (
                                /* Teal, never green (§4). */
                                <div className="relative mt-6 overflow-hidden rounded-sky-card sky-glass p-5 pl-6">
                                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-teal" aria-hidden="true" />
                                    <p className="relative inline-flex items-center gap-2 font-display text-sm font-semibold text-sky-teal mb-3">
                                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> {t("mentor.bossRaid.registrationSuccess")}
                                    </p>
                                    <dl className="relative space-y-1.5 text-xs font-medium">
                                        {[
                                            [t("mentor.bossRaid.party"), registerResult.partyName],
                                            [t("mentor.bossRaid.boss"), registerResult.bossName],
                                            [t("mentor.bossRaid.difficulty"), registerResult.difficulty],
                                            ["Boss HP", `${registerResult.maxHp.toLocaleString()} HP`],
                                            ["Shared HP", `${registerResult.sharedHpCurrent} / ${registerResult.sharedHpMax}`],
                                            [t("mentor.bossRaid.rewardTier"), registerResult.rewardTier],
                                        ].map(([k, v]) => (
                                            <StatLine key={k} label={k} value={v} />
                                        ))}
                                    </dl>
                                </div>
                            )}
                        </div>
                        </>
                    )}

                    {/* This week's chest only — earlier weeks live in the History tab beside
                        the raid that earned them. Read-only: a Mentor is not a PartyMember,
                        so the BE always rejects their claim ("not an active member of this
                        party"); this tracks who has collected instead of offering an action
                        that can only fail. Loot is warm peach: reward, not success. */}
                    {currentChest && (
                        <div className="relative mt-6 overflow-hidden rounded-sky-card bg-sky-peach/12 ring-1 ring-sky-peach/28 p-4 pl-5">
                            <span className="absolute left-0 top-0 bottom-0 w-1 bg-linear-to-b from-sky-peach to-sky-peach-deep" aria-hidden="true" />
                            <div className="flex items-center gap-3 mb-3">
                                <img src={CHEST_ART} alt="" className="w-9 h-9 object-contain shrink-0" />
                                <div className="min-w-0">
                                    <p className="font-display text-sm font-semibold text-sky-ink truncate">
                                        {t("mentor.bossRaid.chest.title")} — {currentChest.bossName}
                                    </p>
                                    <p className="text-[11px] text-sky-ink-2 tabular-nums">
                                        {t("mentor.bossRaid.chest.claimProgress", {
                                            claimed: currentChest.claimedCount,
                                            total: currentChest.eligibleMemberCount,
                                        })}
                                    </p>
                                </div>
                            </div>
                            <dl className="space-y-1.5 text-xs font-medium">
                                <StatLine label="Gold" value={<span className="text-sky-peach-deep">{currentChest.goldReward.toLocaleString()} <span className="font-normal text-sky-ink-3">/ {t("mentor.bossRaid.chest.perMember")}</span></span>} />
                                <StatLine label="M-Gold" value={<span className="text-sky-peach-deep">{currentChest.mgoldReward.toLocaleString()} <span className="font-normal text-sky-ink-3">/ {t("mentor.bossRaid.chest.perMember")}</span></span>} />
                                <StatLine label="Badge" value={<span className="inline-flex items-center gap-1"><Medal className="w-3.5 h-3.5 text-sky-peach-deep" aria-hidden="true" /> {currentChest.badge}</span>} />
                            </dl>
                            <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-sky-ink-2">
                                {Math.max(0, currentChest.eligibleMemberCount - currentChest.claimedCount) > 0
                                    /* `n`, not `count` — `count` would switch i18next into
                                       plural resolution and hunt for _one/_other. */
                                    ? t("mentor.bossRaid.chest.pending", { n: currentChest.eligibleMemberCount - currentChest.claimedCount })
                                    : <><CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-sky-teal" aria-hidden="true" /> {t("mentor.bossRaid.chest.allClaimed")}</>}
                            </p>
                            <p className="mt-1.5 text-[11px] font-medium text-sky-ink-3 leading-relaxed">
                                {t("mentor.bossRaid.chest.readonlyNote")}
                            </p>
                        </div>
                    )}
                </>
            )}
        </>
    );
}

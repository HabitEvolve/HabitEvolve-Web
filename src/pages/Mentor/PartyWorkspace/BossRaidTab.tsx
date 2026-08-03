import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";
import { Bot, Circle } from "lucide-react";
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
    BossMode,
    MentorTier,
} from "../../../types/mentor.types";

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
    const fillGrad = variant === "boss"
        ? "bg-linear-to-b from-rose-500 to-red-600"
        : "bg-linear-to-b from-blue-400 to-blue-600";
    return (
        <div>
            <div className="flex justify-between items-baseline text-xs font-semibold mb-1.5 text-sky-ink">
                <span>{label}</span>
                <span className={size === "lg" ? "text-base" : ""}>{current.toLocaleString()} / {max.toLocaleString()}</span>
            </div>
            <div className={`flex gap-0.75 ${heightCls} p-1 rounded-lg bg-sky-3/20`}>
                {Array.from({ length: segments }).map((_, i) => (
                    <div
                        key={i}
                        className={`flex-1 rounded-xs transition-colors duration-300 ${i < filled ? fillGrad : "bg-gray-200"}`}
                    />
                ))}
            </div>
        </div>
    );
};

const TIER_ORDER: Record<MentorTier, number> = { Free: 0, Basic: 1, Premium: 2 };
const CODE_TO_TIER: Record<string, MentorTier> = { FREE: "Free", BASIC: "Basic", PREMIUM: "Premium" };

const RISK_COLORS: Record<string, string> = {
    Low: "text-success-600",
    Medium: "text-warning-600",
    High: "text-orange-600",
    Critical: "text-error-600",
};

const DIFF_META: Record<BossMode, { dotColor: string; badge: string; band: string }> = {
    Easy:   { dotColor: "text-success-500", badge: "bg-success-100 text-success-800", band: "from-success-400 to-success-600" },
    Normal: { dotColor: "text-warning-500", badge: "bg-warning-100 text-warning-800", band: "from-warning-400 to-orange-500" },
    Hard:   { dotColor: "text-error-500",   badge: "bg-error-100 text-error-800",     band: "from-error-500 to-error-700" },
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
                "p-0 overflow-hidden h-full flex flex-col justify-between",
                "transition-all duration-300 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]",
                enabled ? "motion-safe:hover:-translate-y-1" : "opacity-60",
                isSelected ? "ring-2 ring-sky-deep" : "",
            ].join(" ")}
        >
            <div className={`relative h-32 flex items-center justify-center bg-linear-to-br ${meta.band}`}>
                <img src="/icon/Player/Skull/64px/Skull 1st 64px.png" alt="" className="w-16 h-16 object-contain drop-shadow-lg" />
                {!enabled && (
                    <div className="absolute inset-0 bg-sky-ink/55 flex items-center justify-center">
                        <span className="text-white text-xs font-semibold inline-flex items-center gap-1">
                            <img src="/icon/Item/Lock/64px/Lock 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> {mode.minTier}+
                        </span>
                    </div>
                )}
            </div>

            <div className="p-4 flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.badge}`}>
                        <Circle className={`w-2.5 h-2.5 fill-current ${meta.dotColor}`} aria-hidden="true" /> {mode.mode}
                    </span>
                    {hasAi && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-600"><Bot className="w-3 h-3" /> AI</span>}
                </div>

                <div className="space-y-1 text-xs font-medium text-sky-ink-2">
                    <div className="flex justify-between"><span>{t("mentor.bossRaid.bossHp")}</span><span className="font-semibold text-sky-ink">{mode.bossHp.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>{t("mentor.bossRaid.partySize")}</span><span className="font-semibold text-sky-ink">{mode.partyMin}–{mode.partyMax}</span></div>
                    <div className="flex justify-between"><span>{t("mentor.bossRaid.maxDmgPerQuest")}</span><span className="font-semibold text-sky-ink">{mode.maxDamagePerQuest}</span></div>
                </div>

                <div className="flex items-center gap-3 mt-1 pt-2 border-t border-dashed border-sky-ink/15">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-peach-deep" title={t("mentor.bossRaid.grimoire.lootMGoldCap")}>
                        <img src="/icon/Currency/Coin/64px/Golden Coin 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> {mode.mGoldRewardCapPerQuest}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 truncate" title={t("mentor.bossRaid.grimoire.lootRewardTier")}>
                        <img src="/icon/Item/Trophy/64w/Golden Trophy 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> {mode.rewardTier}
                    </span>
                </div>
            </div>

            <div className="p-4 pt-0">
                <SkyButton
                    type="button"
                    variant="primary"
                    onClick={onSummon}
                    disabled={!enabled || summoning}
                    className="w-full"
                >
                    {summoning ? (
                        <><Spinner size={14} /> {t("mentor.bossRaid.grimoire.summoning")}</>
                    ) : (
                        <><img src="/icon/Item/Sword/64px/Sword 1st 64px.png" alt="" className="w-4 h-4 object-contain" /> {t("mentor.bossRaid.grimoire.summonBtn")}</>
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
    const [weeklyChest, setWeeklyChest] = useState<WeeklyChestDto | null>(null);
    const [activity, setActivity] = useState<RaidActivityDto[]>([]);
    const [claimLoading, setClaimLoading] = useState(false);
    const [claimSuccess, setClaimSuccess] = useState(false);

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
        setWeeklyChest(null);
        setActivity([]);
        try {
            const res = await mentorApi.getPartyBossStatus(partyId);
            if (res.success && res.data) {
                const status = res.data;
                setPartyStatus(status);
                const [hpRes, actRes] = await Promise.all([
                    mentorApi.getSharedHp(status.raidId).catch(() => null),
                    mentorApi.getPartyActivity(partyId).catch(() => null),
                ]);
                if (hpRes?.success) setSharedHp(hpRes.data ?? null);
                if (actRes?.success) setActivity(actRes.data ?? []);
                if (status.status === "Defeated") {
                    const chestRes = await mentorApi.getWeeklyChest(partyId).catch(() => null);
                    if (chestRes?.success) setWeeklyChest(chestRes.data ?? null);
                }
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

    const handleClaimChest = async () => {
        if (claimSuccess) return;
        setClaimLoading(true);
        try {
            const res = await mentorApi.claimWeeklyChest(partyId);
            if (res.success) {
                setWeeklyChest(res.data ?? weeklyChest);
                setClaimSuccess(true);
                alert.success(t("mentor.bossRaid.chestClaimSuccess"));
            } else {
                alert.error(res.message || t("mentor.bossRaid.chestClaimFailed"));
            }
        } catch (e: any) {
            alert.error(e?.response?.data?.message || t("mentor.bossRaid.unexpectedError"));
        } finally {
            setClaimLoading(false);
        }
    };

    // ── Mode gating via ActiveSubscriptionDto ─────────────────────────────────
    const mentorTier: MentorTier = CODE_TO_TIER[activeSub?.package?.code ?? "FREE"] ?? "Free";
    const allowedModes: string[] = activeSub?.package?.bossModes
        ? activeSub.package.bossModes.split(",").map((m) => m.trim())
        : [];
    const allowedProofTypes: string[] = activeSub?.package?.proofTypes
        ? activeSub.package.proofTypes.split(",").map((m) => m.trim())
        : [];
    const aiVerificationModes: string[] = activeSub?.package?.aiVerificationBossModes
        ? activeSub.package.aiVerificationBossModes.split(",").map((m) => m.trim()).filter(Boolean)
        : [];

    const isModeAllowed = (modeConfig: BossModeConfigDto): boolean => {
        const mentorTierLevel = TIER_ORDER[mentorTier] ?? 0;
        const requiredTierLevel = TIER_ORDER[modeConfig.minTier] ?? 0;
        return mentorTierLevel >= requiredTierLevel && allowedModes.includes(modeConfig.mode);
    };

    // ── Difficulty filter over the Grimoire grid (client-side, purely visual) ─
    const [gridFilter, setGridFilter] = useState<BossMode | "all">("all");
    const visibleModes = boss?.modes?.filter((m) => gridFilter === "all" || m.mode === gridFilter) ?? [];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64"><Spinner size={40} /></div>
        );
    }

    const hasActiveEncounter = !!partyStatus;

    return (
        <>
            {error && (
                <div className="mb-6 p-4 bg-error-100 border border-error-400 rounded-sky-card font-semibold text-error-700">
                    {error}
                </div>
            )}

            {!boss ? (
                <div className="mb-8 p-8 bg-gray-50 border border-gray-200 rounded-sky-card text-center">
                    <p className="text-xl font-bold text-sky-ink-3">{t("mentor.bossRaid.noActiveBoss")}</p>
                    <p className="text-sm text-sky-ink-3 mt-1">{t("mentor.bossRaid.checkBack")}</p>
                </div>
            ) : (
                <>
                    <div className="mb-6 p-5 bg-error-50 border border-error-300 rounded-sky-card shadow-sky-tint">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="flex items-center gap-3 mb-1 flex-wrap">
                                    <img src="/icon/Player/Skull/64px/Skull 1st 64px.png" alt="" className="w-9 h-9 object-contain shrink-0" />
                                    <h1 className="text-2xl sm:text-3xl font-bold text-sky-ink tracking-tight wrap-break-word">{boss.themeName}</h1>
                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${boss.status === "Published" ? "bg-success-400 text-success-950" : "bg-gray-200 text-gray-700"}`}>
                                        {boss.status}
                                    </span>
                                    {statusLoading && <Spinner size={16} />}
                                </div>
                                {boss.description && (
                                    <p className="text-sky-ink-2 font-medium mb-2 max-w-xl wrap-break-word">{boss.description}</p>
                                )}
                                <div className="flex flex-wrap gap-2 text-xs font-semibold text-sky-ink-2">
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/60 border border-sky-surf-border rounded-full">
                                        <img src="/icon/Item/Calendar/64px/Calendar 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> {boss.activeWeekStart} → {boss.activeWeekEnd}
                                    </span>
                                    {boss.startTime && (
                                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/60 border border-sky-surf-border rounded-full">
                                            <img src="/icon/Item/Clock/64px/Clock 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> {boss.startTime} — {boss.endTime}
                                        </span>
                                    )}
                                    {boss.registrationWindow && (
                                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/60 border border-sky-surf-border rounded-full" title="Cửa sổ đăng ký chuẩn">
                                            <img src="/icon/Item/Book/64px/Blue Book 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> Đăng ký: {boss.registrationWindow}
                                        </span>
                                    )}
                                    {boss.lateRegistrationWindow && (
                                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-warning-100 border border-warning-300 rounded-full" title="Đăng ký muộn">
                                            <img src="/icon/UI/Warning/64px/Warning 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> Muộn: {boss.lateRegistrationWindow}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {activeSub && (
                                <div className="bg-white/60 border border-sky-surf-border rounded-sky-chip shadow-sky-tint px-5 py-4 min-w-40 space-y-2 shrink-0">
                                    <div className="text-center">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-sky-ink-2">{t("mentor.bossRaid.yourTier")}</p>
                                        <p className="text-2xl font-bold text-sky-ink">{activeSub.package.name}</p>
                                        <p className="text-xs text-sky-ink-2 mt-0.5">{allowedModes.join(" · ")}</p>
                                    </div>
                                    {allowedProofTypes.length > 0 && (
                                        <div className="text-xs text-sky-ink-2 text-center wrap-break-word">
                                            <span className="font-semibold">Proof: </span>{allowedProofTypes.join(", ")}
                                        </div>
                                    )}
                                    {aiVerificationModes.length > 0 && (
                                        <div className="flex items-center justify-center gap-1 text-xs font-semibold text-purple-700">
                                            <Bot className="w-3.5 h-3.5" /> AI: {aiVerificationModes.join(", ")}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {hasActiveEncounter ? (
                        /* ══════════════ ACTIVE ENCOUNTER HERO ══════════════ */
                        <div className="mb-8 p-6 sm:p-8 bg-linear-to-br from-error-50 to-sky-peach/10 border border-error-400 rounded-sky-card shadow-sky-glass">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-error-600 mb-2">
                                <img src="/icon/Item/Sword/64px/Sword 1st 64px.png" alt="" className="w-4 h-4 object-contain" /> {t("mentor.bossRaid.grimoire.heroKicker")}
                            </span>

                            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                                <div className="min-w-0">
                                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-sky-ink wrap-break-word">{partyStatus!.bossName}</h1>
                                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
                                        partyStatus!.status === "Active" ? "bg-success-100 text-success-800" :
                                        partyStatus!.status === "Defeated" ? "bg-warning-100 text-warning-800" :
                                        "bg-error-100 text-error-800"
                                    }`}>{partyStatus!.status}</span>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-xs font-semibold uppercase text-sky-ink-2">{t("mentor.bossRaid.grimoire.heroTimeLeft")}</p>
                                    <p className="text-xl font-bold text-error-600 tabular-nums">
                                        <CountdownTimer target={partyStatus!.weekEndDate} />
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 mb-5">
                                <SegmentedHpBar current={partyStatus!.currentHp} max={partyStatus!.maxHp} label={t("mentor.bossRaid.bossHp")} variant="boss" size="lg" segments={24} />
                                {sharedHp && (
                                    <div>
                                        <SegmentedHpBar current={sharedHp.sharedHpCurrent} max={sharedHp.sharedHpMax} label="Shared HP" variant="shared" segments={20} />
                                        <p className={`text-xs font-semibold mt-1 ${RISK_COLORS[sharedHp.riskLevel] ?? "text-sky-ink-3"}`}>Risk: {sharedHp.riskLevel}</p>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                                {[
                                    [t("mentor.bossRaid.difficulty"), partyStatus!.difficulty],
                                    [t("mentor.bossRaid.totalDamage"), partyStatus!.totalDamageDealt.toLocaleString()],
                                    [t("mentor.bossRaid.grimoire.heroLoot"), partyStatus!.rewardTier],
                                    [t("mentor.bossRaid.weekEnds"), new Date(partyStatus!.weekEndDate).toLocaleDateString()],
                                ].map(([k, v]) => (
                                    <div key={k} className="bg-white/60 border border-sky-surf-border rounded-sky-chip p-3 min-w-0">
                                        <p className="text-sky-ink-2 text-xs font-medium truncate">{k}</p>
                                        <p className="font-bold text-sky-ink truncate">{v}</p>
                                    </div>
                                ))}
                            </div>

                            {partyStatus!.participants && partyStatus!.participants.length > 0 && (
                                <div className="mb-5">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-sky-ink-2 mb-2">{t("mentor.bossRaid.participants")}</p>
                                    <div className="space-y-1.5">
                                        {partyStatus!.participants.map((p, i) => (
                                            <div key={p.userId} className="flex items-center justify-between bg-white/60 border border-sky-surf-border rounded-sky-chip px-3 py-2 text-sm">
                                                <span className="font-semibold text-sky-ink-2">#{i + 1} User {p.userId}</span>
                                                <div className="flex gap-4 shrink-0">
                                                    <span className="text-error-600 font-bold">{p.damageDealt} dmg</span>
                                                    <span className="inline-flex items-center gap-1 text-success-600 font-bold">{p.questsCompleted} <img src="/icon/UI/Checkmark/64px/Checkmark 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /></span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activity.length > 0 && (
                                <div className="mb-5">
                                    <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sky-ink-2 mb-2"><img src="/icon/Item/Scroll/64px/Scroll 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> Recent Activity</p>
                                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                        {activity.map((a, i) => (
                                            <div key={i} className="bg-white/50 border border-sky-surf-border rounded-lg px-3 py-1.5 text-xs">
                                                <span className="text-success-600 font-semibold">{a.username}</span>
                                                <span className="text-sky-ink-2"> · {a.questTitle} · </span>
                                                <span className="text-error-600 font-semibold">-{a.damageDealt} HP</span>
                                                <span className="text-sky-ink-3 ml-2">({a.bossHpAfter.toLocaleString()} left)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {partyStatus!.status === "Defeated" && weeklyChest && (
                                <div className="p-4 bg-warning-100 border border-warning-300 rounded-sky-chip">
                                    <p className="inline-flex items-center gap-1.5 font-bold text-warning-800 mb-2">
                                        <img src="/icon/Item/Chest/64px/Chest 1st 64px.png" alt="" className="w-4 h-4 object-contain" /> Weekly Chest
                                    </p>
                                    <div className="space-y-1 text-xs font-medium text-sky-ink-2">
                                        <div className="flex justify-between"><span>Gold</span><span className="font-bold text-sky-peach-deep">{weeklyChest.goldReward.toLocaleString()}</span></div>
                                        <div className="flex justify-between"><span>M-Gold</span><span className="font-bold text-sky-peach-deep">{weeklyChest.mgoldReward.toLocaleString()}</span></div>
                                        <div className="flex justify-between"><span>Badge</span><span className="inline-flex items-center gap-1 font-bold text-sky-ink"><img src="/icon/Item/Medal/64px/Golden Medal 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> {weeklyChest.badge}</span></div>
                                        <div className="flex justify-between text-sky-ink-2">
                                            <span>Claimed</span><span>{weeklyChest.claimedCount} / {weeklyChest.eligibleMemberCount}</span>
                                        </div>
                                    </div>
                                    <SkyButton
                                        type="button"
                                        variant="primary"
                                        onClick={handleClaimChest}
                                        disabled={claimLoading || weeklyChest.alreadyClaimed || claimSuccess}
                                        className="mt-3 w-full"
                                    >
                                        {claimLoading ? <><Spinner size={14} /> Claiming…</> :
                                         weeklyChest.alreadyClaimed || claimSuccess ? <><img src="/icon/UI/Checkmark/64px/Checkmark 1st 64px.png" alt="" className="w-4 h-4 object-contain" /> Claimed</> : "Claim Reward"}
                                    </SkyButton>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ══════════════ THE MONSTER GRIMOIRE ══════════════ */
                        <div>
                            <div className="mb-4">
                                <h2 className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-sky-ink">
                                    <img src="/icon/Item/Sword/64px/Sword 1st 64px.png" alt="" className="w-6 h-6 object-contain" /> {t("mentor.bossRaid.grimoire.sectionTitle")}
                                </h2>
                                <p className="text-sm text-sky-ink-2 font-medium">{t("mentor.bossRaid.grimoire.sectionSubtitle")}</p>
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
                                                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-sky-chip font-semibold text-sm transition-all duration-150 ${easeExpo} ${
                                                    isActive
                                                        ? "bg-sky-deep text-white shadow-sky-chip"
                                                        : "bg-white/50 text-sky-ink-2 border border-sky-surf-border hover:border-sky-deep/30"
                                                }`}
                                            >
                                                {f !== "all" && <Circle className={`w-2.5 h-2.5 fill-current ${isActive ? "text-white" : DIFF_META[f].dotColor}`} aria-hidden="true" />}
                                                {f === "all" ? t("mentor.bossRaid.grimoire.filterAll") : f}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {!boss.modes || boss.modes.length === 0 ? (
                                <p className="text-sm text-sky-ink-3 font-medium">{t("mentor.bossRaid.grimoire.gridEmpty")}</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {visibleModes.map((mode) => (
                                        <ModeCard
                                            key={mode.mode}
                                            mode={mode}
                                            enabled={isModeAllowed(mode)}
                                            hasAi={aiVerificationModes.includes(mode.mode)}
                                            isSelected={selectedDifficulty === mode.mode}
                                            summoning={registerLoading && selectedDifficulty === mode.mode}
                                            onSummon={() => handleSummon(mode.mode)}
                                        />
                                    ))}
                                </div>
                            )}

                            {registerResult && (
                                <div className="mt-6 p-4 bg-success-100 border border-success-400 rounded-sky-chip space-y-1">
                                    <p className="font-bold text-success-800 mb-2">{t("mentor.bossRaid.registrationSuccess")}</p>
                                    {[
                                        [t("mentor.bossRaid.party"), registerResult.partyName],
                                        [t("mentor.bossRaid.boss"), registerResult.bossName],
                                        [t("mentor.bossRaid.difficulty"), registerResult.difficulty],
                                        ["Boss HP", `${registerResult.maxHp.toLocaleString()} HP`],
                                        ["Shared HP", `${registerResult.sharedHpCurrent} / ${registerResult.sharedHpMax}`],
                                        [t("mentor.bossRaid.rewardTier"), registerResult.rewardTier],
                                    ].map(([k, v]) => (
                                        <div key={k} className="flex justify-between text-sm text-success-700 font-medium">
                                            <span>{k}</span><strong>{v}</strong>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </>
    );
}

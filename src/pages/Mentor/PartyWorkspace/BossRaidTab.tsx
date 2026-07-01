import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";
import { Bot, Circle } from "lucide-react";
import mentorApi from "../../../api/mentorApi";
import { useAlert } from "../../../context/AlertContext";
import { inkBorder, shadowSm, shadowMd, shadowLg, easeExpo, getMentorId, Spinner } from "./shared";
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

const btnPress =
    `hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] ` +
    `active:shadow-none active:translate-x-[3px] active:translate-y-[3px] ` +
    `disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 ` +
    `transition-all duration-150 ${easeExpo}`;

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
            <div className="flex justify-between items-baseline text-xs font-black mb-1.5">
                <span>{label}</span>
                <span className={size === "lg" ? "text-base" : ""}>{current.toLocaleString()} / {max.toLocaleString()}</span>
            </div>
            <div className={`flex gap-0.75 ${heightCls} p-1 border-[3px] ${inkBorder} rounded-lg bg-gray-200 dark:bg-gray-900`}>
                {Array.from({ length: segments }).map((_, i) => (
                    <div
                        key={i}
                        className={`flex-1 rounded-xs transition-colors duration-300 ${i < filled ? fillGrad : "bg-gray-300 dark:bg-gray-700"}`}
                    />
                ))}
            </div>
        </div>
    );
};

const TIER_ORDER: Record<MentorTier, number> = { Free: 0, Basic: 1, Premium: 2 };
const CODE_TO_TIER: Record<string, MentorTier> = { FREE: "Free", BASIC: "Basic", PREMIUM: "Premium" };

const RISK_COLORS: Record<string, string> = {
    Low: "text-success-600 dark:text-success-300",
    Medium: "text-warning-600 dark:text-warning-300",
    High: "text-orange-600 dark:text-orange-300",
    Critical: "text-error-600 dark:text-error-300",
};

const DIFF_META: Record<BossMode, { dotColor: string; badge: string; band: string }> = {
    Easy:   { dotColor: "text-success-500", badge: "bg-success-100 dark:bg-success-500/15 text-success-800 dark:text-success-300 border-success-400", band: "from-success-400 to-success-600" },
    Normal: { dotColor: "text-warning-500", badge: "bg-warning-100 dark:bg-warning-500/15 text-warning-800 dark:text-warning-300 border-warning-400", band: "from-warning-400 to-orange-500" },
    Hard:   { dotColor: "text-error-500",   badge: "bg-error-100 dark:bg-error-500/15 text-error-800 dark:text-error-300 border-error-400", band: "from-error-500 to-error-700" },
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
        <div className={[
            "group relative h-full flex flex-col justify-between bg-gray-25 dark:bg-gray-800 border-4 rounded-2xl overflow-hidden",
            "transition-all duration-300 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]",
            enabled
                ? `${inkBorder} ${shadowMd} motion-safe:hover:-translate-y-2 motion-safe:hover:shadow-[10px_16px_0_0_var(--color-game-outline)] dark:motion-safe:hover:shadow-[10px_16px_0_0_var(--color-brand-300)]`
                : "border-gray-300 dark:border-gray-700 opacity-60",
            isSelected ? "ring-4 ring-orange-400" : "",
        ].join(" ")}>
            <div className={`relative h-32 flex items-center justify-center bg-linear-to-br ${meta.band}`}>
                <img src="/icon/Player/Skull/64px/Skull 1st 64px.png" alt="" className="w-16 h-16 object-contain drop-shadow-lg" />
                {!enabled && (
                    <div className="absolute inset-0 bg-game-outline/55 flex items-center justify-center">
                        <span className="text-white text-xs font-black inline-flex items-center gap-1">
                            <img src="/icon/Item/Lock/64px/Lock 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> {mode.minTier}+
                        </span>
                    </div>
                )}
            </div>

            <div className="p-4 flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black border-2 ${meta.badge}`}>
                        <Circle className={`w-2.5 h-2.5 fill-current ${meta.dotColor}`} aria-hidden="true" /> {mode.mode}
                    </span>
                    {hasAi && <span className="inline-flex items-center gap-1 text-[10px] font-black text-purple-600 dark:text-purple-300"><Bot className="w-3 h-3" /> AI</span>}
                </div>

                <div className="space-y-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                    <div className="flex justify-between"><span>{t("mentor.bossRaid.bossHp")}</span><span className="font-black">{mode.bossHp.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>{t("mentor.bossRaid.partySize")}</span><span className="font-black">{mode.partyMin}–{mode.partyMax}</span></div>
                    <div className="flex justify-between"><span>{t("mentor.bossRaid.maxDmgPerQuest")}</span><span className="font-black">{mode.maxDamagePerQuest}</span></div>
                </div>

                <div className="flex items-center gap-3 mt-1 pt-2 border-t-2 border-dashed border-game-outline/20 dark:border-brand-300/20">
                    <span className="inline-flex items-center gap-1 text-xs font-black text-amber-700 dark:text-amber-300" title={t("mentor.bossRaid.grimoire.lootMGoldCap")}>
                        <img src="/icon/Currency/Coin/64px/Golden Coin 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> {mode.mGoldRewardCapPerQuest}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-black text-purple-700 dark:text-purple-300 truncate" title={t("mentor.bossRaid.grimoire.lootRewardTier")}>
                        <img src="/icon/Item/Trophy/64w/Golden Trophy 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> {mode.rewardTier}
                    </span>
                </div>
            </div>

            <div className="p-4 pt-0">
                <button
                    onClick={onSummon}
                    disabled={!enabled || summoning}
                    className={`w-full py-3 border-[3px] ${inkBorder} rounded-full font-black text-sm bg-amber-500 text-game-outline hover:bg-amber-400 ${shadowSm} ${btnPress} inline-flex items-center justify-center gap-1.5`}
                >
                    {summoning ? (
                        <><Spinner size={14} /> {t("mentor.bossRaid.grimoire.summoning")}</>
                    ) : (
                        <><img src="/icon/Item/Sword/64px/Sword 1st 64px.png" alt="" className="w-4 h-4 object-contain" /> {t("mentor.bossRaid.grimoire.summonBtn")}</>
                    )}
                </button>
            </div>
        </div>
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
                <div className="mb-6 p-4 bg-error-100 dark:bg-error-500/15 border-4 border-error-400 rounded-2xl font-bold text-error-700 dark:text-error-300">
                    {error}
                </div>
            )}

            {!boss ? (
                <div className={`mb-8 p-8 bg-gray-100 dark:bg-gray-800 border-4 border-gray-300 dark:border-gray-600 rounded-2xl text-center`}>
                    <p className="text-xl font-black text-gray-400">{t("mentor.bossRaid.noActiveBoss")}</p>
                    <p className="text-sm text-gray-400 mt-1">{t("mentor.bossRaid.checkBack")}</p>
                </div>
            ) : (
                <>
                    <div className={`mb-6 p-5 bg-error-50 dark:bg-error-500/10 border-4 ${inkBorder} rounded-2xl ${shadowMd}`}>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="flex items-center gap-3 mb-1 flex-wrap">
                                    <img src="/icon/Player/Skull/64px/Skull 1st 64px.png" alt="" className="w-9 h-9 object-contain shrink-0" />
                                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight wrap-break-word">{boss.themeName}</h1>
                                    <span className={`px-2 py-0.5 text-xs font-black border-2 ${inkBorder} rounded-full ${boss.status === "Published" ? "bg-success-400 text-success-900" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"}`}>
                                        {boss.status}
                                    </span>
                                    {statusLoading && <Spinner size={16} />}
                                </div>
                                {boss.description && (
                                    <p className="text-gray-600 dark:text-gray-300 font-medium mb-2 max-w-xl wrap-break-word">{boss.description}</p>
                                )}
                                <div className="flex flex-wrap gap-2 text-xs font-bold text-gray-700 dark:text-gray-200">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 bg-gray-25 dark:bg-gray-800 border-2 ${inkBorder} rounded-full`}>
                                        <img src="/icon/Item/Calendar/64px/Calendar 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> {boss.activeWeekStart} → {boss.activeWeekEnd}
                                    </span>
                                    {boss.startTime && (
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 bg-gray-25 dark:bg-gray-800 border-2 ${inkBorder} rounded-full`}>
                                            <img src="/icon/Item/Clock/64px/Clock 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> {boss.startTime} — {boss.endTime}
                                        </span>
                                    )}
                                    {boss.registrationWindow && (
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 bg-gray-25 dark:bg-gray-800 border-2 ${inkBorder} rounded-full`} title="Cửa sổ đăng ký chuẩn">
                                            <img src="/icon/Item/Book/64px/Blue Book 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> Đăng ký: {boss.registrationWindow}
                                        </span>
                                    )}
                                    {boss.lateRegistrationWindow && (
                                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-warning-100 dark:bg-warning-500/15 border-2 border-warning-400 rounded-full" title="Đăng ký muộn">
                                            <img src="/icon/UI/Warning/64px/Warning 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> Muộn: {boss.lateRegistrationWindow}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {activeSub && (
                                <div className={`bg-gray-25 dark:bg-gray-800 border-4 ${inkBorder} rounded-xl ${shadowSm} px-5 py-4 min-w-40 space-y-2 shrink-0`}>
                                    <div className="text-center">
                                        <p className="text-xs font-black uppercase tracking-wider text-gray-500">{t("mentor.bossRaid.yourTier")}</p>
                                        <p className="text-2xl font-black">{activeSub.package.name}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{allowedModes.join(" · ")}</p>
                                    </div>
                                    {allowedProofTypes.length > 0 && (
                                        <div className="text-xs text-gray-600 dark:text-gray-300 text-center wrap-break-word">
                                            <span className="font-bold">Proof: </span>{allowedProofTypes.join(", ")}
                                        </div>
                                    )}
                                    {aiVerificationModes.length > 0 && (
                                        <div className="flex items-center justify-center gap-1 text-xs font-bold text-purple-700 dark:text-purple-300">
                                            <Bot className="w-3.5 h-3.5" /> AI: {aiVerificationModes.join(", ")}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {hasActiveEncounter ? (
                        /* ══════════════ ACTIVE ENCOUNTER HERO ══════════════ */
                        <div className={`mb-8 p-6 sm:p-8 bg-linear-to-br from-error-50 to-orange-50 dark:from-error-500/10 dark:to-orange-500/10 border-4 border-error-500 rounded-[28px] ${shadowLg}`}>
                            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-error-600 dark:text-error-300 mb-2">
                                <img src="/icon/Item/Sword/64px/Sword 1st 64px.png" alt="" className="w-4 h-4 object-contain" /> {t("mentor.bossRaid.grimoire.heroKicker")}
                            </span>

                            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                                <div className="min-w-0">
                                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 wrap-break-word">{partyStatus!.bossName}</h1>
                                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-black border-2 rounded-full ${
                                        partyStatus!.status === "Active" ? "bg-success-100 dark:bg-success-500/15 border-success-400 text-success-800 dark:text-success-300" :
                                        partyStatus!.status === "Defeated" ? "bg-warning-100 dark:bg-warning-500/15 border-warning-400 text-warning-800 dark:text-warning-300" :
                                        "bg-error-100 dark:bg-error-500/15 border-error-400 text-error-800 dark:text-error-300"
                                    }`}>{partyStatus!.status}</span>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-xs font-black uppercase text-gray-500">{t("mentor.bossRaid.grimoire.heroTimeLeft")}</p>
                                    <p className="text-xl font-black text-error-600 dark:text-error-300 tabular-nums">
                                        <CountdownTimer target={partyStatus!.weekEndDate} />
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 mb-5">
                                <SegmentedHpBar current={partyStatus!.currentHp} max={partyStatus!.maxHp} label={t("mentor.bossRaid.bossHp")} variant="boss" size="lg" segments={24} />
                                {sharedHp && (
                                    <div>
                                        <SegmentedHpBar current={sharedHp.sharedHpCurrent} max={sharedHp.sharedHpMax} label="Shared HP" variant="shared" segments={20} />
                                        <p className={`text-xs font-bold mt-1 ${RISK_COLORS[sharedHp.riskLevel] ?? "text-gray-400"}`}>Risk: {sharedHp.riskLevel}</p>
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
                                    <div key={k} className={`bg-gray-25 dark:bg-gray-800 border-2 ${inkBorder} rounded-xl p-3 min-w-0`}>
                                        <p className="text-gray-500 text-xs font-medium truncate">{k}</p>
                                        <p className="font-black text-gray-900 truncate">{v}</p>
                                    </div>
                                ))}
                            </div>

                            {partyStatus!.participants && partyStatus!.participants.length > 0 && (
                                <div className="mb-5">
                                    <p className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2">{t("mentor.bossRaid.participants")}</p>
                                    <div className="space-y-1.5">
                                        {partyStatus!.participants.map((p, i) => (
                                            <div key={p.userId} className={`flex items-center justify-between bg-gray-25 dark:bg-gray-800 border-2 ${inkBorder} rounded-xl px-3 py-2 text-sm`}>
                                                <span className="font-bold text-gray-700 dark:text-gray-200">#{i + 1} User {p.userId}</span>
                                                <div className="flex gap-4 shrink-0">
                                                    <span className="text-error-600 dark:text-error-300 font-black">{p.damageDealt} dmg</span>
                                                    <span className="inline-flex items-center gap-1 text-success-600 dark:text-success-300 font-black">{p.questsCompleted} <img src="/icon/UI/Checkmark/64px/Checkmark 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /></span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activity.length > 0 && (
                                <div className="mb-5">
                                    <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-gray-500 mb-2"><img src="/icon/Item/Scroll/64px/Scroll 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> Recent Activity</p>
                                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                        {activity.map((a, i) => (
                                            <div key={i} className={`bg-gray-25/70 dark:bg-gray-800/70 border ${inkBorder} rounded-lg px-3 py-1.5 text-xs`}>
                                                <span className="text-success-600 dark:text-success-300 font-bold">{a.username}</span>
                                                <span className="text-gray-500"> · {a.questTitle} · </span>
                                                <span className="text-error-600 dark:text-error-300 font-bold">-{a.damageDealt} HP</span>
                                                <span className="text-gray-400 ml-2">({a.bossHpAfter.toLocaleString()} left)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {partyStatus!.status === "Defeated" && weeklyChest && (
                                <div className={`p-4 bg-warning-100 dark:bg-warning-500/15 border-2 border-warning-400 rounded-xl`}>
                                    <p className="inline-flex items-center gap-1.5 font-black text-warning-800 dark:text-warning-300 mb-2">
                                        <img src="/icon/Item/Chest/64px/Chest 1st 64px.png" alt="" className="w-4 h-4 object-contain" /> Weekly Chest
                                    </p>
                                    <div className="space-y-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                                        <div className="flex justify-between"><span>Gold</span><span className="font-black text-amber-700 dark:text-amber-300">{weeklyChest.goldReward.toLocaleString()}</span></div>
                                        <div className="flex justify-between"><span>M-Gold</span><span className="font-black text-amber-700 dark:text-amber-300">{weeklyChest.mgoldReward.toLocaleString()}</span></div>
                                        <div className="flex justify-between"><span>Badge</span><span className="inline-flex items-center gap-1 font-black"><img src="/icon/Item/Medal/64px/Golden Medal 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> {weeklyChest.badge}</span></div>
                                        <div className="flex justify-between text-gray-500">
                                            <span>Claimed</span><span>{weeklyChest.claimedCount} / {weeklyChest.eligibleMemberCount}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleClaimChest}
                                        disabled={claimLoading || weeklyChest.alreadyClaimed || claimSuccess}
                                        className={`mt-3 w-full py-2.5 border-[3px] ${inkBorder} rounded-full font-black text-sm bg-amber-400 text-game-outline hover:bg-amber-300 ${shadowSm} ${btnPress} inline-flex items-center justify-center gap-1.5`}
                                    >
                                        {claimLoading ? <><Spinner size={14} /> Claiming…</> :
                                         weeklyChest.alreadyClaimed || claimSuccess ? <><img src="/icon/UI/Checkmark/64px/Checkmark 1st 64px.png" alt="" className="w-4 h-4 object-contain" /> Claimed</> : "Claim Reward"}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ══════════════ THE MONSTER GRIMOIRE ══════════════ */
                        <div>
                            <div className="mb-4">
                                <h2 className="inline-flex items-center gap-2 text-2xl font-black tracking-tight text-gray-900">
                                    <img src="/icon/Item/Sword/64px/Sword 1st 64px.png" alt="" className="w-6 h-6 object-contain" /> {t("mentor.bossRaid.grimoire.sectionTitle")}
                                </h2>
                                <p className="text-sm text-gray-500 font-medium">{t("mentor.bossRaid.grimoire.sectionSubtitle")}</p>
                            </div>

                            {boss.modes && boss.modes.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-5">
                                    {(["all", "Easy", "Normal", "Hard"] as (BossMode | "all")[]).map((f) => {
                                        const isActive = gridFilter === f;
                                        return (
                                            <button
                                                key={f}
                                                onClick={() => setGridFilter(f)}
                                                className={`inline-flex items-center gap-1.5 px-4 py-2.5 border-[3px] ${inkBorder} rounded-xl font-black text-sm transition-all duration-150 ${easeExpo} ${
                                                    isActive
                                                        ? "bg-orange-500 text-white shadow-none translate-x-0.5 translate-y-0.5"
                                                        : `bg-gray-25 dark:bg-gray-800 text-gray-700 dark:text-gray-200 ${shadowSm} hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5`
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
                                <p className="text-sm text-gray-400 font-medium">{t("mentor.bossRaid.grimoire.gridEmpty")}</p>
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
                                <div className="mt-6 p-4 bg-success-100 dark:bg-success-500/15 border-4 border-success-400 rounded-xl space-y-1">
                                    <p className="font-black text-success-800 dark:text-success-300 mb-2">{t("mentor.bossRaid.registrationSuccess")}</p>
                                    {[
                                        [t("mentor.bossRaid.party"), registerResult.partyName],
                                        [t("mentor.bossRaid.boss"), registerResult.bossName],
                                        [t("mentor.bossRaid.difficulty"), registerResult.difficulty],
                                        ["Boss HP", `${registerResult.maxHp.toLocaleString()} HP`],
                                        ["Shared HP", `${registerResult.sharedHpCurrent} / ${registerResult.sharedHpMax}`],
                                        [t("mentor.bossRaid.rewardTier"), registerResult.rewardTier],
                                    ].map(([k, v]) => (
                                        <div key={k} className="flex justify-between text-sm text-success-700 dark:text-success-300 font-medium">
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

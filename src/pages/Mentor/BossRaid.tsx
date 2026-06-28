import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import mentorApi from "../../api/mentorApi";
import partyMentorApi from "../../api/mentorPartyApi";
import type { PartyItem } from "../../types/api.types";
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
} from "../../types/mentor.types";

const getMentorId = () => {
    const id = localStorage.getItem("user_id");
    return id ? parseInt(id, 10) : 0;
};

const Spinner = ({ size = 18 }: { size?: number }) => (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
);

// ── BOSS HP BAR ───────────────────────────────────────────────────────────────
const HpBar = ({
    current, max, label = "Boss HP", color
}: { current: number; max: number; label?: string; color?: string }) => {
    const pct = max > 0 ? Math.max(0, Math.min((current / max) * 100, 100)) : 0;
    const barColor = color ?? (pct > 50 ? "bg-red-500" : pct > 25 ? "bg-amber-400" : "bg-emerald-500");
    return (
        <div>
            <div className="flex justify-between text-xs font-black mb-1.5">
                <span>{label}</span>
                <span>{current.toLocaleString()} / {max.toLocaleString()}</span>
            </div>
            <div className="h-5 bg-gray-200 border-2 border-black rounded-full overflow-hidden">
                <div className={`h-full ${barColor} transition-all duration-700`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
};

const TIER_ORDER: Record<MentorTier, number> = { Free: 0, Basic: 1, Premium: 2 };
const CODE_TO_TIER: Record<string, MentorTier> = { FREE: "Free", BASIC: "Basic", PREMIUM: "Premium" };

const RISK_COLORS: Record<string, string> = {
    Low: "text-emerald-600",
    Medium: "text-amber-600",
    High: "text-orange-600",
    Critical: "text-red-600",
};

// ── PAGE ──────────────────────────────────────────────────────────────────────
export default function BossRaid() {
    const { t } = useTranslation();
    const [boss, setBoss] = useState<BossTemplateDto | null>(null);
    const [activeSub, setActiveSub] = useState<ActiveSubscriptionDto | null>(null);
    const [parties, setParties] = useState<PartyItem[]>([]);
    const [selectedPartyId, setSelectedPartyId] = useState<number | "">("");
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
    const [registerError, setRegisterError] = useState<string | null>(null);

    // Load boss template + subscription + parties in parallel
    useEffect(() => {
        setLoading(true);
        Promise.all([
            mentorApi.getCurrentBoss(),
            mentorApi.getActiveSubscription(),
            partyMentorApi.getMentorParties(),
        ])
            .then(([bossRes, subRes, partiesRes]) => {
                if (bossRes.success) setBoss(bossRes.data ?? null);
                if (subRes.success) setActiveSub(subRes.data ?? null);
                if (partiesRes.success) setParties(partiesRes.data ?? []);
                if (!bossRes.success) setError(t("mentor.bossRaid.couldNotLoad"));
            })
            .catch((e) => setError(e?.response?.data?.message || t("mentor.bossRaid.failedToLoad")))
            .finally(() => setLoading(false));
    }, []);

    // Load party raid status + extra data when party changes
    const fetchPartyStatus = useCallback(async (partyId: number) => {
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
                // Load shared HP + activity in parallel
                const [hpRes, actRes] = await Promise.all([
                    mentorApi.getSharedHp(status.raidId).catch(() => null),
                    mentorApi.getPartyActivity(partyId).catch(() => null),
                ]);
                if (hpRes?.success) setSharedHp(hpRes.data ?? null);
                if (actRes?.success) setActivity(actRes.data ?? []);
                // Load chest only if boss is defeated
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
    }, []);

    useEffect(() => {
        if (selectedPartyId) {
            fetchPartyStatus(selectedPartyId as number);
            setRegisterResult(null);
        } else {
            setPartyStatus(null);
            setSharedHp(null);
            setWeeklyChest(null);
            setActivity([]);
        }
    }, [selectedPartyId, fetchPartyStatus]);

    const handleRegister = async () => {
        if (!selectedPartyId || !selectedDifficulty || !boss) return;
        setRegisterLoading(true);
        setRegisterError(null);
        try {
            const res = await mentorApi.registerBossRaid({
                mentorUserId: getMentorId(),
                partyId: selectedPartyId as number,
                bossTemplateId: boss.bossTemplateId,
                difficulty: selectedDifficulty,
            });
            if (res.success && res.data) {
                setRegisterResult(res.data);
                fetchPartyStatus(selectedPartyId as number);
            } else {
                setRegisterError(res.message || t("mentor.bossRaid.registrationFailed"));
            }
        } catch (e: any) {
            setRegisterError(e?.response?.data?.message || t("mentor.bossRaid.unexpectedError"));
        } finally {
            setRegisterLoading(false);
        }
    };

    const handleClaimChest = async () => {
        if (!selectedPartyId || claimSuccess) return;
        setClaimLoading(true);
        try {
            const res = await mentorApi.claimWeeklyChest(selectedPartyId as number);
            if (res.success) {
                setWeeklyChest(res.data ?? weeklyChest);
                setClaimSuccess(true);
            }
        } catch { /* silent */ } finally {
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

    const DIFF_COLORS: Record<BossMode, { active: string; inactive: string }> = {
        Easy:   { active: "bg-emerald-400",  inactive: "bg-emerald-100" },
        Normal: { active: "bg-amber-400",    inactive: "bg-amber-100"   },
        Hard:   { active: "bg-red-500 text-white", inactive: "bg-red-100" },
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64"><Spinner size={40} /></div>
        );
    }

    return (
        <>
            <PageMeta title="Boss Raid — HabitEvolve" description="Register your party for the weekly boss" />
            <PageBreadcrumb pageTitle={t("mentor.bossRaid.pageTitle")} />

            {error && (
                <div className="mb-6 p-4 bg-red-100 border-4 border-red-400 rounded-2xl font-bold text-red-700">
                    {error}
                </div>
            )}

            {/* ── Boss Banner ─────────────────────────────────────────────── */}
            {boss ? (
                <div className="mb-8 p-6 bg-[#FEE2E2] border-4 border-black rounded-2xl shadow-[6px_6px_0_0_#1A1D20]">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="text-4xl">💀</span>
                                <h1 className="text-3xl font-black">{boss.themeName}</h1>
                                <span className={`px-2 py-0.5 text-xs font-black border-2 border-black rounded-full ${boss.status === "Published" ? "bg-emerald-400 text-emerald-900" : "bg-gray-200"}`}>
                                    {boss.status}
                                </span>
                            </div>
                            {boss.description && (
                                <p className="text-gray-600 font-medium mb-3 max-w-xl">{boss.description}</p>
                            )}
                            {/* Week + time windows */}
                            <div className="flex flex-wrap gap-2 text-xs font-bold text-gray-700">
                                <span className="px-2 py-1 bg-white border-2 border-black rounded-full">
                                    📅 {boss.activeWeekStart} → {boss.activeWeekEnd}
                                </span>
                                {boss.startTime && (
                                    <span className="px-2 py-1 bg-white border-2 border-black rounded-full">
                                        ⏰ {boss.startTime} — {boss.endTime}
                                    </span>
                                )}
                                {boss.registrationWindow && (
                                    <span className="px-2 py-1 bg-white border-2 border-black rounded-full" title="Cửa sổ đăng ký chuẩn">
                                        📋 Đăng ký: {boss.registrationWindow}
                                    </span>
                                )}
                                {boss.lateRegistrationWindow && (
                                    <span className="px-2 py-1 bg-amber-100 border-2 border-amber-400 rounded-full" title="Đăng ký muộn">
                                        ⚠️ Muộn: {boss.lateRegistrationWindow}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Subscription info panel */}
                        {activeSub && (
                            <div className="bg-white border-4 border-black rounded-xl shadow-[4px_4px_0_0_#1A1D20] px-5 py-4 min-w-40 space-y-2">
                                <div className="text-center">
                                    <p className="text-xs font-black uppercase tracking-wider text-gray-500">{t("mentor.bossRaid.yourTier")}</p>
                                    <p className="text-2xl font-black">{activeSub.package.name}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{allowedModes.join(" · ")}</p>
                                </div>
                                {allowedProofTypes.length > 0 && (
                                    <div className="text-xs text-gray-600 text-center">
                                        <span className="font-bold">Proof: </span>{allowedProofTypes.join(", ")}
                                    </div>
                                )}
                                {aiVerificationModes.length > 0 && (
                                    <div className="flex items-center justify-center gap-1 text-xs font-bold text-violet-700">
                                        🤖 AI: {aiVerificationModes.join(", ")}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Mode cards */}
                    {boss.modes && boss.modes.length > 0 && (
                        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {boss.modes.map((mode) => {
                                const allowed = isModeAllowed(mode);
                                const hasAi = aiVerificationModes.includes(mode.mode);
                                return (
                                    <div
                                        key={mode.mode}
                                        className={`p-4 border-2 rounded-xl text-sm font-medium ${allowed ? "bg-white border-black" : "bg-gray-50 border-gray-300 opacity-60"}`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-black">{mode.mode}</span>
                                                {hasAi && <span className="text-xs text-violet-600 font-bold">🤖 AI</span>}
                                            </div>
                                            {!allowed && (
                                                <span className="text-xs font-black text-gray-400">🔒 {mode.minTier}+</span>
                                            )}
                                        </div>
                                        <div className="space-y-1 text-xs text-gray-600">
                                            <div className="flex justify-between"><span>{t("mentor.bossRaid.bossHp")}</span><span className="font-black">{mode.bossHp.toLocaleString()}</span></div>
                                            <div className="flex justify-between"><span>{t("mentor.bossRaid.partySize")}</span><span className="font-black">{mode.partyMin}–{mode.partyMax}</span></div>
                                            <div className="flex justify-between"><span>{t("mentor.bossRaid.maxDmgPerQuest")}</span><span className="font-black">{mode.maxDamagePerQuest}</span></div>
                                            <div className="flex justify-between"><span>M-Gold cap</span><span className="font-black">{mode.mGoldRewardCapPerQuest}</span></div>
                                            <div className="flex justify-between"><span>{t("mentor.bossRaid.rewardTier")}</span><span className="font-black">{mode.rewardTier}</span></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div className="mb-8 p-8 bg-gray-100 border-4 border-gray-300 rounded-2xl text-center">
                    <p className="text-xl font-black text-gray-400">{t("mentor.bossRaid.noActiveBoss")}</p>
                    <p className="text-sm text-gray-400 mt-1">{t("mentor.bossRaid.checkBack")}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ── Registration Form ──────────────────────────────────── */}
                <div className="bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] p-6">
                    <h2 className="text-xl font-black mb-5">{t("mentor.bossRaid.registerParty")}</h2>

                    <div className="mb-4">
                        <label className="block text-xs font-black uppercase tracking-wider mb-1.5">{t("mentor.bossRaid.selectParty")}</label>
                        <select
                            value={selectedPartyId}
                            onChange={(e) => {
                                setSelectedPartyId(e.target.value ? parseInt(e.target.value) : "");
                                setSelectedDifficulty("");
                            }}
                            className="w-full px-3 py-2.5 border-2 border-black rounded-xl text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-red-300"
                        >
                            <option value="">{t("mentor.bossRaid.chooseParty")}</option>
                            {parties.map((p) => (
                                <option key={p.partyId} value={p.partyId}>
                                    {p.name} ({p.memberCount} members)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="mb-6">
                        <label className="block text-xs font-black uppercase tracking-wider mb-1.5">{t("mentor.bossRaid.difficultyMode")}</label>
                        {boss && boss.modes.length > 0 ? (
                            <div className="flex gap-2">
                                {(["Easy", "Normal", "Hard"] as BossMode[]).map((diff) => {
                                    const modeConfig = boss.modes.find((m) => m.mode === diff);
                                    const enabled = modeConfig ? isModeAllowed(modeConfig) : false;
                                    const c = DIFF_COLORS[diff];
                                    const isSelected = selectedDifficulty === diff;
                                    return (
                                        <button
                                            key={diff}
                                            disabled={!enabled}
                                            onClick={() => setSelectedDifficulty(diff)}
                                            className={`flex-1 py-3 border-2 border-black rounded-xl font-black text-sm transition-all ${
                                                isSelected
                                                    ? `${c.active} shadow-none translate-x-0.5 translate-y-0.5`
                                                    : enabled
                                                        ? `${c.inactive} shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75`
                                                        : "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                                            }`}
                                        >
                                            {diff}
                                            {!enabled && <span className="block text-[10px] font-medium">🔒 {t("mentor.bossRaid.locked")}</span>}
                                            {enabled && aiVerificationModes.includes(diff) && (
                                                <span className="block text-[10px] font-medium text-violet-600">🤖 AI</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 font-medium">{t("mentor.bossRaid.noModesAvailable")}</p>
                        )}
                    </div>

                    {registerError && (
                        <div className="mb-4 p-3 bg-red-100 border-2 border-red-400 rounded-xl text-sm font-bold text-red-700">
                            {registerError}
                        </div>
                    )}

                    <button
                        onClick={handleRegister}
                        disabled={registerLoading || !selectedPartyId || !selectedDifficulty || !boss}
                        className="w-full py-3.5 border-2 border-black rounded-full font-black text-sm bg-red-500 text-white shadow-[4px_4px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[4px_4px_0_0_#1A1D20] transition-all inline-flex items-center justify-center gap-2"
                    >
                        {registerLoading ? <><Spinner size={16} /> {t("mentor.bossRaid.registering")}</> : t("mentor.bossRaid.registerBtn")}
                    </button>

                    {/* Registration success */}
                    {registerResult && (
                        <div className="mt-4 p-4 bg-emerald-100 border-4 border-emerald-400 rounded-xl space-y-1">
                            <p className="font-black text-emerald-800 mb-2">{t("mentor.bossRaid.registrationSuccess")}</p>
                            {[
                                [t("mentor.bossRaid.party"), registerResult.partyName],
                                [t("mentor.bossRaid.boss"), registerResult.bossName],
                                [t("mentor.bossRaid.difficulty"), registerResult.difficulty],
                                ["Boss HP", `${registerResult.maxHp.toLocaleString()} HP`],
                                ["Shared HP", `${registerResult.sharedHpCurrent} / ${registerResult.sharedHpMax}`],
                                [t("mentor.bossRaid.rewardTier"), registerResult.rewardTier],
                            ].map(([k, v]) => (
                                <div key={k} className="flex justify-between text-sm text-emerald-700 font-medium">
                                    <span>{k}</span><strong>{v}</strong>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Party Raid Status ──────────────────────────────────── */}
                <div className="bg-[#1a1a2e] border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] p-6 text-white">
                    <h2 className="text-xl font-black mb-5 text-white">
                        {t("mentor.bossRaid.raidStatus")}
                        {statusLoading && <span className="ml-2 inline-flex opacity-60"><Spinner size={16} /></span>}
                    </h2>

                    {!selectedPartyId ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-500">
                            <span className="text-4xl">⚔️</span>
                            <p className="text-sm font-medium">{t("mentor.bossRaid.selectPartyToSeeStatus")}</p>
                        </div>
                    ) : statusLoading ? (
                        <div className="flex items-center justify-center h-48"><Spinner size={32} /></div>
                    ) : partyStatus ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="font-black text-lg">{partyStatus.bossName}</span>
                                <span className={`px-2 py-0.5 text-xs font-black border-2 border-current rounded-full ${
                                    partyStatus.status === "Active" ? "text-emerald-400" :
                                    partyStatus.status === "Defeated" ? "text-amber-400" : "text-red-400"
                                }`}>{partyStatus.status}</span>
                            </div>

                            <HpBar current={partyStatus.currentHp} max={partyStatus.maxHp} />

                            {/* Shared HP bar */}
                            {sharedHp && (
                                <div>
                                    <HpBar
                                        current={sharedHp.sharedHpCurrent}
                                        max={sharedHp.sharedHpMax}
                                        label="Shared HP"
                                        color="bg-blue-400"
                                    />
                                    <p className={`text-xs font-bold mt-1 ${RISK_COLORS[sharedHp.riskLevel] ?? "text-gray-400"}`}>
                                        Risk: {sharedHp.riskLevel}
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                {[
                                    [t("mentor.bossRaid.difficulty"), partyStatus.difficulty],
                                    [t("mentor.bossRaid.totalDamage"), partyStatus.totalDamageDealt.toLocaleString()],
                                    [t("mentor.bossRaid.rewardTier"), partyStatus.rewardTier],
                                    [t("mentor.bossRaid.weekEnds"), new Date(partyStatus.weekEndDate).toLocaleDateString()],
                                ].map(([k, v]) => (
                                    <div key={k} className="bg-white/10 rounded-xl p-3">
                                        <p className="text-gray-400 text-xs font-medium">{k}</p>
                                        <p className="font-black">{v}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Participants */}
                            {partyStatus.participants && partyStatus.participants.length > 0 && (
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2">{t("mentor.bossRaid.participants")}</p>
                                    <div className="space-y-1.5">
                                        {partyStatus.participants.map((p, i) => (
                                            <div key={p.userId} className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-2 text-sm">
                                                <span className="font-bold text-gray-300">#{i + 1} User {p.userId}</span>
                                                <div className="flex gap-4">
                                                    <span className="text-red-400 font-black">{p.damageDealt} dmg</span>
                                                    <span className="text-emerald-400 font-black">{p.questsCompleted} ✓</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recent Activity */}
                            {activity.length > 0 && (
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2">📜 Recent Activity</p>
                                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                        {activity.map((a, i) => (
                                            <div key={i} className="bg-white/5 rounded-lg px-3 py-1.5 text-xs">
                                                <span className="text-emerald-400 font-bold">{a.username}</span>
                                                <span className="text-gray-400"> · {a.questTitle} · </span>
                                                <span className="text-red-400 font-bold">-{a.damageDealt} HP</span>
                                                <span className="text-gray-500 ml-2">({a.bossHpAfter.toLocaleString()} left)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Weekly Chest — shown when boss is defeated */}
                            {partyStatus.status === "Defeated" && weeklyChest && (
                                <div className="mt-2 p-4 bg-amber-500/20 border-2 border-amber-400 rounded-xl">
                                    <p className="font-black text-amber-300 mb-2">🎁 Weekly Chest</p>
                                    <div className="space-y-1 text-xs font-medium text-gray-300">
                                        <div className="flex justify-between"><span>Gold</span><span className="font-black text-yellow-400">{weeklyChest.goldReward.toLocaleString()}</span></div>
                                        <div className="flex justify-between"><span>M-Gold</span><span className="font-black text-amber-400">{weeklyChest.mgoldReward.toLocaleString()}</span></div>
                                        <div className="flex justify-between"><span>Badge</span><span className="font-black">🏅 {weeklyChest.badge}</span></div>
                                        <div className="flex justify-between text-gray-400">
                                            <span>Claimed</span><span>{weeklyChest.claimedCount} / {weeklyChest.eligibleMemberCount}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleClaimChest}
                                        disabled={claimLoading || weeklyChest.alreadyClaimed || claimSuccess}
                                        className="mt-3 w-full py-2 border-2 border-amber-400 rounded-full font-black text-sm bg-amber-400 text-black hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-2"
                                    >
                                        {claimLoading ? <><Spinner size={14} /> Claiming…</> :
                                         weeklyChest.alreadyClaimed || claimSuccess ? "✓ Claimed" : "Claim Reward"}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-500">
                            <span className="text-4xl">💤</span>
                            <p className="text-sm font-medium">{t("mentor.bossRaid.notRegistered")}</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

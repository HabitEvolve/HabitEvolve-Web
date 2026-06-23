import { useState, useEffect, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import mentorApi from "../../api/mentorApi";
import partyMentorApi from "../../api/mentorPartyApi";
import type { PartyItem } from "../../types/api.types";
import type {
    BossTemplateDto,
    BossModeConfigDto,
    WeeklyBossSubscriptionDto,
    WeeklyBossStatusDto,
    WeeklyBossRegisterResultDto,
    BossMode,
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
const HpBar = ({ current, max }: { current: number; max: number }) => {
    const pct = max > 0 ? Math.max(0, Math.min((current / max) * 100, 100)) : 0;
    const color = pct > 50 ? "bg-red-500" : pct > 25 ? "bg-amber-400" : "bg-emerald-500";
    return (
        <div>
            <div className="flex justify-between text-xs font-black mb-1.5">
                <span>Boss HP</span>
                <span>{current.toLocaleString()} / {max.toLocaleString()}</span>
            </div>
            <div className="h-5 bg-gray-200 border-2 border-black rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
};

const TIER_ORDER: Record<string, number> = { Free: 0, Basic: 1, Premium: 2 };

// ── PAGE ──────────────────────────────────────────────────────────────────────
export default function BossRaid() {
    const [boss, setBoss] = useState<BossTemplateDto | null>(null);
    const [bossSubscription, setBossSubscription] = useState<WeeklyBossSubscriptionDto | null>(null);
    const [parties, setParties] = useState<PartyItem[]>([]);
    const [selectedPartyId, setSelectedPartyId] = useState<number | "">("");
    const [selectedDifficulty, setSelectedDifficulty] = useState<BossMode | "">("");
    const [partyStatus, setPartyStatus] = useState<WeeklyBossStatusDto | null>(null);
    const [registerResult, setRegisterResult] = useState<WeeklyBossRegisterResultDto | null>(null);

    const [loading, setLoading] = useState(true);
    const [statusLoading, setStatusLoading] = useState(false);
    const [registerLoading, setRegisterLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [registerError, setRegisterError] = useState<string | null>(null);

    // Load initial data
    useEffect(() => {
        setLoading(true);
        Promise.all([
            mentorApi.getCurrentBoss(),
            mentorApi.getBossSubscription(),
            partyMentorApi.getMentorParties(),
        ])
            .then(([bossRes, subRes, partiesRes]) => {
                if (bossRes.success) setBoss(bossRes.data ?? null);
                if (subRes.success) setBossSubscription(subRes.data ?? null);
                if (partiesRes.success) setParties(partiesRes.data ?? []);
                if (!bossRes.success) setError("Could not load boss template.");
            })
            .catch((e) => setError(e?.response?.data?.message || "Failed to load boss data."))
            .finally(() => setLoading(false));
    }, []);

    // Load party raid status when party changes
    const fetchPartyStatus = useCallback(async (partyId: number) => {
        setStatusLoading(true);
        setPartyStatus(null);
        try {
            const res = await mentorApi.getPartyBossStatus(partyId);
            if (res.success) setPartyStatus(res.data ?? null);
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
                setRegisterError(res.message || "Registration failed.");
            }
        } catch (e: any) {
            setRegisterError(e?.response?.data?.message || "An unexpected error occurred.");
        } finally {
            setRegisterLoading(false);
        }
    };

    // Determine which modes the mentor can access
    const allowedModes = bossSubscription?.bossModes ?? [];
    const isModeAllowed = (modeConfig: BossModeConfigDto): boolean => {
        if (!bossSubscription) return false;
        const mentorTierLevel = TIER_ORDER[bossSubscription.tier] ?? 0;
        const requiredTierLevel = TIER_ORDER[modeConfig.minTier] ?? 0;
        return mentorTierLevel >= requiredTierLevel && allowedModes.includes(modeConfig.mode);
    };

    const DIFF_COLORS: Record<BossMode, { active: string; inactive: string; border: string }> = {
        Easy:   { active: "bg-emerald-400",  inactive: "bg-emerald-100",  border: "border-emerald-500" },
        Normal: { active: "bg-amber-400",    inactive: "bg-amber-100",    border: "border-amber-500" },
        Hard:   { active: "bg-red-500 text-white", inactive: "bg-red-100", border: "border-red-500" },
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner size={40} />
            </div>
        );
    }

    return (
        <>
            <PageMeta title="Boss Raid — HabitEvolve" description="Register your party for the weekly boss" />
            <PageBreadcrumb pageTitle="Boss Raid" />

            {error && (
                <div className="mb-6 p-4 bg-red-100 border-4 border-red-400 rounded-2xl font-bold text-red-700">
                    {error}
                </div>
            )}

            {/* Boss Banner */}
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
                            <div className="flex flex-wrap gap-3 text-xs font-bold text-gray-700">
                                <span className="px-2 py-1 bg-white border-2 border-black rounded-full">
                                    📅 {boss.activeWeekStart} → {boss.activeWeekEnd}
                                </span>
                                <span className="px-2 py-1 bg-white border-2 border-black rounded-full">
                                    ⏰ {boss.startTime} — {boss.endTime}
                                </span>
                            </div>
                        </div>

                        {/* Subscription tier */}
                        {bossSubscription && (
                            <div className="bg-white border-4 border-black rounded-xl shadow-[4px_4px_0_0_#1A1D20] px-5 py-4 text-center min-w-[130px]">
                                <p className="text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Your Tier</p>
                                <p className="text-2xl font-black">{bossSubscription.tier}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {bossSubscription.bossModes.join(" · ")}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Mode cards */}
                    {boss.modes && boss.modes.length > 0 && (
                        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {boss.modes.map((mode) => {
                                const allowed = isModeAllowed(mode);
                                return (
                                    <div
                                        key={mode.mode}
                                        className={`p-4 border-2 rounded-xl text-sm font-medium ${allowed ? "bg-white border-black" : "bg-gray-50 border-gray-300 opacity-60"}`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-black">{mode.mode}</span>
                                            {!allowed && (
                                                <span className="text-xs font-black text-gray-400">
                                                    🔒 {mode.minTier}+
                                                </span>
                                            )}
                                        </div>
                                        <div className="space-y-1 text-xs text-gray-600">
                                            <div className="flex justify-between"><span>Boss HP</span><span className="font-black">{mode.bossHp.toLocaleString()}</span></div>
                                            <div className="flex justify-between"><span>Party Size</span><span className="font-black">{mode.partyMin}–{mode.partyMax}</span></div>
                                            <div className="flex justify-between"><span>Max Dmg/Quest</span><span className="font-black">{mode.maxDamagePerQuest}</span></div>
                                            <div className="flex justify-between"><span>Reward Tier</span><span className="font-black">{mode.rewardTier}</span></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div className="mb-8 p-8 bg-gray-100 border-4 border-gray-300 rounded-2xl text-center">
                    <p className="text-xl font-black text-gray-400">No active boss this week</p>
                    <p className="text-sm text-gray-400 mt-1">Check back when the next boss template is published.</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Registration Form */}
                <div className="bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] p-6">
                    <h2 className="text-xl font-black mb-5">Register Party</h2>

                    {/* Party selector */}
                    <div className="mb-4">
                        <label className="block text-xs font-black uppercase tracking-wider mb-1.5">Select Party</label>
                        <select
                            value={selectedPartyId}
                            onChange={(e) => {
                                setSelectedPartyId(e.target.value ? parseInt(e.target.value) : "");
                                setSelectedDifficulty("");
                            }}
                            className="w-full px-3 py-2.5 border-2 border-black rounded-xl text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-red-300"
                        >
                            <option value="">— Choose a party —</option>
                            {parties.map((p) => (
                                <option key={p.partyId} value={p.partyId}>
                                    {p.name} ({p.memberCount} members)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Difficulty selector */}
                    <div className="mb-6">
                        <label className="block text-xs font-black uppercase tracking-wider mb-1.5">Difficulty Mode</label>
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
                                            className={`flex-1 py-3 border-2 border-black rounded-xl font-black text-sm transition-all ${isSelected
                                                ? `${c.active} shadow-none translate-x-0.5 translate-y-0.5`
                                                : enabled
                                                    ? `${c.inactive} shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75`
                                                    : "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                                                }`}
                                        >
                                            {diff}
                                            {!enabled && <span className="block text-[10px] font-medium">🔒 Locked</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 font-medium">No difficulty modes available.</p>
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
                        {registerLoading ? (
                            <><Spinner size={16} /> Registering…</>
                        ) : (
                            "⚔️ Register for Boss Raid"
                        )}
                    </button>

                    {registerResult && (
                        <div className="mt-4 p-4 bg-emerald-100 border-4 border-emerald-400 rounded-xl">
                            <p className="font-black text-emerald-800 mb-1">Registration Successful! ⚔️</p>
                            <div className="text-sm text-emerald-700 font-medium space-y-0.5">
                                <p>Party: <strong>{registerResult.partyName}</strong></p>
                                <p>Boss: <strong>{registerResult.bossName}</strong></p>
                                <p>Difficulty: <strong>{registerResult.difficulty}</strong></p>
                                <p>Boss HP: <strong>{registerResult.maxHp.toLocaleString()}</strong></p>
                                <p>Reward Tier: <strong>{registerResult.rewardTier}</strong></p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Party Raid Status */}
                <div className="bg-[#1a1a2e] border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] p-6 text-white">
                    <h2 className="text-xl font-black mb-5 text-white">
                        Raid Status
                        {statusLoading && <span className="ml-2 inline-flex opacity-60"><Spinner size={16} /></span>}
                    </h2>

                    {!selectedPartyId ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-500">
                            <span className="text-4xl">⚔️</span>
                            <p className="text-sm font-medium">Select a party to see their raid status</p>
                        </div>
                    ) : statusLoading ? (
                        <div className="flex items-center justify-center h-48">
                            <Spinner size={32} />
                        </div>
                    ) : partyStatus ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="font-black text-lg">{partyStatus.bossName}</span>
                                <span className={`px-2 py-0.5 text-xs font-black border-2 border-current rounded-full ${partyStatus.status === "Active" ? "text-emerald-400" : partyStatus.status === "Defeated" ? "text-amber-400" : "text-red-400"}`}>
                                    {partyStatus.status}
                                </span>
                            </div>

                            <div className="px-1">
                                <HpBar current={partyStatus.currentHp} max={partyStatus.maxHp} />
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                {[
                                    ["Difficulty", partyStatus.difficulty],
                                    ["Total Damage", partyStatus.totalDamageDealt.toLocaleString()],
                                    ["Reward Tier", partyStatus.rewardTier],
                                    ["Week Ends", new Date(partyStatus.weekEndDate).toLocaleDateString()],
                                ].map(([k, v]) => (
                                    <div key={k} className="bg-white/10 rounded-xl p-3">
                                        <p className="text-gray-400 text-xs font-medium">{k}</p>
                                        <p className="font-black">{v}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Participant list */}
                            {partyStatus.participants && partyStatus.participants.length > 0 && (
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2">Participants</p>
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
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-500">
                            <span className="text-4xl">💤</span>
                            <p className="text-sm font-medium">Party hasn't registered for this week's boss yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

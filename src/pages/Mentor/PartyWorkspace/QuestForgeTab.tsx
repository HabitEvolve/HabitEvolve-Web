import { useState, useEffect } from "react";
import { useOutletContext } from "react-router";
import { Trans, useTranslation } from "react-i18next";
import mentorApi from "../../../api/mentorApi";
import partyMentorApi from "../../../api/mentorPartyApi";
import { useAlert } from "../../../context/AlertContext";
import { inkBorder, shadowSm, shadowMd, easeExpo, getMentorId, Spinner } from "./shared";
import type { PartyWorkspaceContext } from "./PartyWorkspace";
import type { PartyMember } from "../../../types/api.types";
import type {
    QuestDifficulty,
    MentorQuestRangeDto,
    ActiveSubscriptionDto,
    CreateMentorQuestRequest,
    CreatePartyQuestRequest,
} from "../../../types/mentor.types";

// Orange is this tab's signature accent (Quest Forge), consistent with the
// "each Mentor feature gets its own accent inside the shared system" pattern.
const inputCls =
    `w-full p-3 border-[3px] ${inkBorder} rounded-xl text-sm font-medium bg-gray-25 dark:bg-gray-800 ` +
    `focus:outline-none focus:ring-4 focus:ring-orange-200 dark:focus:ring-orange-500/20 placeholder:text-gray-400`;
const chipInactive = `bg-gray-25 dark:bg-gray-800 text-gray-700 ${shadowSm} hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5`;
const chipActive = "bg-orange-500 text-white shadow-none translate-x-0.5 translate-y-0.5";

const DIFFICULTIES: QuestDifficulty[] = ["EASY", "NORMAL", "HARD"];
const DIFF_STYLE: Record<QuestDifficulty, { active: string; inactive: string; label: string }> = {
    EASY:   { active: "bg-success-400 text-success-900", inactive: "bg-success-50 dark:bg-success-500/10 text-success-700 dark:text-success-300", label: "Easy" },
    NORMAL: { active: "bg-warning-400 text-warning-900", inactive: "bg-warning-50 dark:bg-warning-500/10 text-warning-700 dark:text-warning-300", label: "Normal" },
    HARD:   { active: "bg-error-500 text-white",         inactive: "bg-error-50 dark:bg-error-500/10 text-error-700 dark:text-error-300",           label: "Hard" },
};

// ── FORM DEFAULTS ─────────────────────────────────────────────────────────────
const emptyForm = {
    title: "",
    description: "",
    difficulty: "NORMAL" as QuestDifficulty,
    damage: 70,
    rewardMGold: 30,
    proofType: "PHOTO",
    isMandatory: false,
    deadlineAt: "",
};

type AssignMode = "individual" | "party";

// ── LIMITS PANEL ──────────────────────────────────────────────────────────────
interface LimitsPanelProps {
    activeSub: ActiveSubscriptionDto | null;
    ranges: MentorQuestRangeDto[];
    selectedDifficulty: QuestDifficulty;
}

const LimitsPanel = ({ activeSub, ranges, selectedDifficulty }: LimitsPanelProps) => {
    const range = ranges.find((r) => r.difficulty === selectedDifficulty);
    const pkg = activeSub?.package;
    const usage = activeSub?.usage;

    return (
        <div className={`bg-purple-100 dark:bg-purple-500/15 border-4 ${inkBorder} rounded-2xl ${shadowMd} p-5`}>
            <h3 className="inline-flex items-center gap-1.5 text-sm font-black uppercase tracking-wider mb-3">
                <img src="/icon/Main/Stats/64px/Stats 1st 64px.png" alt="" className="w-4 h-4 object-contain" /> Limits & Ranges
            </h3>

            {range && (
                <div className={`mb-3 p-3 bg-gray-25 dark:bg-gray-800 border-2 border-purple-300 dark:border-purple-500/40 rounded-xl space-y-1`}>
                    <p className="text-xs font-black text-purple-600 dark:text-purple-300 uppercase">{selectedDifficulty} Range</p>
                    <div className="flex justify-between text-xs font-medium">
                        <span className="text-gray-500">Damage</span>
                        <span className="font-black">{range.damageMin} – {range.damageMax}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium">
                        <span className="text-gray-500">M-Gold</span>
                        <span className="font-black">{range.mGoldMin} – {range.mGoldMax}</span>
                    </div>
                </div>
            )}

            {pkg && (
                <div className="space-y-2">
                    {[
                        ["Plan", pkg.name],
                        ["Boss Modes", pkg.bossModes],
                        ["Proof Types", pkg.proofTypes],
                        ["AI Verification", pkg.aiVerificationBossModes || "—"],
                        ["Quest/member/day", `${usage?.questsAssignedToday ?? 0} / ${pkg.questsPerMemberPerDay}`],
                        ["Party quest/week", `${usage?.partyQuestsThisWeek ?? 0} / ${pkg.partyQuestsPerWeek}`],
                    ].map(([k, v]) => (
                        <div key={k} className="flex justify-between text-xs font-medium">
                            <span className="text-gray-500">{k}</span>
                            <span className="font-black text-right max-w-28 wrap-break-word">{v}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── PLAYER PREVIEW ────────────────────────────────────────────────────────────
interface PreviewProps {
    form: typeof emptyForm;
    currentRange?: MentorQuestRangeDto;
    assignMode: AssignMode;
    targetLabel: string;
}

const QuestPreview = ({ form, assignMode, targetLabel }: PreviewProps) => {
    const { t } = useTranslation();
    const diff = DIFF_STYLE[form.difficulty];
    const hasContent = form.title.trim().length > 0;

    return (
        <div className={`sticky top-6 bg-gray-25 dark:bg-gray-800 border-4 ${inkBorder} rounded-2xl ${shadowMd} p-5`}>
            <span className="inline-block text-[11px] font-black uppercase tracking-[0.14em] text-orange-600 dark:text-orange-300 mb-2">
                {t("mentor.questCommand.forge.previewKicker")}
            </span>
            <h3 className="text-sm font-black mb-3">{t("mentor.questCommand.forge.previewTitle")}</h3>

            <div className={`border-[3px] ${inkBorder} rounded-2xl p-4 bg-orange-50 dark:bg-orange-500/10 ${shadowSm}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className={`font-black text-base leading-tight ${hasContent ? "text-gray-900" : "text-gray-400 italic"}`}>
                        {hasContent ? form.title : t("mentor.questCommand.forge.previewUntitled")}
                    </h4>
                    <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full border-2 ${inkBorder} ${diff.inactive}`}>
                        {diff.label}
                    </span>
                </div>
                <p className="text-xs text-gray-600 font-medium mb-3 wrap-break-word">
                    {form.description.trim() || t("mentor.questCommand.forge.previewNoDescription")}
                </p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 ${inkBorder} bg-gray-25 dark:bg-gray-900`}>
                        <img src="/icon/Item/Sword/64px/Sword 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" />
                        <span className="text-xs font-black text-error-600 dark:text-error-300">-{form.damage}</span>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 ${inkBorder} bg-gray-25 dark:bg-gray-900`}>
                        <img src="/icon/Currency/Coin/64px/Golden Coin 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" />
                        <span className="text-xs font-black text-amber-700 dark:text-amber-300">+{form.rewardMGold}</span>
                    </div>
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-500">
                    <span className="inline-flex items-center gap-1"><img src="/icon/Item/Target/64px/Golden Target 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> {targetLabel}</span>
                    {form.isMandatory && (
                        <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-300"><img src="/icon/UI/Warning/64px/Warning 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> {t("mentor.questCommand.forge.previewMandatoryBadge")}</span>
                    )}
                </div>
                <div className="mt-2 pt-2 border-t-2 border-dashed border-game-outline/20 dark:border-brand-300/20 text-[11px] font-medium text-gray-500 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1">
                        <img src={assignMode === "individual" ? "/icon/Player/Player/64px/Player 1st 64px.png" : "/icon/Item/Sword/64px/Sword 1st 64px.png"} alt="" className="w-3.5 h-3.5 object-contain" />
                        {form.proofType.replace(/_/g, " ")}
                    </span>
                    <span>{form.deadlineAt ? new Date(form.deadlineAt).toLocaleDateString() : t("mentor.questCommand.forge.previewDeadlineNone")}</span>
                </div>
            </div>

            {!hasContent && (
                <p className="text-xs text-gray-400 font-medium text-center mt-3">
                    {t("mentor.questCommand.forge.previewEmpty")}
                </p>
            )}
        </div>
    );
};

// ── TAB ───────────────────────────────────────────────────────────────────────
export default function QuestForgeTab() {
    const { party, partyId } = useOutletContext<PartyWorkspaceContext>();
    const { t } = useTranslation();
    const alert = useAlert();

    const [members, setMembers] = useState<PartyMember[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(true);
    const [assignMode, setAssignMode] = useState<AssignMode>("individual");
    const [selectedMemberId, setSelectedMemberId] = useState<number | "">("");
    const [form, setForm] = useState(emptyForm);

    const [activeSub, setActiveSub] = useState<ActiveSubscriptionDto | null>(null);
    const [ranges, setRanges] = useState<MentorQuestRangeDto[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Load static data (subscription/ranges are mentor-wide) + this party's members
    useEffect(() => {
        setLoadingMembers(true);
        Promise.all([
            partyMentorApi.getPartyMembers(partyId),
            mentorApi.getActiveSubscription(),
            mentorApi.getRewardRanges(),
        ]).then(([membersRes, subRes, rangesRes]) => {
            if (membersRes.success) setMembers(membersRes.data ?? []);
            if (subRes.success) setActiveSub(subRes.data ?? null);
            if (rangesRes.success) setRanges(rangesRes.data ?? []);
        }).finally(() => setLoadingMembers(false));
    }, [partyId]);

    // Derive allowed proof types from subscription
    const allowedProofTypes: string[] = activeSub?.package?.proofTypes
        ? activeSub.package.proofTypes.split(",").map((s) => s.trim())
        : ["PHOTO", "VIDEO", "TIMER", "SCREENSHOT", "GPS", "STEP_COUNTER", "TEXT_LOG", "SELF_CHECK"];

    // Sync default proof type when subscription loads
    useEffect(() => {
        if (activeSub && allowedProofTypes.length > 0) {
            setForm((prev) => ({
                ...prev,
                proofType: allowedProofTypes.includes(prev.proofType)
                    ? prev.proofType
                    : allowedProofTypes[0],
            }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSub]);

    // Sync damage/rewardMGold defaults when difficulty changes
    const applyRangeDefaults = (difficulty: QuestDifficulty) => {
        const r = ranges.find((x) => x.difficulty === difficulty);
        if (r) {
            setForm((prev) => ({
                ...prev,
                difficulty,
                damage: r.damageMin,
                rewardMGold: r.mGoldMin,
            }));
        } else {
            setForm((prev) => ({ ...prev, difficulty }));
        }
    };

    const handleField = (field: string, value: string | number | boolean) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setFormError(null);
    };

    const buildDeadline = () => {
        if (form.deadlineAt) return new Date(form.deadlineAt).toISOString();
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString();
    };

    const validateRange = (): string | null => {
        const r = ranges.find((x) => x.difficulty === form.difficulty);
        if (!r) return null;
        if (form.damage < r.damageMin || form.damage > r.damageMax) {
            return `Damage phải trong khoảng ${r.damageMin}–${r.damageMax} cho độ khó ${form.difficulty}.`;
        }
        if (form.rewardMGold < r.mGoldMin || form.rewardMGold > r.mGoldMax) {
            return `M-Gold phải trong khoảng ${r.mGoldMin}–${r.mGoldMax} cho độ khó ${form.difficulty}.`;
        }
        return null;
    };

    const handleSubmit = async () => {
        if (!form.title.trim()) { setFormError(t("mentor.questCommand.errors.titleRequired")); return; }
        if (assignMode === "individual" && !selectedMemberId) {
            setFormError(t("mentor.questCommand.errors.selectMember")); return;
        }
        const rangeErr = validateRange();
        if (rangeErr) { setFormError(rangeErr); return; }

        setSubmitting(true);
        setFormError(null);
        try {
            if (assignMode === "individual") {
                const payload: CreateMentorQuestRequest = {
                    mentorUserId: getMentorId(),
                    targetUserId: selectedMemberId as number,
                    partyId,
                    title: form.title,
                    description: form.description || undefined,
                    difficulty: form.difficulty,
                    damage: form.damage,
                    rewardMGold: form.rewardMGold,
                    proofType: form.proofType,
                    isMandatory: form.isMandatory,
                    deadlineAt: buildDeadline(),
                };
                const res = await mentorApi.createMentorQuest(payload);
                if (res.success) {
                    alert.success(t("mentor.questCommand.assignedTo", {
                        username: members.find((m) => m.userId === selectedMemberId)?.username ?? "member",
                    }));
                    setForm(emptyForm);
                } else {
                    alert.error(res.message || t("mentor.questCommand.errors.assignFailed"));
                }
            } else {
                const payload: CreatePartyQuestRequest = {
                    mentorUserId: getMentorId(),
                    partyId,
                    title: form.title,
                    description: form.description || undefined,
                    difficulty: form.difficulty,
                    damage: form.damage,
                    rewardMGold: form.rewardMGold,
                    proofType: form.proofType,
                    isMandatory: form.isMandatory,
                    deadlineAt: buildDeadline(),
                };
                const res = await mentorApi.createPartyQuest(payload);
                if (res.success && res.data) {
                    alert.success(t("mentor.questCommand.fanOutComplete", {
                        count: res.data.memberCount,
                        partyName: res.data.partyName,
                    }));
                    setForm(emptyForm);
                } else {
                    alert.error(res.message || t("mentor.questCommand.errors.fanOutFailed"));
                }
            }
        } catch (e: any) {
            alert.error(e?.response?.data?.message || t("mentor.questCommand.errors.unexpected"));
        } finally {
            setSubmitting(false);
        }
    };

    const currentRange = ranges.find((r) => r.difficulty === form.difficulty);
    const targetLabel = assignMode === "party"
        ? `${party.name} (${members.length})`
        : members.find((m) => m.userId === selectedMemberId)?.username ?? "—";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ── Target + Limits ────────────────────────────────────── */}
            <div className="lg:col-span-3 flex flex-col gap-4 min-w-0">
                <div className={`bg-purple-100 dark:bg-purple-500/15 border-4 ${inkBorder} rounded-2xl ${shadowMd} p-5`}>
                    <h2 className="text-lg font-black mb-4">{t("mentor.questCommand.assignmentMode")}</h2>

                    <div className="flex gap-2">
                        {(["individual", "party"] as AssignMode[]).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => { setAssignMode(mode); setSelectedMemberId(""); }}
                                className={`flex-1 py-2 border-[3px] ${inkBorder} rounded-xl text-xs font-black transition-all duration-150 ${easeExpo} ${
                                    assignMode === mode ? chipActive : chipInactive
                                }`}
                            >
                                {mode === "individual"
                                    ? <span className="inline-flex items-center gap-1.5"><img src="/icon/Player/Player/64px/Player 1st 64px.png" alt="" className="w-4 h-4 object-contain" />{t("mentor.questCommand.individual")}</span>
                                    : <span className="inline-flex items-center gap-1.5"><img src="/icon/Item/Sword/64px/Sword 1st 64px.png" alt="" className="w-4 h-4 object-contain" />{t("mentor.questCommand.fanOut")}</span>
                                }
                            </button>
                        ))}
                    </div>

                    {assignMode === "individual" && (
                        <div className="mt-4 min-w-0">
                            <label className="block text-xs font-black uppercase tracking-wider mb-1">{t("mentor.questCommand.member")}</label>
                            {loadingMembers ? (
                                <div className="flex items-center gap-2 text-sm text-gray-500"><Spinner size={14} /> {t("mentor.questCommand.loadingMembers")}</div>
                            ) : members.length === 0 ? (
                                <p className="text-xs text-gray-500 font-medium">{t("mentor.questCommand.pickMember")}</p>
                            ) : (
                                <>
                                    <p className="text-[11px] text-gray-400 font-medium mb-2">{t("mentor.questCommand.forge.memberChipsHint")}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {members.map((m) => {
                                            const isSelected = selectedMemberId === m.userId;
                                            return (
                                                <button
                                                    key={m.userId}
                                                    type="button"
                                                    onClick={() => setSelectedMemberId(m.userId)}
                                                    aria-label={t("mentor.questCommand.forge.selectMemberAria", { username: m.username })}
                                                    className={`inline-flex items-center gap-1.5 pl-1.5 pr-3 py-1.5 border-[3px] ${inkBorder} rounded-full text-xs font-black transition-all duration-150 ${easeExpo} ${isSelected ? chipActive : chipInactive}`}
                                                >
                                                    <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${isSelected ? "bg-white/25" : "bg-purple-200 dark:bg-purple-500/30"}`}>
                                                        {m.username.charAt(0).toUpperCase()}
                                                    </span>
                                                    {m.username}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {assignMode === "party" && (
                        <div className="mt-4 min-w-0">
                            <div className={`p-3 bg-purple-50 dark:bg-purple-500/10 border-2 border-purple-400 dark:border-purple-500/40 rounded-xl text-sm font-medium text-purple-800 dark:text-purple-200 mb-2`}>
                                <Trans
                                    i18nKey="mentor.questCommand.fanOutInfo"
                                    count={members.length}
                                    components={{ strong: <strong /> }}
                                />
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {members.map((m) => (
                                    <span key={m.userId} className={`inline-flex items-center gap-1 px-2 py-1 border-2 ${inkBorder} rounded-full text-[10px] font-black bg-gray-25 dark:bg-gray-800 text-gray-600 dark:text-gray-300`}>
                                        <span className="w-3.5 h-3.5 rounded-full bg-purple-200 dark:bg-purple-500/30 flex items-center justify-center text-[8px]">
                                            {m.username.charAt(0).toUpperCase()}
                                        </span>
                                        {m.username}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <LimitsPanel activeSub={activeSub} ranges={ranges} selectedDifficulty={form.difficulty} />
            </div>

            {/* ── Quest Forge form ──────────────────────────────────── */}
            <div className="lg:col-span-6 min-w-0">
                <div className={`bg-gray-25 dark:bg-gray-800 border-4 ${inkBorder} rounded-2xl ${shadowMd} p-5 sm:p-6`}>
                    <span className="inline-block text-[11px] font-black uppercase tracking-[0.14em] text-orange-600 dark:text-orange-300 mb-1">
                        {t("mentor.questCommand.forge.kicker")}
                    </span>
                    <h2 className="inline-flex items-center gap-2 text-2xl font-black tracking-tight leading-tight mb-1">
                        <img src="/icon/Main/Fire 2/64w/Fire 64px.png" alt="" className="w-6 h-6 object-contain" /> {t("mentor.questCommand.forge.title")}
                    </h2>
                    <p className="text-xs text-gray-500 font-medium mb-5">{t("mentor.questCommand.forge.subtitle")}</p>

                    <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-2">{t("mentor.questCommand.forge.stepIntel")}</p>
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-xs font-black uppercase tracking-wider mb-1">{t("mentor.questCommand.titleField")} *</label>
                            <input
                                value={form.title}
                                onChange={(e) => handleField("title", e.target.value)}
                                placeholder={t("mentor.questCommand.titlePlaceholder")}
                                className={`${inputCls} text-lg font-black`}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase tracking-wider mb-1">{t("mentor.questCommand.description")}</label>
                            <textarea
                                value={form.description}
                                onChange={(e) => handleField("description", e.target.value)}
                                placeholder={t("mentor.questCommand.descPlaceholder")}
                                rows={2}
                                className={`${inputCls} resize-none`}
                            />
                        </div>
                    </div>

                    <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-2">{t("mentor.questCommand.forge.stepStakes")}</p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black uppercase tracking-wider mb-1.5">Difficulty *</label>
                            <div className="grid grid-cols-3 gap-2">
                                {DIFFICULTIES.map((diff) => {
                                    const s = DIFF_STYLE[diff];
                                    const isSelected = form.difficulty === diff;
                                    return (
                                        <button
                                            key={diff}
                                            type="button"
                                            onClick={() => applyRangeDefaults(diff)}
                                            className={`py-2.5 border-[3px] ${inkBorder} rounded-xl font-black text-sm transition-all duration-150 ${easeExpo} ${
                                                isSelected
                                                    ? `${s.active} shadow-none translate-x-0.5 translate-y-0.5`
                                                    : `${s.inactive} ${shadowSm} hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75`
                                            }`}
                                        >
                                            {s.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="min-w-0">
                                <label className="block text-xs font-black uppercase tracking-wider mb-1">
                                    {t("mentor.questCommand.damage")}
                                    {currentRange && (
                                        <span className="ml-1 text-gray-400 font-medium normal-case">
                                            ({currentRange.damageMin}–{currentRange.damageMax})
                                        </span>
                                    )}
                                </label>
                                <div className="relative">
                                    <img src="/icon/Item/Sword/64px/Sword 1st 64px.png" alt="" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4 object-contain" />
                                    <input
                                        type="number"
                                        min={currentRange?.damageMin ?? 1}
                                        max={currentRange?.damageMax}
                                        value={form.damage}
                                        onChange={(e) => handleField("damage", parseInt(e.target.value) || 0)}
                                        className={`${inputCls} pl-9`}
                                    />
                                </div>
                            </div>
                            <div className="min-w-0">
                                <label className="block text-xs font-black uppercase tracking-wider mb-1">
                                    M-Gold Reward
                                    {currentRange && (
                                        <span className="ml-1 text-gray-400 font-medium normal-case">
                                            ({currentRange.mGoldMin}–{currentRange.mGoldMax})
                                        </span>
                                    )}
                                </label>
                                <div className="relative">
                                    <img src="/icon/Currency/Coin/64px/Golden Coin 1st 64px.png" alt="" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4 object-contain" />
                                    <input
                                        type="number"
                                        min={currentRange?.mGoldMin ?? 1}
                                        max={currentRange?.mGoldMax}
                                        value={form.rewardMGold}
                                        onChange={(e) => handleField("rewardMGold", parseInt(e.target.value) || 0)}
                                        className={`${inputCls} pl-9`}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-2">{t("mentor.questCommand.forge.deploymentDetails")}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="min-w-0">
                                    <label className="block text-xs font-black uppercase tracking-wider mb-1">{t("mentor.questCommand.proofType")}</label>
                                    <select
                                        value={form.proofType}
                                        onChange={(e) => handleField("proofType", e.target.value)}
                                        className={inputCls}
                                    >
                                        {allowedProofTypes.map((pt) => (
                                            <option key={pt} value={pt}>{pt.replace(/_/g, " ")}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="min-w-0">
                                    <label className="block text-xs font-black uppercase tracking-wider mb-1">{t("mentor.questCommand.deadline")}</label>
                                    <input
                                        type="datetime-local"
                                        value={form.deadlineAt}
                                        onChange={(e) => handleField("deadlineAt", e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={form.isMandatory}
                                onChange={(e) => handleField("isMandatory", e.target.checked)}
                                className="w-4 h-4 accent-orange-500"
                            />
                            <span className="text-sm font-bold">{t("mentor.questCommand.mandatoryQuest")}</span>
                            {form.isMandatory && (
                                <span className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-300 font-bold">
                                    <img src="/icon/UI/Warning/64px/Warning 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> Fail → Shared HP -20
                                </span>
                            )}
                        </label>
                    </div>

                    {formError && (
                        <div className="mt-4 p-3 bg-error-100 dark:bg-error-500/15 border-2 border-error-400 rounded-xl text-sm font-bold text-error-700 dark:text-error-300">
                            {formError}
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className={`mt-5 w-full py-3.5 border-[3px] ${inkBorder} rounded-full font-black text-lg bg-orange-500 text-white ${shadowMd} hover:shadow-[7px_9px_0_0_var(--color-game-outline)] dark:hover:shadow-[7px_9px_0_0_var(--color-brand-300)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0 transition-all duration-150 ${easeExpo} inline-flex items-center justify-center gap-2`}
                    >
                        {submitting ? (
                            <><Spinner size={16} /> {t("mentor.questCommand.assigning")}</>
                        ) : assignMode === "individual" ? (
                            <span className="inline-flex items-center gap-1.5"><img src="/icon/Main/Lighting/64px/Lighting 1st 64px.png" alt="" className="w-5 h-5 object-contain" />{t("mentor.questCommand.assignQuest")}</span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5"><img src="/icon/Item/Sword/64px/Sword 1st 64px.png" alt="" className="w-5 h-5 object-contain" />{t("mentor.questCommand.fanOut")}</span>
                        )}
                    </button>
                </div>
            </div>

            {/* ── Player Preview ──────────────────────────────────────── */}
            <div className="lg:col-span-3 min-w-0">
                <QuestPreview form={form} currentRange={currentRange} assignMode={assignMode} targetLabel={targetLabel} />
            </div>

        </div>
    );
}

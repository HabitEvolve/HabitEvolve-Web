import { useState, useEffect } from "react";
import { useOutletContext } from "react-router";
import { Trans, useTranslation } from "react-i18next";
import mentorApi from "../../../api/mentorApi";
import partyMentorApi from "../../../api/mentorPartyApi";
import { useAlert } from "../../../context/AlertContext";
import SkyCard from "../../../components/ui/card/SkyCard";
import SkyButton from "../../../components/ui/button/SkyButton";
import { easeExpo, getMentorId, Spinner } from "./sharedSky";
import type { PartyWorkspaceContext } from "./PartyWorkspace";
import type { PartyMember } from "../../../types/api.types";
import type {
    QuestDifficulty,
    MentorQuestRangeDto,
    ActiveSubscriptionDto,
    CreateMentorQuestRequest,
    CreatePartyQuestRequest,
    VerificationTag,
    CvQuestType,
} from "../../../types/mentor.types";

// sky-peach stays this tab's signature accent (Quest Forge), consistent with
// the "each Mentor feature gets its own accent inside the shared system"
// pattern — but only for decorative/selector chips, not the primary CTA
// (that stays SkyButton's one true primary blue, app-wide).
const inputCls =
    "w-full p-3 rounded-sky-chip border border-sky-surf-border text-sm font-medium bg-transparent " +
    "focus:outline-none focus:border-sky-deep focus:ring-3 focus:ring-sky-deep/20 placeholder:text-sky-ink-3 text-sky-ink";
const chipInactive = "bg-white/50 text-sky-ink-2 border border-sky-surf-border hover:border-sky-deep/30";
const chipActive = "bg-sky-peach text-white border border-sky-peach";

const DIFFICULTIES: QuestDifficulty[] = ["EASY", "NORMAL", "HARD"];
const VERIFICATION_TAGS: VerificationTag[] = ["FACE", "ITEM", "ACTION"];
const CV_QUEST_TYPES: CvQuestType[] = ["running", "drinking_water", "sleeping", "reading", "cooking", "exercise"];
const HOW_TO_SUBMIT_MAX = 500;
const DIFF_STYLE: Record<QuestDifficulty, { active: string; inactive: string; ring: string; label: string }> = {
    EASY:   { active: "bg-success-400 text-success-900", inactive: "bg-success-50 text-success-700", ring: "ring-success-500", label: "Easy" },
    NORMAL: { active: "bg-warning-400 text-warning-900", inactive: "bg-warning-50 text-warning-700", ring: "ring-warning-500", label: "Normal" },
    HARD:   { active: "bg-error-500 text-white",         inactive: "bg-error-50 text-error-700",     ring: "ring-error-500",   label: "Hard" },
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
    howToSubmit: "",
    verificationTags: "",
    cvQuestType: "",
};

type AssignMode = "individual" | "party";

// ── LIMITS PANEL — flat tinted info panel, not a glass card: the purple tint
// itself is the signal ("this is read-only context"), so it stays plain
// rather than sitting on the same frosted surface as interactive controls.
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
        <div className="bg-purple-50 border border-purple-200 rounded-sky-card shadow-sky-tint p-5">
            <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider mb-3 text-sky-ink">
                <img src="/icon/Main/Stats/64px/Stats 1st 64px.png" alt="" className="w-4 h-4 object-contain" /> Limits & Ranges
            </h3>

            {range && (
                <div className="mb-3 p-3 bg-white/60 border border-purple-200 rounded-sky-chip space-y-1">
                    <p className="text-xs font-semibold text-purple-700 uppercase">{selectedDifficulty} Range</p>
                    <div className="flex justify-between text-xs font-medium">
                        <span className="text-sky-ink-2">Damage</span>
                        <span className="font-semibold text-sky-ink">{range.damageMin} – {range.damageMax}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium">
                        <span className="text-sky-ink-2">M-Gold</span>
                        <span className="font-semibold text-sky-ink">{range.mGoldMin} – {range.mGoldMax}</span>
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
                            <span className="text-sky-ink-2">{k}</span>
                            <span className="font-semibold text-sky-ink text-right max-w-28 wrap-break-word">{v}</span>
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
        <SkyCard variant="mentor" className="sticky top-6">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-peach-deep mb-2">
                {t("mentor.questCommand.forge.previewKicker")}
            </span>
            <h3 className="text-sm font-semibold mb-3 text-sky-ink">{t("mentor.questCommand.forge.previewTitle")}</h3>

            <div className="rounded-sky-chip p-4 bg-sky-peach/10 border border-sky-peach/30">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className={`font-bold text-base leading-tight ${hasContent ? "text-sky-ink" : "text-sky-ink-3 italic"}`}>
                        {hasContent ? form.title : t("mentor.questCommand.forge.previewUntitled")}
                    </h4>
                    <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${diff.inactive}`}>
                        {diff.label}
                    </span>
                </div>
                <p className="text-xs text-sky-ink-2 font-medium mb-3 wrap-break-word">
                    {form.description.trim() || t("mentor.questCommand.forge.previewNoDescription")}
                </p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/60 border border-sky-surf-border">
                        <img src="/icon/Item/Sword/64px/Sword 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" />
                        <span className="text-xs font-semibold text-error-600">-{form.damage}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/60 border border-sky-surf-border">
                        <img src="/icon/Currency/Coin/64px/Golden Coin 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" />
                        <span className="text-xs font-semibold text-sky-peach-deep">+{form.rewardMGold}</span>
                    </div>
                </div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-sky-ink-2">
                    <span className="inline-flex items-center gap-1"><img src="/icon/Item/Target/64px/Golden Target 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> {targetLabel}</span>
                    {form.isMandatory && (
                        <span className="inline-flex items-center gap-1 text-sky-peach-deep"><img src="/icon/UI/Warning/64px/Warning 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> {t("mentor.questCommand.forge.previewMandatoryBadge")}</span>
                    )}
                </div>
                <div className="mt-2 pt-2 border-t border-dashed border-sky-ink/15 text-[11px] font-medium text-sky-ink-2 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1">
                        <img src={assignMode === "individual" ? "/icon/Player/Player/64px/Player 1st 64px.png" : "/icon/Item/Sword/64px/Sword 1st 64px.png"} alt="" className="w-3.5 h-3.5 object-contain" />
                        {form.proofType.replace(/_/g, " ")}
                    </span>
                    <span>{form.deadlineAt ? new Date(form.deadlineAt).toLocaleDateString() : t("mentor.questCommand.forge.previewDeadlineNone")}</span>
                </div>
            </div>

            {!hasContent && (
                <p className="text-xs text-sky-ink-3 font-medium text-center mt-3">
                    {t("mentor.questCommand.forge.previewEmpty")}
                </p>
            )}
        </SkyCard>
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

    const selectedTags = (form.verificationTags || "")
        .split(",").map((s) => s.trim()).filter(Boolean) as VerificationTag[];
    const toggleTag = (tag: VerificationTag) => {
        const next = selectedTags.includes(tag) ? selectedTags.filter((t) => t !== tag) : [...selectedTags, tag];
        handleField("verificationTags", next.join(","));
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
                    howToSubmit: form.howToSubmit.trim() || undefined,
                    verificationTags: form.verificationTags || undefined,
                    cvQuestType: form.cvQuestType || undefined,
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
                    howToSubmit: form.howToSubmit.trim() || undefined,
                    verificationTags: form.verificationTags || undefined,
                    cvQuestType: form.cvQuestType || undefined,
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
                <SkyCard variant="mentor">
                    <h2 className="text-sky-h3 font-bold text-sky-ink mb-4">{t("mentor.questCommand.assignmentMode")}</h2>

                    <div className="flex gap-2">
                        {(["individual", "party"] as AssignMode[]).map((mode) => (
                            <button
                                type="button"
                                key={mode}
                                onClick={() => { setAssignMode(mode); setSelectedMemberId(""); }}
                                className={`flex-1 py-2 rounded-sky-chip text-xs font-semibold transition-all duration-150 ${easeExpo} ${
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
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-sky-ink-2">{t("mentor.questCommand.member")}</label>
                            {loadingMembers ? (
                                <div className="flex items-center gap-2 text-sm text-sky-ink-2"><Spinner size={14} /> {t("mentor.questCommand.loadingMembers")}</div>
                            ) : members.length === 0 ? (
                                <p className="text-xs text-sky-ink-2 font-medium">{t("mentor.questCommand.pickMember")}</p>
                            ) : (
                                <>
                                    <p className="text-[11px] text-sky-ink-3 font-medium mb-2">{t("mentor.questCommand.forge.memberChipsHint")}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {members.map((m) => {
                                            const isSelected = selectedMemberId === m.userId;
                                            return (
                                                <button
                                                    key={m.userId}
                                                    type="button"
                                                    onClick={() => setSelectedMemberId(m.userId)}
                                                    aria-label={t("mentor.questCommand.forge.selectMemberAria", { username: m.username })}
                                                    className={`inline-flex items-center gap-1.5 pl-1.5 pr-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${easeExpo} ${isSelected ? chipActive : chipInactive}`}
                                                >
                                                    <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold ${isSelected ? "bg-white/25" : "bg-purple-100 text-purple-700"}`}>
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
                            <div className="p-3 bg-purple-50 border border-purple-300 rounded-sky-chip text-sm font-medium text-purple-800 mb-2">
                                <Trans
                                    i18nKey="mentor.questCommand.fanOutInfo"
                                    count={members.length}
                                    components={{ strong: <strong /> }}
                                />
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {members.map((m) => (
                                    <span key={m.userId} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-white/60 border border-sky-surf-border text-sky-ink-2">
                                        <span className="w-3.5 h-3.5 rounded-full bg-purple-100 flex items-center justify-center text-[8px] text-purple-700">
                                            {m.username.charAt(0).toUpperCase()}
                                        </span>
                                        {m.username}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </SkyCard>

                <LimitsPanel activeSub={activeSub} ranges={ranges} selectedDifficulty={form.difficulty} />
            </div>

            {/* ── Quest Forge form ──────────────────────────────────── */}
            <div className="lg:col-span-6 min-w-0">
                <SkyCard variant="mentor" className="p-5 sm:p-6">
                    <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-peach-deep mb-1">
                        {t("mentor.questCommand.forge.kicker")}
                    </span>
                    <h2 className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight leading-tight mb-1 text-sky-ink">
                        <img src="/icon/Main/Fire 2/64w/Fire 64px.png" alt="" className="w-6 h-6 object-contain" /> {t("mentor.questCommand.forge.title")}
                    </h2>
                    <p className="text-xs text-sky-ink-2 font-medium mb-5">{t("mentor.questCommand.forge.subtitle")}</p>

                    <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-ink-3 mb-2">{t("mentor.questCommand.forge.stepIntel")}</p>
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-sky-ink-2">{t("mentor.questCommand.titleField")} *</label>
                            <input
                                value={form.title}
                                onChange={(e) => handleField("title", e.target.value)}
                                placeholder={t("mentor.questCommand.titlePlaceholder")}
                                className={`${inputCls} text-lg font-bold`}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-sky-ink-2">{t("mentor.questCommand.description")}</label>
                            <textarea
                                value={form.description}
                                onChange={(e) => handleField("description", e.target.value)}
                                placeholder={t("mentor.questCommand.descPlaceholder")}
                                rows={2}
                                className={`${inputCls} resize-none`}
                            />
                        </div>
                    </div>

                    <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-ink-3 mb-2">{t("mentor.questCommand.forge.stepStakes")}</p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-sky-ink-2">Difficulty *</label>
                            <div className="grid grid-cols-3 gap-2">
                                {DIFFICULTIES.map((diff) => {
                                    const s = DIFF_STYLE[diff];
                                    const isSelected = form.difficulty === diff;
                                    return (
                                        <button
                                            key={diff}
                                            type="button"
                                            onClick={() => applyRangeDefaults(diff)}
                                            className={`py-2.5 rounded-sky-chip font-semibold text-sm transition-all duration-150 ${easeExpo} ${
                                                isSelected ? `${s.active} ring-2 ${s.ring}` : s.inactive
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
                                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-sky-ink-2">
                                    {t("mentor.questCommand.damage")}
                                    {currentRange && (
                                        <span className="ml-1 text-sky-ink-3 font-medium normal-case">
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
                                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-sky-ink-2">
                                    M-Gold Reward
                                    {currentRange && (
                                        <span className="ml-1 text-sky-ink-3 font-medium normal-case">
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
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-ink-3 mb-2">{t("mentor.questCommand.forge.deploymentDetails")}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="min-w-0">
                                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-sky-ink-2">{t("mentor.questCommand.proofType")}</label>
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
                                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-sky-ink-2">{t("mentor.questCommand.deadline")}</label>
                                    <input
                                        type="datetime-local"
                                        value={form.deadlineAt}
                                        onChange={(e) => handleField("deadlineAt", e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-sky-ink-2">
                                {t("mentor.questCommand.forge.howToSubmitLabel")}
                                <span className="ml-1.5 text-[10px] font-normal normal-case text-sky-ink-3">
                                    {form.howToSubmit.length}/{HOW_TO_SUBMIT_MAX}
                                </span>
                            </label>
                            <textarea
                                value={form.howToSubmit}
                                onChange={(e) => handleField("howToSubmit", e.target.value)}
                                placeholder={t("mentor.questCommand.forge.howToSubmitPlaceholder")}
                                rows={2}
                                maxLength={HOW_TO_SUBMIT_MAX}
                                className={`${inputCls} resize-none`}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-sky-ink-2">
                                {t("mentor.questCommand.forge.verificationTagsLabel")}
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {VERIFICATION_TAGS.map((tag) => {
                                    const isSelected = selectedTags.includes(tag);
                                    return (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => toggleTag(tag)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${easeExpo} ${isSelected ? chipActive : chipInactive}`}
                                        >
                                            {tag}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-[11px] text-sky-ink-3 font-medium mt-1.5">{t("mentor.questCommand.forge.verificationTagsHint")}</p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-sky-ink-2">
                                {t("mentor.questCommand.forge.cvQuestTypeLabel")}
                            </label>
                            <select
                                value={form.cvQuestType}
                                onChange={(e) => handleField("cvQuestType", e.target.value)}
                                className={inputCls}
                            >
                                <option value="">{t("mentor.questCommand.forge.cvQuestTypeNone")}</option>
                                {CV_QUEST_TYPES.map((ct) => (
                                    <option key={ct} value={ct}>{ct}</option>
                                ))}
                            </select>
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={form.isMandatory}
                                onChange={(e) => handleField("isMandatory", e.target.checked)}
                                className="w-4 h-4 accent-sky-deep"
                            />
                            <span className="text-sm font-semibold text-sky-ink">{t("mentor.questCommand.mandatoryQuest")}</span>
                            {form.isMandatory && (
                                <span className="inline-flex items-center gap-1 text-xs text-sky-peach-deep font-semibold">
                                    <img src="/icon/UI/Warning/64px/Warning 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> Fail → Shared HP -20
                                </span>
                            )}
                        </label>
                    </div>

                    {formError && (
                        <div className="mt-4 p-3 bg-error-100 border border-error-400 rounded-sky-chip text-sm font-semibold text-error-700">
                            {formError}
                        </div>
                    )}

                    <SkyButton
                        type="button"
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="mt-5 w-full text-lg py-3.5"
                    >
                        {submitting ? (
                            <><Spinner size={16} /> {t("mentor.questCommand.assigning")}</>
                        ) : assignMode === "individual" ? (
                            <span className="inline-flex items-center gap-1.5"><img src="/icon/Main/Lighting/64px/Lighting 1st 64px.png" alt="" className="w-5 h-5 object-contain" />{t("mentor.questCommand.assignQuest")}</span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5"><img src="/icon/Item/Sword/64px/Sword 1st 64px.png" alt="" className="w-5 h-5 object-contain" />{t("mentor.questCommand.fanOut")}</span>
                        )}
                    </SkyButton>
                </SkyCard>
            </div>

            {/* ── Player Preview ──────────────────────────────────────── */}
            <div className="lg:col-span-3 min-w-0">
                <QuestPreview form={form} currentRange={currentRange} assignMode={assignMode} targetLabel={targetLabel} />
            </div>

        </div>
    );
}

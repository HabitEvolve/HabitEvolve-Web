import { useState, useEffect } from "react";
import { useOutletContext } from "react-router";
import { Trans, useTranslation } from "react-i18next";
import {
    Flame, Swords, Coins, Target, AlertTriangle, User, Users, Zap,
    SlidersHorizontal, CalendarClock, Info, Sparkles,
} from "lucide-react";
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
} from "../../../types/mentor.types";

// sky-peach stays this tab's signature accent (Quest Forge), consistent with
// the "each Mentor feature gets its own accent inside the shared system"
// pattern — but only for decorative/selector chips, not the primary CTA
// (that stays SkyButton's one true primary blue, app-wide).
const inputCls =
    "w-full p-3 rounded-sky-chip bg-white/70 ring-1 ring-white/80 text-sm font-medium text-sky-ink " +
    "transition-shadow focus:outline-none focus:ring-2 focus:ring-sky-deep/45 placeholder:text-sky-ink-3";
const chipInactive = "sky-glass-chip text-sky-ink-2 hover:text-sky-ink motion-safe:hover:-translate-y-px";
const chipActive = "bg-linear-to-b from-sky-peach to-sky-peach-deep text-white shadow-sky-chip";

const fieldLabel ="block mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-2";
// Step markers break the long form into three readable acts.
const stepLabel = "flex items-center gap-2 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-2";

const DIFFICULTIES: QuestDifficulty[] = ["EASY", "NORMAL", "HARD"];
const VERIFICATION_TAGS: VerificationTag[] = ["FACE", "ITEM", "ACTION"];
const HOW_TO_SUBMIT_MAX = 500;

// Difficulty is a heat ramp (cool → hot), the same one the Boss Raid grimoire
// uses. It is a scale, not a verdict, so it never borrows teal or rose.
const DIFF_STYLE: Record<QuestDifficulty, { active: string; inactive: string; chip: string; label: string }> = {
    EASY:   { active: "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-fill",     inactive: "bg-sky-deep/8 text-sky-deep hover:bg-sky-deep/14",             chip: "bg-sky-deep/12 text-sky-deep",        label: "Easy" },
    NORMAL: { active: "bg-linear-to-b from-sky-peach to-sky-peach-deep text-white shadow-sky-chip", inactive: "bg-sky-peach/14 text-sky-peach-deep hover:bg-sky-peach/22",   chip: "bg-sky-peach/22 text-sky-peach-deep", label: "Normal" },
    HARD:   { active: "bg-linear-to-b from-sky-dmg to-sky-dmg-deep text-white shadow-sky-chip",     inactive: "bg-sky-dmg/12 text-sky-dmg-deep hover:bg-sky-dmg/18",         chip: "bg-sky-dmg/18 text-sky-dmg-deep",     label: "Hard" },
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
    aiCheckEnabled: false,
    deadlineAt: "",
    howToSubmit: "",
    verificationTags: "",
};

type AssignMode = "individual" | "party";

// ── LIMITS PANEL — flat tinted info panel, not a glass card: the violet tint
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
        <div className="rounded-sky-card bg-sky-violet/8 ring-1 ring-sky-violet/20 shadow-sky-tint p-5">
            <h3 className="inline-flex items-center gap-1.5 mb-3 font-display text-sm font-semibold text-sky-ink">
                <SlidersHorizontal className="w-4 h-4 text-sky-violet-deep" aria-hidden="true" /> Limits &amp; Ranges
            </h3>

            {range && (
                <div className="mb-3 p-3 rounded-sky-chip bg-white/62 ring-1 ring-white/80 space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-violet-deep">{selectedDifficulty} Range</p>
                    <div className="flex justify-between text-xs font-medium">
                        <span className="text-sky-ink-2">Damage</span>
                        <span className="font-display font-semibold text-sky-ink tabular-nums">{range.damageMin} – {range.damageMax}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium">
                        <span className="text-sky-ink-2">M-Gold</span>
                        <span className="font-display font-semibold text-sky-ink tabular-nums">{range.mGoldMin} – {range.mGoldMax}</span>
                    </div>
                </div>
            )}

            {pkg && (
                <div className="space-y-2">
                    {[
                        ["Plan", pkg.name],
                        ["Boss Modes", pkg.bossModes],
                        ["Proof Types", pkg.proofTypes],
                        ["AI Verification", pkg.aiVerificationBossModes ? "Included" : "Not included"],
                        ["Quest/member/day", `${usage?.questsAssignedToday ?? 0} / ${pkg.questsPerMemberPerDay}`],
                        ["Party quest/week", `${usage?.partyQuestsThisWeek ?? 0} / ${pkg.partyQuestsPerWeek}`],
                    ].map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2 text-xs font-medium">
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
    aiEligible: boolean;
}

const QuestPreview = ({ form, assignMode, targetLabel, aiEligible }: PreviewProps) => {
    const { t } = useTranslation();
    const diff = DIFF_STYLE[form.difficulty];
    const hasContent = form.title.trim().length > 0;

    return (
        <SkyCard variant="mentor" className="sticky top-6">
            <span className="relative inline-block mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-peach-deep">
                {t("mentor.questCommand.forge.previewKicker")}
            </span>
            <h3 className="relative font-display text-sm font-semibold mb-3 text-sky-ink">{t("mentor.questCommand.forge.previewTitle")}</h3>

            {/* The card the player will actually see — kept visually distinct
                from the editor chrome around it so it reads as a mock-up. */}
            <div className="relative rounded-sky-md p-4 bg-linear-to-b from-sky-peach/14 to-sky-peach/6 ring-1 ring-sky-peach/28">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className={`font-display text-base font-semibold leading-tight ${hasContent ? "text-sky-ink" : "text-sky-ink-3 italic"}`}>
                        {hasContent ? form.title : t("mentor.questCommand.forge.previewUntitled")}
                    </h4>
                    <span className={`shrink-0 px-2 py-0.5 rounded-sky-chip text-[10px] font-semibold ${diff.chip}`}>
                        {diff.label}
                    </span>
                </div>
                <p className="text-xs text-sky-ink-2 font-medium mb-3 wrap-break-word">
                    {form.description.trim() || t("mentor.questCommand.forge.previewNoDescription")}
                </p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sky-chip bg-white/65 ring-1 ring-white/80">
                        <Swords className="w-3.5 h-3.5 text-sky-dmg-deep" aria-hidden="true" />
                        <span className="text-xs font-display font-semibold text-sky-dmg-deep tabular-nums">-{form.damage}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sky-chip bg-white/65 ring-1 ring-white/80">
                        <Coins className="w-3.5 h-3.5 text-sky-peach-deep" aria-hidden="true" />
                        <span className="text-xs font-display font-semibold text-sky-peach-deep tabular-nums">+{form.rewardMGold}</span>
                    </div>
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-sky-ink-2">
                    <span className="inline-flex items-center gap-1 min-w-0">
                        <Target className="w-3.5 h-3.5 shrink-0 text-sky-ink-3" aria-hidden="true" />
                        <span className="truncate">{targetLabel}</span>
                    </span>
                    <span className="inline-flex items-center gap-2 shrink-0">
                        {aiEligible && form.aiCheckEnabled && (
                            <span className="inline-flex items-center gap-1 text-sky-violet-deep">
                                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> AI
                            </span>
                        )}
                        {form.isMandatory && (
                            <span className="inline-flex items-center gap-1 text-sky-peach-deep">
                                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> {t("mentor.questCommand.forge.previewMandatoryBadge")}
                            </span>
                        )}
                    </span>
                </div>
                <div className="mt-2 pt-2 border-t border-dashed border-sky-ink/15 text-[11px] font-medium text-sky-ink-2 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 min-w-0">
                        {assignMode === "individual"
                            ? <User className="w-3.5 h-3.5 shrink-0 text-sky-ink-3" aria-hidden="true" />
                            : <Users className="w-3.5 h-3.5 shrink-0 text-sky-ink-3" aria-hidden="true" />}
                        <span className="truncate">{form.proofType.replace(/_/g, " ")}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">{form.deadlineAt ? new Date(form.deadlineAt).toLocaleDateString() : t("mentor.questCommand.forge.previewDeadlineNone")}</span>
                </div>
            </div>

            {!hasContent && (
                <p className="relative text-xs text-sky-ink-3 font-medium text-center mt-3">
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

    // AI Check eligibility mirrors the BE guard in CreateMentorQuest/CreatePartyQuestCommandHandler:
    // the mentor's plan must include AI Verification (any Boss mode), and SELF_CHECK is always
    // auto-approved so opting it into AI Check would never take effect.
    const packageSupportsAi = Boolean(activeSub?.package?.aiVerificationBossModes);
    const aiEligible = packageSupportsAi && form.proofType !== "SELF_CHECK";

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
                    aiCheckEnabled: aiEligible && form.aiCheckEnabled,
                    deadlineAt: buildDeadline(),
                    howToSubmit: form.howToSubmit.trim() || undefined,
                    verificationTags: form.verificationTags || undefined,
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
                    aiCheckEnabled: aiEligible && form.aiCheckEnabled,
                    deadlineAt: buildDeadline(),
                    howToSubmit: form.howToSubmit.trim() || undefined,
                    verificationTags: form.verificationTags || undefined,
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
                    <h2 className="relative font-display text-sky-h3 font-semibold text-sky-ink mb-4">{t("mentor.questCommand.assignmentMode")}</h2>

                    <div className="relative flex gap-2">
                        {(["individual", "party"] as AssignMode[]).map((mode) => (
                            <button
                                type="button"
                                key={mode}
                                onClick={() => { setAssignMode(mode); setSelectedMemberId(""); }}
                                aria-pressed={assignMode === mode}
                                className={`flex-1 py-2.5 rounded-sky-chip text-xs font-semibold transition-all duration-150 ${easeExpo} ${
                                    assignMode === mode ? chipActive : chipInactive
                                }`}
                            >
                                {mode === "individual"
                                    ? <span className="inline-flex items-center gap-1.5"><User className="w-4 h-4" aria-hidden="true" />{t("mentor.questCommand.individual")}</span>
                                    : <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4" aria-hidden="true" />{t("mentor.questCommand.fanOut")}</span>
                                }
                            </button>
                        ))}
                    </div>

                    {assignMode === "individual" && (
                        <div className="relative mt-4 min-w-0">
                            <label className={fieldLabel}>{t("mentor.questCommand.member")}</label>
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
                                                    aria-pressed={isSelected}
                                                    aria-label={t("mentor.questCommand.forge.selectMemberAria", { username: m.username })}
                                                    className={`inline-flex items-center gap-1.5 pl-1.5 pr-3 py-1.5 rounded-sky-chip text-xs font-semibold transition-all duration-150 ${easeExpo} ${isSelected ? chipActive : chipInactive}`}
                                                >
                                                    <span className={`grid place-items-center w-5 h-5 rounded-full font-display text-[10px] font-semibold ${isSelected ? "bg-white/26 text-white" : "bg-sky-violet/14 text-sky-violet-deep"}`}>
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
                        <div className="relative mt-4 min-w-0">
                            <div className="p-3 mb-2 rounded-sky-chip bg-sky-violet/10 ring-1 ring-sky-violet/24 text-sm font-medium text-sky-violet-deep">
                                <Trans
                                    i18nKey="mentor.questCommand.fanOutInfo"
                                    count={members.length}
                                    components={{ strong: <strong /> }}
                                />
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {members.map((m) => (
                                    <span key={m.userId} className="inline-flex items-center gap-1 px-2 py-1 rounded-sky-chip text-[10px] font-semibold bg-white/62 ring-1 ring-white/78 text-sky-ink-2">
                                        <span className="grid place-items-center w-3.5 h-3.5 rounded-full bg-sky-violet/14 text-[8px] font-semibold text-sky-violet-deep">
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
                    <div className="relative flex items-start gap-3 mb-5">
                        {/* Forge mark — the one warm medallion on the page,
                            anchoring the tab's peach signature. */}
                        <span className="grid place-items-center w-11 h-11 shrink-0 rounded-sky-chip bg-linear-to-b from-sky-peach/28 to-sky-peach/12 ring-1 ring-sky-peach/32 text-sky-peach-deep">
                            <Flame className="w-5 h-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-peach-deep">
                                {t("mentor.questCommand.forge.kicker")}
                            </span>
                            <h2 className="font-display text-2xl font-semibold tracking-tight leading-tight text-sky-ink">
                                {t("mentor.questCommand.forge.title")}
                            </h2>
                            <p className="text-xs text-sky-ink-2 font-medium mt-0.5">{t("mentor.questCommand.forge.subtitle")}</p>
                        </div>
                    </div>

                    <p className={`relative ${stepLabel}`}>
                        <span className="grid place-items-center w-4 h-4 rounded-full bg-sky-ink/10 text-[9px] text-sky-ink-2 tabular-nums">1</span>
                        {t("mentor.questCommand.forge.stepIntel")}
                    </p>
                    <div className="relative space-y-4 mb-6">
                        <div>
                            <label className={fieldLabel}>{t("mentor.questCommand.titleField")} *</label>
                            <input
                                value={form.title}
                                onChange={(e) => handleField("title", e.target.value)}
                                placeholder={t("mentor.questCommand.titlePlaceholder")}
                                className={`${inputCls} font-display text-lg font-semibold`}
                            />
                        </div>
                        <div>
                            <label className={fieldLabel}>{t("mentor.questCommand.description")}</label>
                            <textarea
                                value={form.description}
                                onChange={(e) => handleField("description", e.target.value)}
                                placeholder={t("mentor.questCommand.descPlaceholder")}
                                rows={2}
                                className={`${inputCls} resize-none`}
                            />
                        </div>
                    </div>

                    <p className={`relative ${stepLabel}`}>
                        <span className="grid place-items-center w-4 h-4 rounded-full bg-sky-ink/10 text-[9px] text-sky-ink-2 tabular-nums">2</span>
                        {t("mentor.questCommand.forge.stepStakes")}
                    </p>
                    <div className="relative space-y-4">
                        <div>
                            <label className="block mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-2">Difficulty *</label>
                            <div className="grid grid-cols-3 gap-2">
                                {DIFFICULTIES.map((diff) => {
                                    const s = DIFF_STYLE[diff];
                                    const isSelected = form.difficulty === diff;
                                    return (
                                        <button
                                            key={diff}
                                            type="button"
                                            onClick={() => applyRangeDefaults(diff)}
                                            aria-pressed={isSelected}
                                            className={`py-2.5 rounded-sky-chip font-semibold text-sm transition-all duration-150 ${easeExpo} ${
                                                isSelected ? s.active : s.inactive
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
                                <label className={fieldLabel}>
                                    {t("mentor.questCommand.damage")}
                                    {currentRange && (
                                        <span className="ml-1 text-sky-ink-3 font-medium normal-case tracking-normal tabular-nums">
                                            ({currentRange.damageMin}–{currentRange.damageMax})
                                        </span>
                                    )}
                                </label>
                                <div className="relative">
                                    <Swords className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4 text-sky-dmg-deep" aria-hidden="true" />
                                    <input
                                        type="number"
                                        min={currentRange?.damageMin ?? 1}
                                        max={currentRange?.damageMax}
                                        value={form.damage}
                                        onChange={(e) => handleField("damage", parseInt(e.target.value) || 0)}
                                        className={`${inputCls} pl-9 tabular-nums`}
                                    />
                                </div>
                            </div>
                            <div className="min-w-0">
                                <label className={fieldLabel}>
                                    M-Gold Reward
                                    {currentRange && (
                                        <span className="ml-1 text-sky-ink-3 font-medium normal-case tracking-normal tabular-nums">
                                            ({currentRange.mGoldMin}–{currentRange.mGoldMax})
                                        </span>
                                    )}
                                </label>
                                <div className="relative">
                                    <Coins className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4 text-sky-peach-deep" aria-hidden="true" />
                                    <input
                                        type="number"
                                        min={currentRange?.mGoldMin ?? 1}
                                        max={currentRange?.mGoldMax}
                                        value={form.rewardMGold}
                                        onChange={(e) => handleField("rewardMGold", parseInt(e.target.value) || 0)}
                                        className={`${inputCls} pl-9 tabular-nums`}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <p className={stepLabel}>
                                <span className="grid place-items-center w-4 h-4 rounded-full bg-sky-ink/10 text-[9px] text-sky-ink-2 tabular-nums">3</span>
                                {t("mentor.questCommand.forge.deploymentDetails")}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="min-w-0">
                                    <label className={fieldLabel}>{t("mentor.questCommand.proofType")}</label>
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
                                    <label className={fieldLabel}>
                                        <span className="inline-flex items-center gap-1">
                                            <CalendarClock className="w-3 h-3" aria-hidden="true" /> {t("mentor.questCommand.deadline")}
                                        </span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={form.deadlineAt}
                                        onChange={(e) => handleField("deadlineAt", e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                            </div>

                            <label
                                className={`mt-3 flex flex-wrap items-center gap-3 rounded-sky-chip bg-white/50 ring-1 ring-white/70 px-3 py-2.5 ${
                                    aiEligible ? "cursor-pointer select-none" : "cursor-not-allowed opacity-60"
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={aiEligible && form.aiCheckEnabled}
                                    disabled={!aiEligible}
                                    onChange={(e) => handleField("aiCheckEnabled", e.target.checked)}
                                    className="w-4 h-4 rounded accent-sky-violet-deep"
                                />
                                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-ink">
                                    <Sparkles className="w-3.5 h-3.5 text-sky-violet-deep" aria-hidden="true" />
                                    {t("mentor.questCommand.forge.aiCheckLabel")}
                                </span>
                                <span className="w-full text-[11px] font-medium text-sky-ink-3 wrap-break-word">
                                    {!packageSupportsAi
                                        ? t("mentor.questCommand.forge.aiCheckDisabledPackage")
                                        : form.proofType === "SELF_CHECK"
                                            ? t("mentor.questCommand.forge.aiCheckDisabledSelfCheck")
                                            : t("mentor.questCommand.forge.aiCheckHint")}
                                </span>
                            </label>
                        </div>

                        <div>
                            <label className={fieldLabel}>
                                {t("mentor.questCommand.forge.howToSubmitLabel")}
                                <span className="ml-1.5 font-normal normal-case tracking-normal tabular-nums text-sky-ink-3">
                                    {form.howToSubmit.length}/{HOW_TO_SUBMIT_MAX}
                                </span>
                            </label>
                            <textarea
                                value={form.howToSubmit}
                                onChange={(e) => handleField("howToSubmit", e.target.value)}
                                placeholder={t("mentor.questCommand.forge.howToSubmitPlaceholder")}
                                rows={3}
                                maxLength={HOW_TO_SUBMIT_MAX}
                                className={`${inputCls} resize-none`}
                            />
                            {/* This text is the only guidance the player gets before they submit,
                                and a proof that misses what the mentor expected costs both sides a
                                reject/resubmit round trip — so the field earns a real callout
                                rather than the usual quiet hint line. */}
                            <p className="mt-2 flex items-start gap-2 rounded-sky-chip bg-sky-deep/8 ring-1 ring-sky-deep/18 px-3 py-2 text-[11px] font-medium leading-relaxed text-sky-ink-2">
                                <Info className="mt-px w-3.5 h-3.5 shrink-0 text-sky-deep" aria-hidden="true" />
                                <span>{t("mentor.questCommand.forge.howToSubmitNote")}</span>
                            </p>
                        </div>

                        <div>
                            <label className="block mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-2">
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
                                            aria-pressed={isSelected}
                                            className={`px-3 py-1.5 rounded-sky-chip text-xs font-semibold transition-all duration-150 ${easeExpo} ${isSelected ? chipActive : chipInactive}`}
                                        >
                                            {tag}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-[11px] text-sky-ink-3 font-medium mt-1.5">{t("mentor.questCommand.forge.verificationTagsHint")}</p>
                        </div>

                        <label className="flex flex-wrap items-center gap-3 cursor-pointer select-none rounded-sky-chip bg-white/50 ring-1 ring-white/70 px-3 py-2.5">
                            <input
                                type="checkbox"
                                checked={form.isMandatory}
                                onChange={(e) => handleField("isMandatory", e.target.checked)}
                                className="w-4 h-4 rounded accent-sky-deep"
                            />
                            <span className="text-sm font-semibold text-sky-ink">{t("mentor.questCommand.mandatoryQuest")}</span>
                            {form.isMandatory && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-peach-deep">
                                    <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> Fail → Shared HP -20
                                </span>
                            )}
                        </label>
                    </div>

                    {formError && (
                        <div className="relative mt-4 overflow-hidden rounded-sky-chip bg-sky-rose/12 ring-1 ring-sky-rose/28 p-3 pl-4">
                            <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" aria-hidden="true" />
                            <p className="inline-flex items-start gap-2 text-sm font-semibold text-sky-rose-deep">
                                <AlertTriangle className="w-4 h-4 mt-px shrink-0" aria-hidden="true" /> {formError}
                            </p>
                        </div>
                    )}

                    <SkyButton
                        type="button"
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="relative mt-5 w-full text-lg py-3.5"
                    >
                        {submitting ? (
                            <><Spinner size={16} /> {t("mentor.questCommand.assigning")}</>
                        ) : assignMode === "individual" ? (
                            <span className="inline-flex items-center gap-1.5"><Zap className="w-5 h-5" aria-hidden="true" />{t("mentor.questCommand.assignQuest")}</span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5"><Users className="w-5 h-5" aria-hidden="true" />{t("mentor.questCommand.fanOut")}</span>
                        )}
                    </SkyButton>
                </SkyCard>
            </div>

            {/* ── Player Preview ──────────────────────────────────────── */}
            <div className="lg:col-span-3 min-w-0">
                <QuestPreview form={form} currentRange={currentRange} assignMode={assignMode} targetLabel={targetLabel} aiEligible={aiEligible} />
            </div>

        </div>
    );
}

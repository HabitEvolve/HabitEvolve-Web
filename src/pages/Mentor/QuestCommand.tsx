import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import mentorApi from "../../api/mentorApi";
import partyMentorApi from "../../api/mentorPartyApi";
import type { PartyItem, PartyMember } from "../../types/api.types";
import type {
    QuestDto,
    QuestDifficulty,
    MentorQuestRangeDto,
    ActiveSubscriptionDto,
    CreateMentorQuestRequest,
    CreatePartyQuestRequest,
} from "../../types/mentor.types";

// ── HELPERS ───────────────────────────────────────────────────────────────────
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

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string }> = {
    NotStarted: { bg: "bg-gray-100",    border: "border-gray-400",    text: "text-gray-700" },
    InProgress:  { bg: "bg-blue-100",   border: "border-blue-400",    text: "text-blue-800" },
    Submitted:   { bg: "bg-amber-100",  border: "border-amber-400",   text: "text-amber-800" },
    Approved:    { bg: "bg-emerald-100",border: "border-emerald-400", text: "text-emerald-800" },
    Rejected:    { bg: "bg-red-100",    border: "border-red-400",     text: "text-red-800" },
    Expired:     { bg: "bg-gray-100",   border: "border-gray-300",    text: "text-gray-500" },
    Failed:      { bg: "bg-red-100",    border: "border-red-400",     text: "text-red-700" },
};

const DIFFICULTIES: QuestDifficulty[] = ["EASY", "NORMAL", "HARD"];
const DIFF_STYLE: Record<QuestDifficulty, { active: string; inactive: string; label: string }> = {
    EASY:   { active: "bg-emerald-400 text-emerald-900", inactive: "bg-emerald-50 text-emerald-700", label: "Easy" },
    NORMAL: { active: "bg-amber-400 text-amber-900",     inactive: "bg-amber-50 text-amber-700",     label: "Normal" },
    HARD:   { active: "bg-red-500 text-white",           inactive: "bg-red-50 text-red-700",          label: "Hard" },
};

// ── DELETE CONFIRM MODAL ──────────────────────────────────────────────────────
interface DeleteQuestModalProps {
    quest: QuestDto;
    onClose: () => void;
    onDeleted: () => void;
}

const DeleteQuestModal = ({ quest, onClose, onDeleted }: DeleteQuestModalProps) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        setLoading(true);
        try {
            const res = await mentorApi.deleteMentorQuest(quest.questId);
            if (res.success) {
                onDeleted();
            } else {
                setError(res.message || t("mentor.questCommand.errors.deleteFailed"));
            }
        } catch (e: any) {
            setError(e?.response?.data?.message || t("mentor.questCommand.errors.errorOccurred"));
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div
            className="modal-content fixed inset-0 z-99999 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm bg-[#FEE2E2] dark:bg-red-900/40 border-4 border-black rounded-2xl shadow-[8px_8px_0_0_#1A1D20] p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-black mb-2">{t("mentor.questCommand.deleteModal.title")}</h2>
                <p className="text-sm text-gray-700 mb-4">
                    Remove <strong>"{quest.title}"</strong>?
                </p>
                {error && (
                    <p className="mb-3 p-2.5 bg-red-100 border-2 border-red-400 rounded-xl text-sm font-bold text-red-700">{error}</p>
                )}
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 border-2 border-black rounded-full font-black text-sm bg-white shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75 transition-all">
                        {t("mentor.questCommand.deleteModal.cancel")}
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={loading}
                        className="flex-1 py-2.5 border-2 border-black rounded-full font-black text-sm bg-red-400 shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75 disabled:opacity-60 transition-all inline-flex items-center justify-center gap-2"
                    >
                        {loading ? <><Spinner size={14} /> {t("mentor.questCommand.deleteModal.deleting")}</> : t("mentor.questCommand.deleteModal.deleteForever")}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
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
        <div className="bg-[#EDE9FE] border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] p-5">
            <h3 className="text-sm font-black uppercase tracking-wider mb-3">📊 Limits & Ranges</h3>

            {range && (
                <div className="mb-3 p-3 bg-white border-2 border-violet-300 rounded-xl space-y-1">
                    <p className="text-xs font-black text-violet-600 uppercase">{selectedDifficulty} Range</p>
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

// ── PAGE ──────────────────────────────────────────────────────────────────────
export default function QuestCommand() {
    const { t } = useTranslation();
    const [parties, setParties] = useState<PartyItem[]>([]);
    const [selectedPartyId, setSelectedPartyId] = useState<number | "">("");
    const [members, setMembers] = useState<PartyMember[]>([]);
    const [assignMode, setAssignMode] = useState<AssignMode>("individual");
    const [selectedMemberId, setSelectedMemberId] = useState<number | "">("");
    const [form, setForm] = useState(emptyForm);

    const [quests, setQuests] = useState<QuestDto[]>([]);
    const [activeSub, setActiveSub] = useState<ActiveSubscriptionDto | null>(null);
    const [ranges, setRanges] = useState<MentorQuestRangeDto[]>([]);
    const [loadingParties, setLoadingParties] = useState(true);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [loadingQuests, setLoadingQuests] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<QuestDto | null>(null);

    // Load static data on mount
    useEffect(() => {
        Promise.all([
            partyMentorApi.getMentorParties(),
            mentorApi.getActiveSubscription(),
            mentorApi.getRewardRanges(),
        ]).then(([partiesRes, subRes, rangesRes]) => {
            if (partiesRes.success) setParties(partiesRes.data ?? []);
            if (subRes.success) setActiveSub(subRes.data ?? null);
            if (rangesRes.success) setRanges(rangesRes.data ?? []);
        }).finally(() => setLoadingParties(false));
    }, []);

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

    // Load members when party changes
    useEffect(() => {
        if (!selectedPartyId) {
            setMembers([]);
            setSelectedMemberId("");
            return;
        }
        setLoadingMembers(true);
        partyMentorApi.getPartyMembers(selectedPartyId as number).then((res) => {
            if (res.success) setMembers(res.data ?? []);
        }).finally(() => setLoadingMembers(false));
    }, [selectedPartyId]);

    // Load quests when party changes
    const fetchQuests = useCallback(() => {
        if (!selectedPartyId) { setQuests([]); return; }
        setLoadingQuests(true);
        mentorApi.getMentorQuests(selectedPartyId as number)
            .then((res) => { if (res.success) setQuests(res.data ?? []); })
            .finally(() => setLoadingQuests(false));
    }, [selectedPartyId]);

    useEffect(() => { fetchQuests(); }, [fetchQuests]);

    const handleField = (field: string, value: string | number | boolean) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setFormError(null);
        setFormSuccess(null);
    };

    const buildDeadline = () => {
        if (form.deadlineAt) return new Date(form.deadlineAt).toISOString();
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString();
    };

    // Validate damage/mgold against range
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
        if (!selectedPartyId) { setFormError(t("mentor.questCommand.errors.selectParty")); return; }
        if (!form.title.trim()) { setFormError(t("mentor.questCommand.errors.titleRequired")); return; }
        if (assignMode === "individual" && !selectedMemberId) {
            setFormError(t("mentor.questCommand.errors.selectMember")); return;
        }
        const rangeErr = validateRange();
        if (rangeErr) { setFormError(rangeErr); return; }

        setSubmitting(true);
        setFormError(null);
        setFormSuccess(null);
        try {
            if (assignMode === "individual") {
                const payload: CreateMentorQuestRequest = {
                    mentorUserId: getMentorId(),
                    targetUserId: selectedMemberId as number,
                    partyId: selectedPartyId as number,
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
                    setFormSuccess(t("mentor.questCommand.assignedTo", {
                        username: members.find((m) => m.userId === selectedMemberId)?.username ?? "member",
                    }));
                    setForm(emptyForm);
                    fetchQuests();
                } else {
                    setFormError(res.message || t("mentor.questCommand.errors.assignFailed"));
                }
            } else {
                const payload: CreatePartyQuestRequest = {
                    mentorUserId: getMentorId(),
                    partyId: selectedPartyId as number,
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
                    setFormSuccess(t("mentor.questCommand.fanOutComplete", {
                        count: res.data.memberCount,
                        partyName: res.data.partyName,
                    }));
                    setForm(emptyForm);
                    fetchQuests();
                } else {
                    setFormError(res.message || t("mentor.questCommand.errors.fanOutFailed"));
                }
            }
        } catch (e: any) {
            setFormError(e?.response?.data?.message || t("mentor.questCommand.errors.unexpected"));
        } finally {
            setSubmitting(false);
        }
    };

    const inputCls = "w-full px-3 py-2 border-2 border-black rounded-xl text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-violet-300 placeholder:text-gray-400";

    // Range hint for current difficulty
    const currentRange = ranges.find((r) => r.difficulty === form.difficulty);

    return (
        <>
            <PageMeta title="Quest Command — HabitEvolve" description="Assign quests to your party" />
            <PageBreadcrumb pageTitle={t("mentor.questCommand.pageTitle")} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* ── Left: Target + Limits ──────────────────────────────── */}
                <div className="lg:col-span-3 flex flex-col gap-4">
                    {/* Target selection */}
                    <div className="bg-[#EDE9FE] border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] p-5">
                        <h2 className="text-lg font-black mb-4">{t("mentor.questCommand.selectTarget")}</h2>

                        <label className="block text-xs font-black uppercase tracking-wider mb-1">{t("mentor.questCommand.party")}</label>
                        <select
                            value={selectedPartyId}
                            onChange={(e) => {
                                setSelectedPartyId(e.target.value ? parseInt(e.target.value) : "");
                                setSelectedMemberId("");
                            }}
                            className={inputCls}
                            disabled={loadingParties}
                        >
                            <option value="">{loadingParties ? t("mentor.questCommand.loading") : t("mentor.questCommand.pickParty")}</option>
                            {parties.map((p) => (
                                <option key={p.partyId} value={p.partyId}>
                                    {p.name} ({p.memberCount})
                                </option>
                            ))}
                        </select>

                        {selectedPartyId !== "" && (
                            <div className="mt-4">
                                <label className="block text-xs font-black uppercase tracking-wider mb-2">{t("mentor.questCommand.assignmentMode")}</label>
                                <div className="flex gap-2">
                                    {(["individual", "party"] as AssignMode[]).map((mode) => (
                                        <button
                                            key={mode}
                                            onClick={() => { setAssignMode(mode); setSelectedMemberId(""); }}
                                            className={`flex-1 py-2 border-2 border-black rounded-xl text-xs font-black transition-all ${
                                                assignMode === mode
                                                    ? "bg-[#7C3AED] text-white shadow-none"
                                                    : "bg-white shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
                                            }`}
                                        >
                                            {mode === "individual" ? `👤 ${t("mentor.questCommand.individual")}` : `⚔️ ${t("mentor.questCommand.fanOut")}`}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedPartyId !== "" && assignMode === "individual" && (
                            <div className="mt-4">
                                <label className="block text-xs font-black uppercase tracking-wider mb-1">{t("mentor.questCommand.member")}</label>
                                {loadingMembers ? (
                                    <div className="flex items-center gap-2 text-sm text-gray-500"><Spinner size={14} /> {t("mentor.questCommand.loadingMembers")}</div>
                                ) : (
                                    <select
                                        value={selectedMemberId}
                                        onChange={(e) => setSelectedMemberId(e.target.value ? parseInt(e.target.value) : "")}
                                        className={inputCls}
                                    >
                                        <option value="">{t("mentor.questCommand.pickMember")}</option>
                                        {members.map((m) => (
                                            <option key={m.userId} value={m.userId}>{m.username}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}

                        {selectedPartyId !== "" && assignMode === "party" && (
                            <div className="mt-4 p-3 bg-violet-100 border-2 border-violet-400 rounded-xl text-sm font-medium text-violet-800">
                                {t("mentor.questCommand.fanOutInfo", { count: members.length })}
                            </div>
                        )}
                    </div>

                    {/* Limits panel */}
                    <LimitsPanel
                        activeSub={activeSub}
                        ranges={ranges}
                        selectedDifficulty={form.difficulty}
                    />
                </div>

                {/* ── Right: Quest Form ──────────────────────────────────── */}
                <div className="lg:col-span-9">
                    <div className="bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] p-5">
                        <h2 className="text-lg font-black mb-4">{t("mentor.questCommand.questDetails")}</h2>

                        <div className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider mb-1">{t("mentor.questCommand.titleField")} *</label>
                                <input
                                    value={form.title}
                                    onChange={(e) => handleField("title", e.target.value)}
                                    placeholder={t("mentor.questCommand.titlePlaceholder")}
                                    className={inputCls}
                                />
                            </div>

                            {/* Description */}
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

                            {/* Difficulty selector */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider mb-1.5">Difficulty *</label>
                                <div className="flex gap-2">
                                    {DIFFICULTIES.map((diff) => {
                                        const s = DIFF_STYLE[diff];
                                        const isSelected = form.difficulty === diff;
                                        return (
                                            <button
                                                key={diff}
                                                type="button"
                                                onClick={() => applyRangeDefaults(diff)}
                                                className={`flex-1 py-2.5 border-2 border-black rounded-xl font-black text-sm transition-all ${
                                                    isSelected
                                                        ? `${s.active} shadow-none translate-x-0.5 translate-y-0.5`
                                                        : `${s.inactive} shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75`
                                                }`}
                                            >
                                                {s.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Damage + M-Gold with range hints */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider mb-1">
                                        {t("mentor.questCommand.damage")}
                                        {currentRange && (
                                            <span className="ml-1 text-gray-400 font-medium normal-case">
                                                ({currentRange.damageMin}–{currentRange.damageMax})
                                            </span>
                                        )}
                                    </label>
                                    <input
                                        type="number"
                                        min={currentRange?.damageMin ?? 1}
                                        max={currentRange?.damageMax}
                                        value={form.damage}
                                        onChange={(e) => handleField("damage", parseInt(e.target.value) || 0)}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider mb-1">
                                        M-Gold Reward
                                        {currentRange && (
                                            <span className="ml-1 text-gray-400 font-medium normal-case">
                                                ({currentRange.mGoldMin}–{currentRange.mGoldMax})
                                            </span>
                                        )}
                                    </label>
                                    <input
                                        type="number"
                                        min={currentRange?.mGoldMin ?? 1}
                                        max={currentRange?.mGoldMax}
                                        value={form.rewardMGold}
                                        onChange={(e) => handleField("rewardMGold", parseInt(e.target.value) || 0)}
                                        className={inputCls}
                                    />
                                </div>
                            </div>

                            {/* Proof type + Deadline */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
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
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider mb-1">{t("mentor.questCommand.deadline")}</label>
                                    <input
                                        type="datetime-local"
                                        value={form.deadlineAt}
                                        onChange={(e) => handleField("deadlineAt", e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                            </div>

                            {/* Mandatory toggle */}
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={form.isMandatory}
                                    onChange={(e) => handleField("isMandatory", e.target.checked)}
                                    className="w-4 h-4 accent-violet-600"
                                />
                                <span className="text-sm font-bold">{t("mentor.questCommand.mandatoryQuest")}</span>
                                {form.isMandatory && (
                                    <span className="text-xs text-orange-600 font-bold">⚠️ Fail → Shared HP -{form.difficulty === "HARD" ? 20 : 20}</span>
                                )}
                            </label>
                        </div>

                        {formError && (
                            <div className="mt-4 p-3 bg-red-100 border-2 border-red-400 rounded-xl text-sm font-bold text-red-700">
                                {formError}
                            </div>
                        )}
                        {formSuccess && (
                            <div className="mt-4 p-3 bg-emerald-100 border-2 border-emerald-400 rounded-xl text-sm font-bold text-emerald-800">
                                {formSuccess}
                            </div>
                        )}

                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !selectedPartyId}
                            className="mt-5 w-full py-3 border-2 border-black rounded-full font-black text-sm bg-violet-500 text-white shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[3px_3px_0_0_#1A1D20] transition-all inline-flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <><Spinner size={16} /> {t("mentor.questCommand.assigning")}</>
                            ) : assignMode === "individual" ? (
                                `⚡ ${t("mentor.questCommand.assignQuest")}`
                            ) : (
                                `⚔️ ${t("mentor.questCommand.fanOut")}`
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Quest Table ────────────────────────────────────────────── */}
            {selectedPartyId !== "" && (
                <div className="mt-8">
                    <h2 className="text-xl font-black mb-4">
                        {t("mentor.questCommand.activeQuests")}
                        {loadingQuests && <span className="ml-2 inline-flex"><Spinner size={16} /></span>}
                    </h2>
                    <div className="bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-4 border-black bg-[#EDE9FE]">
                                    {[
                                        t("mentor.questCommand.colTitle"),
                                        t("mentor.questCommand.colAssignee"),
                                        "Difficulty",
                                        t("mentor.questCommand.damage"),
                                        "M-Gold",
                                        t("mentor.questCommand.proofType"),
                                        t("mentor.questCommand.colStatus"),
                                        t("mentor.questCommand.deadline"),
                                        "",
                                    ].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left font-black text-xs uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {quests.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-12 text-center text-gray-400 font-medium">
                                            {t("mentor.questCommand.noQuests")}
                                        </td>
                                    </tr>
                                ) : (
                                    quests.map((q) => {
                                        const s = STATUS_STYLES[q.status] ?? STATUS_STYLES.NotStarted;
                                        return (
                                            <tr key={q.questId} className="border-b-2 border-gray-100 hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 font-bold max-w-44 truncate">{q.title}</td>
                                                <td className="px-4 py-3 text-gray-600">{q.username ?? "—"}</td>
                                                <td className="px-4 py-3">
                                                    {q.difficulty && (
                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-black border-2 border-black ${DIFF_STYLE[q.difficulty]?.inactive ?? "bg-gray-100 text-gray-700"}`}>
                                                            {DIFF_STYLE[q.difficulty]?.label ?? q.difficulty}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 font-black text-red-600">{q.damage}</td>
                                                <td className="px-4 py-3 font-black text-amber-600">{q.rewardMGold} 🪙</td>
                                                <td className="px-4 py-3 text-xs font-bold text-gray-500">{q.proofType ?? "ANY"}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-black border-2 ${s.bg} ${s.border} ${s.text}`}>
                                                        {q.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-500">
                                                    {q.deadlineAt ? new Date(q.deadlineAt).toLocaleDateString() : "—"}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {q.status === "NotStarted" && (
                                                        <button
                                                            onClick={() => setDeleteTarget(q)}
                                                            className="p-1.5 bg-red-100 border-2 border-red-400 rounded-lg hover:bg-red-200 transition-colors"
                                                            title="Delete quest"
                                                        >
                                                            <svg className="w-3.5 h-3.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <DeleteQuestModal
                    quest={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onDeleted={() => { setDeleteTarget(null); fetchQuests(); }}
                />
            )}
        </>
    );
}

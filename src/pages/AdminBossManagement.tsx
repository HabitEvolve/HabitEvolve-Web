import { useState, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Swords, Plus, Pencil, Settings2, X, Save,
  ChevronLeft, ChevronRight, Loader2, Filter, Users,
  CalendarDays, Trash2, CalendarClock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAlert } from "../context/AlertContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { adminBossApi } from "../api/adminBossApi";
import type {
  BossTemplateDto,
  CreateBossTemplatePayload,
  BossModeInput,
  UpdateBossTemplatePayload,
  BossModePayload,
  BossTemplateStatus,
  BossModeType,
  PackageTier,
  RewardTierType,
  WeeklyBossScheduleDto,
} from "../types/adminBoss.types";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

// WebDemo prefill defaults for the 3 modes (B7). Admin only tweaks what they need.
const DEFAULT_MODES: Record<BossModeType, BossModeInput> = {
  Easy:   { minTier: "Free",    partyMin: 2, partyMax: 4,  bossHp: 500,
            maxQuestPerMemberPerDay: 1, maxPartyQuestPerWeek: 4,
            maxDamagePerQuest: 100, mGoldRewardCapPerQuest: 20,  rewardTier: "BRONZE" },
  Normal: { minTier: "Basic",   partyMin: 3, partyMax: 8,  bossHp: 1200,
            maxQuestPerMemberPerDay: 2, maxPartyQuestPerWeek: 8,
            maxDamagePerQuest: 200, mGoldRewardCapPerQuest: 100, rewardTier: "SILVER" },
  Hard:   { minTier: "Premium", partyMin: 5, partyMax: 20, bossHp: 3000,
            maxQuestPerMemberPerDay: 5, maxPartyQuestPerWeek: 20,
            maxDamagePerQuest: 500, mGoldRewardCapPerQuest: 300, rewardTier: "GOLD" },
};

const EMPTY_MODE: BossModePayload = {
  mode: "Easy", minTier: "Free",
  partyMin: 2, partyMax: 6,
  bossHp: 10000,
  maxQuestPerMemberPerDay: 3, maxPartyQuestPerWeek: 20,
  maxDamagePerQuest: 500, mGoldRewardCapPerQuest: 100,
  rewardTier: "BASIC",
};

// ── STYLES ────────────────────────────────────────────────────────────────────
const btnBase =
  "inline-flex items-center gap-2 px-4 py-2 font-black text-sm border-2 border-black rounded-full " +
  "shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 " +
  "disabled:shadow-[3px_3px_0_0_#1A1D20] transition-all";

const inputCls =
  "w-full px-4 py-2.5 border-2 border-black dark:border-gray-600 rounded-2xl text-sm font-medium " +
  "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 " +
  "focus:outline-none focus:ring-2 focus:ring-purple-300 dark:focus:ring-purple-600 " +
  "placeholder:text-gray-400 dark:placeholder:text-gray-500";

// ── HELPERS ───────────────────────────────────────────────────────────────────
const errMsg = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

// Flatten the per-field `errors` from a 400 envelope (FluentValidation) into a string list.
const errList = (e: unknown): string[] => {
  const errs = (e as { response?: { data?: { errors?: unknown } } })?.response?.data?.errors;
  if (Array.isArray(errs)) return errs.map(String);
  if (errs && typeof errs === "object") return Object.values(errs as Record<string, unknown>).flat().map(String);
  return [];
};

const MODE_ORDER: BossModeType[] = ["Easy", "Normal", "Hard"];

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

// Local-time YYYY-MM-DD (avoids the UTC shift of toISOString()).
const toYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// From any date within a week, return that week's Monday (start) and Sunday (end).
// Boss week runs MON 00:00 → SUN 23:59.
const weekBounds = (dateStr: string): { start: string; end: string } | null => {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  const day = d.getDay();                       // 0=Sun … 6=Sat
  const mon = new Date(d);
  mon.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: toYmd(mon), end: toYmd(sun) };
};

const SI = (src: string) => (
  <img src={src} alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
);

// ── ICONS (lucide-react wrappers) ─────────────────────────────────────────────
const SwordsIcon = ({ size = 20 }: { size?: number }) => <Swords width={size} height={size} />;
const PlusIcon = () => <Plus className="w-3.5 h-3.5" />;
const PencilIcon = () => <Pencil className="w-3 h-3" />;
const SettingsIcon = () => <Settings2 className="w-3 h-3" />;
const XIcon = () => <X className="w-4 h-4" />;
const SaveIcon = () => <Save className="w-3.5 h-3.5" />;
const ChevLeft = () => <ChevronLeft className="w-3.5 h-3.5" />;
const ChevRight = () => <ChevronRight className="w-3.5 h-3.5" />;
const Spinner = ({ size = 18 }: { size?: number }) => <Loader2 className="animate-spin" width={size} height={size} />;

// ── BADGES ────────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { bg: string; border: string; text: string; icon: ReactNode }> = {
  "":        { bg: "bg-gray-100",   border: "border-gray-300",   text: "text-gray-600",   icon: <Filter className="w-3.5 h-3.5 shrink-0" /> },
  Draft:     { bg: "bg-amber-100",  border: "border-amber-400",  text: "text-amber-800",  icon: SI("/icon/Item/Scroll/64px/Scroll 1st 64px.png") },
  Published: { bg: "bg-green-100",  border: "border-green-400",  text: "text-green-800",  icon: SI("/icon/UI/Checkmark/64px/Checkmark 1st 64px.png") },
  Archived:  { bg: "bg-gray-100",   border: "border-gray-400",   text: "text-gray-600",   icon: SI("/icon/Item/Chest/64px/Chest 1st 64px.png") },
};
const STATUS_KEYS = ["", "Draft", "Published", "Archived"] as const;

const StatusBadge = ({ status }: { status: BossTemplateStatus }) => {
  const c = STATUS_CFG[status] ?? STATUS_CFG.Draft;
  return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border ${c.bg} ${c.border} ${c.text}`}>{c.icon} {status}</span>;
};

const MODE_CFG: Record<BossModeType, { bg: string; border: string; text: string; cardBg: string; cardBorder: string; icon: ReactNode; iconSrc: string }> = {
  Easy:   { bg: "bg-green-100",  border: "border-green-400",  text: "text-green-800",  cardBg: "bg-green-50 dark:bg-green-900/20",  cardBorder: "border-green-400 dark:border-green-700",  icon: SI("/icon/Nature/Leaf/64px/Leaf 1st 64px.png"),     iconSrc: "/icon/Nature/Leaf/64px/Leaf 1st 64px.png" },
  Normal: { bg: "bg-blue-100",   border: "border-blue-400",   text: "text-blue-800",   cardBg: "bg-blue-50 dark:bg-blue-900/20",   cardBorder: "border-blue-400 dark:border-blue-700",   icon: SI("/icon/Item/Sword/64px/Sword 1st 64px.png"),     iconSrc: "/icon/Item/Sword/64px/Sword 1st 64px.png" },
  Hard:   { bg: "bg-red-100",    border: "border-red-400",    text: "text-red-800",    cardBg: "bg-red-50 dark:bg-red-900/20",    cardBorder: "border-red-400 dark:border-red-700",    icon: SI("/icon/Main/Fire 2/64w/Fire 64px.png"),          iconSrc: "/icon/Main/Fire 2/64w/Fire 64px.png" },
};
const ModeBadge = ({ mode }: { mode: BossModeType }) => {
  const c = MODE_CFG[mode] ?? MODE_CFG.Easy;
  return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border ${c.bg} ${c.border} ${c.text}`}>{c.icon} {mode}</span>;
};

const TIER_CFG: Record<PackageTier, { bg: string; border: string; text: string; icon: ReactNode }> = {
  Free:    { bg: "bg-gray-100",   border: "border-gray-400",   text: "text-gray-700",   icon: SI("/icon/Item/Shield/64px/Shield 1st 64px.png") },
  Basic:   { bg: "bg-blue-100",   border: "border-blue-400",   text: "text-blue-700",   icon: SI("/icon/Item/Medal/64px/Bronze Medal 1st 64px.png") },
  Premium: { bg: "bg-purple-100", border: "border-purple-400", text: "text-purple-800", icon: SI("/icon/Item/Crown/64px/Crown 1st 64px.png") },
};
const TierBadge = ({ tier }: { tier: PackageTier }) => {
  const c = TIER_CFG[tier] ?? TIER_CFG.Free;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${c.bg} ${c.border} ${c.text}`}>{c.icon} {tier}</span>;
};

const REWARD_CFG: Record<RewardTierType, { bg: string; border: string; text: string; icon: ReactNode }> = {
  BASIC:    { bg: "bg-gray-100",   border: "border-gray-400",   text: "text-gray-700",   icon: SI("/icon/Item/Chest/64px/Chest 1st 64px.png") },
  STANDARD: { bg: "bg-blue-100",   border: "border-blue-400",   text: "text-blue-700",   icon: SI("/icon/Main/Star/64px/Golden Star 1st 64px.png") },
  PREMIUM:  { bg: "bg-yellow-100", border: "border-yellow-500", text: "text-yellow-800", icon: SI("/icon/Item/Trophy/64w/Golden Trophy 1st 64px.png") },
};
const RewardBadge = ({ tier }: { tier: RewardTierType }) => {
  const c = REWARD_CFG[tier] ?? REWARD_CFG.BASIC;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${c.bg} ${c.border} ${c.text}`}>{c.icon} {tier}</span>;
};

// ── LABEL ─────────────────────────────────────────────────────────────────────
const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-black text-gray-700 uppercase tracking-wide mb-1.5">{children}</p>
);

// ── MODE FIELDSET (one Easy/Normal/Hard block inside the atomic create form) ────
const ModeFieldset = ({ mode, value, onChange }: {
  mode: BossModeType;
  value: BossModeInput;
  onChange: (patch: Partial<BossModeInput>) => void;
}) => {
  const { t } = useTranslation();
  const c = MODE_CFG[mode] ?? MODE_CFG.Easy;
  const num = (k: keyof BossModeInput, min = 0) => (
    <input type="number" min={min} value={value[k] as number}
      onChange={e => onChange({ [k]: Number(e.target.value) } as Partial<BossModeInput>)}
      className={inputCls} />
  );
  return (
    <div className={`border-2 ${c.cardBorder} ${c.cardBg} rounded-2xl p-4 space-y-3`}>
      <div className="flex items-center gap-2">
        <img src={c.iconSrc} alt="" className="w-6 h-6 object-contain shrink-0" />
        <ModeBadge mode={mode} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t("admin.bossManagement.modesModal.minTierLabel")}</Label>
          <select value={value.minTier} onChange={e => onChange({ minTier: e.target.value as PackageTier })} className={inputCls}>
            {(["Free", "Basic", "Premium"] as PackageTier[]).map(tt => <option key={tt} value={tt}>{tt}</option>)}
          </select>
        </div>
        <div><Label>{t("admin.bossManagement.modesModal.bossHpLabel")}</Label>{num("bossHp", 1)}</div>
        <div><Label>{t("admin.bossManagement.modesModal.partyMinLabel")}</Label>{num("partyMin", 0)}</div>
        <div><Label>{t("admin.bossManagement.modesModal.partyMaxLabel")}</Label>{num("partyMax", 0)}</div>
        <div><Label>{t("admin.bossManagement.modesModal.maxQuestsLabel")}</Label>{num("maxQuestPerMemberPerDay", 0)}</div>
        <div><Label>{t("admin.bossManagement.modesModal.maxPartyQuestsLabel")}</Label>{num("maxPartyQuestPerWeek", 0)}</div>
        <div><Label>{t("admin.bossManagement.modesModal.maxDamageLabel")}</Label>{num("maxDamagePerQuest", 0)}</div>
        <div><Label>{t("admin.bossManagement.modesModal.goldCapLabel")}</Label>{num("mGoldRewardCapPerQuest", 0)}</div>
      </div>
      <div>
        <Label>{t("admin.bossManagement.modesModal.rewardTierLabel")}</Label>
        <input type="text" value={value.rewardTier} onChange={e => onChange({ rewardTier: e.target.value })}
          placeholder="BRONZE / SILVER / GOLD" className={inputCls} />
      </div>
    </div>
  );
};

// ── TEMPLATE FORM MODAL ───────────────────────────────────────────────────────
// Create: atomic — theme + all 3 modes in one POST (B7). Edit: theme name/description only
// (modes are edited separately via the "Configure Modes" panel).
interface TemplateFormModalProps {
  template: BossTemplateDto | null;
  onClose: () => void;
  onAlert: (a: { type: "success" | "error"; message: string }) => void;
  onSuccess: () => void;
}

const TemplateFormModal = ({ template, onClose, onAlert, onSuccess }: TemplateFormModalProps) => {
  const { t } = useTranslation();
  const isEdit = template !== null;

  const [themeName, setThemeName] = useState(isEdit ? template.themeName : "");
  const [description, setDescription] = useState(isEdit ? (template.description ?? "") : "");
  const [modes, setModes] = useState<Record<BossModeType, BossModeInput>>(() => ({
    Easy: { ...DEFAULT_MODES.Easy },
    Normal: { ...DEFAULT_MODES.Normal },
    Hard: { ...DEFAULT_MODES.Hard },
  }));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);

  const patchMode = (m: BossModeType, patch: Partial<BossModeInput>) =>
    setModes(prev => ({ ...prev, [m]: { ...prev[m], ...patch } }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors([]);

    if (!themeName.trim()) { setFormError("Theme name is required."); return; }
    if (!isEdit) {
      for (const m of MODE_ORDER) {
        const md = modes[m];
        if (md.bossHp <= 0) { setFormError(`${m}: Boss HP must be greater than 0.`); return; }
        if (md.partyMax < md.partyMin) { setFormError(`${m}: Party Max must be ≥ Party Min.`); return; }
        if (!md.rewardTier.trim()) { setFormError(`${m}: Reward Tier is required.`); return; }
      }
    }

    setSaving(true);
    try {
      if (isEdit) {
        const payload: UpdateBossTemplatePayload = {
          themeName: themeName.trim(),
          description: description.trim(),
        };
        await adminBossApi.updateTemplate(template.bossTemplateId, payload);
        onAlert({ type: "success", message: `"${themeName}" updated!` });
      } else {
        const payload: CreateBossTemplatePayload = {
          themeName: themeName.trim(),
          description: description.trim() || undefined,
          easy: modes.Easy,
          normal: modes.Normal,
          hard: modes.Hard,
        };
        await adminBossApi.createTemplate(payload);
        onAlert({ type: "success", message: `"${themeName}" created!` });
      }
      onSuccess();
      onClose();
    } catch (err) {
      setFieldErrors(errList(err));
      setFormError(errMsg(err) ?? t("admin.bossManagement.modesModal.errorSaveTemplate"));
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-99999 w-screen h-screen flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`modal-content bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[8px_8px_0_0_#1A1D20] w-full ${isEdit ? "max-w-xl" : "max-w-3xl"} max-h-[92vh] flex flex-col overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black bg-purple-50 dark:bg-purple-900/30 shrink-0 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-purple-300 dark:bg-purple-700 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#1A1D20]">
              <SwordsIcon size={17} />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900">{isEdit ? t("admin.bossManagement.form.editTitle") : t("admin.bossManagement.form.newTitle")}</h2>
              <p className="text-xs font-medium text-gray-500">{isEdit ? template.themeName : t("admin.bossManagement.form.subtitle")}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
            <XIcon />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>{t("admin.bossManagement.form.themeNameLabel")}</Label>
              <input required type="text" value={themeName} onChange={e => setThemeName(e.target.value)}
                maxLength={200} placeholder={t("admin.bossManagement.form.themeNamePlaceholder")} className={inputCls} />
            </div>
            <div>
              <Label>{t("admin.bossManagement.form.descLabel")}</Label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={2} placeholder={t("admin.bossManagement.form.descPlaceholder")} className={`${inputCls} resize-none`} />
            </div>

            {isEdit ? (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-2xl">
                <img src="/icon/Item/Book/64px/Blue Book 1st 64px.png" alt="" className="w-4 h-4 object-contain shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">{t("admin.bossManagement.form.editModesHint")}</p>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-2xl">
                  <img src="/icon/Item/Book/64px/Blue Book 1st 64px.png" alt="" className="w-4 h-4 object-contain shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">{t("admin.bossManagement.form.createModesHint")}</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {MODE_ORDER.map(m => (
                    <ModeFieldset key={m} mode={m} value={modes[m]} onChange={patch => patchMode(m, patch)} />
                  ))}
                </div>
              </>
            )}

            {(formError || fieldErrors.length > 0) && (
              <div className="text-xs font-bold text-red-600 bg-red-50 border-2 border-red-300 rounded-xl px-3 py-2 space-y-1">
                {formError && <p>{formError}</p>}
                {fieldErrors.length > 0 && (
                  <ul className="list-disc list-inside font-semibold">
                    {fieldErrors.map((msg, i) => <li key={i}>{msg}</li>)}
                  </ul>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2 border-t-2 border-gray-100 dark:border-gray-700">
              <button type="button" onClick={onClose} disabled={saving}
                className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>{t("admin.bossManagement.form.cancel")}</button>
              <button type="submit" disabled={saving}
                className={`${btnBase} flex-1 justify-center bg-purple-200 dark:bg-purple-700 text-purple-900 dark:text-white`}>
                {saving ? <><Spinner size={13} /> {t("admin.bossManagement.form.saving")}</> : <><SaveIcon /> {isEdit ? t("admin.bossManagement.form.update") : t("admin.bossManagement.form.create")}</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ── BOSS MODES MODAL ──────────────────────────────────────────────────────────
interface BossModesModalProps {
  templateId: number;
  templateName: string;
  onClose: () => void;
  onAlert: (a: { type: "success" | "error"; message: string }) => void;
}

const BossModesModal = ({ templateId, templateName, onClose, onAlert }: BossModesModalProps) => {
  const { t } = useTranslation();
  const [tpl, setTpl] = useState<BossTemplateDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<BossModePayload>({ ...EMPTY_MODE });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchTpl = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminBossApi.getTemplateById(templateId);
      if (res.success && res.data) setTpl(res.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [templateId]);

  useEffect(() => { fetchTpl(); }, [fetchTpl]);

  const setN = (k: keyof BossModePayload, v: number) => setForm(f => ({ ...f, [k]: v }));
  const setS = (k: keyof BossModePayload, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleAddMode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await adminBossApi.addBossMode(templateId, form);
      onAlert({ type: "success", message: `${form.mode} mode added to "${templateName}"!` });
      await fetchTpl();
      setForm({ ...EMPTY_MODE });
    } catch (err) {
      setFormError(errMsg(err) ?? t("admin.bossManagement.modesModal.errorAddMode"));
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-99999 w-screen h-screen flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="modal-content bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[8px_8px_0_0_#1A1D20] w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black bg-gray-50 dark:bg-gray-800 shrink-0 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-orange-300 dark:bg-orange-700 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#1A1D20]">
              <SettingsIcon />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900">{t("admin.bossManagement.modesModal.title")}</h2>
              <p className="text-xs font-medium text-gray-500">{templateName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
            <XIcon />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">

          {/* ── LEFT: CURRENT MODES ───────────────────────────────────── */}
          <div className="lg:w-[52%] border-b-2 lg:border-b-0 lg:border-r-2 border-black/10 overflow-y-auto p-5 space-y-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest sticky top-0 bg-white dark:bg-[#1e2a3a] pb-2">
              {t("admin.bossManagement.modesModal.currentModes")} ({tpl?.modes.length ?? 0} / 3)
            </p>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
                <Spinner size={24} /><span className="text-sm font-bold">Loading…</span>
              </div>
            ) : !tpl || tpl.modes.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
                <img src="/icon/Player/Skull/64px/Skull 1st 64px.png" alt="" className="w-12 h-12 object-contain" />
                <p className="font-black text-gray-500">{t("admin.bossManagement.modesModal.noModes")}</p>
                <p className="text-xs font-medium">{t("admin.bossManagement.modesModal.addModeHint")}</p>
              </div>
            ) : (
              tpl.modes.map(m => {
                const mc = MODE_CFG[m.mode] ?? MODE_CFG.Easy;
                return (
                  <div key={m.mode}
                    className={`border-2 ${mc.cardBorder} ${mc.cardBg} rounded-2xl p-4 shadow-[3px_3px_0_0_#1A1D20]`}>
                    {/* Mode header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <img src={mc.iconSrc} alt="" className="w-8 h-8 object-contain shrink-0" />
                        <div>
                          <ModeBadge mode={m.mode} />
                          <p className="text-[10px] font-bold text-gray-500 mt-0.5">Min: <TierBadge tier={m.minTier} /></p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase">Boss HP</p>
                        <p className="text-xl font-black text-gray-900">{m.bossHp.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-gray-500 font-medium"><Users className="w-3.5 h-3.5 shrink-0" /> Party</span>
                        <span className="font-black text-gray-800">{m.partyMin} – {m.partyMax}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-gray-500 font-medium"><img src="/icon/Main/Lighting/64px/Lighting 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain shrink-0" /> Max Dmg/Q</span>
                        <span className="font-black text-gray-800">{m.maxDamagePerQuest.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-gray-500 font-medium"><img src="/icon/Main/Stats/64px/Stats 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain shrink-0" /> Quests/Day</span>
                        <span className="font-black text-gray-800">{m.maxQuestPerMemberPerDay}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-gray-500 font-medium">
                          <img src="/icon/Currency/Coin/64px/Golden Coin 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain shrink-0" /> Gold/Q
                        </span>
                        <span className="font-black text-gray-800">{m.mGoldRewardCapPerQuest} mG</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-gray-500 font-medium"><img src="/icon/Item/Calendar/64px/Calendar 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain shrink-0" /> Quests/Wk</span>
                        <span className="font-black text-gray-800">{m.maxPartyQuestPerWeek}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-gray-500 font-medium"><img src="/icon/Item/Clock/64px/Clock 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain shrink-0" /> Deadline</span>
                        <span className="font-black text-gray-800 text-[10px]">—</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-black/10">
                      <RewardBadge tier={m.rewardTier} />
                      <span className="text-[10px] text-gray-400 font-medium">Proof: per package</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── RIGHT: ADD MODE FORM ──────────────────────────────────── */}
          <div className="lg:w-[48%] overflow-y-auto p-5">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
              {tpl && tpl.modes.length >= 3 ? (
              <span className="inline-flex items-center gap-1.5">
                {t("admin.bossManagement.modesModal.allConfigured")}
                <img src="/icon/UI/Checkmark/64px/Checkmark 1st 64px.png" alt="" className="w-3 h-3 object-contain" />
              </span>
            ) : t("admin.bossManagement.modesModal.addMode")}
            </p>

            {tpl && tpl.modes.length >= 3 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-gray-400">
                <img src="/icon/UI/Checkmark/64px/Checkmark 1st 64px.png" alt="" className="w-12 h-12 object-contain" />
                <p className="font-black text-gray-600">{t("admin.bossManagement.modesModal.allConfiguredHint")}</p>
                <p className="text-xs font-medium text-center">{t("admin.bossManagement.modesModal.allModesSet")}</p>
              </div>
            ) : (
              <form onSubmit={handleAddMode} className="space-y-3">
                {/* mode + minTier */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t("admin.bossManagement.modesModal.modeLabel")}</Label>
                    <select value={form.mode}
                      onChange={e => setS("mode", e.target.value)}
                      className={inputCls}>
                      {(["Easy", "Normal", "Hard"] as BossModeType[]).map(m => (
                        <option key={m} value={m}
                          disabled={tpl?.modes.some(ex => ex.mode === m)}>
                          {m}{tpl?.modes.some(ex => ex.mode === m) ? " ✓" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>{t("admin.bossManagement.modesModal.minTierLabel")}</Label>
                    <select value={form.minTier}
                      onChange={e => setS("minTier", e.target.value)}
                      className={inputCls}>
                      {(["Free", "Basic", "Premium"] as PackageTier[]).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* partyMin + partyMax */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t("admin.bossManagement.modesModal.partyMinLabel")}</Label>
                    <input type="number" min={1} value={form.partyMin}
                      onChange={e => setN("partyMin", Number(e.target.value))} className={inputCls} />
                  </div>
                  <div>
                    <Label>{t("admin.bossManagement.modesModal.partyMaxLabel")}</Label>
                    <input type="number" min={1} value={form.partyMax}
                      onChange={e => setN("partyMax", Number(e.target.value))} className={inputCls} />
                  </div>
                </div>

                {/* bossHp */}
                <div>
                  <Label>{t("admin.bossManagement.modesModal.bossHpLabel")}</Label>
                  <input type="number" min={1} value={form.bossHp}
                    onChange={e => setN("bossHp", Number(e.target.value))} className={inputCls} />
                </div>

                {/* quest limits */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t("admin.bossManagement.modesModal.maxQuestsLabel")}</Label>
                    <input type="number" min={1} value={form.maxQuestPerMemberPerDay}
                      onChange={e => setN("maxQuestPerMemberPerDay", Number(e.target.value))} className={inputCls} />
                  </div>
                  <div>
                    <Label>{t("admin.bossManagement.modesModal.maxPartyQuestsLabel")}</Label>
                    <input type="number" min={1} value={form.maxPartyQuestPerWeek}
                      onChange={e => setN("maxPartyQuestPerWeek", Number(e.target.value))} className={inputCls} />
                  </div>
                </div>

                {/* damage + gold */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t("admin.bossManagement.modesModal.maxDamageLabel")}</Label>
                    <input type="number" min={1} value={form.maxDamagePerQuest}
                      onChange={e => setN("maxDamagePerQuest", Number(e.target.value))} className={inputCls} />
                  </div>
                  <div>
                    <Label>
                      <img src="/icon/Currency/Coin/64px/Golden Coin 1st 64px.png" alt="" className="inline w-4 h-4 mr-1 align-text-bottom" />
                      {t("admin.bossManagement.modesModal.goldCapLabel")}
                    </Label>
                    <input type="number" min={0} value={form.mGoldRewardCapPerQuest}
                      onChange={e => setN("mGoldRewardCapPerQuest", Number(e.target.value))} className={inputCls} />
                  </div>
                </div>

                {/* rewardTier */}
                <div>
                  <Label>{t("admin.bossManagement.modesModal.rewardTierLabel")}</Label>
                  <select value={form.rewardTier}
                    onChange={e => setS("rewardTier", e.target.value)}
                    className={inputCls}>
                    {(["BASIC", "STANDARD", "PREMIUM"] as RewardTierType[]).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {formError && (
                  <p className="text-xs font-bold text-red-600 bg-red-50 border-2 border-red-300 rounded-xl px-3 py-2">{formError}</p>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={onClose} disabled={submitting}
                    className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>{t("admin.bossManagement.modesModal.close")}</button>
                  <button type="submit" disabled={submitting}
                    className={`${btnBase} flex-1 justify-center bg-orange-200 dark:bg-orange-700 text-orange-900 dark:text-white`}>
                    {submitting ? <><Spinner size={13} /> {t("admin.bossManagement.modesModal.adding")}</> : <><PlusIcon /> {t("admin.bossManagement.modesModal.addMode")}</>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ── STATUS CONFIRM MODAL ──────────────────────────────────────────────────────
interface StatusConfirmModalProps {
  templateId: number;
  templateName: string;
  action: "publish" | "archive";
  onClose: () => void;
  onAlert: (a: { type: "success" | "error"; message: string }) => void;
  onSuccess: () => void;
}

const StatusConfirmModal = ({ templateId, templateName, action, onClose, onAlert, onSuccess }: StatusConfirmModalProps) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await adminBossApi.changeStatus(templateId, action);
      onAlert({ type: "success", message: `"${templateName}" ${action === "publish" ? "published" : "archived"}!` });
      onSuccess();
      onClose();
    } catch (err) {
      onAlert({ type: "error", message: errMsg(err) ?? `Failed to ${action} template.` });
      onClose();
    }
  };

  const isPublish = action === "publish";

  return createPortal(
    <div className="fixed inset-0 z-99999 w-screen h-screen flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="modal-content bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[8px_8px_0_0_#1A1D20] w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <img
            src={isPublish ? "/icon/Main/Upgrade/64px/Green Upgrade 1st 64px.png" : "/icon/Item/Chest/64px/Chest 1st 64px.png"}
            alt="" className="w-9 h-9 object-contain shrink-0"
          />
          <div>
            <h3 className="font-black text-gray-900">{isPublish ? t("admin.bossManagement.publishModal.title") : t("admin.bossManagement.archiveModal.title")}</h3>
            <p className="text-xs font-medium text-gray-500 mt-0.5">"{templateName}"</p>
          </div>
        </div>
        <p className="text-sm font-medium text-gray-700">
          {isPublish
            ? t("admin.bossManagement.publishModal.message")
            : t("admin.bossManagement.archiveModal.message")}
        </p>
        {!isPublish && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-2xl">
            <img src="/icon/UI/Warning/64px/Warning 1st 64px.png" alt="" className="w-4 h-4 object-contain shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-orange-800 dark:text-orange-300">{t("admin.bossManagement.archiveModal.warning")}</p>
          </div>
        )}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} disabled={loading}
            className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>{t("admin.bossManagement.form.cancel")}</button>
          <button onClick={handleConfirm} disabled={loading}
            className={`${btnBase} flex-1 justify-center ${isPublish ? "bg-green-300 text-green-900" : "bg-orange-300 text-orange-900"}`}>
            {loading ? <><Spinner size={13} /> {isPublish ? t("admin.bossManagement.publishModal.publishing") : t("admin.bossManagement.archiveModal.archiving")}</> : (
              <><img src={isPublish ? "/icon/Main/Upgrade/64px/Green Upgrade 1st 64px.png" : "/icon/Item/Chest/64px/Chest 1st 64px.png"} alt="" className="w-3.5 h-3.5 object-contain" /> {isPublish ? t("admin.bossManagement.publishModal.confirm") : t("admin.bossManagement.archiveModal.confirm")}</>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ── WEEKLY SCHEDULE CARD (B7 step ③) ──────────────────────────────────────────
// Assigns a Published theme to a week. BE normalises weekDate → Monday, one theme per week.
const ScheduleCard = ({ reloadKey, onAlert }: {
  reloadKey: number;   // bump to refetch after a publish/archive elsewhere on the page
  onAlert: (a: { type: "success" | "error"; message: string }) => void;
}) => {
  const { t } = useTranslation();
  const [schedules, setSchedules] = useState<WeeklyBossScheduleDto[]>([]);
  const [publishedTemplates, setPublishedTemplates] = useState<BossTemplateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateId, setTemplateId] = useState<number | "">("");
  const [weekDate, setWeekDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Published themes for the dropdown are fetched independently of the table's status filter.
      const [schedRes, tplRes] = await Promise.all([
        adminBossApi.getSchedules(false),
        adminBossApi.getTemplates({ status: "Published" }),
      ]);
      if (schedRes.success && schedRes.data) setSchedules(schedRes.data);
      if (tplRes.success && tplRes.data) setPublishedTemplates(tplRes.data);
    } catch { /* silent — surfaced on next action */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load, reloadKey]);

  const bounds = weekBounds(weekDate);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateId || !weekDate) return;

    // Overwrite guard: BE replaces the theme for a week that's already scheduled.
    if (bounds) {
      const clash = schedules.find(s => s.weekStart.slice(0, 10) === bounds.start && s.bossTemplateId !== templateId);
      if (clash) {
        const next = publishedTemplates.find(x => x.bossTemplateId === templateId)?.themeName ?? "";
        if (!window.confirm(t("admin.bossManagement.schedule.overwriteConfirm", { current: clash.themeName, next }))) return;
      }
    }

    setSaving(true);
    try {
      const res = await adminBossApi.setSchedule({ bossTemplateId: Number(templateId), weekDate });
      if (res.success) {
        onAlert({ type: "success", message: t("admin.bossManagement.schedule.assigned") });
        setWeekDate("");
        load();
      } else {
        onAlert({ type: "error", message: res.message ?? "Failed to schedule." });
      }
    } catch (err) {
      onAlert({ type: "error", message: errMsg(err) ?? "Failed to schedule." });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: number) => {
    setRemovingId(id);
    try {
      await adminBossApi.deleteSchedule(id);
      onAlert({ type: "success", message: t("admin.bossManagement.schedule.removed") });
      load();
    } catch (err) {
      onAlert({ type: "error", message: errMsg(err) ?? "Failed to remove schedule." });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-[#1e2a3a] border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b-2 border-black bg-indigo-50 dark:bg-indigo-900/30">
        <div className="w-9 h-9 rounded-2xl bg-indigo-300 dark:bg-indigo-700 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#1A1D20] shrink-0">
          <CalendarDays className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-black text-gray-900 dark:text-gray-100">{t("admin.bossManagement.schedule.title")}</h3>
          <p className="text-xs font-medium text-gray-500">{t("admin.bossManagement.schedule.subtitle")}</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Assign form */}
        {publishedTemplates.length === 0 ? (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-2xl">
            <img src="/icon/UI/Warning/64px/Warning 1st 64px.png" alt="" className="w-4 h-4 object-contain shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">{t("admin.bossManagement.schedule.noPublished")}</p>
          </div>
        ) : (
          <form onSubmit={handleAssign} className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <Label>{t("admin.bossManagement.schedule.themeLabel")}</Label>
              <select value={templateId} onChange={e => setTemplateId(e.target.value ? Number(e.target.value) : "")} className={inputCls}>
                <option value="">{t("admin.bossManagement.schedule.themePlaceholder")}</option>
                {publishedTemplates.map(tpl => (
                  <option key={tpl.bossTemplateId} value={tpl.bossTemplateId}>{tpl.themeName}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <Label>{t("admin.bossManagement.schedule.weekLabel")}</Label>
              <input
                type="date"
                value={weekDate}
                onChange={e => setWeekDate(e.target.value)}
                onClick={e => (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.()}
                onFocus={e => (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.()}
                className={`${inputCls} cursor-pointer`}
              />
              {bounds && (
                <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-300 mt-1">
                  {t("admin.bossManagement.schedule.weekPreview", { start: fmtDate(bounds.start), end: fmtDate(bounds.end) })}
                </p>
              )}
            </div>
            <button type="submit" disabled={saving || !templateId || !weekDate}
              className={`${btnBase} justify-center bg-indigo-200 dark:bg-indigo-700 text-indigo-900 dark:text-white`}>
              {saving ? <><Spinner size={13} /> {t("admin.bossManagement.schedule.assigning")}</> : <><Plus className="w-3.5 h-3.5" /> {t("admin.bossManagement.schedule.assign")}</>}
            </button>
          </form>
        )}

        {/* Schedule table */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
            <Spinner size={20} /><span className="text-sm font-bold">{t("admin.bossManagement.loading")}</span>
          </div>
        ) : schedules.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-gray-400">
            <CalendarClock className="w-10 h-10 opacity-30" />
            <p className="text-sm font-bold">{t("admin.bossManagement.schedule.empty")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50/60 dark:bg-gray-800/40">
                  {[
                    t("admin.bossManagement.schedule.colWeek"),
                    t("admin.bossManagement.schedule.colTheme"),
                    t("admin.bossManagement.schedule.colStatus"),
                    "",
                  ].map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {schedules.map(s => {
                  const notPublished = s.bossStatus !== "Published";
                  return (
                    <tr key={s.weeklyBossScheduleId} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-100">{fmtDate(s.weekStart)} → {fmtDate(s.weekEnd)}</span>
                          {s.isCurrentWeek && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full border border-green-400 bg-green-100 text-green-700">
                              {t("admin.bossManagement.schedule.thisWeek")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs font-black text-gray-900 dark:text-gray-100">{s.themeName}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className={notPublished ? "inline-flex flex-col gap-0.5" : ""}>
                          <StatusBadge status={s.bossStatus} />
                          {notPublished && (
                            <span className="text-[10px] font-bold text-red-600">{t("admin.bossManagement.schedule.notPublishedWarn")}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {s.isCurrentWeek ? (
                          <span className="text-[10px] font-black text-gray-400 uppercase">{t("admin.bossManagement.schedule.ongoing")}</span>
                        ) : (
                          <button
                            onClick={() => handleRemove(s.weeklyBossScheduleId)}
                            disabled={removingId === s.weeklyBossScheduleId}
                            title={t("admin.bossManagement.schedule.remove")}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-xl border-2 border-black bg-red-100 hover:bg-red-200 text-red-700 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50">
                            {removingId === s.weeklyBossScheduleId ? <Spinner size={13} /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
interface StatusConfirmState {
  templateId: number;
  templateName: string;
  action: "publish" | "archive";
}

export default function AdminBossManagement() {
  const { t } = useTranslation();

  // ── ALERT ─────────────────────────────────────────────────────────────────
  const globalAlert = useAlert();
  const setAlert = useCallback(
    (a: { type: "success" | "error"; message: string }) =>
      a.type === "success" ? globalAlert.success(a.message) : globalAlert.error(a.message),
    [globalAlert]
  );

  // ── DATA ──────────────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<BossTemplateDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  // Bumped after create/publish/archive so the Schedule card refetches its Published-theme dropdown + rows.
  const [scheduleReload, setScheduleReload] = useState(0);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminBossApi.getTemplates({
        status: statusFilter || undefined,
      });
      if (res.success && res.data) setTemplates(res.data);
      else setError("Failed to load templates.");
    } catch (err) {
      setError(errMsg(err) ?? "Network error fetching templates.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  // Refetch templates AND signal the schedule card to reload (used by create/publish/archive success).
  const refreshAll = useCallback(() => {
    fetchTemplates();
    setScheduleReload(n => n + 1);
  }, [fetchTemplates]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleStatusFilterChange = (s: string) => { setStatusFilter(s); setPage(1); };

  const hasMore = templates.length >= PAGE_SIZE;

  // ── MODALS ────────────────────────────────────────────────────────────────
  const [editingTemplate, setEditingTemplate] = useState<BossTemplateDto | null | "new">(null);
  const [modesTemplate, setModesTemplate] = useState<{ id: number; name: string } | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<StatusConfirmState | null>(null);

  return (
    <>
      <PageMeta title={t("admin.bossManagement.pageTitle")} description={t("admin.bossManagement.subtitle")} />
      <PageBreadcrumb pageTitle={t("admin.bossManagement.pageTitle")} />


      <div className="space-y-6 p-1">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-300 border-2 border-black flex items-center justify-center shadow-[3px_3px_0_0_#1A1D20] shrink-0">
              <SwordsIcon size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">{t("admin.bossManagement.pageTitle")}</h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">{t("admin.bossManagement.subtitle")}</p>
            </div>
          </div>
          <button onClick={() => setEditingTemplate("new")}
            className={`${btnBase} bg-purple-200 text-purple-900 shrink-0`}>
            <PlusIcon /> {t("admin.bossManagement.newTemplate")}
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 p-4 bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0_0_#1A1D20]">
          <span className="text-sm font-black text-gray-700 flex items-center gap-1.5 mr-1 shrink-0">
            <Filter className="w-4 h-4" /> {t("admin.bossManagement.filterStatus")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_KEYS.map(key => {
              const cfg = STATUS_CFG[key];
              const label = key === "" ? t("admin.bossManagement.filterAll") : key;
              return (
                <button
                  key={key}
                  onClick={() => handleStatusFilterChange(key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border-2 transition-all shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 ${cfg.bg} ${cfg.border} ${cfg.text} ${statusFilter === key ? "ring-2 ring-black ring-offset-1" : ""}`}
                >
                  {cfg.icon} {label}
                </button>
              );
            })}
          </div>
          <button onClick={fetchTemplates} disabled={loading}
            className={`${btnBase} ml-auto bg-purple-100 text-purple-900 py-1.5`}>
            {loading ? <><Spinner size={13} /> {t("admin.bossManagement.loading")}</> : t("admin.bossManagement.refresh")}
          </button>
        </div>

        {/* Weekly schedule */}
        <ScheduleCard reloadKey={scheduleReload} onAlert={setAlert} />

        {/* Table */}
        <div className="bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] overflow-hidden">
          {error ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <img src="/icon/UI/Warning/64px/Warning 1st 64px.png" alt="" className="w-12 h-12 object-contain" />
              <p className="font-black text-gray-700">{t("admin.bossManagement.loadError")}</p>
              <p className="text-sm text-gray-400">{error}</p>
              <button onClick={fetchTemplates} className={`${btnBase} bg-red-100 text-red-800`}>{t("admin.bossManagement.retry")}</button>
            </div>
          ) : loading && templates.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
              <Spinner size={32} /><p className="font-bold text-sm">{t("admin.bossManagement.loadingTemplates")}</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
              <img src="/icon/Player/Skull/64px/Skull 1st 64px.png" alt="" className="w-14 h-14 object-contain" />
              <p className="font-black text-lg text-gray-500">{t("admin.bossManagement.noTemplates")}</p>
              <p className="text-sm font-medium">{t("admin.bossManagement.createFirstBoss")}</p>
              <button onClick={() => setEditingTemplate("new")} className={`${btnBase} bg-purple-200 text-purple-900`}>
                <PlusIcon /> {t("admin.bossManagement.newTemplate")}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50/60">
                    {[
                      t("admin.bossManagement.table.num"),
                      t("admin.bossManagement.table.themeName"),
                      t("admin.bossManagement.table.activePeriod"),
                      t("admin.bossManagement.table.modes"),
                      t("admin.bossManagement.table.status"),
                      t("admin.bossManagement.table.actions"),
                    ].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {templates.map((tpl, idx) => (
                    <tr key={tpl.bossTemplateId} className="hover:bg-purple-50/30 transition-colors">
                      <td className="px-4 py-3 text-xs font-black text-gray-400">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="px-4 py-4 max-w-55">
                        <p className="font-black text-gray-900 truncate">{tpl.themeName}</p>
                        <p className="text-xs text-gray-400 font-medium mt-0.5 truncate">{tpl.description || t("admin.bossManagement.noDescription")}</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-xs font-bold text-gray-700">{fmtDate(tpl.activeWeekStart)}</p>
                        <p className="text-[10px] text-gray-400 font-medium">→ {fmtDate(tpl.activeWeekEnd)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {tpl.modes.length === 0 ? (
                            <span className="text-xs text-gray-400 font-medium">None</span>
                          ) : (
                            tpl.modes.map(m => <ModeBadge key={m.mode} mode={m.mode} />)
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={tpl.status} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Edit */}
                          <button title="Edit template info"
                            onClick={() => setEditingTemplate(tpl)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-blue-100 hover:bg-blue-200 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-blue-800">
                            <PencilIcon />
                          </button>
                          {/* Configure Modes */}
                          <button title="Configure boss modes"
                            onClick={() => setModesTemplate({ id: tpl.bossTemplateId, name: tpl.themeName })}
                            className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-orange-100 hover:bg-orange-200 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-orange-800">
                            <SettingsIcon />
                          </button>
                          {/* Publish */}
                          {tpl.status === "Draft" && (
                            <button title="Publish template"
                              onClick={() => setConfirmStatus({ templateId: tpl.bossTemplateId, templateName: tpl.themeName, action: "publish" })}
                              className="px-2.5 py-1 flex items-center gap-1 text-[10px] font-black rounded-full border-2 border-black bg-green-100 hover:bg-green-200 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-green-800 whitespace-nowrap">
                              {t("admin.bossManagement.publish")}
                            </button>
                          )}
                          {/* Archive */}
                          {tpl.status === "Published" && (
                            <button title="Archive template"
                              onClick={() => setConfirmStatus({ templateId: tpl.bossTemplateId, templateName: tpl.themeName, action: "archive" })}
                              className="px-2.5 py-1 flex items-center gap-1 text-[10px] font-black rounded-full border-2 border-black bg-orange-100 hover:bg-orange-200 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-orange-800 whitespace-nowrap">
                              {t("admin.bossManagement.archive")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!error && (templates.length > 0 || page > 1) && (
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500">
              {templates.length !== 1
                ? t("admin.bossManagement.pageInfoPlural", { page, count: templates.length })
                : t("admin.bossManagement.pageInfo", { page, count: templates.length })}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}
                className={`${btnBase} bg-white text-gray-700 py-1.5 px-3 text-xs`}><ChevLeft /> {t("admin.bossManagement.prev")}</button>
              <button onClick={() => setPage(p => p + 1)} disabled={!hasMore || loading}
                className={`${btnBase} bg-white text-gray-700 py-1.5 px-3 text-xs`}>{t("admin.bossManagement.next")} <ChevRight /></button>
            </div>
          </div>
        )}
      </div>

      {/* ── PORTALS ─────────────────────────────────────────────────────────── */}
      {editingTemplate !== null && (
        <TemplateFormModal
          template={editingTemplate === "new" ? null : editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onAlert={setAlert}
          onSuccess={refreshAll}
        />
      )}
      {modesTemplate && (
        <BossModesModal
          templateId={modesTemplate.id}
          templateName={modesTemplate.name}
          onClose={() => setModesTemplate(null)}
          onAlert={setAlert}
        />
      )}
      {confirmStatus && (
        <StatusConfirmModal
          {...confirmStatus}
          onClose={() => setConfirmStatus(null)}
          onAlert={setAlert}
          onSuccess={refreshAll}
        />
      )}
    </>
  );
}

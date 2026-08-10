import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Swords, Plus, Pencil, Settings2, X, Save,
  ChevronLeft, ChevronRight, Loader2, Users,
  CalendarDays, Trash2, CalendarClock,
  Upload, Archive, AlertTriangle, CheckCircle2,
  Package, Leaf, Sword, Flame, Shield, Medal, Crown,
  Star, Trophy, Zap, Activity, Coins, CalendarRange, Clock,
  BookOpen, Skull, Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAlert } from "../context/AlertContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import PageHeader from "../components/common/PageHeader";
import { adminBossApi } from "../api/adminBossApi";
import SkyCard from "../components/ui/card/SkyCard";
import SkyButton from "../components/ui/button/SkyButton";
import StatusBadge from "../components/common/StatusBadge";
import { FilterDropdown } from "../components/common/FilterDropdown";
import type { FilterField } from "../hooks/useTableFilters";
import type {
  BossTemplateDto,
  CreateBossTemplatePayload,
  BossModeInput,
  UpdateBossTemplatePayload,
  BossModePayload,
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
const inputCls = [
  "w-full px-3.5 py-2.5 rounded-sky-chip bg-white/70 ring-1 ring-white/80",
  "text-sky-ink text-sm font-medium transition-shadow",
  "focus:outline-none focus:ring-2 focus:ring-sky-deep/45",
  "placeholder:text-sky-ink-3",
].join(" ");

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

// ── ICONS (lucide-react wrappers) ─────────────────────────────────────────────
const SwordsIcon = ({ size = 20 }: { size?: number }) => <Swords width={size} height={size} />;
const Spinner = ({ size = 18 }: { size?: number }) => <Loader2 className="animate-spin" width={size} height={size} />;

// ── BADGES ────────────────────────────────────────────────────────────────────
const STATUS_KEYS = ["", "Draft", "Published", "Archived"] as const;

// Difficulty is a temperature ramp, not a good/bad axis: pale cool → saturated
// cool → hot, with a distinct glyph at each step. teal is deliberately absent —
// everywhere else in the console teal means "live/approved", and an Easy mode is
// not an approval. Hard borrows the warm damage accent, never destructive rose.
const MODE_CFG: Record<BossModeType, { cls: string; cardBg: string; plate: string; Icon: LucideIcon }> = {
  Easy:   { cls: "bg-sky-3/70 text-sky-deep",        cardBg: "bg-sky-4/70",   plate: "bg-sky-deep/10 text-sky-deep",    Icon: Leaf },
  Normal: { cls: "bg-sky-deep/14 text-sky-deep",     cardBg: "bg-sky-deep/6", plate: "bg-sky-deep/16 text-sky-deep",    Icon: Sword },
  Hard:   { cls: "bg-sky-dmg/14 text-sky-dmg-deep",  cardBg: "bg-sky-dmg/7",  plate: "bg-sky-dmg/14 text-sky-dmg-deep", Icon: Flame },
};
const ModeBadge = ({ mode }: { mode: BossModeType }) => {
  const c = MODE_CFG[mode] ?? MODE_CFG.Easy;
  return <span className={`sky-badge ${c.cls}`}><c.Icon className="w-3.5 h-3.5 shrink-0" /> {mode}</span>;
};

// Entitlement tiers are a value ramp (neutral → cool → epic violet), not a
// severity ramp — nothing here is a warning, so no warm hue is spent on them.
const TIER_CFG: Record<PackageTier, { cls: string; Icon: LucideIcon }> = {
  Free:    { cls: "sky-badge-neutral", Icon: Shield },
  Basic:   { cls: "sky-badge-info",    Icon: Medal },
  Premium: { cls: "sky-badge-epic",    Icon: Crown },
};
const TierBadge = ({ tier }: { tier: PackageTier }) => {
  const c = TIER_CFG[tier] ?? TIER_CFG.Free;
  return <span className={`sky-badge ${c.cls}`}><c.Icon className="w-3 h-3 shrink-0" /> {tier}</span>;
};

// Reward tiers climb towards the reward colour (neutral → cool → peach). The
// peach at the top means "best payout", not "attention needed".
const REWARD_CFG: Record<RewardTierType, { cls: string; Icon: LucideIcon }> = {
  BASIC:    { cls: "sky-badge-neutral", Icon: Package },
  STANDARD: { cls: "sky-badge-info",    Icon: Star },
  PREMIUM:  { cls: "sky-badge-pending", Icon: Trophy },
};
const RewardBadge = ({ tier }: { tier: RewardTierType }) => {
  const c = REWARD_CFG[tier] ?? REWARD_CFG.BASIC;
  return <span className={`sky-badge ${c.cls}`}><c.Icon className="w-3 h-3 shrink-0" /> {tier}</span>;
};

// ── LABEL ─────────────────────────────────────────────────────────────────────
const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-semibold text-sky-ink-3 uppercase tracking-[0.14em] mb-1.5">{children}</p>
);

const Hint = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-medium text-sky-ink-3 mt-1.5 leading-snug">{children}</p>
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
    <div className={`${c.cardBg} rounded-sky-card border border-white/70 p-4 space-y-3`}>
      <div className="flex items-center gap-2.5">
        <span className={`grid place-items-center w-8 h-8 rounded-sky-chip shrink-0 ${c.plate}`}>
          <c.Icon className="w-4 h-4" />
        </span>
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
        <Hint>{t("admin.bossManagement.modesModal.rewardTierHint")}</Hint>
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
    <div className="fixed inset-0 z-99999 w-screen h-screen flex items-center justify-center bg-sky-abyss/45 backdrop-blur-md p-4">
      <SkyCard variant="admin" className={`modal-content relative p-0 overflow-hidden w-full ${isEdit ? "max-w-xl" : "max-w-3xl"} max-h-[92vh] flex flex-col sky-in`}>
        {/* Violet rail — boss templates are game content, not an operational record. */}
        <span className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-sky-violet to-sky-violet-deep z-10" />
        {/* Header */}
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-white/70 bg-white/45 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sky-chip bg-sky-violet/12 text-sky-violet-deep flex items-center justify-center shrink-0">
              <SwordsIcon size={17} />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-sky-ink">{isEdit ? t("admin.bossManagement.form.editTitle") : t("admin.bossManagement.form.newTitle")}</h2>
              <p className="text-xs text-sky-ink-3">{isEdit ? template.themeName : t("admin.bossManagement.form.subtitle")}</p>
            </div>
          </div>
          <SkyButton type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </SkyButton>
        </div>

        {/* Form */}
        <div className="relative flex-1 overflow-y-auto p-6">
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
              <div className="relative overflow-hidden flex items-start gap-2 pl-4 pr-3 py-2.5 bg-sky-deep/8 rounded-sky-chip">
                <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-deep" />
                <BookOpen className="w-4 h-4 shrink-0 mt-0.5 text-sky-deep" />
                <p className="text-xs font-medium text-sky-deep">{t("admin.bossManagement.form.editModesHint")}</p>
              </div>
            ) : (
              <>
                <div className="relative overflow-hidden flex items-start gap-2 pl-4 pr-3 py-2.5 bg-sky-deep/8 rounded-sky-chip">
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-deep" />
                  <BookOpen className="w-4 h-4 shrink-0 mt-0.5 text-sky-deep" />
                  <p className="text-xs font-medium text-sky-deep">{t("admin.bossManagement.form.createModesHint")}</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {MODE_ORDER.map(m => (
                    <ModeFieldset key={m} mode={m} value={modes[m]} onChange={patch => patchMode(m, patch)} />
                  ))}
                </div>
              </>
            )}

            {(formError || fieldErrors.length > 0) && (
              <div className="relative overflow-hidden text-xs font-medium text-sky-rose-deep bg-sky-rose/12 border border-sky-rose/25 rounded-sky-chip pl-4 pr-3 py-2.5 space-y-1">
                <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" />
                {formError && <p className="font-semibold">{formError}</p>}
                {fieldErrors.length > 0 && (
                  <ul className="list-disc list-inside">
                    {fieldErrors.map((msg, i) => <li key={i}>{msg}</li>)}
                  </ul>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2 border-t border-white/70">
              <SkyButton type="button" variant="secondary" onClick={onClose} disabled={saving} className="flex-1">{t("admin.bossManagement.form.cancel")}</SkyButton>
              <SkyButton type="submit" variant="primary" disabled={saving} className="flex-1">
                {saving ? <><Spinner size={13} /> {t("admin.bossManagement.form.saving")}</> : <><Save className="w-3.5 h-3.5" /> {isEdit ? t("admin.bossManagement.form.update") : t("admin.bossManagement.form.create")}</>}
              </SkyButton>
            </div>
          </form>
        </div>
      </SkyCard>
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
    <div className="fixed inset-0 z-99999 w-screen h-screen flex items-center justify-center bg-sky-abyss/45 backdrop-blur-md p-4">
      <SkyCard variant="admin" className="modal-content relative p-0 overflow-hidden w-full max-w-5xl max-h-[92vh] flex flex-col sky-in">
        <span className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-sky-deep-lo to-sky-deep z-10" />

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-white/70 bg-white/45 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sky-chip bg-sky-deep/10 text-sky-deep flex items-center justify-center shrink-0">
              <Settings2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-sky-ink">{t("admin.bossManagement.modesModal.title")}</h2>
              <p className="text-xs text-sky-ink-3">{templateName}</p>
            </div>
          </div>
          <SkyButton type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </SkyButton>
        </div>

        {/* Body */}
        <div className="relative flex-1 overflow-hidden flex flex-col lg:flex-row">

          {/* ── LEFT: CURRENT MODES ───────────────────────────────────── */}
          <div className="lg:w-[52%] border-b lg:border-b-0 lg:border-r border-white/70 overflow-y-auto p-5 space-y-3">
            <p className="text-[10px] font-semibold text-sky-ink-3 uppercase tracking-[0.14em] sticky top-0 bg-white/80 backdrop-blur-sm pb-2 z-10">
              {t("admin.bossManagement.modesModal.currentModes")} (<span className="tabular-nums">{tpl?.modes.length ?? 0}</span> / 3)
            </p>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sky-ink-2">
                <Spinner size={24} /><span className="text-sm font-medium">Loading…</span>
              </div>
            ) : !tpl || tpl.modes.length === 0 ? (
              <div className="flex flex-col items-center gap-2.5 py-12">
                <span className="grid place-items-center w-14 h-14 rounded-full bg-sky-violet/10 text-sky-violet-deep">
                  <Skull className="w-6 h-6" />
                </span>
                <p className="font-display font-semibold text-sky-ink">{t("admin.bossManagement.modesModal.noModes")}</p>
                <p className="text-xs text-sky-ink-2">{t("admin.bossManagement.modesModal.addModeHint")}</p>
              </div>
            ) : (
              tpl.modes.map(m => {
                const mc = MODE_CFG[m.mode] ?? MODE_CFG.Easy;
                return (
                  <div key={m.mode} className={`${mc.cardBg} rounded-sky-card border border-white/70 p-4 sky-lift`}>
                    {/* Mode header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`grid place-items-center w-9 h-9 rounded-sky-md shrink-0 ${mc.plate}`}>
                          <mc.Icon className="w-4 h-4" />
                        </span>
                        <div className="space-y-1">
                          <ModeBadge mode={m.mode} />
                          <p className="text-[10px] text-sky-ink-3 flex items-center gap-1">Min: <TierBadge tier={m.minTier} /></p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-semibold text-sky-ink-3 uppercase tracking-[0.12em]">Boss HP</p>
                        <p className="font-display text-xl font-semibold text-sky-ink tabular-nums">{m.bossHp.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-sky-ink-3"><Users className="w-3.5 h-3.5 shrink-0" /> Party</span>
                        <span className="font-semibold text-sky-ink-2 tabular-nums">{m.partyMin} – {m.partyMax}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-sky-ink-3"><Zap className="w-3.5 h-3.5 shrink-0" /> Max Dmg/Q</span>
                        <span className="font-semibold text-sky-ink-2 tabular-nums">{m.maxDamagePerQuest.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-sky-ink-3"><Activity className="w-3.5 h-3.5 shrink-0" /> Quests/Day</span>
                        <span className="font-semibold text-sky-ink-2 tabular-nums">{m.maxQuestPerMemberPerDay}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-sky-ink-3">
                          <Coins className="w-3.5 h-3.5 shrink-0" /> Gold/Q
                        </span>
                        <span className="font-semibold text-sky-ink-2 tabular-nums">{m.mGoldRewardCapPerQuest} mG</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-sky-ink-3"><CalendarRange className="w-3.5 h-3.5 shrink-0" /> Quests/Wk</span>
                        <span className="font-semibold text-sky-ink-2 tabular-nums">{m.maxPartyQuestPerWeek}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-sky-ink-3"><Clock className="w-3.5 h-3.5 shrink-0" /> Deadline</span>
                        <span className="font-semibold text-sky-ink-2 text-[10px]">—</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-sky-ink/10">
                      <RewardBadge tier={m.rewardTier} />
                      <span className="text-[10px] text-sky-ink-3">Proof: per package</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── RIGHT: ADD MODE FORM ──────────────────────────────────── */}
          <div className="lg:w-[48%] overflow-y-auto p-5 bg-sky-ink/[0.035]">
            <p className="text-[10px] font-semibold text-sky-ink-3 uppercase tracking-[0.14em] mb-4">
              {tpl && tpl.modes.length >= 3 ? (
              <span className="inline-flex items-center gap-1.5">
                {t("admin.bossManagement.modesModal.allConfigured")}
                <Check className="w-3 h-3 text-sky-teal" />
              </span>
            ) : t("admin.bossManagement.modesModal.addMode")}
            </p>

            {tpl && tpl.modes.length >= 3 ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <span className="grid place-items-center w-16 h-16 rounded-full bg-sky-teal-bg text-sky-teal">
                  <CheckCircle2 className="w-8 h-8" />
                </span>
                <p className="font-display font-semibold text-sky-ink">{t("admin.bossManagement.modesModal.allConfiguredHint")}</p>
                <p className="text-xs text-sky-ink-2 text-center">{t("admin.bossManagement.modesModal.allModesSet")}</p>
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
                          {m}{tpl?.modes.some(ex => ex.mode === m) ? " (added)" : ""}
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
                      <Coins className="inline w-3.5 h-3.5 mr-1 align-text-bottom text-sky-peach-deep" />
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
                  <Hint>{t("admin.bossManagement.modesModal.rewardTierHint")}</Hint>
                </div>

                {formError && (
                  <p className="relative overflow-hidden text-xs font-medium text-sky-rose-deep bg-sky-rose/12 border border-sky-rose/25 rounded-sky-chip pl-4 pr-3 py-2.5">
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" />
                    {formError}
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <SkyButton type="button" variant="secondary" onClick={onClose} disabled={submitting} className="flex-1">{t("admin.bossManagement.modesModal.close")}</SkyButton>
                  <SkyButton type="submit" variant="primary" disabled={submitting} className="flex-1">
                    {submitting ? <><Spinner size={13} /> {t("admin.bossManagement.modesModal.adding")}</> : <><Plus className="w-3.5 h-3.5" /> {t("admin.bossManagement.modesModal.addMode")}</>}
                  </SkyButton>
                </div>
              </form>
            )}
          </div>
        </div>
      </SkyCard>
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
    <div className="fixed inset-0 z-99999 w-screen h-screen flex items-center justify-center bg-sky-abyss/45 backdrop-blur-md p-4">
      <SkyCard variant="admin" className="modal-content sky-in relative w-full max-w-sm space-y-4 overflow-hidden">
        {/* Rail carries the outcome: teal = goes live, peach = pulled from rotation. */}
        <span className={`absolute inset-x-0 top-0 h-1 ${isPublish ? "bg-sky-teal" : "bg-linear-to-r from-sky-peach to-sky-peach-deep"}`} />
        <div className="relative flex items-center gap-3 pt-1">
          <span className={`grid place-items-center w-10 h-10 rounded-sky-md shrink-0 ${isPublish ? "bg-sky-teal-bg text-sky-teal" : "bg-sky-peach/20 text-sky-peach-deep"}`}>
            {isPublish ? <Upload className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold text-sky-ink">{isPublish ? t("admin.bossManagement.publishModal.title") : t("admin.bossManagement.archiveModal.title")}</h3>
            <p className="text-xs font-medium text-sky-ink-3 mt-0.5 truncate">“{templateName}”</p>
          </div>
        </div>
        <p className="relative text-sm font-medium text-sky-ink-2 leading-relaxed">
          {isPublish
            ? t("admin.bossManagement.publishModal.message")
            : t("admin.bossManagement.archiveModal.message")}
        </p>
        {!isPublish && (
          <div className="relative flex items-start gap-2.5 overflow-hidden pl-4 pr-3 py-2.5 bg-sky-peach/12 border border-sky-peach/25 rounded-sky-chip">
            <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-peach-deep" />
            <AlertTriangle className="w-4 h-4 shrink-0 mt-px text-sky-peach-deep" />
            <p className="text-xs font-semibold text-sky-peach-deep">{t("admin.bossManagement.archiveModal.warning")}</p>
          </div>
        )}
        <div className="relative flex gap-3 pt-1">
          <SkyButton type="button" variant="secondary" onClick={onClose} disabled={loading} className="flex-1">{t("admin.bossManagement.form.cancel")}</SkyButton>
          <SkyButton type="button" variant={isPublish ? "success" : "primary"} onClick={handleConfirm} disabled={loading} className="flex-1">
            {loading ? <><Spinner size={13} /> {isPublish ? t("admin.bossManagement.publishModal.publishing") : t("admin.bossManagement.archiveModal.archiving")}</> : (
              <>{isPublish ? <Upload className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />} {isPublish ? t("admin.bossManagement.publishModal.confirm") : t("admin.bossManagement.archiveModal.confirm")}</>
            )}
          </SkyButton>
        </div>
      </SkyCard>
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
    <SkyCard variant="admin" className="p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/70 bg-white/45">
        <span className="grid place-items-center w-10 h-10 rounded-sky-md bg-sky-deep/10 text-sky-deep shrink-0">
          <CalendarDays className="w-5 h-5" />
        </span>
        <div>
          <h3 className="font-display text-base font-semibold text-sky-ink">{t("admin.bossManagement.schedule.title")}</h3>
          <p className="text-xs font-medium text-sky-ink-3">{t("admin.bossManagement.schedule.subtitle")}</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Assign form */}
        {publishedTemplates.length === 0 ? (
          <div className="relative flex items-start gap-2.5 overflow-hidden pl-4 pr-3 py-2.5 bg-sky-peach/12 border border-sky-peach/25 rounded-sky-chip">
            <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-peach-deep" />
            <AlertTriangle className="w-4 h-4 shrink-0 mt-px text-sky-peach-deep" />
            <p className="text-xs font-semibold text-sky-peach-deep">{t("admin.bossManagement.schedule.noPublished")}</p>
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
                <p className="text-[11px] font-semibold text-sky-deep tabular-nums mt-1.5">
                  {t("admin.bossManagement.schedule.weekPreview", { start: fmtDate(bounds.start), end: fmtDate(bounds.end) })}
                </p>
              )}
            </div>
            <SkyButton type="submit" variant="primary" disabled={saving || !templateId || !weekDate}>
              {saving ? <><Spinner size={13} /> {t("admin.bossManagement.schedule.assigning")}</> : <><Plus className="w-3.5 h-3.5" /> {t("admin.bossManagement.schedule.assign")}</>}
            </SkyButton>
          </form>
        )}

        {/* Schedule table */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sky-ink-3">
            <Spinner size={20} /><span className="text-sm font-medium">{t("admin.bossManagement.loading")}</span>
          </div>
        ) : schedules.length === 0 ? (
          <div className="flex flex-col items-center gap-2.5 py-10 text-sky-ink-3">
            <span className="grid place-items-center w-14 h-14 rounded-full bg-sky-deep/8 text-sky-deep">
              <CalendarClock className="w-6 h-6" />
            </span>
            <p className="text-sm font-medium">{t("admin.bossManagement.schedule.empty")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-sky-md border border-white/70">
            <table className="w-full text-sm">
              <thead className="sky-table-head">
                <tr>
                  {[
                    t("admin.bossManagement.schedule.colWeek"),
                    t("admin.bossManagement.schedule.colTheme"),
                    t("admin.bossManagement.schedule.colStatus"),
                    "",
                  ].map((h, i) => (
                    <th key={i} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="sky-stagger">
                {schedules.map(s => {
                  const notPublished = s.bossStatus !== "Published";
                  return (
                    <tr key={s.weeklyBossScheduleId} className="sky-table-row">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {/* The live week gets a filled dot as well as the chip — never colour alone. */}
                          {s.isCurrentWeek && <span className="w-1.5 h-1.5 rounded-full bg-sky-teal shrink-0" />}
                          <span className={`text-xs tabular-nums ${s.isCurrentWeek ? "font-semibold text-sky-ink" : "font-medium text-sky-ink-2"}`}>
                            {fmtDate(s.weekStart)} → {fmtDate(s.weekEnd)}
                          </span>
                          {s.isCurrentWeek && (
                            <span className="sky-badge sky-badge-success text-[9px] px-1.5 py-0.5">
                              {t("admin.bossManagement.schedule.thisWeek")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs font-semibold text-sky-ink">{s.themeName}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className={notPublished ? "inline-flex flex-col items-start gap-1" : ""}>
                          <StatusBadge status={s.bossStatus} />
                          {notPublished && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-rose-deep">
                              <AlertTriangle className="w-3 h-3" />
                              {t("admin.bossManagement.schedule.notPublishedWarn")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {s.isCurrentWeek ? (
                          <span className="text-[10px] font-semibold text-sky-ink-3 uppercase tracking-[0.12em]">{t("admin.bossManagement.schedule.ongoing")}</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRemove(s.weeklyBossScheduleId)}
                            disabled={removingId === s.weeklyBossScheduleId}
                            title={t("admin.bossManagement.schedule.remove")}
                            aria-label={t("admin.bossManagement.schedule.remove")}
                            className="inline-grid place-items-center w-8 h-8 rounded-sky-chip border border-sky-rose/25 bg-sky-rose/10 text-sky-rose-deep transition hover:bg-sky-rose/18 hover:-translate-y-px active:translate-y-0 active:scale-95 disabled:opacity-50"
                          >
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
    </SkyCard>
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
        <PageHeader
          icon={<SwordsIcon size={22} />}
          tone="violet"
          title={t("admin.bossManagement.pageTitle")}
          description={t("admin.bossManagement.subtitle")}
          actions={
            <SkyButton type="button" variant="primary" onClick={() => setEditingTemplate("new")} className="shrink-0">
              <Plus className="w-3.5 h-3.5" /> {t("admin.bossManagement.newTemplate")}
            </SkyButton>
          }
        />

        {/* Filter Bar */}
        <SkyCard variant="admin" className="p-4 flex flex-wrap items-center gap-3">
          <FilterDropdown<{ status: string }>
            fields={[{
              key: "status",
              label: "Status",
              type: "select",
              options: STATUS_KEYS.filter(key => key !== "").map(key => ({ label: key, value: key })),
            } satisfies FilterField]}
            filters={{ status: statusFilter }}
            onFilterChange={(_, value) => handleStatusFilterChange(value)}
            onClear={() => handleStatusFilterChange("")}
            hasActiveFilters={statusFilter !== ""}
            align="left"
          />
          <SkyButton type="button" variant="secondary" size="sm" onClick={fetchTemplates} disabled={loading} className="ml-auto">
            {loading ? <><Spinner size={13} /> {t("admin.bossManagement.loading")}</> : t("admin.bossManagement.refresh")}
          </SkyButton>
        </SkyCard>

        {/* Weekly schedule */}
        <ScheduleCard reloadKey={scheduleReload} onAlert={setAlert} />

        {/* Table */}
        <SkyCard variant="admin" className="p-0 overflow-hidden">
          {error ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <span className="grid place-items-center w-14 h-14 rounded-full bg-sky-rose/12 text-sky-rose-deep">
                <AlertTriangle className="w-6 h-6" />
              </span>
              <p className="font-display text-base font-semibold text-sky-ink">{t("admin.bossManagement.loadError")}</p>
              <p className="text-sm text-sky-ink-3">{error}</p>
              <SkyButton type="button" variant="secondary" size="sm" onClick={fetchTemplates}>{t("admin.bossManagement.retry")}</SkyButton>
            </div>
          ) : loading && templates.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-sky-ink-3">
              <Spinner size={32} /><p className="text-sm font-medium">{t("admin.bossManagement.loadingTemplates")}</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <span className="grid place-items-center w-16 h-16 rounded-full bg-sky-violet/10 text-sky-violet-deep">
                <Swords className="w-7 h-7" />
              </span>
              <p className="font-display text-lg font-semibold text-sky-ink">{t("admin.bossManagement.noTemplates")}</p>
              <p className="text-sm font-medium text-sky-ink-3">{t("admin.bossManagement.createFirstBoss")}</p>
              <SkyButton type="button" variant="primary" onClick={() => setEditingTemplate("new")}>
                <Plus className="w-3.5 h-3.5" /> {t("admin.bossManagement.newTemplate")}
              </SkyButton>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sky-table-head">
                  <tr>
                    {[
                      t("admin.bossManagement.table.num"),
                      t("admin.bossManagement.table.themeName"),
                      t("admin.bossManagement.table.activePeriod"),
                      t("admin.bossManagement.table.modes"),
                      t("admin.bossManagement.table.status"),
                      t("admin.bossManagement.table.actions"),
                    ].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="sky-stagger">
                  {templates.map((tpl, idx) => (
                    <tr key={tpl.bossTemplateId} className="sky-table-row">
                      <td className="px-4 py-3 text-xs font-semibold tabular-nums text-sky-ink-3">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="px-4 py-4 max-w-55">
                        <p className="font-semibold text-sky-ink truncate">{tpl.themeName}</p>
                        <p className="text-xs text-sky-ink-3 font-medium mt-0.5 truncate">{tpl.description || t("admin.bossManagement.noDescription")}</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-xs font-semibold tabular-nums text-sky-ink-2">{fmtDate(tpl.activeWeekStart)}</p>
                        <p className="text-[10px] text-sky-ink-3 font-medium tabular-nums">→ {fmtDate(tpl.activeWeekEnd)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {tpl.modes.length === 0 ? (
                            <span className="text-xs text-sky-ink-3 font-medium">None</span>
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
                          <button
                            type="button"
                            title="Edit template info"
                            aria-label="Edit template info"
                            onClick={() => setEditingTemplate(tpl)}
                            className="inline-grid place-items-center w-8 h-8 rounded-sky-chip border border-sky-deep/20 bg-sky-deep/8 text-sky-deep transition hover:bg-sky-deep/14 hover:-translate-y-px active:translate-y-0 active:scale-95"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {/* Configure Modes */}
                          <button
                            type="button"
                            title="Configure boss modes"
                            aria-label="Configure boss modes"
                            onClick={() => setModesTemplate({ id: tpl.bossTemplateId, name: tpl.themeName })}
                            className="inline-grid place-items-center w-8 h-8 rounded-sky-chip border border-sky-violet/25 bg-sky-violet/10 text-sky-violet-deep transition hover:bg-sky-violet/18 hover:-translate-y-px active:translate-y-0 active:scale-95"
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                          </button>
                          {/* Publish */}
                          {tpl.status === "Draft" && (
                            <SkyButton type="button" variant="success" size="sm" onClick={() => setConfirmStatus({ templateId: tpl.bossTemplateId, templateName: tpl.themeName, action: "publish" })} title="Publish template">
                              <Upload className="w-3 h-3" /> {t("admin.bossManagement.publish")}
                            </SkyButton>
                          )}
                          {/* Archive */}
                          {tpl.status === "Published" && (
                            <SkyButton type="button" variant="secondary" size="sm" onClick={() => setConfirmStatus({ templateId: tpl.bossTemplateId, templateName: tpl.themeName, action: "archive" })} title="Archive template">
                              <Archive className="w-3 h-3" /> {t("admin.bossManagement.archive")}
                            </SkyButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SkyCard>

        {/* Pagination */}
        {!error && (templates.length > 0 || page > 1) && (
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium tabular-nums text-sky-ink-3">
              {templates.length !== 1
                ? t("admin.bossManagement.pageInfoPlural", { page, count: templates.length })
                : t("admin.bossManagement.pageInfo", { page, count: templates.length })}
            </p>
            <div className="flex gap-2">
              <SkyButton type="button" variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                <ChevronLeft className="w-3.5 h-3.5" /> {t("admin.bossManagement.prev")}
              </SkyButton>
              <SkyButton type="button" variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={!hasMore || loading}>
                {t("admin.bossManagement.next")} <ChevronRight className="w-3.5 h-3.5" />
              </SkyButton>
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

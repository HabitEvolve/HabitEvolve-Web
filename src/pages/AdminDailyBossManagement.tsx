import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus, Pencil, Trash2, X, Loader2,
  ToggleLeft, ToggleRight, ShieldAlert, Wand2, Film,
  Skull, Flame, Check, Minus, AlertTriangle, Heart, Tag,
} from 'lucide-react';
import { adminDailyBossApi } from '../api/adminDailyBossApi';
import { adminGoalApi } from '../api/adminGoalApi';
import type { DailyBossTemplateDto, DailyBossPayload } from '../types/adminDailyBoss.types';
import type { GoalCategoryDto } from '../types/adminGoal.types';
import DailyBossAnimationStudioModal from '../components/game/DailyBossAnimationStudioModal';
import SkyCard from '../components/ui/card/SkyCard';
import SkyButton from '../components/ui/button/SkyButton';
import PageHeader from '../components/common/PageHeader';
import { FilterDropdown } from '../components/common/FilterDropdown';
import type { FilterField } from '../hooks/useTableFilters';
import { DAILY_ROSTER, spriteAvatarUrl, spriteDisplayName } from '../data/monsterRoster';
import { positiveIntDisplay, parsePositiveInt } from '../utils/numberInput';

/** icon field is either an emoji ("🐉") or a Supabase https:// URL uploaded via /icon. */
const isIconUrl = (icon: string | null | undefined): icon is string => !!icon && /^https?:\/\//.test(icon);

// ─── Style helpers ────────────────────────────────────────────────────────────
// Exported so sibling pieces (DailyBossAnimationStudioModal) share the exact
// same Sky-Pastel dialect instead of redefining a near-duplicate. Both this
// file and that modal are migrated together in the same pass, so restyling
// here is safe — no un-migrated consumer left behind.
export const inputCls = [
  'w-full px-3.5 py-2.5 rounded-sky-chip bg-white/70 ring-1 ring-white/80',
  'text-sky-ink text-sm font-medium transition-shadow',
  'focus:outline-none focus:ring-2 focus:ring-sky-deep/45',
  'placeholder:text-sky-ink-3',
].join(' ');

export const btnBase = [
  'inline-flex items-center gap-2 px-4 py-2 rounded-sky-chip',
  'font-semibold text-sm transition-colors',
  'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ');

// ─── Tone taxonomy ────────────────────────────────────────────────────────────
// A boss is game content, so violet carries the concept itself; dmg-orange
// carries HP (the thing players burn down); teal is spent only on "this boss is
// live in the pool"; peach on "a human needs to look at this" (unknown category,
// empty pool, missing animation); rose only on failure and on delete.
type Tone = 'deep' | 'peach' | 'dmg' | 'violet' | 'teal' | 'rose' | 'neutral';
const TONE: Record<Tone, { chip: string; wash: string; rail: string }> = {
  deep:    { chip: 'bg-sky-deep/12 ring-sky-deep/22 text-sky-deep',            wash: 'bg-sky-deep/8',    rail: 'bg-sky-deep' },
  peach:   { chip: 'bg-sky-peach/20 ring-sky-peach/32 text-sky-peach-deep',    wash: 'bg-sky-peach/14',  rail: 'bg-sky-peach' },
  dmg:     { chip: 'bg-sky-dmg/14 ring-sky-dmg/26 text-sky-dmg-deep',          wash: 'bg-sky-dmg/10',    rail: 'bg-sky-dmg' },
  violet:  { chip: 'bg-sky-violet/14 ring-sky-violet/26 text-sky-violet-deep', wash: 'bg-sky-violet/10', rail: 'bg-sky-violet' },
  teal:    { chip: 'bg-sky-teal-bg ring-sky-teal/26 text-sky-teal',            wash: 'bg-sky-teal/10',   rail: 'bg-sky-teal' },
  rose:    { chip: 'bg-sky-rose/14 ring-sky-rose/26 text-sky-rose-deep',       wash: 'bg-sky-rose/10',   rail: 'bg-sky-rose' },
  neutral: { chip: 'bg-white/72 ring-white/85 text-sky-ink-2',                 wash: 'bg-white/48',      rail: 'bg-sky-ink/22' },
};

const eyebrow = 'text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3';
const fieldLabel = `block mb-1.5 ${eyebrow}`;

// ─── Portal ───────────────────────────────────────────────────────────────────
export const Portal = ({ children }: { children: React.ReactNode }) =>
  createPortal(children, document.body);

// ─── Flash alert ─────────────────────────────────────────────────────────────
function Flash({ alert }: { alert: { type: 'success' | 'error'; msg: string } | null }) {
  if (!alert) return null;
  return (
    // The flash carries a glyph and a rail as well as a hue, so it reads as
    // "worked" or "failed" without relying on colour alone.
    <div className={`sky-in fixed top-4 right-4 z-50 flex items-center gap-2.5 overflow-hidden rounded-sky-chip px-4 py-3 text-sm font-semibold shadow-sky-glass backdrop-blur-md ${alert.type === 'success' ? 'bg-sky-teal-bg/92 text-sky-teal' : 'bg-sky-rose/14 text-sky-rose-deep'}`}>
      <span className={`absolute left-0 top-0 h-full w-[3px] ${alert.type === 'success' ? 'bg-sky-teal' : 'bg-sky-rose'}`} aria-hidden="true" />
      {alert.type === 'success'
        ? <Check className="w-4 h-4 shrink-0" strokeWidth={2.8} aria-hidden="true" />
        : <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />}
      {alert.msg}
    </div>
  );
}

// ─── Confirm delete modal ────────────────────────────────────────────────────
function ConfirmDeleteModal({ boss, onConfirm, onCancel, loading }: {
  boss: DailyBossTemplateDto;
  onConfirm(): void;
  onCancel(): void;
  loading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Portal>
      <div className="fixed inset-0 bg-sky-abyss/45 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <SkyCard variant="admin" className="sky-in w-full max-w-sm">
          {/* Deleting can't be undone, so the warning is plated and the boss being
              removed is named in its own recessed line. */}
          <div className="flex items-start gap-3 mb-3">
            <span className="grid place-items-center w-10 h-10 shrink-0 rounded-sky-chip bg-sky-rose/12 ring-1 ring-sky-rose/24 text-sky-rose-deep">
              <ShieldAlert className="w-5 h-5" strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className={eyebrow}>{t('admin.dailyBossManagement.confirmDelete.irreversible')}</p>
              <h3 className="font-display text-base font-semibold leading-tight text-sky-ink">{t('admin.dailyBossManagement.confirmDelete.title')}</h3>
            </div>
          </div>
          <p className="mb-6 rounded-sky-chip bg-white/58 ring-1 ring-white/80 px-3.5 py-2.5 text-sm font-medium text-sky-ink-2">
            {t('admin.dailyBossManagement.confirmDelete.message', { icon: boss.icon, name: boss.name })}
          </p>
          <div className="flex gap-3">
            <SkyButton type="button" variant="secondary" onClick={onCancel} className="flex-1">{t('common.cancel')}</SkyButton>
            <SkyButton type="button" variant="destructive" onClick={onConfirm} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} {t('common.delete')}
            </SkyButton>
          </div>
        </SkyCard>
      </div>
    </Portal>
  );
}

// ─── Boss form modal ──────────────────────────────────────────────────────────
const EMPTY_FORM: DailyBossPayload = { name: '', description: '', icon: '', hpMin: 100, hpMax: 300, categoryCode: null, spriteKey: null };

function BossFormModal({ editing, categories, categoriesLoading, onSave, onClose }: {
  editing: DailyBossTemplateDto | null;
  categories: GoalCategoryDto[];
  categoriesLoading: boolean;
  onSave(payload: DailyBossPayload): Promise<void>;
  onClose(): void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<DailyBossPayload>(
    editing
      ? { name: editing.name, description: editing.description ?? '', icon: editing.icon ?? '', hpMin: editing.hpMin, hpMax: editing.hpMax, categoryCode: editing.categoryCode, spriteKey: editing.spriteKey }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = <K extends keyof DailyBossPayload>(k: K, v: DailyBossPayload[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setErr(t('admin.dailyBossManagement.form.nameRequired')); return; }
    if (form.hpMin < 1) { setErr(t('admin.dailyBossManagement.form.hpMinInvalid')); return; }
    if (form.hpMax < form.hpMin) { setErr(t('admin.dailyBossManagement.form.hpMaxInvalid')); return; }
    setSaving(true); setErr('');
    try {
      await onSave({
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        icon: form.icon?.trim() || undefined,
        hpMin: form.hpMin,
        hpMax: form.hpMax,
        categoryCode: form.categoryCode || null,
        spriteKey: form.spriteKey || null,
      });
    } catch (err) {
      setErr((err as any)?.message ?? t('admin.dailyBossManagement.form.saveFailed'));
    } finally { setSaving(false); }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-sky-abyss/45 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <SkyCard variant="admin" className="sky-in p-0 overflow-hidden w-full max-w-md">
          <div className={`relative flex items-center gap-3 overflow-hidden border-b border-white/65 px-5 py-4 ${TONE.violet.wash}`}>
            <span className={`absolute left-0 top-0 h-full w-[3px] ${TONE.violet.rail}`} aria-hidden="true" />
            <span className={`grid place-items-center w-10 h-10 shrink-0 rounded-sky-chip ring-1 ${TONE.violet.chip}`}>
              <Skull className="w-5 h-5" strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className={eyebrow}>{t('admin.dailyBossManagement.form.dailyBossEyebrow')}</p>
              <h2 className="truncate font-display text-base font-semibold leading-tight text-sky-ink">
                {editing ? t('admin.dailyBossManagement.form.editTitle') : t('admin.dailyBossManagement.form.newTitle')}
              </h2>
            </div>
            <SkyButton type="button" variant="ghost" size="icon" onClick={onClose} aria-label={t('common.cancel')}><X className="w-5 h-5" /></SkyButton>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {err && (
              <p className="relative flex items-start gap-2 overflow-hidden rounded-sky-chip bg-sky-rose/10 pl-4 pr-3 py-2 text-xs font-semibold text-sky-rose-deep">
                <span className="absolute left-0 top-0 h-full w-[3px] bg-sky-rose" aria-hidden="true" />
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" strokeWidth={2.5} aria-hidden="true" />
                <span className="min-w-0">{err}</span>
              </p>
            )}

            <div>
              <label className={fieldLabel}>{t('admin.dailyBossManagement.form.nameLabel')}</label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className={inputCls}
                placeholder={t('admin.dailyBossManagement.form.namePlaceholder')}
                required
              />
            </div>

            <div>
              <label className={fieldLabel}>{t('admin.dailyBossManagement.form.descLabel')}</label>
              <textarea
                value={form.description ?? ''}
                onChange={e => set('description', e.target.value)}
                rows={2}
                className={inputCls}
                placeholder={t('admin.dailyBossManagement.form.descPlaceholder')}
              />
            </div>

            <div>
              <label className={fieldLabel}>{t('admin.dailyBossManagement.form.categoryLabel')}</label>
              <select
                value={form.categoryCode ?? ''}
                onChange={e => set('categoryCode', e.target.value || null)}
                disabled={categoriesLoading}
                className={inputCls}
              >
                <option value="">{t('admin.dailyBossManagement.form.categoryGenericOption')}</option>
                {categories.map(c => (
                  <option key={c.categoryId} value={c.categoryCode}>
                    {c.categoryName}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] font-medium text-sky-ink-3">
                {categoriesLoading
                  ? t('admin.dailyBossManagement.form.categoryLoadingHint')
                  : t('admin.dailyBossManagement.form.categoryHint')}
              </p>
            </div>

            {/* Sprite art có sẵn (bundled) — khi chọn, avatar dùng sprite này thay Icon/emoji ở cả web & app. */}
            <div>
              <label className={fieldLabel}>{t('admin.dailyBossManagement.form.spriteLabel')}</label>
              <div className="flex items-center gap-3">
                <select
                  value={form.spriteKey ?? ''}
                  onChange={e => set('spriteKey', e.target.value || null)}
                  className={`${inputCls} flex-1`}
                >
                  <option value="">{t('admin.dailyBossManagement.form.spriteNoneOption')}</option>
                  {/* Giá trị hiện tại nằm ngoài nhóm daily (dữ liệu cũ) → vẫn hiện để không mất chọn. */}
                  {form.spriteKey && !DAILY_ROSTER.some(m => m.key === form.spriteKey) && (
                    <option value={form.spriteKey}>{spriteDisplayName(form.spriteKey)} (⚠ ngoài nhóm daily)</option>
                  )}
                  {DAILY_ROSTER.map(m => (
                    <option key={m.key} value={m.key}>{m.name}</option>
                  ))}
                </select>
                <span className="grid place-items-center w-12 h-12 shrink-0 overflow-hidden rounded-sky-md bg-sky-violet/12 ring-1 ring-sky-violet/22">
                  {spriteAvatarUrl(form.spriteKey) ? (
                    <img src={spriteAvatarUrl(form.spriteKey)!} alt="" className="w-full h-full object-contain [image-rendering:pixelated]" />
                  ) : (
                    <Skull className="w-5 h-5 text-sky-violet-deep" strokeWidth={2} aria-hidden="true" />
                  )}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] font-medium text-sky-ink-3">
                {t('admin.dailyBossManagement.form.spriteHint')}
              </p>
            </div>

            {/* HP is the one pair of numbers that has to be read together — a max
                below a min is the mistake this form exists to prevent — so the two
                fields share a plate rather than floating side by side. */}
            <div className="rounded-sky-md bg-white/50 ring-1 ring-white/76 p-3.5">
              <p className={`inline-flex items-center gap-1.5 mb-2.5 ${eyebrow}`}>
                <Heart className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" /> {t('admin.dailyBossManagement.form.hpRangeLabel')}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={fieldLabel}>{t('admin.dailyBossManagement.form.hpMinLabel')}</label>
                  <input
                    type="number" min={1}
                    value={positiveIntDisplay(form.hpMin)}
                    onChange={e => set('hpMin', parsePositiveInt(e.target.value))}
                    className={`${inputCls} tabular-nums`}
                  />
                </div>
                <div>
                  <label className={fieldLabel}>{t('admin.dailyBossManagement.form.hpMaxLabel')}</label>
                  <input
                    type="number" min={1}
                    value={positiveIntDisplay(form.hpMax)}
                    onChange={e => set('hpMax', parsePositiveInt(e.target.value))}
                    className={`${inputCls} tabular-nums`}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <SkyButton type="button" variant="secondary" onClick={onClose} className="flex-1">{t('common.cancel')}</SkyButton>
              <SkyButton type="submit" variant="primary" disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {editing ? t('admin.dailyBossManagement.form.saveChanges') : t('admin.dailyBossManagement.form.createBoss')}
              </SkyButton>
            </div>
          </form>
        </SkyCard>
      </div>
    </Portal>
  );
}

// ─── Boss card ────────────────────────────────────────────────────────────────
function BossCard({ boss, categories, onEdit, onToggle, onDelete, onOpenAnimation, toggling }: {
  boss: DailyBossTemplateDto;
  categories: GoalCategoryDto[];
  onEdit(): void;
  onToggle(): void;
  onDelete(): void;
  onOpenAnimation(): void;
  toggling: boolean;
}) {
  const { t } = useTranslation();
  const hasAnimation = boss.totalFrames > 0;
  // Resolve friendly category label; a code with no matching category is likely a typo (A7.5).
  const cat = boss.categoryCode ? categories.find(c => c.categoryCode === boss.categoryCode) : null;
  const categoryUnknown = !!boss.categoryCode && !cat;
  return (
    // Whether a boss is in the live pool changes what every player sees tomorrow,
    // so it is signalled three ways at once: a rail, a tint, and a badge.
    <SkyCard variant="admin" className={`relative overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${boss.isActive ? 'ring-1 ring-sky-teal/26 hover:-translate-y-0.5' : 'opacity-92 hover:opacity-100'}`}>
      <span className={`absolute left-0 top-0 h-full w-[3px] ${boss.isActive ? TONE.teal.rail : 'bg-sky-ink/12'}`} aria-hidden="true" />
      {/* Status badge */}
      <div className="absolute top-4 right-4">
        <span className={`inline-flex items-center gap-1 rounded-sky-chip ring-1 px-2 py-0.5 text-[10px] font-semibold ${boss.isActive ? TONE.teal.chip : TONE.neutral.chip}`}>
          {boss.isActive
            ? <Check className="w-2.5 h-2.5" strokeWidth={3} aria-hidden="true" />
            : <Minus className="w-2.5 h-2.5" strokeWidth={3} aria-hidden="true" />}
          {boss.isActive ? t('admin.dailyBossManagement.card.active') : t('admin.dailyBossManagement.card.inactive')}
        </span>
      </div>

      {/* Boss identity */}
      <div className="flex items-center gap-3 mb-3.5 pr-20">
        <div className="grid place-items-center w-12 h-12 shrink-0 overflow-hidden rounded-sky-md bg-sky-violet/12 ring-1 ring-sky-violet/22 text-2xl text-sky-violet-deep">
          {/* Ưu tiên: sprite pack có sẵn (bundled, pixel-art) → ảnh Icon Supabase → emoji → Skull. */}
          {spriteAvatarUrl(boss.spriteKey) ? (
            <img src={spriteAvatarUrl(boss.spriteKey)!} alt={boss.name} className="w-full h-full object-contain [image-rendering:pixelated]" />
          ) : isIconUrl(boss.icon) ? (
            <img src={boss.icon} alt={boss.name} className="w-full h-full object-cover" />
          ) : (
            boss.icon || <Skull className="w-6 h-6" strokeWidth={2} aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold text-sky-ink">{boss.name}</p>
          {boss.description && (
            <p className="mt-0.5 truncate text-xs font-medium text-sky-ink-2">{boss.description}</p>
          )}
          {/* A category that resolves to nothing is almost always a typo, so it
              gets the attention hue and a warning glyph rather than blending in
              with the categories that are fine. */}
          <span
            title={categoryUnknown ? t('admin.dailyBossManagement.card.categoryUnknownTitle', { code: boss.categoryCode }) : undefined}
            className={`mt-1.5 inline-flex items-center gap-1 rounded-sky-chip ring-1 px-2 py-0.5 text-[10px] font-semibold ${
              categoryUnknown ? TONE.peach.chip : boss.categoryCode ? TONE.deep.chip : TONE.neutral.chip
            }`}
          >
            {categoryUnknown
              ? <AlertTriangle className="w-2.5 h-2.5 shrink-0" strokeWidth={2.8} aria-hidden="true" />
              : <Tag className="w-2.5 h-2.5 shrink-0" strokeWidth={2.8} aria-hidden="true" />}
            {categoryUnknown
              ? boss.categoryCode
              : cat
                ? `${cat.iconCode ? `${cat.iconCode} ` : ''}${cat.categoryName}`
                : t('admin.dailyBossManagement.card.categoryGeneric')}
          </span>
        </div>
      </div>

      {/* HP range + animation status */}
      <div className="mb-4 flex items-stretch gap-2">
        <div className="flex-1 rounded-sky-md bg-sky-dmg/10 ring-1 ring-sky-dmg/20 px-3 py-2">
          <p className={`mb-0.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-dmg-deep`}>
            <Heart className="w-3 h-3" strokeWidth={2.6} aria-hidden="true" /> {t('admin.dailyBossManagement.card.hpRange')}
          </p>
          <p className="font-display text-sm font-semibold text-sky-ink tabular-nums">
            {boss.hpMin.toLocaleString()} – {boss.hpMax.toLocaleString()}
          </p>
        </div>
        {/* A boss with no frames still runs, but it looks unfinished in-game — so
            "not uploaded yet" is peach (needs a human) rather than an error. */}
        <button
          type="button"
          onClick={onOpenAnimation}
          title={t('admin.dailyBossManagement.studio.title')}
          className={[
            'flex-1 rounded-sky-md px-3 py-2 text-left ring-1 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px',
            hasAnimation
              ? 'bg-sky-violet/10 ring-sky-violet/22 hover:bg-sky-violet/16'
              : 'bg-sky-peach/14 ring-sky-peach/28 hover:bg-sky-peach/22',
          ].join(' ')}
        >
          <p className={`mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${hasAnimation ? 'text-sky-violet-deep' : 'text-sky-peach-deep'}`}>
            <Film className="w-3 h-3" strokeWidth={2.6} aria-hidden="true" /> {t('admin.dailyBossManagement.card.animation')}
          </p>
          <p className="font-display text-sm font-semibold text-sky-ink tabular-nums">
            {hasAnimation ? t('admin.dailyBossManagement.card.animationCount', { count: boss.totalFrames }) : t('admin.dailyBossManagement.card.notUploaded')}
          </p>
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <SkyButton type="button" variant="secondary" size="sm" onClick={onToggle} disabled={toggling} title={boss.isActive ? t('admin.dailyBossManagement.card.deactivate') : t('admin.dailyBossManagement.card.activate')} aria-pressed={boss.isActive}>
          {toggling
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : boss.isActive
              ? <ToggleRight className="w-4 h-4 text-sky-teal" />
              : <ToggleLeft className="w-4 h-4" />
          }
          {boss.isActive ? t('admin.dailyBossManagement.card.deactivate') : t('admin.dailyBossManagement.card.activate')}
        </SkyButton>
        <SkyButton type="button" variant="secondary" size="sm" onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5" /> {t('admin.dailyBossManagement.card.edit')}
        </SkyButton>
        <SkyButton type="button" variant="secondary" size="sm" onClick={onOpenAnimation}>
          <Wand2 className="w-3.5 h-3.5" /> {t('admin.dailyBossManagement.card.anim')}
        </SkyButton>
        <SkyButton type="button" variant="destructive" size="icon" onClick={onDelete} className="ml-auto" aria-label={t('admin.dailyBossManagement.card.deleteAria', { name: boss.name })}>
          <Trash2 className="w-3.5 h-3.5" />
        </SkyButton>
      </div>
    </SkyCard>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminDailyBossManagement() {
  const { t } = useTranslation();
  const [bosses, setBosses] = useState<DailyBossTemplateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState(false);
  const [formModal, setFormModal] = useState<{ editing: DailyBossTemplateDto | null } | null>(null);
  const [delBoss, setDelBoss] = useState<DailyBossTemplateDto | null>(null);
  const [delLoading, setDelLoading] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);
  const [animBoss, setAnimBoss] = useState<DailyBossTemplateDto | null>(null);
  const [categories, setCategories] = useState<GoalCategoryDto[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const flash = (type: 'success' | 'error', msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminDailyBossApi.getAll(activeOnly || undefined);
      if (res.success) setBosses(res.data ?? []);
      else flash('error', res.message ?? t('admin.dailyBossManagement.loadFailed'));
    } catch { flash('error', t('admin.dailyBossManagement.loadBossesFailed')); }
    finally { setLoading(false); }
  }, [activeOnly, t]);

  useEffect(() => { load(); }, [load]);

  // Category dropdown source (A7.2) — loaded once, active goal categories only.
  useEffect(() => {
    (async () => {
      setCategoriesLoading(true);
      try {
        const res = await adminGoalApi.getCategories({ activeOnly: true });
        if (res.success) setCategories(res.data ?? []);
      } catch { /* dropdown just falls back to Generic-only */ }
      finally { setCategoriesLoading(false); }
    })();
  }, []);

  const handleSave = async (payload: DailyBossPayload) => {
    if (formModal?.editing) {
      await adminDailyBossApi.update(formModal.editing.dailyBossTemplateId, payload);
      flash('success', t('admin.dailyBossManagement.bossUpdated'));
    } else {
      await adminDailyBossApi.create(payload);
      flash('success', t('admin.dailyBossManagement.bossCreated'));
    }
    setFormModal(null);
    load();
  };

  const handleToggle = async (boss: DailyBossTemplateDto) => {
    setToggling(boss.dailyBossTemplateId);
    try {
      await adminDailyBossApi.toggleActive(boss.dailyBossTemplateId, !boss.isActive);
      load();
    } catch (ex: any) {
      flash('error', ex?.response?.data?.message ?? t('admin.dailyBossManagement.toggleFailed'));
    } finally { setToggling(null); }
  };

  const handleDelete = async () => {
    if (!delBoss) return;
    setDelLoading(true);
    try {
      await adminDailyBossApi.delete(delBoss.dailyBossTemplateId);
      flash('success', t('admin.dailyBossManagement.bossDeleted', { name: delBoss.name }));
      setDelBoss(null);
      load();
    } catch (ex: any) {
      flash('error', ex?.response?.data?.message ?? t('admin.dailyBossManagement.deleteFailed'));
    } finally { setDelLoading(false); }
  };

  const activeBosses = bosses.filter(b => b.isActive);
  const inactiveBosses = bosses.filter(b => !b.isActive);

  return (
    <div className="space-y-6">
      <Flash alert={alert} />

      {/* Header */}
      <PageHeader
        icon={<Flame className="w-6 h-6" strokeWidth={2.1} aria-hidden="true" />}
        tone="dmg"
        eyebrow={t('admin.dailyBossManagement.eyebrow')}
        title={t('admin.dailyBossManagement.pageTitle')}
        description={t('admin.dailyBossManagement.pageDescription')}
        actions={
          <>
            <FilterDropdown<{ activeState: string }>
              fields={[{
                key: 'activeState',
                label: t('admin.dailyBossManagement.filterStatusLabel'),
                type: 'select',
                options: [
                  { label: t('admin.dailyBossManagement.filterActiveOnly'), value: 'true' },
                  { label: t('admin.dailyBossManagement.filterShowAll'), value: 'false' },
                ],
              } satisfies FilterField]}
              filters={{ activeState: String(activeOnly) }}
              onFilterChange={(_, value) => setActiveOnly(value === 'true')}
              onClear={() => setActiveOnly(false)}
              hasActiveFilters={activeOnly}
              align="left"
            />
            <SkyButton type="button" variant="primary" onClick={() => setFormModal({ editing: null })}>
              <Plus className="w-4 h-4" /> {t('admin.dailyBossManagement.addBoss')}
            </SkyButton>
          </>
        }
      />

      {/* Stats bar */}
      {/* Active is the only count that changes what players get, so it is the
          only one that carries a hue; total and inactive stay quiet. */}
      <div className="flex flex-wrap items-center gap-2 rounded-sky-md bg-white/42 ring-1 ring-white/70 p-2">
        {([
          { label: t('admin.dailyBossManagement.statTotal'), value: bosses.length, tone: 'neutral' as Tone },
          { label: t('admin.dailyBossManagement.statActive'), value: activeBosses.length, tone: 'teal' as Tone },
          { label: t('admin.dailyBossManagement.statInactive'), value: inactiveBosses.length, tone: 'neutral' as Tone },
        ]).map(s => (
          <div key={s.label} className={`flex items-center gap-2 rounded-sky-chip ring-1 px-3.5 py-1.5 ${TONE[s.tone].chip}`}>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-75">{s.label}</span>
            <span className="font-display text-lg font-semibold leading-none tabular-nums">{s.value}</span>
          </div>
        ))}
        {activeBosses.length === 0 && !loading && (
          // An empty pool silently degrades to fallback HP, so it has to be said
          // out loud — this is the one line on the page that must not be missed.
          <div className="relative ml-auto flex items-center gap-2 overflow-hidden rounded-sky-chip bg-sky-peach/16 pl-3.5 pr-3.5 py-1.5 text-sky-peach-deep">
            <span className="absolute left-0 top-0 h-full w-[3px] bg-sky-peach" aria-hidden="true" />
            <ShieldAlert className="w-4 h-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />
            <span className="text-xs font-semibold">{t('admin.dailyBossManagement.poolEmptyWarning')}</span>
          </div>
        )}
      </div>

      {/* Boss grid */}
      {loading ? (
        <div className="flex items-center gap-2 justify-center py-20 text-sm font-medium text-sky-ink-3">
          <Loader2 className="w-6 h-6 animate-spin" /> {t('admin.dailyBossManagement.loadingPool')}
        </div>
      ) : bosses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-sky-card border border-dashed border-sky-ink/15 bg-white/38 py-20">
          <span className="grid place-items-center w-16 h-16 rounded-sky-md bg-white/72 ring-1 ring-white/85 text-sky-ink-3">
            <Skull className="w-7 h-7" strokeWidth={1.8} aria-hidden="true" />
          </span>
          <p className="font-display text-sky-h3 font-semibold text-sky-ink">{t('admin.dailyBossManagement.noBosses')}</p>
          <p className="text-sm font-medium text-sky-ink-2">{t('admin.dailyBossManagement.noBossesHint')}</p>
        </div>
      ) : (
        <div className="sky-stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {bosses.map(boss => (
            <BossCard
              key={boss.dailyBossTemplateId}
              boss={boss}
              categories={categories}
              onEdit={() => setFormModal({ editing: boss })}
              onToggle={() => handleToggle(boss)}
              onDelete={() => setDelBoss(boss)}
              onOpenAnimation={() => setAnimBoss(boss)}
              toggling={toggling === boss.dailyBossTemplateId}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {formModal !== null && (
        <BossFormModal
          editing={formModal.editing}
          categories={categories}
          categoriesLoading={categoriesLoading}
          onSave={handleSave}
          onClose={() => setFormModal(null)}
        />
      )}
      {delBoss && (
        <ConfirmDeleteModal
          boss={delBoss}
          loading={delLoading}
          onConfirm={handleDelete}
          onCancel={() => setDelBoss(null)}
        />
      )}
      {animBoss && (
        <DailyBossAnimationStudioModal
          boss={animBoss}
          onChanged={load}
          onClose={() => setAnimBoss(null)}
        />
      )}
    </div>
  );
}

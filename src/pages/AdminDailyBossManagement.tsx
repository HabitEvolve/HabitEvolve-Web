import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Pencil, Trash2, X, Loader2,
  ToggleLeft, ToggleRight, ShieldAlert, Wand2, Film,
} from 'lucide-react';
import { adminDailyBossApi } from '../api/adminDailyBossApi';
import { adminGoalApi } from '../api/adminGoalApi';
import type { DailyBossTemplateDto, DailyBossPayload } from '../types/adminDailyBoss.types';
import type { GoalCategoryDto } from '../types/adminGoal.types';
import DailyBossAnimationStudioModal from '../components/game/DailyBossAnimationStudioModal';
import SkyCard from '../components/ui/card/SkyCard';
import SkyButton from '../components/ui/button/SkyButton';

/** icon field is either an emoji ("🐉") or a Supabase https:// URL uploaded via /icon. */
const isIconUrl = (icon: string | null | undefined): icon is string => !!icon && /^https?:\/\//.test(icon);

// ─── Style helpers ────────────────────────────────────────────────────────────
// Exported so sibling pieces (DailyBossAnimationStudioModal) share the exact
// same Sky-Pastel dialect instead of redefining a near-duplicate. Both this
// file and that modal are migrated together in the same pass, so restyling
// here is safe — no un-migrated consumer left behind.
export const inputCls = [
  'w-full px-3 py-2 rounded-sky-chip border border-sky-surf-border bg-white',
  'text-sky-ink text-sm font-medium',
  'focus:outline-none focus:border-sky-deep focus:ring-3 focus:ring-sky-deep/20',
  'placeholder:text-sky-ink-3',
].join(' ');

export const btnBase = [
  'inline-flex items-center gap-2 px-4 py-2 rounded-sky-chip',
  'font-semibold text-sm transition-colors',
  'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ');

// ─── Portal ───────────────────────────────────────────────────────────────────
export const Portal = ({ children }: { children: React.ReactNode }) =>
  createPortal(children, document.body);

// ─── Flash alert ─────────────────────────────────────────────────────────────
function Flash({ alert }: { alert: { type: 'success' | 'error'; msg: string } | null }) {
  if (!alert) return null;
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-sky-chip font-semibold text-sm shadow-sky-glass ${alert.type === 'success' ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'}`}>
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
  return (
    <Portal>
      <div className="fixed inset-0 bg-sky-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <SkyCard variant="admin" className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-5 h-5 text-error-500 shrink-0" />
            <h3 className="text-lg font-bold text-error-700">Delete Boss?</h3>
          </div>
          <p className="text-sm text-sky-ink-2 mb-6">
            Remove <strong>{boss.icon} {boss.name}</strong> from the pool? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <SkyButton type="button" variant="secondary" onClick={onCancel} className="flex-1">Cancel</SkyButton>
            <SkyButton type="button" variant="destructive" onClick={onConfirm} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
            </SkyButton>
          </div>
        </SkyCard>
      </div>
    </Portal>
  );
}

// ─── Boss form modal ──────────────────────────────────────────────────────────
const EMPTY_FORM: DailyBossPayload = { name: '', description: '', icon: '', hpMin: 100, hpMax: 300, categoryCode: null };

function BossFormModal({ editing, categories, categoriesLoading, onSave, onClose }: {
  editing: DailyBossTemplateDto | null;
  categories: GoalCategoryDto[];
  categoriesLoading: boolean;
  onSave(payload: DailyBossPayload): Promise<void>;
  onClose(): void;
}) {
  const [form, setForm] = useState<DailyBossPayload>(
    editing
      ? { name: editing.name, description: editing.description ?? '', icon: editing.icon ?? '', hpMin: editing.hpMin, hpMax: editing.hpMax, categoryCode: editing.categoryCode }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = <K extends keyof DailyBossPayload>(k: K, v: DailyBossPayload[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Name is required.'); return; }
    if (form.hpMin < 1) { setErr('HP Min must be ≥ 1.'); return; }
    if (form.hpMax < form.hpMin) { setErr('HP Max must be ≥ HP Min.'); return; }
    setSaving(true); setErr('');
    try {
      await onSave({
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        icon: form.icon?.trim() || undefined,
        hpMin: form.hpMin,
        hpMax: form.hpMax,
        categoryCode: form.categoryCode || null,
      });
    } catch (err) {
      setErr((err as any)?.message ?? 'Failed to save.');
    } finally { setSaving(false); }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-sky-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <SkyCard variant="admin" className="p-0 overflow-hidden w-full max-w-md">
          <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-sky-admin-bg-deep">
            <div className="flex items-center gap-2">
              <img src="/icon/Player/Skull/64px/Skull 1st 64px.png" alt="" className="w-5 h-5 object-contain" />
              <h2 className="font-bold text-lg text-sky-ink">
                {editing ? 'Edit Daily Boss' : 'New Daily Boss'}
              </h2>
            </div>
            <SkyButton type="button" variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></SkyButton>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {err && (
              <p className="text-xs font-semibold text-error-600 bg-error-50 border border-error-300 rounded-sky-chip px-3 py-2">{err}</p>
            )}

            <div className="grid grid-cols-[1fr_80px] gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-sky-ink-2 mb-1">Boss Name *</label>
                <input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Meliodas"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-sky-ink-2 mb-1">Icon</label>
                <input
                  value={form.icon ?? ''}
                  onChange={e => set('icon', e.target.value)}
                  className={inputCls}
                  placeholder="🐉"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-sky-ink-2 mb-1">Description</label>
              <textarea
                value={form.description ?? ''}
                onChange={e => set('description', e.target.value)}
                rows={2}
                className={inputCls}
                placeholder="Optional lore or notes"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-sky-ink-2 mb-1">Category</label>
              <select
                value={form.categoryCode ?? ''}
                onChange={e => set('categoryCode', e.target.value || null)}
                disabled={categoriesLoading}
                className={inputCls}
              >
                <option value="">— Generic (mọi goal) —</option>
                {categories.map(c => (
                  <option key={c.categoryId} value={c.categoryCode}>
                    {c.iconCode ? `${c.iconCode} ` : ''}{c.categoryName}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-sky-ink-3 mt-1">
                {categoriesLoading
                  ? 'Đang tải danh mục…'
                  : 'Boss hợp chủ đề sẽ ưu tiên cho player theo goal đó; Generic khớp mọi goal.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-sky-ink-2 mb-1">HP Min *</label>
                <input
                  type="number" min={1}
                  value={form.hpMin}
                  onChange={e => set('hpMin', Number(e.target.value))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-sky-ink-2 mb-1">HP Max *</label>
                <input
                  type="number" min={1}
                  value={form.hpMax}
                  onChange={e => set('hpMax', Number(e.target.value))}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <SkyButton type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</SkyButton>
              <SkyButton type="submit" variant="primary" disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {editing ? 'Save Changes' : 'Create Boss'}
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
  const hasAnimation = boss.totalFrames > 0;
  // Resolve friendly category label; a code with no matching category is likely a typo (A7.5).
  const cat = boss.categoryCode ? categories.find(c => c.categoryCode === boss.categoryCode) : null;
  const categoryUnknown = !!boss.categoryCode && !cat;
  return (
    <SkyCard variant="admin" className={`relative ${boss.isActive ? 'ring-2 ring-warning-400' : ''}`}>
      {/* Status badge */}
      <div className="absolute top-4 right-4">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${boss.isActive ? 'bg-warning-100 text-warning-700' : 'bg-gray-100 text-gray-500'}`}>
          {boss.isActive ? '● Active' : '○ Inactive'}
        </span>
      </div>

      {/* Boss identity */}
      <div className="flex items-center gap-3 mb-3 pr-20">
        <div className="w-12 h-12 rounded-sky-chip bg-warning-50 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
          {isIconUrl(boss.icon) ? (
            <img src={boss.icon} alt={boss.name} className="w-full h-full object-cover" />
          ) : (
            boss.icon || <img src="/icon/Player/Skull/64px/Skull 1st 64px.png" alt="" className="w-5 h-5 object-contain" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-base text-sky-ink truncate">{boss.name}</p>
          {boss.description && (
            <p className="text-xs text-sky-ink-2 truncate mt-0.5">{boss.description}</p>
          )}
          <span
            title={categoryUnknown ? `Category code "${boss.categoryCode}" khớp không danh mục nào — có thể gõ sai.` : undefined}
            className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              categoryUnknown
                ? 'bg-warning-100 text-warning-700'
                : boss.categoryCode
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-500'
            }`}
          >
            {categoryUnknown
              ? `⚠ ${boss.categoryCode}`
              : cat
                ? `${cat.iconCode ? `${cat.iconCode} ` : ''}${cat.categoryName}`
                : 'Generic'}
          </span>
        </div>
      </div>

      {/* HP range + animation status */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 bg-warning-50 border border-warning-200 rounded-sky-chip px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-warning-700 mb-0.5">HP Range</p>
          <p className="text-sm font-bold text-sky-ink">
            {boss.hpMin.toLocaleString()} – {boss.hpMax.toLocaleString()}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAnimation}
          title="Animation Studio"
          className={[
            'flex-1 h-full rounded-sky-chip px-3 py-2 border text-left transition-colors',
            hasAnimation
              ? 'bg-purple-50 border-purple-200 hover:bg-purple-100'
              : 'bg-warning-50 border-warning-300 hover:bg-warning-100',
          ].join(' ')}
        >
          <p className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 flex items-center gap-1 ${hasAnimation ? 'text-purple-700' : 'text-warning-700'}`}>
            <Film className="w-3 h-3" /> Animation
          </p>
          <p className="text-sm font-bold text-sky-ink">
            {hasAnimation ? `${boss.totalFrames} frame` : 'Chưa có — upload'}
          </p>
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <SkyButton type="button" variant="secondary" size="sm" onClick={onToggle} disabled={toggling} title={boss.isActive ? 'Deactivate' : 'Activate'}>
          {toggling
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : boss.isActive
              ? <ToggleRight className="w-4 h-4 text-success-600" />
              : <ToggleLeft className="w-4 h-4" />
          }
          {boss.isActive ? 'Deactivate' : 'Activate'}
        </SkyButton>
        <SkyButton type="button" variant="secondary" size="sm" onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5" /> Edit
        </SkyButton>
        <SkyButton type="button" variant="secondary" size="sm" onClick={onOpenAnimation}>
          <Wand2 className="w-3.5 h-3.5" /> Anim
        </SkyButton>
        <SkyButton type="button" variant="destructive" size="icon" onClick={onDelete} className="ml-auto">
          <Trash2 className="w-3.5 h-3.5" />
        </SkyButton>
      </div>
    </SkyCard>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminDailyBossManagement() {
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
      else flash('error', res.message ?? 'Failed to load.');
    } catch { flash('error', 'Failed to load bosses.'); }
    finally { setLoading(false); }
  }, [activeOnly]);

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
      flash('success', 'Boss updated.');
    } else {
      await adminDailyBossApi.create(payload);
      flash('success', 'Boss created.');
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
      flash('error', ex?.response?.data?.message ?? 'Toggle failed.');
    } finally { setToggling(null); }
  };

  const handleDelete = async () => {
    if (!delBoss) return;
    setDelLoading(true);
    try {
      await adminDailyBossApi.delete(delBoss.dailyBossTemplateId);
      flash('success', `${delBoss.name} deleted.`);
      setDelBoss(null);
      load();
    } catch (ex: any) {
      flash('error', ex?.response?.data?.message ?? 'Delete failed.');
    } finally { setDelLoading(false); }
  };

  const activeBosses = bosses.filter(b => b.isActive);
  const inactiveBosses = bosses.filter(b => !b.isActive);

  return (
    <div className="space-y-6">
      <Flash alert={alert} />

      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-12 h-12 rounded-sky-chip bg-warning-100 flex items-center justify-center shrink-0">
          <img src="/icon/Main/Fire 2/64w/Fire 64px.png" alt="" className="w-5 h-5 object-contain" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-sky-ink">Daily Boss Pool</h1>
          <p className="text-sm text-sky-ink-2">
            Each player gets one boss per day drawn from the active pool (stable hash per user/date).
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={e => setActiveOnly(e.target.checked)}
              className="w-4 h-4 accent-sky-deep"
            />
            <span className="text-sm font-semibold text-sky-ink-2">Active only</span>
          </label>
          <SkyButton type="button" variant="primary" onClick={() => setFormModal({ editing: null })}>
            <Plus className="w-4 h-4" /> Add Boss
          </SkyButton>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'Total', value: bosses.length, color: 'bg-gray-100 text-gray-700' },
          { label: 'Active', value: activeBosses.length, color: 'bg-warning-50 text-warning-700' },
          { label: 'Inactive', value: inactiveBosses.length, color: 'bg-gray-50 text-gray-500' },
        ].map(s => (
          <div key={s.label} className={`flex items-center gap-2 px-4 py-2 rounded-full ${s.color}`}>
            <span className="text-xs font-semibold uppercase tracking-wide opacity-70">{s.label}</span>
            <span className="text-lg font-bold">{s.value}</span>
          </div>
        ))}
        {activeBosses.length === 0 && !loading && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-warning-50 text-warning-700">
            <ShieldAlert className="w-4 h-4" />
            <span className="text-xs font-semibold">Pool empty — system uses fallback HP config</span>
          </div>
        )}
      </div>

      {/* Boss grid */}
      {loading ? (
        <div className="flex items-center gap-2 justify-center py-20 text-sky-ink-3">
          <Loader2 className="w-6 h-6 animate-spin" /> Loading pool…
        </div>
      ) : bosses.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-sky-ink/15 rounded-sky-card text-sky-ink-3">
          <img src="/icon/Player/Skull/64px/Skull 1st 64px.png" alt="" className="w-14 h-14 mx-auto mb-3 opacity-20 object-contain" />
          <p className="font-bold text-lg">No bosses yet</p>
          <p className="text-sm mt-1">Add the first boss to the daily pool.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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

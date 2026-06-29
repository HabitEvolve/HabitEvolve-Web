import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Pencil, Trash2, X, Loader2,
  ToggleLeft, ToggleRight, ShieldAlert,
} from 'lucide-react';
import { adminDailyBossApi } from '../api/adminDailyBossApi';
import type { DailyBossTemplateDto, DailyBossPayload } from '../types/adminDailyBoss.types';

// ─── Style helpers ────────────────────────────────────────────────────────────
const inputCls = [
  'w-full px-3 py-2 rounded-xl border-2 border-black bg-white dark:bg-gray-800',
  'text-gray-900 dark:text-gray-100 text-sm font-medium',
  'focus:outline-none focus:ring-2 focus:ring-orange-400',
  'dark:border-gray-600 dark:placeholder:text-gray-500',
].join(' ');

const btnBase = [
  'inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-black',
  'font-black text-sm transition-all shadow-[2px_2px_0_0_#1A1D20]',
  'hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
].join(' ');

// ─── Portal ───────────────────────────────────────────────────────────────────
const Portal = ({ children }: { children: React.ReactNode }) =>
  createPortal(children, document.body);

// ─── Flash alert ─────────────────────────────────────────────────────────────
function Flash({ alert }: { alert: { type: 'success' | 'error'; msg: string } | null }) {
  if (!alert) return null;
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl border-2 border-black font-bold text-sm shadow-[3px_3px_0_0_#1A1D20] ${alert.type === 'success' ? 'bg-green-200 text-green-900' : 'bg-red-200 text-red-900'}`}>
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
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] w-full max-w-sm p-6">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
            <h3 className="text-lg font-black text-red-700 dark:text-red-400">Delete Boss?</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
            Remove <strong>{boss.icon} {boss.name}</strong> from the pool? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={onCancel} className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>Cancel</button>
            <button onClick={onConfirm} disabled={loading} className={`${btnBase} flex-1 justify-center bg-red-400 text-white`}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ─── Boss form modal ──────────────────────────────────────────────────────────
const EMPTY_FORM: DailyBossPayload = { name: '', description: '', icon: '', hpMin: 100, hpMax: 300 };

function BossFormModal({ editing, onSave, onClose }: {
  editing: DailyBossTemplateDto | null;
  onSave(payload: DailyBossPayload): Promise<void>;
  onClose(): void;
}) {
  const [form, setForm] = useState<DailyBossPayload>(
    editing
      ? { name: editing.name, description: editing.description ?? '', icon: editing.icon ?? '', hpMin: editing.hpMin, hpMax: editing.hpMax }
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
      });
    } catch (err) {
      setErr((err as any)?.message ?? 'Failed to save.');
    } finally { setSaving(false); }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] w-full max-w-md">
          <div className="flex items-center justify-between p-5 border-b-2 border-black dark:border-white/10 bg-orange-100 dark:bg-orange-900/30 rounded-t-3xl">
            <div className="flex items-center gap-2">
              <img src="/icon/Player/Skull/64px/Skull 1st 64px.png" alt="" className="w-5 h-5 object-contain" />
              <h2 className="font-black text-lg text-gray-900 dark:text-gray-100">
                {editing ? 'Edit Daily Boss' : 'New Daily Boss'}
              </h2>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-orange-200 dark:hover:bg-orange-800 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {err && (
              <p className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl px-3 py-2">{err}</p>
            )}

            <div className="grid grid-cols-[1fr_80px] gap-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Boss Name *</label>
                <input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Meliodas"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Icon</label>
                <input
                  value={form.icon ?? ''}
                  onChange={e => set('icon', e.target.value)}
                  className={inputCls}
                  placeholder="🐉"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Description</label>
              <textarea
                value={form.description ?? ''}
                onChange={e => set('description', e.target.value)}
                rows={2}
                className={inputCls}
                placeholder="Optional lore or notes"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">HP Min *</label>
                <input
                  type="number" min={1}
                  value={form.hpMin}
                  onChange={e => set('hpMin', Number(e.target.value))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">HP Max *</label>
                <input
                  type="number" min={1}
                  value={form.hpMax}
                  onChange={e => set('hpMax', Number(e.target.value))}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>Cancel</button>
              <button type="submit" disabled={saving} className={`${btnBase} flex-1 justify-center bg-orange-300 dark:bg-orange-600 text-gray-900 dark:text-white`}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {editing ? 'Save Changes' : 'Create Boss'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}

// ─── Boss card ────────────────────────────────────────────────────────────────
function BossCard({ boss, onEdit, onToggle, onDelete, toggling }: {
  boss: DailyBossTemplateDto;
  onEdit(): void;
  onToggle(): void;
  onDelete(): void;
  toggling: boolean;
}) {
  return (
    <div className={`relative border-4 rounded-3xl p-5 shadow-[4px_4px_0_0_#1A1D20] bg-white dark:bg-gray-800 transition-all ${boss.isActive ? 'border-orange-500' : 'border-black dark:border-gray-600'}`}>
      {/* Status badge */}
      <div className="absolute top-4 right-4">
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${boss.isActive ? 'bg-orange-100 border-orange-400 text-orange-700 dark:bg-orange-900/30 dark:border-orange-600 dark:text-orange-300' : 'bg-gray-100 border-gray-300 text-gray-500 dark:bg-gray-700 dark:border-gray-500'}`}>
          {boss.isActive ? '● Active' : '○ Inactive'}
        </span>
      </div>

      {/* Boss identity */}
      <div className="flex items-center gap-3 mb-3 pr-20">
        <div className="w-12 h-12 rounded-2xl border-2 border-black bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-2xl shrink-0 shadow-[2px_2px_0_0_#1A1D20]">
          {boss.icon || <img src="/icon/Player/Skull/64px/Skull 1st 64px.png" alt="" className="w-5 h-5 object-contain" />}
        </div>
        <div className="min-w-0">
          <p className="font-black text-base text-gray-900 dark:text-gray-100 truncate">{boss.name}</p>
          {boss.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{boss.description}</p>
          )}
        </div>
      </div>

      {/* HP range */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 bg-orange-50 dark:bg-orange-900/10 border-2 border-orange-200 dark:border-orange-800 rounded-xl px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-wide text-orange-600 dark:text-orange-400 mb-0.5">HP Range</p>
          <p className="text-sm font-black text-gray-800 dark:text-gray-100">
            {boss.hpMin.toLocaleString()} – {boss.hpMax.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          disabled={toggling}
          title={boss.isActive ? 'Deactivate' : 'Activate'}
          className={`${btnBase} py-1.5 px-3 ${boss.isActive ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200' : 'bg-orange-200 dark:bg-orange-800 text-orange-900 dark:text-orange-100'}`}
        >
          {toggling
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : boss.isActive
              ? <ToggleRight className="w-4 h-4 text-green-600" />
              : <ToggleLeft className="w-4 h-4" />
          }
          {boss.isActive ? 'Deactivate' : 'Activate'}
        </button>
        <button onClick={onEdit} className={`${btnBase} py-1.5 px-3 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200`}>
          <Pencil className="w-3.5 h-3.5" /> Edit
        </button>
        <button onClick={onDelete} className={`${btnBase} py-1.5 px-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 ml-auto`}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
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
        <div className="w-12 h-12 rounded-2xl bg-orange-300 border-4 border-black flex items-center justify-center shadow-[3px_3px_0_0_#1A1D20] shrink-0">
          <img src="/icon/Main/Fire 2/64w/Fire 64px.png" alt="" className="w-5 h-5 object-contain" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Daily Boss Pool</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Each player gets one boss per day drawn from the active pool (stable hash per user/date).
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={e => setActiveOnly(e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Active only</span>
          </label>
          <button
            onClick={() => setFormModal({ editing: null })}
            className={`${btnBase} bg-orange-300 dark:bg-orange-600 text-gray-900 dark:text-white py-2`}
          >
            <Plus className="w-4 h-4" /> Add Boss
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'Total', value: bosses.length, color: 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300' },
          { label: 'Active', value: activeBosses.length, color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300' },
          { label: 'Inactive', value: inactiveBosses.length, color: 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500' },
        ].map(s => (
          <div key={s.label} className={`flex items-center gap-2 px-4 py-2 rounded-2xl border-2 ${s.color} shadow-[2px_2px_0_0_#1A1D20]`}>
            <span className="text-xs font-black uppercase tracking-wide opacity-60">{s.label}</span>
            <span className="text-lg font-black">{s.value}</span>
          </div>
        ))}
        {activeBosses.length === 0 && !loading && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 shadow-[2px_2px_0_0_#1A1D20]">
            <ShieldAlert className="w-4 h-4" />
            <span className="text-xs font-bold">Pool empty — system uses fallback HP config</span>
          </div>
        )}
      </div>

      {/* Boss grid */}
      {loading ? (
        <div className="flex items-center gap-2 justify-center py-20 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" /> Loading pool…
        </div>
      ) : bosses.length === 0 ? (
        <div className="text-center py-20 border-4 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl text-gray-400">
          <img src="/icon/Player/Skull/64px/Skull 1st 64px.png" alt="" className="w-14 h-14 mx-auto mb-3 opacity-20 object-contain" />
          <p className="font-black text-lg">No bosses yet</p>
          <p className="text-sm mt-1">Add the first boss to the daily pool.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {bosses.map(boss => (
            <BossCard
              key={boss.dailyBossTemplateId}
              boss={boss}
              onEdit={() => setFormModal({ editing: boss })}
              onToggle={() => handleToggle(boss)}
              onDelete={() => setDelBoss(boss)}
              toggling={toggling === boss.dailyBossTemplateId}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {formModal !== null && (
        <BossFormModal
          editing={formModal.editing}
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
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Boxes, Plus, Pencil, Trash2, Loader2, X, ToggleLeft, ToggleRight, AlertTriangle, type LucideIcon } from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import PageHeader from '../components/common/PageHeader';
import SkyCard from '../components/ui/card/SkyCard';
import SkyButton from '../components/ui/button/SkyButton';
import { positiveIntDisplay, parsePositiveInt } from '../utils/numberInput';
import { adminGoalApi } from '../api/adminGoalApi';
import { PillarDto, PillarPayload } from '../types/adminGoal.types';

// ─── Shared style helpers (mirrors AdminGoalRelationshipManagement conventions) ──
const inputCls = [
  'w-full px-3.5 py-2.5 rounded-sky-chip bg-white/70 ring-1 ring-white/80',
  'text-sky-ink text-sm font-medium transition-shadow',
  'focus:outline-none focus:ring-2 focus:ring-sky-deep/45',
  'placeholder:text-sky-ink-3 disabled:opacity-55',
].join(' ');
const eyebrow = 'text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3';
const fieldLabel = `block mb-1.5 ${eyebrow}`;

const Portal = ({ children }: { children: React.ReactNode }) => createPortal(children, document.body);

function ModalHead({ Icon, eyebrowText, title, tone, onClose }: {
  Icon: LucideIcon; eyebrowText: string; title: string; tone: 'deep' | 'rose'; onClose(): void;
}) {
  const wash = tone === 'rose' ? 'bg-sky-rose/8' : 'bg-sky-deep/8';
  const rail = tone === 'rose' ? 'bg-sky-rose' : 'bg-sky-deep';
  const chip = tone === 'rose' ? 'bg-sky-rose/14 ring-sky-rose/26 text-sky-rose-deep' : 'bg-sky-deep/12 ring-sky-deep/22 text-sky-deep';
  return (
    <div className={`relative flex items-center gap-3 p-5 ${wash} border-b border-white/70 overflow-hidden shrink-0`}>
      <span aria-hidden="true" className={`absolute left-0 top-0 bottom-0 w-1.5 ${rail}`} />
      <span className={`grid place-items-center w-10 h-10 shrink-0 rounded-sky-chip ring-1 ${chip}`}>
        <Icon className="w-5 h-5" strokeWidth={2.2} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={eyebrow}>{eyebrowText}</p>
        <h2 className="font-display text-lg font-semibold text-sky-ink leading-tight truncate">{title}</h2>
      </div>
      <SkyButton type="button" variant="ghost" size="icon" onClick={onClose} className="shrink-0"><X className="w-5 h-5" /></SkyButton>
    </div>
  );
}

function FormError({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-sky-chip bg-sky-rose/10 ring-1 ring-sky-rose/26 pl-4 pr-3 py-2.5 flex items-center gap-2">
      <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" />
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-sky-rose-deep" strokeWidth={2.4} aria-hidden="true" />
      <span className="text-xs font-semibold text-sky-rose-deep">{children}</span>
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="text-center py-12 border border-dashed border-sky-ink/16 rounded-sky-card bg-white/40">
      <Boxes className="w-10 h-10 mx-auto mb-2.5 text-sky-ink-3 opacity-45" strokeWidth={1.6} aria-hidden="true" />
      <p className="font-display font-semibold text-sky-ink-2">{title}</p>
      <p className="text-sm text-sky-ink-3 mt-0.5">{hint}</p>
    </div>
  );
}

// ─── PillarFormModal ──────────────────────────────────────────────────────────
function PillarFormModal({ editing, nextOrder, onSave, onClose }: {
  editing: PillarDto | null;
  /** displayOrder auto-assigned to a NEW pillar (max existing + 1) so it appends to the end. */
  nextOrder: number;
  onSave(payload: PillarPayload): Promise<void>;
  onClose(): void;
}) {
  const [code, setCode] = useState(editing?.pillarCode ?? '');
  const [name, setName] = useState(editing?.pillarName ?? '');
  const [desc, setDesc] = useState(editing?.description ?? '');
  const [icon, setIcon] = useState(editing?.iconCode ?? '');
  // Display order is only editable when editing (a NEW pillar auto-appends via nextOrder). It's shown
  // 1-based (matches the row badges) but stored 0-based in the DB, so we hold `displayOrder + 1` here
  // and subtract 1 on save. Keeping it >= 1 also lets positiveIntDisplay/parsePositiveInt work (0 = "empty").
  const [order, setOrder] = useState((editing?.displayOrder ?? 0) + 1);
  const [active, setActive] = useState(editing?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) { setErr('Code and name are required.'); return; }
    setSaving(true); setErr('');
    try {
      await onSave({
        pillarCode: code.trim().toUpperCase(),
        pillarName: name.trim(),
        description: desc.trim() || undefined,
        iconCode: icon.trim() || undefined,
        displayOrder: editing ? Math.max(0, order - 1) : nextOrder, // edit: 1-based UI → 0-based; create: append to end
        isActive: active,
      });
    } catch (ex: any) { setErr(ex?.response?.data?.message ?? 'Save failed.'); }
    finally { setSaving(false); }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-sky-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <SkyCard variant="admin" className="modal-content p-0 overflow-hidden w-full max-w-md">
          <ModalHead Icon={Boxes} eyebrowText="Lifestyle pillar" title={editing ? 'Edit Pillar' : 'New Pillar'} tone="deep" onClose={onClose} />
          <form onSubmit={submit} className="p-5 space-y-3">
            {err && <FormError>{err}</FormError>}
            {editing ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={fieldLabel}>Code</label>
                  <input value={code} className={inputCls} disabled />
                </div>
                <div>
                  <label className={fieldLabel}>Display Order</label>
                  <input type="number" min={1} value={positiveIntDisplay(order)} onChange={e => setOrder(parsePositiveInt(e.target.value))} className={inputCls} />
                </div>
              </div>
            ) : (
              <div>
                <label className={fieldLabel}>Code *</label>
                <input value={code} onChange={e => setCode(e.target.value)} className={inputCls} placeholder="PHYSICAL" />
              </div>
            )}
            <div>
              <label className={fieldLabel}>Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Physical Health" required />
            </div>
            <div>
              <label className={fieldLabel}>Description</label>
              <input value={desc} onChange={e => setDesc(e.target.value)} className={inputCls} placeholder="Sleep, exercise, diet" />
            </div>
            <div>
              <label className={fieldLabel}>Icon Code (slug)</label>
              <input value={icon} onChange={e => setIcon(e.target.value)} className={inputCls} placeholder="heart" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="w-4 h-4 accent-sky-deep" />
              <span className="text-sm font-medium text-sky-ink">Active (visible to players)</span>
            </label>
            <div className="flex gap-3 pt-2">
              <SkyButton type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</SkyButton>
              <SkyButton type="submit" variant="primary" disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {editing ? 'Save' : 'Create'}
              </SkyButton>
            </div>
          </form>
        </SkyCard>
      </div>
    </Portal>
  );
}

// ─── ConfirmDeleteModal ───────────────────────────────────────────────────────
function ConfirmDeleteModal({ pillar, loading, onConfirm, onCancel }: {
  pillar: PillarDto; loading: boolean; onConfirm(): void; onCancel(): void;
}) {
  return (
    <Portal>
      <div className="fixed inset-0 bg-sky-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <SkyCard variant="admin" className="modal-content p-0 overflow-hidden w-full max-w-sm">
          <ModalHead Icon={Trash2} eyebrowText="Lifestyle pillar" title="Delete Pillar?" tone="rose" onClose={onCancel} />
          <div className="p-5 space-y-4">
            <p className="text-sm text-sky-ink-2">
              Delete <span className="font-semibold text-sky-ink">"{pillar.pillarName}"</span>? Any category still mapped
              to it must be reassigned first, or the delete is blocked.
            </p>
            <div className="flex gap-3">
              <SkyButton type="button" variant="secondary" onClick={onCancel} className="flex-1">Cancel</SkyButton>
              <SkyButton type="button" variant="destructive" onClick={onConfirm} disabled={loading} className="flex-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
              </SkyButton>
            </div>
          </div>
        </SkyCard>
      </div>
    </Portal>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminPillarManagement() {
  const alert = useAlert();
  const [pillars, setPillars] = useState<PillarDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ editing: PillarDto | null } | null>(null);
  const [delPillar, setDelPillar] = useState<PillarDto | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  const fetchPillars = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGoalApi.getPillars({ activeOnly: false });
      if (res.success) setPillars((res.data ?? []).sort((a, b) => a.displayOrder - b.displayOrder));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPillars(); }, [fetchPillars]);

  const handleSave = async (payload: PillarPayload) => {
    if (modal?.editing) {
      await adminGoalApi.updatePillar(modal.editing.pillarId, payload);
      alert.success('Pillar updated.');
    } else {
      await adminGoalApi.createPillar(payload);
      alert.success('Pillar created.');
    }
    setModal(null);
    fetchPillars();
  };

  const handleToggle = async (p: PillarDto) => {
    try { await adminGoalApi.togglePillarStatus(p.pillarId, !p.isActive); fetchPillars(); }
    catch { alert.error('Status update failed.'); }
  };

  const handleDelete = async () => {
    if (!delPillar) return;
    setDelLoading(true);
    try {
      await adminGoalApi.deletePillar(delPillar.pillarId);
      alert.success('Pillar deleted.');
      setDelPillar(null);
      fetchPillars();
    } catch (ex: any) {
      alert.error(ex?.response?.data?.message ?? 'Delete failed.');
    } finally { setDelLoading(false); }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <PageHeader
        icon={<Boxes className="w-6 h-6" strokeWidth={2.2} aria-hidden="true" />}
        tone="deep"
        size="h1"
        eyebrow="Admin · content engine"
        title="Lifestyle Pillars"
        description="The 4 top-level buckets every goal category rolls up into on the mobile Goal Wizard."
      />

      <SkyCard variant="admin" className="flex-1 min-h-0 flex flex-col overflow-hidden p-5">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <p className="text-sm text-sky-ink-3">
            {loading ? 'Loading…' : `${pillars.length} pillar${pillars.length === 1 ? '' : 's'}`}
          </p>
          <SkyButton type="button" variant="primary" size="sm" onClick={() => setModal({ editing: null })}>
            <Plus className="w-4 h-4" /> New Pillar
          </SkyButton>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-2 justify-center py-10 text-sky-ink-3"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
          ) : pillars.length === 0 ? (
            <EmptyState title="No pillars yet" hint="Create the first lifestyle pillar to group categories under it." />
          ) : (
            <div className="space-y-2">
              {pillars.map(p => (
                <div key={p.pillarId} className="flex items-center gap-3 rounded-sky-chip bg-white/65 ring-1 ring-white/85 px-4 py-3">
                  <span className="grid place-items-center w-9 h-9 shrink-0 rounded-sky-chip bg-sky-deep/10 text-sky-deep text-xs font-bold">
                    {p.displayOrder + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-sky-ink truncate">{p.pillarName}</p>
                      <span className={`text-[9.5px] font-bold uppercase tracking-wide rounded-full px-1.5 py-0.5 ${p.isActive ? 'text-sky-teal bg-sky-teal-bg/60' : 'text-sky-ink-3 bg-sky-ink/8'}`}>
                        {p.isActive ? 'On' : 'Off'}
                      </span>
                    </div>
                    <p className="text-[10px] text-sky-ink-3 font-mono mt-0.5">{p.pillarCode}{p.description ? ` · ${p.description}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <SkyButton type="button" variant="ghost" size="icon" onClick={() => handleToggle(p)} className="w-8 h-8">
                      {p.isActive ? <ToggleRight className="w-4 h-4 text-sky-teal" /> : <ToggleLeft className="w-4 h-4 text-sky-ink-3" />}
                    </SkyButton>
                    <SkyButton type="button" variant="ghost" size="icon" onClick={() => setModal({ editing: p })} className="w-8 h-8"><Pencil className="w-4 h-4" /></SkyButton>
                    <SkyButton type="button" variant="ghost" size="icon" onClick={() => setDelPillar(p)} className="w-8 h-8 text-sky-rose-deep hover:bg-sky-rose/10"><Trash2 className="w-4 h-4" /></SkyButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SkyCard>

      {modal !== null && (
        <PillarFormModal
          editing={modal.editing}
          nextOrder={pillars.length ? Math.max(...pillars.map(p => p.displayOrder)) + 1 : 0}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {delPillar && <ConfirmDeleteModal pillar={delPillar} loading={delLoading} onConfirm={handleDelete} onCancel={() => setDelPillar(null)} />}
    </div>
  );
}

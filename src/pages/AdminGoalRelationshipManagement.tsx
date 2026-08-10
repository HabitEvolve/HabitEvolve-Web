import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Pencil, Loader2, X, Link2, AlertTriangle, Search, ChevronRight, type LucideIcon } from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import PageHeader from '../components/common/PageHeader';
import { adminGoalApi } from '../api/adminGoalApi';
import { adminGoalRelationshipApi } from '../api/adminGoalRelationshipApi';
import SkyCard from '../components/ui/card/SkyCard';
import SkyButton from '../components/ui/button/SkyButton';
import {
  GoalDto,
  GoalCategoryDto,
  GoalRelationshipDto,
  GoalRelationType,
  CreateGoalRelationshipPayload,
  UpdateGoalRelationshipPayload,
} from '../types/adminGoal.types';

// ─── Shared style helpers (mirrors GoalTaskEngineHub.tsx conventions) ─────────
const inputCls = [
  'w-full px-3.5 py-2.5 rounded-sky-chip bg-white/70 ring-1 ring-white/80',
  'text-sky-ink text-sm font-medium transition-shadow',
  'focus:outline-none focus:ring-2 focus:ring-sky-deep/45',
  'placeholder:text-sky-ink-3 disabled:opacity-55',
].join(' ');
const eyebrow = 'text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3';
const fieldLabel = `block mb-1.5 ${eyebrow}`;

// Icon pairs with colour so SUPPORTS/CONFLICTS never rest on hue alone.
const RELATION_META: Record<GoalRelationType, { label: string; Icon: LucideIcon }> = {
  SUPPORTS: { label: 'Supports', Icon: Link2 },
  CONFLICTS: { label: 'Conflicts', Icon: AlertTriangle },
};

const Portal = ({ children }: { children: React.ReactNode }) => createPortal(children, document.body);

/** Modal chrome — tinted strip, colour rail, icon chip, eyebrow + display title. */
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
      <Link2 className="w-10 h-10 mx-auto mb-2.5 text-sky-ink-3 opacity-45" strokeWidth={1.6} aria-hidden="true" />
      <p className="font-display font-semibold text-sky-ink-2">{title}</p>
      <p className="text-sm text-sky-ink-3 mt-0.5">{hint}</p>
    </div>
  );
}

// ─── EditRelationshipModal — reason/type only, the pair itself is fixed after creation ──
function EditRelationshipModal({ item, onSave, onClose }: {
  item: GoalRelationshipDto;
  onSave(payload: UpdateGoalRelationshipPayload): Promise<void>;
  onClose(): void;
}) {
  const [relationType, setRelationType] = useState<GoalRelationType>(item.relationType);
  const [reasonText, setReasonText] = useState(item.reasonText ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      await onSave({ relationType, reasonText: reasonText.trim() || undefined });
    } catch (ex: any) {
      setErr(ex?.response?.data?.message ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-sky-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <SkyCard variant="admin" className="modal-content p-0 overflow-hidden w-full max-w-md">
          <ModalHead
            Icon={Link2}
            eyebrowText="Goal relationship"
            title="Edit Relationship"
            tone={relationType === 'CONFLICTS' ? 'rose' : 'deep'}
            onClose={onClose}
          />
          <form onSubmit={submit} className="p-5 space-y-3">
            {err && <FormError>{err}</FormError>}
            <p className="text-sm font-semibold text-sky-ink">
              {item.goalName} <span className="text-sky-ink-3 font-normal">⇄</span> {item.relatedGoalName}
            </p>
            <div>
              <label className={fieldLabel}>Relation type *</label>
              <select value={relationType} onChange={e => setRelationType(e.target.value as GoalRelationType)} className={inputCls}>
                <option value="SUPPORTS">Supports — goes well together</option>
                <option value="CONFLICTS">Conflicts — soft warning</option>
              </select>
            </div>
            <div>
              <label className={fieldLabel}>Reason (optional)</label>
              <textarea
                value={reasonText}
                onChange={e => setReasonText(e.target.value)}
                className={`${inputCls} min-h-18 resize-none`}
                placeholder="Why do these goals relate?"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <SkyButton type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</SkyButton>
              <SkyButton type="submit" variant="primary" disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save
              </SkyButton>
            </div>
          </form>
        </SkyCard>
      </div>
    </Portal>
  );
}

// ─── Drag-and-drop board (react-dnd) ───────────────────────────────────────
type ColumnId = 'SUPPORTS' | 'CONFLICTS' | 'OTHER';
const ITEM_TYPE = 'goal-relationship-card';
interface DragItem { goalId: number; column: ColumnId; }

/** One draggable goal card. Cards in Supports/Conflicts also get an edit (reason) and
 *  a remove shortcut for admins who'd rather click than drag. */
function DraggableGoalCard({ goal, column, busy, reasonText, onEdit, onRemove }: {
  goal: GoalDto;
  column: ColumnId;
  busy: boolean;
  reasonText?: string | null;
  onEdit?(): void;
  onRemove?(): void;
}) {
  const [{ isDragging }, dragRef] = useDrag<DragItem, unknown, { isDragging: boolean }>(() => ({
    type: ITEM_TYPE,
    item: { goalId: goal.goalId, column },
    canDrag: !busy,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [goal.goalId, column, busy]);

  return (
    <div
      ref={(node) => { dragRef(node); }}
      title={reasonText ?? undefined}
      className={[
        'group flex items-center gap-1.5 px-2.5 py-2 rounded-sky-chip bg-white/85 ring-1 ring-white/90',
        'text-xs font-medium text-sky-ink-2 transition',
        busy ? 'opacity-50 pointer-events-none' : 'cursor-grab active:cursor-grabbing',
        isDragging ? 'opacity-30' : '',
      ].join(' ')}
    >
      <span className="flex-1 min-w-0 truncate">{goal.goalName}</span>
      {busy && <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-sky-ink-3" aria-hidden="true" />}
      {!busy && onEdit && (
        <button type="button" onClick={onEdit} className="shrink-0 opacity-0 group-hover:opacity-100 transition text-sky-ink-3 hover:text-sky-deep">
          <Pencil className="w-3 h-3" aria-hidden="true" />
        </button>
      )}
      {!busy && onRemove && (
        <button type="button" onClick={onRemove} className="shrink-0 opacity-0 group-hover:opacity-100 transition text-sky-ink-3 hover:text-sky-rose-deep">
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/** One drop lane. Dropping a card already in this column is a no-op. */
function DropColumn({ columnId, label, count, icon: Icon, tone, onDropCard, children }: {
  columnId: ColumnId;
  label: string;
  count: number;
  icon?: LucideIcon;
  tone: 'teal' | 'rose' | 'neutral';
  onDropCard(item: DragItem): void;
  children: React.ReactNode;
}) {
  const [{ isOver, canDrop }, dropRef] = useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>(() => ({
    accept: ITEM_TYPE,
    drop: (item) => { if (item.column !== columnId) onDropCard(item); },
    collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
  }), [columnId, onDropCard]);

  const toneCls = tone === 'teal'
    ? 'bg-sky-teal-bg/50 ring-sky-teal/22'
    : tone === 'rose'
      ? 'bg-sky-rose/8 ring-sky-rose/22'
      : 'bg-white/55 ring-white/85';

  return (
    <div
      ref={(node) => { dropRef(node); }}
      className={`rounded-sky-chip ring-1 p-2.5 min-h-32.5 flex flex-col gap-1.5 transition ${toneCls} ${isOver && canDrop ? 'ring-2 ring-sky-deep/50' : ''}`}
    >
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-ink-3 px-0.5 mb-0.5">
        {Icon && <Icon className="w-3 h-3 shrink-0" strokeWidth={2.6} aria-hidden="true" />} {label} ({count})
      </p>
      {children}
    </div>
  );
}

/** The 3-lane board for one base goal — expanded inline under its row. */
function GoalRelationshipBoard({ baseGoal, goals, categories, relationships, onCreate, onUpdate, onDelete, onEditItem }: {
  baseGoal: GoalDto;
  goals: GoalDto[];
  categories: GoalCategoryDto[];
  relationships: GoalRelationshipDto[];
  onCreate(payload: CreateGoalRelationshipPayload): Promise<void>;
  onUpdate(id: number, payload: UpdateGoalRelationshipPayload): Promise<void>;
  onDelete(id: number): Promise<void>;
  onEditItem(item: GoalRelationshipDto): void;
}) {
  const [otherSearch, setOtherSearch] = useState('');
  const [busyGoalId, setBusyGoalId] = useState<number | null>(null);
  const [err, setErr] = useState('');

  const categoryMeta = useMemo(() => {
    const map = new Map<string, { name: string; order: number }>();
    categories.forEach(c => map.set(c.categoryCode, { name: c.categoryName, order: c.displayOrder }));
    return map;
  }, [categories]);

  // Every relationship touching the base goal, keyed by the OTHER goal's id (matches
  // both directions — a pair is undirected from the admin's point of view).
  const relForOther = useMemo(() => {
    const map = new Map<number, GoalRelationshipDto>();
    for (const r of relationships) {
      if (r.goalId === baseGoal.goalId) map.set(r.relatedGoalId, r);
      else if (r.relatedGoalId === baseGoal.goalId) map.set(r.goalId, r);
    }
    return map;
  }, [relationships, baseGoal.goalId]);

  const others = useMemo(() => goals.filter(g => g.goalId !== baseGoal.goalId), [goals, baseGoal.goalId]);
  const supportsGoals = others.filter(g => relForOther.get(g.goalId)?.relationType === 'SUPPORTS');
  const conflictsGoals = others.filter(g => relForOther.get(g.goalId)?.relationType === 'CONFLICTS');
  const otherGoals = others.filter(g => !relForOther.has(g.goalId));
  const q = otherSearch.trim().toLowerCase();
  const otherGoalsFiltered = q ? otherGoals.filter(g => g.goalName.toLowerCase().includes(q)) : otherGoals;

  // Group by category so a 50+ item column stays scannable instead of one long scroll.
  const otherGoalsByCategory = useMemo(() => {
    const byCode = new Map<string, GoalDto[]>();
    for (const g of otherGoalsFiltered) {
      const arr = byCode.get(g.categoryCode) ?? [];
      arr.push(g);
      byCode.set(g.categoryCode, arr);
    }
    return Array.from(byCode.entries())
      .map(([code, list]) => ({ code, name: categoryMeta.get(code)?.name ?? code, order: categoryMeta.get(code)?.order ?? 999, goals: list }))
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  }, [otherGoalsFiltered, categoryMeta]);

  const handleMove = async (goalId: number, from: ColumnId, to: ColumnId) => {
    setErr('');
    setBusyGoalId(goalId);
    const existing = relForOther.get(goalId);
    try {
      if (to === 'OTHER') {
        if (existing) await onDelete(existing.goalRelationshipId);
      } else if (from === 'OTHER') {
        await onCreate({ goalId: baseGoal.goalId, relatedGoalId: goalId, relationType: to });
      } else if (existing) {
        await onUpdate(existing.goalRelationshipId, { relationType: to, reasonText: existing.reasonText ?? undefined });
      }
    } catch (ex: any) {
      setErr(ex?.response?.data?.message ?? 'Could not update this relationship.');
    } finally {
      setBusyGoalId(null);
    }
  };

  const handleRemove = async (goalId: number) => {
    const existing = relForOther.get(goalId);
    if (!existing) return;
    setErr('');
    setBusyGoalId(goalId);
    try {
      await onDelete(existing.goalRelationshipId);
    } catch (ex: any) {
      setErr(ex?.response?.data?.message ?? 'Could not remove this relationship.');
    } finally {
      setBusyGoalId(null);
    }
  };

  return (
    <div className="px-4 pb-4 pt-1 border-t border-white/70">
      {err && <div className="my-3"><FormError>{err}</FormError></div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
        <DropColumn
          columnId="SUPPORTS"
          label="Supports"
          count={supportsGoals.length}
          icon={RELATION_META.SUPPORTS.Icon}
          tone="teal"
          onDropCard={(item) => handleMove(item.goalId, item.column, 'SUPPORTS')}
        >
          {supportsGoals.length === 0 ? (
            <p className="text-[11px] text-sky-ink-3 italic px-0.5 py-1">Drop a goal here</p>
          ) : supportsGoals.map(g => (
            <DraggableGoalCard
              key={g.goalId}
              goal={g}
              column="SUPPORTS"
              busy={busyGoalId === g.goalId}
              reasonText={relForOther.get(g.goalId)?.reasonText}
              onEdit={() => onEditItem(relForOther.get(g.goalId)!)}
              onRemove={() => handleRemove(g.goalId)}
            />
          ))}
        </DropColumn>

        <DropColumn
          columnId="CONFLICTS"
          label="Conflicts"
          count={conflictsGoals.length}
          icon={RELATION_META.CONFLICTS.Icon}
          tone="rose"
          onDropCard={(item) => handleMove(item.goalId, item.column, 'CONFLICTS')}
        >
          {conflictsGoals.length === 0 ? (
            <p className="text-[11px] text-sky-ink-3 italic px-0.5 py-1">Drop a goal here</p>
          ) : conflictsGoals.map(g => (
            <DraggableGoalCard
              key={g.goalId}
              goal={g}
              column="CONFLICTS"
              busy={busyGoalId === g.goalId}
              reasonText={relForOther.get(g.goalId)?.reasonText}
              onEdit={() => onEditItem(relForOther.get(g.goalId)!)}
              onRemove={() => handleRemove(g.goalId)}
            />
          ))}
        </DropColumn>

        <DropColumn
          columnId="OTHER"
          label="Other goals"
          count={otherGoals.length}
          tone="neutral"
          onDropCard={(item) => handleMove(item.goalId, item.column, 'OTHER')}
        >
          <div className="relative mb-0.5">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-sky-ink-3" aria-hidden="true" />
            <input
              value={otherSearch}
              onChange={e => setOtherSearch(e.target.value)}
              placeholder="Filter…"
              className="w-full pl-6 pr-2 py-1.5 rounded-sky-chip bg-white/70 ring-1 ring-white/80 text-[11px] font-medium text-sky-ink focus:outline-none focus:ring-2 focus:ring-sky-deep/45"
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2.5 pr-0.5">
            {otherGoalsByCategory.length === 0 ? (
              <p className="text-[11px] text-sky-ink-3 italic px-0.5 py-1">No goals match.</p>
            ) : otherGoalsByCategory.map(cat => (
              <div key={cat.code}>
                <p className="text-[9.5px] font-bold uppercase tracking-widest text-sky-ink-3 px-0.5 mb-1 sticky top-0 bg-white/85 backdrop-blur-sm py-0.5 -mx-0.5">
                  {cat.name} ({cat.goals.length})
                </p>
                <div className="space-y-1.5">
                  {cat.goals.map(g => (
                    <DraggableGoalCard key={g.goalId} goal={g} column="OTHER" busy={busyGoalId === g.goalId} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DropColumn>
      </div>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function AdminGoalRelationshipManagement() {
  const alert = useAlert();
  const [goals, setGoals] = useState<GoalDto[]>([]);
  const [categories, setCategories] = useState<GoalCategoryDto[]>([]);
  const [relationships, setRelationships] = useState<GoalRelationshipDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedGoalId, setExpandedGoalId] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<GoalRelationshipDto | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [goalsRes, catRes, relRes] = await Promise.all([
        adminGoalApi.getGoals(),
        adminGoalApi.getCategories(),
        adminGoalRelationshipApi.getAll(),
      ]);
      if (goalsRes.success) setGoals(goalsRes.data ?? []);
      if (catRes.success) setCategories(catRes.data ?? []);
      if (relRes.success) setRelationships(relRes.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Per-goal Supports/Conflicts counts for the collapsed row badges — built once for
  // the whole list rather than re-scanning `relationships` per row.
  const countsByGoal = useMemo(() => {
    const map = new Map<number, { supports: number; conflicts: number }>();
    const bump = (goalId: number, key: 'supports' | 'conflicts') => {
      const cur = map.get(goalId) ?? { supports: 0, conflicts: 0 };
      cur[key] += 1;
      map.set(goalId, cur);
    };
    for (const r of relationships) {
      const key = r.relationType === 'SUPPORTS' ? 'supports' : 'conflicts';
      bump(r.goalId, key);
      bump(r.relatedGoalId, key);
    }
    return map;
  }, [relationships]);

  const filteredGoals = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return goals;
    return goals.filter(g => g.goalName.toLowerCase().includes(q));
  }, [goals, search]);

  // Every mutation refetches — the list is small (no pagination on this endpoint) and
  // this keeps every open board looking at the same truth after a drag/edit/remove.
  const doCreate = async (payload: CreateGoalRelationshipPayload) => {
    await adminGoalRelationshipApi.create(payload);
    await fetchAll();
  };
  const doUpdate = async (id: number, payload: UpdateGoalRelationshipPayload) => {
    await adminGoalRelationshipApi.update(id, payload);
    await fetchAll();
  };
  const doDelete = async (id: number) => {
    await adminGoalRelationshipApi.delete(id);
    await fetchAll();
  };

  const handleEditSave = async (payload: UpdateGoalRelationshipPayload) => {
    if (!editItem) return;
    await doUpdate(editItem.goalRelationshipId, payload);
    alert.success('Relationship updated.');
    setEditItem(null);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full flex flex-col gap-4">
        <PageHeader
          icon={<Link2 className="w-6 h-6" strokeWidth={2.2} aria-hidden="true" />}
          tone="deep"
          size="h1"
          eyebrow="Admin · content engine"
          title="Goal Relationships"
          description="Pick a goal, then drag others into Supports or Conflicts."
        />

        <SkyCard variant="admin" className="flex-1 min-h-0 flex flex-col overflow-hidden p-5">
          <div className="relative mb-4 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sky-ink-3" aria-hidden="true" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search goals…"
              className={`${inputCls} pl-9`}
            />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="flex items-center gap-2 justify-center py-10 text-sky-ink-3"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
            ) : filteredGoals.length === 0 ? (
              <EmptyState title="No goals match" hint="Try a different search." />
            ) : (
              <div className="space-y-1.5">
                {filteredGoals.map(g => {
                  const open = expandedGoalId === g.goalId;
                  const counts = countsByGoal.get(g.goalId);
                  return (
                    <div key={g.goalId} className="rounded-sky-chip bg-white/70 ring-1 ring-white/85 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedGoalId(open ? null : g.goalId)}
                        className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left"
                        aria-expanded={open}
                      >
                        <ChevronRight className={`w-4 h-4 shrink-0 text-sky-ink-3 transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden="true" />
                        <span className="flex-1 min-w-0 text-sm font-semibold text-sky-ink truncate">{g.goalName}</span>
                        {!!counts?.supports && (
                          <span className="shrink-0 text-[10px] font-bold text-sky-teal">{counts.supports} supports</span>
                        )}
                        {!!counts?.conflicts && (
                          <span className="shrink-0 text-[10px] font-bold text-sky-rose-deep">{counts.conflicts} conflicts</span>
                        )}
                      </button>
                      {open && (
                        <GoalRelationshipBoard
                          baseGoal={g}
                          goals={goals}
                          categories={categories}
                          relationships={relationships}
                          onCreate={doCreate}
                          onUpdate={doUpdate}
                          onDelete={doDelete}
                          onEditItem={setEditItem}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SkyCard>

        {editItem && (
          <EditRelationshipModal item={editItem} onSave={handleEditSave} onClose={() => setEditItem(null)} />
        )}
      </div>
    </DndProvider>
  );
}

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, ChevronRight, ChevronDown, ChevronUp, ArrowLeft, X, Loader2,
  Zap, ToggleLeft, ToggleRight, Braces, RefreshCw,
  ShieldCheck, Link as LinkIcon, CheckCircle, AlertTriangle, ExternalLink,
  Target, ScrollText, BookOpen, Layers, Check, Minus, Search, GitBranch, type LucideIcon,
} from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import PageHeader from '../components/common/PageHeader';
import { adminGoalApi } from '../api/adminGoalApi';
import { adminPracticalTaskApi } from '../api/adminPracticalTaskApi';
import { adminRecommendationRuleApi } from '../api/adminRecommendationRuleApi';
import SkyCard from '../components/ui/card/SkyCard';
import SkyButton from '../components/ui/button/SkyButton';
import { positiveIntDisplay, parsePositiveInt } from '../utils/numberInput';
import {
  PillarDto,
  GoalCategoryDto, GoalCategoryPayload,
  GoalDto, GoalPayload, MeasurementType,
  AdminTaskTemplateDto, PracticalTaskPayload, TaskRecommendationLevel,
  TaskRole, TaskStrategy, PracticalRepeatType,
  RecommendationRuleDto, RecommendationRuleConditionDto,
  CreateRulePayload, UpdateRulePayload_Rec,
  AddConditionPayload, RuleMatchMode, ConditionOperator,
  QuestionnaireTemplateDto, GoalQuestionnaireDto,
  OptionTaskMappingDto,
} from '../types/adminGoal.types';

// ─── Shared style helpers ─────────────────────────────────────────────────────
// Glass field rather than a bordered box: the surface carries the affordance and
// focus deepens the ring instead of swapping a border colour.
const inputCls = [
  'w-full px-3.5 py-2.5 rounded-sky-chip bg-white/70 ring-1 ring-white/80',
  'text-sky-ink text-sm font-medium transition-shadow',
  'focus:outline-none focus:ring-2 focus:ring-sky-deep/45',
  'placeholder:text-sky-ink-3 disabled:opacity-55',
].join(' ');

const eyebrow = 'text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3';
const fieldLabel = `block mb-1.5 ${eyebrow}`;

// This screen is a four-level hierarchy (category → goal → task/rule/questionnaire),
// so each level gets one hue and keeps it everywhere it appears — modal header,
// tab, badge. Category=peach, goal=deep, task=violet, rule=deep, questionnaire=peach.
// Teal is reserved for the one thing that genuinely means success: the Active
// state of a record (§4 — never green).
type Tone = 'deep' | 'peach' | 'violet' | 'teal' | 'rose';
const TONE: Record<Tone, { wash: string; rail: string; chip: string }> = {
  deep: { wash: 'bg-sky-deep/8', rail: 'bg-sky-deep', chip: 'bg-sky-deep/12 ring-sky-deep/22 text-sky-deep' },
  peach: { wash: 'bg-sky-peach/14', rail: 'bg-sky-peach', chip: 'bg-sky-peach/20 ring-sky-peach/32 text-sky-peach-deep' },
  violet: { wash: 'bg-sky-violet/10', rail: 'bg-sky-violet', chip: 'bg-sky-violet/14 ring-sky-violet/24 text-sky-violet-deep' },
  teal: { wash: 'bg-sky-teal/10', rail: 'bg-sky-teal', chip: 'bg-sky-teal-bg ring-sky-teal/26 text-sky-teal' },
  rose: { wash: 'bg-sky-rose/10', rail: 'bg-sky-rose', chip: 'bg-sky-rose/14 ring-sky-rose/26 text-sky-rose-deep' },
};

/** Modal chrome — tinted strip, colour rail, icon chip, eyebrow + display title. */
function ModalHead({ Icon, eyebrowText, title, tone, onClose }: {
  Icon: LucideIcon; eyebrowText: string; title: string; tone: Tone; onClose(): void;
}) {
  const t = TONE[tone];
  return (
    <div className={`relative flex items-center gap-3 p-5 ${t.wash} border-b border-white/70 overflow-hidden`}>
      <span aria-hidden="true" className={`absolute left-0 top-0 bottom-0 w-1.5 ${t.rail}`} />
      <span className={`grid place-items-center w-10 h-10 shrink-0 rounded-sky-chip ring-1 ${t.chip}`}>
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

/** Form error — rose rail plus a glyph, so the failure never rests on hue alone. */
function FormError({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-sky-chip bg-sky-rose/10 ring-1 ring-sky-rose/26 pl-4 pr-3 py-2.5 flex items-center gap-2">
      <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" />
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-sky-rose-deep" strokeWidth={2.4} aria-hidden="true" />
      <span className="text-xs font-semibold text-sky-rose-deep">{children}</span>
    </div>
  );
}

/**
 * Active/Off pill. Active is teal with a tick, Off is neutral ink with a dash —
 * the glyph does the work so the two read apart without colour (§4).
 */
function StatusPill({ active, onLabel = 'Active', offLabel = 'Off', compact }: {
  active: boolean; onLabel?: string; offLabel?: string; compact?: boolean;
}) {
  const Glyph = active ? Check : Minus;
  return (
    <span
      className={`inline-flex items-center gap-1 shrink-0 rounded-full ring-1 font-semibold ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[10px]'} ${active
        ? 'bg-sky-teal-bg text-sky-teal ring-sky-teal/26'
        : 'bg-sky-ink/7 text-sky-ink-3 ring-sky-ink/12'
        }`}
    >
      <Glyph className="w-2.5 h-2.5 shrink-0" strokeWidth={3} aria-hidden="true" />
      {active ? onLabel : offLabel}
    </span>
  );
}

/** Empty state — dashed well, muted glyph, one instruction. */
function EmptyState({ Icon, title, hint }: { Icon: LucideIcon; title: string; hint: string }) {
  return (
    <div className="text-center py-12 border border-dashed border-sky-ink/16 rounded-sky-card bg-white/40">
      <Icon className="w-10 h-10 mx-auto mb-2.5 text-sky-ink-3 opacity-45" strokeWidth={1.6} aria-hidden="true" />
      <p className="font-display font-semibold text-sky-ink-2">{title}</p>
      <p className="text-sm text-sky-ink-3 mt-0.5">{hint}</p>
    </div>
  );
}

/** Checkbox row — one recipe so all six forms agree. */
function CheckRow({ checked, onChange, label }: {
  checked: boolean; onChange(v: boolean): void; label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-4 h-4 rounded accent-sky-deep" />
      <span className="text-sm font-semibold text-sky-ink-2">{label}</span>
    </label>
  );
}

// Daily Task keeps its own narrower whitelist (no TEXT_LOG) — see PracticalTaskTemplate.AllowedProofTypes.
const VERIFICATION_TYPES = ['SELF_CHECK', 'PHOTO', 'GPS', 'STEP_COUNTER'];
const VERIFICATION_TAGS = ['FACE', 'ITEM', 'ACTION'];
const RECOMMENDATION_LEVELS: { value: TaskRecommendationLevel; label: string }[] = [
  { value: 'MustDo', label: 'Must Do' },
  { value: 'Recommended', label: 'Recommended' },
  { value: 'Optional', label: 'Optional' },
  { value: 'Bonus', label: 'Bonus' },
];
const TASK_ROLES: TaskRole[] = ['Core', 'Support', 'Tracking', 'Reflection', 'Challenge', 'Review'];
const TASK_STRATEGIES: TaskStrategy[] = ['Main', 'Prepare', 'Track', 'Trigger', 'Environment', 'Reflect', 'SmallExtra'];
const REPEAT_TYPES: PracticalRepeatType[] = ['DailyRepeatable', 'Rotatable', 'Optional', 'Bonus'];

// Every seeded goal in this codebase (SLEEP_RECOVERY, HEALTH_FITNESS, FOOD_NUTRITION, ...) builds
// its 10 tasks from this exact same rank -> {importance, role, strategy, repeatType} recipe — it's
// not arbitrary per-goal choice, it's a fixed convention. Encoding it as one dropdown means an admin
// picks "what kind of task is this" once instead of getting 5 independent decisions that must be
// kept consistent by hand. "Custom" (advanced mode) exists for the rare task that must deviate.
interface TaskSlot {
  slot: number;
  label: string;
  hint: string;
  rank: number;
  level: TaskRecommendationLevel;
  role: TaskRole;
  strategy: TaskStrategy;
  repeatType: PracticalRepeatType;
}
const TASK_SLOTS: TaskSlot[] = [
  { slot: 1, label: 'Slot 1 — Core Action', hint: 'The main action, measured directly against the goal. Always assigned, shows up every day. Example: "Drink 1 cup of water".', rank: 1, level: 'MustDo', role: 'Core', strategy: 'Main', repeatType: 'DailyRepeatable' },
  { slot: 2, label: 'Slot 2 — Prepare', hint: 'Sets up or clears the way for the main action. Always assigned, every day. Example: "Fill up your water bottle".', rank: 2, level: 'MustDo', role: 'Support', strategy: 'Prepare', repeatType: 'DailyRepeatable' },
  { slot: 3, label: 'Slot 3 — Tracking', hint: 'Logs how much progress was made. Always assigned, every day. Example: "Log how many cups you drank".', rank: 3, level: 'MustDo', role: 'Tracking', strategy: 'Track', repeatType: 'DailyRepeatable' },
  { slot: 4, label: 'Slot 4 — Trigger', hint: 'Ties the action to a specific moment in the day. Recommended, rotates in and out. Example: "Drink right after waking up".', rank: 4, level: 'Recommended', role: 'Support', strategy: 'Trigger', repeatType: 'Rotatable' },
  { slot: 5, label: 'Slot 5 — Environment Setup', hint: 'Changes the surroundings to make the habit easier. Recommended, rotates in and out. Example: "Keep the bottle in plain sight".', rank: 5, level: 'Recommended', role: 'Support', strategy: 'Environment', repeatType: 'Rotatable' },
  { slot: 6, label: 'Slot 6 — Reflect', hint: 'A short reflection, one line in a journal. Recommended, rotates in and out.', rank: 6, level: 'Recommended', role: 'Reflection', strategy: 'Reflect', repeatType: 'Rotatable' },
  { slot: 7, label: 'Slot 7 — Small Extra', hint: 'A small bonus action — nice to have, not required.', rank: 7, level: 'Optional', role: 'Support', strategy: 'SmallExtra', repeatType: 'Optional' },
  { slot: 8, label: 'Slot 8 — Self Rating', hint: 'A self-rating of how it went (usually paired with a Rating Scale question). Not required.', rank: 8, level: 'Optional', role: 'Reflection', strategy: 'Rating', repeatType: 'Optional' },
  { slot: 9, label: 'Slot 9 — Bonus Challenge', hint: 'A harder challenge, opt-in for players who want to push further.', rank: 9, level: 'Bonus', role: 'Challenge', strategy: 'BonusChallenge', repeatType: 'Bonus' },
  { slot: 10, label: 'Slot 10 — Weekly Review', hint: 'A recap that runs weekly instead of daily.', rank: 10, level: 'Bonus', role: 'Review', strategy: 'WeeklyReview', repeatType: 'Bonus' },
];

// ─── Variable picker + live preview for Title/Description ───────────────────
// Lets an admin see and click-insert the goal's actual FieldKeys instead of retyping
// {field_key} from memory, and immediately see which ones resolve. See ProgressionPlanService
// .ResolveAllBindings (BE) for the real naming convention this mirrors client-side as a heuristic
// hint only — it is NOT authoritative, just a nudge toward the output key over the final key.
interface GoalVariable {
  fieldKey: string;
  questionText: string;
  questionType: string;
  minValue: number | null;
  maxValue: number | null;
}

function classifyVariable(fieldKey: string): string | null {
  if (/^target_(count|minutes|frequency)$/.test(fieldKey)) return '⭐ Weekly ramp value — use this one in the title';
  if (/^target_(count|minutes|frequency)_final$/.test(fieldKey)) return '🎯 Raw/final answer — don’t use this in the title';
  if (/_time$|_at$/.test(fieldKey)) return '⏰ Time of day (schedule)';
  return null;
}

function sampleValueFor(v: GoalVariable): string {
  switch (v.questionType) {
    case 'NumberInput':
    case 'RatingScale':
    case 'Duration':
      if (v.minValue != null && v.maxValue != null) return String(Math.round((v.minValue + v.maxValue) / 2));
      if (v.maxValue != null) return String(v.maxValue);
      return '5';
    case 'Time':
      return '07:30';
    case 'YesNo':
      return 'Yes';
    case 'SingleChoice':
    case 'MultipleChoice':
      return 'OPTION_VALUE';
    default:
      return 'sample';
  }
}

/** Renders template text with {field_key} tokens swapped for a sample value (resolved = blue),
 * or left literal and flagged (unresolved = rose) — same "leave it visible" contract as the
 * real BE VariableRenderer, just previewed client-side before saving. */
function renderPreviewNodes(text: string, vars: GoalVariable[]): React.ReactNode {
  if (!text.trim()) return null;
  const regex = /\{(\w+)\}/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text))) {
    if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
    const v = vars.find(x => x.fieldKey === m![1]);
    parts.push(v
      ? <span key={key++} className="font-semibold text-sky-deep">{sampleValueFor(v)}</span>
      : <span key={key++} className="font-semibold text-sky-rose-deep bg-sky-rose/14 px-1 rounded">{`{${m[1]}}`}</span>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return <p className="text-[11px] text-sky-ink-3 mt-1 leading-snug">Preview: {parts}</p>;
}

/** Finds the slot whose 5-field recipe exactly matches an existing task, so editing a
 * standard task re-opens showing its slot instead of forcing Advanced mode on every edit. */
function matchTaskSlot(t: AdminTaskTemplateDto | null): number | '' {
  if (!t) return 1; // default for a brand-new task
  const found = TASK_SLOTS.find(s =>
    s.rank === t.rankDefault && s.level === t.recommendationLevel &&
    s.role === t.taskRole && s.strategy === t.strategy && s.repeatType === t.repeatType);
  return found?.slot ?? '';
}
const MEASUREMENT_TYPES: MeasurementType[] = ['CHECK_IN', 'COUNTABLE', 'FREQUENCY_BASED', 'QUALITY_BASED', 'SCHEDULE_BASED', 'TIME_BASED'];
const MATCH_MODES: RuleMatchMode[] = ['AllConditions', 'AnyCondition'];
const OPERATORS: ConditionOperator[] = ['Equals', 'NotEquals', 'GreaterThan', 'LessThan', 'Contains', 'In', 'NotIn'];

// ─── Portal ───────────────────────────────────────────────────────────────────
const Portal = ({ children }: { children: React.ReactNode }) =>
  createPortal(children, document.body);

// ─── ConfirmDeleteModal ───────────────────────────────────────────────────────
function ConfirmDeleteModal({ title, body, onConfirm, onCancel, loading }: {
  title: string; body: string;
  onConfirm(): void; onCancel(): void; loading?: boolean;
}) {
  return (
    <Portal>
      <div className="fixed inset-0 bg-sky-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <SkyCard variant="admin" className="modal-content w-full max-w-sm">
          <div className="flex items-start gap-3 mb-3">
            <span className="grid place-items-center w-10 h-10 shrink-0 rounded-sky-chip bg-sky-rose/14 ring-1 ring-sky-rose/26 text-sky-rose-deep">
              <AlertTriangle className="w-5 h-5" strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className={eyebrow}>Irreversible</p>
              <h3 className="font-display text-lg font-semibold text-sky-ink leading-tight">{title}</h3>
            </div>
          </div>
          <p className="text-sm text-sky-ink-2 mb-6">{body}</p>
          {/* Cancel sits first so the safe choice is the one under the cursor,
              to the left of the irreversible one. */}
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

// ─── CategoryFormModal ────────────────────────────────────────────────────────
function CategoryFormModal({ editing, pillars, onSave, onClose }: {
  editing: GoalCategoryDto | null;
  pillars: PillarDto[];
  onSave(payload: GoalCategoryPayload): Promise<void>;
  onClose(): void;
}) {
  const [code, setCode] = useState(editing?.categoryCode ?? '');
  const [name, setName] = useState(editing?.categoryName ?? '');
  const [desc, setDesc] = useState(editing?.description ?? '');
  const [icon, setIcon] = useState(editing?.iconCode ?? '');
  const [order, setOrder] = useState(editing?.displayOrder ?? 1);
  const [active, setActive] = useState(editing?.isActive ?? true);
  // Pillar is required by BE. 0 = not chosen yet (legacy categories may load as 0 → admin must pick one).
  const [pillarId, setPillarId] = useState<number>(editing?.pillarId ?? 0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) { setErr('Code and name are required.'); return; }
    if (!pillarId) { setErr('Please pick a lifestyle pillar.'); return; }
    setSaving(true); setErr('');
    try { await onSave({ categoryCode: code.trim().toUpperCase(), categoryName: name.trim(), description: desc.trim() || undefined, iconCode: icon.trim() || undefined, displayOrder: order, isActive: active, pillarId }); }
    catch (ex: any) { setErr(ex?.response?.data?.message ?? 'Save failed.'); }
    finally { setSaving(false); }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-sky-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <SkyCard variant="admin" className="modal-content p-0 overflow-hidden w-full max-w-md">
          <ModalHead Icon={Layers} eyebrowText="Goal category" title={editing ? 'Edit Category' : 'New Category'} tone="peach" onClose={onClose} />
          <form onSubmit={submit} className="p-5 space-y-3">
            {err && <FormError>{err}</FormError>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={fieldLabel}>Code *</label>
                <input value={code} onChange={e => setCode(e.target.value)} className={inputCls} placeholder="HEALTH" disabled={!!editing} />
              </div>
              <div>
                <label className={fieldLabel}>Display Order</label>
                <input type="number" min={1} value={positiveIntDisplay(order)} onChange={e => setOrder(parsePositiveInt(e.target.value))} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={fieldLabel}>Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Health & Wellness" required />
            </div>
            <div>
              <label className={fieldLabel}>Lifestyle Pillar *</label>
              <select value={pillarId} onChange={e => setPillarId(Number(e.target.value))} className={inputCls}>
                <option value={0} disabled>Select a pillar…</option>
                {pillars.map(p => <option key={p.pillarId} value={p.pillarId}>{p.pillarName}</option>)}
              </select>
              <p className="mt-1 text-[10px] text-sky-ink-3">Groups this category under one of the 4 pillars in the mobile Goal Wizard.</p>
            </div>
            <div>
              <label className={fieldLabel}>Description</label>
              <input value={desc} onChange={e => setDesc(e.target.value)} className={inputCls} placeholder="Optional description" />
            </div>
            <div>
              <label className={fieldLabel}>Icon Code (slug)</label>
              <input value={icon} onChange={e => setIcon(e.target.value)} className={inputCls} placeholder="health-icon" />
            </div>
            <CheckRow checked={active} onChange={setActive} label="Active (visible to players)" />
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

// ─── GoalFormModal ────────────────────────────────────────────────────────────
function GoalFormModal({ editing, defaultCategoryCode, onSave, onClose }: {
  editing: GoalDto | null;
  defaultCategoryCode: string;
  onSave(payload: GoalPayload): Promise<void>;
  onClose(): void;
}) {
  const [code, setCode] = useState(editing?.goalCode ?? '');
  const [gname, setGname] = useState(editing?.goalName ?? '');
  const [desc, setDesc] = useState(editing?.description ?? '');
  const [mtype, setMtype] = useState<MeasurementType>(editing?.measurementType ?? 'CHECK_IN');
  const [order, setOrder] = useState(editing?.displayOrder ?? 1);
  const [active, setActive] = useState(editing?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gname.trim()) { setErr('Goal name is required.'); return; }
    if (!editing && !code.trim()) { setErr('Goal code is required for new goals.'); return; }
    setSaving(true); setErr('');
    try {
      await onSave({
        goalCode: code.trim().toUpperCase(),
        goalName: gname.trim(),
        description: desc.trim() || undefined,
        categoryCode: defaultCategoryCode,
        measurementType: mtype,
        displayOrder: order,
        isActive: active,
      });
    } catch (ex: any) { setErr(ex?.response?.data?.message ?? 'Save failed.'); }
    finally { setSaving(false); }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-sky-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <SkyCard variant="admin" className="modal-content p-0 overflow-hidden w-full max-w-lg">
          <ModalHead Icon={Target} eyebrowText="Goal" title={editing ? 'Edit Goal' : 'New Goal'} tone="deep" onClose={onClose} />
          <form onSubmit={submit} className="p-5 space-y-3">
            {err && <FormError>{err}</FormError>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={fieldLabel}>Code *</label>
                <input value={code} onChange={e => setCode(e.target.value)} className={inputCls} placeholder="DRINK_WATER" disabled={!!editing} />
              </div>
              <div>
                <label className={fieldLabel}>Display Order</label>
                <input type="number" min={1} value={positiveIntDisplay(order)} onChange={e => setOrder(parsePositiveInt(e.target.value))} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={fieldLabel}>Goal Name *</label>
              <input value={gname} onChange={e => setGname(e.target.value)} className={inputCls} placeholder="Drink 2L of water daily" required />
            </div>
            <div>
              <label className={fieldLabel}>Description</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className={inputCls} placeholder="Optional description" />
            </div>
            <div>
              <label className={fieldLabel}>Measurement Type</label>
              <select value={mtype} onChange={e => setMtype(e.target.value as MeasurementType)} className={inputCls}>
                {MEASUREMENT_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <CheckRow checked={active} onChange={setActive} label="Active" />
            <div className="flex gap-3 pt-2">
              <SkyButton type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</SkyButton>
              <SkyButton type="submit" variant="success" disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {editing ? 'Save' : 'Create'}
              </SkyButton>
            </div>
          </form>
        </SkyCard>
      </div>
    </Portal>
  );
}

// ─── PracticalTaskFormModal ───────────────────────────────────────────────────
function TaskFormModal({ goalId, editing, onSave, onClose }: {
  goalId: number;
  editing: AdminTaskTemplateDto | null;
  onSave(payload: PracticalTaskPayload & { goalId: number }): Promise<void>;
  onClose(): void;
}) {
  const [title, setTitle] = useState(editing?.title ?? '');
  const [desc, setDesc] = useState(editing?.description ?? '');
  const [vtype, setVtype] = useState(editing?.verificationType ?? 'SELF_CHECK');
  const [active, setActive] = useState(editing?.isActive ?? true);
  const [requiredVariables, setRequiredVariables] = useState(editing?.requiredVariables ?? '');
  const [tags, setTags] = useState(editing?.verificationTags ?? '');
  const [level, setLevel] = useState<TaskRecommendationLevel>(editing?.recommendationLevel ?? 'Recommended');
  const [rank, setRank] = useState(editing?.rankDefault ?? 5);
  const [damage, setDamage] = useState(editing?.defaultDamage ?? 10);
  const [rewardGold, setRewardGold] = useState(editing?.defaultRewardGold ?? 10);
  const [howToSubmit, setHowToSubmit] = useState(editing?.howToSubmit ?? '');
  const [taskRole, setTaskRole] = useState<TaskRole>(editing?.taskRole ?? 'Core');
  const [strategy, setStrategy] = useState<TaskStrategy>(editing?.strategy ?? 'Main');
  const [repeatType, setRepeatType] = useState<PracticalRepeatType>(editing?.repeatType ?? 'DailyRepeatable');
  const [recommendScore, setRecommendScore] = useState(editing?.defaultRecommendScore ?? 50);
  const [repeatCountVariable, setRepeatCountVariable] = useState(editing?.repeatCountVariable ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // Task Slot picker — see TASK_SLOTS. '' means the current 5 values don't match any standard
  // slot (either a brand-new custom combo, or an existing task authored before this picker
  // existed), which auto-opens the Advanced section so nothing is hidden from the admin.
  const [slot, setSlot] = useState<number | ''>(() => matchTaskSlot(editing));
  const [advancedOpen, setAdvancedOpen] = useState(() => matchTaskSlot(editing) === '');

  const applySlot = (n: number) => {
    const preset = TASK_SLOTS.find(s => s.slot === n);
    if (!preset) return;
    setSlot(n);
    setLevel(preset.level);
    setRank(preset.rank);
    setTaskRole(preset.role);
    setStrategy(preset.strategy);
    setRepeatType(preset.repeatType);
  };

  // Variable picker — the goal's own FieldKeys (from its active questionnaire), fetched once so
  // the admin can click-insert {field_key} into Title/Description instead of retyping from memory.
  const [goalVariables, setGoalVariables] = useState<GoalVariable[]>([]);
  const [varsLoading, setVarsLoading] = useState(true);
  const [varPickerOpen, setVarPickerOpen] = useState(false);
  const [activeField, setActiveField] = useState<'title' | 'description'>('title');
  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setVarsLoading(true);
      try {
        const gqRes = await adminGoalApi.getGoalQuestionnaires(goalId);
        const activeGq = gqRes.data?.find(g => g.isActive);
        if (!activeGq) { if (!cancelled) setGoalVariables([]); return; }
        const qRes = await adminGoalApi.getQuestionsByTemplate(activeGq.templateId, { activeOnly: true });
        const vars: GoalVariable[] = (qRes.data ?? [])
          .filter(q => !!q.fieldKey)
          .map(q => ({ fieldKey: q.fieldKey!, questionText: q.questionText, questionType: q.questionType, minValue: q.minValue, maxValue: q.maxValue }));
        if (!cancelled) setGoalVariables(vars);
      } finally {
        if (!cancelled) setVarsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [goalId]);

  const insertVariable = (fieldKey: string) => {
    const token = `{${fieldKey}}`;
    const ref = activeField === 'title' ? titleRef.current : descRef.current;
    const current = activeField === 'title' ? title : desc;
    const setValue = activeField === 'title' ? setTitle : setDesc;
    const start = ref?.selectionStart ?? current.length;
    const end = ref?.selectionEnd ?? current.length;
    setValue(current.slice(0, start) + token + current.slice(end));
    requestAnimationFrame(() => {
      ref?.focus();
      const pos = start + token.length;
      ref?.setSelectionRange(pos, pos);
    });
  };

  // Any {field_key} actually referenced in Title/Description right now — one click populates
  // Required Variables from real usage instead of admin re-typing the same names by hand.
  const detectedVariables = Array.from(new Set([...`${title} ${desc}`.matchAll(/\{(\w+)\}/g)].map(m => m[1])));

  const selectedTags = tags.split(',').map(s => s.trim()).filter(Boolean);
  const toggleTag = (tag: string) => {
    const next = selectedTags.includes(tag) ? selectedTags.filter(t => t !== tag) : [...selectedTags, tag];
    setTags(next.join(','));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setErr('Title is required.'); return; }
    setSaving(true); setErr('');
    try {
      await onSave({
        goalId, title: title.trim(), description: desc.trim() || undefined, verificationType: vtype, isActive: active,
        requiredVariables: requiredVariables.trim() || undefined,
        verificationTags: tags || undefined,
        recommendationLevel: level,
        rankDefault: rank,
        damage,
        rewardGold,
        howToSubmit: howToSubmit.trim() || undefined,
        taskRole,
        strategy,
        repeatType,
        defaultRecommendScore: recommendScore,
        repeatCountVariable: repeatCountVariable.trim() || null,
      });
    }
    catch (ex: any) { setErr(ex?.response?.data?.message ?? 'Save failed.'); }
    finally { setSaving(false); }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-sky-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <SkyCard variant="admin" className="modal-content p-0 overflow-hidden w-full max-w-md">
          <ModalHead Icon={Zap} eyebrowText="Practical task" title={editing ? 'Edit Task' : 'New Practical Task'} tone="violet" onClose={onClose} />
          <form onSubmit={submit} className="p-5 space-y-3 max-h-[75vh] overflow-y-auto">
            {err && <FormError>{err}</FormError>}
            <div>
              <label className={fieldLabel}>Title *</label>
              <input
                ref={titleRef}
                value={title}
                onFocus={() => setActiveField('title')}
                onChange={e => setTitle(e.target.value)}
                className={inputCls}
                placeholder="e.g. Log water intake daily"
                required
              />
              {renderPreviewNodes(title, goalVariables)}
            </div>
            <div>
              <label className={fieldLabel}>Description</label>
              <textarea
                ref={descRef}
                value={desc}
                onFocus={() => setActiveField('description')}
                onChange={e => setDesc(e.target.value)}
                rows={2}
                className={inputCls}
              />
              {renderPreviewNodes(desc, goalVariables)}
            </div>

            {/* Variable picker — click a FieldKey to insert {field_key} into whichever of
                Title/Description was last focused. Fixes "admin has to remember/retype exact
                FieldKey spelling" and "no way to know if it'll resolve before saving". */}
            <div className="rounded-sky-md bg-sky-deep/6 ring-1 ring-sky-deep/16 overflow-hidden">
              <button
                type="button"
                onClick={() => setVarPickerOpen(v => !v)}
                className="w-full flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-sky-deep hover:opacity-75 transition-opacity"
              >
                <Braces className="w-3.5 h-3.5 shrink-0" strokeWidth={2.4} />
                Insert Variable — add a FieldKey to {activeField === 'title' ? 'Title' : 'Description'}
                <span className="ml-auto">{varPickerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</span>
              </button>
              {varPickerOpen && (
                <div className="px-3.5 pb-3 space-y-1 max-h-48 overflow-y-auto">
                  {varsLoading ? (
                    <p className="text-[11px] text-sky-ink-3 italic">Loading variables…</p>
                  ) : goalVariables.length === 0 ? (
                    <p className="text-[11px] text-sky-ink-3 italic">This goal has no FieldKeys yet — go to Questionnaires and add a question with a FieldKey first.</p>
                  ) : (
                    goalVariables.map(v => {
                      const badge = classifyVariable(v.fieldKey);
                      return (
                        <button
                          key={v.fieldKey}
                          type="button"
                          onClick={() => insertVariable(v.fieldKey)}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-sky-chip bg-white/70 hover:bg-white ring-1 ring-white/85 text-left transition-colors"
                        >
                          <span className="font-mono text-[11px] font-semibold text-sky-deep shrink-0">{`{${v.fieldKey}}`}</span>
                          <span className="text-[10px] text-sky-ink-3 truncate flex-1 min-w-0">{v.questionText}</span>
                          {badge && <span className="shrink-0 text-[9px] font-semibold text-sky-ink-3 whitespace-nowrap">{badge}</span>}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            <div>
              <label className={fieldLabel}>Verification Type</label>
              <select
                value={vtype}
                onChange={e => {
                  const next = e.target.value;
                  setVtype(next);
                  if (next !== 'PHOTO') setTags(''); // tags only apply to PHOTO
                }}
                className={inputCls}
              >
                {VERIFICATION_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              {/* Whether a task gets AI-checked is 100% decided by ProofType (SELF_CHECK = auto-approve,
                  anything else = AI verify — see CheckInDailyTaskCommandHandler) — no separate toggle
                  needed, just surface the consequence of the choice already made above. */}
              {vtype === 'SELF_CHECK' ? (
                <p className="text-[10px] font-semibold text-sky-teal mt-1.5">✅ SELF_CHECK — approved instantly when the player marks it done, no AI involved.</p>
              ) : (
                <p className="text-[10px] font-semibold text-sky-violet-deep mt-1.5">🤖 This task will be AI-checked when the player submits proof. The AI reads the Title, Description and How To Submit text to decide what to look for — no extra setup needed.</p>
              )}
            </div>
            {vtype === 'PHOTO' && (
              <div>
                <label className={fieldLabel}>Verification Tags</label>
                <div className="flex flex-wrap gap-3">
                  {VERIFICATION_TAGS.map(tag => (
                    <label key={tag} className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input type="checkbox" checked={selectedTags.includes(tag)} onChange={() => toggleTag(tag)} className="w-3.5 h-3.5 rounded accent-sky-deep" />
                      <span className="text-xs font-semibold text-sky-ink-2">{tag}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-sky-ink-3 mt-1">A task can carry more than one — FACE blocks submission until portrait-verified; ITEM/ACTION are AI hints only.</p>
              </div>
            )}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className={`${fieldLabel} mb-0`}>Required Variables</label>
                {detectedVariables.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRequiredVariables(detectedVariables.join(','))}
                    className="flex items-center gap-1 text-[10px] font-semibold text-sky-deep hover:opacity-75 transition-opacity shrink-0"
                    title="Refill from the {variable} tokens actually used in Title/Description"
                  >
                    <RefreshCw className="w-3 h-3" strokeWidth={2.6} /> Auto-fill from Title/Description
                  </button>
                )}
              </div>
              <input value={requiredVariables} onChange={e => setRequiredVariables(e.target.value)} className={inputCls} placeholder="e.g. target_time,support_action" />
              <p className="text-[10px] text-sky-ink-3 mt-1">Comma-separated {'{variable}'} placeholder names used in the title/description. Just a note for admins — the system doesn't check this against the actual text.</p>
            </div>
            <div>
              <label className={fieldLabel}>How To Submit</label>
              <input value={howToSubmit} onChange={e => setHowToSubmit(e.target.value)} className={inputCls} placeholder="e.g. Take a photo of your filled water bottle" maxLength={500} />
              <p className="text-[10px] text-sky-ink-3 mt-1">Player-facing instructions for what proof to submit.</p>
            </div>
            <div className="rounded-sky-md bg-white/50 ring-1 ring-white/76 p-3.5">
              <label className={fieldLabel}>Does this task repeat multiple times a day, based on a number?</label>
              <p className="text-[10px] text-sky-ink-3 mb-2.5 leading-relaxed">
                Example goal <b>"drink 8 cups of water a day"</b>: turn this on and the system automatically splits it into <b>8 separate "Drink 1 cup" check-ins</b> that day — instead of one task saying "drink 8 cups" that nobody can do in one go. The task title should describe <b>one single repeat</b> (e.g. "Drink 1 cup of water"), not the total.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRepeatCountVariable('')}
                  className={`flex-1 px-3 py-2 rounded-sky-chip text-xs font-semibold ring-1 transition-colors ${repeatCountVariable === '' ? 'bg-sky-deep text-white ring-sky-deep' : 'bg-white/70 text-sky-ink-2 ring-white/85 hover:bg-white'}`}
                >
                  No — once a day
                </button>
                <button
                  type="button"
                  onClick={() => setRepeatCountVariable(goalVariables.find(v => ['NumberInput', 'RatingScale', 'Duration'].includes(v.questionType))?.fieldKey ?? ' ')}
                  className={`flex-1 px-3 py-2 rounded-sky-chip text-xs font-semibold ring-1 transition-colors ${repeatCountVariable !== '' ? 'bg-sky-deep text-white ring-sky-deep' : 'bg-white/70 text-sky-ink-2 ring-white/85 hover:bg-white'}`}
                >
                  Yes — repeats by a number
                </button>
              </div>
              {repeatCountVariable !== '' && (
                <div className="mt-2.5">
                  <label className={fieldLabel}>Which question holds that number?</label>
                  {goalVariables.filter(v => ['NumberInput', 'RatingScale', 'Duration'].includes(v.questionType)).length === 0 ? (
                    <p className="text-[11px] text-sky-rose-deep font-semibold">This goal has no number-type questions yet (NumberInput/RatingScale/Duration) — add one in Questionnaires first.</p>
                  ) : (
                    <select value={repeatCountVariable.trim()} onChange={e => setRepeatCountVariable(e.target.value)} className={inputCls}>
                      <option value="" disabled>— Choose the question that holds the count —</option>
                      {goalVariables.filter(v => ['NumberInput', 'RatingScale', 'Duration'].includes(v.questionType)).map(v => (
                        <option key={v.fieldKey} value={v.fieldKey}>{`{${v.fieldKey}}`} — {v.questionText}</option>
                      ))}
                    </select>
                  )}
                  <p className="text-[10px] text-sky-ink-3 mt-1">The system reads the player's answer to this question (e.g. "8") to create that many check-ins for the day.</p>
                </div>
              )}
            </div>
            <div className="rounded-sky-md bg-sky-violet/6 ring-1 ring-sky-violet/18 p-3.5 space-y-2.5">
              <div>
                <label className={fieldLabel}>Task Slot (1-10)</label>
                <select
                  value={slot}
                  onChange={e => applySlot(Number(e.target.value))}
                  className={inputCls}
                >
                  {slot === '' && <option value="" disabled>— Custom (doesn't match a standard slot) —</option>}
                  {TASK_SLOTS.map(s => <option key={s.slot} value={s.slot}>{s.label}</option>)}
                </select>
                <p className="text-[10px] text-sky-ink-3 mt-1.5 leading-relaxed">
                  {slot !== ''
                    ? TASK_SLOTS.find(s => s.slot === slot)!.hint
                    : 'The current Importance/Rank/Role/Strategy/Repeat Type combo doesn\'t match a standard slot — open "Edit details" below to see the real values.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdvancedOpen(v => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-sky-violet-deep hover:opacity-75 transition-opacity"
              >
                {advancedOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                Edit details (Importance / Rank / Role / Strategy / Repeat Type)
              </button>
              {advancedOpen && (
                <div className="space-y-2.5 pt-2 border-t border-sky-violet/14">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={fieldLabel}>Importance</label>
                      <select value={level} onChange={e => { setLevel(e.target.value as TaskRecommendationLevel); setSlot(''); }} className={inputCls}>
                        {RECOMMENDATION_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                      </select>
                      <p className="text-[10px] text-sky-ink-3 mt-1">Whether the task is always assigned — MustDo always is; Recommended/Optional/Bonus get lower and lower priority.</p>
                    </div>
                    <div>
                      <label className={fieldLabel}>Rank (1-20)</label>
                      <input type="number" min={1} max={20} value={positiveIntDisplay(rank)} onChange={e => { setRank(parsePositiveInt(e.target.value)); setSlot(''); }} className={inputCls} />
                      <p className="text-[10px] text-sky-ink-3 mt-1">Priority order within its Importance group — lower numbers get picked first when several tasks compete for one daily slot.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={fieldLabel}>Task Role</label>
                      <select value={taskRole} onChange={e => { setTaskRole(e.target.value as TaskRole); setSlot(''); }} className={inputCls}>
                        {TASK_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={fieldLabel}>Strategy</label>
                      <select value={strategy} onChange={e => { setStrategy(e.target.value as TaskStrategy); setSlot(''); }} className={inputCls}>
                        {TASK_STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={fieldLabel}>Repeat Type</label>
                      <select value={repeatType} onChange={e => { setRepeatType(e.target.value as PracticalRepeatType); setSlot(''); }} className={inputCls}>
                        {REPEAT_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                  <p className="text-[10px] text-sky-ink-3">Role / Strategy / Repeat Type are just classification labels for admins right now — the system doesn't use these 3 fields to pick or order daily tasks yet.</p>
                </div>
              )}
            </div>
            <div>
              <label className={fieldLabel}>Recommend Score (0-100)</label>
              <input type="number" min={0} max={100} value={recommendScore} onChange={e => setRecommendScore(Number(e.target.value))} className={inputCls} />
              <p className="text-[10px] text-sky-ink-3 mt-1">Only used as a tie-breaker when 2+ tasks at the same Importance level compete for one daily slot — the higher score wins. Leave at 50 (default) unless you need to favor this task specifically.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={fieldLabel}>Damage</label>
                <input type="number" min={0} value={damage} onChange={e => setDamage(Number(e.target.value))} className={inputCls} />
              </div>
              <div>
                <label className={fieldLabel}>Reward Gold</label>
                <input type="number" min={0} value={rewardGold} onChange={e => setRewardGold(Number(e.target.value))} className={inputCls} />
              </div>
            </div>
            <CheckRow checked={active} onChange={setActive} label="Active" />
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

// ─── RuleFormModal ────────────────────────────────────────────────────────────
function RuleFormModal({ goalId, editing, onSave, onClose }: {
  goalId: number;
  editing: RecommendationRuleDto | null;
  onSave(payload: CreateRulePayload | UpdateRulePayload_Rec): Promise<void>;
  onClose(): void;
}) {
  const [rname, setRname] = useState(editing?.ruleName ?? '');
  const [desc, setDesc] = useState(editing?.description ?? '');
  const [priority, setPriority] = useState(editing?.priority ?? 0);
  const [matchMode, setMatchMode] = useState<RuleMatchMode>((editing?.matchMode as RuleMatchMode) ?? 'AllConditions');
  const [active, setActive] = useState(editing?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rname.trim()) { setErr('Rule name is required.'); return; }
    setSaving(true); setErr('');
    try {
      if (editing) {
        await onSave({ ruleId: editing.ruleId, ruleName: rname.trim(), description: desc.trim() || undefined, priority, matchMode } as UpdateRulePayload_Rec);
      } else {
        await onSave({ goalId, ruleName: rname.trim(), description: desc.trim() || undefined, priority, matchMode, isActive: active } as CreateRulePayload);
      }
    } catch (ex: any) { setErr(ex?.response?.data?.message ?? 'Save failed.'); }
    finally { setSaving(false); }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-sky-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <SkyCard variant="admin" className="modal-content p-0 overflow-hidden w-full max-w-md">
          <ModalHead Icon={ShieldCheck} eyebrowText="Recommendation rule" title={editing ? 'Edit Rule' : 'New Rule'} tone="deep" onClose={onClose} />
          <form onSubmit={submit} className="p-5 space-y-3">
            {err && <FormError>{err}</FormError>}
            <div>
              <label className={fieldLabel}>Rule Name *</label>
              <input value={rname} onChange={e => setRname(e.target.value)} className={inputCls} placeholder="e.g. Poor sleeper — under 6 hours" required />
            </div>
            <div>
              <label className={fieldLabel}>Description</label>
              <input value={desc} onChange={e => setDesc(e.target.value)} className={inputCls} placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={fieldLabel}>Priority (lower = first)</label>
                <input type="number" min={0} value={priority} onChange={e => setPriority(Number(e.target.value))} className={inputCls} />
              </div>
              <div>
                <label className={fieldLabel}>Match Mode</label>
                <select value={matchMode} onChange={e => setMatchMode(e.target.value as RuleMatchMode)} className={inputCls}>
                  {MATCH_MODES.map(m => <option key={m} value={m}>{m === 'AllConditions' ? 'ALL (AND)' : 'ANY (OR)'}</option>)}
                </select>
              </div>
            </div>
            {!editing && (
              <CheckRow checked={active} onChange={setActive} label="Active" />
            )}
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

// ─── ConditionFormModal ───────────────────────────────────────────────────────
function ConditionFormModal({ ruleId, editing, onSave, onClose }: {
  ruleId: number;
  editing: RecommendationRuleConditionDto | null;
  onSave(payload: AddConditionPayload): Promise<void>;
  onClose(): void;
}) {
  const [questionId, setQuestionId] = useState(editing?.questionId?.toString() ?? '');
  const [operator, setOperator] = useState<ConditionOperator>((editing?.operator as ConditionOperator) ?? 'Equals');
  const [condValue, setCondValue] = useState(editing?.conditionValue ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qid = Number(questionId);
    if (!qid) { setErr('Question ID is required.'); return; }
    if (!condValue.trim()) { setErr('Condition value is required.'); return; }
    setSaving(true); setErr('');
    try { await onSave({ ruleId, questionId: qid, operator, conditionValue: condValue.trim() }); }
    catch (ex: any) { setErr(ex?.response?.data?.message ?? 'Save failed.'); }
    finally { setSaving(false); }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-sky-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <SkyCard variant="admin" className="modal-content p-0 overflow-hidden w-full max-w-sm">
          <ModalHead Icon={BookOpen} eyebrowText="Rule condition" title={editing ? 'Edit Condition' : 'Add Condition'} tone="deep" onClose={onClose} />
          <form onSubmit={submit} className="p-5 space-y-3">
            {err && <FormError>{err}</FormError>}
            <div>
              <label className={fieldLabel}>Question ID *</label>
              <input type="number" value={questionId} onChange={e => setQuestionId(e.target.value)} className={inputCls} placeholder="Question ID from the Questionnaire Builder" required />
              <p className="text-[10px] text-sky-ink-3 mt-1">Find IDs in the Questionnaire Builder page.</p>
            </div>
            <div>
              <label className={fieldLabel}>Operator</label>
              <select value={operator} onChange={e => setOperator(e.target.value as ConditionOperator)} className={inputCls}>
                {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
            </div>
            <div>
              <label className={fieldLabel}>Value *</label>
              <input value={condValue} onChange={e => setCondValue(e.target.value)} className={inputCls} placeholder='e.g. "LOW" or "6"' required />
            </div>
            <div className="flex gap-3 pt-2">
              <SkyButton type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</SkyButton>
              <SkyButton type="submit" variant="primary" disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {editing ? 'Save' : 'Add'}
              </SkyButton>
            </div>
          </form>
        </SkyCard>
      </div>
    </Portal>
  );
}

// ─── BindQuestionnaireModal ───────────────────────────────────────────────────
function BindQuestionnaireModal({ goalId, onBound, onClose }: {
  goalId: number;
  onBound(): void;
  onClose(): void;
}) {
  const [templates, setTemplates] = useState<QuestionnaireTemplateDto[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    adminGoalApi.getTemplates({ activeOnly: true }).then(res => {
      if (res.success) setTemplates(res.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    if (!selected) { setErr('Select a template first.'); return; }
    setSaving(true); setErr('');
    try { await adminGoalApi.bindTemplateToGoal(goalId, selected); onBound(); }
    catch (ex: any) { setErr(ex?.response?.data?.message ?? 'Bind failed.'); }
    finally { setSaving(false); }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-sky-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <SkyCard variant="admin" className="modal-content p-0 overflow-hidden w-full max-w-md">
          <ModalHead Icon={ScrollText} eyebrowText="Questionnaire binding" title="Attach Questionnaire" tone="peach" onClose={onClose} />
          <div className="p-5 space-y-4">
            {err && <FormError>{err}</FormError>}
            {loading ? (
              <div className="flex items-center gap-2 text-sky-ink-3"><Loader2 className="w-4 h-4 animate-spin" /> Loading templates…</div>
            ) : templates.length === 0 ? (
              <p className="text-sm text-sky-ink-2">No active templates found. Create one in the Questionnaire Builder.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {templates.map(tpl => (
                  <button
                    key={tpl.templateId}
                    type="button"
                    onClick={() => setSelected(tpl.templateId)}
                    aria-pressed={selected === tpl.templateId}
                    className={`relative w-full text-left px-4 py-3 pl-4 rounded-sky-chip overflow-hidden transition-all duration-150 ${selected === tpl.templateId
                      ? 'bg-sky-peach/16 ring-1 ring-sky-peach/32'
                      : 'bg-white/62 ring-1 ring-white/80 hover:bg-white/80'}`}
                  >
                    {/* Selection carries a rail and a tick beside the name, so the
                        chosen template reads without depending on the tint. */}
                    {selected === tpl.templateId && <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1 bg-sky-peach" />}
                    <p className="flex items-center gap-1.5 font-semibold text-sm text-sky-ink">
                      {selected === tpl.templateId && <Check className="w-3.5 h-3.5 shrink-0 text-sky-peach-deep" strokeWidth={2.6} aria-hidden="true" />}
                      {tpl.templateName}
                    </p>
                    {tpl.description && <p className="text-xs text-sky-ink-3 mt-0.5">{tpl.description}</p>}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <SkyButton type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</SkyButton>
              <SkyButton type="button" variant="primary" onClick={submit} disabled={saving || !selected} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />} Attach
              </SkyButton>
            </div>
          </div>
        </SkyCard>
      </div>
    </Portal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB A — PRACTICAL TASKS
// ═══════════════════════════════════════════════════════════════════════════════
function PracticalTasksTab({ goal }: { goal: GoalDto }) {
  const [tasks, setTasks] = useState<AdminTaskTemplateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskModal, setTaskModal] = useState<{ editing: AdminTaskTemplateDto | null } | null>(null);
  const [delTask, setDelTask] = useState<AdminTaskTemplateDto | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminPracticalTaskApi.getTasks(goal.goalId);
      if (res.success) setTasks(res.data ?? []);
    } finally { setLoading(false); }
  }, [goal.goalId]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async (payload: PracticalTaskPayload & { goalId: number }) => {
    if (taskModal?.editing) {
      const { goalId: _g, ...updatePayload } = payload;
      await adminPracticalTaskApi.updateTask(taskModal.editing.taskId, updatePayload);
    } else {
      await adminPracticalTaskApi.createTask(payload);
    }
    setTaskModal(null);
    fetch();
  };

  const handleDelete = async () => {
    if (!delTask) return;
    setDelLoading(true);
    try { await adminPracticalTaskApi.deleteTask(delTask.taskId); setDelTask(null); fetch(); }
    finally { setDelLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-sky-ink-3">
          <span className="font-display font-semibold text-sky-ink tabular-nums">{tasks.length}</span> task template{tasks.length !== 1 ? 's' : ''} for this goal
        </p>
        <SkyButton type="button" variant="secondary" size="sm" onClick={() => setTaskModal({ editing: null })}>
          <Plus className="w-4 h-4" /> Add Task
        </SkyButton>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 justify-center py-10 text-sky-ink-3"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
      ) : tasks.length === 0 ? (
        <EmptyState Icon={Zap} title="No tasks yet" hint="Add practical task templates for this goal." />
      ) : (
        <SkyCard variant="admin" className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="sky-table-head">
                {['#', 'Title', 'Verification', 'Status', 'Actions'].map(h => (
                  <th key={h} className={`px-4 py-3 text-left ${eyebrow}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((t, i) => (
                <tr key={t.taskId} className="sky-table-row">
                  <td className="px-4 py-3 text-xs font-semibold text-sky-ink-3 tabular-nums">{i + 1}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="font-semibold text-sky-ink truncate">{t.title}</p>
                    {t.description && <p className="text-xs text-sky-ink-3 truncate">{t.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {/* Verification method is a category, not a verdict, so it stays
                        on the game/violet tone rather than borrowing a status hue. */}
                    <span className="inline-block text-[10px] font-semibold bg-sky-violet/12 text-sky-violet-deep ring-1 ring-sky-violet/22 px-2 py-0.5 rounded-full">{t.verificationType}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill active={t.isActive} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <SkyButton type="button" variant="ghost" size="icon" onClick={() => setTaskModal({ editing: t })} className="w-8 h-8"><Pencil className="w-4 h-4" /></SkyButton>
                      <SkyButton type="button" variant="ghost" size="icon" onClick={() => setDelTask(t)} className="w-8 h-8 text-sky-rose-deep hover:bg-sky-rose/10"><Trash2 className="w-4 h-4" /></SkyButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SkyCard>
      )}

      {taskModal !== null && <TaskFormModal goalId={goal.goalId} editing={taskModal.editing} onSave={handleSave} onClose={() => setTaskModal(null)} />}
      {delTask && <ConfirmDeleteModal title="Delete Task?" body={`Remove "${delTask.title}"?`} loading={delLoading} onConfirm={handleDelete} onCancel={() => setDelTask(null)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB B — RECOMMENDATION RULES
// ═══════════════════════════════════════════════════════════════════════════════
function RecommendationRulesTab({ goal }: { goal: GoalDto }) {
  const [rules, setRules] = useState<RecommendationRuleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRule, setExpandedRule] = useState<number | null>(null);
  const [ruleModal, setRuleModal] = useState<{ editing: RecommendationRuleDto | null } | null>(null);
  const [condModal, setCondModal] = useState<{ ruleId: number; editing: RecommendationRuleConditionDto | null } | null>(null);
  const [delRule, setDelRule] = useState<RecommendationRuleDto | null>(null);
  const [delCond, setDelCond] = useState<{ rule: RecommendationRuleDto; cond: RecommendationRuleConditionDto } | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminRecommendationRuleApi.getRules(goal.goalId);
      if (res.success) setRules((res.data ?? []).sort((a, b) => a.priority - b.priority));
    } finally { setLoading(false); }
  }, [goal.goalId]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSaveRule = async (payload: CreateRulePayload | UpdateRulePayload_Rec) => {
    if (ruleModal?.editing) {
      await adminRecommendationRuleApi.updateRule(ruleModal.editing.ruleId, payload as UpdateRulePayload_Rec);
    } else {
      await adminRecommendationRuleApi.createRule(payload as CreateRulePayload);
    }
    setRuleModal(null);
    fetch();
  };

  const handleToggleRule = async (rule: RecommendationRuleDto) => {
    await adminRecommendationRuleApi.toggleActive(rule.ruleId, !rule.isActive);
    fetch();
  };

  const handleDeleteRule = async () => {
    if (!delRule) return;
    setDelLoading(true);
    try { await adminRecommendationRuleApi.deleteRule(delRule.ruleId); setDelRule(null); fetch(); }
    finally { setDelLoading(false); }
  };

  const handleSaveCond = async (payload: AddConditionPayload) => {
    if (condModal?.editing) {
      await adminRecommendationRuleApi.updateCondition(condModal.editing.conditionId, { conditionId: condModal.editing.conditionId, operator: payload.operator, conditionValue: payload.conditionValue });
    } else {
      await adminRecommendationRuleApi.addCondition(payload.ruleId, payload);
    }
    setCondModal(null);
    fetch();
  };

  const handleDeleteCond = async () => {
    if (!delCond) return;
    setDelLoading(true);
    try { await adminRecommendationRuleApi.deleteCondition(delCond.cond.conditionId); setDelCond(null); fetch(); }
    finally { setDelLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-sky-ink-3">
          <span className="font-display font-semibold text-sky-ink tabular-nums">{rules.length}</span> rule{rules.length !== 1 ? 's' : ''} — sorted by priority
        </p>
        <SkyButton type="button" variant="secondary" size="sm" onClick={() => setRuleModal({ editing: null })}>
          <Plus className="w-4 h-4" /> Add Rule
        </SkyButton>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 justify-center py-10 text-sky-ink-3"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
      ) : rules.length === 0 ? (
        <EmptyState Icon={ShieldCheck} title="No rules yet" hint="Rules decide which tasks to recommend based on player answers." />
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <SkyCard key={rule.ruleId} variant="admin" className="p-0 overflow-hidden">
              {/* Rule header row */}
              <div className="flex items-start gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Priority is the thing an operator scans this list by, so it
                        gets the solid deep fill — the loudest element in the row. */}
                    <span className="inline-block text-[10px] font-semibold bg-sky-deep text-white px-2 py-0.5 rounded-full tabular-nums">P{rule.priority}</span>
                    <p className="font-display font-semibold text-sm text-sky-ink">{rule.ruleName}</p>
                    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ${rule.matchMode === 'AllConditions' ? 'bg-sky-deep/10 text-sky-deep ring-sky-deep/20' : 'bg-sky-violet/12 text-sky-violet-deep ring-sky-violet/22'}`}>
                      {rule.matchMode === 'AllConditions' ? 'AND' : 'OR'}
                    </span>
                    <StatusPill active={rule.isActive} />
                  </div>
                  {rule.description && <p className="text-xs text-sky-ink-3 mt-1">{rule.description}</p>}
                  <p className="text-[10px] text-sky-ink-3 mt-1">{rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <SkyButton type="button" variant="ghost" size="icon" onClick={() => setExpandedRule(expandedRule === rule.ruleId ? null : rule.ruleId)} title="Conditions" aria-expanded={expandedRule === rule.ruleId} className="w-8 h-8">
                    <BookOpen className="w-4 h-4" />
                  </SkyButton>
                  <SkyButton type="button" variant="ghost" size="icon" onClick={() => handleToggleRule(rule)} className="w-8 h-8">
                    {rule.isActive ? <ToggleRight className="w-4 h-4 text-sky-teal" /> : <ToggleLeft className="w-4 h-4 text-sky-ink-3" />}
                  </SkyButton>
                  <SkyButton type="button" variant="ghost" size="icon" onClick={() => setRuleModal({ editing: rule })} className="w-8 h-8"><Pencil className="w-4 h-4" /></SkyButton>
                  <SkyButton type="button" variant="ghost" size="icon" onClick={() => setDelRule(rule)} className="w-8 h-8 text-sky-rose-deep hover:bg-sky-rose/10"><Trash2 className="w-4 h-4" /></SkyButton>
                </div>
              </div>

              {/* Conditions panel */}
              {expandedRule === rule.ruleId && (
                <div className="border-t border-white/70 bg-sky-deep/6 px-4 pb-4">
                  <div className="flex items-center justify-between pt-3 mb-2">
                    <p className={eyebrow}>Conditions</p>
                    <SkyButton type="button" variant="secondary" size="sm" onClick={() => setCondModal({ ruleId: rule.ruleId, editing: null })}>
                      <Plus className="w-3 h-3" /> Add Condition
                    </SkyButton>
                  </div>
                  {rule.conditions.length === 0 ? (
                    <p className="text-xs text-sky-ink-3 py-2.5 text-center border border-dashed border-sky-ink/16 rounded-sky-chip">No conditions — rule matches all players.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {rule.conditions.map(c => (
                        // A condition reads as one expression — subject, operator,
                        // value — so the operator is the only emphasised part and the
                        // value sits in a recessed slot rather than becoming a badge.
                        <div key={c.conditionId} className="flex items-center gap-2 px-3 py-2 bg-white/72 ring-1 ring-white/85 rounded-sky-chip">
                          <span className="text-xs font-mono font-semibold text-sky-ink-2 shrink-0 tabular-nums">Q#{c.questionId}</span>
                          <span className="text-xs font-semibold text-sky-deep shrink-0">{c.operator}</span>
                          <span className="text-xs font-mono bg-sky-ink/7 text-sky-ink-2 px-2 py-0.5 rounded-md flex-1 min-w-0 truncate">{c.conditionValue ?? '—'}</span>
                          <SkyButton type="button" variant="ghost" size="icon" onClick={() => setCondModal({ ruleId: rule.ruleId, editing: c })} className="w-6 h-6"><Pencil className="w-3 h-3" /></SkyButton>
                          <SkyButton type="button" variant="ghost" size="icon" onClick={() => setDelCond({ rule, cond: c })} className="w-6 h-6 text-sky-rose-deep hover:bg-sky-rose/10"><Trash2 className="w-3 h-3" /></SkyButton>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </SkyCard>
          ))}
        </div>
      )}

      {ruleModal !== null && <RuleFormModal goalId={goal.goalId} editing={ruleModal.editing} onSave={handleSaveRule} onClose={() => setRuleModal(null)} />}
      {condModal !== null && <ConditionFormModal ruleId={condModal.ruleId} editing={condModal.editing} onSave={handleSaveCond} onClose={() => setCondModal(null)} />}
      {delRule && <ConfirmDeleteModal title="Delete Rule?" body={`Remove rule "${delRule.ruleName}" and all its conditions?`} loading={delLoading} onConfirm={handleDeleteRule} onCancel={() => setDelRule(null)} />}
      {delCond && <ConfirmDeleteModal title="Delete Condition?" body={`Remove condition Q#${delCond.cond.questionId} ${delCond.cond.operator} "${delCond.cond.conditionValue}"?`} loading={delLoading} onConfirm={handleDeleteCond} onCancel={() => setDelCond(null)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB C — QUESTIONNAIRES
// ═══════════════════════════════════════════════════════════════════════════════
function QuestionnairesTab({ goal }: { goal: GoalDto }) {
  const navigate = useNavigate();
  const [bindings, setBindings] = useState<GoalQuestionnaireDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [bindModal, setBindModal] = useState(false);
  const [activating, setActivating] = useState<number | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [delBinding, setDelBinding] = useState<GoalQuestionnaireDto | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  const loadBindings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGoalApi.getGoalQuestionnaires(goal.goalId);
      if (res.success) setBindings(res.data ?? []);
    } finally { setLoading(false); }
  }, [goal.goalId]);

  useEffect(() => { loadBindings(); }, [loadBindings]);

  const handleActivate = async (b: GoalQuestionnaireDto) => {
    setActivating(b.goalQuestionnaireId);
    setActionErr(null);
    try {
      await adminGoalApi.activateGoalQuestionnaire(goal.goalId, b.goalQuestionnaireId);
      await loadBindings();
    } catch (ex: any) {
      setActionErr(ex?.response?.data?.message ?? 'Activate failed.');
    } finally { setActivating(null); }
  };

  const handleDeactivate = async (b: GoalQuestionnaireDto) => {
    setActivating(b.goalQuestionnaireId);
    setActionErr(null);
    try {
      await adminGoalApi.deactivateGoalQuestionnaire(goal.goalId, b.goalQuestionnaireId);
      await loadBindings();
    } catch (ex: any) {
      setActionErr(ex?.response?.data?.message ?? 'Deactivate failed.');
    } finally { setActivating(null); }
  };

  const handleRemove = async () => {
    if (!delBinding) return;
    setDelLoading(true);
    try {
      await adminGoalApi.deleteGoalQuestionnaire(goal.goalId, delBinding.goalQuestionnaireId);
      setDelBinding(null);
      await loadBindings();
    } catch (ex: any) {
      setActionErr(ex?.response?.data?.message ?? 'Remove failed.');
    } finally { setDelLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-sky-ink-3">
          <span className="font-display font-semibold text-sky-ink tabular-nums">{bindings.length}</span> bound questionnaire{bindings.length !== 1 ? 's' : ''}
        </p>
        <SkyButton type="button" variant="secondary" size="sm" onClick={() => setBindModal(true)}>
          <LinkIcon className="w-4 h-4" /> Attach Template
        </SkyButton>
      </div>
      {actionErr && <FormError>{actionErr}</FormError>}

      {loading ? (
        <div className="flex items-center gap-2 justify-center py-10 text-sky-ink-3"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
      ) : bindings.length === 0 ? (
        <EmptyState Icon={ScrollText} title="No questionnaires attached" hint="Players can&apos;t start Goal Wizard until a questionnaire is active." />
      ) : (
        <div className="space-y-3">
          {bindings.map(b => (
            // Only one binding can be live at a time, so the active one is marked
            // with a teal rail on the card edge as well as its pill — this is the
            // row an operator must not mistake.
            <SkyCard key={b.goalQuestionnaireId} variant="admin" className={`relative overflow-hidden flex items-center gap-4 ${b.isActive ? 'ring-1 ring-sky-teal/28' : ''}`}>
              {b.isActive && <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1.5 bg-sky-teal" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-display font-semibold text-sm text-sky-ink">{b.templateName ?? `Template #${b.templateId}`}</p>
                  {b.isActive && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-sky-teal-bg text-sky-teal ring-1 ring-sky-teal/26 px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3" strokeWidth={2.6} aria-hidden="true" /> Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-sky-ink-3 mt-0.5 tabular-nums">Effective from: {new Date(b.effectiveFrom).toLocaleDateString()}</p>
              </div>
              <SkyButton type="button" variant="secondary" size="sm" onClick={() => navigate(`/questionnaires?templateId=${b.templateId}`)} title="View in Onboarding Eval">
                <ExternalLink className="w-4 h-4" /> Detail
              </SkyButton>
              {b.isActive ? (
                <SkyButton type="button" variant="secondary" size="sm" onClick={() => handleDeactivate(b)} disabled={activating === b.goalQuestionnaireId}>
                  {activating === b.goalQuestionnaireId ? <Loader2 className="w-4 h-4 animate-spin" /> : <ToggleLeft className="w-4 h-4" />}
                  Deactivate
                </SkyButton>
              ) : (
                <SkyButton type="button" variant="primary" size="sm" onClick={() => handleActivate(b)} disabled={activating === b.goalQuestionnaireId}>
                  {activating === b.goalQuestionnaireId ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Activate
                </SkyButton>
              )}
              <SkyButton type="button" variant="ghost" size="icon" onClick={() => setDelBinding(b)} className="text-sky-rose-deep hover:bg-sky-rose/10" aria-label="Remove binding">
                <Trash2 className="w-4 h-4" />
              </SkyButton>
            </SkyCard>
          ))}
        </div>
      )}

      {bindModal && <BindQuestionnaireModal goalId={goal.goalId} onBound={() => { setBindModal(false); loadBindings(); }} onClose={() => setBindModal(false)} />}
      {delBinding && (
        <ConfirmDeleteModal
          title="Remove Questionnaire?"
          body={`Unbind "${delBinding.templateName ?? `Template #${delBinding.templateId}`}" from this goal? This is a soft removal — the binding history is kept, it just stops applying to new players.`}
          loading={delLoading}
          onConfirm={handleRemove}
          onCancel={() => setDelBinding(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 2 — GOAL COMMAND CENTER
// ═══════════════════════════════════════════════════════════════════════════════
type CommandTab = 'tasks' | 'rules' | 'questionnaires' | 'mappings';

// Each tab keeps the hue its own records use elsewhere on the screen, so the
// tab bar doubles as a legend. The scroll PNG is retired — at the 16px these
// pills render, pixel art turns to mush next to lucide's stroke weight.
// Recommendation Rules tab is hidden from the tab bar (still implemented below,
// just not reachable) until the feature is ready to surface to operators.
const TABS: { id: CommandTab; label: string; Icon: LucideIcon; on: string }[] = [
  { id: 'tasks',          label: 'Practical Tasks',      Icon: Zap,        on: 'bg-linear-to-b from-sky-violet to-sky-violet-deep' },
  { id: 'questionnaires', label: 'Questionnaires',       Icon: ScrollText, on: 'bg-linear-to-b from-sky-peach to-sky-peach-deep' },
  { id: 'mappings',       label: 'Option → Task',        Icon: GitBranch,  on: 'bg-linear-to-b from-sky-teal to-sky-teal' },
];

function GoalCommandCenter({ category, goal, onBack }: {
  category: GoalCategoryDto;
  goal: GoalDto;
  onBack(): void;
}) {
  const [tab, setTab] = useState<CommandTab>('tasks');

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 flex-wrap">
        <SkyButton type="button" variant="secondary" size="sm" onClick={onBack}>
          <ArrowLeft className="w-3.5 h-3.5" /> Categories
        </SkyButton>
        <ChevronRight className="w-4 h-4 text-sky-ink-3" aria-hidden="true" />
        <span className="text-sm font-medium text-sky-ink-3">{category.categoryName}</span>
        <ChevronRight className="w-4 h-4 text-sky-ink-3" aria-hidden="true" />
        {/* Only the leaf is emphasised — the trail above it is context, not a title. */}
        <span className="font-display text-sm font-semibold text-sky-ink">{goal.goalName}</span>
        <StatusPill active={goal.isActive} offLabel="Inactive" />
      </div>

      {/* Goal info banner */}
      {/* The goal being configured is the subject of every tab below, so it gets
          a deep rail and display type — the anchor an operator checks against. */}
      <div className="relative flex items-center gap-4 px-4 py-3.5 pl-5 bg-sky-deep/8 ring-1 ring-sky-deep/16 rounded-sky-card overflow-hidden">
        <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1.5 bg-sky-deep" />
        <span className="grid place-items-center w-10 h-10 shrink-0 rounded-sky-chip bg-sky-deep/12 ring-1 ring-sky-deep/22 text-sky-deep">
          <Target className="w-5 h-5" strokeWidth={2.2} aria-hidden="true" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sky-ink truncate">{goal.goalName}</p>
          <p className="text-xs font-medium text-sky-ink-3 truncate">
            <span className="font-mono">{goal.goalCode}</span> · {goal.measurementType}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ id, label, Icon, on }) => {
          const live = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-pressed={live}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-sky-chip font-semibold text-sm transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] ${live
                ? `${on} text-white shadow-sky-fill ring-1 ring-inset ring-white/25`
                : 'bg-white/62 ring-1 ring-white/80 text-sky-ink-2 hover:bg-white/82 hover:text-sky-ink'
                }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${live ? 'text-white' : 'text-sky-ink-3'}`} strokeWidth={2.3} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <SkyCard variant="admin" className="flex-1 overflow-y-auto">
        {tab === 'tasks'          && <PracticalTasksTab      goal={goal} />}
        {tab === 'rules'          && <RecommendationRulesTab goal={goal} />}
        {tab === 'questionnaires' && <QuestionnairesTab      goal={goal} />}
        {tab === 'mappings'       && <OptionTaskMappingsTab  goal={goal} />}
      </SkyCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB D — OPTION → TASK MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════════
// Layout: for each choice question in the goal's active questionnaire,
// show a collapsible section with each option + the tasks it maps to.
// Admin can add or remove mappings inline without leaving the page.
//
// Colour rules:
//   teal chip  = question header (authoritative/structural)
//   peach chip = option           (a human answer, like Required badges)
//   violet chip = task            (reuses the task hue from Tab A)
//   rose  = destructive controls

function OptionTaskMappingsTab({ goal }: { goal: GoalDto }) {
  const alert = useAlert();

  // Existing mappings from server, grouped by questionId
  const [mappings, setMappings] = useState<OptionTaskMappingDto[]>([]);
  // Task templates for this goal (pick list for "add mapping")
  const [tasks, setTasks] = useState<AdminTaskTemplateDto[]>([]);
  const [loading, setLoading] = useState(true);
  // Which option is currently showing its "add" picker
  const [addingFor, setAddingFor] = useState<number | null>(null);
  const [delLoading, setDelLoading] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, tRes] = await Promise.all([
        adminGoalApi.getOptionTaskMappings(goal.goalId),
        adminPracticalTaskApi.getTasks(goal.goalId),
      ]);
      if (mRes.success) setMappings(mRes.data ?? []);
      if (tRes.success) setTasks(tRes.data ?? []);
    } finally { setLoading(false); }
  }, [goal.goalId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (optionId: number, templateId: number) => {
    try {
      const res = await adminGoalApi.createOptionTaskMapping({ optionId, practicalTaskTemplateId: templateId });
      if (res.success) {
        setAddingFor(null);
        await load();
      } else {
        alert.error(res.message ?? 'Failed to add mapping');
      }
    } catch (ex: any) {
      alert.error(ex?.response?.data?.message ?? 'Failed to add mapping');
    }
  };

  const handleRemove = async (mappingId: number) => {
    setDelLoading(mappingId);
    try {
      const res = await adminGoalApi.deleteOptionTaskMapping(mappingId);
      if (res.success) await load();
      else alert.error(res.message ?? 'Delete failed');
    } catch (ex: any) {
      alert.error(ex?.response?.data?.message ?? 'Delete failed');
    } finally { setDelLoading(null); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-sky-ink-3">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading mappings…
      </div>
    );
  }

  // Build hierarchical data: questions → options → their current mappings.
  // We derive questions/options from the mapping DTOs (server already enriches them) — the server
  // also sends a placeholder row (mappingId=0, templateId=0) for every option that has no mapping
  // yet, purely so it still shows up here as a row with an "Add mapping" picker. Filter those out
  // wherever we're counting/rendering "real" mapped tasks.
  const questionsMap = new Map<number, { questionText: string; options: Map<number, { optionText: string; optionValue: string; mappings: OptionTaskMappingDto[] }> }>();
  for (const m of mappings) {
    if (!questionsMap.has(m.questionId)) questionsMap.set(m.questionId, { questionText: m.questionText, options: new Map() });
    const q = questionsMap.get(m.questionId)!;
    if (!q.options.has(m.optionId)) q.options.set(m.optionId, { optionText: m.optionText, optionValue: m.optionValue, mappings: [] });
    if (m.mappingId !== 0) q.options.get(m.optionId)!.mappings.push(m);
  }

  const realMappingsCount = mappings.filter(m => m.mappingId !== 0).length;

  // Tasks already mapped per option (for exclusion in picker)
  const mappedTemplateIdsByOption = (optionId: number) =>
    new Set(mappings.filter(m => m.optionId === optionId && m.mappingId !== 0).map(m => m.templateId));

  const questions = [...questionsMap.entries()];

  if (questions.length === 0) {
    return (
      <div className="space-y-4 p-1">
        <div className="text-center py-12 border border-dashed border-sky-ink/16 rounded-sky-card bg-white/40">
          <GitBranch className="w-10 h-10 mx-auto mb-2.5 text-sky-ink-3 opacity-45" strokeWidth={1.6} aria-hidden="true" />
          <p className="font-display font-semibold text-sky-ink-2">No mappings yet</p>
          <p className="text-sm text-sky-ink-3 mt-0.5">
            Make sure this goal has an active questionnaire with SingleChoice / MultipleChoice questions.
          </p>
        </div>
        <p className={`${eyebrow} text-center`}>Tasks for this goal ({tasks.length})</p>
        <div className="flex flex-wrap gap-2">
          {tasks.map(t => (
            <span key={t.taskId} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-sky-violet/12 text-sky-violet-deep ring-1 ring-sky-violet/22 px-2.5 py-1 rounded-full">
              <Zap className="w-3 h-3 shrink-0" strokeWidth={2.4} /> {t.title}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1">
      {/* Summary bar */}
      <div className="flex items-center gap-3 px-3 py-2.5 bg-sky-teal/8 ring-1 ring-sky-teal/18 rounded-sky-chip">
        <GitBranch className="w-4 h-4 text-sky-teal shrink-0" strokeWidth={2.2} aria-hidden="true" />
        <span className="text-sm font-semibold text-sky-ink-2">
          <span className="text-sky-teal">{realMappingsCount}</span> mapping{realMappingsCount !== 1 ? 's' : ''} across{' '}
          <span className="text-sky-teal">{questions.length}</span> question{questions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Question sections */}
      {questions.map(([questionId, { questionText, options }]) => (
        <div key={questionId} className="rounded-sky-card overflow-hidden ring-1 ring-sky-teal/18">
          {/* Question header */}
          <div className="relative flex items-center gap-2.5 px-4 py-3 bg-sky-teal/8 overflow-hidden">
            <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1.5 bg-sky-teal" />
            <span className="grid place-items-center w-7 h-7 shrink-0 rounded-sky-chip bg-sky-teal-bg ring-1 ring-sky-teal/26">
              <GitBranch className="w-3.5 h-3.5 text-sky-teal" strokeWidth={2.4} aria-hidden="true" />
            </span>
            <p className="font-semibold text-sm text-sky-ink flex-1 min-w-0 truncate">{questionText}</p>
            <span className={`text-[10px] font-semibold tabular-nums ${TONE.teal.chip} px-2 py-0.5 rounded-full ring-1`}>
              {[...options.values()].reduce((sum, o) => sum + o.mappings.length, 0)} maps
            </span>
          </div>

          {/* Options list */}
          <div className="divide-y divide-white/60 bg-white/48">
            {[...options.entries()].map(([optionId, { optionText, optionValue, mappings: optMappings }]) => {
              const alreadyMapped = mappedTemplateIdsByOption(optionId);
              const available = tasks.filter(t => !alreadyMapped.has(t.taskId));
              const isAdding = addingFor === optionId;

              return (
                <div key={optionId} className="px-4 py-3 space-y-2">
                  {/* Option label */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${TONE.peach.chip} px-2.5 py-0.5 rounded-full ring-1`}>
                      {optionText}
                    </span>
                    <span className="text-[10px] font-mono text-sky-ink-3">{optionValue}</span>
                  </div>

                  {/* Mapped task chips */}
                  {optMappings.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {optMappings.map(m => (
                        <span key={m.mappingId} className="group inline-flex items-center gap-1.5 text-[11px] font-semibold bg-sky-violet/12 text-sky-violet-deep ring-1 ring-sky-violet/22 pl-2.5 pr-1.5 py-0.5 rounded-full">
                          <Zap className="w-3 h-3 shrink-0" strokeWidth={2.4} />
                          <span className="max-w-[20ch] truncate">{m.taskTitle}</span>
                          <button
                            type="button"
                            onClick={() => handleRemove(m.mappingId)}
                            disabled={delLoading === m.mappingId}
                            title="Remove mapping"
                            className="ml-0.5 w-4 h-4 grid place-items-center rounded-full hover:bg-sky-rose/18 text-sky-rose-deep transition-colors"
                            aria-label={`Remove mapping to ${m.taskTitle}`}
                          >
                            {delLoading === m.mappingId
                              ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              : <X className="w-2.5 h-2.5" strokeWidth={2.8} />}
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Add mapping picker */}
                  {isAdding ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        className="flex-1 min-w-0 px-3 py-1.5 rounded-sky-chip bg-white/80 ring-1 ring-sky-deep/30 text-sm font-medium text-sky-ink focus:outline-none focus:ring-2 focus:ring-sky-deep/45"
                        defaultValue=""
                        onChange={e => { if (e.target.value) handleAdd(optionId, Number(e.target.value)); }}
                        autoFocus
                      >
                        <option value="" disabled>Select a task…</option>
                        {available.map(t => (
                          <option key={t.taskId} value={t.taskId}>{t.title}</option>
                        ))}
                      </select>
                      <SkyButton type="button" variant="ghost" size="sm" onClick={() => setAddingFor(null)}>
                        <Minus className="w-3.5 h-3.5" /> Cancel
                      </SkyButton>
                    </div>
                  ) : available.length > 0 ? (
                    <SkyButton type="button" variant="secondary" size="sm" onClick={() => setAddingFor(optionId)}>
                      <Plus className="w-3.5 h-3.5" /> Add mapping
                    </SkyButton>
                  ) : (
                    <p className="text-[11px] text-sky-ink-3 italic">All tasks already mapped for this option.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 1 — CATEGORY & GOAL EXPLORER
// ═══════════════════════════════════════════════════════════════════════════════
function CategoryGoalExplorer({ onEnterGoal }: {
  onEnterGoal(category: GoalCategoryDto, goal: GoalDto): void;
}) {
  const [categories, setCategories] = useState<GoalCategoryDto[]>([]);
  const [pillars, setPillars] = useState<PillarDto[]>([]);
  const [goals, setGoals] = useState<GoalDto[]>([]);
  const [catSearch, setCatSearch] = useState('');
  const [goalSearch, setGoalSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<GoalCategoryDto | null>(null);
  const [catLoading, setCatLoading] = useState(true);
  const [goalLoading, setGoalLoading] = useState(false);
  const [catModal, setCatModal] = useState<{ editing: GoalCategoryDto | null } | null>(null);
  const [goalModal, setGoalModal] = useState<{ editing: GoalDto | null } | null>(null);
  const [delCat, setDelCat] = useState<GoalCategoryDto | null>(null);
  const [delGoal, setDelGoal] = useState<GoalDto | null>(null);
  const [delLoading, setDelLoading] = useState(false);
  const alert = useAlert();

  const fetchCategories = useCallback(async () => {
    setCatLoading(true);
    try {
      const res = await adminGoalApi.getCategories({ activeOnly: false });
      if (res.success) setCategories((res.data ?? []).sort((a, b) => a.displayOrder - b.displayOrder));
    } finally { setCatLoading(false); }
  }, []);

  const fetchGoals = useCallback(async (cat: GoalCategoryDto) => {
    setGoalLoading(true);
    try {
      const res = await adminGoalApi.getGoals({ categoryCode: cat.categoryCode });
      if (res.success) setGoals((res.data ?? []).sort((a, b) => a.displayOrder - b.displayOrder));
    } finally { setGoalLoading(false); }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { if (selectedCat) fetchGoals(selectedCat); else setGoals([]); }, [selectedCat, fetchGoals]);
  useEffect(() => {
    adminGoalApi.getPillars({ activeOnly: true })
      .then(res => { if (res.success) setPillars((res.data ?? []).sort((a, b) => a.displayOrder - b.displayOrder)); })
      .catch(() => { /* pillars are seeded & rarely change — a load miss just leaves the picker empty */ });
  }, []);

  const pillarById = useMemo(() => new Map(pillars.map(p => [p.pillarId, p])), [pillars]);

  const filteredCategories = categories.filter(c => {
    const q = catSearch.trim().toLowerCase();
    if (!q) return true;
    return c.categoryName.toLowerCase().includes(q) || c.categoryCode.toLowerCase().includes(q);
  });
  const filteredGoals = goals.filter(g => {
    const q = goalSearch.trim().toLowerCase();
    if (!q) return true;
    return g.goalName.toLowerCase().includes(q) || g.goalCode.toLowerCase().includes(q);
  });

  const handleSaveCat = async (payload: GoalCategoryPayload) => {
    if (catModal?.editing) {
      await adminGoalApi.updateCategory(catModal.editing.categoryId, payload);
      alert.success('Category updated.');
    } else {
      await adminGoalApi.createCategory(payload);
      alert.success('Category created.');
    }
    setCatModal(null);
    fetchCategories();
  };

  const handleToggleCat = async (cat: GoalCategoryDto) => {
    try { await adminGoalApi.toggleCategoryStatus(cat.categoryId, !cat.isActive); fetchCategories(); }
    catch { alert.error('Status update failed.'); }
  };

  const handleDeleteCat = async () => {
    if (!delCat) return;
    setDelLoading(true);
    try {
      await adminGoalApi.deleteCategory(delCat.categoryId);
      alert.success('Category deleted.');
      if (selectedCat?.categoryId === delCat.categoryId) setSelectedCat(null);
      setDelCat(null);
      fetchCategories();
    } catch (ex: any) { alert.error(ex?.response?.data?.message ?? 'Delete failed.'); }
    finally { setDelLoading(false); }
  };

  const handleSaveGoal = async (payload: GoalPayload) => {
    if (goalModal?.editing) {
      await adminGoalApi.updateGoal(goalModal.editing.goalId, payload);
      alert.success('Goal updated.');
    } else {
      await adminGoalApi.createGoal(payload);
      alert.success('Goal created.');
    }
    setGoalModal(null);
    if (selectedCat) fetchGoals(selectedCat);
  };

  const handleDeleteGoal = async () => {
    if (!delGoal) return;
    setDelLoading(true);
    try {
      await adminGoalApi.deleteGoal(delGoal.goalId);
      alert.success('Goal deleted.');
      setDelGoal(null);
      if (selectedCat) fetchGoals(selectedCat);
    } catch (ex: any) { alert.error(ex?.response?.data?.message ?? 'Delete failed.'); }
    finally { setDelLoading(false); }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Split pane */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left: Categories */}
        <SkyCard variant="admin" className="w-72 shrink-0 flex flex-col gap-3 overflow-hidden">
          <div className="flex items-center justify-between shrink-0">
            <h2 className="font-display font-semibold text-sky-ink">Categories</h2>
            <SkyButton type="button" variant="secondary" size="sm" onClick={() => setCatModal({ editing: null })}>
              <Plus className="w-3 h-3" /> New
            </SkyButton>
          </div>
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sky-ink-3 pointer-events-none" aria-hidden="true" />
            <label className="sr-only" htmlFor="gte-cat-search">Search categories</label>
            <input
              id="gte-cat-search"
              type="text"
              value={catSearch}
              onChange={e => setCatSearch(e.target.value)}
              placeholder="Search categories…"
              className="w-full pl-8 pr-3 py-2 rounded-sky-chip bg-white/70 ring-1 ring-white/80 text-xs font-semibold text-sky-ink transition-shadow focus:outline-none focus:ring-2 focus:ring-sky-deep/45"
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 -mr-1 pr-1">
            {catLoading ? (
              <div className="flex items-center justify-center py-8 text-sky-ink-3"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-center py-8 text-sky-ink-3 text-sm">{catSearch ? 'No categories match.' : 'No categories yet'}</div>
            ) : filteredCategories.map(cat => (
              <div
                key={cat.categoryId}
                onClick={() => { setSelectedCat(cat); setGoalSearch(''); }}
                className={`relative cursor-pointer rounded-sky-chip p-3 pl-3.5 overflow-hidden transition-all duration-150 ${selectedCat?.categoryId === cat.categoryId
                  ? 'bg-sky-peach/16 ring-1 ring-sky-peach/32'
                  : 'bg-white/58 ring-1 ring-white/80 hover:bg-white/80'}`}
              >
                {/* Selection is a rail plus a tint — in a narrow rail like this the
                    edge marker is what the eye actually catches while scrolling. */}
                {selectedCat?.categoryId === cat.categoryId && <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1 bg-sky-peach" />}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="font-semibold text-sm text-sky-ink truncate">{cat.categoryName}</p>
                  </div>
                  {/* Compact pill instead of a bare ●/○ glyph: the dot alone was
                      colour-only, and the word survives at any contrast. */}
                  <StatusPill active={cat.isActive} onLabel="On" compact />
                </div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="text-[10px] text-sky-ink-3 font-mono">{cat.categoryCode}</span>
                  {cat.pillarId ? (
                    <span className="text-[9.5px] font-bold uppercase tracking-wide text-sky-deep bg-sky-deep/10 rounded-full px-1.5 py-0.5">
                      {pillarById.get(cat.pillarId)?.pillarName ?? `Pillar #${cat.pillarId}`}
                    </span>
                  ) : (
                    <span className="text-[9.5px] font-bold uppercase tracking-wide text-sky-rose-deep bg-sky-rose/12 rounded-full px-1.5 py-0.5">
                      No pillar
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-2" onClick={e => e.stopPropagation()}>
                  <SkyButton type="button" variant="ghost" size="icon" onClick={() => handleToggleCat(cat)} className="w-6 h-6">
                    {cat.isActive ? <ToggleRight className="w-3.5 h-3.5 text-sky-teal" /> : <ToggleLeft className="w-3.5 h-3.5 text-sky-ink-3" />}
                  </SkyButton>
                  <SkyButton type="button" variant="ghost" size="icon" onClick={() => setCatModal({ editing: cat })} className="w-6 h-6"><Pencil className="w-3.5 h-3.5" /></SkyButton>
                  <SkyButton type="button" variant="ghost" size="icon" onClick={() => setDelCat(cat)} className="w-6 h-6 text-sky-rose-deep hover:bg-sky-rose/10"><Trash2 className="w-3.5 h-3.5" /></SkyButton>
                </div>
              </div>
            ))}
          </div>
        </SkyCard>

        {/* Right: Goals */}
        <SkyCard variant="admin" className="flex-1 flex flex-col gap-3 overflow-hidden">
          {!selectedCat ? (
            <div className="flex-1 flex flex-col items-center justify-center text-sky-ink-3">
              <span className="grid place-items-center w-16 h-16 mb-4 rounded-sky-md bg-white/55 ring-1 ring-white/78">
                <Layers className="w-7 h-7 text-sky-ink-3 opacity-55" strokeWidth={1.6} aria-hidden="true" />
              </span>
              <p className="font-display font-semibold text-lg text-sky-ink-2">Select a Category</p>
              <p className="text-sm">Choose a category on the left to view and manage its goals.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between shrink-0">
                <div>
                  <h2 className="font-display font-semibold text-sky-ink">{selectedCat.categoryName}</h2>
                  <p className="text-xs font-medium text-sky-ink-3">
                    <span className="font-semibold text-sky-ink-2 tabular-nums">{goals.length}</span> goal{goals.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sky-ink-3 pointer-events-none" aria-hidden="true" />
                  <label className="sr-only" htmlFor="gte-goal-search">Search goals</label>
                  <input
                    id="gte-goal-search"
                    type="text"
                    value={goalSearch}
                    onChange={e => setGoalSearch(e.target.value)}
                    placeholder="Search goals…"
                    className="pl-8 pr-3 py-2 rounded-sky-chip bg-white/70 ring-1 ring-white/80 text-xs font-semibold text-sky-ink w-48 transition-shadow focus:outline-none focus:ring-2 focus:ring-sky-deep/45"
                  />
                </div>
                <SkyButton type="button" variant="success" size="sm" onClick={() => setGoalModal({ editing: null })}>
                  <Plus className="w-3 h-3" /> New Goal
                </SkyButton>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 -mr-1 pr-1">
                {goalLoading ? (
                  <div className="flex items-center justify-center py-10 text-sky-ink-3"><Loader2 className="w-5 h-5 animate-spin" /></div>
                ) : filteredGoals.length === 0 ? (
                  <EmptyState Icon={Target} title={goalSearch ? 'No goals match' : 'No goals in this category'} hint={goalSearch ? 'Try a different search term.' : 'Add the first goal using the button above.'} />
                ) : filteredGoals.map(goal => (
                  <div key={goal.goalId} className="sky-lift rounded-sky-chip p-4 bg-white/68 ring-1 ring-white/80 shadow-sky-tint transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-display font-semibold text-sm text-sky-ink">{goal.goalName}</p>
                          <StatusPill active={goal.isActive} />
                        </div>
                        <p className="text-[10px] text-sky-ink-3 font-mono mt-0.5">{goal.goalCode} · {goal.measurementType}</p>
                        {goal.description && <p className="text-xs text-sky-ink-3 mt-1 line-clamp-1">{goal.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <SkyButton type="button" variant="secondary" size="sm" onClick={() => setGoalModal({ editing: goal })}><Pencil className="w-3 h-3" /> Edit</SkyButton>
                      <SkyButton type="button" variant="secondary" size="sm" onClick={() => setDelGoal(goal)} aria-label={`Delete ${goal.goalName}`} className="text-sky-rose-deep"><Trash2 className="w-3 h-3" /></SkyButton>
                      <SkyButton type="button" variant="success" size="sm" onClick={() => onEnterGoal(selectedCat, goal)} className="ml-auto">
                        Configure <ChevronRight className="w-3.5 h-3.5" />
                      </SkyButton>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </SkyCard>
      </div>

      {/* Modals */}
      {catModal  !== null && <CategoryFormModal editing={catModal.editing} pillars={pillars} onSave={handleSaveCat} onClose={() => setCatModal(null)} />}
      {goalModal !== null && selectedCat && <GoalFormModal editing={goalModal.editing} defaultCategoryCode={selectedCat.categoryCode} onSave={handleSaveGoal} onClose={() => setGoalModal(null)} />}
      {delCat  && <ConfirmDeleteModal title="Delete Category?" body={`Delete "${delCat.categoryName}"? All goals inside must be deleted first.`} loading={delLoading} onConfirm={handleDeleteCat} onCancel={() => setDelCat(null)} />}
      {delGoal && <ConfirmDeleteModal title="Delete Goal?" body={`Delete "${delGoal.goalName}"? This cannot be undone.`} loading={delLoading} onConfirm={handleDeleteGoal} onCancel={() => setDelGoal(null)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — GoalTaskEngineHub
// ═══════════════════════════════════════════════════════════════════════════════
export default function GoalTaskEngineHub() {
  const [view, setView] = useState<'explorer' | 'command'>('explorer');
  const [activeCategory, setActiveCategory] = useState<GoalCategoryDto | null>(null);
  const [activeGoal, setActiveGoal] = useState<GoalDto | null>(null);

  const enterGoal = (category: GoalCategoryDto, goal: GoalDto) => {
    setActiveCategory(category);
    setActiveGoal(goal);
    setView('command');
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Page header */}
      <PageHeader
        icon={<Target className="w-6 h-6" strokeWidth={2.2} aria-hidden="true" />}
        tone="deep"
        size="h1"
        eyebrow="Admin · content engine"
        title="Goal Engine Hub"
        description={view === 'explorer' ? 'Category → Goal explorer' : `Configuring: ${activeGoal?.goalName}`}
      />

      {/* View switcher */}
      <div className="flex-1 min-h-0">
        {view === 'explorer' ? (
          <CategoryGoalExplorer onEnterGoal={enterGoal} />
        ) : activeCategory && activeGoal ? (
          <GoalCommandCenter
            category={activeCategory}
            goal={activeGoal}
            onBack={() => setView('explorer')}
          />
        ) : null}
      </div>
    </div>
  );
}

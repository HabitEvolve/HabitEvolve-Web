import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, ChevronRight, ArrowLeft, X, Loader2,
  Zap, ToggleLeft, ToggleRight,
  ShieldCheck, Link as LinkIcon, CheckCircle, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import { adminGoalApi } from '../api/adminGoalApi';
import { adminPracticalTaskApi } from '../api/adminPracticalTaskApi';
import { adminRecommendationRuleApi } from '../api/adminRecommendationRuleApi';
import SkyCard from '../components/ui/card/SkyCard';
import SkyButton from '../components/ui/button/SkyButton';
import {
  GoalCategoryDto, GoalCategoryPayload,
  GoalDto, GoalPayload, MeasurementType,
  AdminTaskTemplateDto, PracticalTaskPayload,
  RecommendationRuleDto, RecommendationRuleConditionDto,
  CreateRulePayload, UpdateRulePayload_Rec,
  AddConditionPayload, RuleMatchMode, ConditionOperator,
  QuestionnaireTemplateDto, GoalQuestionnaireDto,
} from '../types/adminGoal.types';

// ─── Shared style helpers ─────────────────────────────────────────────────────
const inputCls = [
  'w-full px-3 py-2 rounded-sky-chip border border-sky-surf-border bg-white',
  'text-sky-ink text-sm font-medium',
  'focus:outline-none focus:border-sky-deep focus:ring-3 focus:ring-sky-deep/20',
  'placeholder:text-sky-ink-3',
].join(' ');

const VERIFICATION_TYPES = ['SELF_CHECK', 'PHOTO', 'VIDEO', 'TEXT_LOG', 'SCREENSHOT', 'TIMER', 'GPS', 'STEP_COUNTER'];
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
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-error-500 shrink-0" />
            <h3 className="text-lg font-bold text-error-700">{title}</h3>
          </div>
          <p className="text-sm text-sky-ink-2 mb-6">{body}</p>
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
function CategoryFormModal({ editing, onSave, onClose }: {
  editing: GoalCategoryDto | null;
  onSave(payload: GoalCategoryPayload): Promise<void>;
  onClose(): void;
}) {
  const [code, setCode] = useState(editing?.categoryCode ?? '');
  const [name, setName] = useState(editing?.categoryName ?? '');
  const [desc, setDesc] = useState(editing?.description ?? '');
  const [icon, setIcon] = useState(editing?.iconCode ?? '');
  const [order, setOrder] = useState(editing?.displayOrder ?? 1);
  const [active, setActive] = useState(editing?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) { setErr('Code and name are required.'); return; }
    setSaving(true); setErr('');
    try { await onSave({ categoryCode: code.trim().toUpperCase(), categoryName: name.trim(), description: desc.trim() || undefined, iconCode: icon.trim() || undefined, displayOrder: order, isActive: active }); }
    catch (ex: any) { setErr(ex?.response?.data?.message ?? 'Save failed.'); }
    finally { setSaving(false); }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-sky-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <SkyCard variant="admin" className="modal-content p-0 overflow-hidden w-full max-w-md">
          <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-warning-50">
            <h2 className="font-bold text-lg text-sky-ink">{editing ? 'Edit Category' : 'New Category'}</h2>
            <SkyButton type="button" variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></SkyButton>
          </div>
          <form onSubmit={submit} className="p-5 space-y-3">
            {err && <p className="text-xs text-error-600 font-bold bg-error-50 rounded-sky-chip px-3 py-2">{err}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-sky-ink-2 mb-1">Code *</label>
                <input value={code} onChange={e => setCode(e.target.value)} className={inputCls} placeholder="HEALTH" disabled={!!editing} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-sky-ink-2 mb-1">Display Order</label>
                <input type="number" min={1} value={order} onChange={e => setOrder(Number(e.target.value))} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-sky-ink-2 mb-1">Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Health & Wellness" required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-sky-ink-2 mb-1">Description</label>
              <input value={desc} onChange={e => setDesc(e.target.value)} className={inputCls} placeholder="Optional description" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-sky-ink-2 mb-1">Icon Code (emoji/slug)</label>
              <input value={icon} onChange={e => setIcon(e.target.value)} className={inputCls} placeholder="🏃 or health-icon" />
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="w-4 h-4 accent-sky-deep" />
              <span className="text-sm font-semibold text-sky-ink-2">Active (visible to players)</span>
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
          <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-success-50">
            <h2 className="font-bold text-lg text-sky-ink">{editing ? 'Edit Goal' : 'New Goal'}</h2>
            <SkyButton type="button" variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></SkyButton>
          </div>
          <form onSubmit={submit} className="p-5 space-y-3">
            {err && <p className="text-xs text-error-600 font-bold bg-error-50 rounded-sky-chip px-3 py-2">{err}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-sky-ink-2 mb-1">Code *</label>
                <input value={code} onChange={e => setCode(e.target.value)} className={inputCls} placeholder="DRINK_WATER" disabled={!!editing} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-sky-ink-2 mb-1">Display Order</label>
                <input type="number" min={1} value={order} onChange={e => setOrder(Number(e.target.value))} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-sky-ink-2 mb-1">Goal Name *</label>
              <input value={gname} onChange={e => setGname(e.target.value)} className={inputCls} placeholder="Drink 2L of water daily" required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-sky-ink-2 mb-1">Description</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className={inputCls} placeholder="Optional description" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-sky-ink-2 mb-1">Measurement Type</label>
              <select value={mtype} onChange={e => setMtype(e.target.value as MeasurementType)} className={inputCls}>
                {MEASUREMENT_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="w-4 h-4 accent-success-500" />
              <span className="text-sm font-semibold text-sky-ink-2">Active</span>
            </label>
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
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setErr('Title is required.'); return; }
    setSaving(true); setErr('');
    try { await onSave({ goalId, title: title.trim(), description: desc.trim() || undefined, verificationType: vtype, isActive: active }); }
    catch (ex: any) { setErr(ex?.response?.data?.message ?? 'Save failed.'); }
    finally { setSaving(false); }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-sky-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <SkyCard variant="admin" className="modal-content p-0 overflow-hidden w-full max-w-md">
          <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-purple-50">
            <h2 className="font-bold text-lg text-sky-ink">{editing ? 'Edit Task' : 'New Practical Task'}</h2>
            <SkyButton type="button" variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></SkyButton>
          </div>
          <form onSubmit={submit} className="p-5 space-y-3">
            {err && <p className="text-xs text-error-600 font-bold bg-error-50 rounded-sky-chip px-3 py-2">{err}</p>}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-sky-ink-2 mb-1">Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Log water intake daily" required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-sky-ink-2 mb-1">Description</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-sky-ink-2 mb-1">Verification Type</label>
              <select value={vtype} onChange={e => setVtype(e.target.value)} className={inputCls}>
                {VERIFICATION_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="w-4 h-4 accent-purple-500" />
              <span className="text-sm font-semibold text-sky-ink-2">Active</span>
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
          <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-blue-50">
            <h2 className="font-bold text-lg text-sky-ink">{editing ? 'Edit Rule' : 'New Rule'}</h2>
            <SkyButton type="button" variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></SkyButton>
          </div>
          <form onSubmit={submit} className="p-5 space-y-3">
            {err && <p className="text-xs text-error-600 font-bold bg-error-50 rounded-sky-chip px-3 py-2">{err}</p>}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-sky-ink-2 mb-1">Rule Name *</label>
              <input value={rname} onChange={e => setRname(e.target.value)} className={inputCls} placeholder="e.g. Poor sleeper — under 6 hours" required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-sky-ink-2 mb-1">Description</label>
              <input value={desc} onChange={e => setDesc(e.target.value)} className={inputCls} placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-sky-ink-2 mb-1">Priority (lower = first)</label>
                <input type="number" min={0} value={priority} onChange={e => setPriority(Number(e.target.value))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-sky-ink-2 mb-1">Match Mode</label>
                <select value={matchMode} onChange={e => setMatchMode(e.target.value as RuleMatchMode)} className={inputCls}>
                  {MATCH_MODES.map(m => <option key={m} value={m}>{m === 'AllConditions' ? 'ALL (AND)' : 'ANY (OR)'}</option>)}
                </select>
              </div>
            </div>
            {!editing && (
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="w-4 h-4 accent-blue-500" />
                <span className="text-sm font-semibold text-sky-ink-2">Active</span>
              </label>
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
          <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-blue-50">
            <h2 className="font-bold text-lg text-sky-ink">{editing ? 'Edit Condition' : 'Add Condition'}</h2>
            <SkyButton type="button" variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></SkyButton>
          </div>
          <form onSubmit={submit} className="p-5 space-y-3">
            {err && <p className="text-xs text-error-600 font-bold bg-error-50 rounded-sky-chip px-3 py-2">{err}</p>}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-sky-ink-2 mb-1">Question ID *</label>
              <input type="number" value={questionId} onChange={e => setQuestionId(e.target.value)} className={inputCls} placeholder="Question ID from the Questionnaire Builder" required />
              <p className="text-[10px] text-sky-ink-3 mt-1">Find IDs in the Questionnaire Builder page.</p>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-sky-ink-2 mb-1">Operator</label>
              <select value={operator} onChange={e => setOperator(e.target.value as ConditionOperator)} className={inputCls}>
                {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-sky-ink-2 mb-1">Value *</label>
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
          <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-warning-50">
            <h2 className="font-bold text-lg text-sky-ink">Attach Questionnaire</h2>
            <SkyButton type="button" variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></SkyButton>
          </div>
          <div className="p-5 space-y-4">
            {err && <p className="text-xs text-error-600 font-bold bg-error-50 rounded-sky-chip px-3 py-2">{err}</p>}
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
                    className={`w-full text-left px-4 py-3 rounded-sky-chip transition-all ${selected === tpl.templateId ? 'ring-2 ring-warning-400 bg-warning-50' : 'bg-white border border-sky-surf-border hover:bg-warning-50/60'}`}
                  >
                    <p className="font-bold text-sm text-sky-ink">{tpl.templateName}</p>
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
        <p className="text-sm font-bold text-sky-ink-3">{tasks.length} task template{tasks.length !== 1 ? 's' : ''} for this goal</p>
        <SkyButton type="button" variant="secondary" size="sm" onClick={() => setTaskModal({ editing: null })}>
          <Plus className="w-4 h-4" /> Add Task
        </SkyButton>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 justify-center py-10 text-sky-ink-3"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-sky-ink/15 rounded-sky-card text-sky-ink-3">
          <Zap className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="font-bold">No tasks yet</p>
          <p className="text-sm">Add practical task templates for this goal.</p>
        </div>
      ) : (
        <SkyCard variant="admin" className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-purple-50">
                {['#', 'Title', 'Verification', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-sky-ink-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((t, i) => (
                <tr key={t.taskId} className="sky-table-row">
                  <td className="px-4 py-3 text-xs font-bold text-sky-ink-3">{i + 1}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="font-bold text-sky-ink truncate">{t.title}</p>
                    {t.description && <p className="text-xs text-sky-ink-3 truncate">{t.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{t.verificationType}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.isActive ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-500'}`}>
                      {t.isActive ? 'Active' : 'Off'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <SkyButton type="button" variant="ghost" size="icon" onClick={() => setTaskModal({ editing: t })} className="w-8 h-8"><Pencil className="w-4 h-4" /></SkyButton>
                      <SkyButton type="button" variant="ghost" size="icon" onClick={() => setDelTask(t)} className="w-8 h-8 text-error-500 hover:bg-error-50"><Trash2 className="w-4 h-4" /></SkyButton>
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
        <p className="text-sm font-bold text-sky-ink-3">{rules.length} rule{rules.length !== 1 ? 's' : ''} — sorted by priority</p>
        <SkyButton type="button" variant="secondary" size="sm" onClick={() => setRuleModal({ editing: null })}>
          <Plus className="w-4 h-4" /> Add Rule
        </SkyButton>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 justify-center py-10 text-sky-ink-3"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
      ) : rules.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-sky-ink/15 rounded-sky-card text-sky-ink-3">
          <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="font-bold">No rules yet</p>
          <p className="text-sm">Rules decide which tasks to recommend based on player answers.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <SkyCard key={rule.ruleId} variant="admin" className="p-0 overflow-hidden">
              {/* Rule header row */}
              <div className="flex items-start gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">P{rule.priority}</span>
                    <p className="font-bold text-sm text-sky-ink">{rule.ruleName}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rule.matchMode === 'AllConditions' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {rule.matchMode === 'AllConditions' ? 'AND' : 'OR'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rule.isActive ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-500'}`}>
                      {rule.isActive ? 'Active' : 'Off'}
                    </span>
                  </div>
                  {rule.description && <p className="text-xs text-sky-ink-3 mt-1">{rule.description}</p>}
                  <p className="text-[10px] text-sky-ink-3 mt-1">{rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <SkyButton type="button" variant="ghost" size="icon" onClick={() => setExpandedRule(expandedRule === rule.ruleId ? null : rule.ruleId)} title="Conditions" className="w-8 h-8">
                    <img src="/icon/Item/Book/64px/Blue Book 1st 64px.png" alt="" className="w-4 h-4 object-contain" />
                  </SkyButton>
                  <SkyButton type="button" variant="ghost" size="icon" onClick={() => handleToggleRule(rule)} className="w-8 h-8">
                    {rule.isActive ? <ToggleRight className="w-4 h-4 text-success-600" /> : <ToggleLeft className="w-4 h-4 text-sky-ink-3" />}
                  </SkyButton>
                  <SkyButton type="button" variant="ghost" size="icon" onClick={() => setRuleModal({ editing: rule })} className="w-8 h-8"><Pencil className="w-4 h-4" /></SkyButton>
                  <SkyButton type="button" variant="ghost" size="icon" onClick={() => setDelRule(rule)} className="w-8 h-8 text-error-500 hover:bg-error-50"><Trash2 className="w-4 h-4" /></SkyButton>
                </div>
              </div>

              {/* Conditions panel */}
              {expandedRule === rule.ruleId && (
                <div className="border-t border-gray-200 bg-blue-50/40 px-4 pb-4">
                  <div className="flex items-center justify-between pt-3 mb-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">Conditions</p>
                    <SkyButton type="button" variant="secondary" size="sm" onClick={() => setCondModal({ ruleId: rule.ruleId, editing: null })}>
                      <Plus className="w-3 h-3" /> Add Condition
                    </SkyButton>
                  </div>
                  {rule.conditions.length === 0 ? (
                    <p className="text-xs text-sky-ink-3 italic py-2 text-center border border-dashed border-sky-ink/15 rounded-sky-chip">No conditions — rule matches all players.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {rule.conditions.map(c => (
                        <div key={c.conditionId} className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 rounded-sky-chip">
                          <span className="text-xs font-mono font-bold text-sky-ink-2 shrink-0">Q#{c.questionId}</span>
                          <span className="text-xs font-bold text-blue-600 shrink-0">{c.operator}</span>
                          <span className="text-xs font-mono bg-gray-100 text-sky-ink-2 px-2 py-0.5 rounded-md flex-1 min-w-0 truncate">{c.conditionValue ?? '—'}</span>
                          <SkyButton type="button" variant="ghost" size="icon" onClick={() => setCondModal({ ruleId: rule.ruleId, editing: c })} className="w-6 h-6"><Pencil className="w-3 h-3" /></SkyButton>
                          <SkyButton type="button" variant="ghost" size="icon" onClick={() => setDelCond({ rule, cond: c })} className="w-6 h-6 text-error-500 hover:bg-error-50"><Trash2 className="w-3 h-3" /></SkyButton>
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-sky-ink-3">{bindings.length} bound questionnaire{bindings.length !== 1 ? 's' : ''}</p>
        <SkyButton type="button" variant="secondary" size="sm" onClick={() => setBindModal(true)}>
          <LinkIcon className="w-4 h-4" /> Attach Template
        </SkyButton>
      </div>
      {actionErr && (
        <p className="text-xs font-bold text-error-600 bg-error-50 rounded-sky-chip px-3 py-2">{actionErr}</p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 justify-center py-10 text-sky-ink-3"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
      ) : bindings.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-sky-ink/15 rounded-sky-card text-sky-ink-3">
          <img src="/icon/Item/Scroll/64px/Golden Scroll 1st 64px.png" alt="" className="w-10 h-10 mx-auto mb-2 object-contain opacity-40" />
          <p className="font-bold">No questionnaires attached</p>
          <p className="text-sm">Players can't start Goal Wizard until a questionnaire is active.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bindings.map(b => (
            <SkyCard key={b.goalQuestionnaireId} variant="admin" className={`flex items-center gap-4 ${b.isActive ? 'ring-2 ring-warning-400 bg-warning-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm text-sky-ink">{b.templateName ?? `Template #${b.templateId}`}</p>
                  {b.isActive && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-warning-200 text-warning-800 px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-sky-ink-3 mt-0.5">Effective from: {new Date(b.effectiveFrom).toLocaleDateString()}</p>
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
            </SkyCard>
          ))}
        </div>
      )}

      {bindModal && <BindQuestionnaireModal goalId={goal.goalId} onBound={() => { setBindModal(false); loadBindings(); }} onClose={() => setBindModal(false)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 2 — GOAL COMMAND CENTER
// ═══════════════════════════════════════════════════════════════════════════════
type CommandTab = 'tasks' | 'rules' | 'questionnaires';

const TABS: { id: CommandTab; label: string; icon: React.ReactNode; cls: string }[] = [
  { id: 'tasks',          label: 'Practical Tasks',       icon: <Zap className="w-4 h-4" />,          cls: 'bg-purple-200 text-sky-ink' },
  { id: 'rules',          label: 'Recommendation Rules',  icon: <ShieldCheck className="w-4 h-4" />,   cls: 'bg-blue-200 text-sky-ink' },
  { id: 'questionnaires', label: 'Questionnaires',         icon: <img src="/icon/Item/Scroll/64px/Golden Scroll 1st 64px.png" alt="" className="w-4 h-4 object-contain" />, cls: 'bg-warning-200 text-sky-ink' },
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
        <ChevronRight className="w-4 h-4 text-sky-ink-3" />
        <span className="text-sm font-bold text-sky-ink-3">{category.categoryName}</span>
        <ChevronRight className="w-4 h-4 text-sky-ink-3" />
        <span className="text-sm font-bold text-sky-ink">{goal.goalName}</span>
        <span className={`ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${goal.isActive ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-500'}`}>
          {goal.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Goal info banner */}
      <div className="flex items-center gap-4 px-4 py-3 bg-success-50 rounded-sky-card">
        <div className="w-10 h-10 rounded-sky-chip bg-success-100 flex items-center justify-center shrink-0">
          <img src="/icon/Main/Stats/64px/Stats 1st 64px.png" alt="" className="w-5 h-5 object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sky-ink">{goal.goalName}</p>
          <p className="text-xs text-sky-ink-3">{goal.goalCode} · {goal.measurementType}</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-sky-chip font-bold text-sm transition-all ${tab === t.id ? t.cls : 'bg-white border border-sky-surf-border text-sky-ink-3 hover:bg-gray-50'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <SkyCard variant="admin" className="flex-1 overflow-y-auto">
        {tab === 'tasks'          && <PracticalTasksTab      goal={goal} />}
        {tab === 'rules'          && <RecommendationRulesTab goal={goal} />}
        {tab === 'questionnaires' && <QuestionnairesTab      goal={goal} />}
      </SkyCard>
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
  const [goals, setGoals] = useState<GoalDto[]>([]);
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
            <h2 className="font-bold text-sky-ink">Categories</h2>
            <SkyButton type="button" variant="secondary" size="sm" onClick={() => setCatModal({ editing: null })}>
              <Plus className="w-3 h-3" /> New
            </SkyButton>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 -mr-1 pr-1">
            {catLoading ? (
              <div className="flex items-center justify-center py-8 text-sky-ink-3"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8 text-sky-ink-3 text-sm">No categories yet</div>
            ) : categories.map(cat => (
              <div
                key={cat.categoryId}
                onClick={() => setSelectedCat(cat)}
                className={`cursor-pointer rounded-sky-chip p-3 transition-all ${selectedCat?.categoryId === cat.categoryId ? 'ring-2 ring-warning-400 bg-warning-50' : 'bg-gray-50 border border-sky-surf-border hover:bg-warning-50/50'}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {cat.iconCode && <span className="text-lg shrink-0">{cat.iconCode}</span>}
                    <p className="font-bold text-sm text-sky-ink truncate">{cat.categoryName}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cat.isActive ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-500'}`}>
                    {cat.isActive ? '●' : '○'}
                  </span>
                </div>
                <p className="text-[10px] text-sky-ink-3 font-mono mt-1">{cat.categoryCode}</p>
                <div className="flex items-center gap-1 mt-2" onClick={e => e.stopPropagation()}>
                  <SkyButton type="button" variant="ghost" size="icon" onClick={() => handleToggleCat(cat)} className="w-6 h-6">
                    {cat.isActive ? <ToggleRight className="w-3.5 h-3.5 text-success-600" /> : <ToggleLeft className="w-3.5 h-3.5 text-sky-ink-3" />}
                  </SkyButton>
                  <SkyButton type="button" variant="ghost" size="icon" onClick={() => setCatModal({ editing: cat })} className="w-6 h-6"><Pencil className="w-3.5 h-3.5" /></SkyButton>
                  <SkyButton type="button" variant="ghost" size="icon" onClick={() => setDelCat(cat)} className="w-6 h-6 text-error-500 hover:bg-error-50"><Trash2 className="w-3.5 h-3.5" /></SkyButton>
                </div>
              </div>
            ))}
          </div>
        </SkyCard>

        {/* Right: Goals */}
        <SkyCard variant="admin" className="flex-1 flex flex-col gap-3 overflow-hidden">
          {!selectedCat ? (
            <div className="flex-1 flex flex-col items-center justify-center text-sky-ink-3">
              <img src="/icon/Main/Stats/64px/Stats 1st 64px.png" alt="" className="w-16 h-16 object-contain opacity-20 mb-4" />
              <p className="font-bold text-lg text-sky-ink-2">Select a Category</p>
              <p className="text-sm">Choose a category on the left to view and manage its goals.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between shrink-0">
                <div>
                  <h2 className="font-bold text-sky-ink">{selectedCat.categoryName}</h2>
                  <p className="text-xs text-sky-ink-3">{goals.length} goal{goals.length !== 1 ? 's' : ''}</p>
                </div>
                <SkyButton type="button" variant="success" size="sm" onClick={() => setGoalModal({ editing: null })}>
                  <Plus className="w-3 h-3" /> New Goal
                </SkyButton>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 -mr-1 pr-1">
                {goalLoading ? (
                  <div className="flex items-center justify-center py-10 text-sky-ink-3"><Loader2 className="w-5 h-5 animate-spin" /></div>
                ) : goals.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-sky-ink/15 rounded-sky-card text-sky-ink-3">
                    <img src="/icon/Main/Stats/64px/Stats 1st 64px.png" alt="" className="w-10 h-10 mx-auto mb-2 object-contain opacity-40" />
                    <p className="font-bold">No goals in this category</p>
                    <p className="text-sm">Add the first goal using the button above.</p>
                  </div>
                ) : goals.map(goal => (
                  <div key={goal.goalId} className="rounded-sky-chip p-4 bg-white border border-sky-surf-border shadow-sky-tint hover:bg-gray-50/60 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm text-sky-ink">{goal.goalName}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${goal.isActive ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-500'}`}>
                            {goal.isActive ? 'Active' : 'Off'}
                          </span>
                        </div>
                        <p className="text-[10px] text-sky-ink-3 font-mono mt-0.5">{goal.goalCode} · {goal.measurementType}</p>
                        {goal.description && <p className="text-xs text-sky-ink-3 mt-1 line-clamp-1">{goal.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <SkyButton type="button" variant="secondary" size="sm" onClick={() => setGoalModal({ editing: goal })}><Pencil className="w-3 h-3" /> Edit</SkyButton>
                      <SkyButton type="button" variant="secondary" size="sm" onClick={() => setDelGoal(goal)} className="text-error-600"><Trash2 className="w-3 h-3" /></SkyButton>
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
      {catModal  !== null && <CategoryFormModal editing={catModal.editing} onSave={handleSaveCat} onClose={() => setCatModal(null)} />}
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
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-sky-chip bg-success-100 flex items-center justify-center shrink-0">
          <img src="/icon/Main/Stats/64px/Stats 1st 64px.png" alt="" className="w-6 h-6 object-contain" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-sky-ink">Goal Engine Hub</h1>
          <p className="text-sm text-sky-ink-2">
            {view === 'explorer' ? 'Category → Goal explorer' : `Configuring: ${activeGoal?.goalName}`}
          </p>
        </div>
      </div>

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

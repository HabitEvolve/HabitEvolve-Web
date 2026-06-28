import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Layers, Plus, Pencil, Trash2, ChevronRight, ArrowLeft, X, Loader2,
  Zap, ClipboardList, BookOpen, ToggleLeft, ToggleRight,
  ShieldCheck, Link as LinkIcon, CheckCircle, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { adminGoalApi } from '../api/adminGoalApi';
import { adminPracticalTaskApi } from '../api/adminPracticalTaskApi';
import { adminRecommendationRuleApi } from '../api/adminRecommendationRuleApi';
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
const inputCls = 'w-full px-3 py-2 rounded-xl border-2 border-black bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-gray-600 dark:placeholder:text-gray-500';
const btnBase = 'inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-black font-black text-sm transition-all shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none';

const VERIFICATION_TYPES = ['SELF_CHECK', 'PHOTO', 'VIDEO', 'TEXT_LOG', 'SCREENSHOT', 'TIMER', 'STEP_COUNTER'];
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
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="modal-content bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] w-full max-w-sm p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <h3 className="text-lg font-black text-red-700 dark:text-red-400">{title}</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{body}</p>
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
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="modal-content bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] w-full max-w-md">
          <div className="flex items-center justify-between p-5 border-b-2 border-black dark:border-white/10 bg-amber-100 dark:bg-amber-900/30 rounded-t-3xl">
            <h2 className="font-black text-lg dark:text-gray-100">{editing ? 'Edit Category' : 'New Category'}</h2>
            <button onClick={onClose} className="p-1 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={submit} className="p-5 space-y-3">
            {err && <p className="text-xs text-red-600 font-bold bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl px-3 py-2">{err}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Code *</label>
                <input value={code} onChange={e => setCode(e.target.value)} className={inputCls} placeholder="HEALTH" disabled={!!editing} />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Display Order</label>
                <input type="number" min={1} value={order} onChange={e => setOrder(Number(e.target.value))} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Health & Wellness" required />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Description</label>
              <input value={desc} onChange={e => setDesc(e.target.value)} className={inputCls} placeholder="Optional description" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Icon Code (emoji/slug)</label>
              <input value={icon} onChange={e => setIcon(e.target.value)} className={inputCls} placeholder="🏃 or health-icon" />
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="w-4 h-4 accent-amber-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Active (visible to players)</span>
            </label>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>Cancel</button>
              <button type="submit" disabled={saving} className={`${btnBase} flex-1 justify-center bg-amber-300 dark:bg-amber-600 text-gray-900 dark:text-white`}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {editing ? 'Save' : 'Create'}
              </button>
            </div>
          </form>
        </div>
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
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="modal-content bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] w-full max-w-lg">
          <div className="flex items-center justify-between p-5 border-b-2 border-black dark:border-white/10 bg-emerald-100 dark:bg-emerald-900/30 rounded-t-3xl">
            <h2 className="font-black text-lg dark:text-gray-100">{editing ? 'Edit Goal' : 'New Goal'}</h2>
            <button onClick={onClose} className="p-1 hover:bg-emerald-200 dark:hover:bg-emerald-800 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={submit} className="p-5 space-y-3">
            {err && <p className="text-xs text-red-600 font-bold bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl px-3 py-2">{err}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Code *</label>
                <input value={code} onChange={e => setCode(e.target.value)} className={inputCls} placeholder="DRINK_WATER" disabled={!!editing} />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Display Order</label>
                <input type="number" min={1} value={order} onChange={e => setOrder(Number(e.target.value))} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Goal Name *</label>
              <input value={gname} onChange={e => setGname(e.target.value)} className={inputCls} placeholder="Drink 2L of water daily" required />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Description</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className={inputCls} placeholder="Optional description" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Measurement Type</label>
              <select value={mtype} onChange={e => setMtype(e.target.value as MeasurementType)} className={inputCls}>
                {MEASUREMENT_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Active</span>
            </label>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>Cancel</button>
              <button type="submit" disabled={saving} className={`${btnBase} flex-1 justify-center bg-emerald-300 dark:bg-emerald-700 text-gray-900 dark:text-white`}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {editing ? 'Save' : 'Create'}
              </button>
            </div>
          </form>
        </div>
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
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="modal-content bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] w-full max-w-md">
          <div className="flex items-center justify-between p-5 border-b-2 border-black dark:border-white/10 bg-violet-100 dark:bg-violet-900/30 rounded-t-3xl">
            <h2 className="font-black text-lg dark:text-gray-100">{editing ? 'Edit Task' : 'New Practical Task'}</h2>
            <button onClick={onClose} className="p-1 hover:bg-violet-200 dark:hover:bg-violet-800 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={submit} className="p-5 space-y-3">
            {err && <p className="text-xs text-red-600 font-bold bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl px-3 py-2">{err}</p>}
            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Log water intake daily" required />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Description</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Verification Type</label>
              <select value={vtype} onChange={e => setVtype(e.target.value)} className={inputCls}>
                {VERIFICATION_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="w-4 h-4 accent-violet-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Active</span>
            </label>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>Cancel</button>
              <button type="submit" disabled={saving} className={`${btnBase} flex-1 justify-center bg-violet-300 dark:bg-violet-700 text-gray-900 dark:text-white`}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {editing ? 'Save' : 'Create'}
              </button>
            </div>
          </form>
        </div>
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
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="modal-content bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] w-full max-w-md">
          <div className="flex items-center justify-between p-5 border-b-2 border-black dark:border-white/10 bg-blue-100 dark:bg-blue-900/30 rounded-t-3xl">
            <h2 className="font-black text-lg dark:text-gray-100">{editing ? 'Edit Rule' : 'New Rule'}</h2>
            <button onClick={onClose} className="p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={submit} className="p-5 space-y-3">
            {err && <p className="text-xs text-red-600 font-bold bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl px-3 py-2">{err}</p>}
            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Rule Name *</label>
              <input value={rname} onChange={e => setRname(e.target.value)} className={inputCls} placeholder="e.g. Poor sleeper — under 6 hours" required />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Description</label>
              <input value={desc} onChange={e => setDesc(e.target.value)} className={inputCls} placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Priority (lower = first)</label>
                <input type="number" min={0} value={priority} onChange={e => setPriority(Number(e.target.value))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Match Mode</label>
                <select value={matchMode} onChange={e => setMatchMode(e.target.value as RuleMatchMode)} className={inputCls}>
                  {MATCH_MODES.map(m => <option key={m} value={m}>{m === 'AllConditions' ? 'ALL (AND)' : 'ANY (OR)'}</option>)}
                </select>
              </div>
            </div>
            {!editing && (
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="w-4 h-4 accent-blue-500" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Active</span>
              </label>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>Cancel</button>
              <button type="submit" disabled={saving} className={`${btnBase} flex-1 justify-center bg-blue-300 dark:bg-blue-700 text-gray-900 dark:text-white`}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {editing ? 'Save' : 'Create'}
              </button>
            </div>
          </form>
        </div>
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
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="modal-content bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] w-full max-w-sm">
          <div className="flex items-center justify-between p-5 border-b-2 border-black dark:border-white/10 bg-indigo-100 dark:bg-indigo-900/30 rounded-t-3xl">
            <h2 className="font-black text-lg dark:text-gray-100">{editing ? 'Edit Condition' : 'Add Condition'}</h2>
            <button onClick={onClose} className="p-1 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={submit} className="p-5 space-y-3">
            {err && <p className="text-xs text-red-600 font-bold bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl px-3 py-2">{err}</p>}
            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Question ID *</label>
              <input type="number" value={questionId} onChange={e => setQuestionId(e.target.value)} className={inputCls} placeholder="Question ID from the Questionnaire Builder" required />
              <p className="text-[10px] text-gray-400 mt-1">Find IDs in the Questionnaire Builder page.</p>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Operator</label>
              <select value={operator} onChange={e => setOperator(e.target.value as ConditionOperator)} className={inputCls}>
                {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">Value *</label>
              <input value={condValue} onChange={e => setCondValue(e.target.value)} className={inputCls} placeholder='e.g. "LOW" or "6"' required />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>Cancel</button>
              <button type="submit" disabled={saving} className={`${btnBase} flex-1 justify-center bg-indigo-300 dark:bg-indigo-700 text-gray-900 dark:text-white`}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {editing ? 'Save' : 'Add'}
              </button>
            </div>
          </form>
        </div>
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
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="modal-content bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] w-full max-w-md">
          <div className="flex items-center justify-between p-5 border-b-2 border-black dark:border-white/10 bg-orange-100 dark:bg-orange-900/30 rounded-t-3xl">
            <h2 className="font-black text-lg dark:text-gray-100">Attach Questionnaire</h2>
            <button onClick={onClose} className="p-1 hover:bg-orange-200 dark:hover:bg-orange-800 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-5 space-y-4">
            {err && <p className="text-xs text-red-600 font-bold bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl px-3 py-2">{err}</p>}
            {loading ? (
              <div className="flex items-center gap-2 text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading templates…</div>
            ) : templates.length === 0 ? (
              <p className="text-sm text-gray-500">No active templates found. Create one in the Questionnaire Builder.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {templates.map(tpl => (
                  <button
                    key={tpl.templateId}
                    type="button"
                    onClick={() => setSelected(tpl.templateId)}
                    className={`w-full text-left px-4 py-3 rounded-2xl border-2 transition-all ${selected === tpl.templateId ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-black bg-white dark:bg-gray-800 hover:bg-orange-50/60 dark:hover:bg-orange-900/10'}`}
                  >
                    <p className="font-black text-sm text-gray-900 dark:text-gray-100">{tpl.templateName}</p>
                    {tpl.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tpl.description}</p>}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>Cancel</button>
              <button onClick={submit} disabled={saving || !selected} className={`${btnBase} flex-1 justify-center bg-orange-300 dark:bg-orange-700 text-gray-900 dark:text-white`}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />} Attach
              </button>
            </div>
          </div>
        </div>
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
        <p className="text-sm font-bold text-gray-600 dark:text-gray-400">{tasks.length} task template{tasks.length !== 1 ? 's' : ''} for this goal</p>
        <button onClick={() => setTaskModal({ editing: null })} className={`${btnBase} bg-violet-200 dark:bg-violet-800 text-violet-900 dark:text-violet-100 py-1.5`}>
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 justify-center py-10 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-gray-400">
          <Zap className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="font-bold">No tasks yet</p>
          <p className="text-sm">Add practical task templates for this goal.</p>
        </div>
      ) : (
        <div className="border-2 border-black dark:border-gray-600 rounded-2xl overflow-hidden shadow-[4px_4px_0_0_#1A1D20]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-white/10 bg-violet-50 dark:bg-violet-900/20">
                {['#', 'Title', 'Verification', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {tasks.map((t, i) => (
                <tr key={t.taskId} className="hover:bg-violet-50/40 dark:hover:bg-violet-900/10 transition-colors">
                  <td className="px-4 py-3 text-xs font-black text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="font-bold text-gray-800 dark:text-gray-100 truncate">{t.title}</p>
                    {t.description && <p className="text-xs text-gray-400 truncate">{t.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-black bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full border border-violet-200 dark:border-violet-700">{t.verificationType}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${t.isActive ? 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300' : 'bg-gray-100 border-gray-300 text-gray-500'}`}>
                      {t.isActive ? 'Active' : 'Off'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setTaskModal({ editing: t })} className="p-1.5 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-lg text-gray-400"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setDelTask(t)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
        <p className="text-sm font-bold text-gray-600 dark:text-gray-400">{rules.length} rule{rules.length !== 1 ? 's' : ''} — sorted by priority</p>
        <button onClick={() => setRuleModal({ editing: null })} className={`${btnBase} bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 py-1.5`}>
          <Plus className="w-4 h-4" /> Add Rule
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 justify-center py-10 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
      ) : rules.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-gray-400">
          <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="font-bold">No rules yet</p>
          <p className="text-sm">Rules decide which tasks to recommend based on player answers.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <div key={rule.ruleId} className="border-2 border-black dark:border-gray-600 rounded-2xl overflow-hidden shadow-[3px_3px_0_0_#1A1D20]">
              {/* Rule header row */}
              <div className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-700">P{rule.priority}</span>
                    <p className="font-black text-sm text-gray-900 dark:text-gray-100">{rule.ruleName}</p>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${rule.matchMode === 'AllConditions' ? 'bg-indigo-100 border-indigo-300 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-300' : 'bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-300'}`}>
                      {rule.matchMode === 'AllConditions' ? 'AND' : 'OR'}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${rule.isActive ? 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300' : 'bg-gray-100 border-gray-300 text-gray-500'}`}>
                      {rule.isActive ? 'Active' : 'Off'}
                    </span>
                  </div>
                  {rule.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{rule.description}</p>}
                  <p className="text-[10px] text-gray-400 mt-1">{rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setExpandedRule(expandedRule === rule.ruleId ? null : rule.ruleId)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400" title="Conditions">
                    <BookOpen className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleToggleRule(rule)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400">
                    {rule.isActive ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                  </button>
                  <button onClick={() => setRuleModal({ editing: rule })} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-gray-400"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => setDelRule(rule)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Conditions panel */}
              {expandedRule === rule.ruleId && (
                <div className="border-t-2 border-gray-100 dark:border-gray-700 bg-indigo-50/40 dark:bg-indigo-900/5 px-4 pb-4">
                  <div className="flex items-center justify-between pt-3 mb-2">
                    <p className="text-[11px] font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-400">Conditions</p>
                    <button onClick={() => setCondModal({ ruleId: rule.ruleId, editing: null })} className={`${btnBase} bg-indigo-200 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-100 py-1 px-3 text-xs`}>
                      <Plus className="w-3 h-3" /> Add Condition
                    </button>
                  </div>
                  {rule.conditions.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">No conditions — rule matches all players.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {rule.conditions.map(c => (
                        <div key={c.conditionId} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl">
                          <span className="text-xs font-mono font-bold text-gray-600 dark:text-gray-300 shrink-0">Q#{c.questionId}</span>
                          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 shrink-0">{c.operator}</span>
                          <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-lg flex-1 min-w-0 truncate">{c.conditionValue ?? '—'}</span>
                          <button onClick={() => setCondModal({ ruleId: rule.ruleId, editing: c })} className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded text-gray-400"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => setDelCond({ rule, cond: c })} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-400"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
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
        <p className="text-sm font-bold text-gray-600 dark:text-gray-400">{bindings.length} bound questionnaire{bindings.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setBindModal(true)} className={`${btnBase} bg-orange-200 dark:bg-orange-800 text-orange-900 dark:text-orange-100 py-1.5`}>
          <LinkIcon className="w-4 h-4" /> Attach Template
        </button>
      </div>
      {actionErr && (
        <p className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl px-3 py-2">{actionErr}</p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 justify-center py-10 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
      ) : bindings.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-gray-400">
          <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="font-bold">No questionnaires attached</p>
          <p className="text-sm">Players can't start Goal Wizard until a questionnaire is active.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bindings.map(b => (
            <div key={b.goalQuestionnaireId} className={`flex items-center gap-4 p-4 border-2 rounded-2xl shadow-[3px_3px_0_0_#1A1D20] ${b.isActive ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10' : 'border-black bg-white dark:bg-gray-800'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-black text-sm text-gray-900 dark:text-gray-100">{b.templateName ?? `Template #${b.templateId}`}</p>
                  {b.isActive && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black bg-orange-200 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 border border-orange-400 dark:border-orange-600 px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Effective from: {new Date(b.effectiveFrom).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => navigate(`/questionnaires?templateId=${b.templateId}`)}
                className={`${btnBase} bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-1.5`}
                title="View in Onboarding Eval"
              >
                <ExternalLink className="w-4 h-4" /> Detail
              </button>
              {b.isActive ? (
                <button
                  onClick={() => handleDeactivate(b)}
                  disabled={activating === b.goalQuestionnaireId}
                  className={`${btnBase} bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-1.5`}
                >
                  {activating === b.goalQuestionnaireId ? <Loader2 className="w-4 h-4 animate-spin" /> : <ToggleLeft className="w-4 h-4" />}
                  Deactivate
                </button>
              ) : (
                <button
                  onClick={() => handleActivate(b)}
                  disabled={activating === b.goalQuestionnaireId}
                  className={`${btnBase} bg-orange-300 dark:bg-orange-700 text-gray-900 dark:text-white py-1.5`}
                >
                  {activating === b.goalQuestionnaireId ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Activate
                </button>
              )}
            </div>
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

const TABS: { id: CommandTab; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'tasks',          label: 'Practical Tasks',       icon: <Zap className="w-4 h-4" />,          color: 'bg-violet-300 dark:bg-violet-700' },
  { id: 'rules',          label: 'Recommendation Rules',  icon: <ShieldCheck className="w-4 h-4" />,   color: 'bg-blue-300 dark:bg-blue-700' },
  { id: 'questionnaires', label: 'Questionnaires',         icon: <ClipboardList className="w-4 h-4" />, color: 'bg-orange-300 dark:bg-orange-700' },
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
        <button onClick={onBack} className={`${btnBase} bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-1.5 px-3 text-xs`}>
          <ArrowLeft className="w-3.5 h-3.5" /> Categories
        </button>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{category.categoryName}</span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-black text-gray-900 dark:text-gray-100">{goal.goalName}</span>
        <span className={`ml-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${goal.isActive ? 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300' : 'bg-gray-100 border-gray-300 text-gray-500'}`}>
          {goal.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Goal info banner */}
      <div className="flex items-center gap-4 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/10 border-2 border-emerald-300 dark:border-emerald-700 rounded-2xl">
        <div className="w-10 h-10 rounded-xl bg-emerald-300 border-2 border-black flex items-center justify-center shrink-0">
          <Layers className="w-5 h-5 text-gray-900" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-gray-900 dark:text-gray-100">{goal.goalName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{goal.goalCode} · {goal.measurementType}</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`${btnBase} py-2 ${tab === t.id ? `${t.color} text-gray-900 dark:text-white` : 'bg-white dark:bg-gray-800 border-black/20 dark:border-white/20 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 border-4 border-black dark:border-gray-600 rounded-3xl bg-white dark:bg-gray-800 shadow-[4px_4px_0_0_#1A1D20] p-6 overflow-y-auto">
        {tab === 'tasks'          && <PracticalTasksTab      goal={goal} />}
        {tab === 'rules'          && <RecommendationRulesTab goal={goal} />}
        {tab === 'questionnaires' && <QuestionnairesTab      goal={goal} />}
      </div>
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
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const flash = (type: 'success' | 'error', msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  };

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
      flash('success', 'Category updated.');
    } else {
      await adminGoalApi.createCategory(payload);
      flash('success', 'Category created.');
    }
    setCatModal(null);
    fetchCategories();
  };

  const handleToggleCat = async (cat: GoalCategoryDto) => {
    try { await adminGoalApi.toggleCategoryStatus(cat.categoryId, !cat.isActive); fetchCategories(); }
    catch { flash('error', 'Status update failed.'); }
  };

  const handleDeleteCat = async () => {
    if (!delCat) return;
    setDelLoading(true);
    try {
      await adminGoalApi.deleteCategory(delCat.categoryId);
      flash('success', 'Category deleted.');
      if (selectedCat?.categoryId === delCat.categoryId) setSelectedCat(null);
      setDelCat(null);
      fetchCategories();
    } catch (ex: any) { flash('error', ex?.response?.data?.message ?? 'Delete failed.'); }
    finally { setDelLoading(false); }
  };

  const handleSaveGoal = async (payload: GoalPayload) => {
    if (goalModal?.editing) {
      await adminGoalApi.updateGoal(goalModal.editing.goalId, payload);
      flash('success', 'Goal updated.');
    } else {
      await adminGoalApi.createGoal(payload);
      flash('success', 'Goal created.');
    }
    setGoalModal(null);
    if (selectedCat) fetchGoals(selectedCat);
  };

  const handleDeleteGoal = async () => {
    if (!delGoal) return;
    setDelLoading(true);
    try {
      await adminGoalApi.deleteGoal(delGoal.goalId);
      flash('success', 'Goal deleted.');
      setDelGoal(null);
      if (selectedCat) fetchGoals(selectedCat);
    } catch (ex: any) { flash('error', ex?.response?.data?.message ?? 'Delete failed.'); }
    finally { setDelLoading(false); }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {alert && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl border-2 border-black font-bold text-sm shadow-[3px_3px_0_0_#1A1D20] ${alert.type === 'success' ? 'bg-green-200 text-green-900' : 'bg-red-200 text-red-900'}`}>
          {alert.msg}
        </div>
      )}

      {/* Split pane */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left: Categories */}
        <div className="w-72 shrink-0 flex flex-col gap-3 border-4 border-black dark:border-gray-600 rounded-3xl bg-white dark:bg-gray-800 shadow-[4px_4px_0_0_#1A1D20] p-5 overflow-hidden">
          <div className="flex items-center justify-between shrink-0">
            <h2 className="font-black text-gray-900 dark:text-gray-100">Categories</h2>
            <button onClick={() => setCatModal({ editing: null })} className={`${btnBase} bg-amber-200 dark:bg-amber-700 text-amber-900 dark:text-amber-100 py-1 px-3 text-xs`}>
              <Plus className="w-3 h-3" /> New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 -mr-1 pr-1">
            {catLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No categories yet</div>
            ) : categories.map(cat => (
              <div
                key={cat.categoryId}
                onClick={() => setSelectedCat(cat)}
                className={`cursor-pointer border-2 rounded-2xl p-3 transition-all ${selectedCat?.categoryId === cat.categoryId ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'border-black/30 dark:border-white/10 bg-gray-50 dark:bg-gray-700/50 hover:bg-amber-50/50 dark:hover:bg-amber-900/10'}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {cat.iconCode && <span className="text-lg shrink-0">{cat.iconCode}</span>}
                    <p className="font-black text-sm text-gray-900 dark:text-gray-100 truncate">{cat.categoryName}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded-full border ${cat.isActive ? 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300' : 'bg-gray-100 border-gray-300 text-gray-500'}`}>
                    {cat.isActive ? '●' : '○'}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 font-mono mt-1">{cat.categoryCode}</p>
                <div className="flex items-center gap-1 mt-2" onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleToggleCat(cat)} className="p-0.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded text-gray-400">
                    {cat.isActive ? <ToggleRight className="w-3.5 h-3.5 text-green-600" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => setCatModal({ editing: cat })} className="p-0.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded text-gray-400"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDelCat(cat)} className="p-0.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Goals */}
        <div className="flex-1 flex flex-col gap-3 border-4 border-black dark:border-gray-600 rounded-3xl bg-white dark:bg-gray-800 shadow-[4px_4px_0_0_#1A1D20] p-5 overflow-hidden">
          {!selectedCat ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <Layers className="w-16 h-16 opacity-20 mb-4" />
              <p className="font-black text-lg text-gray-500 dark:text-gray-400">Select a Category</p>
              <p className="text-sm">Choose a category on the left to view and manage its goals.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between shrink-0">
                <div>
                  <h2 className="font-black text-gray-900 dark:text-gray-100">{selectedCat.categoryName}</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{goals.length} goal{goals.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => setGoalModal({ editing: null })} className={`${btnBase} bg-emerald-200 dark:bg-emerald-700 text-emerald-900 dark:text-emerald-100 py-1 px-3 text-xs`}>
                  <Plus className="w-3 h-3" /> New Goal
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 -mr-1 pr-1">
                {goalLoading ? (
                  <div className="flex items-center justify-center py-10 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
                ) : goals.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-gray-400">
                    <Layers className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="font-bold">No goals in this category</p>
                    <p className="text-sm">Add the first goal using the button above.</p>
                  </div>
                ) : goals.map(goal => (
                  <div key={goal.goalId} className="border-2 border-black dark:border-gray-600 rounded-2xl p-4 bg-white dark:bg-gray-700/60 shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-sm text-gray-900 dark:text-gray-100">{goal.goalName}</p>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${goal.isActive ? 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300' : 'bg-gray-100 border-gray-300 text-gray-500'}`}>
                            {goal.isActive ? 'Active' : 'Off'}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{goal.goalCode} · {goal.measurementType}</p>
                        {goal.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{goal.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <button onClick={() => setGoalModal({ editing: goal })} className={`${btnBase} bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-1 px-2.5 text-xs`}><Pencil className="w-3 h-3" /> Edit</button>
                      <button onClick={() => setDelGoal(goal)} className={`${btnBase} bg-white dark:bg-gray-600 text-red-600 py-1 px-2.5 text-xs`}><Trash2 className="w-3 h-3" /></button>
                      <button onClick={() => onEnterGoal(selectedCat, goal)} className={`${btnBase} ml-auto bg-emerald-300 dark:bg-emerald-700 text-gray-900 dark:text-white py-1 px-3 text-xs`}>
                        Configure <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
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
        <div className="w-12 h-12 rounded-2xl bg-emerald-300 border-4 border-black flex items-center justify-center shadow-[3px_3px_0_0_#1A1D20] shrink-0">
          <Layers className="w-6 h-6 text-gray-900" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Goal Engine Hub</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
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

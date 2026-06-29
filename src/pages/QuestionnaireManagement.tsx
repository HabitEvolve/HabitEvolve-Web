import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus, Pencil, Trash2, ChevronRight, X,
  Loader2, ToggleLeft, ToggleRight, HelpCircle, List, CheckSquare,
  Hash, AlignLeft, Star, ChevronDown, ChevronUp
} from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import { adminGoalApi } from '../api/adminGoalApi';
import {
  QuestionnaireTemplateDto, QuestionnaireTemplatePayload,
  QuestionDto, QuestionOptionDto, QuestionType,
} from '../types/adminGoal.types';

// ─── Style helpers ────────────────────────────────────────────────────────────
const inputCls = [
  'w-full px-3 py-2 rounded-xl border-2 border-black bg-white dark:bg-gray-800',
  'text-gray-900 dark:text-gray-100 text-sm font-medium',
  'focus:outline-none focus:ring-2 focus:ring-amber-400',
  'dark:border-gray-600 dark:placeholder:text-gray-500',
].join(' ');

const btnBase = [
  'inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-black',
  'font-black text-sm transition-all shadow-[2px_2px_0_0_#1A1D20]',
  'hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
].join(' ');

const QUESTION_TYPES: { value: QuestionType; label: string; icon: React.ReactNode }[] = [
  { value: 'SingleChoice',   label: 'Single Choice',   icon: <CheckSquare className="w-4 h-4" /> },
  { value: 'MultipleChoice', label: 'Multiple Choice', icon: <List        className="w-4 h-4" /> },
  { value: 'NumberInput',    label: 'Number Input',    icon: <Hash        className="w-4 h-4" /> },
  { value: 'TextInput',      label: 'Text Input',      icon: <AlignLeft   className="w-4 h-4" /> },
  { value: 'RatingScale',    label: 'Rating Scale',    icon: <Star        className="w-4 h-4" /> },
  { value: 'YesNo',          label: 'Yes / No',        icon: <HelpCircle  className="w-4 h-4" /> },
];
const CHOICE_TYPES: QuestionType[] = ['SingleChoice', 'MultipleChoice'];
const isChoiceType = (t: QuestionType) => CHOICE_TYPES.includes(t);

// ─── Portal wrapper ───────────────────────────────────────────────────────────
const Portal = ({ children }: { children: React.ReactNode }) =>
  createPortal(children, document.body);

// ─── Generic confirm delete modal ────────────────────────────────────────────
function ConfirmDeleteModal({
  title, body, onConfirm, onCancel, loading,
}: {
  title: string; body: string;
  onConfirm: () => void; onCancel: () => void; loading?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="modal-content bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] w-full max-w-sm p-6">
          <h3 className="text-lg font-black text-red-700 dark:text-red-400 mb-2">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{body}</p>
          <div className="flex gap-3">
            <button onClick={onCancel} className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>
              {t('admin.questionnaire.deleteModal.cancel')}
            </button>
            <button onClick={onConfirm} disabled={loading} className={`${btnBase} flex-1 justify-center bg-red-400 text-white`}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {t('admin.questionnaire.deleteModal.delete')}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ─── Template Form Modal ──────────────────────────────────────────────────────
function TemplateFormModal({
  editing, onSave, onClose,
}: {
  editing: QuestionnaireTemplateDto | null;
  onSave: (payload: QuestionnaireTemplatePayload) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const alert = useAlert();
  const [name, setName] = useState(editing?.templateName ?? '');
  const [desc, setDesc] = useState(editing?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setErr(t('admin.questionnaire.templateForm.nameRequired')); return; }
    setSaving(true); setErr('');
    try { await onSave({ templateName: name.trim(), description: desc.trim() || undefined }); }
    catch (ex: any) { alert.error(ex?.response?.data?.message ?? 'Save failed.'); }
    finally { setSaving(false); }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="modal-content bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] w-full max-w-md">
          <div className="flex items-center justify-between p-5 border-b-2 border-black dark:border-white/10 bg-amber-100 dark:bg-amber-900/30 rounded-t-3xl">
            <h2 className="font-black text-lg text-gray-900 dark:text-gray-100">
              {editing ? t('admin.questionnaire.templateForm.editTitle') : t('admin.questionnaire.templateForm.newTitle')}
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {err && <p className="text-xs text-red-600 font-bold bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl px-3 py-2">{err}</p>}
            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1">{t('admin.questionnaire.templateForm.nameLabel')}</label>
              <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder={t('admin.questionnaire.templateForm.namePlaceholder')} required />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1">{t('admin.questionnaire.templateForm.descLabel')}</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} className={inputCls} placeholder={t('admin.questionnaire.templateForm.descPlaceholder')} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>{t('admin.questionnaire.templateForm.cancel')}</button>
              <button type="submit" disabled={saving} className={`${btnBase} flex-1 justify-center bg-amber-300 dark:bg-amber-600 text-gray-900 dark:text-white`}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {editing ? t('admin.questionnaire.templateForm.save') : t('admin.questionnaire.templateForm.create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}

// ─── Question Form Modal ──────────────────────────────────────────────────────
function QuestionFormModal({
  templateId, editing, onSave, onClose,
}: {
  templateId: number;
  editing: QuestionDto | null;
  onSave: (payload: any) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const alert = useAlert();
  const [text, setText] = useState(editing?.questionText ?? '');
  const [type, setType] = useState<QuestionType>(editing?.questionType ?? 'SingleChoice');
  const [required, setRequired] = useState(editing?.isRequired ?? true);
  const [order, setOrder] = useState(editing?.displayOrder ?? 1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) { setErr(t('admin.questionnaire.questionForm.textRequired')); return; }
    setSaving(true); setErr('');
    const payload = editing
      ? { questionId: editing.questionId, questionText: text.trim(), questionType: type, isRequired: required, displayOrder: order }
      : { templateId, questionText: text.trim(), questionType: type, isRequired: required, displayOrder: order };
    try { await onSave(payload); }
    catch (ex: any) { alert.error(ex?.response?.data?.message ?? 'Save failed.'); }
    finally { setSaving(false); }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="modal-content bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] w-full max-w-lg">
          <div className="flex items-center justify-between p-5 border-b-2 border-black dark:border-white/10 bg-violet-100 dark:bg-violet-900/30 rounded-t-3xl">
            <h2 className="font-black text-lg text-gray-900 dark:text-gray-100">{editing ? t('admin.questionnaire.questionForm.editTitle') : t('admin.questionnaire.questionForm.newTitle')}</h2>
            <button onClick={onClose} className="p-1 hover:bg-violet-200 dark:hover:bg-violet-800 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {err && <p className="text-xs text-red-600 font-bold bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl px-3 py-2">{err}</p>}
            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1">{t('admin.questionnaire.questionForm.textLabel')}</label>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={2} className={inputCls} placeholder={t('admin.questionnaire.questionForm.textPlaceholder')} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1">{t('admin.questionnaire.questionForm.typeLabel')}</label>
                <select value={type} onChange={e => setType(e.target.value as QuestionType)} className={inputCls}>
                  {QUESTION_TYPES.map(qt => <option key={qt.value} value={qt.value}>{t(`admin.questionnaire.questionTypes.${qt.value}`)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1">{t('admin.questionnaire.questionForm.orderLabel')}</label>
                <input type="number" min={1} value={order} onChange={e => setOrder(Number(e.target.value))} className={inputCls} />
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} className="w-4 h-4 rounded border-gray-400 accent-violet-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('admin.questionnaire.questionForm.requiredLabel')}</span>
            </label>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>{t('admin.questionnaire.questionForm.cancel')}</button>
              <button type="submit" disabled={saving} className={`${btnBase} flex-1 justify-center bg-violet-300 dark:bg-violet-700 text-gray-900 dark:text-white`}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {editing ? t('admin.questionnaire.questionForm.save') : t('admin.questionnaire.questionForm.add')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}

// ─── Option Form Modal ────────────────────────────────────────────────────────
function OptionFormModal({
  questionId, editing, onSave, onClose,
}: {
  questionId: number;
  editing: QuestionOptionDto | null;
  onSave: (payload: any) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const alert = useAlert();
  const [text, setText] = useState(editing?.optionText ?? '');
  const [value, setValue] = useState(editing?.optionValue ?? '');
  const [order, setOrder] = useState(editing?.displayOrder ?? 1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !value.trim()) { setErr(t('admin.questionnaire.optionForm.bothRequired')); return; }
    setSaving(true); setErr('');
    const payload = editing
      ? { optionId: editing.optionId, optionText: text.trim(), optionValue: value.trim(), displayOrder: order }
      : { questionId, optionText: text.trim(), optionValue: value.trim(), displayOrder: order };
    try { await onSave(payload); }
    catch (ex: any) { alert.error(ex?.response?.data?.message ?? 'Save failed.'); }
    finally { setSaving(false); }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="modal-content bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] w-full max-w-sm">
          <div className="flex items-center justify-between p-5 border-b-2 border-black dark:border-white/10 bg-emerald-100 dark:bg-emerald-900/30 rounded-t-3xl">
            <h2 className="font-black text-lg text-gray-900 dark:text-gray-100">{editing ? t('admin.questionnaire.optionForm.editTitle') : t('admin.questionnaire.optionForm.newTitle')}</h2>
            <button onClick={onClose} className="p-1 hover:bg-emerald-200 dark:hover:bg-emerald-800 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {err && <p className="text-xs text-red-600 font-bold bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl px-3 py-2">{err}</p>}
            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1">{t('admin.questionnaire.optionForm.displayLabel')}</label>
              <input value={text} onChange={e => setText(e.target.value)} className={inputCls} placeholder={t('admin.questionnaire.optionForm.displayPlaceholder')} required />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1">{t('admin.questionnaire.optionForm.valueLabel')}</label>
              <input value={value} onChange={e => setValue(e.target.value)} className={inputCls} placeholder={t('admin.questionnaire.optionForm.valuePlaceholder')} required />
              <p className="text-[10px] text-gray-400 mt-1">{t('admin.questionnaire.optionForm.valueHint')}</p>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1">{t('admin.questionnaire.optionForm.orderLabel')}</label>
              <input type="number" min={1} value={order} onChange={e => setOrder(Number(e.target.value))} className={inputCls} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>{t('admin.questionnaire.optionForm.cancel')}</button>
              <button type="submit" disabled={saving} className={`${btnBase} flex-1 justify-center bg-emerald-300 dark:bg-emerald-700 text-gray-900 dark:text-white`}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {editing ? t('admin.questionnaire.optionForm.save') : t('admin.questionnaire.optionForm.add')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}

// ─── Options sub-panel ────────────────────────────────────────────────────────
function OptionsPanel({ question, onRefresh }: { question: QuestionDto; onRefresh: () => void }) {
  const { t } = useTranslation();
  const alert = useAlert();
  const [optModal, setOptModal] = useState<{ editing: QuestionOptionDto | null } | null>(null);
  const [delOpt, setDelOpt] = useState<QuestionOptionDto | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  const sorted = [...question.options].sort((a, b) => a.displayOrder - b.displayOrder);

  const handleSave = async (payload: any) => {
    if (optModal?.editing) await adminGoalApi.updateQuestionOption(optModal.editing.optionId, payload);
    else await adminGoalApi.createQuestionOption(question.questionId, payload);
    setOptModal(null);
    onRefresh();
  };

  const handleDelete = async () => {
    if (!delOpt) return;
    setDelLoading(true);
    try {
      await adminGoalApi.deleteQuestionOption(delOpt.optionId);
      setDelOpt(null);
      onRefresh();
    } catch (ex: any) {
      alert.error(ex?.response?.data?.message ?? 'Delete failed.');
    } finally { setDelLoading(false); }
  };

  return (
    <div className="pt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-black uppercase tracking-wide text-gray-400">{t('admin.questionnaire.optionsLabel')} ({sorted.length})</p>
        <button onClick={() => setOptModal({ editing: null })} className={`${btnBase} bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 py-1 px-3 text-xs`}>
          <Plus className="w-3 h-3" /> {t('admin.questionnaire.optionForm.add')}
        </button>
      </div>
      {sorted.length === 0 ? (
        <p className="text-xs text-gray-400 italic py-3 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">{t('admin.questionnaire.noOptions')}</p>
      ) : (
        <div className="space-y-1.5">
          {sorted.map(opt => (
            <div key={opt.optionId} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/10 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl">
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 w-5">#{opt.displayOrder}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">{opt.optionText}</p>
                <p className="text-[10px] text-gray-400 font-mono truncate">{opt.optionValue}</p>
              </div>
              <button onClick={() => setOptModal({ editing: opt })} className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-800 rounded text-gray-400"><Pencil className="w-3 h-3" /></button>
              <button onClick={() => setDelOpt(opt)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-400"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}
      {optModal !== null && <OptionFormModal questionId={question.questionId} editing={optModal.editing} onSave={handleSave} onClose={() => setOptModal(null)} />}
      {delOpt && <ConfirmDeleteModal title={t('admin.questionnaire.deleteModal.deleteOption')} body={t('admin.questionnaire.deleteModal.deleteOptionBody', { text: delOpt.optionText })} loading={delLoading} onConfirm={handleDelete} onCancel={() => setDelOpt(null)} />}
    </div>
  );
}

// ─── Questions right-panel ────────────────────────────────────────────────────
function QuestionsPanel({ template, onBack }: { template: QuestionnaireTemplateDto; onBack: () => void }) {
  const { t } = useTranslation();
  const alert = useAlert();
  const [questions, setQuestions] = useState<QuestionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const [qModal, setQModal] = useState<{ editing: QuestionDto | null } | null>(null);
  const [delQ, setDelQ] = useState<QuestionDto | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGoalApi.getQuestionsByTemplate(template.templateId, { activeOnly: false });
      if (res.success) setQuestions(res.data ?? []);
    } finally { setLoading(false); }
  }, [template.templateId]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSaveQ = async (payload: any) => {
    try {
      if (qModal?.editing) await adminGoalApi.updateQuestion(qModal.editing.questionId, payload);
      else await adminGoalApi.createQuestion(template.templateId, payload);
      alert.success(t('admin.questionnaire.flashUpdated'));
      setQModal(null);
      fetch();
    } catch (ex: any) {
      alert.error(ex?.response?.data?.message ?? 'Save failed.');
    }
  };

  const handleDelQ = async () => {
    if (!delQ) return;
    setDelLoading(true);
    try {
      await adminGoalApi.deleteQuestion(delQ.questionId);
      setDelQ(null);
      fetch();
    } catch (ex: any) {
      alert.error(ex?.response?.data?.message ?? 'Delete failed.');
    } finally { setDelLoading(false); }
  };

  const sorted = [...questions].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button onClick={onBack} className={`${btnBase} bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-1 px-3 text-xs`}>
          <ChevronRight className="w-3.5 h-3.5 rotate-180" /> {t('admin.questionnaire.backToTemplates')}
        </button>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="font-black text-gray-800 dark:text-gray-100 text-sm truncate max-w-xs">{template.templateName}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${template.isActive ? 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300' : 'bg-gray-100 border-gray-300 text-gray-500'}`}>
          {template.isActive ? t('admin.questionnaire.statusActive') : t('admin.questionnaire.statusInactive')}
        </span>
        <button onClick={() => setQModal({ editing: null })} className={`${btnBase} ml-auto bg-violet-200 dark:bg-violet-800 text-violet-900 dark:text-violet-100 py-1.5`}>
          <Plus className="w-4 h-4" /> {t('admin.questionnaire.addQuestion')}
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 justify-center py-10 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /> {t('admin.questionnaire.loading')}</div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-gray-400">
            <img src="/icon/Item/Scroll/64px/Golden Scroll 1st 64px.png" alt="" className="w-10 h-10 mx-auto mb-2 object-contain opacity-40" />
            <p className="font-bold">{t('admin.questionnaire.noQuestions')}</p>
          </div>
        ) : sorted.map(q => (
          <div key={q.questionId} className="border-2 border-black dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800/80 shadow-[3px_3px_0_0_#1A1D20] overflow-hidden">
            <div className="flex items-start gap-3 p-4">
              <span className="text-xs font-black text-gray-400 w-5 shrink-0 mt-0.5">#{q.displayOrder}</span>
              <span className="text-violet-600 dark:text-violet-400 shrink-0 mt-0.5">
                {QUESTION_TYPES.find(qt => qt.value === q.questionType)?.icon ?? <HelpCircle className="w-4 h-4" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-800 dark:text-gray-100">{q.questionText}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] font-black bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full border border-violet-200 dark:border-violet-700">{q.questionType}</span>
                  {q.isRequired && <span className="text-[10px] font-black bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800">{t('admin.questionnaire.requiredBadge')}</span>}
                  {isChoiceType(q.questionType) && <span className="text-[10px] text-gray-400">{q.options.length} option{q.options.length !== 1 ? 's' : ''}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {isChoiceType(q.questionType) && (
                  <button onClick={() => setExpandedQ(expandedQ === q.questionId ? null : q.questionId)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400">
                    {expandedQ === q.questionId ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                )}
                <button onClick={() => setQModal({ editing: q })} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => setDelQ(q)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            {isChoiceType(q.questionType) && expandedQ === q.questionId && (
              <div className="px-4 pb-4 border-t-2 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
                <OptionsPanel question={q} onRefresh={fetch} />
              </div>
            )}
          </div>
        ))}
      </div>

      {qModal !== null && <QuestionFormModal templateId={template.templateId} editing={qModal.editing} onSave={handleSaveQ} onClose={() => setQModal(null)} />}
      {delQ && <ConfirmDeleteModal title={t('admin.questionnaire.deleteModal.deleteQuestion')} body={t('admin.questionnaire.deleteModal.deleteQuestionBody', { text: delQ.questionText })} loading={delLoading} onConfirm={handleDelQ} onCancel={() => setDelQ(null)} />}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function QuestionnaireManagement() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initTemplateId = Number(searchParams.get('templateId')) || null;
  const autoSelectedRef = useRef(false);

  const [templates, setTemplates] = useState<QuestionnaireTemplateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTpl, setSelectedTpl] = useState<QuestionnaireTemplateDto | null>(null);
  const [tplModal, setTplModal] = useState<{ editing: QuestionnaireTemplateDto | null } | null>(null);
  const [delTpl, setDelTpl] = useState<QuestionnaireTemplateDto | null>(null);
  const [delLoading, setDelLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGoalApi.getTemplates({ activeOnly: false });
      if (res.success) setTemplates(res.data ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // Auto-select template from URL ?templateId= on first load
  useEffect(() => {
    if (!initTemplateId || autoSelectedRef.current || templates.length === 0) return;
    const tpl = templates.find(t => t.templateId === initTemplateId);
    if (tpl) { setSelectedTpl(tpl); autoSelectedRef.current = true; }
  }, [templates, initTemplateId]);

  const flash = (type: 'success' | 'error', msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleSaveTpl = async (payload: QuestionnaireTemplatePayload) => {
    if (tplModal?.editing) {
      await adminGoalApi.updateTemplate(tplModal.editing.templateId, payload);
      flash('success', t('admin.questionnaire.flashUpdated'));
    } else {
      await adminGoalApi.createTemplate(payload);
      flash('success', t('admin.questionnaire.flashCreated'));
    }
    setTplModal(null);
    fetchTemplates();
  };

  const handleToggle = async (tpl: QuestionnaireTemplateDto) => {
    try { await adminGoalApi.toggleTemplateStatus(tpl.templateId, !tpl.isActive); fetchTemplates(); }
    catch { flash('error', t('admin.questionnaire.flashStatusFailed')); }
  };

  const handleDelete = async () => {
    if (!delTpl) return;
    setDelLoading(true);
    try {
      await adminGoalApi.deleteTemplate(delTpl.templateId);
      flash('success', t('admin.questionnaire.flashDeleted'));
      if (selectedTpl?.templateId === delTpl.templateId) setSelectedTpl(null);
      setDelTpl(null);
      fetchTemplates();
    } catch (ex: any) {
      flash('error', ex?.response?.data?.message ?? t('admin.questionnaire.flashDeleteFailed'));
    } finally { setDelLoading(false); }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Flash alert */}
      {alert && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl border-2 border-black font-bold text-sm shadow-[3px_3px_0_0_#1A1D20] ${alert.type === 'success' ? 'bg-green-200 text-green-900' : 'bg-red-200 text-red-900'}`}>
          {alert.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-12 h-12 rounded-2xl bg-amber-300 border-4 border-black flex items-center justify-center shadow-[3px_3px_0_0_#1A1D20] shrink-0">
          <img src="/icon/Item/Scroll/64px/Golden Scroll 1st 64px.png" alt="" className="w-5 h-5 object-contain" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">{t('admin.questionnaire.pageTitle')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.questionnaire.subtitle')}</p>
        </div>
        <button onClick={() => setTplModal({ editing: null })} className={`${btnBase} ml-auto bg-amber-300 dark:bg-amber-600 text-gray-900 dark:text-white py-2`}>
          <Plus className="w-4 h-4" /> {t('admin.questionnaire.newTemplate')}
        </button>
      </div>

      {/* Body: split pane */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left pane — Template list */}
        <div className="w-72 shrink-0 overflow-y-auto flex flex-col gap-3 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> {t('admin.questionnaire.loading')}</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 border-4 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-gray-400">
              <img src="/icon/Item/Scroll/64px/Golden Scroll 1st 64px.png" alt="" className="w-10 h-10 mx-auto mb-2 object-contain opacity-40" /><p className="font-bold">{t('admin.questionnaire.noTemplates')}</p>
            </div>
          ) : templates.map(tpl => (
            <div
              key={tpl.templateId}
              onClick={() => setSelectedTpl(tpl)}
              className={`cursor-pointer border-4 rounded-2xl p-4 transition-all ${
                selectedTpl?.templateId === tpl.templateId
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 shadow-[4px_4px_0_0_#1A1D20]'
                  : 'border-black bg-white dark:bg-gray-800 hover:bg-amber-50/60 dark:hover:bg-amber-900/10 shadow-[3px_3px_0_0_#1A1D20]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-black text-sm text-gray-900 dark:text-gray-100 leading-tight">{tpl.templateName}</p>
                <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-black border ${tpl.isActive ? 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300' : 'bg-gray-100 border-gray-300 text-gray-500 dark:bg-gray-700 dark:border-gray-600'}`}>
                  {tpl.isActive ? t('admin.questionnaire.statusActive') : t('admin.questionnaire.statusOff')}
                </span>
              </div>
              {tpl.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{tpl.description}</p>}
              <div className="flex items-center gap-1 mt-3" onClick={e => e.stopPropagation()}>
                <button onClick={() => handleToggle(tpl)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500" title={tpl.isActive ? 'Deactivate' : 'Activate'}>
                  {tpl.isActive ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                </button>
                <button onClick={() => setTplModal({ editing: tpl })} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => setDelTpl(tpl)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                <ChevronRight className="w-4 h-4 ml-auto text-gray-300 dark:text-gray-600" />
              </div>
            </div>
          ))}
        </div>

        {/* Right pane — Questions panel */}
        <div className="flex-1 border-4 border-black dark:border-gray-600 rounded-3xl bg-white dark:bg-gray-800 shadow-[4px_4px_0_0_#1A1D20] p-6 min-h-0 overflow-hidden flex flex-col">
          {selectedTpl ? (
            <QuestionsPanel template={selectedTpl} onBack={() => setSelectedTpl(null)} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 gap-3">
              <img src="/icon/Item/Scroll/64px/Golden Scroll 1st 64px.png" alt="" className="w-16 h-16 object-contain opacity-20" />
              <p className="font-black text-lg text-gray-500 dark:text-gray-400">{t('admin.questionnaire.selectTemplate')}</p>
              <p className="text-sm">{t('admin.questionnaire.selectTemplateHint')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {tplModal !== null && <TemplateFormModal editing={tplModal.editing} onSave={handleSaveTpl} onClose={() => setTplModal(null)} />}
      {delTpl && <ConfirmDeleteModal title={t('admin.questionnaire.deleteModal.deleteTemplate')} body={t('admin.questionnaire.deleteModal.deleteTemplateBody', { name: delTpl.templateName })} loading={delLoading} onConfirm={handleDelete} onCancel={() => setDelTpl(null)} />}
    </div>
  );
}

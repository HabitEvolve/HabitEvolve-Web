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
import SkyCard from '../components/ui/card/SkyCard';
import SkyButton from '../components/ui/button/SkyButton';
import {
  QuestionnaireTemplateDto, QuestionnaireTemplatePayload,
  QuestionDto, QuestionOptionDto, QuestionType,
} from '../types/adminGoal.types';

// ─── Style helpers ────────────────────────────────────────────────────────────
const inputCls = [
  'w-full px-3 py-2 rounded-sky-chip border border-sky-surf-border bg-white',
  'text-sky-ink text-sm font-medium',
  'focus:outline-none focus:border-sky-deep focus:ring-3 focus:ring-sky-deep/20',
  'placeholder:text-sky-ink-3',
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
      <div className="fixed inset-0 bg-sky-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <SkyCard variant="admin" className="modal-content w-full max-w-sm">
          <h3 className="text-lg font-bold text-error-700 mb-2">{title}</h3>
          <p className="text-sm text-sky-ink-2 mb-6">{body}</p>
          <div className="flex gap-3">
            <SkyButton type="button" variant="secondary" onClick={onCancel} className="flex-1">
              {t('admin.questionnaire.deleteModal.cancel')}
            </SkyButton>
            <SkyButton type="button" variant="destructive" onClick={onConfirm} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {t('admin.questionnaire.deleteModal.delete')}
            </SkyButton>
          </div>
        </SkyCard>
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
      <div className="fixed inset-0 bg-sky-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <SkyCard variant="admin" className="modal-content p-0 overflow-hidden w-full max-w-md">
          <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-warning-50">
            <h2 className="font-bold text-lg text-sky-ink">
              {editing ? t('admin.questionnaire.templateForm.editTitle') : t('admin.questionnaire.templateForm.newTitle')}
            </h2>
            <SkyButton type="button" variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></SkyButton>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {err && <p className="text-xs text-error-600 font-semibold bg-error-50 border border-error-300 rounded-sky-chip px-3 py-2">{err}</p>}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-sky-ink-2 mb-1">{t('admin.questionnaire.templateForm.nameLabel')}</label>
              <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder={t('admin.questionnaire.templateForm.namePlaceholder')} required />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-sky-ink-2 mb-1">{t('admin.questionnaire.templateForm.descLabel')}</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} className={inputCls} placeholder={t('admin.questionnaire.templateForm.descPlaceholder')} />
            </div>
            <div className="flex gap-3 pt-2">
              <SkyButton type="button" variant="secondary" onClick={onClose} className="flex-1">{t('admin.questionnaire.templateForm.cancel')}</SkyButton>
              <SkyButton type="submit" variant="primary" disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {editing ? t('admin.questionnaire.templateForm.save') : t('admin.questionnaire.templateForm.create')}
              </SkyButton>
            </div>
          </form>
        </SkyCard>
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
      <div className="fixed inset-0 bg-sky-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <SkyCard variant="admin" className="modal-content p-0 overflow-hidden w-full max-w-lg">
          <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-purple-50">
            <h2 className="font-bold text-lg text-sky-ink">{editing ? t('admin.questionnaire.questionForm.editTitle') : t('admin.questionnaire.questionForm.newTitle')}</h2>
            <SkyButton type="button" variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></SkyButton>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {err && <p className="text-xs text-error-600 font-semibold bg-error-50 border border-error-300 rounded-sky-chip px-3 py-2">{err}</p>}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-sky-ink-2 mb-1">{t('admin.questionnaire.questionForm.textLabel')}</label>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={2} className={inputCls} placeholder={t('admin.questionnaire.questionForm.textPlaceholder')} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-sky-ink-2 mb-1">{t('admin.questionnaire.questionForm.typeLabel')}</label>
                <select value={type} onChange={e => setType(e.target.value as QuestionType)} className={inputCls}>
                  {QUESTION_TYPES.map(qt => <option key={qt.value} value={qt.value}>{t(`admin.questionnaire.questionTypes.${qt.value}`)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-sky-ink-2 mb-1">{t('admin.questionnaire.questionForm.orderLabel')}</label>
                <input type="number" min={1} value={order} onChange={e => setOrder(Number(e.target.value))} className={inputCls} />
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} className="w-4 h-4 accent-sky-deep" />
              <span className="text-sm font-semibold text-sky-ink-2">{t('admin.questionnaire.questionForm.requiredLabel')}</span>
            </label>
            <div className="flex gap-3 pt-2">
              <SkyButton type="button" variant="secondary" onClick={onClose} className="flex-1">{t('admin.questionnaire.questionForm.cancel')}</SkyButton>
              <SkyButton type="submit" variant="primary" disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {editing ? t('admin.questionnaire.questionForm.save') : t('admin.questionnaire.questionForm.add')}
              </SkyButton>
            </div>
          </form>
        </SkyCard>
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
      <div className="fixed inset-0 bg-sky-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <SkyCard variant="admin" className="modal-content p-0 overflow-hidden w-full max-w-sm">
          <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-success-50">
            <h2 className="font-bold text-lg text-sky-ink">{editing ? t('admin.questionnaire.optionForm.editTitle') : t('admin.questionnaire.optionForm.newTitle')}</h2>
            <SkyButton type="button" variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></SkyButton>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {err && <p className="text-xs text-error-600 font-semibold bg-error-50 border border-error-300 rounded-sky-chip px-3 py-2">{err}</p>}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-sky-ink-2 mb-1">{t('admin.questionnaire.optionForm.displayLabel')}</label>
              <input value={text} onChange={e => setText(e.target.value)} className={inputCls} placeholder={t('admin.questionnaire.optionForm.displayPlaceholder')} required />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-sky-ink-2 mb-1">{t('admin.questionnaire.optionForm.valueLabel')}</label>
              <input value={value} onChange={e => setValue(e.target.value)} className={inputCls} placeholder={t('admin.questionnaire.optionForm.valuePlaceholder')} required />
              <p className="text-[10px] text-sky-ink-3 mt-1">{t('admin.questionnaire.optionForm.valueHint')}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-sky-ink-2 mb-1">{t('admin.questionnaire.optionForm.orderLabel')}</label>
              <input type="number" min={1} value={order} onChange={e => setOrder(Number(e.target.value))} className={inputCls} />
            </div>
            <div className="flex gap-3 pt-2">
              <SkyButton type="button" variant="secondary" onClick={onClose} className="flex-1">{t('admin.questionnaire.optionForm.cancel')}</SkyButton>
              <SkyButton type="submit" variant="primary" disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {editing ? t('admin.questionnaire.optionForm.save') : t('admin.questionnaire.optionForm.add')}
              </SkyButton>
            </div>
          </form>
        </SkyCard>
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
        <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-ink-3">{t('admin.questionnaire.optionsLabel')} ({sorted.length})</p>
        <SkyButton type="button" variant="secondary" size="sm" onClick={() => setOptModal({ editing: null })}>
          <Plus className="w-3 h-3" /> {t('admin.questionnaire.optionForm.add')}
        </SkyButton>
      </div>
      {sorted.length === 0 ? (
        <p className="text-xs text-sky-ink-3 italic py-3 text-center border border-dashed border-sky-ink/15 rounded-sky-chip">{t('admin.questionnaire.noOptions')}</p>
      ) : (
        <div className="space-y-1.5">
          {sorted.map(opt => (
            <div key={opt.optionId} className="flex items-center gap-2 px-3 py-1.5 bg-success-50 border border-success-200 rounded-sky-chip">
              <span className="text-[10px] font-semibold text-success-700 w-5">#{opt.displayOrder}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-sky-ink truncate">{opt.optionText}</p>
                <p className="text-[10px] text-sky-ink-3 font-mono truncate">{opt.optionValue}</p>
              </div>
              <SkyButton type="button" variant="ghost" size="icon" onClick={() => setOptModal({ editing: opt })} className="w-6 h-6"><Pencil className="w-3 h-3" /></SkyButton>
              <SkyButton type="button" variant="ghost" size="icon" onClick={() => setDelOpt(opt)} className="w-6 h-6 text-error-500 hover:bg-error-50"><Trash2 className="w-3 h-3" /></SkyButton>
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
        <SkyButton type="button" variant="secondary" size="sm" onClick={onBack}>
          <ChevronRight className="w-3.5 h-3.5 rotate-180" /> {t('admin.questionnaire.backToTemplates')}
        </SkyButton>
        <ChevronRight className="w-4 h-4 text-sky-ink-3" />
        <span className="font-bold text-sky-ink text-sm truncate max-w-xs">{template.templateName}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${template.isActive ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-500'}`}>
          {template.isActive ? t('admin.questionnaire.statusActive') : t('admin.questionnaire.statusInactive')}
        </span>
        <SkyButton type="button" variant="primary" size="sm" onClick={() => setQModal({ editing: null })} className="ml-auto">
          <Plus className="w-4 h-4" /> {t('admin.questionnaire.addQuestion')}
        </SkyButton>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 justify-center py-10 text-sky-ink-3"><Loader2 className="w-5 h-5 animate-spin" /> {t('admin.questionnaire.loading')}</div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-sky-ink/15 rounded-sky-card text-sky-ink-3">
            <img src="/icon/Item/Scroll/64px/Golden Scroll 1st 64px.png" alt="" className="w-10 h-10 mx-auto mb-2 object-contain opacity-40" />
            <p className="font-semibold">{t('admin.questionnaire.noQuestions')}</p>
          </div>
        ) : sorted.map(q => (
          <SkyCard key={q.questionId} variant="admin" className="p-0 overflow-hidden">
            <div className="flex items-start gap-3 p-4">
              <span className="text-xs font-semibold text-sky-ink-3 w-5 shrink-0 mt-0.5">#{q.displayOrder}</span>
              <span className="text-purple-600 shrink-0 mt-0.5">
                {QUESTION_TYPES.find(qt => qt.value === q.questionType)?.icon ?? <HelpCircle className="w-4 h-4" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-sky-ink">{q.questionText}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{q.questionType}</span>
                  {q.isRequired && <span className="text-[10px] font-semibold bg-error-100 text-error-600 px-2 py-0.5 rounded-full">{t('admin.questionnaire.requiredBadge')}</span>}
                  {isChoiceType(q.questionType) && <span className="text-[10px] text-sky-ink-3">{q.options.length} option{q.options.length !== 1 ? 's' : ''}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {isChoiceType(q.questionType) && (
                  <SkyButton type="button" variant="ghost" size="icon" onClick={() => setExpandedQ(expandedQ === q.questionId ? null : q.questionId)} className="w-8 h-8">
                    {expandedQ === q.questionId ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </SkyButton>
                )}
                <SkyButton type="button" variant="ghost" size="icon" onClick={() => setQModal({ editing: q })} className="w-8 h-8"><Pencil className="w-4 h-4" /></SkyButton>
                <SkyButton type="button" variant="ghost" size="icon" onClick={() => setDelQ(q)} className="w-8 h-8 text-error-500 hover:bg-error-50"><Trash2 className="w-4 h-4" /></SkyButton>
              </div>
            </div>
            {isChoiceType(q.questionType) && expandedQ === q.questionId && (
              <div className="px-4 pb-4 border-t border-gray-200 bg-gray-50">
                <OptionsPanel question={q} onRefresh={fetch} />
              </div>
            )}
          </SkyCard>
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
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-sky-chip font-semibold text-sm shadow-sky-glass ${alert.type === 'success' ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'}`}>
          {alert.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-12 h-12 rounded-sky-chip bg-warning-100 flex items-center justify-center shrink-0">
          <img src="/icon/Item/Scroll/64px/Golden Scroll 1st 64px.png" alt="" className="w-5 h-5 object-contain" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-sky-ink">{t('admin.questionnaire.pageTitle')}</h1>
          <p className="text-sm text-sky-ink-2">{t('admin.questionnaire.subtitle')}</p>
        </div>
        <SkyButton type="button" variant="primary" onClick={() => setTplModal({ editing: null })} className="ml-auto">
          <Plus className="w-4 h-4" /> {t('admin.questionnaire.newTemplate')}
        </SkyButton>
      </div>

      {/* Body: split pane */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left pane — Template list */}
        <div className="w-72 shrink-0 overflow-y-auto flex flex-col gap-3 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-sky-ink-3"><Loader2 className="w-5 h-5 animate-spin mr-2" /> {t('admin.questionnaire.loading')}</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-sky-ink/15 rounded-sky-card text-sky-ink-3">
              <img src="/icon/Item/Scroll/64px/Golden Scroll 1st 64px.png" alt="" className="w-10 h-10 mx-auto mb-2 object-contain opacity-40" /><p className="font-semibold">{t('admin.questionnaire.noTemplates')}</p>
            </div>
          ) : templates.map(tpl => (
            <div
              key={tpl.templateId}
              onClick={() => setSelectedTpl(tpl)}
              className={`cursor-pointer p-4 transition-all ${
                selectedTpl?.templateId === tpl.templateId
                  ? 'rounded-sky-card bg-warning-50 ring-2 ring-warning-400'
                  : 'rounded-sky-card bg-white border border-sky-surf-border shadow-sky-tint hover:bg-warning-50/60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-sm text-sky-ink leading-tight">{tpl.templateName}</p>
                <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold ${tpl.isActive ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-500'}`}>
                  {tpl.isActive ? t('admin.questionnaire.statusActive') : t('admin.questionnaire.statusOff')}
                </span>
              </div>
              {tpl.description && <p className="text-xs text-sky-ink-2 mt-1 line-clamp-2">{tpl.description}</p>}
              <div className="flex items-center gap-1 mt-3" onClick={e => e.stopPropagation()}>
                <SkyButton type="button" variant="ghost" size="icon" onClick={() => handleToggle(tpl)} title={tpl.isActive ? 'Deactivate' : 'Activate'} className="w-7 h-7">
                  {tpl.isActive ? <ToggleRight className="w-4 h-4 text-success-600" /> : <ToggleLeft className="w-4 h-4 text-sky-ink-3" />}
                </SkyButton>
                <SkyButton type="button" variant="ghost" size="icon" onClick={() => setTplModal({ editing: tpl })} className="w-7 h-7"><Pencil className="w-4 h-4" /></SkyButton>
                <SkyButton type="button" variant="ghost" size="icon" onClick={() => setDelTpl(tpl)} className="w-7 h-7 text-error-500 hover:bg-error-50"><Trash2 className="w-4 h-4" /></SkyButton>
                <ChevronRight className="w-4 h-4 ml-auto text-sky-ink-3" />
              </div>
            </div>
          ))}
        </div>

        {/* Right pane — Questions panel */}
        <SkyCard variant="admin" className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {selectedTpl ? (
            <QuestionsPanel template={selectedTpl} onBack={() => setSelectedTpl(null)} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-sky-ink-3 gap-3">
              <img src="/icon/Item/Scroll/64px/Golden Scroll 1st 64px.png" alt="" className="w-16 h-16 object-contain opacity-20" />
              <p className="font-bold text-lg text-sky-ink-2">{t('admin.questionnaire.selectTemplate')}</p>
              <p className="text-sm">{t('admin.questionnaire.selectTemplateHint')}</p>
            </div>
          )}
        </SkyCard>
      </div>

      {/* Modals */}
      {tplModal !== null && <TemplateFormModal editing={tplModal.editing} onSave={handleSaveTpl} onClose={() => setTplModal(null)} />}
      {delTpl && <ConfirmDeleteModal title={t('admin.questionnaire.deleteModal.deleteTemplate')} body={t('admin.questionnaire.deleteModal.deleteTemplateBody', { name: delTpl.templateName })} loading={delLoading} onConfirm={handleDelete} onCancel={() => setDelTpl(null)} />}
    </div>
  );
}

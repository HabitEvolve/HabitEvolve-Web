import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus, Pencil, Trash2, ChevronRight, X,
  Loader2, ToggleLeft, ToggleRight, HelpCircle, List, CheckSquare,
  Hash, AlignLeft, Star, ChevronDown, ChevronUp, Clock, Timer,
  ShieldAlert, AlertTriangle, Check, Minus, ScrollText, FileQuestion,
  Asterisk, ListTree, Layers,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import PageHeader from '../components/common/PageHeader';
import { adminGoalApi } from '../api/adminGoalApi';
import SkyCard from '../components/ui/card/SkyCard';
import SkyButton from '../components/ui/button/SkyButton';
import {
  QuestionnaireTemplateDto, QuestionnaireTemplatePayload,
  QuestionDto, QuestionOptionDto, QuestionType,
} from '../types/adminGoal.types';

// ─── Tone taxonomy ────────────────────────────────────────────────────────────
// One hue per meaning. teal is spent only on a state that is genuinely live
// (template active), rose only on failure or a destructive control, peach on
// "a human must supply this" (required, unsaved, precondition), violet on the
// questionnaire/template concept, deep on the operational default.
type Tone = 'deep' | 'cool' | 'peach' | 'violet' | 'teal' | 'rose' | 'neutral';
const TONE: Record<Tone, { chip: string; wash: string; rail: string }> = {
  deep:    { chip: 'bg-sky-deep/12 ring-sky-deep/22 text-sky-deep',            wash: 'bg-sky-deep/8',    rail: 'bg-sky-deep' },
  cool:    { chip: 'bg-sky-deep-lo/14 ring-sky-deep-lo/24 text-sky-deep-lo',   wash: 'bg-sky-deep-lo/9', rail: 'bg-sky-deep-lo' },
  peach:   { chip: 'bg-sky-peach/20 ring-sky-peach/32 text-sky-peach-deep',    wash: 'bg-sky-peach/14',  rail: 'bg-sky-peach' },
  violet:  { chip: 'bg-sky-violet/14 ring-sky-violet/26 text-sky-violet-deep', wash: 'bg-sky-violet/10', rail: 'bg-sky-violet' },
  teal:    { chip: 'bg-sky-teal-bg ring-sky-teal/26 text-sky-teal',            wash: 'bg-sky-teal/10',   rail: 'bg-sky-teal' },
  rose:    { chip: 'bg-sky-rose/14 ring-sky-rose/26 text-sky-rose-deep',       wash: 'bg-sky-rose/10',   rail: 'bg-sky-rose' },
  neutral: { chip: 'bg-white/72 ring-white/85 text-sky-ink-2',                 wash: 'bg-white/48',      rail: 'bg-sky-ink/22' },
};

// ─── Style helpers ────────────────────────────────────────────────────────────
const eyebrow = 'text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3';
const fieldLabel = `block mb-1.5 ${eyebrow}`;
const hintCls = 'mt-1.5 text-[10px] font-medium text-sky-ink-3';

const inputCls = [
  'w-full px-3.5 py-2.5 rounded-sky-chip bg-white/70 ring-1 ring-white/80',
  'text-sky-ink text-sm font-medium transition-shadow',
  'focus:outline-none focus:ring-2 focus:ring-sky-deep/45',
  'placeholder:text-sky-ink-3',
].join(' ');

const overlayCls = 'fixed inset-0 bg-sky-abyss/45 backdrop-blur-md z-50 flex items-center justify-center p-4';

// A modal header that only varies by tone, so an operator learns the layout once
// and then reads the accent to know which object they are editing.
const ModalHead = ({
  Icon, eyebrowText, title, tone, onClose,
}: {
  Icon: LucideIcon; eyebrowText: string; title: string; tone: Tone; onClose: () => void;
}) => (
  <div className={`relative flex items-center gap-3 overflow-hidden border-b border-white/65 px-5 py-4 ${TONE[tone].wash}`}>
    <span className={`absolute left-0 top-0 h-full w-[3px] ${TONE[tone].rail}`} aria-hidden="true" />
    <span className={`grid place-items-center w-10 h-10 shrink-0 rounded-sky-chip ring-1 ${TONE[tone].chip}`}>
      <Icon className="w-5 h-5" strokeWidth={2.2} aria-hidden="true" />
    </span>
    <div className="flex-1 min-w-0">
      <p className={eyebrow}>{eyebrowText}</p>
      <h2 className="truncate font-display text-base font-semibold leading-tight text-sky-ink">{title}</h2>
    </div>
    <SkyButton type="button" variant="ghost" size="icon" onClick={onClose} className="shrink-0" aria-label="Close">
      <X className="w-5 h-5" />
    </SkyButton>
  </div>
);

// Validation failures are the operator's own input being rejected, so they take
// rose with a rail — the same shape every error banner in the console uses.
const ErrorNote = ({ children }: { children: React.ReactNode }) => (
  <p className="relative flex items-start gap-2 overflow-hidden rounded-sky-chip bg-sky-rose/10 pl-4 pr-3 py-2 text-xs font-semibold text-sky-rose-deep">
    <span className="absolute left-0 top-0 h-full w-[3px] bg-sky-rose" aria-hidden="true" />
    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" strokeWidth={2.5} aria-hidden="true" />
    <span className="min-w-0">{children}</span>
  </p>
);

// Pill switch — same shape/motion as the toggles used on the Task Library and
// Daily Boss forms elsewhere in Admin, so "on/off" reads identically everywhere.
// Peach (not teal) on: this file's TONE reserves teal for "genuinely live", and
// Required isn't that — it's the same peach that already marks the badge below.
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    aria-pressed={checked}
    className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${checked ? 'bg-sky-peach' : 'bg-sky-ink/15'}`}
  >
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

const QUESTION_TYPES: { value: QuestionType; label: string; Icon: LucideIcon }[] = [
  { value: 'SingleChoice',   label: 'Single Choice',   Icon: CheckSquare },
  { value: 'MultipleChoice', label: 'Multiple Choice', Icon: List },
  { value: 'NumberInput',    label: 'Number Input',    Icon: Hash },
  { value: 'TextInput',      label: 'Text Input',      Icon: AlignLeft },
  { value: 'RatingScale',    label: 'Rating Scale',    Icon: Star },
  { value: 'YesNo',          label: 'Yes / No',        Icon: HelpCircle },
  { value: 'Time',           label: 'Time of Day',     Icon: Clock },
  { value: 'Duration',       label: 'Duration',        Icon: Timer },
];
const CHOICE_TYPES: QuestionType[] = ['SingleChoice', 'MultipleChoice'];
const isChoiceType = (t: QuestionType) => CHOICE_TYPES.includes(t);

// Question types where a Min/Max answer range is meaningful (see BE Question.MinValue/MaxValue).
const RANGE_TYPES: QuestionType[] = ['NumberInput', 'RatingScale', 'Duration'];
const isRangeType = (t: QuestionType) => RANGE_TYPES.includes(t);

/** "HH:mm" → minutes-since-midnight, matching BE TimeOfDayHelper.ParseMinutes exactly. */
function timeToMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** minutes-since-midnight → "HH:mm", matching BE TimeOfDayHelper.FormatMinutes. */
function minutesToTime(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

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
      <div className={overlayCls}>
        <SkyCard variant="admin" className="modal-content w-full max-w-sm sky-in">
          {/* Deleting can't be undone, so the warning is plated and the thing
              being deleted is named in the body — and Cancel stays on the left,
              where the eye lands first. */}
          <div className="flex items-start gap-3 mb-3">
            <span className="grid place-items-center w-10 h-10 shrink-0 rounded-sky-chip bg-sky-rose/12 ring-1 ring-sky-rose/24 text-sky-rose-deep">
              <ShieldAlert className="w-5 h-5" strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className={eyebrow}>Irreversible</p>
              <h3 className="font-display text-base font-semibold leading-tight text-sky-ink">{title}</h3>
            </div>
          </div>
          <p className="mb-6 rounded-sky-chip bg-white/58 ring-1 ring-white/80 px-3.5 py-2.5 text-sm font-medium text-sky-ink-2">{body}</p>
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
      <div className={overlayCls}>
        <SkyCard variant="admin" className="modal-content p-0 overflow-hidden w-full max-w-md sky-in">
          <ModalHead
            Icon={ScrollText}
            eyebrowText="Template"
            title={editing ? t('admin.questionnaire.templateForm.editTitle') : t('admin.questionnaire.templateForm.newTitle')}
            tone="violet"
            onClose={onClose}
          />
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {err && <ErrorNote>{err}</ErrorNote>}
            <div>
              <label className={fieldLabel}>{t('admin.questionnaire.templateForm.nameLabel')}</label>
              <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder={t('admin.questionnaire.templateForm.namePlaceholder')} required />
            </div>
            <div>
              <label className={fieldLabel}>{t('admin.questionnaire.templateForm.descLabel')}</label>
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
  // Range inputs — numeric for NumberInput/RatingScale/Duration, "HH:mm" strings for Time
  // (converted to minutes-since-midnight on submit, matching BE Question.MinValue/MaxValue).
  const [minValue, setMinValue] = useState(editing?.minValue != null ? String(editing.minValue) : '');
  const [maxValue, setMaxValue] = useState(editing?.maxValue != null ? String(editing.maxValue) : '');
  const [minTime, setMinTime] = useState(editing?.minValue != null ? minutesToTime(editing.minValue) : '');
  const [maxTime, setMaxTime] = useState(editing?.maxValue != null ? minutesToTime(editing.maxValue) : '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // Live cross-field check — recomputed every render so the operator sees the
  // conflict the moment either bound goes past the other, not just on submit.
  const rangeInvalid = type === 'Time'
    ? !!minTime && !!maxTime && (timeToMinutes(minTime) ?? 0) > (timeToMinutes(maxTime) ?? 0)
    : isRangeType(type) && minValue.trim() !== '' && maxValue.trim() !== '' && Number(minValue) > Number(maxValue);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) { setErr(t('admin.questionnaire.questionForm.textRequired')); return; }

    let min: number | null = null;
    let max: number | null = null;
    if (type === 'Time') {
      min = minTime ? timeToMinutes(minTime) : null;
      max = maxTime ? timeToMinutes(maxTime) : null;
    } else if (isRangeType(type)) {
      min = minValue.trim() === '' ? null : Number(minValue);
      max = maxValue.trim() === '' ? null : Number(maxValue);
    }
    if (min != null && max != null && min > max) {
      setErr(t('admin.questionnaire.questionForm.rangeInvalid'));
      return;
    }

    setSaving(true); setErr('');
    const payload = editing
      ? { questionId: editing.questionId, questionText: text.trim(), questionType: type, isRequired: required, displayOrder: order, minValue: min, maxValue: max }
      : { templateId, questionText: text.trim(), questionType: type, isRequired: required, displayOrder: order, minValue: min, maxValue: max };
    try { await onSave(payload); }
    catch (ex: any) { alert.error(ex?.response?.data?.message ?? 'Save failed.'); }
    finally { setSaving(false); }
  };

  return (
    <Portal>
      <div className={overlayCls}>
        <SkyCard variant="admin" className="modal-content p-0 overflow-hidden w-full max-w-lg sky-in">
          <ModalHead
            Icon={FileQuestion}
            eyebrowText="Question"
            title={editing ? t('admin.questionnaire.questionForm.editTitle') : t('admin.questionnaire.questionForm.newTitle')}
            tone="deep"
            onClose={onClose}
          />
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {err && <ErrorNote>{err}</ErrorNote>}
            <div>
              <label className={fieldLabel}>{t('admin.questionnaire.questionForm.textLabel')}</label>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={2} className={inputCls} placeholder={t('admin.questionnaire.questionForm.textPlaceholder')} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={fieldLabel}>{t('admin.questionnaire.questionForm.typeLabel')}</label>
                <select value={type} onChange={e => setType(e.target.value as QuestionType)} className={inputCls}>
                  {QUESTION_TYPES.map(qt => <option key={qt.value} value={qt.value}>{t(`admin.questionnaire.questionTypes.${qt.value}`)}</option>)}
                </select>
              </div>
              <div>
                <label className={fieldLabel}>{t('admin.questionnaire.questionForm.orderLabel')}</label>
                <input type="number" min={1} value={order} onChange={e => setOrder(Number(e.target.value))} className={inputCls} />
              </div>
            </div>
            {/* The answer range only exists for some question types, so when it
                appears it appears as its own plated group — otherwise it looks
                like two stray fields that showed up unannounced. */}
            {type === 'Time' ? (
              <div className="rounded-sky-md bg-white/50 ring-1 ring-white/76 p-3.5">
                <p className={`inline-flex items-center gap-1.5 mb-2.5 ${eyebrow}`}>
                  <Clock className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" /> Answer range
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={fieldLabel}>{t('admin.questionnaire.questionForm.minTimeLabel')}</label>
                    <input type="time" value={minTime} onChange={e => setMinTime(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={fieldLabel}>{t('admin.questionnaire.questionForm.maxTimeLabel')}</label>
                    <input type="time" value={maxTime} onChange={e => setMaxTime(e.target.value)} className={inputCls} />
                  </div>
                </div>
                {rangeInvalid
                  ? <p className="mt-1.5 text-[10px] font-semibold text-sky-rose-deep">{t('admin.questionnaire.questionForm.rangeInvalid')}</p>
                  : <p className={hintCls}>{t('admin.questionnaire.questionForm.rangeHint')}</p>}
              </div>
            ) : isRangeType(type) ? (
              <div className="rounded-sky-md bg-white/50 ring-1 ring-white/76 p-3.5">
                <p className={`inline-flex items-center gap-1.5 mb-2.5 ${eyebrow}`}>
                  <Hash className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" /> Answer range
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={fieldLabel}>{t('admin.questionnaire.questionForm.minLabel')}</label>
                    <input type="number" value={minValue} onChange={e => setMinValue(e.target.value)} className={`${inputCls} tabular-nums`} placeholder="—" />
                  </div>
                  <div>
                    <label className={fieldLabel}>{t('admin.questionnaire.questionForm.maxLabel')}</label>
                    <input type="number" value={maxValue} onChange={e => setMaxValue(e.target.value)} className={`${inputCls} tabular-nums`} placeholder="—" />
                  </div>
                </div>
                {rangeInvalid
                  ? <p className="mt-1.5 text-[10px] font-semibold text-sky-rose-deep">{t('admin.questionnaire.questionForm.rangeInvalid')}</p>
                  : <p className={hintCls}>{t('admin.questionnaire.questionForm.rangeHint')}</p>}
              </div>
            ) : null}
            {/* Whether an answer is mandatory changes what the app does at runtime,
                so the toggle gets its own plated row and states its state in
                words as well as by the switch position. */}
            <div className="flex items-center gap-3 rounded-sky-chip bg-white/55 ring-1 ring-white/78 px-3.5 py-2.5">
              <Toggle checked={required} onChange={setRequired} />
              <span className="flex-1 text-sm font-semibold text-sky-ink">{t('admin.questionnaire.questionForm.requiredLabel')}</span>
              <span className={`shrink-0 rounded-sky-chip ring-1 px-2 py-0.5 text-[10px] font-semibold ${required ? TONE.peach.chip : TONE.neutral.chip}`}>
                {required ? 'Required' : 'Optional'}
              </span>
            </div>
            <div className="flex gap-3 pt-2">
              <SkyButton type="button" variant="secondary" onClick={onClose} className="flex-1">{t('admin.questionnaire.questionForm.cancel')}</SkyButton>
              <SkyButton type="submit" variant="primary" disabled={saving || rangeInvalid} className="flex-1">
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
      <div className={overlayCls}>
        <SkyCard variant="admin" className="modal-content p-0 overflow-hidden w-full max-w-sm sky-in">
          <ModalHead
            Icon={ListTree}
            eyebrowText="Answer option"
            title={editing ? t('admin.questionnaire.optionForm.editTitle') : t('admin.questionnaire.optionForm.newTitle')}
            tone="cool"
            onClose={onClose}
          />
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {err && <ErrorNote>{err}</ErrorNote>}
            <div>
              <label className={fieldLabel}>{t('admin.questionnaire.optionForm.displayLabel')}</label>
              <input value={text} onChange={e => setText(e.target.value)} className={inputCls} placeholder={t('admin.questionnaire.optionForm.displayPlaceholder')} required />
            </div>
            <div>
              <label className={fieldLabel}>{t('admin.questionnaire.optionForm.valueLabel')}</label>
              {/* The stored value is what the backend keys off, so it is typed in
                  a mono face — a trailing space or a case slip has to be visible. */}
              <input value={value} onChange={e => setValue(e.target.value)} className={`${inputCls} font-mono`} placeholder={t('admin.questionnaire.optionForm.valuePlaceholder')} required />
              <p className={hintCls}>{t('admin.questionnaire.optionForm.valueHint')}</p>
            </div>
            <div>
              <label className={fieldLabel}>{t('admin.questionnaire.optionForm.orderLabel')}</label>
              <input type="number" min={1} value={order} onChange={e => setOrder(Number(e.target.value))} className={`${inputCls} tabular-nums`} />
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
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <p className={`inline-flex items-center gap-1.5 ${eyebrow}`}>
          <ListTree className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" />
          {t('admin.questionnaire.optionsLabel')}
          <span className="rounded-[7px] bg-white/72 ring-1 ring-white/85 px-1.5 tabular-nums text-sky-ink-2">{sorted.length}</span>
        </p>
        <SkyButton type="button" variant="secondary" size="sm" onClick={() => setOptModal({ editing: null })}>
          <Plus className="w-3 h-3" /> {t('admin.questionnaire.optionForm.add')}
        </SkyButton>
      </div>
      {sorted.length === 0 ? (
        <p className="rounded-sky-chip border border-dashed border-sky-ink/18 bg-white/38 py-3 text-center text-xs font-medium italic text-sky-ink-3">{t('admin.questionnaire.noOptions')}</p>
      ) : (
        <div className="space-y-1.5">
          {sorted.map(opt => (
            /* Options are ordered data, so the order number is a plated numeral
               at a fixed width — a ragged list of "#1 #2 #10" is unscannable. */
            <div key={opt.optionId} className="group flex items-center gap-2.5 rounded-sky-chip bg-white/62 ring-1 ring-white/80 px-3 py-2 transition-colors hover:bg-white/78">
              <span className="grid place-items-center w-6 h-6 shrink-0 rounded-[8px] bg-sky-deep/10 ring-1 ring-sky-deep/20 font-display text-[10px] font-semibold text-sky-deep tabular-nums">{opt.displayOrder}</span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-semibold text-sky-ink">{opt.optionText}</p>
                <p className="truncate font-mono text-[10px] font-medium text-sky-ink-3">{opt.optionValue}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1 opacity-45 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <SkyButton type="button" variant="ghost" size="icon" onClick={() => setOptModal({ editing: opt })} className="w-6 h-6" aria-label={`Edit option ${opt.optionText}`}><Pencil className="w-3 h-3" /></SkyButton>
                <SkyButton type="button" variant="ghost" size="icon" onClick={() => setDelOpt(opt)} className="w-6 h-6 text-sky-rose-deep hover:bg-sky-rose/12" aria-label={`Delete option ${opt.optionText}`}><Trash2 className="w-3 h-3" /></SkyButton>
              </div>
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
        <ChevronRight className="w-4 h-4 text-sky-ink-3" aria-hidden="true" />
        <span className="max-w-xs truncate font-display text-sm font-semibold text-sky-ink">{template.templateName}</span>
        {/* Live-or-not is a real state, so it takes teal with a tick and off takes
            neutral with a dash — never a red/green pair. */}
        <span className={`inline-flex items-center gap-1 rounded-sky-chip ring-1 px-2 py-0.5 text-[10px] font-semibold ${template.isActive ? TONE.teal.chip : TONE.neutral.chip}`}>
          {template.isActive
            ? <Check className="w-2.5 h-2.5" strokeWidth={3} aria-hidden="true" />
            : <Minus className="w-2.5 h-2.5" strokeWidth={3} aria-hidden="true" />}
          {template.isActive ? t('admin.questionnaire.statusActive') : t('admin.questionnaire.statusInactive')}
        </span>
        <SkyButton type="button" variant="primary" size="sm" onClick={() => setQModal({ editing: null })} className="ml-auto">
          <Plus className="w-4 h-4" /> {t('admin.questionnaire.addQuestion')}
        </SkyButton>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-3 sky-stagger">
        {loading ? (
          <div className="flex items-center gap-2 justify-center py-10 text-sm font-medium text-sky-ink-3"><Loader2 className="w-5 h-5 animate-spin" /> {t('admin.questionnaire.loading')}</div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-sky-card border border-dashed border-sky-ink/15 bg-white/38 py-12">
            <span className="grid place-items-center w-14 h-14 rounded-sky-md bg-white/72 ring-1 ring-white/85 text-sky-ink-3">
              <FileQuestion className="w-6 h-6" strokeWidth={1.9} aria-hidden="true" />
            </span>
            <p className="font-display text-sm font-semibold text-sky-ink">{t('admin.questionnaire.noQuestions')}</p>
          </div>
        ) : sorted.map(q => {
          const QIcon = QUESTION_TYPES.find(qt => qt.value === q.questionType)?.Icon ?? HelpCircle;
          const expanded = expandedQ === q.questionId;
          return (
          <SkyCard key={q.questionId} variant="admin" className="p-0 overflow-hidden sky-lift">
            <div className="flex items-start gap-3 p-4">
              {/* Order number and type glyph are one plate: together they say
                  "question 3, a rating scale" in a single glance. */}
              <span className="grid place-items-center w-7 h-7 shrink-0 rounded-[10px] bg-white/72 ring-1 ring-white/85 font-display text-[11px] font-semibold text-sky-ink-2 tabular-nums">{q.displayOrder}</span>
              <span className={`grid place-items-center w-7 h-7 shrink-0 rounded-[10px] ring-1 ${TONE.deep.chip}`}>
                <QIcon className="w-3.5 h-3.5" strokeWidth={2.3} aria-hidden="true" />
              </span>
              <div className="flex-1 min-w-0">
                {/* The question text is what an operator reads this list by, so it
                    is the only display-face element in the row. */}
                <p className="font-display text-sm font-semibold leading-snug text-sky-ink">{q.questionText}</p>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className={`inline-flex items-center rounded-sky-chip ring-1 px-2 py-0.5 text-[10px] font-semibold ${TONE.violet.chip}`}>{q.questionType}</span>
                  {/* "Required" is something the answerer must supply — attention,
                      not an error, so it is peach rather than red. */}
                  {q.isRequired && (
                    <span className={`inline-flex items-center gap-0.5 rounded-sky-chip ring-1 px-2 py-0.5 text-[10px] font-semibold ${TONE.peach.chip}`}>
                      <Asterisk className="w-2.5 h-2.5" strokeWidth={3} aria-hidden="true" />
                      {t('admin.questionnaire.requiredBadge')}
                    </span>
                  )}
                  {isChoiceType(q.questionType) && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-ink-3">
                      <ListTree className="w-2.5 h-2.5" strokeWidth={2.6} aria-hidden="true" />
                      <span className="tabular-nums">{q.options.length}</span> option{q.options.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {(q.minValue != null || q.maxValue != null) && (
                    <span className="inline-flex items-center rounded-[7px] bg-white/68 ring-1 ring-white/85 px-1.5 py-0.5 font-mono text-[10px] font-medium text-sky-ink-2 tabular-nums">
                      {q.questionType === 'Time'
                        ? `${q.minValue != null ? minutesToTime(q.minValue) : '…'}–${q.maxValue != null ? minutesToTime(q.maxValue) : '…'}`
                        : `${q.minValue ?? '…'}–${q.maxValue ?? '…'}`}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {isChoiceType(q.questionType) && (
                  <SkyButton type="button" variant="ghost" size="icon" onClick={() => setExpandedQ(expandedQ === q.questionId ? null : q.questionId)} className="w-8 h-8" aria-expanded={expanded} aria-label={expanded ? 'Hide answer options' : 'Show answer options'}>
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </SkyButton>
                )}
                <SkyButton type="button" variant="ghost" size="icon" onClick={() => setQModal({ editing: q })} className="w-8 h-8" aria-label="Edit question"><Pencil className="w-4 h-4" /></SkyButton>
                <SkyButton type="button" variant="ghost" size="icon" onClick={() => setDelQ(q)} className="w-8 h-8 text-sky-rose-deep hover:bg-sky-rose/12" aria-label="Delete question"><Trash2 className="w-4 h-4" /></SkyButton>
              </div>
            </div>
            {isChoiceType(q.questionType) && expanded && (
              /* The options tray is a level deeper than the question, so it is
                  recessed rather than plated — nesting has to be legible. */
              <div className="border-t border-white/65 bg-white/34 px-4 pb-4">
                <OptionsPanel question={q} onRefresh={fetch} />
              </div>
            )}
          </SkyCard>
          );
        })}
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
        /* The flash carries a glyph and a rail as well as a hue, so it is
            readable as "worked" or "failed" without relying on colour. */
        <div className={`sky-in fixed top-4 right-4 z-50 flex items-center gap-2.5 overflow-hidden rounded-sky-chip pl-4 pr-4 py-3 text-sm font-semibold shadow-sky-glass backdrop-blur-md ${alert.type === 'success' ? 'bg-sky-teal-bg/92 text-sky-teal' : 'bg-sky-rose/14 text-sky-rose-deep'}`}>
          <span className={`absolute left-0 top-0 h-full w-[3px] ${alert.type === 'success' ? 'bg-sky-teal' : 'bg-sky-rose'}`} aria-hidden="true" />
          {alert.type === 'success'
            ? <Check className="w-4 h-4 shrink-0" strokeWidth={2.8} aria-hidden="true" />
            : <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />}
          {alert.msg}
        </div>
      )}

      {/* Header */}
      <PageHeader
        icon={<ScrollText className="w-6 h-6" strokeWidth={2.1} aria-hidden="true" />}
        tone="violet"
        eyebrow="Content"
        title={t('admin.questionnaire.pageTitle')}
        description={t('admin.questionnaire.subtitle')}
        actions={
          <SkyButton type="button" variant="primary" onClick={() => setTplModal({ editing: null })}>
            <Plus className="w-4 h-4" /> {t('admin.questionnaire.newTemplate')}
          </SkyButton>
        }
      />

      {/* Body: split pane */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left pane — Template list. min-h-0 is required here: without it a flex
            item with overflow-y-auto has no bounded height to scroll within (its
            min-height defaults to the content size), so a long template list just
            grows past the pane instead of scrolling in place. */}
        <div className="w-72 shrink-0 min-h-0 overflow-y-auto flex flex-col gap-3 pr-1 sky-stagger">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm font-medium text-sky-ink-3"><Loader2 className="w-5 h-5 animate-spin mr-2" /> {t('admin.questionnaire.loading')}</div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-sky-card border border-dashed border-sky-ink/15 bg-white/38 py-12">
              <span className="grid place-items-center w-14 h-14 rounded-sky-md bg-white/72 ring-1 ring-white/85 text-sky-ink-3">
                <Layers className="w-6 h-6" strokeWidth={1.9} aria-hidden="true" />
              </span>
              <p className="font-display text-sm font-semibold text-sky-ink">{t('admin.questionnaire.noTemplates')}</p>
            </div>
          ) : templates.map(tpl => {
            const selected = selectedTpl?.templateId === tpl.templateId;
            return (
            /* Which template is open drives the whole right-hand pane, so the
               selection carries a rail, a lift and a tint — three cues, because
               getting this wrong means editing the wrong questionnaire. */
            <div
              key={tpl.templateId}
              onClick={() => setSelectedTpl(tpl)}
              aria-current={selected ? 'true' : undefined}
              className={`relative cursor-pointer overflow-hidden rounded-sky-card p-4 pl-5 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                selected
                  ? 'bg-sky-deep/10 ring-1 ring-sky-deep/26 shadow-sky-tint'
                  : 'bg-white/58 ring-1 ring-white/78 shadow-sky-tint hover:bg-white/76 hover:-translate-y-px'
              }`}
            >
              <span className={`absolute left-0 top-0 h-full w-[3px] transition-colors ${selected ? 'bg-sky-deep' : 'bg-transparent'}`} aria-hidden="true" />
              <div className="flex items-start justify-between gap-2">
                <p className={`font-display text-sm font-semibold leading-tight ${selected ? 'text-sky-deep' : 'text-sky-ink'}`}>{tpl.templateName}</p>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-sky-chip ring-1 px-2 py-0.5 text-[10px] font-semibold ${tpl.isActive ? TONE.teal.chip : TONE.neutral.chip}`}>
                  {tpl.isActive
                    ? <Check className="w-2.5 h-2.5" strokeWidth={3} aria-hidden="true" />
                    : <Minus className="w-2.5 h-2.5" strokeWidth={3} aria-hidden="true" />}
                  {tpl.isActive ? t('admin.questionnaire.statusActive') : t('admin.questionnaire.statusOff')}
                </span>
              </div>
              {tpl.description && <p className="mt-1.5 line-clamp-2 text-xs font-medium text-sky-ink-2">{tpl.description}</p>}
              <div className="mt-3 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <SkyButton type="button" variant="ghost" size="icon" onClick={() => handleToggle(tpl)} title={tpl.isActive ? 'Deactivate' : 'Activate'} aria-pressed={tpl.isActive} aria-label={tpl.isActive ? 'Deactivate template' : 'Activate template'} className="w-7 h-7">
                  {tpl.isActive ? <ToggleRight className="w-4 h-4 text-sky-teal" /> : <ToggleLeft className="w-4 h-4 text-sky-ink-3" />}
                </SkyButton>
                <SkyButton type="button" variant="ghost" size="icon" onClick={() => setTplModal({ editing: tpl })} className="w-7 h-7" aria-label="Edit template"><Pencil className="w-4 h-4" /></SkyButton>
                <SkyButton type="button" variant="ghost" size="icon" onClick={() => setDelTpl(tpl)} className="w-7 h-7 text-sky-rose-deep hover:bg-sky-rose/12" aria-label="Delete template"><Trash2 className="w-4 h-4" /></SkyButton>
                <ChevronRight className={`ml-auto w-4 h-4 transition-transform ${selected ? 'text-sky-deep translate-x-0.5' : 'text-sky-ink-3'}`} aria-hidden="true" />
              </div>
            </div>
            );
          })}
        </div>

        {/* Right pane — Questions panel */}
        <SkyCard variant="admin" className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {selectedTpl ? (
            <QuestionsPanel template={selectedTpl} onBack={() => setSelectedTpl(null)} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              {/* Nothing picked yet is not an empty list — it's a prompt, so it
                  reads as an invitation rather than as a dead end. */}
              <span className="grid place-items-center w-20 h-20 rounded-sky-md bg-white/62 ring-1 ring-white/82 text-sky-ink-3">
                <ScrollText className="w-9 h-9" strokeWidth={1.7} aria-hidden="true" />
              </span>
              <p className="font-display text-sky-h3 font-semibold text-sky-ink">{t('admin.questionnaire.selectTemplate')}</p>
              <p className="max-w-xs text-sm font-medium text-sky-ink-2">{t('admin.questionnaire.selectTemplateHint')}</p>
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

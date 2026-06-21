import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { adminGoalApi } from '../api/adminGoalApi';
import { adminPracticalTaskApi } from '../api/adminPracticalTaskApi';
import type {
    GoalCategoryDto, GoalCategoryPayload,
    GoalDto, GoalPayload, MeasurementType
} from '../types/adminGoal.types';
import type { PracticalTaskTemplateDto } from '../types/adminPracticalTask.types';

// ── Inline SVG Icons ──────────────────────────────────────────────────────────
const PlusIcon = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>);
const PencilIcon = () => (<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>);
const TrashIcon = () => (<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>);
const ChevronRightIcon = () => (<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>);
const ArrowLeftIcon = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>);
const ListIcon = () => (<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>);
const EyeIcon = () => (<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const EyeOffIcon = () => (<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>);
const XIcon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>);
const SpinnerIcon = () => (<svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>);

// ── Config Maps ───────────────────────────────────────────────────────────────
const MEASUREMENT_CFG: Record<string, { label: string; bg: string; text: string; border: string }> = {
    CHECK_IN:        { label: 'Check-in',       bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-500' },
    COUNTABLE:       { label: 'Countable',      bg: 'bg-blue-100',    text: 'text-blue-800',    border: 'border-blue-500'    },
    FREQUENCY_BASED: { label: 'Frequency',      bg: 'bg-violet-100',  text: 'text-violet-800',  border: 'border-violet-500'  },
    QUALITY_BASED:   { label: 'Quality',        bg: 'bg-orange-100',  text: 'text-orange-800',  border: 'border-orange-500'  },
    SCHEDULE_BASED:  { label: 'Schedule',       bg: 'bg-cyan-100',    text: 'text-cyan-800',    border: 'border-cyan-500'    },
    TIME_BASED:      { label: 'Time-based',     bg: 'bg-rose-100',    text: 'text-rose-800',    border: 'border-rose-500'    },
};
const REC_CFG: Record<string, { label: string; bg: string; text: string }> = {
    MustDo:      { label: '🔥 Must Do',     bg: 'bg-red-100',    text: 'text-red-700'    },
    Recommended: { label: '⭐ Recommended', bg: 'bg-amber-100',  text: 'text-amber-700'  },
    Optional:    { label: '✨ Optional',    bg: 'bg-sky-100',    text: 'text-sky-700'    },
    Bonus:       { label: '💫 Bonus',       bg: 'bg-violet-100', text: 'text-violet-700' },
};
const REPEAT_CFG: Record<string, { label: string; bg: string; text: string }> = {
    DailyRepeatable: { label: 'Daily',    bg: 'bg-green-100',  text: 'text-green-700'  },
    Rotatable:       { label: 'Rotate',   bg: 'bg-blue-100',   text: 'text-blue-700'   },
    Optional:        { label: 'Optional', bg: 'bg-gray-100',   text: 'text-gray-600'   },
    Bonus:           { label: 'Bonus',    bg: 'bg-purple-100', text: 'text-purple-700' },
};
const MEASUREMENT_TYPES: MeasurementType[] = [
    'CHECK_IN', 'COUNTABLE', 'FREQUENCY_BASED', 'QUALITY_BASED', 'SCHEDULE_BASED', 'TIME_BASED'
];

// ── Input & Label helpers ─────────────────────────────────────────────────────
const Label: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
    <label className="block text-sm font-black text-[#1A1D20] mb-1">
        {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
);
const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input {...props} className={`w-full border-2 border-black rounded-xl px-3 py-2 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 disabled:bg-gray-100 disabled:text-gray-500 ${props.className ?? ''}`} />
);
const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <select {...props} className={`w-full border-2 border-black rounded-xl px-3 py-2 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-black ${props.className ?? ''}`} />
);
const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
    <textarea {...props} className={`w-full border-2 border-black rounded-xl px-3 py-2 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400 resize-none ${props.className ?? ''}`} />
);

// ── Portal Modal Wrapper ──────────────────────────────────────────────────────
const GameModal: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) =>
    createPortal(
        <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div onClick={e => e.stopPropagation()}>{children}</div>
        </div>,
        document.body
    );

// ── Category Form Modal ───────────────────────────────────────────────────────
interface CatModalProps {
    mode: 'create' | 'edit';
    initial?: GoalCategoryDto;
    onClose: () => void;
    onSuccess: (msg: string) => void;
}
const CategoryFormModal: React.FC<CatModalProps> = ({ mode, initial, onClose, onSuccess }) => {
    const [form, setForm] = useState<GoalCategoryPayload>({
        categoryCode: initial?.categoryCode ?? '',
        categoryName: initial?.categoryName ?? '',
        description: initial?.description ?? '',
        iconCode: initial?.iconCode ?? '',
        displayOrder: initial?.displayOrder ?? 1,
        isActive: initial?.isActive ?? true,
    });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');

    const set = (k: keyof GoalCategoryPayload, v: unknown) =>
        setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async () => {
        if (!form.categoryCode.trim() || !form.categoryName.trim()) { setErr('Code and Name are required.'); return; }
        setSaving(true); setErr('');
        try {
            if (mode === 'create') {
                await adminGoalApi.createCategory(form);
            } else {
                await adminGoalApi.updateCategory(initial!.categoryId, form);
            }
            onSuccess(mode === 'create' ? 'Category created!' : 'Category updated!');
            onClose();
        } catch {
            setErr('Operation failed. Please try again.');
        } finally { setSaving(false); }
    };

    return (
        <GameModal onClose={onClose}>
            <div className="bg-[#FFFBEB] border-4 border-black rounded-2xl shadow-[6px_6px_0_0_#1A1D20] w-[480px] max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b-4 border-black bg-[#FDE68A]">
                    <h2 className="text-lg font-black text-[#1A1D20]">
                        {mode === 'create' ? '➕ New Category' : '✏️ Edit Category'}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/10 transition-colors"><XIcon /></button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    {err && <p className="text-sm text-red-600 font-bold bg-red-50 border-2 border-red-300 rounded-xl px-3 py-2">{err}</p>}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label required>Category Code</Label>
                            <Input value={form.categoryCode} onChange={e => set('categoryCode', e.target.value)}
                                placeholder="e.g. HEALTH" disabled={mode === 'edit'} />
                            {mode === 'edit' && <p className="text-xs text-gray-400 mt-1">Code cannot be changed after creation.</p>}
                        </div>
                        <div>
                            <Label>Icon Code</Label>
                            <Input value={form.iconCode ?? ''} onChange={e => set('iconCode', e.target.value)} placeholder="e.g. 🏃" />
                        </div>
                    </div>
                    <div>
                        <Label required>Category Name</Label>
                        <Input value={form.categoryName} onChange={e => set('categoryName', e.target.value)} placeholder="Display name" />
                    </div>
                    <div>
                        <Label>Description</Label>
                        <Textarea value={form.description ?? ''} onChange={e => set('description', e.target.value)} rows={3} placeholder="Optional description…" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label required>Display Order</Label>
                            <Input type="number" min={0} value={form.displayOrder} onChange={e => set('displayOrder', Number(e.target.value))} />
                        </div>
                        <div className="flex items-end pb-0.5">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <div className={`w-10 h-6 rounded-full border-2 border-black transition-colors ${form.isActive ? 'bg-emerald-400' : 'bg-gray-200'}`}
                                    onClick={() => set('isActive', !form.isActive)}>
                                    <div className={`w-4 h-4 rounded-full bg-white border-2 border-black m-0.5 transition-transform ${form.isActive ? 'translate-x-4' : ''}`} />
                                </div>
                                <span className="text-sm font-black">{form.isActive ? 'Active' : 'Inactive'}</span>
                            </label>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 border-t-4 border-black flex gap-3 justify-end">
                    <button onClick={onClose} className="px-4 py-2 border-2 border-black rounded-xl text-sm font-black bg-white hover:bg-gray-50 transition-colors">Cancel</button>
                    <button onClick={handleSubmit} disabled={saving}
                        className="px-5 py-2 border-2 border-black rounded-xl text-sm font-black bg-[#FDE68A] shadow-[3px_3px_0_0_#1A1D20] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#1A1D20] transition-all disabled:opacity-50 flex items-center gap-2">
                        {saving ? <SpinnerIcon /> : null}
                        {mode === 'create' ? 'Create Category' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </GameModal>
    );
};

// ── Goal Form Modal ───────────────────────────────────────────────────────────
interface GoalModalProps {
    mode: 'create' | 'edit';
    initial?: GoalDto;
    categoryContext: GoalCategoryDto;
    onClose: () => void;
    onSuccess: (msg: string) => void;
}
const GoalFormModal: React.FC<GoalModalProps> = ({ mode, initial, categoryContext, onClose, onSuccess }) => {
    const [form, setForm] = useState<GoalPayload>({
        categoryCode: categoryContext.categoryCode,
        goalCode: initial?.goalCode ?? '',
        goalName: initial?.goalName ?? '',
        measurementType: (initial?.measurementType as MeasurementType) ?? 'CHECK_IN',
        description: initial?.description ?? '',
        displayOrder: initial?.displayOrder ?? 1,
        isActive: initial?.isActive ?? true,
    });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');

    const set = (k: keyof GoalPayload, v: unknown) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async () => {
        if (!form.goalCode.trim() || !form.goalName.trim()) { setErr('Code and Name are required.'); return; }
        setSaving(true); setErr('');
        try {
            if (mode === 'create') {
                await adminGoalApi.createGoal(form);
            } else {
                await adminGoalApi.updateGoal(initial!.goalId, form);
            }
            onSuccess(mode === 'create' ? 'Goal created!' : 'Goal updated!');
            onClose();
        } catch {
            setErr('Operation failed. Please try again.');
        } finally { setSaving(false); }
    };

    return (
        <GameModal onClose={onClose}>
            <div className="bg-[#F0FDF4] border-4 border-black rounded-2xl shadow-[6px_6px_0_0_#1A1D20] w-[520px] max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b-4 border-black bg-[#BBF7D0]">
                    <div>
                        <h2 className="text-lg font-black text-[#1A1D20]">
                            {mode === 'create' ? '➕ New Goal' : '✏️ Edit Goal'}
                        </h2>
                        <p className="text-xs font-bold text-emerald-700">
                            Category: {categoryContext.iconCode} {categoryContext.categoryName}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/10 transition-colors"><XIcon /></button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    {err && <p className="text-sm text-red-600 font-bold bg-red-50 border-2 border-red-300 rounded-xl px-3 py-2">{err}</p>}
                    {/* Category context banner */}
                    <div className="flex items-center gap-2 bg-emerald-50 border-2 border-emerald-300 rounded-xl px-3 py-2">
                        <span className="text-sm font-black text-emerald-700">Category:</span>
                        <span className="text-sm font-mono font-bold bg-emerald-100 border border-emerald-400 rounded-lg px-2 py-0.5">{categoryContext.categoryCode}</span>
                        <span className="text-sm font-bold text-emerald-600">— {categoryContext.categoryName}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label required>Goal Code</Label>
                            <Input value={form.goalCode} onChange={e => set('goalCode', e.target.value)}
                                placeholder="e.g. LOSE_WEIGHT" disabled={mode === 'edit'} />
                            {mode === 'edit' && <p className="text-xs text-gray-400 mt-1">Code is immutable.</p>}
                        </div>
                        <div>
                            <Label required>Measurement Type</Label>
                            <Select value={form.measurementType} onChange={e => set('measurementType', e.target.value as MeasurementType)}>
                                {MEASUREMENT_TYPES.map(t => (
                                    <option key={t} value={t}>{MEASUREMENT_CFG[t]?.label ?? t}</option>
                                ))}
                            </Select>
                        </div>
                    </div>
                    <div>
                        <Label required>Goal Name</Label>
                        <Input value={form.goalName} onChange={e => set('goalName', e.target.value)} placeholder="Display name for players" />
                    </div>
                    <div>
                        <Label>Description</Label>
                        <Textarea value={form.description ?? ''} onChange={e => set('description', e.target.value)} rows={3} placeholder="Optional description…" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label required>Display Order</Label>
                            <Input type="number" min={0} value={form.displayOrder} onChange={e => set('displayOrder', Number(e.target.value))} />
                        </div>
                        <div className="flex items-end pb-0.5">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <div className={`w-10 h-6 rounded-full border-2 border-black transition-colors ${form.isActive ? 'bg-emerald-400' : 'bg-gray-200'}`}
                                    onClick={() => set('isActive', !form.isActive)}>
                                    <div className={`w-4 h-4 rounded-full bg-white border-2 border-black m-0.5 transition-transform ${form.isActive ? 'translate-x-4' : ''}`} />
                                </div>
                                <span className="text-sm font-black">{form.isActive ? 'Active' : 'Inactive'}</span>
                            </label>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 border-t-4 border-black flex gap-3 justify-end">
                    <button onClick={onClose} className="px-4 py-2 border-2 border-black rounded-xl text-sm font-black bg-white hover:bg-gray-50 transition-colors">Cancel</button>
                    <button onClick={handleSubmit} disabled={saving}
                        className="px-5 py-2 border-2 border-black rounded-xl text-sm font-black bg-[#BBF7D0] shadow-[3px_3px_0_0_#1A1D20] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#1A1D20] transition-all disabled:opacity-50 flex items-center gap-2">
                        {saving ? <SpinnerIcon /> : null}
                        {mode === 'create' ? 'Create Goal' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </GameModal>
    );
};

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
interface DeleteModalProps {
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
    onClose: () => void;
}
const DeleteConfirmModal: React.FC<DeleteModalProps> = ({ title, description, onConfirm, onClose }) => {
    const [deleting, setDeleting] = useState(false);
    return (
        <GameModal onClose={onClose}>
            <div className="bg-white border-4 border-black rounded-2xl shadow-[6px_6px_0_0_#1A1D20] w-[400px]">
                <div className="px-6 py-4 border-b-4 border-black bg-red-100">
                    <h3 className="text-lg font-black text-red-800">🗑️ {title}</h3>
                </div>
                <div className="px-6 py-5">
                    <p className="text-sm font-medium text-gray-700">{description}</p>
                    <p className="text-xs font-bold text-red-500 mt-2">This action cannot be undone.</p>
                </div>
                <div className="px-6 py-4 border-t-4 border-black flex gap-3 justify-end">
                    <button onClick={onClose} className="px-4 py-2 border-2 border-black rounded-xl text-sm font-black bg-white hover:bg-gray-50">Cancel</button>
                    <button onClick={async () => { setDeleting(true); await onConfirm(); setDeleting(false); onClose(); }} disabled={deleting}
                        className="px-5 py-2 border-2 border-black rounded-xl text-sm font-black bg-red-400 text-white shadow-[3px_3px_0_0_#1A1D20] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#1A1D20] transition-all disabled:opacity-50 flex items-center gap-2">
                        {deleting ? <SpinnerIcon /> : null} Delete
                    </button>
                </div>
            </div>
        </GameModal>
    );
};

// ── Badge helper ──────────────────────────────────────────────────────────────
const Badge: React.FC<{ bg: string; text: string; border?: string; label: string }> = ({ bg, text, border, label }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border-2 ${border ?? 'border-current'} ${bg} ${text} text-[11px] font-black whitespace-nowrap`}>
        {label}
    </span>
);
const ActiveBadge: React.FC<{ active: boolean }> = ({ active }) => active
    ? <Badge bg="bg-emerald-100" text="text-emerald-700" border="border-emerald-500" label="● Active" />
    : <Badge bg="bg-gray-100" text="text-gray-500" border="border-gray-400" label="○ Inactive" />;

// ── Main Hub Component ────────────────────────────────────────────────────────
type HubLevel = 1 | 2 | 3;

interface Alert { type: 'success' | 'error'; message: string }

const GoalTaskEngineHub: React.FC = () => {
    const [level, setLevel] = useState<HubLevel>(1);
    const [selectedCategory, setSelectedCategory] = useState<GoalCategoryDto | null>(null);
    const [selectedGoal, setSelectedGoal] = useState<GoalDto | null>(null);

    const [categories, setCategories] = useState<GoalCategoryDto[]>([]);
    const [goals, setGoals] = useState<GoalDto[]>([]);
    const [tasks, setTasks] = useState<PracticalTaskTemplateDto[]>([]);

    const [loadingCats, setLoadingCats] = useState(false);
    const [loadingGoals, setLoadingGoals] = useState(false);
    const [loadingTasks, setLoadingTasks] = useState(false);

    // Modal state
    const [catModal, setCatModal] = useState<{ open: boolean; mode: 'create' | 'edit'; data?: GoalCategoryDto }>({ open: false, mode: 'create' });
    const [goalModal, setGoalModal] = useState<{ open: boolean; mode: 'create' | 'edit'; data?: GoalDto }>({ open: false, mode: 'create' });
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; title: string; description: string; onConfirm: () => Promise<void> } | null>(null);

    const [alert, setAlert] = useState<Alert | null>(null);

    const showAlert = (a: Alert) => {
        setAlert(a);
        setTimeout(() => setAlert(null), 3500);
    };

    // ── Fetch functions ────────────────────────────────────────────────────────
    const fetchCategories = useCallback(async () => {
        setLoadingCats(true);
        try {
            const res = await adminGoalApi.getCategories({ activeOnly: false });
            setCategories(res.data ?? []);
        } catch { showAlert({ type: 'error', message: 'Failed to load categories.' }); }
        finally { setLoadingCats(false); }
    }, []);

    const fetchGoals = useCallback(async () => {
        if (!selectedCategory) return;
        setLoadingGoals(true);
        try {
            const res = await adminGoalApi.getGoals({ categoryCode: selectedCategory.categoryCode });
            setGoals(res.data ?? []);
        } catch { showAlert({ type: 'error', message: 'Failed to load goals.' }); }
        finally { setLoadingGoals(false); }
    }, [selectedCategory]);

    const fetchTasks = useCallback(async () => {
        if (!selectedGoal) return;
        setLoadingTasks(true);
        try {
            const res = await adminPracticalTaskApi.getTasks(selectedGoal.goalId);
            setTasks(res.data ?? []);
        } catch { showAlert({ type: 'error', message: 'Failed to load task templates.' }); }
        finally { setLoadingTasks(false); }
    }, [selectedGoal]);

    useEffect(() => { fetchCategories(); }, [fetchCategories]);
    useEffect(() => { if (level === 2) fetchGoals(); }, [level, fetchGoals]);
    useEffect(() => { if (level === 3) fetchTasks(); }, [level, fetchTasks]);

    // ── Navigation ─────────────────────────────────────────────────────────────
    const drillToGoals = (cat: GoalCategoryDto) => {
        setSelectedCategory(cat);
        setGoals([]);
        setLevel(2);
    };
    const drillToTasks = (goal: GoalDto) => {
        setSelectedGoal(goal);
        setTasks([]);
        setLevel(3);
    };
    const backToLevel = (l: HubLevel) => {
        setLevel(l);
        if (l === 1) { setSelectedCategory(null); setSelectedGoal(null); }
        if (l === 2) { setSelectedGoal(null); }
    };

    // ── Breadcrumb ─────────────────────────────────────────────────────────────
    const Breadcrumb = () => {
        if (level === 1) return null;
        return (
            <div className="flex items-center gap-1.5 text-sm font-bold text-[#1A1D20]/60 flex-wrap">
                <button onClick={() => backToLevel(1)} className="font-black text-[#1A1D20] hover:underline underline-offset-2">Categories</button>
                {level >= 2 && selectedCategory && (<>
                    <ChevronRightIcon />
                    {level === 2
                        ? <span className="font-black text-[#1A1D20]">{selectedCategory.iconCode} {selectedCategory.categoryName}</span>
                        : <button onClick={() => backToLevel(2)} className="hover:underline underline-offset-2">{selectedCategory.iconCode} {selectedCategory.categoryName}</button>
                    }
                </>)}
                {level === 3 && selectedGoal && (<>
                    <ChevronRightIcon />
                    <span className="font-black text-[#1A1D20]">{selectedGoal.goalName}</span>
                    <ChevronRightIcon />
                    <span className="font-black text-violet-700">Task Library</span>
                </>)}
            </div>
        );
    };

    // ── Table wrapper ──────────────────────────────────────────────────────────
    const TableWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <div className="border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] overflow-hidden bg-white">
            {children}
        </div>
    );
    const THead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <thead><tr className="bg-[#1A1D20] text-white text-xs font-black uppercase tracking-wider">{children}</tr></thead>
    );
    const TH: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
        <th className={`px-4 py-3 text-left ${className ?? ''}`}>{children}</th>
    );
    const TD: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
        <td className={`px-4 py-3 text-sm ${className ?? ''}`}>{children}</td>
    );

    // ── Level 1: Categories ────────────────────────────────────────────────────
    const Level1 = () => (
        <div>
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="text-2xl font-black text-[#1A1D20]">🗂️ Goal Categories</h2>
                    <p className="text-sm text-[#1A1D20]/60 font-medium mt-0.5">Top-level groupings for all goals</p>
                </div>
                <button onClick={() => setCatModal({ open: true, mode: 'create' })}
                    className="flex items-center gap-2 px-4 py-2.5 border-4 border-black rounded-2xl bg-[#FDE68A] font-black text-sm shadow-[4px_4px_0_0_#1A1D20] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1A1D20] transition-all">
                    <PlusIcon /> New Category
                </button>
            </div>
            <TableWrap>
                <table className="w-full">
                    <THead>
                        <TH>Icon</TH>
                        <TH>Code</TH>
                        <TH>Name</TH>
                        <TH>Order</TH>
                        <TH>Status</TH>
                        <TH className="text-right">Actions</TH>
                    </THead>
                    <tbody>
                        {loadingCats && (
                            <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 font-bold">Loading…</td></tr>
                        )}
                        {!loadingCats && categories.length === 0 && (
                            <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 font-bold">No categories found.</td></tr>
                        )}
                        {categories.map((cat, i) => (
                            <tr key={cat.categoryId} className={`border-t-2 border-black/10 ${i % 2 === 0 ? 'bg-white' : 'bg-amber-50/40'} hover:bg-amber-50 transition-colors`}>
                                <TD><span className="text-2xl">{cat.iconCode || '📁'}</span></TD>
                                <TD>
                                    <span className="font-mono font-black text-xs bg-[#1A1D20] text-white px-2 py-0.5 rounded-lg">{cat.categoryCode}</span>
                                </TD>
                                <TD><span className="font-black text-[#1A1D20]">{cat.categoryName}</span>
                                    {cat.description && <p className="text-xs text-gray-500 font-medium mt-0.5 truncate max-w-xs">{cat.description}</p>}
                                </TD>
                                <TD><span className="font-mono font-bold text-sm">#{cat.displayOrder}</span></TD>
                                <TD><ActiveBadge active={cat.isActive} /></TD>
                                <TD>
                                    <div className="flex items-center gap-2 justify-end">
                                        <button title={cat.isActive ? 'Deactivate' : 'Activate'}
                                            onClick={async () => {
                                                try { await adminGoalApi.toggleCategoryStatus(cat.categoryId, !cat.isActive); fetchCategories(); showAlert({ type: 'success', message: `Category ${!cat.isActive ? 'activated' : 'deactivated'}.` }); }
                                                catch { showAlert({ type: 'error', message: 'Status update failed.' }); }
                                            }}
                                            className="p-1.5 border-2 border-black rounded-lg bg-white hover:bg-gray-100 transition-colors">
                                            {cat.isActive ? <EyeOffIcon /> : <EyeIcon />}
                                        </button>
                                        <button title="Edit" onClick={() => setCatModal({ open: true, mode: 'edit', data: cat })}
                                            className="p-1.5 border-2 border-black rounded-lg bg-white hover:bg-blue-50 transition-colors">
                                            <PencilIcon />
                                        </button>
                                        <button onClick={() => drillToGoals(cat)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-black rounded-xl bg-[#FEF3C7] font-black text-xs shadow-[2px_2px_0_0_#1A1D20] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[0px_0px_0_0_#1A1D20] transition-all whitespace-nowrap">
                                            View Goals <ChevronRightIcon />
                                        </button>
                                    </div>
                                </TD>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableWrap>
        </div>
    );

    // ── Level 2: Goals ─────────────────────────────────────────────────────────
    const Level2 = () => (
        <div>
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="text-2xl font-black text-[#1A1D20]">🎯 Goals</h2>
                    <p className="text-sm text-[#1A1D20]/60 font-medium mt-0.5">
                        Category: <span className="font-black text-emerald-700">{selectedCategory?.iconCode} {selectedCategory?.categoryName}</span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => backToLevel(1)}
                        className="flex items-center gap-1.5 px-3 py-2 border-2 border-black rounded-xl text-sm font-black bg-white hover:bg-gray-50 transition-colors">
                        <ArrowLeftIcon /> Back
                    </button>
                    <button onClick={() => setGoalModal({ open: true, mode: 'create' })}
                        className="flex items-center gap-2 px-4 py-2.5 border-4 border-black rounded-2xl bg-[#BBF7D0] font-black text-sm shadow-[4px_4px_0_0_#1A1D20] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1A1D20] transition-all">
                        <PlusIcon /> New Goal
                    </button>
                </div>
            </div>
            <TableWrap>
                <table className="w-full">
                    <THead>
                        <TH>Code</TH>
                        <TH>Name</TH>
                        <TH>Measurement</TH>
                        <TH>Order</TH>
                        <TH>Status</TH>
                        <TH className="text-right">Actions</TH>
                    </THead>
                    <tbody>
                        {loadingGoals && (
                            <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 font-bold">Loading…</td></tr>
                        )}
                        {!loadingGoals && goals.length === 0 && (
                            <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 font-bold">No goals in this category yet.</td></tr>
                        )}
                        {goals.map((goal, i) => {
                            const mCfg = MEASUREMENT_CFG[goal.measurementType] ?? { label: goal.measurementType, bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-400' };
                            return (
                                <tr key={goal.goalId} className={`border-t-2 border-black/10 ${i % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40'} hover:bg-emerald-50 transition-colors`}>
                                    <TD>
                                        <span className="font-mono font-black text-xs bg-[#1A1D20] text-white px-2 py-0.5 rounded-lg">{goal.goalCode}</span>
                                    </TD>
                                    <TD><span className="font-black text-[#1A1D20]">{goal.goalName}</span>
                                        {goal.description && <p className="text-xs text-gray-500 font-medium mt-0.5 truncate max-w-xs">{goal.description}</p>}
                                    </TD>
                                    <TD><Badge bg={mCfg.bg} text={mCfg.text} border={mCfg.border} label={mCfg.label} /></TD>
                                    <TD><span className="font-mono font-bold text-sm">#{goal.displayOrder}</span></TD>
                                    <TD><ActiveBadge active={goal.isActive} /></TD>
                                    <TD>
                                        <div className="flex items-center gap-2 justify-end">
                                            <button title="Delete" onClick={() => setDeleteModal({
                                                open: true,
                                                title: 'Delete Goal',
                                                description: `Are you sure you want to delete "${goal.goalName}"? All associated task templates will be unlinked.`,
                                                onConfirm: async () => {
                                                    await adminGoalApi.deleteGoal(goal.goalId);
                                                    fetchGoals();
                                                    showAlert({ type: 'success', message: 'Goal deleted.' });
                                                }
                                            })}
                                                className="p-1.5 border-2 border-black rounded-lg bg-white hover:bg-red-50 transition-colors text-red-500">
                                                <TrashIcon />
                                            </button>
                                            <button title="Edit" onClick={() => setGoalModal({ open: true, mode: 'edit', data: goal })}
                                                className="p-1.5 border-2 border-black rounded-lg bg-white hover:bg-blue-50 transition-colors">
                                                <PencilIcon />
                                            </button>
                                            <button onClick={() => drillToTasks(goal)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-black rounded-xl bg-[#EDE9FE] font-black text-xs shadow-[2px_2px_0_0_#1A1D20] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[0px_0px_0_0_#1A1D20] transition-all whitespace-nowrap text-violet-800">
                                                <ListIcon /> Task Library
                                            </button>
                                        </div>
                                    </TD>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </TableWrap>
        </div>
    );

    // ── Level 3: Task Library ──────────────────────────────────────────────────
    const Level3 = () => (
        <div>
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="text-2xl font-black text-[#1A1D20]">📚 Practical Task Library</h2>
                    <p className="text-sm text-[#1A1D20]/60 font-medium mt-0.5">
                        Goal: <span className="font-black text-violet-700">{selectedGoal?.goalName}</span>
                    </p>
                </div>
                <button onClick={() => backToLevel(2)}
                    className="flex items-center gap-1.5 px-3 py-2 border-2 border-black rounded-xl text-sm font-black bg-white hover:bg-gray-50 transition-colors">
                    <ArrowLeftIcon /> Back to Goals
                </button>
            </div>

            <div className="mb-4 flex items-center gap-2 bg-violet-50 border-2 border-violet-300 rounded-2xl px-4 py-3">
                <span className="text-violet-600 font-black text-sm">ℹ️</span>
                <p className="text-sm font-medium text-violet-700">
                    These practical task templates are <strong>system-generated</strong> and bound to this goal's configuration. They are read-only in the admin view.
                </p>
            </div>

            <TableWrap>
                <table className="w-full">
                    <THead>
                        <TH>Code</TH>
                        <TH>Title Template</TH>
                        <TH>Rec. Level</TH>
                        <TH>Role</TH>
                        <TH>Repeat</TH>
                        <TH>DMG</TH>
                        <TH>Gold</TH>
                        <TH>Status</TH>
                    </THead>
                    <tbody>
                        {loadingTasks && (
                            <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400 font-bold">Loading…</td></tr>
                        )}
                        {!loadingTasks && tasks.length === 0 && (
                            <tr><td colSpan={8} className="px-4 py-10 text-center">
                                <p className="text-gray-400 font-bold">No task templates found for this goal.</p>
                                <p className="text-xs text-gray-400 mt-1">Templates are generated through the system seeder.</p>
                            </td></tr>
                        )}
                        {tasks.map((t, i) => {
                            const recCfg = REC_CFG[t.recommendationLevel] ?? { label: t.recommendationLevel, bg: 'bg-gray-100', text: 'text-gray-600' };
                            const repCfg = REPEAT_CFG[t.repeatType] ?? { label: t.repeatType, bg: 'bg-gray-100', text: 'text-gray-600' };
                            return (
                                <tr key={t.templateId} className={`border-t-2 border-black/10 ${i % 2 === 0 ? 'bg-white' : 'bg-violet-50/30'} hover:bg-violet-50 transition-colors`}>
                                    <TD>
                                        <span className="font-mono font-black text-xs bg-[#1A1D20] text-white px-2 py-0.5 rounded-lg">{t.templateCode}</span>
                                    </TD>
                                    <TD>
                                        <div className="max-w-[220px]">
                                            <p className="font-bold text-[#1A1D20] text-xs leading-snug truncate">{t.titleTemplate}</p>
                                            {t.sampleRenderedTask && <p className="text-xs text-gray-400 truncate mt-0.5 italic">{t.sampleRenderedTask}</p>}
                                        </div>
                                    </TD>
                                    <TD><span className={`inline-flex px-2 py-0.5 rounded-lg border-2 border-current ${recCfg.bg} ${recCfg.text} text-[10px] font-black whitespace-nowrap`}>{recCfg.label}</span></TD>
                                    <TD><span className="text-xs font-bold text-[#1A1D20] bg-gray-100 border border-gray-300 rounded-lg px-2 py-0.5">{t.taskRole}</span></TD>
                                    <TD><span className={`inline-flex px-2 py-0.5 rounded-lg border-2 border-current ${repCfg.bg} ${repCfg.text} text-[10px] font-black`}>{repCfg.label}</span></TD>
                                    <TD><span className="font-mono font-black text-orange-600">⚔️ {t.defaultDamage}</span></TD>
                                    <TD><span className="font-mono font-black text-amber-600">🪙 {t.defaultRewardGold}</span></TD>
                                    <TD><ActiveBadge active={t.isActive} /></TD>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {tasks.length > 0 && (
                    <div className="px-4 py-2 border-t-2 border-black/10 bg-gray-50">
                        <p className="text-xs text-gray-500 font-bold">{tasks.length} template{tasks.length !== 1 ? 's' : ''} total</p>
                    </div>
                )}
            </TableWrap>
        </div>
    );

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="p-6 min-h-screen bg-[#F8F5F0]">
            {/* Alert Toast */}
            {alert && createPortal(
                <div className={`fixed top-4 right-4 z-[99998] flex items-center gap-3 px-5 py-3 border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] font-black text-sm transition-all ${alert.type === 'success' ? 'bg-[#BBF7D0] text-emerald-900' : 'bg-red-200 text-red-900'}`}>
                    <span>{alert.type === 'success' ? '✅' : '❌'}</span>
                    {alert.message}
                </div>,
                document.body
            )}

            {/* Page Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 border-4 border-black rounded-2xl bg-[#FDE68A] flex items-center justify-center shadow-[3px_3px_0_0_#1A1D20] text-lg">🎯</div>
                    <h1 className="text-3xl font-black text-[#1A1D20] tracking-tight">Goal & Task Engine</h1>
                </div>
                {level > 1 && (
                    <div className="mt-3 flex items-center gap-2 bg-white border-4 border-black rounded-2xl px-4 py-2.5 shadow-[3px_3px_0_0_#1A1D20] w-fit">
                        <Breadcrumb />
                    </div>
                )}
            </div>

            {/* Level Content */}
            {level === 1 && <Level1 />}
            {level === 2 && <Level2 />}
            {level === 3 && <Level3 />}

            {/* Modals */}
            {catModal.open && (
                <CategoryFormModal
                    mode={catModal.mode}
                    initial={catModal.data}
                    onClose={() => setCatModal(s => ({ ...s, open: false }))}
                    onSuccess={(msg) => { showAlert({ type: 'success', message: msg }); fetchCategories(); }}
                />
            )}
            {goalModal.open && selectedCategory && (
                <GoalFormModal
                    mode={goalModal.mode}
                    initial={goalModal.data}
                    categoryContext={selectedCategory}
                    onClose={() => setGoalModal(s => ({ ...s, open: false }))}
                    onSuccess={(msg) => { showAlert({ type: 'success', message: msg }); fetchGoals(); }}
                />
            )}
            {deleteModal?.open && (
                <DeleteConfirmModal
                    title={deleteModal.title}
                    description={deleteModal.description}
                    onConfirm={deleteModal.onConfirm}
                    onClose={() => setDeleteModal(null)}
                />
            )}
        </div>
    );
};

export default GoalTaskEngineHub;

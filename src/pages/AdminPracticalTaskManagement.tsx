import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { useAlert } from "../context/AlertContext";
import { adminPracticalTaskApi } from "../api/adminPracticalTaskApi";
import { adminGoalApi } from "../api/adminGoalApi";
import { useTableFilters } from "../hooks/useTableFilters";
import { TableFilterBar } from "../components/common/TableFilterBar";
import type { FilterField } from "../hooks/useTableFilters";
import type {
  PracticalTaskDto,
  PracticalTaskPayload,
  VerificationType,
} from "../types/adminPracticalTask.types";
import type { GoalDto } from "../types/adminGoal.types";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;
const VERIFICATION_TYPES: VerificationType[] = ["GPS", "PHOTO", "NONE"];

// ── FILTER TYPES ──────────────────────────────────────────────────────────────
type TaskFilters = { search: string; isActive: string };
const INITIAL_FILTERS: TaskFilters = { search: "", isActive: "" };

const FILTER_FIELDS: FilterField[] = [
  { key: "search", label: "Search", type: "text", placeholder: "Search by title…" },
  {
    key: "isActive", label: "Status", type: "select", options: [
      { label: "Active", value: "true" },
      { label: "Inactive", value: "false" },
    ],
  },
];

// ── SHARED STYLES ─────────────────────────────────────────────────────────────
const btnBase =
  "inline-flex items-center gap-2 px-4 py-2 font-black text-sm border-2 border-black rounded-full " +
  "shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 " +
  "disabled:shadow-[3px_3px_0_0_#1A1D20] transition-all";

const inputCls =
  "w-full px-4 py-2.5 border-2 border-black rounded-2xl text-sm font-medium bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder:text-gray-400";

// ── HELPERS ───────────────────────────────────────────────────────────────────
const errMsg = (err: unknown) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

// ── VERIFICATION TYPE BADGE ───────────────────────────────────────────────────
const VerificationBadge = ({ type }: { type: VerificationType }) => {
  const styles: Record<string, string> = {
    GPS: "bg-blue-100 border-blue-400 text-blue-800",
    PHOTO: "bg-purple-100 border-purple-400 text-purple-800",
    NONE: "bg-gray-100 border-gray-400 text-gray-600",
  };
  const icons: Record<string, string> = { GPS: "📍", PHOTO: "📷", NONE: "—" };
  const cls = styles[type] ?? "bg-gray-100 border-gray-400 text-gray-600";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black border-2 ${cls}`}>
      <span>{icons[type] ?? "?"}</span>
      {type}
    </span>
  );
};

// ── ACTIVE PILL ───────────────────────────────────────────────────────────────
const ActivePill = ({ isActive }: { isActive: boolean }) => (
  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border-2 ${isActive
    ? "bg-green-100 border-green-400 text-green-800"
    : "bg-gray-100 border-gray-400 text-gray-500"
    }`}>
    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? "bg-green-500" : "bg-gray-400"}`} />
    {isActive ? "Active" : "Inactive"}
  </span>
);

// ── TOGGLE ────────────────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    aria-pressed={checked}
    className={`relative flex-shrink-0 w-12 h-6 rounded-full border-2 border-black transition-colors shadow-[2px_2px_0_0_#1A1D20] ${checked ? "bg-emerald-400" : "bg-gray-300"}`}
  >
    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full border-2 border-black bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-0"}`} />
  </button>
);

// ── SPINNER ───────────────────────────────────────────────────────────────────
const Spinner = ({ size = 20 }: { size?: number }) => (
  <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// ── ICONS ─────────────────────────────────────────────────────────────────────
const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const ChevronLeft = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const ChevronRight = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const SaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
  </svg>
);
const ClipboardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
  </svg>
);
const TargetIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
  </svg>
);

// ── SKELETON ROW ──────────────────────────────────────────────────────────────
const SkeletonRow = ({ cells }: { cells: number }) => (
  <tr className="border-b-2 border-gray-100 animate-pulse">
    {Array.from({ length: cells }).map((_, i) => (
      <td key={i} className="px-4 py-4">
        <div className="h-4 bg-gray-200 rounded-full" style={{ width: `${48 + (i % 4) * 28}px` }} />
      </td>
    ))}
  </tr>
);

// ── PAGINATION BAR ────────────────────────────────────────────────────────────
const PaginationBar = ({
  page, hasMore, loading, onPrev, onNext,
}: {
  page: number; hasMore: boolean; loading: boolean;
  onPrev: () => void; onNext: () => void;
}) => (
  <div className="flex items-center justify-between px-6 py-4 border-t-2 border-gray-100 bg-gray-50/50">
    <button onClick={onPrev} disabled={page === 1 || loading} className={`${btnBase} bg-white text-gray-700`}>
      <ChevronLeft /> Previous
    </button>
    <span className="text-sm font-black text-gray-600 border-2 border-black rounded-full px-4 py-1.5 bg-white shadow-[2px_2px_0_0_#1A1D20]">
      Page {page}
    </span>
    <button onClick={onNext} disabled={!hasMore || loading} className={`${btnBase} bg-white text-gray-700`}>
      Next <ChevronRight />
    </button>
  </div>
);

// ── GAME MODAL (portal) ───────────────────────────────────────────────────────
const GameModal = ({
  title, onClose, children, maxWidth = "max-w-lg",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) => createPortal(
  <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div className={`relative w-full ${maxWidth} mx-4 bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0_0_#1A1D20] max-h-[90vh] overflow-y-auto`}>
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 border-b-2 border-black bg-white">
        <h2 className="text-lg font-black text-gray-900">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 border-2 border-black rounded-xl bg-white shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="px-6 py-6">{children}</div>
    </div>
  </div>,
  document.body
);

// ── FORM FIELD ────────────────────────────────────────────────────────────────
const FormField = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <div>
    <label className="block text-xs font-black text-gray-700 uppercase tracking-wide mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-xs text-gray-400 mt-1 font-medium">{hint}</p>}
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// TASK FORM MODAL
// ══════════════════════════════════════════════════════════════════════════════
interface TaskFormModalProps {
  goalId: number;
  goalName: string;
  editing: PracticalTaskDto | null;
  onClose: () => void;
  onSuccess: () => void;
}

const TaskFormModal = ({ goalId, goalName, editing, onClose, onSuccess }: TaskFormModalProps) => {
  const notify = useAlert();
  const [form, setForm] = useState<Omit<PracticalTaskPayload, "goalId">>({
    title: editing?.title ?? "",
    description: editing?.description ?? "",
    verificationType: editing?.verificationType ?? "NONE",
    isActive: editing?.isActive ?? true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const setField = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    const payload: PracticalTaskPayload = { goalId, ...form };
    try {
      if (editing) {
        await adminPracticalTaskApi.updateTask(editing.taskId, payload);
        notify.success("Task updated successfully!");
      } else {
        await adminPracticalTaskApi.createTask(payload);
        notify.success("Task created successfully!");
      }
      onClose();
      onSuccess();
    } catch (err) {
      setFormError(errMsg(err) ?? (editing ? "Failed to update task." : "Failed to create task."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GameModal title={editing ? "✏️ Edit Task Template" : "➕ New Task Template"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Locked goal context chip */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-orange-50 border-2 border-orange-300 rounded-2xl">
          <TargetIcon />
          <div className="min-w-0">
            <p className="text-xs font-black text-orange-700 uppercase tracking-wide">Goal</p>
            <p className="text-sm font-black text-gray-900 truncate">{goalName}</p>
          </div>
          <span className="ml-auto text-xs font-black text-orange-500 border border-orange-300 rounded-full px-2 py-0.5 whitespace-nowrap">
            ID #{goalId}
          </span>
        </div>

        <FormField label="Title *">
          <input
            required
            type="text"
            value={form.title}
            onChange={e => setField("title", e.target.value)}
            placeholder="e.g. Walk 10,000 steps outside"
            className={inputCls}
          />
        </FormField>

        <FormField label="Description">
          <textarea
            rows={4}
            value={form.description ?? ""}
            onChange={e => setField("description", e.target.value)}
            placeholder="Describe what the player needs to do…"
            className={`${inputCls} resize-none`}
          />
        </FormField>

        <FormField label="Verification Type *" hint="How the player proves task completion.">
          <select
            required
            value={form.verificationType}
            onChange={e => setField("verificationType", e.target.value as VerificationType)}
            className={inputCls}
          >
            {VERIFICATION_TYPES.map(vt => (
              <option key={vt} value={vt}>
                {vt === "GPS" ? "📍 GPS — Location check-in" : vt === "PHOTO" ? "📷 PHOTO — Photo proof" : "— NONE — No verification"}
              </option>
            ))}
          </select>
        </FormField>

        <div className="flex items-center justify-between gap-4 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl">
          <div>
            <p className="text-sm font-black text-gray-800">Active</p>
            <p className="text-xs text-gray-400 font-medium">Make this template available to players</p>
          </div>
          <Toggle checked={form.isActive} onChange={v => setField("isActive", v)} />
        </div>

        {formError && (
          <p className="text-xs font-bold text-red-600 bg-red-50 border-2 border-red-300 rounded-xl px-3 py-2">
            {formError}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} disabled={submitting}
            className={`${btnBase} flex-1 justify-center bg-white text-gray-700`}>
            Cancel
          </button>
          <button type="submit" disabled={submitting}
            className={`${btnBase} flex-1 justify-center ${editing ? "bg-blue-200 text-blue-900" : "bg-emerald-300 text-gray-900"}`}>
            {submitting
              ? <><Spinner size={13} />{editing ? "Saving…" : "Creating…"}</>
              : editing
                ? <><SaveIcon />Save Changes</>
                : <><PlusIcon />Create Task</>}
          </button>
        </div>
      </form>
    </GameModal>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// DELETE CONFIRM MODAL
// ══════════════════════════════════════════════════════════════════════════════
interface DeleteConfirmModalProps {
  task: PracticalTaskDto;
  onClose: () => void;
  onSuccess: () => void;
}

const DeleteConfirmModal = ({ task, onClose, onSuccess }: DeleteConfirmModalProps) => {
  const notify = useAlert();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await adminPracticalTaskApi.deleteTask(task.taskId);
      notify.success(`"${task.title}" has been deleted.`);
      onClose();
      onSuccess();
    } catch (err) {
      setError(errMsg(err) ?? "Failed to delete task. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0_0_#1A1D20]">
        <div className="px-6 pt-6 pb-4 border-b-2 border-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-red-100 border-2 border-black rounded-2xl shadow-[2px_2px_0_0_#1A1D20]">
              <TrashIcon />
            </div>
            <h2 className="text-lg font-black text-gray-900">Delete Task?</h2>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600 font-medium">
            You are about to permanently delete{" "}
            <span className="font-black text-gray-900">"{task.title}"</span>.
            This action cannot be undone.
          </p>
          <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border-2 border-amber-300 rounded-xl">
            <span className="text-base">⚠️</span>
            <p className="text-xs font-bold text-amber-700">Any active habits using this template may be affected.</p>
          </div>
          {error && (
            <p className="text-xs font-bold text-red-600 bg-red-50 border-2 border-red-300 rounded-xl px-3 py-2">{error}</p>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={deleting}
              className={`${btnBase} flex-1 justify-center bg-white text-gray-700`}>
              Cancel
            </button>
            <button type="button" onClick={handleDelete} disabled={deleting}
              className={`${btnBase} flex-1 justify-center bg-red-300 text-red-900`}>
              {deleting ? <><Spinner size={13} />Deleting…</> : <><TrashIcon />Delete</>}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminPracticalTaskManagement() {
  // ── URL CONTEXT (pre-selection from Hub 1) ────────────────────────────────
  const [searchParams] = useSearchParams();

  // ── GOAL SELECTOR STATE ───────────────────────────────────────────────────
  const [allGoals, setAllGoals] = useState<GoalDto[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);

  const selectedGoal = allGoals.find(g => g.goalId === selectedGoalId) ?? null;

  // ── FILTERS + PAGINATION ──────────────────────────────────────────────────
  const {
    filters,
    debouncedFilters,
    setFilter,
    clearFilters,
    hasActiveFilters,
    page,
    setPage,
  } = useTableFilters<TaskFilters>(INITIAL_FILTERS);

  // ── TASK DATA STATE ───────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<PracticalTaskDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── MODAL STATE ───────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<PracticalTaskDto | null>(null);
  const [deletingTask, setDeletingTask] = useState<PracticalTaskDto | null>(null);

  // ── FETCH: ALL GOALS (on mount) ───────────────────────────────────────────
  const fetchGoals = useCallback(async () => {
    setGoalsLoading(true);
    try {
      const res = await adminGoalApi.getGoals({ pageSize: 1000 });
      if (res.success && res.data) {
        setAllGoals(res.data.filter(g => g.isActive));
      }
    } catch { /* silent — goal list failing shouldn't crash the page */ }
    finally { setGoalsLoading(false); }
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  // ── FETCH: TASKS for selected goal ────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    if (!selectedGoalId) return;
    setLoading(true);
    setError(null);
    try {
      const isActiveParam =
        debouncedFilters.isActive === "true" ? true
          : debouncedFilters.isActive === "false" ? false
            : undefined;

      const res = await adminPracticalTaskApi.getTasks({
        goalId: selectedGoalId,
        page,
        pageSize: PAGE_SIZE,
        search: debouncedFilters.search || undefined,
        isActive: isActiveParam,
      });
      if (res.success && res.data) {
        setTasks(res.data);
      } else {
        setError(res.message ?? "Failed to load tasks.");
      }
    } catch (err) {
      setError(errMsg(err) ?? "Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }, [selectedGoalId, page, debouncedFilters]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Pre-select goal when navigated from Hub 1 (Goal Management page)
  useEffect(() => {
    if (allGoals.length === 0) return;
    const paramId = searchParams.get("goalId");
    if (!paramId) return;
    const id = Number(paramId);
    if (allGoals.some(g => g.goalId === id)) setSelectedGoalId(id);
  }, [allGoals, searchParams]);

  // Reset tasks + page whenever the selected goal changes
  useEffect(() => {
    setTasks([]);
    setError(null);
    setPage(1);
  }, [selectedGoalId, setPage]);

  // ── MODAL HANDLERS ────────────────────────────────────────────────────────
  const openCreate = () => { setEditingTask(null); setShowForm(true); };
  const openEdit = (task: PracticalTaskDto) => { setEditingTask(task); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingTask(null); };

  const hasMore = tasks.length >= PAGE_SIZE;

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      <PageMeta
        title="Practical Task Templates | HabitEvolve Admin"
        description="Manage practical task templates for the HabitEvolve platform"
      />
      <PageBreadcrumb pageTitle="Practical Task Templates" />

      {/* ── PAGE HEADER ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Task Templates</h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">
            Define reusable practical tasks scoped to a specific Goal.
          </p>
        </div>
        <button
          onClick={openCreate}
          disabled={!selectedGoalId}
          className={`${btnBase} bg-emerald-300 text-gray-900 whitespace-nowrap`}
          title={!selectedGoalId ? "Select a Goal first" : undefined}
        >
          <PlusIcon /> New Template
        </button>
      </div>

      {/* ── GOAL SELECTOR ────────────────────────────────────────────────── */}
      <div className="mb-6 bg-white border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b-4 border-black bg-yellow-50">
          <TargetIcon />
          <span className="font-black text-gray-900 text-sm">Step 1 — Select a Goal</span>
          <span className="ml-auto text-xs font-bold text-yellow-700 bg-yellow-200 border-2 border-yellow-400 px-2.5 py-0.5 rounded-full">
            Required
          </span>
        </div>
        <div className="px-6 py-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Goal Context
          </p>
          {searchParams.get("goalId") && searchParams.get("goalName") && !selectedGoalId && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-orange-50 border-2 border-orange-300 rounded-2xl text-xs font-bold text-orange-700">
                <span>🎯</span>
                <span>Navigated from Hub 1 — auto-selecting: <span className="text-orange-900">{decodeURIComponent(searchParams.get("goalName")!)}</span></span>
              </div>
            )}
          {goalsLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
              <Spinner size={14} /> Loading goals…
            </div>
          ) : allGoals.length === 0 ? (
            <p className="text-sm font-bold text-amber-700 bg-amber-50 border-2 border-amber-300 rounded-2xl px-4 py-3">
              No active goals found. Create a Goal in Goal Management first.
            </p>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <select
                value={selectedGoalId ?? ""}
                onChange={e => setSelectedGoalId(e.target.value ? Number(e.target.value) : null)}
                className={`${inputCls} sm:max-w-md`}
              >
                <option value="">— Select a Goal to manage its tasks —</option>
                {allGoals.map(goal => (
                  <option key={goal.goalId} value={goal.goalId}>
                    [{goal.goalCode}] {goal.goalName}
                  </option>
                ))}
              </select>
              {selectedGoal && (
                <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border-2 border-orange-300 rounded-2xl whitespace-nowrap">
                  <span className="text-xs font-black text-orange-700">Category:</span>
                  <span className="text-xs font-bold text-gray-700">{selectedGoal.categoryCode}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── NO GOAL SELECTED EMPTY STATE ─────────────────────────────────── */}
      {!selectedGoalId ? (
        <div className="bg-white border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] py-20 text-center">
          <div className="text-5xl mb-4">🎯</div>
          <p className="text-gray-800 text-base font-black mb-1">Select a Goal to view its tasks</p>
          <p className="text-gray-400 text-sm font-medium">
            Task templates must belong to a specific Goal. Use the selector above to get started.
          </p>
        </div>
      ) : (
        <>
          {/* ── STATS STRIP ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "Total Loaded", value: loading ? "…" : tasks.length, color: "bg-sky-100 border-sky-400", emoji: "📋" },
              { label: "Active", value: loading ? "…" : tasks.filter(t => t.isActive).length, color: "bg-emerald-100 border-emerald-400", emoji: "✅" },
              { label: "Inactive", value: loading ? "…" : tasks.filter(t => !t.isActive).length, color: "bg-gray-100 border-gray-400", emoji: "🔒" },
            ].map(stat => (
              <div key={stat.label} className={`flex items-center gap-3 px-4 py-3.5 border-2 rounded-2xl shadow-[3px_3px_0_0_#1A1D20] ${stat.color}`}>
                <span className="text-xl">{stat.emoji}</span>
                <div>
                  <p className="text-xl font-black text-gray-900 leading-none">{stat.value}</p>
                  <p className="text-xs font-bold text-gray-600 mt-0.5">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── TABLE CARD ─────────────────────────────────────────────────── */}
          <div className="bg-white border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] overflow-hidden">
            {/* Card header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b-4 border-black bg-gray-50">
              <ClipboardIcon />
              <span className="font-black text-gray-900 text-sm">
                Tasks for{" "}
                <span className="text-orange-600">{selectedGoal?.goalName}</span>
              </span>
              {!loading && (
                <span className="ml-auto bg-orange-200 border-2 border-black text-gray-800 text-xs font-black px-2.5 py-0.5 rounded-full">
                  {tasks.length}
                </span>
              )}
            </div>

            {/* Filter bar */}
            <TableFilterBar<TaskFilters>
              fields={FILTER_FIELDS}
              filters={filters}
              onFilterChange={setFilter}
              onClear={clearFilters}
              hasActiveFilters={hasActiveFilters}
            />

            {/* Error state */}
            {error && (
              <div className="mx-6 mt-5 bg-red-50 border-2 border-red-300 rounded-2xl p-3 text-sm text-red-700 font-semibold flex items-center justify-between gap-3">
                <span>{error}</span>
                <button onClick={fetchTasks} className="underline font-black hover:no-underline whitespace-nowrap">
                  Retry
                </button>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50/50">
                    {["#", "Title", "Description", "Verification", "Status", "Created", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cells={7} />)
                  ) : tasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center">
                        <div className="text-5xl mb-3">📋</div>
                        <p className="text-gray-600 text-sm font-black">
                          {hasActiveFilters
                            ? "No tasks match your filters."
                            : `No task templates for "${selectedGoal?.goalName}" yet.`}
                        </p>
                        {hasActiveFilters ? (
                          <button onClick={clearFilters} className="mt-2 text-xs font-black text-blue-600 underline hover:no-underline">
                            Clear filters
                          </button>
                        ) : (
                          <button onClick={openCreate} className={`mt-4 ${btnBase} bg-emerald-300 text-gray-900 mx-auto`}>
                            <PlusIcon /> Create first template
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task, idx) => (
                      <tr
                        key={task.taskId}
                        className={`transition-colors hover:bg-yellow-50/60 ${idx < tasks.length - 1 ? "border-b-2 border-gray-100" : ""}`}
                      >
                        <td className="px-4 py-4 text-xs font-black text-gray-400">
                          {(page - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        <td className="px-4 py-4 max-w-50">
                          <p className="text-sm font-bold text-gray-900 truncate" title={task.title}>
                            {task.title}
                          </p>
                        </td>
                        <td className="px-4 py-4 max-w-65">
                          {task.description ? (
                            <p className="text-xs text-gray-500 font-medium line-clamp-2" title={task.description}>
                              {task.description}
                            </p>
                          ) : (
                            <span className="text-gray-300 text-xs font-medium">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <VerificationBadge type={task.verificationType} />
                        </td>
                        <td className="px-4 py-4">
                          <ActivePill isActive={task.isActive} />
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-400 font-medium whitespace-nowrap">
                          {new Date(task.createdAt).toLocaleDateString("en-US", {
                            year: "numeric", month: "short", day: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              title="Edit task"
                              onClick={() => openEdit(task)}
                              className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-blue-100 hover:bg-blue-200 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-blue-800"
                            >
                              <PencilIcon />
                            </button>
                            <button
                              title="Delete task"
                              onClick={() => setDeletingTask(task)}
                              className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-red-100 hover:bg-red-200 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-red-800"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <PaginationBar
              page={page}
              hasMore={hasMore}
              loading={loading}
              onPrev={() => setPage(Math.max(1, page - 1))}
              onNext={() => setPage(page + 1)}
            />
          </div>
        </>
      )}

      {/* ── TASK FORM MODAL ──────────────────────────────────────────────── */}
      {showForm && selectedGoalId && selectedGoal && (
        <TaskFormModal
          goalId={selectedGoalId}
          goalName={selectedGoal.goalName}
          editing={editingTask}
          onClose={closeForm}
          onSuccess={fetchTasks}
        />
      )}

      {/* ── DELETE CONFIRM MODAL ─────────────────────────────────────────── */}
      {deletingTask && (
        <DeleteConfirmModal
          task={deletingTask}
          onClose={() => setDeletingTask(null)}
          onSuccess={fetchTasks}
        />
      )}
    </>
  );
}

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
  AdminTaskTemplateDto as PracticalTaskDto,
  PracticalTaskPayload,
  VerificationType,
  VerificationTag,
  CvQuestType,
  GoalDto,
} from "../types/adminGoal.types";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
// NOTE: the previous import here pointed at "../types/adminPracticalTask.types",
// which does not (and never did) export PracticalTaskDto/PracticalTaskPayload/
// VerificationType — that's why this page is listed in tsconfig.app.json's
// "exclude" (along with AdminGoalManagement.tsx). The real DTOs this page's API
// client (adminPracticalTaskApi.ts) actually uses live in adminGoal.types.ts as
// AdminTaskTemplateDto/PracticalTaskPayload — aliased above so the rest of this
// file didn't need a mass rename. Fixed as a byproduct of wiring the 3 new
// fields below; the page's separate pre-existing data-fetching signature bugs
// (getGoals/getTasks argument shapes) are out of scope for this change.
const PAGE_SIZE = 10;
const VERIFICATION_TYPES: VerificationType[] = ["GPS", "PHOTO", "NONE"];
const VERIFICATION_TAGS: VerificationTag[] = ["FACE", "ITEM", "ACTION"];
const CV_QUEST_TYPES: CvQuestType[] = ["running", "drinking_water", "sleeping", "reading", "cooking", "exercise"];
const HOW_TO_SUBMIT_MAX = 500;

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
// btnBase is geometry + typography only; each call-site picks a fill token below,
// so there is exactly one definition of button shape on the page.
const btnBase =
  "inline-flex items-center gap-2 px-4 py-2 font-medium text-sm rounded-sky-chip " +
  "transition disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

const btnPrimary = "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-fill sky-lift";
const btnGhost = "sky-glass-chip text-sky-deep sky-lift";
// The single saturated fill in this file — reserved for the confirmed delete.
const btnDanger = "bg-sky-rose text-white shadow-[0_10px_20px_-10px_rgba(196,112,138,0.95)] hover:bg-sky-rose-deep";

const inputCls =
  "w-full px-4 py-2.5 rounded-sky-chip border border-white/80 bg-white/60 text-sm text-sky-ink transition " +
  "placeholder:text-sky-ink-3 focus:outline-hidden focus:border-sky-deep focus:bg-white/85 focus:ring-3 focus:ring-sky-deep/18";

const iconBtnBase =
  "w-8 h-8 flex items-center justify-center rounded-sky-chip border transition " +
  "hover:-translate-y-px active:translate-y-0 active:scale-95";
const ICON_BTN = {
  deep: "border-sky-deep/20 bg-sky-deep/8 text-sky-deep hover:bg-sky-deep/14",
  rose: "border-sky-rose/25 bg-sky-rose/12 text-sky-rose-deep hover:bg-sky-rose/20",
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
const errMsg = (err: unknown) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

// ── VERIFICATION TYPE BADGE ───────────────────────────────────────────────────
// Icons are drawn, not emoji (§4). Tint names the mechanism, and the glyph
// repeats it so the badge is readable without colour.
const MapPinGlyph = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
);
const CameraGlyph = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);
const MinusGlyph = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const VERIFICATION_META: Record<string, { cls: string; Glyph: () => React.ReactElement }> = {
  GPS: { cls: "bg-sky-deep/10 text-sky-deep", Glyph: MapPinGlyph },
  PHOTO: { cls: "bg-sky-violet/12 text-sky-violet-deep", Glyph: CameraGlyph },
  NONE: { cls: "bg-sky-ink/7 text-sky-ink-2", Glyph: MinusGlyph },
};

const VerificationBadge = ({ type }: { type: VerificationType }) => {
  const { cls, Glyph } = VERIFICATION_META[type] ?? VERIFICATION_META.NONE;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
      <Glyph />
      {type}
    </span>
  );
};

// ── ACTIVE PILL ───────────────────────────────────────────────────────────────
// Active = TEAL (§4).
const ActivePill = ({ isActive }: { isActive: boolean }) => (
  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
    isActive ? "bg-sky-teal-bg text-sky-teal" : "bg-sky-ink/7 text-sky-ink-2"
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? "bg-sky-teal" : "bg-sky-ink-3"}`} />
    {isActive ? "Active" : "Inactive"}
  </span>
);

// ── TOGGLE ────────────────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    aria-pressed={checked}
    className={`relative shrink-0 w-12 h-6 rounded-full transition-colors ${
      checked ? "bg-sky-teal shadow-[inset_0_1px_2px_rgba(36,52,77,0.25)]" : "bg-sky-ink/15"
    }`}
  >
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-6" : "translate-x-0"}`} />
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
// Stat-strip glyphs — drawn, not emoji (§4).
const CheckGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const LockGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

// ── SKELETON ROW ──────────────────────────────────────────────────────────────
const SkeletonRow = ({ cells }: { cells: number }) => (
  <tr className="sky-table-row animate-pulse">
    {Array.from({ length: cells }).map((_, i) => (
      <td key={i} className="px-4 py-4">
        <div className="h-4 bg-sky-ink/10 rounded-full" style={{ width: `${48 + (i % 4) * 28}px` }} />
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
  <div className="flex items-center justify-between px-6 py-4 border-t border-white/60 bg-white/35">
    <button type="button" onClick={onPrev} disabled={page === 1 || loading} className={`${btnBase} ${btnGhost}`}>
      <ChevronLeft /> Previous
    </button>
    <span className="font-display text-sm font-semibold text-sky-ink-2 tabular-nums">
      Page {page}
    </span>
    <button type="button" onClick={onNext} disabled={!hasMore || loading} className={`${btnBase} ${btnGhost}`}>
      Next <ChevronRight />
    </button>
  </div>
);

// ── MODAL (portal) ────────────────────────────────────────────────────────────
const GameModal = ({
  title, onClose, children, maxWidth = "max-w-lg",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) => createPortal(
  <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center bg-sky-ink/45 backdrop-blur-[18px]">
    <div className={`relative w-full ${maxWidth} mx-4 sky-glass rounded-sky-card max-h-[90vh] overflow-y-auto sky-in`}>
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-sky-deep-lo to-sky-deep" />
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 border-b border-white/60 bg-white/70 backdrop-blur-[14px]">
        <h2 className="font-display text-lg font-semibold text-sky-ink">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex items-center justify-center w-8 h-8 rounded-full text-sky-ink-2 hover:bg-white/80 hover:text-sky-ink active:scale-95 transition"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="relative px-6 py-6">{children}</div>
    </div>
  </div>,
  document.body
);

// ── FORM FIELD ────────────────────────────────────────────────────────────────
const FormField = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <div>
    <label className="block text-xs font-semibold text-sky-ink-2 mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-xs text-sky-ink-3 mt-1">{hint}</p>}
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
    verificationType: (editing?.verificationType as VerificationType) ?? "NONE",
    isActive: editing?.isActive ?? true,
    howToSubmit: editing?.howToSubmit ?? "",
    verificationTags: editing?.verificationTags ?? "",
    cvQuestType: editing?.cvQuestType ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const setField = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  const selectedTags = (form.verificationTags ?? "")
    .split(",").map(s => s.trim()).filter(Boolean) as VerificationTag[];
  const toggleTag = (tag: VerificationTag) => {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    setField("verificationTags", next.join(","));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    const payload: PracticalTaskPayload = {
      goalId,
      ...form,
      howToSubmit: form.howToSubmit?.trim() || undefined,
      verificationTags: form.verificationTags || undefined,
      cvQuestType: form.cvQuestType || undefined,
    };
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
    <GameModal title={editing ? "Edit Task Template" : "New Task Template"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Locked goal context chip — peach = "this is the thing you're working
            inside", the one warm accent in an otherwise cool form. */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-sky-chip bg-sky-peach/15 border border-sky-peach-deep/25 text-sky-peach-deep">
          <TargetIcon />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest opacity-80">Goal</p>
            <p className="font-display text-sm font-semibold text-sky-ink truncate">{goalName}</p>
          </div>
          <span className="ml-auto text-xs font-semibold tabular-nums bg-white/60 rounded-full px-2 py-0.5 whitespace-nowrap">
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
                {vt === "GPS" ? "GPS — Location check-in" : vt === "PHOTO" ? "PHOTO — Photo proof" : "NONE — No verification"}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="How To Submit"
          hint={`${(form.howToSubmit ?? "").length}/${HOW_TO_SUBMIT_MAX} — player-facing submission instructions.`}
        >
          <textarea
            rows={3}
            maxLength={HOW_TO_SUBMIT_MAX}
            value={form.howToSubmit ?? ""}
            onChange={e => setField("howToSubmit", e.target.value)}
            placeholder="e.g. Take a clear photo of your completed workout log…"
            className={`${inputCls} resize-none`}
          />
        </FormField>

        <FormField
          label="Verification Tags"
          hint="Signals sent to AI verification. FACE blocks submission until the player verifies their portrait; ITEM/ACTION are hints only."
        >
          <div className="flex flex-wrap gap-3">
            {VERIFICATION_TAGS.map(tag => {
              const on = selectedTags.includes(tag);
              return (
                <label
                  key={tag}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-sky-chip border text-sm font-medium cursor-pointer transition ${
                    on
                      ? "bg-sky-deep/10 border-sky-deep/30 text-sky-deep"
                      : "bg-white/55 border-white/80 text-sky-ink-2 hover:bg-white/75"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleTag(tag)}
                    className="w-4 h-4 accent-sky-deep"
                  />
                  {tag}
                </label>
              );
            })}
          </div>
        </FormField>

        <FormField
          label="CV Quest Type"
          hint="Optional — tells the external CV service exactly which detector to use instead of guessing from the title."
        >
          <select
            value={form.cvQuestType ?? ""}
            onChange={e => setField("cvQuestType", e.target.value)}
            className={inputCls}
          >
            <option value="">— None —</option>
            {CV_QUEST_TYPES.map(ct => (
              <option key={ct} value={ct}>{ct}</option>
            ))}
          </select>
        </FormField>

        <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-sky-chip bg-white/55 border border-white/80">
          <div>
            <p className="text-sm font-semibold text-sky-ink">Active</p>
            <p className="text-xs text-sky-ink-3">Make this template available to players</p>
          </div>
          <Toggle checked={form.isActive} onChange={v => setField("isActive", v)} />
        </div>

        {formError && (
          <p className="text-xs font-medium text-sky-rose-deep bg-sky-rose/12 border border-sky-rose/28 rounded-sky-chip px-3 py-2">
            {formError}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} disabled={submitting}
            className={`${btnBase} ${btnGhost} flex-1 justify-center`}>
            Cancel
          </button>
          <button type="submit" disabled={submitting}
            className={`${btnBase} ${btnPrimary} flex-1 justify-center`}>
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
    <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center bg-sky-ink/45 backdrop-blur-[18px]">
      <div className="relative w-full max-w-md mx-4 sky-glass rounded-sky-card sky-in overflow-hidden">
        {/* Rose top rail — the destructive-intent cue that doesn't rely on the
            button colour alone. */}
        <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-sky-rose to-sky-rose-deep" />
        <div className="relative px-6 pt-6 pb-4 border-b border-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-sky-chip bg-sky-rose/14 text-sky-rose-deep">
              <TrashIcon />
            </div>
            <h2 className="font-display text-lg font-semibold text-sky-ink">Delete Task?</h2>
          </div>
        </div>
        <div className="relative px-6 py-5 space-y-4">
          <p className="text-sm text-sky-ink-2">
            You are about to permanently delete{" "}
            <span className="font-semibold text-sky-ink">"{task.title}"</span>.
            This action cannot be undone.
          </p>
          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-sky-chip bg-sky-peach/16 border border-sky-peach-deep/25 text-sky-peach-deep">
            <svg className="mt-px shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p className="text-xs font-medium">Any active habits using this template may be affected.</p>
          </div>
          {error && (
            <p className="text-xs font-medium text-sky-rose-deep bg-sky-rose/12 border border-sky-rose/28 rounded-sky-chip px-3 py-2">{error}</p>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={deleting}
              className={`${btnBase} ${btnGhost} flex-1 justify-center`}>
              Cancel
            </button>
            <button type="button" onClick={handleDelete} disabled={deleting}
              className={`${btnBase} ${btnDanger} flex-1 justify-center`}>
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
          <h1 className="font-display text-2xl font-semibold text-sky-ink">Task Templates</h1>
          <p className="text-sm text-sky-ink-2 mt-0.5">
            Define reusable practical tasks scoped to a specific Goal.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={!selectedGoalId}
          className={`${btnBase} ${btnPrimary} whitespace-nowrap`}
          title={!selectedGoalId ? "Select a Goal first" : undefined}
        >
          <PlusIcon /> New Template
        </button>
      </div>

      {/* ── GOAL SELECTOR ────────────────────────────────────────────────── */}
      {/* Step 1 of a two-step flow, so it carries a deep top rail and a
          "Required" chip — the strongest emphasis above the fold. */}
      <div className="relative mb-6 sky-glass-admin rounded-sky-card overflow-hidden">
        <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-sky-deep-lo to-sky-deep" />
        <div className="relative flex items-center gap-3 px-6 py-4 border-b border-white/60 bg-white/40">
          <span className="text-sky-deep"><TargetIcon /></span>
          <span className="font-display font-semibold text-sky-ink text-sm">Step 1 — Select a Goal</span>
          <span className="ml-auto sky-badge sky-badge-info">Required</span>
        </div>
        <div className="relative px-6 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-ink-3 mb-2">
            Goal Context
          </p>
          {searchParams.get("goalId") && searchParams.get("goalName") && !selectedGoalId && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-sky-chip bg-sky-peach/16 border border-sky-peach-deep/25 text-xs font-medium text-sky-peach-deep">
                <svg className="shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
                </svg>
                <span>Navigated from Hub 1 — auto-selecting: <span className="font-semibold text-sky-ink">{decodeURIComponent(searchParams.get("goalName")!)}</span></span>
              </div>
            )}
          {goalsLoading ? (
            <div className="flex items-center gap-2 text-sm text-sky-ink-3">
              <Spinner size={14} /> Loading goals…
            </div>
          ) : allGoals.length === 0 ? (
            <p className="text-sm font-medium text-sky-peach-deep bg-sky-peach/16 border border-sky-peach-deep/25 rounded-sky-chip px-4 py-3">
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
                <div className="flex items-center gap-2 px-3 py-2 rounded-sky-chip bg-white/60 border border-white/85 whitespace-nowrap">
                  <span className="text-xs font-semibold text-sky-ink-3">Category</span>
                  <span className="text-xs font-semibold text-sky-deep">{selectedGoal.categoryCode}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── NO GOAL SELECTED EMPTY STATE ─────────────────────────────────── */}
      {!selectedGoalId ? (
        <div className="sky-glass-admin rounded-sky-card py-20 text-center">
          <span className="relative mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-sky-deep/8 text-sky-deep">
            <TargetIcon />
          </span>
          <p className="relative font-display text-sky-ink text-base font-semibold mb-1">Select a Goal to view its tasks</p>
          <p className="relative text-sky-ink-2 text-sm max-w-sm mx-auto">
            Task templates must belong to a specific Goal. Use the selector above to get started.
          </p>
        </div>
      ) : (
        <>
          {/* ── STATS STRIP ────────────────────────────────────────────────── */}
          {/* Deep / teal / ink — never green for "Active" (§4). */}
          <div className="grid grid-cols-3 gap-4 mb-6 sky-stagger">
            {[
              { label: "Total Loaded", value: loading ? "…" : tasks.length, tint: "bg-sky-deep/10 text-sky-deep", Glyph: ClipboardIcon },
              { label: "Active", value: loading ? "…" : tasks.filter(t => t.isActive).length, tint: "bg-sky-teal-bg text-sky-teal", Glyph: CheckGlyph },
              { label: "Inactive", value: loading ? "…" : tasks.filter(t => !t.isActive).length, tint: "bg-sky-ink/7 text-sky-ink-2", Glyph: LockGlyph },
            ].map(stat => (
              <div key={stat.label} className="relative flex items-center gap-3 px-4 py-3.5 sky-glass-admin rounded-sky-md sky-lift">
                <span className={`relative flex items-center justify-center w-10 h-10 rounded-sky-chip shrink-0 ${stat.tint}`}>
                  <stat.Glyph />
                </span>
                <div className="relative min-w-0">
                  <p className="font-display text-2xl font-semibold text-sky-ink leading-none tabular-nums">{stat.value}</p>
                  <p className="text-xs text-sky-ink-2 mt-1">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── TABLE CARD ─────────────────────────────────────────────────── */}
          <div className="sky-glass-admin rounded-sky-card overflow-hidden">
            {/* Card header */}
            <div className="relative flex items-center gap-3 px-6 py-4 border-b border-white/60 bg-white/40">
              <span className="text-sky-deep"><ClipboardIcon /></span>
              <span className="font-display font-semibold text-sky-ink text-sm">
                Tasks for{" "}
                <span className="text-sky-deep">{selectedGoal?.goalName}</span>
              </span>
              {!loading && (
                <span className="font-display ml-auto bg-sky-deep/12 text-sky-deep text-xs font-semibold px-2.5 py-0.5 rounded-full tabular-nums">
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
              <div className="relative mx-6 mt-5 overflow-hidden rounded-sky-chip bg-sky-rose/12 border border-sky-rose/28 pl-4 pr-3 py-3 text-sm text-sky-rose-deep font-medium flex items-center justify-between gap-3">
                <span aria-hidden className="absolute left-0 inset-y-0 w-[3px] bg-sky-rose" />
                <span>{error}</span>
                <button type="button" onClick={fetchTasks} className="underline font-semibold hover:no-underline whitespace-nowrap">
                  Retry
                </button>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="sky-table-head">
                    {["#", "Title", "Description", "Verification", "Status", "Created", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left whitespace-nowrap">
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
                        <span className="mx-auto mb-3 flex items-center justify-center w-14 h-14 rounded-full bg-sky-deep/8 text-sky-deep">
                          <ClipboardIcon />
                        </span>
                        <p className="font-display text-sky-ink text-sm font-semibold">
                          {hasActiveFilters
                            ? "No tasks match your filters."
                            : `No task templates for "${selectedGoal?.goalName}" yet.`}
                        </p>
                        {hasActiveFilters ? (
                          <button type="button" onClick={clearFilters} className="mt-2 text-xs font-semibold text-sky-deep underline hover:no-underline">
                            Clear filters
                          </button>
                        ) : (
                          <button type="button" onClick={openCreate} className={`mt-4 ${btnBase} ${btnPrimary} mx-auto`}>
                            <PlusIcon /> Create first template
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task, idx) => (
                      <tr key={task.taskId} className="sky-table-row">
                        <td className="px-4 py-4 text-xs font-semibold text-sky-ink-3 tabular-nums">
                          {(page - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        <td className="px-4 py-4 max-w-50">
                          <p className="text-sm font-medium text-sky-ink truncate" title={task.title}>
                            {task.title}
                          </p>
                        </td>
                        <td className="px-4 py-4 max-w-65">
                          {task.description ? (
                            <p className="text-xs text-sky-ink-2 line-clamp-2" title={task.description}>
                              {task.description}
                            </p>
                          ) : (
                            <span className="text-sky-ink-3 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <VerificationBadge type={task.verificationType} />
                        </td>
                        <td className="px-4 py-4">
                          <ActivePill isActive={task.isActive} />
                        </td>
                        <td className="px-4 py-4 text-xs text-sky-ink-3 whitespace-nowrap">
                          {new Date(task.createdAt).toLocaleDateString("en-US", {
                            year: "numeric", month: "short", day: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              title="Edit task"
                              onClick={() => openEdit(task)}
                              className={`${iconBtnBase} ${ICON_BTN.deep}`}
                            >
                              <PencilIcon />
                            </button>
                            <button
                              type="button"
                              title="Delete task"
                              onClick={() => setDeletingTask(task)}
                              className={`${iconBtnBase} ${ICON_BTN.rose}`}
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

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { createPortal } from "react-dom";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { adminGoalApi } from "../api/adminGoalApi";
import { useTableFilters } from "../hooks/useTableFilters";
import { TableFilterBar } from "../components/common/TableFilterBar";
import type { FilterField } from "../hooks/useTableFilters";
import type {
  QuestionnaireTemplateDto,
  QuestionDto,
  QuestionType,
  GoalDto,
} from "../types/adminGoal.types";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

const QUESTION_TYPES: QuestionType[] = [
  "SingleChoice", "MultipleChoice", "NumberInput", "TextInput", "RatingScale", "YesNo",
];

const QUESTION_TYPE_LABELS: Record<string, string> = {
  SingleChoice: "Single Choice",
  MultipleChoice: "Multiple Choice",
  NumberInput: "Number Input",
  TextInput: "Text Input",
  RatingScale: "Rating Scale",
  YesNo: "Yes / No",
};

const QUESTION_TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  SingleChoice: { bg: "bg-blue-100", border: "border-blue-400", text: "text-blue-800" },
  MultipleChoice: { bg: "bg-purple-100", border: "border-purple-400", text: "text-purple-800" },
  NumberInput: { bg: "bg-orange-100", border: "border-orange-400", text: "text-orange-800" },
  TextInput: { bg: "bg-gray-100", border: "border-gray-400", text: "text-gray-700" },
  RatingScale: { bg: "bg-yellow-100", border: "border-yellow-500", text: "text-yellow-800" },
  YesNo: { bg: "bg-green-100", border: "border-green-400", text: "text-green-800" },
};

const HAS_OPTIONS = (t: QuestionType) => t === "SingleChoice" || t === "MultipleChoice";

// ── FILTER CONFIG ─────────────────────────────────────────────────────────────
// getTemplates() has no search param → activeOnly is server-side, name search is client-side (useMemo)
type TemplateFilters = { search: string; activeOnly: string };
const TEMPLATE_INITIAL_FILTERS: TemplateFilters = { search: "", activeOnly: "" };
const TEMPLATE_FILTER_FIELDS: FilterField[] = [
  { key: "search", label: "Search", type: "text", placeholder: "Search by template name…" },
  {
    key: "activeOnly", label: "Status", type: "select", options: [
      { label: "Active Only", value: "active" },
    ]
  },
];

// ── LOCAL TYPES ───────────────────────────────────────────────────────────────
interface QuestionFormValues {
  questionText: string;
  questionType: QuestionType;
  isRequired: boolean;
  displayOrder: number;
  isActive: boolean;
}

interface OptionRow {
  id: string;
  optionId?: number;   // present for existing server-side options
  optionText: string;
  optionValue: string;
  displayOrder: number;
}

type TemplateForm = { templateName: string; description: string; isActive: boolean };

const EMPTY_TEMPLATE_FORM: TemplateForm = { templateName: "", description: "", isActive: true };
const EMPTY_QUESTION_FORM: QuestionFormValues = {
  questionText: "", questionType: "SingleChoice", isRequired: true, displayOrder: 1, isActive: true,
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

const errMsg = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const toValue = (s: string) =>
  s.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

let _seq = 0;
const newOptId = () => `o_${++_seq}`;
const newOptionRow = (order: number): OptionRow => ({
  id: newOptId(), optionText: "", optionValue: "", displayOrder: order,
});

// ── SHARED STYLES ─────────────────────────────────────────────────────────────
const btnBase =
  "inline-flex items-center gap-2 px-4 py-2 font-black text-sm border-2 border-black rounded-full " +
  "shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 " +
  "disabled:shadow-[3px_3px_0_0_#1A1D20] transition-all";

const inputCls =
  "w-full px-4 py-2.5 border-2 border-black rounded-2xl text-sm font-medium bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder:text-gray-400";

const miniInputCls =
  "px-3 py-1.5 border-2 border-black rounded-xl text-sm font-medium bg-white " +
  "focus:outline-none focus:ring-1 focus:ring-orange-300 placeholder:text-gray-400";

// ── SPINNER ───────────────────────────────────────────────────────────────────
const Spinner = ({ size = 18 }: { size?: number }) => (
  <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// ── ICONS ─────────────────────────────────────────────────────────────────────
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const PencilIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const XIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const ArrowLeftIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);
const ListIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);
const SaveIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
  </svg>
);
const ChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const LinkIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

// ── BADGES ────────────────────────────────────────────────────────────────────
const QuestionTypeBadge = ({ type }: { type: string }) => {
  const c = QUESTION_TYPE_COLORS[type] ?? { bg: "bg-gray-100", border: "border-gray-400", text: "text-gray-600" };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black border-2 ${c.bg} ${c.border} ${c.text} shadow-[1px_1px_0_0_#1A1D20]`}>
      {QUESTION_TYPE_LABELS[type] ?? type}
    </span>
  );
};

const ActivePill = ({ isActive }: { isActive: boolean }) => (
  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border-2 ${isActive ? "bg-green-100 border-green-400 text-green-800" : "bg-gray-100 border-gray-400 text-gray-500"
    }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-gray-400"}`} />
    {isActive ? "Active" : "Inactive"}
  </span>
);

// ── ALERT ─────────────────────────────────────────────────────────────────────
const AlertBanner = ({ alert }: { alert: { type: "success" | "error"; message: string } }) =>
  alert.type === "success" ? (
    <div className="mb-5 flex items-center gap-3 bg-emerald-50 border-4 border-emerald-500 rounded-2xl shadow-[4px_4px_0_0_#1A1D20] px-5 py-3.5">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      <span className="font-black text-emerald-800 text-sm">{alert.message}</span>
    </div>
  ) : (
    <div className="mb-5 flex items-center gap-3 bg-red-50 border-4 border-red-500 rounded-2xl shadow-[4px_4px_0_0_#1A1D20] px-5 py-3.5">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
      <span className="font-black text-red-800 text-sm">{alert.message}</span>
    </div>
  );

// ── GAME MODAL (portal) ───────────────────────────────────────────────────────
const GameModal = ({
  title, onClose, children, maxWidth = "max-w-lg",
}: { title: string; onClose: () => void; children: React.ReactNode; maxWidth?: string }) =>
  createPortal(
    <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`relative w-full ${maxWidth} mx-4 bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0_0_#1A1D20] max-h-[90vh] overflow-y-auto`}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 border-b-2 border-black bg-white">
          <h2 className="text-lg font-black text-gray-900">{title}</h2>
          <button type="button" onClick={onClose}
            className="flex items-center justify-center w-8 h-8 border-2 border-black rounded-xl bg-white shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
            <XIcon />
          </button>
        </div>
        <div className="px-6 py-6">{children}</div>
      </div>
    </div>,
    document.body
  );

// ── BIND TO GOAL MODAL ────────────────────────────────────────────────────────
interface BindToGoalModalProps {
  template: QuestionnaireTemplateDto;
  preselectedGoalId: number | null;
  onClose: () => void;
  onAlert: (a: { type: "success" | "error"; message: string }) => void;
}

const BindToGoalModal = ({ template, preselectedGoalId, onClose, onAlert }: BindToGoalModalProps) => {
  const [allGoals, setAllGoals] = useState<GoalDto[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(preselectedGoalId);
  const [submitting, setSubmitting] = useState(false);
  const [bindError, setBindError] = useState<string | null>(null);

  useEffect(() => {
    setGoalsLoading(true);
    adminGoalApi.getGoals({ pageSize: 1000 })
      .then(res => { if (res.success && res.data) setAllGoals(res.data.filter(g => g.isActive)); })
      .catch(() => {/* silent */})
      .finally(() => setGoalsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalId) return;
    setSubmitting(true);
    setBindError(null);
    try {
      await adminGoalApi.bindTemplateToGoal(selectedGoalId, template.templateId);
      onAlert({ type: "success", message: `"${template.templateName}" successfully bound to goal!` });
      onClose();
    } catch (err) {
      setBindError(errMsg(err) ?? "Failed to bind template. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GameModal title="🔗 Bind Template to Goal" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 px-4 py-3 bg-purple-50 border-2 border-purple-300 rounded-2xl">
          <span className="text-xl">📋</span>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-purple-600 uppercase tracking-wide">Template</p>
            <p className="text-sm font-black text-gray-900 truncate">{template.templateName}</p>
          </div>
          <span className="ml-auto text-xs font-black text-purple-500 border border-purple-300 rounded-full px-2 py-0.5 whitespace-nowrap">
            v{template.version}
          </span>
        </div>

        <div>
          <label className="block text-xs font-black text-gray-700 uppercase tracking-wide mb-1.5">
            Select Goal to Bind *
          </label>
          {goalsLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-2.5">
              <Spinner size={14} /> Loading active goals…
            </div>
          ) : allGoals.length === 0 ? (
            <p className="text-sm font-bold text-amber-700 bg-amber-50 border-2 border-amber-300 rounded-2xl px-4 py-3">
              No active goals found. Create goals in Hub 1 first.
            </p>
          ) : (
            <select
              required
              value={selectedGoalId ?? ""}
              onChange={e => setSelectedGoalId(e.target.value ? Number(e.target.value) : null)}
              className={inputCls}
            >
              <option value="">— Select an active Goal —</option>
              {allGoals.map(g => (
                <option key={g.goalId} value={g.goalId}>
                  [{g.goalCode}] {g.goalName}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-start gap-2.5 px-3.5 py-3 bg-sky-50 border-2 border-sky-200 rounded-2xl">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-xs font-semibold text-sky-800">
            This will associate the questionnaire template with the selected goal.
            Players enrolled in that goal will be evaluated using this template.
          </p>
        </div>

        {bindError && (
          <p className="text-xs font-bold text-red-600 bg-red-50 border-2 border-red-300 rounded-xl px-3 py-2">{bindError}</p>
        )}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} disabled={submitting}
            className={`${btnBase} flex-1 justify-center bg-white text-gray-700`}>
            Cancel
          </button>
          <button type="submit" disabled={submitting || !selectedGoalId}
            className={`${btnBase} flex-1 justify-center bg-purple-200 text-purple-900`}>
            {submitting ? <><Spinner />Binding…</> : <><LinkIcon />Bind Template</>}
          </button>
        </div>
      </form>
    </GameModal>
  );
};

// ── FORM FIELD ────────────────────────────────────────────────────────────────
const FormField = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <div>
    <label className="block text-xs font-black text-gray-700 uppercase tracking-wide mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-xs text-gray-400 mt-1 font-medium">{hint}</p>}
  </div>
);

// ── TOGGLE ────────────────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange, label, sub }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string;
}) => (
  <div className="flex items-center justify-between gap-4 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl">
    <div>
      <p className="text-sm font-black text-gray-800">{label}</p>
      {sub && <p className="text-xs text-gray-400 font-medium">{sub}</p>}
    </div>
    <button type="button" onClick={() => onChange(!checked)} aria-pressed={checked}
      className={`relative flex-shrink-0 w-12 h-6 rounded-full border-2 border-black transition-colors shadow-[2px_2px_0_0_#1A1D20] ${checked ? "bg-emerald-400" : "bg-gray-300"}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full border-2 border-black bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-0"}`} />
    </button>
  </div>
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

// ── PAGINATION ────────────────────────────────────────────────────────────────
const PaginationBar = ({ page, hasMore, loading, onPrev, onNext }: {
  page: number; hasMore: boolean; loading: boolean; onPrev: () => void; onNext: () => void;
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

// ── TABLE CARD ────────────────────────────────────────────────────────────────
const TableCard = ({ title, icon, count, loading, children }: {
  title: string; icon: React.ReactNode; count?: number; loading: boolean; children: React.ReactNode;
}) => (
  <div className="bg-white border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] overflow-hidden">
    <div className="flex items-center gap-3 px-6 py-4 border-b-4 border-black bg-gray-50">
      <span className="text-gray-600">{icon}</span>
      <span className="font-black text-gray-900 text-sm">{title}</span>
      {!loading && count !== undefined && (
        <span className="ml-auto bg-orange-200 border-2 border-black text-gray-800 text-xs font-black px-2.5 py-0.5 rounded-full">{count}</span>
      )}
    </div>
    {children}
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function QuestionnaireManagement() {

  // ── URL CONTEXT (pre-selection from Hub 1) ────────────────────────────────
  const [searchParams] = useSearchParams();
  const preselectedGoalId = useMemo(() => {
    const id = searchParams.get("goalId");
    return id ? Number(id) : null;
  }, [searchParams]);
  const preselectedGoalName = searchParams.get("goalName");

  // ── VIEW STATE ────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"templates" | "questions">("templates");
  const [selectedTemplate, setSelectedTemplate] = useState<QuestionnaireTemplateDto | null>(null);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [bindingTemplate, setBindingTemplate] = useState<QuestionnaireTemplateDto | null>(null);

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 4000);
    return () => clearTimeout(t);
  }, [alert]);

  // ── TEMPLATE STATE ────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<QuestionnaireTemplateDto[]>([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [tplError, setTplError] = useState<string | null>(null);

  const {
    filters: tplFilters,
    debouncedFilters: debouncedTplFilters,
    setFilter: setTplFilter,
    clearFilters: clearTplFilters,
    hasActiveFilters: tplHasActiveFilters,
    page: tplPage,
    setPage: setTplPage,
  } = useTableFilters<TemplateFilters>(TEMPLATE_INITIAL_FILTERS);

  // Client-side name search since getTemplates() has no search param
  const visibleTemplates = useMemo(() => {
    if (!debouncedTplFilters.search) return templates;
    const q = debouncedTplFilters.search.toLowerCase();
    return templates.filter(t => t.templateName.toLowerCase().includes(q));
  }, [templates, debouncedTplFilters.search]);

  // ── TEMPLATE FORM ─────────────────────────────────────────────────────────
  const [showTplForm, setShowTplForm] = useState(false);
  const [editingTpl, setEditingTpl] = useState<QuestionnaireTemplateDto | null>(null);
  const [tplForm, setTplForm] = useState<TemplateForm>(EMPTY_TEMPLATE_FORM);
  const [tplSubmitting, setTplSubmitting] = useState(false);
  const [tplFormError, setTplFormError] = useState<string | null>(null);

  // ── QUESTIONS STATE ───────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<QuestionDto[]>([]);
  const [qLoading, setQLoading] = useState(false);
  const [qError, setQError] = useState<string | null>(null);

  // ── QUESTION FORM ─────────────────────────────────────────────────────────
  const [showQForm, setShowQForm] = useState(false);
  const [editingQ, setEditingQ] = useState<QuestionDto | null>(null);
  const [qForm, setQForm] = useState<QuestionFormValues>(EMPTY_QUESTION_FORM);
  const [optionRows, setOptionRows] = useState<OptionRow[]>([]);
  const [qSubmitting, setQSubmitting] = useState(false);
  const [qFormError, setQFormError] = useState<string | null>(null);

  // ── FETCH: TEMPLATES ──────────────────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    setTplLoading(true);
    setTplError(null);
    try {
      const res = await adminGoalApi.getTemplates({
        page: tplPage,
        pageSize: PAGE_SIZE,
        activeOnly: debouncedTplFilters.activeOnly === "active" ? true : undefined,
      });
      if (res.success && res.data) {
        setTemplates(res.data);
      } else {
        setTplError(res.message ?? "Failed to load templates.");
      }
    } catch (err) {
      setTplError(errMsg(err) ?? "Failed to load templates.");
    } finally {
      setTplLoading(false);
    }
  }, [tplPage, debouncedTplFilters]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // ── FETCH: QUESTIONS ──────────────────────────────────────────────────────
  const fetchQuestions = useCallback(async () => {
    if (!selectedTemplate) return;
    setQLoading(true);
    setQError(null);
    try {
      const res = await adminGoalApi.getQuestionsByTemplate(selectedTemplate.templateId);
      if (res.success && res.data) {
        setQuestions(res.data);
      } else {
        setQError(res.message ?? "Failed to load questions.");
      }
    } catch (err) {
      setQError(errMsg(err) ?? "Failed to load questions.");
    } finally {
      setQLoading(false);
    }
  }, [selectedTemplate]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  // ── TEMPLATE HANDLERS ─────────────────────────────────────────────────────
  const openCreateTpl = () => {
    setEditingTpl(null); setTplForm(EMPTY_TEMPLATE_FORM); setTplFormError(null); setShowTplForm(true);
  };
  const openEditTpl = (t: QuestionnaireTemplateDto) => {
    setEditingTpl(t);
    setTplForm({ templateName: t.templateName, description: t.description ?? "", isActive: t.isActive });
    setTplFormError(null); setShowTplForm(true);
  };
  const closeTplForm = () => { setShowTplForm(false); setEditingTpl(null); setTplFormError(null); };

  const handleTplSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTplSubmitting(true); setTplFormError(null);
    try {
      // isActive is included via cast — QuestionnaireTemplatePayload doesn't define it
      const payload = { templateName: tplForm.templateName, description: tplForm.description, isActive: tplForm.isActive };
      if (editingTpl) {
        await adminGoalApi.updateTemplate(editingTpl.templateId, payload as any);
        setAlert({ type: "success", message: "Template updated successfully!" });
      } else {
        await adminGoalApi.createTemplate(payload as any);
        setAlert({ type: "success", message: "Template created successfully!" });
      }
      closeTplForm(); fetchTemplates();
    } catch (err) {
      setTplFormError(errMsg(err) ?? (editingTpl ? "Failed to update template." : "Failed to create template."));
    } finally { setTplSubmitting(false); }
  };

  // ── QUESTION MANAGER ──────────────────────────────────────────────────────
  const openManageQuestions = (t: QuestionnaireTemplateDto) => {
    setSelectedTemplate(t);
    setQuestions([]);
    setViewMode("questions");
  };
  const backToTemplates = () => {
    setViewMode("templates");
    setSelectedTemplate(null);
    setQuestions([]);
  };

  // ── QUESTION HANDLERS ─────────────────────────────────────────────────────
  const setQField = <K extends keyof QuestionFormValues>(k: K, v: QuestionFormValues[K]) =>
    setQForm(p => ({ ...p, [k]: v }));

  const handleQTypeChange = (newType: QuestionType) => {
    setQField("questionType", newType);
    if (HAS_OPTIONS(newType) && optionRows.length === 0) {
      setOptionRows([newOptionRow(1), newOptionRow(2)]);
    }
  };

  const openCreateQ = () => {
    setEditingQ(null);
    const form = { ...EMPTY_QUESTION_FORM, displayOrder: questions.length + 1 };
    setQForm(form);
    setOptionRows(HAS_OPTIONS(form.questionType) ? [newOptionRow(1), newOptionRow(2)] : []);
    setQFormError(null); setShowQForm(true);
  };

  const openEditQ = (q: QuestionDto) => {
    setEditingQ(q);
    setQForm({
      questionText: q.questionText, questionType: q.questionType,
      isRequired: q.isRequired, displayOrder: q.displayOrder, isActive: q.isActive
    });
    setOptionRows(
      q.options?.length
        ? q.options.map(o => ({
          id: `o_${o.optionId}`, optionId: o.optionId,
          optionText: o.optionText, optionValue: o.optionValue, displayOrder: o.displayOrder
        }))
        : HAS_OPTIONS(q.questionType) ? [newOptionRow(1), newOptionRow(2)] : []
    );
    setQFormError(null); setShowQForm(true);
  };

  const closeQForm = () => { setShowQForm(false); setEditingQ(null); setQFormError(null); };

  // Option builder helpers
  const addOptionRow = () => setOptionRows(p => [...p, newOptionRow(p.length + 1)]);
  const removeOptionRow = (id: string) =>
    setOptionRows(p => p.filter(r => r.id !== id).map((r, i) => ({ ...r, displayOrder: i + 1 })));
  const updateOptionRow = (id: string, field: "optionText" | "optionValue", value: string) =>
    setOptionRows(p => p.map(r => r.id === id ? { ...r, [field]: value } : r));

  const handleQSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (HAS_OPTIONS(qForm.questionType) && optionRows.length === 0) {
      setQFormError("Please add at least one answer option for this question type."); return;
    }
    if (HAS_OPTIONS(qForm.questionType) && optionRows.some(r => !r.optionText.trim())) {
      setQFormError("All option rows must have non-empty option text."); return;
    }
    setQSubmitting(true); setQFormError(null);
    try {
      const options = HAS_OPTIONS(qForm.questionType)
        ? optionRows.map((r, i) => ({
          ...(r.optionId !== undefined && { optionId: r.optionId }),
          optionText: r.optionText.trim(),
          optionValue: r.optionValue.trim() || toValue(r.optionText),
          displayOrder: i + 1,
        }))
        : undefined;

      const payload = { ...qForm, ...(options !== undefined && { options }) };

      if (editingQ) {
        await adminGoalApi.updateQuestion(editingQ.questionId, payload);
        setAlert({ type: "success", message: "Question updated!" });
      } else {
        await adminGoalApi.createQuestion(selectedTemplate!.templateId, payload);
        setAlert({ type: "success", message: "Question created!" });
      }
      closeQForm(); fetchQuestions();
    } catch (err) {
      setQFormError(errMsg(err) ?? (editingQ ? "Failed to update question." : "Failed to create question."));
    } finally { setQSubmitting(false); }
  };

  // ── DERIVED ───────────────────────────────────────────────────────────────
  const tplHasMore = templates.length >= PAGE_SIZE;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <>
      <PageMeta title="Questionnaire Templates | HabitEvolve Admin" description="Manage questionnaire templates and questions" />
      <PageBreadcrumb pageTitle="Questionnaire Management" />

      {alert && <AlertBanner alert={alert} />}

      {/* ════════════ TEMPLATES VIEW ═══════════════════════════════════ */}
      {viewMode === "templates" && (
        <div className="space-y-5">
          {/* Goal context banner — shown when navigated from Hub 1 */}
          {preselectedGoalId && preselectedGoalName && (
            <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 border-2 border-orange-400 rounded-2xl shadow-[3px_3px_0_0_#1A1D20]">
              <span className="text-xl">🎯</span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-wide">Context from Goals Hub</p>
                <p className="text-sm font-bold text-gray-800">Goal: <span className="font-black">{decodeURIComponent(preselectedGoalName)}</span></p>
              </div>
              <p className="text-xs font-medium text-orange-700 text-right hidden sm:block">
                Click "Bind" on any template below →
              </p>
            </div>
          )}
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-900">Questionnaire Templates</h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">Create and manage onboarding questionnaire templates.</p>
            </div>
            <button onClick={openCreateTpl} className={`${btnBase} bg-emerald-300 text-gray-900 whitespace-nowrap`}>
              <PlusIcon /> Create Template
            </button>
          </div>

          {/* Table */}
          <TableCard
            loading={tplLoading}
            count={visibleTemplates.length}
            title="All Templates"
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>}
          >
            <TableFilterBar<TemplateFilters>
              fields={TEMPLATE_FILTER_FIELDS}
              filters={tplFilters}
              onFilterChange={setTplFilter}
              onClear={clearTplFilters}
              hasActiveFilters={tplHasActiveFilters}
            />

            {tplError && (
              <div className="mx-6 mt-5 bg-red-50 border-2 border-red-300 rounded-2xl p-3 text-sm text-red-700 font-semibold flex items-center justify-between gap-3">
                <span>{tplError}</span>
                <button onClick={fetchTemplates} className="underline font-black hover:no-underline whitespace-nowrap">Retry</button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50/50">
                    {["#", "Template Name", "Status", "Created", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tplLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cells={7} />)
                  ) : visibleTemplates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center">
                        <div className="text-4xl mb-3">📋</div>
                        <p className="text-gray-600 text-sm font-black">
                          {tplHasActiveFilters ? "No templates match your filters." : "No templates yet."}
                        </p>
                        {tplHasActiveFilters && (
                          <button onClick={clearTplFilters} className="mt-2 text-xs font-black text-blue-600 underline hover:no-underline">Clear filters</button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    visibleTemplates.map((t, idx) => (
                      <tr key={t.templateId}
                        className={`transition-colors hover:bg-yellow-50/60 ${idx < visibleTemplates.length - 1 ? "border-b-2 border-gray-100" : ""}`}>
                        <td className="px-4 py-4 text-xs font-black text-gray-400">{(tplPage - 1) * PAGE_SIZE + idx + 1}</td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-black text-gray-900">{t.templateName}</p>
                          {t.description && <p className="text-xs text-gray-400 font-medium mt-0.5 max-w-[220px] truncate">{t.description}</p>}
                        </td>
                        <td className="px-4 py-4"><ActivePill isActive={t.isActive} /></td>
                        <td className="px-4 py-4 text-xs text-gray-400 font-medium whitespace-nowrap">{fmtDate(t.createdAt)}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button title="Edit template" onClick={() => openEditTpl(t)}
                              className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-blue-100 hover:bg-blue-200 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-blue-800">
                              <PencilIcon />
                            </button>
                            <button title="Manage questions" onClick={() => openManageQuestions(t)}
                              className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-purple-100 hover:bg-purple-200 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-purple-800">
                              <ListIcon />
                            </button>
                            <button title="Bind to a Goal" onClick={() => setBindingTemplate(t)}
                              className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-orange-100 hover:bg-orange-200 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-orange-800">
                              <LinkIcon />
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
              page={tplPage} hasMore={tplHasMore} loading={tplLoading}
              onPrev={() => setTplPage(Math.max(1, tplPage - 1))}
              onNext={() => setTplPage(tplPage + 1)}
            />
          </TableCard>
        </div>
      )}

      {/* ════════════ QUESTIONS VIEW ════════════════════════════════════ */}
      {viewMode === "questions" && selectedTemplate && (
        <div className="space-y-5">
          {/* Back + template info */}
          <div className="flex flex-col gap-4">
            <button onClick={backToTemplates}
              className={`${btnBase} bg-white text-gray-700 self-start`}>
              <ArrowLeftIcon /> Back to Templates
            </button>

            {/* Template info card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-purple-50 border-2 border-black rounded-2xl px-5 py-4 shadow-[4px_4px_0_0_#1A1D20]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl border-2 border-black bg-purple-300 flex items-center justify-center text-lg shadow-[2px_2px_0_0_#1A1D20]">📋</div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-black text-gray-900 text-lg">{selectedTemplate.templateName}</h2>

                    <ActivePill isActive={selectedTemplate.isActive} />
                  </div>
                </div>
              </div>
              <button onClick={openCreateQ} className={`${btnBase} bg-emerald-300 text-gray-900 whitespace-nowrap`}>
                <PlusIcon /> Add New Question
              </button>
            </div>
          </div>

          {/* Questions table */}
          <TableCard loading={qLoading} count={questions.length} title="Questions"
            icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
          >
            {qError && (
              <div className="mx-6 mt-5 bg-red-50 border-2 border-red-300 rounded-2xl p-3 text-sm text-red-700 font-semibold flex items-center justify-between gap-3">
                <span>{qError}</span>
                <button onClick={fetchQuestions} className="underline font-black hover:no-underline whitespace-nowrap">Retry</button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50/50">
                    {["Order", "Question Text", "Type", "Required", "Options", "Status", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {qLoading ? (
                    Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cells={7} />)
                  ) : questions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center">
                        <div className="text-4xl mb-3">❓</div>
                        <p className="text-gray-600 text-sm font-black">No questions yet.</p>
                        <button onClick={openCreateQ}
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-purple-700 underline hover:no-underline">
                          <PlusIcon /> Add the first question
                        </button>
                      </td>
                    </tr>
                  ) : (
                    questions
                      .slice()
                      .sort((a, b) => a.displayOrder - b.displayOrder)
                      .map((q, idx, arr) => (
                        <tr key={q.questionId}
                          className={`transition-colors hover:bg-purple-50/50 ${idx < arr.length - 1 ? "border-b-2 border-gray-100" : ""}`}>
                          <td className="px-4 py-4">
                            <span className="w-7 h-7 flex items-center justify-center rounded-xl border-2 border-black bg-gray-100 text-xs font-black text-gray-600 shadow-[1px_1px_0_0_#1A1D20]">
                              {q.displayOrder}
                            </span>
                          </td>
                          <td className="px-4 py-4 max-w-[260px]">
                            <p className="text-sm font-bold text-gray-800 line-clamp-2">{q.questionText}</p>
                          </td>
                          <td className="px-4 py-4"><QuestionTypeBadge type={q.questionType} /></td>
                          <td className="px-4 py-4">
                            {q.isRequired ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-black border-2 border-red-300 bg-red-50 text-red-700">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                Required
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400 font-medium">Optional</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm font-black text-gray-600 text-center">
                            {HAS_OPTIONS(q.questionType) ? q.options?.length ?? 0 : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-4"><ActivePill isActive={q.isActive} /></td>
                          <td className="px-4 py-4">
                            <button title="Edit question" onClick={() => openEditQ(q)}
                              className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-blue-100 hover:bg-blue-200 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-blue-800">
                              <PencilIcon />
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </TableCard>
        </div>
      )}

      {/* ════════════ MODAL: TEMPLATE CREATE / EDIT ════════════════════ */}
      {showTplForm && (
        <GameModal title={editingTpl ? "Edit Template" : "Create Template"} onClose={closeTplForm}>
          <form onSubmit={handleTplSubmit} className="space-y-4">
            <FormField label="Template Name *">
              <input required type="text" value={tplForm.templateName}
                onChange={e => setTplForm(p => ({ ...p, templateName: e.target.value }))}
                placeholder="e.g. Fitness Onboarding Survey" className={inputCls} />
            </FormField>
            <FormField label="Description">
              <textarea rows={3} value={tplForm.description}
                onChange={e => setTplForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Purpose and context of this questionnaire…" className={`${inputCls} resize-none`} />
            </FormField>
            <Toggle checked={tplForm.isActive}
              onChange={v => setTplForm(p => ({ ...p, isActive: v }))}
              label="Active" sub="Published and visible for assignment to goals" />
            {tplFormError && (
              <p className="text-xs font-bold text-red-600 bg-red-50 border-2 border-red-300 rounded-xl px-3 py-2">{tplFormError}</p>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={closeTplForm} disabled={tplSubmitting}
                className={`${btnBase} flex-1 justify-center bg-white text-gray-700`}>Cancel</button>
              <button type="submit" disabled={tplSubmitting}
                className={`${btnBase} flex-1 justify-center ${editingTpl ? "bg-blue-200 text-blue-900" : "bg-emerald-300 text-gray-900"}`}>
                {tplSubmitting
                  ? <><Spinner />{editingTpl ? "Saving…" : "Creating…"}</>
                  : editingTpl ? <><SaveIcon />Save Changes</> : <><PlusIcon />Create Template</>}
              </button>
            </div>
          </form>
        </GameModal>
      )}

      {/* ════════════ MODAL: QUESTION CREATE / EDIT ════════════════════ */}
      {showQForm && (
        <GameModal
          title={editingQ ? "Edit Question" : "Add New Question"}
          onClose={closeQForm}
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleQSubmit} className="space-y-4">

            {/* Question Text */}
            <FormField label="Question Text *">
              <textarea required rows={3} value={qForm.questionText}
                onChange={e => setQField("questionText", e.target.value)}
                placeholder="e.g. What is your current fitness level?" className={`${inputCls} resize-none`} />
            </FormField>

            {/* Question Type */}
            <FormField label="Question Type *">
              <select required value={qForm.questionType}
                onChange={e => handleQTypeChange(e.target.value as QuestionType)}
                className={inputCls}>
                {QUESTION_TYPES.map(t => (
                  <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>
                ))}
              </select>
              {/* Preview of selected type */}
              <div className="mt-2 flex items-center gap-2">
                <QuestionTypeBadge type={qForm.questionType} />
                {HAS_OPTIONS(qForm.questionType) && (
                  <span className="text-xs text-gray-400 font-medium">→ Answer options required below</span>
                )}
              </div>
            </FormField>

            {/* Display Order + Required + Active in a row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Display Order *" hint="Lower = shown first">
                <input required type="number" min={1} value={qForm.displayOrder}
                  onChange={e => setQField("displayOrder", Number(e.target.value))}
                  className={inputCls} />
              </FormField>
              <div className="sm:col-span-2 space-y-2">
                <Toggle checked={qForm.isRequired} onChange={v => setQField("isRequired", v)}
                  label="Required" sub="Player must answer this question" />
                <Toggle checked={qForm.isActive} onChange={v => setQField("isActive", v)}
                  label="Active" sub="Visible in the questionnaire" />
              </div>
            </div>

            {/* ── OPTIONS BUILDER (SingleChoice / MultipleChoice) ─── */}
            {HAS_OPTIONS(qForm.questionType) && (
              <div className="border-2 border-dashed border-black rounded-2xl bg-gray-50/60 overflow-hidden">
                {/* Sub-card header */}
                <div className="flex items-center justify-between px-4 py-3 border-b-2 border-dashed border-black bg-purple-50">
                  <div>
                    <p className="text-sm font-black text-gray-900">Answer Options</p>
                    <p className="text-xs text-gray-500 font-medium">
                      {qForm.questionType === "MultipleChoice" ? "Players can select multiple." : "Players select one."}
                    </p>
                  </div>
                  <button type="button" onClick={addOptionRow}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black border-2 border-black rounded-xl bg-emerald-200 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                    <PlusIcon /> Add Option
                  </button>
                </div>

                <div className="p-4 space-y-2">
                  {optionRows.length === 0 ? (
                    <div className="text-center py-5 border-2 border-dashed border-gray-300 rounded-xl bg-white">
                      <p className="text-sm text-gray-400 font-semibold">No options yet — click "Add Option" above.</p>
                    </div>
                  ) : (
                    optionRows.map((row, i) => (
                      <div key={row.id}
                        className="flex items-center gap-2 bg-white border-2 border-black rounded-xl px-3 py-2 shadow-[2px_2px_0_0_#1A1D20]">
                        <span className="text-xs font-black text-gray-400 w-5 flex-shrink-0 select-none">{i + 1}.</span>
                        <input
                          type="text"
                          value={row.optionText}
                          onChange={e => updateOptionRow(row.id, "optionText", e.target.value)}
                          placeholder="Option label…"
                          className={`${miniInputCls} flex-1 min-w-0`}
                        />
                        <input
                          type="text"
                          value={row.optionValue}
                          onChange={e => updateOptionRow(row.id, "optionValue", e.target.value)}
                          placeholder="value (auto)"
                          className={`${miniInputCls} w-28 flex-shrink-0`}
                        />
                        <button type="button" onClick={() => removeOptionRow(row.id)}
                          className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg border-2 border-black bg-red-100 text-red-600 hover:bg-red-200 shadow-[1px_1px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
                          <XIcon />
                        </button>
                      </div>
                    ))
                  )}
                  <p className="text-xs text-gray-400 font-medium pt-1">
                    "Value" field is auto-generated from the label if left blank. Use it for API mappings.
                  </p>
                </div>
              </div>
            )}

            {qFormError && (
              <p className="text-xs font-bold text-red-600 bg-red-50 border-2 border-red-300 rounded-xl px-3 py-2">{qFormError}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={closeQForm} disabled={qSubmitting}
                className={`${btnBase} flex-1 justify-center bg-white text-gray-700`}>Cancel</button>
              <button type="submit" disabled={qSubmitting}
                className={`${btnBase} flex-1 justify-center ${editingQ ? "bg-blue-200 text-blue-900" : "bg-emerald-300 text-gray-900"}`}>
                {qSubmitting
                  ? <><Spinner />{editingQ ? "Saving…" : "Creating…"}</>
                  : editingQ ? <><SaveIcon />Save Question</> : <><PlusIcon />Add Question</>}
              </button>
            </div>
          </form>
        </GameModal>
      )}

      {/* ════════════ MODAL: BIND TO GOAL ══════════════════════════════ */}
      {bindingTemplate && (
        <BindToGoalModal
          template={bindingTemplate}
          preselectedGoalId={preselectedGoalId}
          onClose={() => setBindingTemplate(null)}
          onAlert={a => setAlert(a)}
        />
      )}
    </>
  );
}

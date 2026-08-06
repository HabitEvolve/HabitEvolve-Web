import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { useAlert } from "../context/AlertContext";
import { adminGoalApi } from "../api/adminGoalApi";
import { useTableFilters } from "../hooks/useTableFilters";
import { TableFilterBar } from "../components/common/TableFilterBar";
import { DynamicIcon } from "../components/ui/DynamicIcon";
import { useNavigate } from "react-router";
import type { FilterField } from "../hooks/useTableFilters";
import type {
  GoalCategoryDto,
  GoalCategoryPayload,
  GoalDto,
  GoalPayload,
} from "../types/adminGoal.types";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

const EMPTY_CAT_FORM: GoalCategoryPayload = {
  categoryCode: "",
  categoryName: "",
  description: "",
  iconCode: "",
  displayOrder: 1,
  isActive: true,
};

const EMPTY_GOAL_FORM: GoalPayload = {
  goalCode: "",
  goalName: "",
  description: "",
  categoryId: 0,
  isActive: true,
};

// ── FILTER TYPES & INITIAL STATES ─────────────────────────────────────────────
type CatFilters  = { search: string; activeOnly: string };
type GoalFilters = { search: string; categoryCode: string };

const CAT_INITIAL_FILTERS:  CatFilters  = { search: "", activeOnly: "" };
const GOAL_INITIAL_FILTERS: GoalFilters = { search: "", categoryCode: "" };

// Static filter fields for categories (goal fields are dynamic — built in render)
const CAT_FILTER_FIELDS: FilterField[] = [
  { key: "search",    label: "Search", type: "text",   placeholder: "Search code or name…" },
  { key: "activeOnly", label: "Status", type: "select", options: [
    { label: "Active Only", value: "active" },
  ]},
];

// ── SHARED STYLES ─────────────────────────────────────────────────────────────
// btnBase carries shape/typography only; each call-site adds its own fill from
// the tokens below, so there is exactly one place that defines button geometry.
const btnBase =
  "inline-flex items-center gap-2 px-4 py-2 font-medium text-sm rounded-sky-chip " +
  "transition disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

const btnPrimary = "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-fill sky-lift";
const btnGhost = "sky-glass-chip text-sky-deep sky-lift";

const inputCls =
  "w-full px-4 py-2.5 rounded-sky-chip border border-white/80 bg-white/60 text-sm text-sky-ink transition " +
  "placeholder:text-sky-ink-3 focus:outline-hidden focus:border-sky-deep focus:bg-white/85 focus:ring-3 focus:ring-sky-deep/18";

// Row action buttons. One geometry, three tints — deep = neutral edit, peach =
// "go configure something else", violet = evaluation/epic. Tint only ever names
// the destination, never the danger level (nothing here is destructive).
const iconBtnBase =
  "w-8 h-8 flex items-center justify-center rounded-sky-chip border transition " +
  "hover:-translate-y-px active:translate-y-0 active:scale-95";
const ICON_BTN: Record<"deep" | "peach" | "violet", string> = {
  deep: "border-sky-deep/20 bg-sky-deep/8 text-sky-deep hover:bg-sky-deep/14",
  peach: "border-sky-peach-deep/25 bg-sky-peach/18 text-sky-peach-deep hover:bg-sky-peach/28",
  violet: "border-sky-violet/22 bg-sky-violet/12 text-sky-violet-deep hover:bg-sky-violet/20",
};

// Inline error banner — rail + tinted panel + text, so state is never colour-only.
const errorBanner =
  "relative mx-6 mt-5 overflow-hidden rounded-sky-chip bg-sky-rose/12 border border-sky-rose/28 " +
  "pl-4 pr-3 py-3 text-sm text-sky-rose-deep font-medium flex items-center justify-between gap-3";

// ── HELPERS ───────────────────────────────────────────────────────────────────
const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

const errMsg = (err: unknown) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

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

// ── ACTIVE PILL ───────────────────────────────────────────────────────────────
// Active = TEAL (§4). Dot + word together, never colour alone.
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
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
      checked ? "translate-x-6" : "translate-x-0"
    }`} />
  </button>
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

// ── TABLE CARD ────────────────────────────────────────────────────────────────
const TableCard = ({ icon, title, count, loading, children }: {
  icon: React.ReactNode; title: string; count?: number; loading: boolean; children: React.ReactNode;
}) => (
  <div className="sky-glass-admin rounded-sky-card overflow-hidden">
    <div className="relative flex items-center gap-3 px-6 py-4 border-b border-white/60 bg-white/40">
      <span className="text-sky-deep">{icon}</span>
      <span className="font-display font-semibold text-sky-ink text-sm">{title}</span>
      {!loading && count !== undefined && (
        <span className="font-display ml-auto bg-sky-deep/12 text-sky-deep text-xs font-semibold px-2.5 py-0.5 rounded-full tabular-nums">
          {count}
        </span>
      )}
    </div>
    {children}
  </div>
);

// ── FOLDER ICON ───────────────────────────────────────────────────────────────
const FolderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);
const TargetIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
  </svg>
);
const TaskLibIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" />
  </svg>
);
const EvalIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
  </svg>
);

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminGoalManagement() {
  const navigate = useNavigate();
  const notify = useAlert();

  // ── SHARED ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"categories" | "goals">("categories");

  // ── CATEGORY FILTERS + PAGINATION (via hook) ───────────────────────────────
  const {
    filters: catFilters,
    debouncedFilters: debouncedCatFilters,
    setFilter: setCatFilter,
    clearFilters: clearCatFilters,
    hasActiveFilters: catHasActiveFilters,
    page: catPage,
    setPage: setCatPage,
  } = useTableFilters<CatFilters>(CAT_INITIAL_FILTERS);

  // ── GOAL FILTERS + PAGINATION (via hook) ───────────────────────────────────
  const {
    filters: goalFilters,
    debouncedFilters: debouncedGoalFilters,
    setFilter: setGoalFilter,
    clearFilters: clearGoalFilters,
    hasActiveFilters: goalHasActiveFilters,
    page: goalPage,
    setPage: setGoalPage,
  } = useTableFilters<GoalFilters>(GOAL_INITIAL_FILTERS);

  // ── CATEGORIES DATA ────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<GoalCategoryDto[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  // ── GOALS DATA ─────────────────────────────────────────────────────────────
  const [goals, setGoals] = useState<GoalDto[]>([]);
  const [goalLoading, setGoalLoading] = useState(false);
  const [goalError, setGoalError] = useState<string | null>(null);

  // ALL categories (unpaginated) — for goal form category dropdown
  const [allCategories, setAllCategories] = useState<GoalCategoryDto[]>([]);

  // ── CATEGORY MODAL STATE ───────────────────────────────────────────────────
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState<GoalCategoryDto | null>(null);
  const [catForm, setCatForm] = useState<GoalCategoryPayload>(EMPTY_CAT_FORM);
  const [catSubmitting, setCatSubmitting] = useState(false);
  const [catFormError, setCatFormError] = useState<string | null>(null);

  // ── GOAL MODAL STATE ───────────────────────────────────────────────────────
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalDto | null>(null);
  const [goalForm, setGoalForm] = useState<GoalPayload>(EMPTY_GOAL_FORM);
  const [goalSubmitting, setGoalSubmitting] = useState(false);
  const [goalFormError, setGoalFormError] = useState<string | null>(null);

  // ── FETCH: CATEGORIES ──────────────────────────────────────────────────────
  // debouncedCatFilters is included in deps — filter changes trigger a re-fetch automatically.
  const fetchCategories = useCallback(async () => {
    setCatLoading(true);
    setCatError(null);
    try {
      const res = await adminGoalApi.getCategories({
        page:      catPage,
        pageSize:  PAGE_SIZE,
        search:    debouncedCatFilters.search     || undefined,
        activeOnly: debouncedCatFilters.activeOnly === "active" ? true : undefined,
      });
      if (res.success && res.data) {
        setCategories(res.data);
      } else {
        setCatError(res.message ?? "Failed to load categories.");
      }
    } catch (err) {
      setCatError(errMsg(err) ?? "Failed to load categories.");
    } finally {
      setCatLoading(false);
    }
  }, [catPage, debouncedCatFilters]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // ── FETCH: GOALS ───────────────────────────────────────────────────────────
  const fetchGoals = useCallback(async () => {
    setGoalLoading(true);
    setGoalError(null);
    try {
      const res = await adminGoalApi.getGoals({
        page:         goalPage,
        pageSize:     PAGE_SIZE,
        search:       debouncedGoalFilters.search       || undefined,
        categoryCode: debouncedGoalFilters.categoryCode || undefined,
      });
      if (res.success && res.data) {
        setGoals(res.data);
      } else {
        setGoalError(res.message ?? "Failed to load goals.");
      }
    } catch (err) {
      setGoalError(errMsg(err) ?? "Failed to load goals.");
    } finally {
      setGoalLoading(false);
    }
  }, [goalPage, debouncedGoalFilters]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  // ── FETCH: ALL CATEGORIES for goal form dropdown ───────────────────────────
  const fetchAllCategories = useCallback(async () => {
    try {
      const res = await adminGoalApi.getCategories({ pageSize: 1000 });
      if (res.success && res.data) setAllCategories(res.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchAllCategories(); }, [fetchAllCategories]);

  // ── HELPERS ───────────────────────────────────────────────────────────────
  const setCatField = <K extends keyof GoalCategoryPayload>(k: K, v: GoalCategoryPayload[K]) =>
    setCatForm(p => ({ ...p, [k]: v }));

  const setGoalField = <K extends keyof GoalPayload>(k: K, v: GoalPayload[K]) =>
    setGoalForm(p => ({ ...p, [k]: v }));

  // ── CATEGORY MODAL HANDLERS ────────────────────────────────────────────────
  const openCreateCat = () => {
    setEditingCat(null); setCatForm(EMPTY_CAT_FORM); setCatFormError(null); setShowCatForm(true);
  };
  const openEditCat = (cat: GoalCategoryDto) => {
    setEditingCat(cat);
    setCatForm({
      categoryCode: cat.categoryCode, categoryName: cat.categoryName,
      description: cat.description ?? "", iconCode: cat.iconCode ?? "",
      displayOrder: cat.displayOrder, isActive: cat.isActive,
    });
    setCatFormError(null); setShowCatForm(true);
  };
  const closeCatForm = () => { setShowCatForm(false); setEditingCat(null); setCatFormError(null); };

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatSubmitting(true); setCatFormError(null);
    try {
      if (editingCat) {
        await adminGoalApi.updateCategory(editingCat.categoryId, catForm);
        notify.success("Category updated successfully!");
      } else {
        await adminGoalApi.createCategory(catForm);
        notify.success("Category created successfully!");
      }
      closeCatForm(); fetchCategories(); fetchAllCategories();
    } catch (err) {
      setCatFormError(errMsg(err) ?? (editingCat ? "Failed to update category." : "Failed to create category."));
    } finally { setCatSubmitting(false); }
  };

  // ── GOAL MODAL HANDLERS ────────────────────────────────────────────────────
  const openCreateGoal = () => {
    setEditingGoal(null); setGoalForm(EMPTY_GOAL_FORM); setGoalFormError(null); setShowGoalForm(true);
  };
  const openEditGoal = (goal: GoalDto) => {
    setEditingGoal(goal);
    setGoalForm({
      goalCode: goal.goalCode, goalName: goal.goalName,
      description: goal.description ?? "", categoryId: goal.categoryId, isActive: goal.isActive,
    });
    setGoalFormError(null); setShowGoalForm(true);
  };
  const closeGoalForm = () => { setShowGoalForm(false); setEditingGoal(null); setGoalFormError(null); };

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalForm.categoryId) { setGoalFormError("Please select a category."); return; }
    setGoalSubmitting(true); setGoalFormError(null);
    try {
      if (editingGoal) {
        await adminGoalApi.updateGoal(editingGoal.goalId, goalForm);
        notify.success("Goal updated successfully!");
      } else {
        await adminGoalApi.createGoal(goalForm);
        notify.success("Goal created successfully!");
      }
      closeGoalForm(); fetchGoals();
    } catch (err) {
      setGoalFormError(errMsg(err) ?? (editingGoal ? "Failed to update goal." : "Failed to create goal."));
    } finally { setGoalSubmitting(false); }
  };

  // ── DERIVED ───────────────────────────────────────────────────────────────
  const catHasMore  = categories.length >= PAGE_SIZE;
  const goalHasMore = goals.length >= PAGE_SIZE;

  // Dynamic goal filter fields — category options come from allCategories
  const goalFilterFields: FilterField[] = [
    { key: "search",       label: "Search",   type: "text",   placeholder: "Search code or name…" },
    { key: "categoryCode", label: "Category", type: "select",
      options: allCategories.map(c => ({ label: c.categoryName, value: c.categoryCode })) },
  ];

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      <PageMeta
        title="Goal & Category Management | HabitEvolve Admin"
        description="Manage goal categories and goals for the HabitEvolve platform"
      />
      <PageBreadcrumb pageTitle="Goal & Category Management" />

      {/* ── TAB SWITCHER ──────────────────────────────────────────────── */}
      {/* Segmented control on one glass rail: the active segment is the only
          filled surface on the page above the fold, so it reads as "you are
          here" without needing a second cue. */}
      <div className="inline-flex gap-1 p-1 mb-6 rounded-sky-chip sky-glass-chip">
        {(["categories", "goals"] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            aria-pressed={activeTab === tab}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-sky-chip capitalize transition ${
              activeTab === tab
                ? "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-fill"
                : "text-sky-ink-2 hover:bg-white/70 hover:text-sky-deep"
            }`}
          >
            {tab === "categories" ? <FolderIcon /> : <TargetIcon />}
            {tab}
          </button>
        ))}
      </div>

      {/* ════════════════════ TAB 1: CATEGORIES ════════════════════════ */}
      {activeTab === "categories" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-semibold text-sky-ink">Goal Categories</h1>
              <p className="text-sm text-sky-ink-2 mt-0.5">Organise habits into top-level categories.</p>
            </div>
            <button type="button" onClick={openCreateCat} className={`${btnBase} ${btnPrimary} whitespace-nowrap`}>
              <PlusIcon /> Create Category
            </button>
          </div>

          <TableCard loading={catLoading} count={categories.length} title="All Categories" icon={<FolderIcon />}>
            {/* Filter bar — adding a new filter = one entry in CAT_FILTER_FIELDS */}
            <TableFilterBar<CatFilters>
              fields={CAT_FILTER_FIELDS}
              filters={catFilters}
              onFilterChange={setCatFilter}
              onClear={clearCatFilters}
              hasActiveFilters={catHasActiveFilters}
            />

            {catError && (
              <div className={errorBanner}>
                <span aria-hidden className="absolute left-0 inset-y-0 w-[3px] bg-sky-rose" />
                <span>{catError}</span>
                <button type="button" onClick={fetchCategories} className="underline font-semibold hover:no-underline whitespace-nowrap">Retry</button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="sky-table-head">
                    {["#", "Code", "Name", "Icon", "Order", "Status", "Created", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cells={8} />)
                  ) : categories.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-20 text-center">
                        <span className="mx-auto mb-3 flex items-center justify-center w-14 h-14 rounded-full bg-sky-deep/8 text-sky-deep">
                          <FolderIcon />
                        </span>
                        <p className="font-display text-sky-ink text-sm font-semibold">
                          {catHasActiveFilters ? "No categories match your filters." : "No categories yet."}
                        </p>
                        {catHasActiveFilters && (
                          <button type="button" onClick={clearCatFilters} className="mt-2 text-xs font-semibold text-sky-deep underline hover:no-underline">
                            Clear filters
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    categories.map((cat, idx) => (
                      <tr key={cat.categoryId} className="sky-table-row">
                        <td className="px-4 py-4 text-xs font-semibold text-sky-ink-3 tabular-nums">{(catPage - 1) * PAGE_SIZE + idx + 1}</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-sky-chip text-xs font-semibold font-display tracking-wide bg-sky-deep/10 text-sky-deep">
                            {cat.categoryCode}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-sky-ink">{cat.categoryName}</td>
                        <td className="px-4 py-4">
                          {cat.iconCode ? (
                            <div className="w-8 h-8 flex items-center justify-center rounded-sky-chip bg-white/70 border border-white/85 text-sky-deep shadow-[0_4px_10px_-6px_rgba(36,52,77,0.35)]">
                              <DynamicIcon iconName={cat.iconCode} size={16} strokeWidth={2.2} />
                            </div>
                          ) : (
                            <span className="text-sky-ink-3 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-sky-ink-2 text-center tabular-nums">{cat.displayOrder}</td>
                        <td className="px-4 py-4"><ActivePill isActive={cat.isActive} /></td>
                        <td className="px-4 py-4 text-xs text-sky-ink-3 whitespace-nowrap">{formatDate(cat.createdAt)}</td>
                        <td className="px-4 py-4">
                          <button
                            type="button" title="Edit category" onClick={() => openEditCat(cat)}
                            className={`${iconBtnBase} ${ICON_BTN.deep}`}
                          >
                            <PencilIcon />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <PaginationBar
              page={catPage} hasMore={catHasMore} loading={catLoading}
              onPrev={() => setCatPage(Math.max(1, catPage - 1))}
              onNext={() => setCatPage(catPage + 1)}
            />
          </TableCard>
        </div>
      )}

      {/* ════════════════════ TAB 2: GOALS ═════════════════════════════ */}
      {activeTab === "goals" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-semibold text-sky-ink">Goals</h1>
              <p className="text-sm text-sky-ink-2 mt-0.5">Define individual habit goals within categories.</p>
            </div>
            <button type="button" onClick={openCreateGoal} className={`${btnBase} ${btnPrimary} whitespace-nowrap`}>
              <PlusIcon /> Create Goal
            </button>
          </div>

          <TableCard loading={goalLoading} count={goals.length} title="All Goals" icon={<TargetIcon />}>
            {/* Filter bar — goalFilterFields computed above with dynamic category options */}
            <TableFilterBar<GoalFilters>
              fields={goalFilterFields}
              filters={goalFilters}
              onFilterChange={setGoalFilter}
              onClear={clearGoalFilters}
              hasActiveFilters={goalHasActiveFilters}
            />

            {goalError && (
              <div className={errorBanner}>
                <span aria-hidden className="absolute left-0 inset-y-0 w-[3px] bg-sky-rose" />
                <span>{goalError}</span>
                <button type="button" onClick={fetchGoals} className="underline font-semibold hover:no-underline whitespace-nowrap">Retry</button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="sky-table-head">
                    {["#", "Code", "Goal Name", "Category", "Status", "Created", "Configure"].map(h => (
                      <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {goalLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cells={7} />)
                  ) : goals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center">
                        <span className="mx-auto mb-3 flex items-center justify-center w-14 h-14 rounded-full bg-sky-deep/8 text-sky-deep">
                          <TargetIcon />
                        </span>
                        <p className="font-display text-sky-ink text-sm font-semibold">
                          {goalHasActiveFilters ? "No goals match your filters." : "No goals defined yet."}
                        </p>
                        {goalHasActiveFilters && (
                          <button type="button" onClick={clearGoalFilters} className="mt-2 text-xs font-semibold text-sky-deep underline hover:no-underline">
                            Clear filters
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    goals.map((goal, idx) => (
                      <tr key={goal.goalId} className="sky-table-row">
                        <td className="px-4 py-4 text-xs font-semibold text-sky-ink-3 tabular-nums">{(goalPage - 1) * PAGE_SIZE + idx + 1}</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-sky-chip text-xs font-semibold font-display tracking-wide bg-sky-violet/12 text-sky-violet-deep">
                            {goal.goalCode}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-sky-ink">{goal.goalName}</td>
                        <td className="px-4 py-4">
                          <span className="sky-badge sky-badge-neutral">{goal.categoryCode}</span>
                        </td>
                        <td className="px-4 py-4"><ActivePill isActive={goal.isActive} /></td>
                        <td className="px-4 py-4 text-xs text-sky-ink-3 whitespace-nowrap">{formatDate(goal.createdAt)}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button" title="Edit goal" onClick={() => openEditGoal(goal)}
                              className={`${iconBtnBase} ${ICON_BTN.deep}`}
                            >
                              <PencilIcon />
                            </button>
                            <button
                              type="button"
                              title="Configure Task Library for this Goal"
                              onClick={() => navigate(`/practical-tasks?goalId=${goal.goalId}&goalName=${encodeURIComponent(goal.goalName)}`)}
                              className={`${iconBtnBase} ${ICON_BTN.peach}`}
                            >
                              <TaskLibIcon />
                            </button>
                            <button
                              type="button"
                              title="Bind Questionnaire Template to this Goal"
                              onClick={() => navigate(`/questionnaires?goalId=${goal.goalId}&goalName=${encodeURIComponent(goal.goalName)}`)}
                              className={`${iconBtnBase} ${ICON_BTN.violet}`}
                            >
                              <EvalIcon />
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
              page={goalPage} hasMore={goalHasMore} loading={goalLoading}
              onPrev={() => setGoalPage(Math.max(1, goalPage - 1))}
              onNext={() => setGoalPage(goalPage + 1)}
            />
          </TableCard>
        </div>
      )}

      {/* ════════════════ MODAL: CATEGORY CREATE / EDIT ════════════════ */}
      {showCatForm && (
        <GameModal title={editingCat ? "Edit Category" : "Create Category"} onClose={closeCatForm}>
          <form onSubmit={handleCatSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Category Code *">
                <input required type="text" value={catForm.categoryCode}
                  onChange={e => setCatField("categoryCode", e.target.value.toUpperCase())}
                  placeholder="e.g. FITNESS" className={inputCls} />
              </FormField>
              <FormField label="Category Name *">
                <input required type="text" value={catForm.categoryName}
                  onChange={e => setCatField("categoryName", e.target.value)}
                  placeholder="e.g. Fitness & Health" className={inputCls} />
              </FormField>
            </div>
            <FormField label="Description">
              <textarea rows={3} value={catForm.description ?? ""}
                onChange={e => setCatField("description", e.target.value)}
                placeholder="What does this category cover?" className={`${inputCls} resize-none`} />
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* iconCode is resolved by <DynamicIcon>, which maps lucide names —
                  the old "emoji" hint pointed at something that never rendered. */}
              <FormField label="Icon Code" hint="Lucide icon name (e.g. dumbbell, moon, target)">
                <input type="text" value={catForm.iconCode ?? ""}
                  onChange={e => setCatField("iconCode", e.target.value)}
                  placeholder="dumbbell" className={inputCls} />
              </FormField>
              <FormField label="Display Order *">
                <input required type="number" min={1} value={catForm.displayOrder}
                  onChange={e => setCatField("displayOrder", Number(e.target.value))} className={inputCls} />
              </FormField>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-sky-chip bg-white/55 border border-white/80">
              <div>
                <p className="text-sm font-semibold text-sky-ink">Active</p>
                <p className="text-xs text-sky-ink-3">Visible to players on the platform</p>
              </div>
              <Toggle checked={catForm.isActive} onChange={v => setCatField("isActive", v)} />
            </div>
            {catFormError && (
              <p className="text-xs font-medium text-sky-rose-deep bg-sky-rose/12 border border-sky-rose/28 rounded-sky-chip px-3 py-2">{catFormError}</p>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={closeCatForm} disabled={catSubmitting}
                className={`${btnBase} ${btnGhost} flex-1 justify-center`}>Cancel</button>
              <button type="submit" disabled={catSubmitting}
                className={`${btnBase} ${btnPrimary} flex-1 justify-center`}>
                {catSubmitting
                  ? <><Spinner size={13} />{editingCat ? "Saving…" : "Creating…"}</>
                  : editingCat ? <><SaveIcon />Save Changes</> : <><PlusIcon />Create Category</>}
              </button>
            </div>
          </form>
        </GameModal>
      )}

      {/* ════════════════ MODAL: GOAL CREATE / EDIT ════════════════════ */}
      {showGoalForm && (
        <GameModal title={editingGoal ? "Edit Goal" : "Create Goal"} onClose={closeGoalForm}>
          <form onSubmit={handleGoalSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Goal Code *">
                <input required type="text" value={goalForm.goalCode}
                  onChange={e => setGoalField("goalCode", e.target.value.toUpperCase())}
                  placeholder="e.g. DAILY_STEPS" className={inputCls} />
              </FormField>
              <FormField label="Goal Name *">
                <input required type="text" value={goalForm.goalName}
                  onChange={e => setGoalField("goalName", e.target.value)}
                  placeholder="e.g. Daily Step Count" className={inputCls} />
              </FormField>
            </div>
            <FormField label="Category *">
              <select required value={goalForm.categoryId || ""} className={inputCls}
                onChange={e => setGoalField("categoryId", Number(e.target.value))}>
                <option value="" disabled>Select a category…</option>
                {allCategories.map(cat => (
                  <option key={cat.categoryId} value={cat.categoryId}>
                    {cat.categoryName}
                  </option>
                ))}
              </select>
              {allCategories.length === 0 && (
                <p className="text-xs text-sky-peach-deep font-medium mt-1">No categories available. Create a category first.</p>
              )}
            </FormField>
            <FormField label="Description">
              <textarea rows={3} value={goalForm.description ?? ""}
                onChange={e => setGoalField("description", e.target.value)}
                placeholder="Describe this goal and how it's tracked…" className={`${inputCls} resize-none`} />
            </FormField>
            <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-sky-chip bg-white/55 border border-white/80">
              <div>
                <p className="text-sm font-semibold text-sky-ink">Active</p>
                <p className="text-xs text-sky-ink-3">Players can select this goal when setting up habits</p>
              </div>
              <Toggle checked={goalForm.isActive} onChange={v => setGoalField("isActive", v)} />
            </div>
            {goalFormError && (
              <p className="text-xs font-medium text-sky-rose-deep bg-sky-rose/12 border border-sky-rose/28 rounded-sky-chip px-3 py-2">{goalFormError}</p>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={closeGoalForm} disabled={goalSubmitting}
                className={`${btnBase} ${btnGhost} flex-1 justify-center`}>Cancel</button>
              <button type="submit" disabled={goalSubmitting}
                className={`${btnBase} ${btnPrimary} flex-1 justify-center`}>
                {goalSubmitting
                  ? <><Spinner size={13} />{editingGoal ? "Saving…" : "Creating…"}</>
                  : editingGoal ? <><SaveIcon />Save Changes</> : <><PlusIcon />Create Goal</>}
              </button>
            </div>
          </form>
        </GameModal>
      )}
    </>
  );
}

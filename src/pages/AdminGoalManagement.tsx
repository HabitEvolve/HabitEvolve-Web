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
const btnBase =
  "inline-flex items-center gap-2 px-4 py-2 font-black text-sm border-2 border-black rounded-full " +
  "shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 " +
  "disabled:shadow-[3px_3px_0_0_#1A1D20] transition-all";

const inputCls =
  "w-full px-4 py-2.5 border-2 border-black rounded-2xl text-sm font-medium bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder:text-gray-400";

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
const ActivePill = ({ isActive }: { isActive: boolean }) => (
  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border-2 ${
    isActive
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
    className={`relative flex-shrink-0 w-12 h-6 rounded-full border-2 border-black transition-colors shadow-[2px_2px_0_0_#1A1D20] ${
      checked ? "bg-emerald-400" : "bg-gray-300"
    }`}
  >
    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full border-2 border-black bg-white transition-transform ${
      checked ? "translate-x-6" : "translate-x-0"
    }`} />
  </button>
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

// ── TABLE CARD ────────────────────────────────────────────────────────────────
const TableCard = ({ icon, title, count, loading, children }: {
  icon: React.ReactNode; title: string; count?: number; loading: boolean; children: React.ReactNode;
}) => (
  <div className="bg-white border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] overflow-hidden">
    <div className="flex items-center gap-3 px-6 py-4 border-b-4 border-black bg-gray-50">
      <span className="text-gray-600">{icon}</span>
      <span className="font-black text-gray-900 text-sm">{title}</span>
      {!loading && count !== undefined && (
        <span className="ml-auto bg-orange-200 border-2 border-black text-gray-800 text-xs font-black px-2.5 py-0.5 rounded-full">
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
      <div className="flex gap-3 mb-6">
        {(["categories", "goals"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-6 py-3 font-black text-sm border-2 border-black rounded-2xl capitalize transition-all ${
              activeTab === tab
                ? "bg-yellow-300 shadow-none translate-x-[3px] translate-y-[3px]"
                : "bg-white shadow-[4px_4px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
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
              <h1 className="text-2xl font-black text-gray-900">Goal Categories</h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">Organise habits into top-level categories.</p>
            </div>
            <button onClick={openCreateCat} className={`${btnBase} bg-emerald-300 text-gray-900 whitespace-nowrap`}>
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
              <div className="mx-6 mt-5 bg-red-50 border-2 border-red-300 rounded-2xl p-3 text-sm text-red-700 font-semibold flex items-center justify-between gap-3">
                <span>{catError}</span>
                <button onClick={fetchCategories} className="underline font-black hover:no-underline whitespace-nowrap">Retry</button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50/50">
                    {["#", "Code", "Name", "Icon", "Order", "Status", "Created", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cells={8} />)
                  ) : categories.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-20 text-center">
                        <div className="text-4xl mb-3">📁</div>
                        <p className="text-gray-600 text-sm font-black">
                          {catHasActiveFilters ? "No categories match your filters." : "No categories yet."}
                        </p>
                        {catHasActiveFilters && (
                          <button onClick={clearCatFilters} className="mt-2 text-xs font-black text-blue-600 underline hover:no-underline">
                            Clear filters
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    categories.map((cat, idx) => (
                      <tr
                        key={cat.categoryId}
                        className={`transition-colors hover:bg-yellow-50/60 ${idx < categories.length - 1 ? "border-b-2 border-gray-100" : ""}`}
                      >
                        <td className="px-4 py-4 text-xs font-black text-gray-400">{(catPage - 1) * PAGE_SIZE + idx + 1}</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black border-2 border-black bg-sky-100 text-sky-800 shadow-[2px_2px_0_0_#1A1D20]">
                            {cat.categoryCode}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm font-bold text-gray-800">{cat.categoryName}</td>
                        <td className="px-4 py-4">
                          {cat.iconCode ? (
                            <div className="w-8 h-8 flex items-center justify-center rounded-lg border-2 border-black bg-orange-50 shadow-[2px_2px_0_0_#1A1D20] text-gray-700">
                              <DynamicIcon iconName={cat.iconCode} size={16} strokeWidth={2.5} />
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs font-medium">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm font-black text-gray-700 text-center">{cat.displayOrder}</td>
                        <td className="px-4 py-4"><ActivePill isActive={cat.isActive} /></td>
                        <td className="px-4 py-4 text-xs text-gray-400 font-medium whitespace-nowrap">{formatDate(cat.createdAt)}</td>
                        <td className="px-4 py-4">
                          <button
                            title="Edit category" onClick={() => openEditCat(cat)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-blue-100 hover:bg-blue-200 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-blue-800"
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
              <h1 className="text-2xl font-black text-gray-900">Goals</h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">Define individual habit goals within categories.</p>
            </div>
            <button onClick={openCreateGoal} className={`${btnBase} bg-emerald-300 text-gray-900 whitespace-nowrap`}>
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
              <div className="mx-6 mt-5 bg-red-50 border-2 border-red-300 rounded-2xl p-3 text-sm text-red-700 font-semibold flex items-center justify-between gap-3">
                <span>{goalError}</span>
                <button onClick={fetchGoals} className="underline font-black hover:no-underline whitespace-nowrap">Retry</button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50/50">
                    {["#", "Code", "Goal Name", "Category", "Status", "Created", "Configure"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {goalLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cells={7} />)
                  ) : goals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center">
                        <div className="text-4xl mb-3">🎯</div>
                        <p className="text-gray-600 text-sm font-black">
                          {goalHasActiveFilters ? "No goals match your filters." : "No goals defined yet."}
                        </p>
                        {goalHasActiveFilters && (
                          <button onClick={clearGoalFilters} className="mt-2 text-xs font-black text-blue-600 underline hover:no-underline">
                            Clear filters
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    goals.map((goal, idx) => (
                      <tr
                        key={goal.goalId}
                        className={`transition-colors hover:bg-yellow-50/60 ${idx < goals.length - 1 ? "border-b-2 border-gray-100" : ""}`}
                      >
                        <td className="px-4 py-4 text-xs font-black text-gray-400">{(goalPage - 1) * PAGE_SIZE + idx + 1}</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black border-2 border-black bg-purple-100 text-purple-800 shadow-[2px_2px_0_0_#1A1D20]">
                            {goal.goalCode}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm font-bold text-gray-800">{goal.goalName}</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold border-2 border-gray-300 bg-gray-100 text-gray-600">
                            {goal.categoryCode}
                          </span>
                        </td>
                        <td className="px-4 py-4"><ActivePill isActive={goal.isActive} /></td>
                        <td className="px-4 py-4 text-xs text-gray-400 font-medium whitespace-nowrap">{formatDate(goal.createdAt)}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              title="Edit goal" onClick={() => openEditGoal(goal)}
                              className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-blue-100 hover:bg-blue-200 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-blue-800"
                            >
                              <PencilIcon />
                            </button>
                            <button
                              title="Configure Task Library for this Goal"
                              onClick={() => navigate(`/practical-tasks?goalId=${goal.goalId}&goalName=${encodeURIComponent(goal.goalName)}`)}
                              className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-amber-100 hover:bg-amber-200 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-amber-800"
                            >
                              <TaskLibIcon />
                            </button>
                            <button
                              title="Bind Questionnaire Template to this Goal"
                              onClick={() => navigate(`/questionnaires?goalId=${goal.goalId}&goalName=${encodeURIComponent(goal.goalName)}`)}
                              className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-purple-100 hover:bg-purple-200 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-purple-800"
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
              <FormField label="Icon Code" hint="Emoji or identifier (e.g. 💪)">
                <input type="text" value={catForm.iconCode ?? ""}
                  onChange={e => setCatField("iconCode", e.target.value)}
                  placeholder="💪" className={inputCls} />
              </FormField>
              <FormField label="Display Order *">
                <input required type="number" min={1} value={catForm.displayOrder}
                  onChange={e => setCatField("displayOrder", Number(e.target.value))} className={inputCls} />
              </FormField>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl">
              <div>
                <p className="text-sm font-black text-gray-800">Active</p>
                <p className="text-xs text-gray-400 font-medium">Visible to players on the platform</p>
              </div>
              <Toggle checked={catForm.isActive} onChange={v => setCatField("isActive", v)} />
            </div>
            {catFormError && (
              <p className="text-xs font-bold text-red-600 bg-red-50 border-2 border-red-300 rounded-xl px-3 py-2">{catFormError}</p>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={closeCatForm} disabled={catSubmitting}
                className={`${btnBase} flex-1 justify-center bg-white text-gray-700`}>Cancel</button>
              <button type="submit" disabled={catSubmitting}
                className={`${btnBase} flex-1 justify-center ${editingCat ? "bg-blue-200 text-blue-900" : "bg-emerald-300 text-gray-900"}`}>
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
                    {cat.iconCode ? `${cat.iconCode} ` : ""}{cat.categoryName}
                  </option>
                ))}
              </select>
              {allCategories.length === 0 && (
                <p className="text-xs text-amber-600 font-semibold mt-1">No categories available. Create a category first.</p>
              )}
            </FormField>
            <FormField label="Description">
              <textarea rows={3} value={goalForm.description ?? ""}
                onChange={e => setGoalField("description", e.target.value)}
                placeholder="Describe this goal and how it's tracked…" className={`${inputCls} resize-none`} />
            </FormField>
            <div className="flex items-center justify-between gap-4 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl">
              <div>
                <p className="text-sm font-black text-gray-800">Active</p>
                <p className="text-xs text-gray-400 font-medium">Players can select this goal when setting up habits</p>
              </div>
              <Toggle checked={goalForm.isActive} onChange={v => setGoalField("isActive", v)} />
            </div>
            {goalFormError && (
              <p className="text-xs font-bold text-red-600 bg-red-50 border-2 border-red-300 rounded-xl px-3 py-2">{goalFormError}</p>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={closeGoalForm} disabled={goalSubmitting}
                className={`${btnBase} flex-1 justify-center bg-white text-gray-700`}>Cancel</button>
              <button type="submit" disabled={goalSubmitting}
                className={`${btnBase} flex-1 justify-center ${editingGoal ? "bg-blue-200 text-blue-900" : "bg-emerald-300 text-gray-900"}`}>
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

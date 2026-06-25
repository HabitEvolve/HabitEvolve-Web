import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { adminTargetRuleApi } from "../api/adminTargetRuleApi";
import { useTableFilters } from "../hooks/useTableFilters";
import { TableFilterBar } from "../components/common/TableFilterBar";
import type { FilterField } from "../hooks/useTableFilters";
import type {
  TargetCalculationRuleDto,
  TargetCalculationRulePayload,
  MeasurementType,
  RuleDifficulty,
  CalculationMethod,
} from "../types/adminGoal.types";

// ── OPTIONS ───────────────────────────────────────────────────────────────────
const MEASUREMENT_TYPES: MeasurementType[] = [
  "CHECK_IN", "COUNTABLE", "FREQUENCY_BASED", "QUALITY_BASED", "SCHEDULE_BASED", "TIME_BASED",
];
const DIFFICULTIES: RuleDifficulty[] = ["Any", "Easy", "Normal", "Hard"];
const CALC_METHODS: CalculationMethod[] = ["None", "PercentageReduce", "FixedAdd", "FixedSubtract"];

const MEASUREMENT_LABELS: Record<string, string> = {
  CHECK_IN:        "Check-In",
  COUNTABLE:       "Countable",
  FREQUENCY_BASED: "Frequency",
  QUALITY_BASED:   "Quality",
  SCHEDULE_BASED:  "Schedule",
  TIME_BASED:      "Time-Based",
};

const DIFFICULTY_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  Easy:   { bg: "bg-emerald-100", border: "border-emerald-500", text: "text-emerald-800" },
  Normal: { bg: "bg-yellow-100",  border: "border-yellow-500",  text: "text-yellow-800"  },
  Hard:   { bg: "bg-red-100",     border: "border-red-500",     text: "text-red-800"     },
  Any:    { bg: "bg-gray-100",    border: "border-gray-400",    text: "text-gray-600"    },
};

// Key format: "MEASUREMENT_TYPE+Difficulty"
const CHANGE_VALUE_HINTS: Record<string, string> = {
  "COUNTABLE+Hard":        "Default ChangeValue = 10 (10%). Increase to 15 to reduce the target faster.",
  "TIME_BASED+Easy":       "Default ChangeValue = 17 (17%). Reduce to 10 for a gentler target increase.",
  "SCHEDULE_BASED+Normal": "Default ChangeValue = 25 (minutes). Increase to 30 to shift the schedule more aggressively.",
  "FREQUENCY_BASED+Hard":  "Default ChangeValue = 1. Keep at 1 if the user is easily discouraged.",
};

// ── FILTER CONFIG ─────────────────────────────────────────────────────────────
// getRules() accepts no server-side filter params, so filtering is done client-side via useMemo.
type RuleFilters = { search: string; measurementType: string; difficulty: string };
const RULE_INITIAL_FILTERS: RuleFilters = { search: "", measurementType: "", difficulty: "" };

// ── SHARED STYLES ─────────────────────────────────────────────────────────────
const btnBase =
  "inline-flex items-center gap-2 px-4 py-2 font-black text-sm border-2 border-black rounded-full " +
  "shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 " +
  "disabled:shadow-[3px_3px_0_0_#1A1D20] transition-all";

const inputCls =
  "w-full px-4 py-2.5 border-2 border-black rounded-2xl text-sm font-medium bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder:text-gray-400";

const lockedInputCls =
  "w-full px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-2xl text-sm font-medium " +
  "bg-gray-100 text-gray-500 cursor-not-allowed focus:outline-none";

const EMPTY_FORM: TargetCalculationRulePayload = {
  measurementType: "CHECK_IN",
  difficulty: "Any",
  calculationMethod: "None",
  changeValue: 0,
  minValue: null,
  maxValue: null,
  description: "",
  example: "",
  isActive: true,
};

// ── SPINNER ───────────────────────────────────────────────────────────────────
const Spinner = ({ size = 20 }: { size?: number }) => (
  <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
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
const SaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
  </svg>
);

// ── DIFFICULTY BADGE ──────────────────────────────────────────────────────────
const DifficultyBadge = ({ difficulty }: { difficulty: string }) => {
  const s = DIFFICULTY_STYLES[difficulty] ?? DIFFICULTY_STYLES["Any"];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black border-2 ${s.bg} ${s.border} ${s.text}`}>
      {difficulty}
    </span>
  );
};

// ── STATUS PILL ───────────────────────────────────────────────────────────────
const StatusPill = ({ isActive }: { isActive: boolean }) => {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border-2 ${
      isActive
        ? "bg-green-100 border-green-400 text-green-800"
        : "bg-gray-100 border-gray-400 text-gray-500"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? "bg-green-500" : "bg-gray-400"}`} />
      {isActive ? t("admin.targetRules.statusActive") : t("admin.targetRules.statusInactive")}
    </span>
  );
};

// ── ALERT BANNER ──────────────────────────────────────────────────────────────
const AlertBanner = ({ alert }: { alert: { type: "success" | "error"; message: string } }) =>
  alert.type === "success" ? (
    <div className="mb-5 flex items-center gap-3 bg-emerald-50 border-4 border-emerald-500 rounded-2xl shadow-[4px_4px_0_0_#1A1D20] px-5 py-3.5">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span className="font-black text-emerald-800 text-sm">{alert.message}</span>
    </div>
  ) : (
    <div className="mb-5 flex items-center gap-3 bg-red-50 border-4 border-red-500 rounded-2xl shadow-[4px_4px_0_0_#1A1D20] px-5 py-3.5">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span className="font-black text-red-800 text-sm">{alert.message}</span>
    </div>
  );

// ── GAME MODAL ────────────────────────────────────────────────────────────────
const GameModal = ({
  title, onClose, children, maxWidth = "max-w-xl",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) => createPortal(
  <div className="modal-content fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div className={`relative w-full ${maxWidth} mx-4 bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0_0_#1A1D20] max-h-[90vh] overflow-y-auto`}>
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 border-b-2 border-black bg-white">
        <h2 className="text-lg font-black text-gray-900">{title}</h2>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 border-2 border-black rounded-xl bg-white shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="px-6 py-6">{children}</div>
    </div>
  </div>,
  document.body
);

// ── FORM FIELD ────────────────────────────────────────────────────────────────
const FormField = ({
  label, children, hint, locked,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  locked?: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <label className="text-xs font-black text-gray-700 uppercase tracking-wide">{label}</label>
        {locked && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-bold bg-gray-100 border-2 border-gray-300 rounded-lg text-gray-500">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            {t("admin.targetRules.locked")}
          </span>
        )}
      </div>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1 font-medium">{hint}</p>}
    </div>
  );
};

// ── SKELETON ROW ─────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr className="border-b-2 border-gray-100 animate-pulse">
    <td className="px-4 py-4"><div className="h-6 bg-gray-200 rounded-xl" style={{ width: "100px" }} /></td>
    <td className="px-4 py-4"><div className="h-5 bg-gray-200 rounded-full" style={{ width: "60px" }} /></td>
    <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded-full" style={{ width: "110px" }} /></td>
    <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded-full" style={{ width: "40px" }} /></td>
    <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded-full" style={{ width: "140px" }} /></td>
    <td className="px-4 py-4"><div className="h-6 bg-gray-200 rounded-full" style={{ width: "68px" }} /></td>
    <td className="px-4 py-4"><div className="h-8 bg-gray-200 rounded-xl" style={{ width: "72px" }} /></td>
  </tr>
);

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function TargetRuleManagement() {
  const { t } = useTranslation();

  const RULE_FILTER_FIELDS: FilterField[] = [
    { key: "search",          label: t("admin.targetRules.filterSearch"),     type: "text",   placeholder: t("admin.targetRules.filterSearchPlaceholder") },
    { key: "measurementType", label: t("admin.targetRules.filterType"),        type: "select",
      options: MEASUREMENT_TYPES.map(mt => ({ label: MEASUREMENT_LABELS[mt] ?? mt, value: mt })) },
    { key: "difficulty",      label: t("admin.targetRules.filterDifficulty"),  type: "select",
      options: DIFFICULTIES.map(d => ({ label: d, value: d })) },
  ];

  // ── RULES LIST ────────────────────────────────────────────────────────────
  const [rules, setRules] = useState<TargetCalculationRuleDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── FILTERS (client-side — getRules() has no server filter params) ─────────
  const {
    filters: ruleFilters,
    debouncedFilters: debouncedRuleFilters,
    setFilter: setRuleFilter,
    clearFilters: clearRuleFilters,
    hasActiveFilters: ruleHasActiveFilters,
  } = useTableFilters<RuleFilters>(RULE_INITIAL_FILTERS);

  const filteredRules = useMemo(() => {
    let result = rules;
    const { search, measurementType, difficulty } = debouncedRuleFilters;
    if (measurementType) result = result.filter(r => r.measurementType === measurementType);
    if (difficulty)      result = result.filter(r => r.difficulty === difficulty);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        (MEASUREMENT_LABELS[r.measurementType] ?? r.measurementType).toLowerCase().includes(q) ||
        r.difficulty.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        (r.example ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [rules, debouncedRuleFilters]);

  // ── ALERT ─────────────────────────────────────────────────────────────────
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 4000);
    return () => clearTimeout(t);
  }, [alert]);

  // ── FORM MODAL ────────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<TargetCalculationRuleDto | null>(null);
  const [form, setForm] = useState<TargetCalculationRulePayload>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── DELETE MODAL ──────────────────────────────────────────────────────────
  const [showDelete, setShowDelete] = useState(false);
  const [deletingRule, setDeletingRule] = useState<TargetCalculationRuleDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── FETCH ─────────────────────────────────────────────────────────────────
  const fetchRules = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await adminTargetRuleApi.getRules();
      if (res.success && res.data) {
        setRules(res.data);
      } else {
        setFetchError(res.message ?? "Failed to load rules.");
      }
    } catch (err) {
      setFetchError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? "Failed to load rules."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  // ── HELPERS ───────────────────────────────────────────────────────────────
  const setField = <K extends keyof TargetCalculationRulePayload>(
    key: K,
    val: TargetCalculationRulePayload[K]
  ) => setForm((prev) => ({ ...prev, [key]: val }));

  // ── OPEN CREATE ───────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingRule(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  };

  // ── OPEN EDIT ─────────────────────────────────────────────────────────────
  const openEdit = (rule: TargetCalculationRuleDto) => {
    setEditingRule(rule);
    setForm({
      measurementType: rule.measurementType,
      difficulty:       rule.difficulty,
      calculationMethod: rule.calculationMethod,
      changeValue:      rule.changeValue,
      minValue:         rule.minValue,
      maxValue:         rule.maxValue,
      description:      rule.description ?? "",
      example:          rule.example ?? "",
      isActive:         rule.isActive,
    });
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingRule(null);
    setFormError(null);
  };

  // ── SUBMIT FORM ───────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (editingRule) {
        await adminTargetRuleApi.updateRule(editingRule.ruleId, form);
        setAlert({ type: "success", message: t("admin.targetRules.flashUpdated") });
      } else {
        await adminTargetRuleApi.createRule(form);
        setAlert({ type: "success", message: t("admin.targetRules.flashCreated") });
      }
      closeForm();
      fetchRules();
    } catch (err) {
      setFormError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? (editingRule ? t("admin.targetRules.flashUpdateFailed") : t("admin.targetRules.flashCreateFailed"))
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── DELETE ────────────────────────────────────────────────────────────────
  const openDelete = (rule: TargetCalculationRuleDto) => {
    setDeletingRule(rule);
    setShowDelete(true);
  };

  const closeDelete = () => {
    setShowDelete(false);
    setDeletingRule(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRule) return;
    setDeleting(true);
    try {
      await adminTargetRuleApi.deleteRule(deletingRule.ruleId);
      closeDelete();
      setAlert({ type: "success", message: t("admin.targetRules.flashDeleted") });
      fetchRules();
    } catch (err) {
      setAlert({
        type: "error",
        message:
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            ?? t("admin.targetRules.flashDeleteFailed"),
      });
      closeDelete();
    } finally {
      setDeleting(false);
    }
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      <PageMeta
        title="Target Calculation Rules | HabitEvolve Admin"
        description="Manage target calculation rules for habit difficulty and measurement types"
      />
      <PageBreadcrumb pageTitle={t("admin.targetRules.pageTitle")} />

      {alert && <AlertBanner alert={alert} />}

      {/* ── TOP ACTION BAR ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">{t("admin.targetRules.pageTitle")}</h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">
            {t("admin.targetRules.subtitle")}
          </p>
        </div>
        <button onClick={openCreate} className={`${btnBase} bg-emerald-300 text-gray-900 whitespace-nowrap`}>
          <PlusIcon />
          {t("admin.targetRules.createRule")}
        </button>
      </div>

      {/* ── TABLE CARD ──────────────────────────────────────────────────── */}
      <div className="bg-white border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] overflow-hidden">

        {/* Card header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b-4 border-black bg-gray-50">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span className="font-black text-gray-900 text-sm">{t("admin.targetRules.allRules")}</span>
          {!loading && (
            <span className="ml-auto bg-orange-200 border-2 border-black text-gray-800 text-xs font-black px-2.5 py-0.5 rounded-full">
              {ruleHasActiveFilters ? `${filteredRules.length} / ${rules.length}` : rules.length}
            </span>
          )}
        </div>

        {/* Filter bar */}
        <TableFilterBar<RuleFilters>
          fields={RULE_FILTER_FIELDS}
          filters={ruleFilters}
          onFilterChange={setRuleFilter}
          onClear={clearRuleFilters}
          hasActiveFilters={ruleHasActiveFilters}
        />

        {/* Fetch error */}
        {fetchError && (
          <div className="mx-6 mt-5 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-2xl p-3 text-sm text-red-700 dark:text-red-400 font-semibold flex items-center justify-between gap-3">
            <span>{fetchError}</span>
            <button onClick={fetchRules} className="underline font-black hover:no-underline whitespace-nowrap">
              {t("admin.targetRules.retry")}
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b-2 border-gray-200 bg-gray-50">
                {[
                  t("admin.targetRules.table.measurementType"),
                  t("admin.targetRules.table.difficulty"),
                  t("admin.targetRules.table.method"),
                  t("admin.targetRules.table.changeValue"),
                  t("admin.targetRules.table.example"),
                  t("admin.targetRules.table.status"),
                  t("admin.targetRules.table.actions"),
                ].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-black bg-gray-100 flex items-center justify-center text-2xl shadow-[4px_4px_0_0_#1A1D20]">
                      📋
                    </div>
                    <p className="text-gray-600 text-sm font-black">
                      {ruleHasActiveFilters ? t("admin.targetRules.noRulesMatch") : t("admin.targetRules.noRulesYet")}
                    </p>
                    {ruleHasActiveFilters ? (
                      <button onClick={clearRuleFilters} className="mt-2 text-xs font-black text-blue-600 underline hover:no-underline">
                        {t("admin.targetRules.clearFilters")}
                      </button>
                    ) : (
                      <p className="text-gray-400 text-xs mt-1 font-medium">{t("admin.targetRules.createHint")}</p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule, idx) => (
                  <tr
                    key={rule.ruleId}
                    className={`transition-colors hover:bg-orange-50/60 ${
                      idx < filteredRules.length - 1 ? "border-b-2 border-gray-100" : ""
                    }`}
                  >
                    {/* Measurement Type */}
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black border-2 border-black bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-300 shadow-[2px_2px_0_0_#1A1D20]">
                        {MEASUREMENT_LABELS[rule.measurementType] ?? rule.measurementType}
                      </span>
                    </td>

                    {/* Difficulty */}
                    <td className="px-4 py-4">
                      <DifficultyBadge difficulty={rule.difficulty} />
                    </td>

                    {/* Method */}
                    <td className="px-4 py-4 text-sm font-semibold text-gray-700 whitespace-nowrap">
                      {rule.calculationMethod}
                    </td>

                    {/* Change Value */}
                    <td className="px-4 py-4">
                      <span className="text-sm font-black text-gray-900">{rule.changeValue}</span>
                      {(rule.minValue !== null || rule.maxValue !== null) && (
                        <span className="block text-xs text-gray-400 font-medium mt-0.5 whitespace-nowrap">
                          [{rule.minValue ?? "—"} – {rule.maxValue ?? "—"}]
                        </span>
                      )}
                    </td>

                    {/* Example */}
                    <td className="px-4 py-4 text-sm text-gray-500 font-medium" style={{ maxWidth: "200px" }}>
                      <span className="line-clamp-2">{rule.example || "—"}</span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <StatusPill isActive={rule.isActive} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          title="Edit rule"
                          onClick={() => openEdit(rule)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-900/70 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-blue-800 dark:text-blue-300"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          title="Delete rule"
                          onClick={() => openDelete(rule)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900/70 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-red-700 dark:text-red-300"
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

        {/* Footer */}
        <div className="px-6 py-3 border-t-2 border-gray-100 bg-gray-50">
          <span className="text-xs text-gray-400 font-medium">
            {loading
              ? "Loading…"
              : ruleHasActiveFilters
                ? `${filteredRules.length} of ${rules.length} rule${rules.length !== 1 ? "s" : ""} match`
                : `${rules.length} rule${rules.length !== 1 ? "s" : ""} total`}
          </span>
        </div>
      </div>

      {/* ══════════════════ MODAL: CREATE / EDIT ═════════════════════════ */}
      {showForm && (
        <GameModal
          title={editingRule ? t("admin.targetRules.form.editTitle") : t("admin.targetRules.form.newTitle")}
          onClose={closeForm}
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Row 1: Measurement Type + Difficulty — locked when editing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label={t("admin.targetRules.form.measurementLabel")} locked={!!editingRule}>
                <select
                  required
                  disabled={!!editingRule}
                  value={form.measurementType}
                  onChange={(e) => setField("measurementType", e.target.value as MeasurementType)}
                  className={editingRule ? lockedInputCls : inputCls}
                >
                  {MEASUREMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{MEASUREMENT_LABELS[t] ?? t}</option>
                  ))}
                </select>
              </FormField>
              <FormField label={t("admin.targetRules.form.difficultyLabel")} locked={!!editingRule}>
                <select
                  required
                  disabled={!!editingRule}
                  value={form.difficulty}
                  onChange={(e) => setField("difficulty", e.target.value as RuleDifficulty)}
                  className={editingRule ? lockedInputCls : inputCls}
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </FormField>
            </div>

            {/* Constraint notice — only visible when editing */}
            {editingRule && (
              <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl px-3.5 py-3 shadow-[2px_2px_0_0_#1A1D20]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  {t("admin.targetRules.lockedHint")}
                </p>
              </div>
            )}

            {/* Row 2: Calculation Method + Change Value */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label={t("admin.targetRules.form.methodLabel")}>
                <select
                  required
                  value={form.calculationMethod}
                  onChange={(e) => setField("calculationMethod", e.target.value as CalculationMethod)}
                  className={inputCls}
                >
                  {CALC_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </FormField>
              <FormField label={t("admin.targetRules.form.changeValueLabel")}>
                <input
                  type="number"
                  required
                  step="any"
                  value={form.changeValue}
                  onChange={(e) => setField("changeValue", Number(e.target.value))}
                  className={inputCls}
                />
                {CHANGE_VALUE_HINTS[`${form.measurementType}+${form.difficulty}`] && (
                  <div className="mt-2 flex items-start gap-2 bg-sky-50 dark:bg-sky-900/20 border-2 border-sky-200 dark:border-sky-700 rounded-xl px-3 py-2.5 shadow-[2px_2px_0_0_#1A1D20]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <p className="text-xs font-semibold text-sky-800 dark:text-sky-300 leading-relaxed">
                      {CHANGE_VALUE_HINTS[`${form.measurementType}+${form.difficulty}`]}
                    </p>
                  </div>
                )}
              </FormField>
            </div>

            {/* Row 3: Min Value + Max Value */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label={t("admin.targetRules.form.minValueLabel")} hint={t("admin.targetRules.form.minHint")}>
                <input
                  type="number"
                  step="any"
                  value={form.minValue ?? ""}
                  onChange={(e) =>
                    setField("minValue", e.target.value === "" ? null : Number(e.target.value))
                  }
                  placeholder={t("admin.targetRules.form.optionalPlaceholder")}
                  className={inputCls}
                />
              </FormField>
              <FormField label={t("admin.targetRules.form.maxValueLabel")} hint={t("admin.targetRules.form.maxHint")}>
                <input
                  type="number"
                  step="any"
                  value={form.maxValue ?? ""}
                  onChange={(e) =>
                    setField("maxValue", e.target.value === "" ? null : Number(e.target.value))
                  }
                  placeholder={t("admin.targetRules.form.optionalPlaceholder")}
                  className={inputCls}
                />
              </FormField>
            </div>

            {/* Example */}
            <FormField label={t("admin.targetRules.form.exampleLabel")}>
              <input
                type="text"
                value={form.example ?? ""}
                onChange={(e) => setField("example", e.target.value)}
                placeholder={t("admin.targetRules.form.examplePlaceholder")}
                className={inputCls}
              />
            </FormField>

            {/* Description */}
            <FormField label={t("admin.targetRules.form.descLabel")}>
              <textarea
                rows={3}
                value={form.description ?? ""}
                onChange={(e) => setField("description", e.target.value)}
                placeholder={t("admin.targetRules.form.descPlaceholder")}
                className={`${inputCls} resize-none`}
              />
            </FormField>

            {/* isActive toggle */}
            <div className="flex items-center justify-between gap-4 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl">
              <div>
                <p className="text-sm font-black text-gray-800">{t("admin.targetRules.form.activeLabel")}</p>
                <p className="text-xs text-gray-400 font-medium">{t("admin.targetRules.form.activeHint")}</p>
              </div>
              <button
                type="button"
                onClick={() => setField("isActive", !form.isActive)}
                aria-pressed={form.isActive}
                className={`relative flex-shrink-0 w-12 h-6 rounded-full border-2 border-black transition-colors shadow-[2px_2px_0_0_#1A1D20] ${
                  form.isActive ? "bg-emerald-400" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full border-2 border-black bg-white transition-transform ${
                    form.isActive ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Inline error */}
            {formError && (
              <p className="text-xs font-bold text-red-600 bg-red-50 border-2 border-red-300 rounded-xl px-3 py-2">
                {formError}
              </p>
            )}

            {/* Form actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={closeForm}
                disabled={submitting}
                className={`${btnBase} flex-1 justify-center bg-white text-gray-700`}
              >
                {t("admin.targetRules.form.cancel")}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`${btnBase} flex-1 justify-center ${
                  editingRule ? "bg-blue-200 text-blue-900" : "bg-emerald-300 text-gray-900"
                }`}
              >
                {submitting ? (
                  <><Spinner size={13} />{editingRule ? t("admin.targetRules.form.saving") : t("admin.targetRules.form.creating")}</>
                ) : editingRule ? (
                  <><SaveIcon />{t("admin.targetRules.form.saveChanges")}</>
                ) : (
                  <><PlusIcon />{t("admin.targetRules.form.create")}</>
                )}
              </button>
            </div>
          </form>
        </GameModal>
      )}

      {/* ══════════════════ MODAL: CONFIRM DELETE ════════════════════════ */}
      {showDelete && deletingRule && (
        <GameModal title={t("admin.targetRules.deleteModal.title")} onClose={closeDelete} maxWidth="max-w-md">
          <div className="text-center space-y-5">
            <div className="flex items-center justify-center">
              <span className="flex items-center justify-center w-16 h-16 rounded-full border-4 border-black bg-red-100 dark:bg-red-900/50 shadow-[4px_4px_0_0_#1A1D20] text-3xl">
                ⚠️
              </span>
            </div>
            <div>
              <p className="font-black text-gray-900 text-lg">
                Delete{" "}
                <span className="text-red-600">
                  {MEASUREMENT_LABELS[deletingRule.measurementType] ?? deletingRule.measurementType}
                </span>
                {" / "}
                <span className="text-red-600">{deletingRule.difficulty}</span>
                {" "}rule?
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mt-2 leading-relaxed bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl px-4 py-3">
                {t("admin.targetRules.deleteModal.message")}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeDelete}
                disabled={deleting}
                className={`${btnBase} flex-1 justify-center bg-white text-gray-700`}
              >
                {t("admin.targetRules.deleteModal.cancel")}
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className={`${btnBase} flex-1 justify-center bg-red-500 text-white`}
              >
                {deleting ? (
                  <><Spinner size={13} />{t("admin.targetRules.deleteModal.deleting")}</>
                ) : (
                  <><TrashIcon />{t("admin.targetRules.deleteModal.confirm")}</>
                )}
              </button>
            </div>
          </div>
        </GameModal>
      )}
    </>
  );
}

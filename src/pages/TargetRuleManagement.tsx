import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Save, X, Lock, Info, AlertTriangle, BarChart2 } from "lucide-react";
import { useAlert } from "../context/AlertContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { adminTargetRuleApi } from "../api/adminTargetRuleApi";
import { useTableFilters } from "../hooks/useTableFilters";
import { SkyTableFilterBar } from "../components/common/SkyTableFilterBar";
import SkyCard from "../components/ui/card/SkyCard";
import SkyButton from "../components/ui/button/SkyButton";
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

const DIFFICULTY_STYLES: Record<string, string> = {
  Easy:   "bg-success-100 text-success-800",
  Normal: "bg-warning-100 text-warning-800",
  Hard:   "bg-error-100 text-error-800",
  Any:    "bg-gray-100 text-gray-600",
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
const inputCls = [
  "w-full px-4 py-2.5 rounded-sky-chip border border-sky-surf-border bg-white",
  "text-sm font-medium text-sky-ink",
  "focus:outline-none focus:border-sky-deep focus:ring-3 focus:ring-sky-deep/20",
  "placeholder:text-sky-ink-3",
].join(" ");

const lockedInputCls =
  "w-full px-4 py-2.5 rounded-sky-chip border border-dashed border-gray-300 text-sm font-medium " +
  "bg-gray-100 text-sky-ink-3 cursor-not-allowed focus:outline-none";

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

// ── DIFFICULTY BADGE ──────────────────────────────────────────────────────────
const DifficultyBadge = ({ difficulty }: { difficulty: string }) => {
  const cls = DIFFICULTY_STYLES[difficulty] ?? DIFFICULTY_STYLES["Any"];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${cls}`}>
      {difficulty}
    </span>
  );
};

// ── STATUS PILL ───────────────────────────────────────────────────────────────
const StatusPill = ({ isActive }: { isActive: boolean }) => {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
      isActive ? "bg-success-100 text-success-800" : "bg-gray-100 text-gray-500"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? "bg-success-500" : "bg-gray-400"}`} />
      {isActive ? t("admin.targetRules.statusActive") : t("admin.targetRules.statusInactive")}
    </span>
  );
};

// ── GAME MODAL ────────────────────────────────────────────────────────────────
const GameModal = ({
  title, onClose, children, maxWidth = "max-w-xl",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) => createPortal(
  <div className="modal-content fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center bg-sky-ink/60 backdrop-blur-sm">
    <SkyCard variant="admin" className={`relative w-full ${maxWidth} mx-4 p-0 overflow-hidden max-h-[90vh] overflow-y-auto`}>
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-bold text-sky-ink">{title}</h2>
        <SkyButton type="button" variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </SkyButton>
      </div>
      <div className="px-6 py-6">{children}</div>
    </SkyCard>
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
        <label className="text-xs font-bold text-sky-ink-2 uppercase tracking-wide">{label}</label>
        {locked && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-bold bg-gray-100 rounded text-sky-ink-3">
            <Lock className="w-2.5 h-2.5" />
            {t("admin.targetRules.locked")}
          </span>
        )}
      </div>
      {children}
      {hint && <p className="text-xs text-sky-ink-3 mt-1 font-medium">{hint}</p>}
    </div>
  );
};

// ── SKELETON ROW ─────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr className="border-b border-gray-100 animate-pulse">
    <td className="px-4 py-4"><div className="h-6 bg-gray-200 rounded-sky-chip" style={{ width: "100px" }} /></td>
    <td className="px-4 py-4"><div className="h-5 bg-gray-200 rounded-full" style={{ width: "60px" }} /></td>
    <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded-full" style={{ width: "110px" }} /></td>
    <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded-full" style={{ width: "40px" }} /></td>
    <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded-full" style={{ width: "140px" }} /></td>
    <td className="px-4 py-4"><div className="h-6 bg-gray-200 rounded-full" style={{ width: "68px" }} /></td>
    <td className="px-4 py-4"><div className="h-8 bg-gray-200 rounded-sky-chip" style={{ width: "72px" }} /></td>
  </tr>
);

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function TargetRuleManagement() {
  const { t } = useTranslation();
  const notify = useAlert();

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
        notify.success(t("admin.targetRules.flashUpdated"));
      } else {
        await adminTargetRuleApi.createRule(form);
        notify.success(t("admin.targetRules.flashCreated"));
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
      notify.success(t("admin.targetRules.flashDeleted"));
      fetchRules();
    } catch (err) {
      notify.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? t("admin.targetRules.flashDeleteFailed")
      );
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

      {/* ── TOP ACTION BAR ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-sky-ink">{t("admin.targetRules.pageTitle")}</h1>
          <p className="text-sm text-sky-ink-2 font-medium mt-0.5">
            {t("admin.targetRules.subtitle")}
          </p>
        </div>
        <SkyButton type="button" variant="primary" onClick={openCreate} className="whitespace-nowrap">
          <Plus className="w-4 h-4" />
          {t("admin.targetRules.createRule")}
        </SkyButton>
      </div>

      {/* ── TABLE CARD ──────────────────────────────────────────────────── */}
      <SkyCard variant="admin" className="p-0 overflow-hidden">

        {/* Card header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-gray-50">
          <BarChart2 className="w-4 h-4 text-sky-ink-2" />
          <span className="font-bold text-sky-ink text-sm">{t("admin.targetRules.allRules")}</span>
          {!loading && (
            <span className="ml-auto bg-warning-100 text-sky-ink-2 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {ruleHasActiveFilters ? `${filteredRules.length} / ${rules.length}` : rules.length}
            </span>
          )}
        </div>

        {/* Filter bar */}
        <SkyTableFilterBar<RuleFilters>
          fields={RULE_FILTER_FIELDS}
          filters={ruleFilters}
          onFilterChange={setRuleFilter}
          onClear={clearRuleFilters}
          hasActiveFilters={ruleHasActiveFilters}
        />

        {/* Fetch error */}
        {fetchError && (
          <div className="mx-6 mt-5 bg-error-50 rounded-sky-chip p-3 text-sm text-error-700 font-semibold flex items-center justify-between gap-3">
            <span>{fetchError}</span>
            <button onClick={fetchRules} className="underline font-bold hover:no-underline whitespace-nowrap">
              {t("admin.targetRules.retry")}
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {[
                  t("admin.targetRules.table.measurementType"),
                  t("admin.targetRules.table.difficulty"),
                  t("admin.targetRules.table.method"),
                  t("admin.targetRules.table.changeValue"),
                  t("admin.targetRules.table.example"),
                  t("admin.targetRules.table.status"),
                  t("admin.targetRules.table.actions"),
                ].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-sky-ink-3">
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
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center text-2xl">
                      📋
                    </div>
                    <p className="text-sky-ink-2 text-sm font-bold">
                      {ruleHasActiveFilters ? t("admin.targetRules.noRulesMatch") : t("admin.targetRules.noRulesYet")}
                    </p>
                    {ruleHasActiveFilters ? (
                      <button onClick={clearRuleFilters} className="mt-2 text-xs font-bold text-sky-deep underline hover:no-underline">
                        {t("admin.targetRules.clearFilters")}
                      </button>
                    ) : (
                      <p className="text-sky-ink-3 text-xs mt-1 font-medium">{t("admin.targetRules.createHint")}</p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule) => (
                  <tr key={rule.ruleId} className="sky-table-row">
                    {/* Measurement Type */}
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-sky-chip text-xs font-bold bg-sky-deep/10 text-sky-deep">
                        {MEASUREMENT_LABELS[rule.measurementType] ?? rule.measurementType}
                      </span>
                    </td>

                    {/* Difficulty */}
                    <td className="px-4 py-4">
                      <DifficultyBadge difficulty={rule.difficulty} />
                    </td>

                    {/* Method */}
                    <td className="px-4 py-4 text-sm font-semibold text-sky-ink-2 whitespace-nowrap">
                      {rule.calculationMethod}
                    </td>

                    {/* Change Value */}
                    <td className="px-4 py-4">
                      <span className="text-sm font-bold text-sky-ink">{rule.changeValue}</span>
                      {(rule.minValue !== null || rule.maxValue !== null) && (
                        <span className="block text-xs text-sky-ink-3 font-medium mt-0.5 whitespace-nowrap">
                          [{rule.minValue ?? "—"} – {rule.maxValue ?? "—"}]
                        </span>
                      )}
                    </td>

                    {/* Example */}
                    <td className="px-4 py-4 text-sm text-sky-ink-2 font-medium max-w-50">
                      <span className="line-clamp-2">{rule.example || "—"}</span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <StatusPill isActive={rule.isActive} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <SkyButton type="button" variant="ghost" size="icon" title="Edit rule" onClick={() => openEdit(rule)} className="w-8 h-8">
                          <Pencil className="w-3.5 h-3.5" />
                        </SkyButton>
                        <SkyButton type="button" variant="ghost" size="icon" title="Delete rule" onClick={() => openDelete(rule)} className="w-8 h-8 text-error-500 hover:bg-error-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </SkyButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
          <span className="text-xs text-sky-ink-3 font-medium">
            {loading
              ? "Loading…"
              : ruleHasActiveFilters
                ? `${filteredRules.length} of ${rules.length} rule${rules.length !== 1 ? "s" : ""} match`
                : `${rules.length} rule${rules.length !== 1 ? "s" : ""} total`}
          </span>
        </div>
      </SkyCard>

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
              <div className="flex items-start gap-2.5 bg-warning-50 rounded-sky-chip px-3.5 py-3">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-warning-600" />
                <p className="text-xs font-semibold text-warning-800">
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
                  <div className="mt-2 flex items-start gap-2 bg-sky-deep/10 rounded-sky-chip px-3 py-2.5">
                    <Info className="w-3 h-3 shrink-0 mt-0.5 text-sky-deep" />
                    <p className="text-xs font-semibold text-sky-deep leading-relaxed">
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
            <div className="flex items-center justify-between gap-4 px-4 py-3 bg-gray-50 rounded-sky-chip">
              <div>
                <p className="text-sm font-bold text-sky-ink">{t("admin.targetRules.form.activeLabel")}</p>
                <p className="text-xs text-sky-ink-3 font-medium">{t("admin.targetRules.form.activeHint")}</p>
              </div>
              <button
                type="button"
                onClick={() => setField("isActive", !form.isActive)}
                aria-pressed={form.isActive}
                className={`relative shrink-0 w-12 h-6 rounded-full transition-colors ${
                  form.isActive ? "bg-success-400" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sky-chip transition-transform ${
                    form.isActive ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Inline error */}
            {formError && (
              <p className="text-xs font-bold text-error-600 bg-error-50 rounded-sky-chip px-3 py-2">
                {formError}
              </p>
            )}

            {/* Form actions */}
            <div className="flex gap-3 pt-1">
              <SkyButton type="button" variant="secondary" onClick={closeForm} disabled={submitting} className="flex-1">
                {t("admin.targetRules.form.cancel")}
              </SkyButton>
              <SkyButton type="submit" variant={editingRule ? "primary" : "success"} disabled={submitting} className="flex-1">
                {submitting ? (
                  <><Spinner size={13} />{editingRule ? t("admin.targetRules.form.saving") : t("admin.targetRules.form.creating")}</>
                ) : editingRule ? (
                  <><Save className="w-3.5 h-3.5" />{t("admin.targetRules.form.saveChanges")}</>
                ) : (
                  <><Plus className="w-4 h-4" />{t("admin.targetRules.form.create")}</>
                )}
              </SkyButton>
            </div>
          </form>
        </GameModal>
      )}

      {/* ══════════════════ MODAL: CONFIRM DELETE ════════════════════════ */}
      {showDelete && deletingRule && (
        <GameModal title={t("admin.targetRules.deleteModal.title")} onClose={closeDelete} maxWidth="max-w-md">
          <div className="text-center space-y-5">
            <div className="flex items-center justify-center">
              <span className="flex items-center justify-center w-16 h-16 rounded-full bg-error-100 text-3xl">
                ⚠️
              </span>
            </div>
            <div>
              <p className="font-bold text-sky-ink text-lg">
                Delete{" "}
                <span className="text-error-600">
                  {MEASUREMENT_LABELS[deletingRule.measurementType] ?? deletingRule.measurementType}
                </span>
                {" / "}
                <span className="text-error-600">{deletingRule.difficulty}</span>
                {" "}rule?
              </p>
              <p className="text-sm text-sky-ink-2 font-medium mt-2 leading-relaxed bg-error-50 rounded-sky-chip px-4 py-3">
                {t("admin.targetRules.deleteModal.message")}
              </p>
            </div>
            <div className="flex gap-3">
              <SkyButton type="button" variant="secondary" onClick={closeDelete} disabled={deleting} className="flex-1">
                {t("admin.targetRules.deleteModal.cancel")}
              </SkyButton>
              <SkyButton type="button" variant="destructive" onClick={handleDeleteConfirm} disabled={deleting} className="flex-1">
                {deleting ? (
                  <><Spinner size={13} />{t("admin.targetRules.deleteModal.deleting")}</>
                ) : (
                  <><Trash2 className="w-3.5 h-3.5" />{t("admin.targetRules.deleteModal.confirm")}</>
                )}
              </SkyButton>
            </div>
          </div>
        </GameModal>
      )}
    </>
  );
}

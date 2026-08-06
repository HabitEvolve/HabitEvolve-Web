import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  Plus, Pencil, Trash2, Save, X, Lock, Info, AlertTriangle, BarChart2,
  Check, Minus, ClipboardList, ShieldAlert, SlidersHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAlert } from "../context/AlertContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import PageHeader from "../components/common/PageHeader";
import { adminTargetRuleApi } from "../api/adminTargetRuleApi";
import { useTableFilters } from "../hooks/useTableFilters";
import { FilterDropdown } from "../components/common/FilterDropdown";
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

// One hue per meaning, reused wherever that meaning appears. deep = the
// operational default, peach = attention, dmg = the hard end of a ramp, teal =
// the one genuinely successful state (a live rule), rose = destructive,
// neutral = "no state / applies to all".
type Tone = "deep" | "peach" | "dmg" | "teal" | "rose" | "neutral";
const TONE: Record<Tone, { chip: string; wash: string; rail: string }> = {
  deep:    { chip: "bg-sky-deep/12 ring-sky-deep/22 text-sky-deep",         wash: "bg-sky-deep/8",   rail: "bg-sky-deep" },
  peach:   { chip: "bg-sky-peach/20 ring-sky-peach/32 text-sky-peach-deep", wash: "bg-sky-peach/14", rail: "bg-sky-peach" },
  dmg:     { chip: "bg-sky-dmg/14 ring-sky-dmg/26 text-sky-dmg-deep",       wash: "bg-sky-dmg/10",   rail: "bg-sky-dmg" },
  teal:    { chip: "bg-sky-teal-bg ring-sky-teal/26 text-sky-teal",         wash: "bg-sky-teal/10",  rail: "bg-sky-teal" },
  rose:    { chip: "bg-sky-rose/14 ring-sky-rose/26 text-sky-rose-deep",    wash: "bg-sky-rose/10",  rail: "bg-sky-rose" },
  neutral: { chip: "bg-white/72 ring-white/85 text-sky-ink-2",              wash: "bg-white/48",     rail: "bg-sky-ink/22" },
};

// Difficulty is a *setting* on the rule, not a verdict about it — so the ramp
// climbs in temperature (neutral → deep → peach → damage-orange) and spends no
// teal: on this screen teal means "rule is live" and nothing else.
const DIFFICULTY_TONE: Record<string, Tone> = {
  Any:    "neutral",
  Easy:   "deep",
  Normal: "peach",
  Hard:   "dmg",
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
  "w-full px-4 py-2.5 rounded-sky-chip bg-white/70 ring-1 ring-white/80",
  "text-sm font-medium text-sky-ink transition-shadow",
  "focus:outline-none focus:ring-2 focus:ring-sky-deep/45",
  "placeholder:text-sky-ink-3",
].join(" ");

// A locked field is recessed and dashed rather than merely dimmed, so it reads
// as "structurally fixed" instead of "temporarily disabled".
const lockedInputCls =
  "w-full px-4 py-2.5 rounded-sky-chip border border-dashed border-sky-ink/22 text-sm font-medium " +
  "bg-white/38 text-sky-ink-3 cursor-not-allowed focus:outline-none";

const eyebrow = "text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3";

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
  const tone = DIFFICULTY_TONE[difficulty] ?? "neutral";
  return (
    <span className={`inline-flex items-center rounded-sky-chip ring-1 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${TONE[tone].chip}`}>
      {difficulty}
    </span>
  );
};

// ── STATUS PILL ───────────────────────────────────────────────────────────────
// Active carries a tick and Inactive a dash, so the state survives a glance
// without depending on hue alone.
const StatusPill = ({ isActive }: { isActive: boolean }) => {
  const { t } = useTranslation();
  const Icon: LucideIcon = isActive ? Check : Minus;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sky-chip ring-1 px-2.5 py-1 text-[11px] font-semibold ${
      isActive ? TONE.teal.chip : TONE.neutral.chip
    }`}>
      <Icon className="w-3 h-3 shrink-0" strokeWidth={2.8} aria-hidden="true" />
      {isActive ? t("admin.targetRules.statusActive") : t("admin.targetRules.statusInactive")}
    </span>
  );
};

// ── GAME MODAL ────────────────────────────────────────────────────────────────
const GameModal = ({
  title, eyebrowText, Icon, tone = "deep", onClose, children, maxWidth = "max-w-xl",
}: {
  title: string;
  eyebrowText: string;
  Icon: LucideIcon;
  tone?: Tone;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) => createPortal(
  <div className="modal-content fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center bg-sky-ink/60 backdrop-blur-sm">
    <SkyCard variant="admin" className={`relative w-full ${maxWidth} mx-4 p-0 overflow-hidden max-h-[90vh] overflow-y-auto`}>
      {/* The header stays sticky while a long form scrolls under it, so it is
          opaque glass with a left rail rather than a translucent strip that
          would let field labels bleed through. */}
      <div className={`sticky top-0 z-10 flex items-center justify-between gap-3 overflow-hidden border-b border-white/65 px-6 py-5 backdrop-blur-xl ${TONE[tone].wash}`}>
        <span className={`absolute left-0 top-0 h-full w-[3px] ${TONE[tone].rail}`} aria-hidden="true" />
        <div className="flex items-center gap-3 min-w-0">
          <span className={`grid place-items-center w-10 h-10 shrink-0 rounded-sky-chip ring-1 ${TONE[tone].chip}`}>
            <Icon className="w-5 h-5" strokeWidth={2.2} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className={eyebrow}>{eyebrowText}</p>
            <h2 className="font-display text-sky-h3 font-semibold leading-tight text-sky-ink truncate">{title}</h2>
          </div>
        </div>
        <SkyButton type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
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
        <label className={eyebrow}>{label}</label>
        {locked && (
          <span className="inline-flex items-center gap-1 rounded-sky-chip bg-white/72 ring-1 ring-white/85 px-1.5 py-0.5 text-[10px] font-semibold text-sky-ink-3">
            <Lock className="w-2.5 h-2.5" strokeWidth={2.4} aria-hidden="true" />
            {t("admin.targetRules.locked")}
          </span>
        )}
      </div>
      {children}
      {hint && <p className="text-xs text-sky-ink-3 mt-1.5 font-medium">{hint}</p>}
    </div>
  );
};

// ── SKELETON ROW ─────────────────────────────────────────────────────────────
// Placeholder bars sit on a navy wash rather than grey, so the skeleton reads as
// the same material as the glass table it fills in for.
const SkeletonRow = () => (
  <tr className="border-b border-white/70 animate-pulse">
    {["100px", "60px", "110px", "40px", "140px", "68px", "72px"].map((w, i) => (
      <td key={i} className="px-4 py-4">
        <div className="h-6 rounded-sky-chip bg-sky-ink/8" style={{ width: w }} />
      </td>
    ))}
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
      <PageHeader
        className="mb-6"
        icon={<SlidersHorizontal className="w-6 h-6" strokeWidth={2.1} aria-hidden="true" />}
        tone="deep"
        size="h1"
        eyebrow="Goal engine"
        title={t("admin.targetRules.pageTitle")}
        description={t("admin.targetRules.subtitle")}
        actions={
          <SkyButton type="button" variant="primary" onClick={openCreate} className="whitespace-nowrap">
            <Plus className="w-4 h-4" />
            {t("admin.targetRules.createRule")}
          </SkyButton>
        }
      />

      {/* ── TABLE CARD ──────────────────────────────────────────────────── */}
      <SkyCard variant="admin" className="p-0 overflow-hidden">

        {/* Card header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/65 bg-white/45">
          <span className={`grid place-items-center w-8 h-8 shrink-0 rounded-sky-chip ring-1 ${TONE.deep.chip}`}>
            <BarChart2 className="w-4 h-4" strokeWidth={2.3} aria-hidden="true" />
          </span>
          <span className="font-display text-sm font-semibold text-sky-ink">{t("admin.targetRules.allRules")}</span>
          <div className="ml-auto flex items-center gap-2.5">
            <FilterDropdown<RuleFilters>
              fields={RULE_FILTER_FIELDS}
              filters={ruleFilters}
              onFilterChange={setRuleFilter}
              onClear={clearRuleFilters}
              hasActiveFilters={ruleHasActiveFilters}
            />
            {/* The count switches to "shown / total" while a filter is on, so a
                short list never gets mistaken for a short table. */}
            {!loading && (
              <span className={`rounded-sky-chip ring-1 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                ruleHasActiveFilters ? TONE.peach.chip : TONE.neutral.chip
              }`}>
                {ruleHasActiveFilters ? `${filteredRules.length} / ${rules.length}` : rules.length}
              </span>
            )}
          </div>
        </div>

        {/* Fetch error */}
        {fetchError && (
          <div className="relative mx-6 mt-5 flex items-center justify-between gap-3 overflow-hidden rounded-sky-chip bg-sky-rose/10 pl-4 pr-3.5 py-3">
            <span className="absolute left-0 top-0 h-full w-[3px] bg-sky-rose" aria-hidden="true" />
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-px text-sky-rose-deep" strokeWidth={2.2} aria-hidden="true" />
              <span className="text-sm font-semibold text-sky-rose-deep">{fetchError}</span>
            </div>
            <button onClick={fetchRules} className="shrink-0 rounded-sky-chip bg-white/72 ring-1 ring-white/85 px-3 py-1.5 text-xs font-semibold text-sky-ink whitespace-nowrap transition-colors hover:bg-white">
              {t("admin.targetRules.retry")}
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="sky-table-head">
                {[
                  t("admin.targetRules.table.measurementType"),
                  t("admin.targetRules.table.difficulty"),
                  t("admin.targetRules.table.method"),
                  t("admin.targetRules.table.changeValue"),
                  t("admin.targetRules.table.example"),
                  t("admin.targetRules.table.status"),
                  t("admin.targetRules.table.actions"),
                ].map((h) => (
                  <th key={h} className={`px-4 py-3 text-left ${eyebrow}`}>
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
                    <span className={`grid place-items-center w-16 h-16 mx-auto mb-4 rounded-sky-md ring-1 ${TONE.neutral.chip}`}>
                      <ClipboardList className="w-7 h-7" strokeWidth={1.9} aria-hidden="true" />
                    </span>
                    <p className="font-display text-sky-h3 font-semibold text-sky-ink">
                      {ruleHasActiveFilters ? t("admin.targetRules.noRulesMatch") : t("admin.targetRules.noRulesYet")}
                    </p>
                    {/* An empty *filtered* table is a dead end unless the way out
                        is offered right here, so the reset is a real button
                        rather than an underlined hint. */}
                    {ruleHasActiveFilters ? (
                      <button onClick={clearRuleFilters} className="mt-3 rounded-sky-chip bg-white/72 ring-1 ring-white/85 px-3.5 py-1.5 text-xs font-semibold text-sky-deep transition-colors hover:bg-white">
                        {t("admin.targetRules.clearFilters")}
                      </button>
                    ) : (
                      <p className="text-sky-ink-2 text-xs mt-1.5 font-medium">{t("admin.targetRules.createHint")}</p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule) => (
                  <tr key={rule.ruleId} className="sky-table-row">
                    {/* Measurement Type */}
                    <td className="px-4 py-4">
                      {/* The measurement type is what an operator finds a rule
                          by, so it is the one cell on the display face. */}
                      <span className="font-display text-sm font-semibold text-sky-ink whitespace-nowrap">
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
                      <span className="font-display text-sm font-semibold text-sky-ink tabular-nums">{rule.changeValue}</span>
                      {(rule.minValue !== null || rule.maxValue !== null) && (
                        <span className="block text-xs text-sky-ink-3 font-medium mt-0.5 whitespace-nowrap tabular-nums">
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
                        <SkyButton type="button" variant="ghost" size="icon" title="Edit rule" aria-label="Edit rule" onClick={() => openEdit(rule)} className="w-8 h-8">
                          <Pencil className="w-3.5 h-3.5" />
                        </SkyButton>
                        <SkyButton type="button" variant="ghost" size="icon" title="Delete rule" aria-label="Delete rule" onClick={() => openDelete(rule)} className="w-8 h-8 text-sky-rose-deep hover:bg-sky-rose/14">
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
        <div className="px-6 py-3 border-t border-white/65 bg-white/45">
          <span className="text-xs text-sky-ink-3 font-medium tabular-nums">
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
          eyebrowText="Target calculation"
          Icon={editingRule ? Pencil : Plus}
          tone="deep"
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

            {/* Constraint notice — only visible when editing. Type + difficulty
                form the rule's identity, so they can't be edited: that's a
                precondition to notice, not an error, hence peach with a rail
                rather than red. */}
            {editingRule && (
              <div className="relative flex items-start gap-2.5 overflow-hidden rounded-sky-chip bg-sky-peach/14 pl-4 pr-3.5 py-3">
                <span className="absolute left-0 top-0 h-full w-[3px] bg-sky-peach" aria-hidden="true" />
                <AlertTriangle className="w-4 h-4 shrink-0 mt-px text-sky-peach-deep" strokeWidth={2.2} aria-hidden="true" />
                <p className="text-xs font-semibold text-sky-peach-deep leading-relaxed">
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
                  <div className="relative mt-2 flex items-start gap-2 overflow-hidden rounded-sky-chip bg-sky-deep/8 pl-4 pr-3 py-2.5">
                    <span className="absolute left-0 top-0 h-full w-[3px] bg-sky-deep" aria-hidden="true" />
                    <Info className="w-3.5 h-3.5 shrink-0 mt-px text-sky-deep" strokeWidth={2.3} aria-hidden="true" />
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
            {/* Whether the rule is live is the highest-stakes field in this form,
                so it gets its own plated row and the track states On/Off in text
                as well as position — a knob alone is ambiguous at a glance. */}
            <div className={`relative flex items-center justify-between gap-4 overflow-hidden rounded-sky-md pl-4 pr-4 py-3.5 ring-1 ring-white/78 ${
              form.isActive ? TONE.teal.wash : "bg-white/48"
            }`}>
              <span className={`absolute left-0 top-0 h-full w-[3px] ${form.isActive ? TONE.teal.rail : "bg-sky-ink/18"}`} aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold text-sky-ink">{t("admin.targetRules.form.activeLabel")}</p>
                <p className="text-xs text-sky-ink-2 font-medium mt-0.5">{t("admin.targetRules.form.activeHint")}</p>
              </div>
              <button
                type="button"
                onClick={() => setField("isActive", !form.isActive)}
                aria-pressed={form.isActive}
                className={`group relative shrink-0 inline-flex items-center w-[74px] h-7 rounded-full ring-1 transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-deep/50 ${
                  form.isActive ? "bg-sky-teal ring-sky-teal/40" : "bg-sky-ink/14 ring-white/70"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 grid place-items-center w-6 h-6 rounded-full bg-white shadow-sky-chip transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    form.isActive ? "translate-x-[46px]" : "translate-x-0"
                  }`}
                >
                  {form.isActive
                    ? <Check className="w-3 h-3 text-sky-teal" strokeWidth={3} aria-hidden="true" />
                    : <Minus className="w-3 h-3 text-sky-ink-3" strokeWidth={3} aria-hidden="true" />}
                </span>
                <span className={`absolute text-[10px] font-semibold uppercase tracking-[0.1em] transition-opacity ${
                  form.isActive ? "left-3 text-white opacity-100" : "right-3 text-sky-ink-2 opacity-100"
                }`}>
                  {form.isActive ? "On" : "Off"}
                </span>
              </button>
            </div>

            {/* Inline error */}
            {formError && (
              <div className="relative flex items-start gap-2.5 overflow-hidden rounded-sky-chip bg-sky-rose/10 pl-4 pr-3.5 py-2.5">
                <span className="absolute left-0 top-0 h-full w-[3px] bg-sky-rose" aria-hidden="true" />
                <AlertTriangle className="w-4 h-4 shrink-0 mt-px text-sky-rose-deep" strokeWidth={2.2} aria-hidden="true" />
                <p className="text-xs font-semibold text-sky-rose-deep">{formError}</p>
              </div>
            )}

            {/* Form actions */}
            <div className="flex gap-3 pt-1">
              <SkyButton type="button" variant="secondary" onClick={closeForm} disabled={submitting} className="flex-1">
                {t("admin.targetRules.form.cancel")}
              </SkyButton>
              <SkyButton type="submit" variant="primary" disabled={submitting} className="flex-1">
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
        <GameModal
          title={t("admin.targetRules.deleteModal.title")}
          eyebrowText="Irreversible"
          Icon={ShieldAlert}
          tone="rose"
          onClose={closeDelete}
          maxWidth="max-w-md"
        >
          <div className="space-y-5">
            {/* Which rule is about to go is named in a plated slot rather than
                inline in a sentence, so it can't be skimmed past. */}
            <div className="relative overflow-hidden rounded-sky-md bg-white/58 ring-1 ring-white/80 pl-4 pr-4 py-3.5">
              <span className="absolute left-0 top-0 h-full w-[3px] bg-sky-rose" aria-hidden="true" />
              <p className={eyebrow}>Rule</p>
              <p className="font-display text-sky-h3 font-semibold leading-tight text-sky-ink mt-0.5">
                {MEASUREMENT_LABELS[deletingRule.measurementType] ?? deletingRule.measurementType}
                <span className="text-sky-ink-3 font-normal"> / </span>
                {deletingRule.difficulty}
              </p>
            </div>
            <div className="relative flex items-start gap-2.5 overflow-hidden rounded-sky-chip bg-sky-rose/10 pl-4 pr-4 py-3">
              <span className="absolute left-0 top-0 h-full w-[3px] bg-sky-rose" aria-hidden="true" />
              <AlertTriangle className="w-4 h-4 shrink-0 mt-px text-sky-rose-deep" strokeWidth={2.2} aria-hidden="true" />
              <p className="text-sm font-semibold text-sky-rose-deep leading-relaxed">
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

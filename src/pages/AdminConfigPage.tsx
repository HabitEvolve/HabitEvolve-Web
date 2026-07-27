import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  Settings2, RefreshCw, Loader2, X, Pencil,
  Bot, Gavel, Target, CalendarCheck, Gauge, Filter,
} from "lucide-react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { adminConfigApi } from "../api/adminConfigApi";
import type { SystemConfigDto } from "../types/adminConfig.types";
import { useAlert } from "../context/AlertContext";

// ── GROUP DISPLAY CONFIG ──────────────────────────────────────────────────────
interface GroupDisplay {
  label: string;
  icon: ReactNode;
  headerBg: string;
  headerText: string;
  countBg: string;
  countText: string;
}

const GROUP_CFG: Record<string, GroupDisplay> = {
  ai: {
    label: "AI System",
    icon: <Bot className="w-4 h-4 shrink-0" />,
    headerBg: "bg-violet-100 dark:bg-violet-900/30",
    headerText: "text-violet-900 dark:text-violet-200",
    countBg: "bg-violet-200 dark:bg-violet-800", countText: "text-violet-900 dark:text-violet-100",
  },
  court: {
    label: "Court & Karma",
    icon: <Gavel className="w-4 h-4 shrink-0" />,
    headerBg: "bg-amber-100 dark:bg-amber-900/30",
    headerText: "text-amber-900 dark:text-amber-200",
    countBg: "bg-amber-200 dark:bg-amber-800", countText: "text-amber-900 dark:text-amber-100",
  },
  quest: {
    label: "Quest Engine",
    icon: <Target className="w-4 h-4 shrink-0" />,
    headerBg: "bg-blue-100 dark:bg-blue-900/30",
    headerText: "text-blue-900 dark:text-blue-200",
    countBg: "bg-blue-200 dark:bg-blue-800", countText: "text-blue-900 dark:text-blue-100",
  },
  daily_task: {
    label: "Daily Tasks",
    icon: <CalendarCheck className="w-4 h-4 shrink-0" />,
    headerBg: "bg-teal-100 dark:bg-teal-900/30",
    headerText: "text-teal-900 dark:text-teal-200",
    countBg: "bg-teal-200 dark:bg-teal-800", countText: "text-teal-900 dark:text-teal-100",
  },
  difficulty: {
    label: "Difficulty",
    icon: <Gauge className="w-4 h-4 shrink-0" />,
    headerBg: "bg-red-100 dark:bg-red-900/30",
    headerText: "text-red-900 dark:text-red-200",
    countBg: "bg-red-200 dark:bg-red-800", countText: "text-red-900 dark:text-red-100",
  },
};

const DEFAULT_GROUP: GroupDisplay = {
  label: "Other",
  icon: <Settings2 className="w-4 h-4 shrink-0" />,
  headerBg: "bg-gray-100 dark:bg-gray-800/60",
  headerText: "text-gray-700 dark:text-gray-300",
  countBg: "bg-gray-200 dark:bg-gray-700", countText: "text-gray-700 dark:text-gray-200",
};

const getGroupDisplay = (group: string): GroupDisplay =>
  GROUP_CFG[group] ?? { ...DEFAULT_GROUP, label: group.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) };

// Maps configGroup keys to i18n sub-keys under admin.configPage.groups.*
const GROUP_I18N: Record<string, string> = {
  ai: "ai", court: "court", quest: "quest",
  daily_task: "daily", difficulty: "difficulty",
};

// ── VALUE TYPE BADGE ──────────────────────────────────────────────────────────
const TYPE_CLS: Record<string, string> = {
  bool:   "bg-violet-50 border-violet-300 text-violet-700 dark:bg-violet-900/30 dark:border-violet-600 dark:text-violet-300",
  int:    "bg-sky-50    border-sky-300    text-sky-700    dark:bg-sky-900/30    dark:border-sky-600    dark:text-sky-300",
  double: "bg-cyan-50   border-cyan-300   text-cyan-700   dark:bg-cyan-900/30   dark:border-cyan-600   dark:text-cyan-300",
  string: "bg-gray-50   border-gray-300   text-gray-500   dark:bg-gray-800      dark:border-gray-600   dark:text-gray-400",
};

const TypeBadge = ({ type }: { type: string }) => (
  <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${TYPE_CLS[type] ?? TYPE_CLS.string} shrink-0`}>
    {type}
  </span>
);

// ── VALUE BADGE ───────────────────────────────────────────────────────────────
const ValueBadge = ({ value, type }: { value: string; type: string }) => {
  const { t } = useTranslation();
  if (type === "bool") {
    const isTrue = value.toLowerCase() === "true";
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black border-2 shrink-0 ${
        isTrue
          ? "bg-green-100 border-green-400 text-green-800 dark:bg-green-900/30 dark:border-green-600 dark:text-green-300"
          : "bg-red-100   border-red-400   text-red-800   dark:bg-red-900/30   dark:border-red-600   dark:text-red-300"
      }`}>
        <img
          src={isTrue ? "/icon/UI/Checkmark/64px/Checkmark 1st 64px.png" : "/icon/UI/X/64px/X 1st 64px.png"}
          alt=""
          className="w-3 h-3 object-contain shrink-0"
        />
        {value}
      </span>
    );
  }
  if (type === "int" || type === "double") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black border-2 bg-sky-50 border-sky-400 text-sky-800 dark:bg-sky-900/30 dark:border-sky-600 dark:text-sky-200 font-mono shrink-0">
        {value}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border-2 bg-gray-50 border-gray-300 text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 max-w-[11rem] truncate shrink-0" title={value}>
      {value || <span className="italic text-gray-400">{t("admin.configPage.emptyValue")}</span>}
    </span>
  );
};

// ── CONFIG ROW ────────────────────────────────────────────────────────────────
interface ConfigRowProps {
  cfg: SystemConfigDto;
  onEdit: (cfg: SystemConfigDto) => void;
}

const ConfigRow = ({ cfg, onEdit }: ConfigRowProps) => (
  <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors hover:bg-gray-50/60 dark:hover:bg-white/5 ${!cfg.isActive ? "opacity-50" : ""}`}>
    {/* Key + description */}
    <div className="flex-1 min-w-0 pr-2">
      <code className="text-[11px] font-black text-gray-500 dark:text-gray-400 block truncate leading-tight">
        {cfg.configKey}
      </code>
      <p className="text-xs text-gray-600 dark:text-gray-300 font-medium mt-0.5 line-clamp-1 leading-tight">
        {cfg.description || <span className="italic text-gray-400">No description</span>}
      </p>
    </div>

    {/* Type + value */}
    <div className="flex items-center gap-2 shrink-0">
      <TypeBadge type={cfg.valueType} />
      <ValueBadge value={cfg.configValue} type={cfg.valueType} />
    </div>

    {/* Edit button */}
    <button
      onClick={() => onEdit(cfg)}
      title={`Edit ${cfg.configKey}`}
      className="shrink-0 w-7 h-7 flex items-center justify-center border-2 border-black dark:border-white rounded-lg bg-white dark:bg-gray-700 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
    >
      <Pencil className="w-3 h-3" />
    </button>
  </div>
);

// ── GROUP CARD ────────────────────────────────────────────────────────────────
interface GroupCardProps {
  group: string;
  configs: SystemConfigDto[];
  onEdit: (cfg: SystemConfigDto) => void;
}

const GroupCard = ({ group, configs, onEdit }: GroupCardProps) => {
  const { t } = useTranslation();
  const display = getGroupDisplay(group);
  const groupLabel = t(`admin.configPage.groups.${GROUP_I18N[group] ?? "other"}`);
  return (
    <div className="bg-white dark:bg-[#1e2a3a] border-4 border-black dark:border-white rounded-xl shadow-[4px_4px_0_0_#1A1D20] overflow-hidden flex flex-col">
      {/* Card header */}
      <div className={`flex items-center gap-2.5 px-4 py-3 border-b-4 border-black dark:border-white ${display.headerBg}`}>
        <span className={display.headerText}>{display.icon}</span>
        <h3 className={`font-black text-sm flex-1 ${display.headerText}`}>
          {groupLabel}
        </h3>
        <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border border-black/20 ${display.countBg} ${display.countText}`}>
          {configs.length}
        </span>
      </div>

      {/* Rows */}
      <div className="flex flex-col divide-y-0">
        {configs.map(cfg => (
          <ConfigRow key={cfg.configId} cfg={cfg} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
};

// ── EDIT MODAL ────────────────────────────────────────────────────────────────
interface EditModalProps {
  config: SystemConfigDto;
  onClose: () => void;
  onSaved: (updated: SystemConfigDto) => void;
}

const inputCls =
  "w-full px-3 py-2.5 text-sm font-medium border-2 border-black dark:border-gray-500 rounded-xl bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white placeholder:text-gray-400";

const EditModal = ({ config, onClose, onSaved }: EditModalProps) => {
  const { t } = useTranslation();
  const alert = useAlert();
  const [value, setValue] = useState(config.configValue);
  const [description, setDescription] = useState(config.description ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() && config.valueType !== "string") return;

    setSaving(true);
    try {
      const res = await adminConfigApi.upsert(config.configKey, {
        value: value.trim(),
        description: description.trim() || undefined,
      });
      if (res.success && res.data) {
        alert.success(`"${config.configKey}" updated successfully!`);
        onSaved(res.data);
        onClose();
      } else {
        alert.error(res.message || "Failed to update config.");
      }
    } catch (err: any) {
      alert.error(err?.response?.data?.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const renderValueInput = () => {
    if (config.valueType === "bool") {
      return (
        <div className="flex gap-2.5">
          {(["true", "false"] as const).map(opt => {
            const active = value.toLowerCase() === opt;
            const isTrue = opt === "true";
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setValue(opt)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 border-2 rounded-xl font-black text-sm transition-all capitalize ${
                  active
                    ? isTrue
                      ? "bg-green-200 border-green-600 text-green-900 shadow-none translate-x-0.5 translate-y-0.5"
                      : "bg-red-200 border-red-600 text-red-900 shadow-none translate-x-0.5 translate-y-0.5"
                    : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
                }`}
              >
                <img
                  src={isTrue ? "/icon/UI/Checkmark/64px/Checkmark 1st 64px.png" : "/icon/UI/X/64px/X 1st 64px.png"}
                  alt=""
                  className="w-4 h-4 object-contain shrink-0"
                />
                {opt}
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <input
        type={config.valueType === "int" || config.valueType === "double" ? "number" : "text"}
        step={config.valueType === "double" ? "any" : config.valueType === "int" ? "1" : undefined}
        value={value}
        onChange={e => setValue(e.target.value)}
        className={inputCls}
        required={config.valueType !== "string"}
        autoFocus
      />
    );
  };

  return createPortal(
    <div
      className="modal-content fixed inset-0 z-99999 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#1e2a3a] border-4 border-black dark:border-white rounded-2xl shadow-[8px_8px_0_0_#1A1D20]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b-4 border-black dark:border-white">
          <div className="w-9 h-9 flex items-center justify-center bg-black dark:bg-white rounded-lg shrink-0">
            <Settings2 className="w-5 h-5 text-white dark:text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-base leading-tight">{t("admin.configPage.editModal.title")}</h2>
            <code className="text-xs text-gray-500 dark:text-gray-400 truncate block">{config.configKey}</code>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border-2 border-black dark:border-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Group + type info */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/60 border-2 border-gray-200 dark:border-gray-700 rounded-xl">
            {(() => {
              const d = getGroupDisplay(config.configGroup);
              return (
                <>
                  <span className="text-gray-500 dark:text-gray-400">{d.icon}</span>
                  <span className="text-xs font-black text-gray-600 dark:text-gray-300">{t(`admin.configPage.groups.${GROUP_I18N[config.configGroup] ?? "other"}`)}</span>
                </>
              );
            })()}
            <div className="ml-auto">
              <TypeBadge type={config.valueType} />
            </div>
          </div>

          {/* Value input */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
              {t("admin.configPage.editModal.valueLabel")}
            </label>
            {renderValueInput()}
            {config.valueType === "string" && (
              <p className="text-[10px] text-gray-400 mt-1">{t("admin.configPage.editModal.stringHint")}</p>
            )}
          </div>

          {/* Description input */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
              {t("admin.configPage.editModal.descLabel")} <span className="font-medium normal-case tracking-normal">{t("admin.configPage.editModal.optional")}</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder={t("admin.configPage.editModal.descPlaceholder")}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 border-2 border-black dark:border-white rounded-xl font-black text-sm bg-white dark:bg-gray-700 shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50 transition-all"
            >
              {t("admin.configPage.editModal.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 border-2 border-black rounded-xl font-black text-sm bg-emerald-400 shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-60 transition-all inline-flex items-center justify-center gap-2"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {t("admin.configPage.editModal.saving")}</>
              ) : (
                <>
                  <img src="/icon/UI/Checkmark/64px/Checkmark 1st 64px.png" alt="" className="w-4 h-4 object-contain" />
                  {t("admin.configPage.editModal.save")}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// ── PAGE ──────────────────────────────────────────────────────────────────────
const KNOWN_GROUPS = ["ai", "court", "quest", "daily_task", "difficulty"] as const;

export default function AdminConfigPage() {
  const { t } = useTranslation();
  const alert = useAlert();

  const [configs, setConfigs] = useState<SystemConfigDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<string>(""); // "" = all
  const [editTarget, setEditTarget] = useState<SystemConfigDto | null>(null);

  // ── Fetch all configs (large page to get everything) ──
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await adminConfigApi.getAll({ pageSize: 200 });
      if (res.success) {
        setConfigs(res.data ?? []);
      } else {
        setFetchError(res.message || "Failed to load configs.");
      }
    } catch (err: any) {
      setFetchError(err?.response?.data?.message || "Network error while loading configs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Reload BE cache ──
  const handleReloadCache = async () => {
    setReloading(true);
    try {
      const res = await adminConfigApi.reloadCache();
      if (res.success) {
        alert.success(`Cache reloaded — ${res.data ?? 0} active configs loaded.`);
        await fetchAll(); // Re-fetch to see fresh data
      } else {
        alert.error(res.message || "Failed to reload cache.");
      }
    } catch (err: any) {
      alert.error(err?.response?.data?.message || "Cache reload failed.");
    } finally {
      setReloading(false);
    }
  };

  // ── Optimistic update after save ──
  const handleSaved = useCallback((updated: SystemConfigDto) => {
    setConfigs(prev => prev.map(c => c.configId === updated.configId ? updated : c));
  }, []);

  // ── Group configs by configGroup ──
  const groupedMap = useMemo(() => {
    const map = new Map<string, SystemConfigDto[]>();
    for (const cfg of configs) {
      const g = cfg.configGroup ?? "other";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(cfg);
    }
    // Sort each group's configs by key
    for (const [, list] of map) list.sort((a, b) => a.configKey.localeCompare(b.configKey));
    return map;
  }, [configs]);

  // Order: known groups first, then extras
  const orderedGroups = useMemo(() => {
    const known = KNOWN_GROUPS.filter(g => groupedMap.has(g));
    const extra = [...groupedMap.keys()].filter(g => !KNOWN_GROUPS.includes(g as typeof KNOWN_GROUPS[number]));
    return [...known, ...extra];
  }, [groupedMap]);

  // Filter pills: discovered groups + "All"
  const filterGroups = orderedGroups;

  // Displayed groups (after filter)
  const displayedGroups = groupFilter ? [groupFilter] : orderedGroups;

  const totalCount = configs.length;

  return (
    <>
      <PageMeta title="System Configuration — HabitEvolve" description="Manage all game thresholds, economy limits, and system toggles" />
      <PageBreadcrumb pageTitle={t("admin.configPage.pageTitle")} />

      {/* ── PAGE HEADER ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-11 h-11 flex items-center justify-center bg-black dark:bg-white rounded-xl border-4 border-black dark:border-white shadow-[3px_3px_0_0_#1A1D20] shrink-0">
            <Settings2 className="w-5 h-5 text-white dark:text-black" />
          </div>
          <div>
            <h1 className="text-xl font-black leading-tight">{t("admin.configPage.pageTitle")}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {totalCount} configs across {orderedGroups.length} groups — {t("admin.configPage.subtitle")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Refresh list */}
          <button
            onClick={fetchAll}
            disabled={loading}
            title="Refresh config list"
            className="w-9 h-9 flex items-center justify-center border-2 border-black dark:border-white rounded-lg bg-white dark:bg-gray-700 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>

          {/* Reload cache */}
          <button
            onClick={handleReloadCache}
            disabled={reloading || loading}
            className="flex items-center gap-2 px-4 py-2 border-2 border-black dark:border-white rounded-xl font-black text-sm bg-amber-400 shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-60 transition-all"
          >
            {reloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {t("admin.configPage.reloadCache")}
          </button>
        </div>
      </div>

      {/* ── FILTER PILLS ───────────────────────────────────────────────────── */}
      {filterGroups.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs font-black text-gray-500 dark:text-gray-400 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> {t("admin.configPage.groupFilter")}
          </span>

          {/* "All" pill */}
          <button
            onClick={() => setGroupFilter("")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-black transition-all ${
              groupFilter === ""
                ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-none translate-x-0.5 translate-y-0.5"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
            }`}
          >
            <Filter className="w-3.5 h-3.5 shrink-0" />
            {t("admin.configPage.groups.all")}
          </button>

          {filterGroups.map(g => {
            const d = getGroupDisplay(g);
            const active = groupFilter === g;
            return (
              <button
                key={g}
                onClick={() => setGroupFilter(active ? "" : g)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-black transition-all ${
                  active
                    ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-none translate-x-0.5 translate-y-0.5"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
                }`}
              >
                {d.icon}
                {t(`admin.configPage.groups.${GROUP_I18N[g] ?? "other"}`)}
                <span className="text-[10px] opacity-60">({groupedMap.get(g)?.length ?? 0})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── LOADING STATE ──────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-20 text-gray-500">
          <Loader2 className="w-7 h-7 animate-spin" />
          <span className="font-bold">{t("admin.configPage.loading")}</span>
        </div>
      )}

      {/* ── FETCH ERROR ────────────────────────────────────────────────────── */}
      {!loading && fetchError && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border-4 border-red-400 dark:border-red-700 rounded-xl text-red-700 dark:text-red-400">
          <img src="/icon/UI/Warning/64px/Warning 1st 64px.png" alt="" className="w-5 h-5 object-contain shrink-0 mt-0.5" />
          <div>
            <p className="font-black">{t("admin.configPage.loadFailed")}</p>
            <p className="text-sm font-medium mt-0.5">{fetchError}</p>
            <button onClick={fetchAll} className="mt-2 text-xs font-black underline">{t("admin.configPage.retry")}</button>
          </div>
        </div>
      )}

      {/* ── EMPTY STATE ────────────────────────────────────────────────────── */}
      {!loading && !fetchError && configs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400">
          <Settings2 className="w-14 h-14 opacity-20" />
          <p className="font-black text-lg">{t("admin.configPage.noConfigs")}</p>
          <p className="text-sm">{t("admin.configPage.noConfigsHint")}</p>
        </div>
      )}

      {/* ── GROUP CARDS GRID ───────────────────────────────────────────────── */}
      {!loading && !fetchError && configs.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {displayedGroups.map(group => {
            const groupConfigs = groupedMap.get(group);
            if (!groupConfigs?.length) return null;
            return (
              <GroupCard
                key={group}
                group={group}
                configs={groupConfigs}
                onEdit={setEditTarget}
              />
            );
          })}
        </div>
      )}

      {/* ── EDIT MODAL ─────────────────────────────────────────────────────── */}
      {editTarget && (
        <EditModal
          config={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}

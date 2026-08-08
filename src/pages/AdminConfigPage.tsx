import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  Settings2, RefreshCw, Loader2, X, Pencil,
  Bot, Gavel, Target, CalendarCheck, Gauge,
  Check, Minus, AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import PageHeader from "../components/common/PageHeader";
import { adminConfigApi } from "../api/adminConfigApi";
import type { SystemConfigDto } from "../types/adminConfig.types";
import { useAlert } from "../context/AlertContext";
import SkyCard from "../components/ui/card/SkyCard";
import SkyButton from "../components/ui/button/SkyButton";
import { FilterDropdown } from "../components/common/FilterDropdown";
import type { FilterField } from "../hooks/useTableFilters";

// ── TONE TAXONOMY ─────────────────────────────────────────────────────────────
// Config groups are a *taxonomy of subsystems*, not a severity ramp — so the
// hues here are picked for separation at a glance and deliberately spend no
// teal and no rose: on this screen teal means a boolean is on, and rose means an
// error. A subsystem label must never borrow either.
type Tone = "deep" | "cool" | "peach" | "dmg" | "violet" | "teal" | "rose" | "neutral";
const TONE: Record<Tone, { chip: string; wash: string; rail: string }> = {
  deep:    { chip: "bg-sky-deep/12 ring-sky-deep/22 text-sky-deep",            wash: "bg-sky-deep/8",     rail: "bg-sky-deep" },
  cool:    { chip: "bg-sky-deep-lo/14 ring-sky-deep-lo/24 text-sky-deep-lo",   wash: "bg-sky-deep-lo/9",  rail: "bg-sky-deep-lo" },
  peach:   { chip: "bg-sky-peach/20 ring-sky-peach/32 text-sky-peach-deep",    wash: "bg-sky-peach/14",   rail: "bg-sky-peach" },
  dmg:     { chip: "bg-sky-dmg/14 ring-sky-dmg/26 text-sky-dmg-deep",          wash: "bg-sky-dmg/10",     rail: "bg-sky-dmg" },
  violet:  { chip: "bg-sky-violet/14 ring-sky-violet/26 text-sky-violet-deep", wash: "bg-sky-violet/10",  rail: "bg-sky-violet" },
  teal:    { chip: "bg-sky-teal-bg ring-sky-teal/26 text-sky-teal",            wash: "bg-sky-teal/10",    rail: "bg-sky-teal" },
  rose:    { chip: "bg-sky-rose/14 ring-sky-rose/26 text-sky-rose-deep",       wash: "bg-sky-rose/10",    rail: "bg-sky-rose" },
  neutral: { chip: "bg-white/72 ring-white/85 text-sky-ink-2",                 wash: "bg-white/48",       rail: "bg-sky-ink/22" },
};

const eyebrow = "text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3";

// ── GROUP DISPLAY CONFIG ──────────────────────────────────────────────────────
interface GroupDisplay {
  label: string;
  Icon: LucideIcon;
  tone: Tone;
}

const GROUP_CFG: Record<string, GroupDisplay> = {
  ai:         { label: "AI System",     Icon: Bot,           tone: "violet" },
  court:      { label: "Court & Karma", Icon: Gavel,         tone: "peach" },
  quest:      { label: "Quest Engine",  Icon: Target,        tone: "deep" },
  daily_task: { label: "Daily Tasks",   Icon: CalendarCheck, tone: "cool" },
  difficulty: { label: "Difficulty",    Icon: Gauge,         tone: "dmg" },
};

const DEFAULT_GROUP: GroupDisplay = {
  label: "Other",
  Icon: Settings2,
  tone: "neutral",
};

const getGroupDisplay = (group: string): GroupDisplay =>
  GROUP_CFG[group] ?? { ...DEFAULT_GROUP, label: group.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) };

// Maps configGroup keys to i18n sub-keys under admin.configPage.groups.*
const GROUP_I18N: Record<string, string> = {
  ai: "ai", court: "court", quest: "quest",
  daily_task: "daily", difficulty: "difficulty",
};

// ── VALUE TYPE BADGE ──────────────────────────────────────────────────────────
// The value type is metadata, not a state, so it stays a quiet recessed tag —
// it must never out-shout the value sitting next to it.
const TYPE_TONE: Record<string, Tone> = {
  bool: "violet",
  int: "deep",
  double: "cool",
  string: "neutral",
};

const TypeBadge = ({ type }: { type: string }) => (
  <span className={`shrink-0 rounded-[7px] ring-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${TONE[TYPE_TONE[type] ?? "neutral"].chip}`}>
    {type}
  </span>
);

// ── VALUE BADGE ───────────────────────────────────────────────────────────────
const ValueBadge = ({ value, type }: { value: string; type: string }) => {
  const { t } = useTranslation();
  if (type === "bool") {
    // A toggle that is on is genuinely an active state, so it takes teal; off is
    // not a failure, so it takes neutral rather than red. Both carry a glyph so
    // the state never rests on hue alone.
    const isTrue = value.toLowerCase() === "true";
    return (
      <span className={`inline-flex shrink-0 items-center gap-1 rounded-sky-chip ring-1 px-2 py-0.5 text-xs font-semibold ${
        isTrue ? TONE.teal.chip : TONE.neutral.chip
      }`}>
        {isTrue
          ? <Check className="w-3 h-3 shrink-0" strokeWidth={2.8} aria-hidden="true" />
          : <Minus className="w-3 h-3 shrink-0" strokeWidth={2.8} aria-hidden="true" />}
        {value}
      </span>
    );
  }
  if (type === "int" || type === "double") {
    // Numbers are what an operator actually compares between rows, so they get
    // the display face and tabular figures — columns of digits line up.
    return (
      <span className="inline-flex shrink-0 items-center rounded-sky-chip bg-sky-deep/10 ring-1 ring-sky-deep/20 px-2 py-0.5 font-display text-xs font-semibold text-sky-deep tabular-nums">
        {value}
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 max-w-44 items-center truncate rounded-sky-chip bg-white/70 ring-1 ring-white/85 px-2 py-0.5 text-xs font-medium text-sky-ink-2" title={value}>
      {value || <span className="italic text-sky-ink-3">{t("admin.configPage.emptyValue")}</span>}
    </span>
  );
};

// ── CONFIG ROW ────────────────────────────────────────────────────────────────
interface ConfigRowProps {
  cfg: SystemConfigDto;
  onEdit: (cfg: SystemConfigDto) => void;
}

const ConfigRow = ({ cfg, onEdit }: ConfigRowProps) => (
  <div className={`group relative flex items-center gap-3 px-4 py-3 border-b border-white/62 last:border-b-0 transition-colors hover:bg-white/58 ${!cfg.isActive ? "opacity-50" : ""}`}>
    {/* An inactive config is still listed but does nothing, so it gets a muted
        rail as well as the dimming — opacity alone reads as a loading state. */}
    {!cfg.isActive && <span className="absolute left-0 top-0 h-full w-[3px] bg-sky-ink/22" aria-hidden="true" />}

    {/* Key + description. The key is the identifier an operator searches for, so
        it holds full ink and the description recedes beneath it. */}
    <div className="flex-1 min-w-0 pr-2">
      <code className="block truncate font-mono text-[11px] font-semibold leading-tight text-sky-ink">
        {cfg.configKey}
      </code>
      <p className="mt-0.5 line-clamp-1 text-xs font-medium leading-tight text-sky-ink-3">
        {cfg.description || <span className="italic">No description</span>}
      </p>
    </div>

    {/* Type + value */}
    <div className="flex items-center gap-2 shrink-0">
      <TypeBadge type={cfg.valueType} />
      <ValueBadge value={cfg.configValue} type={cfg.valueType} />
    </div>

    {/* Edit button — always reachable by keyboard, but only fully opaque on
        hover so a long list of rows isn't a wall of pencils. */}
    <SkyButton
      type="button" variant="ghost" size="icon"
      onClick={() => onEdit(cfg)}
      title={`Edit ${cfg.configKey}`} aria-label={`Edit ${cfg.configKey}`}
      className="w-7 h-7 shrink-0 opacity-45 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
    >
      <Pencil className="w-3 h-3" />
    </SkyButton>
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
  const tone = TONE[display.tone];
  const Icon = display.Icon;
  return (
    <SkyCard variant="admin" className="p-0 overflow-hidden flex flex-col">
      {/* Card header. The rail is what lets an operator re-find a subsystem at a
          glance once several of these cards are stacked in a grid. */}
      <div className={`relative flex items-center gap-3 overflow-hidden border-b border-white/65 px-4 py-3.5 ${tone.wash}`}>
        <span className={`absolute left-0 top-0 h-full w-[3px] ${tone.rail}`} aria-hidden="true" />
        <span className={`grid place-items-center w-8 h-8 shrink-0 rounded-sky-chip ring-1 ${tone.chip}`}>
          <Icon className="w-4 h-4" strokeWidth={2.3} aria-hidden="true" />
        </span>
        <h3 className="flex-1 min-w-0 truncate font-display text-sm font-semibold text-sky-ink">
          {groupLabel}
        </h3>
        <span className={`shrink-0 rounded-sky-chip ring-1 px-2 py-0.5 text-[11px] font-semibold tabular-nums ${tone.chip}`}>
          {configs.length}
        </span>
      </div>

      {/* Rows */}
      <div className="flex flex-col">
        {configs.map(cfg => (
          <ConfigRow key={cfg.configId} cfg={cfg} onEdit={onEdit} />
        ))}
      </div>
    </SkyCard>
  );
};

// ── EDIT MODAL ────────────────────────────────────────────────────────────────
interface EditModalProps {
  config: SystemConfigDto;
  onClose: () => void;
  onSaved: (updated: SystemConfigDto) => void;
}

const inputCls = [
  "w-full px-3.5 py-2.5 rounded-sky-chip bg-white/70 ring-1 ring-white/80",
  "text-sm font-medium text-sky-ink transition-shadow",
  "focus:outline-none focus:ring-2 focus:ring-sky-deep/45",
  "placeholder:text-sky-ink-3",
].join(" ");

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
        // Two exclusive options read best as one segmented track rather than two
        // loose buttons — the recessed well makes the unpicked side obviously
        // still pickable, and only the chosen segment lifts.
        <div className="flex gap-1.5 rounded-sky-md bg-white/45 ring-1 ring-white/72 p-1.5">
          {(["true", "false"] as const).map(opt => {
            const active = value.toLowerCase() === opt;
            const isTrue = opt === "true";
            const OptIcon = isTrue ? Check : Minus;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setValue(opt)}
                aria-pressed={active}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-sky-chip py-2.5 text-sm font-semibold capitalize transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  active
                    ? isTrue
                      ? "bg-sky-teal text-white shadow-sky-chip"
                      : "bg-sky-ink/70 text-white shadow-sky-chip"
                    : "text-sky-ink-2 hover:bg-white/72 hover:text-sky-ink"
                }`}
              >
                <OptIcon className="w-4 h-4 shrink-0" strokeWidth={2.8} aria-hidden="true" />
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
      className="modal-content fixed inset-0 z-99999 flex items-center justify-center p-4 bg-sky-ink/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <SkyCard
        variant="admin"
        className="w-full max-w-md p-0 overflow-hidden"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="relative flex items-center gap-3 overflow-hidden border-b border-white/65 bg-sky-deep/8 px-5 py-4">
          <span className="absolute left-0 top-0 h-full w-[3px] bg-sky-deep" aria-hidden="true" />
          <span className="grid place-items-center w-10 h-10 shrink-0 rounded-sky-chip bg-sky-deep/12 ring-1 ring-sky-deep/22 text-sky-deep">
            <Settings2 className="w-5 h-5" strokeWidth={2.2} aria-hidden="true" />
          </span>
          <div className="flex-1 min-w-0">
            <p className={eyebrow}>{t("admin.configPage.editModal.title")}</p>
            {/* Which key is being changed is the fact that must not be misread,
                so it is the title here rather than a caption under one. */}
            <code className="block truncate font-mono text-sm font-semibold leading-tight text-sky-ink">{config.configKey}</code>
          </div>
          <SkyButton type="button" variant="ghost" size="icon" onClick={onClose} className="shrink-0" aria-label="Close">
            <X className="w-4 h-4" />
          </SkyButton>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Group + type info */}
          <div className="flex items-center gap-2.5 rounded-sky-chip bg-white/58 ring-1 ring-white/80 px-3.5 py-2.5">
            {(() => {
              const d = getGroupDisplay(config.configGroup);
              const dTone = TONE[d.tone];
              const DIcon = d.Icon;
              return (
                <>
                  <span className={`grid place-items-center w-6 h-6 shrink-0 rounded-[8px] ring-1 ${dTone.chip}`}>
                    <DIcon className="w-3.5 h-3.5" strokeWidth={2.4} aria-hidden="true" />
                  </span>
                  <span className="text-xs font-semibold text-sky-ink">{t(`admin.configPage.groups.${GROUP_I18N[config.configGroup] ?? "other"}`)}</span>
                </>
              );
            })()}
            <div className="ml-auto">
              <TypeBadge type={config.valueType} />
            </div>
          </div>

          {/* Value input */}
          <div>
            <label className={`block mb-2 ${eyebrow}`}>
              {t("admin.configPage.editModal.valueLabel")}
            </label>
            {renderValueInput()}
            {config.valueType === "string" && (
              <p className="mt-1.5 text-[10px] font-medium text-sky-ink-3">{t("admin.configPage.editModal.stringHint")}</p>
            )}
          </div>

          {/* Description input */}
          <div>
            <label className={`block mb-2 ${eyebrow}`}>
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
            <SkyButton type="button" variant="secondary" onClick={onClose} disabled={saving} className="flex-1">
              {t("admin.configPage.editModal.cancel")}
            </SkyButton>
            <SkyButton type="submit" variant="primary" disabled={saving} className="flex-1">
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {t("admin.configPage.editModal.saving")}</>
              ) : (
                <><Check className="w-4 h-4" /> {t("admin.configPage.editModal.save")}</>
              )}
            </SkyButton>
          </div>
        </form>
      </SkyCard>
    </div>,
    document.body
  );
};

// ── PAGE ──────────────────────────────────────────────────────────────────────
// `weekly_boss` giữ luôn các key thưởng Rương Tuần (weekly_chest.gold_* / weekly_chest.mgold_*) — đây là
// nơi DUY NHẤT đổi được số Gold/M-Gold mỗi thành viên nhận khi hạ Boss, nên đưa lên nhóm biết trước.
const KNOWN_GROUPS = ["ai", "court", "quest", "daily_task", "difficulty", "weekly_boss"] as const;

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
      <PageHeader
        className="mb-6"
        icon={<Settings2 className="w-6 h-6" strokeWidth={2.1} aria-hidden="true" />}
        tone="deep"
        eyebrow="Platform"
        title={t("admin.configPage.pageTitle")}
        description={
          <>
            <span className="tabular-nums">{totalCount}</span> configs across <span className="tabular-nums">{orderedGroups.length}</span> groups — {t("admin.configPage.subtitle")}
          </>
        }
        actions={
          <>
            {/* Refresh list */}
            <SkyButton type="button" variant="secondary" size="icon" onClick={fetchAll} disabled={loading} title="Refresh config list" aria-label="Refresh config list">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </SkyButton>

            {/* Reload cache */}
            <SkyButton type="button" variant="primary" onClick={handleReloadCache} disabled={reloading || loading}>
              {reloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {t("admin.configPage.reloadCache")}
            </SkyButton>
          </>
        }
      />

      {/* ── FILTER PILLS ───────────────────────────────────────────────────── */}
      {/* The whole pill row sits in one recessed glass track, so it reads as a
          single control rather than a scatter of loose buttons — and the
          selected pill is the only thing that lifts out of it. */}
      {filterGroups.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-6">
          <FilterDropdown<{ group: string }>
            fields={[{
              key: "group",
              label: t("admin.configPage.groupFilter"),
              type: "select",
              options: filterGroups.map(g => ({
                label: `${t(`admin.configPage.groups.${GROUP_I18N[g] ?? "other"}`)} (${groupedMap.get(g)?.length ?? 0})`,
                value: g,
              })),
            } satisfies FilterField]}
            filters={{ group: groupFilter }}
            onFilterChange={(_, value) => setGroupFilter(value)}
            onClear={() => setGroupFilter("")}
            hasActiveFilters={groupFilter !== ""}
            align="left"
          />
        </div>
      )}

      {/* ── LOADING STATE ──────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-20 text-sky-ink-3">
          <Loader2 className="w-7 h-7 animate-spin" />
          <span className="text-sm font-medium">{t("admin.configPage.loading")}</span>
        </div>
      )}

      {/* ── FETCH ERROR ────────────────────────────────────────────────────── */}
      {!loading && fetchError && (
        <div className="relative flex items-start gap-3 overflow-hidden rounded-sky-card bg-sky-rose/10 pl-5 pr-4 py-4">
          <span className="absolute left-0 top-0 h-full w-[3px] bg-sky-rose" aria-hidden="true" />
          <AlertTriangle className="w-5 h-5 shrink-0 mt-px text-sky-rose-deep" strokeWidth={2.2} aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold text-sky-rose-deep">{t("admin.configPage.loadFailed")}</p>
            <p className="mt-0.5 text-sm font-medium text-sky-ink-2">{fetchError}</p>
            <button onClick={fetchAll} className="mt-2.5 rounded-sky-chip bg-white/72 ring-1 ring-white/85 px-3 py-1.5 text-xs font-semibold text-sky-ink transition-colors hover:bg-white">
              {t("admin.configPage.retry")}
            </button>
          </div>
        </div>
      )}

      {/* ── EMPTY STATE ────────────────────────────────────────────────────── */}
      {!loading && !fetchError && configs.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-sky-card border border-dashed border-sky-ink/15 bg-white/38 py-20">
          <span className="grid place-items-center w-16 h-16 rounded-sky-md bg-white/72 ring-1 ring-white/85 text-sky-ink-3">
            <Settings2 className="w-7 h-7" strokeWidth={1.9} aria-hidden="true" />
          </span>
          <p className="font-display text-sky-h3 font-semibold text-sky-ink">{t("admin.configPage.noConfigs")}</p>
          <p className="text-sm font-medium text-sky-ink-2">{t("admin.configPage.noConfigsHint")}</p>
        </div>
      )}

      {/* ── GROUP CARDS GRID ───────────────────────────────────────────────── */}
      {!loading && !fetchError && configs.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sky-stagger">
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

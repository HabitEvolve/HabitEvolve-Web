import { Search, X } from "lucide-react";
import type { FilterField } from "../../hooks/useTableFilters";

// ── STYLES ────────────────────────────────────────────────────────────────────
const eyebrow = "text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3";

const textInputCls =
  "w-full pl-8 pr-3 py-2 text-sm font-medium rounded-sky-chip bg-white/70 ring-1 ring-white/80 text-sky-ink " +
  "transition-shadow focus:outline-none focus:ring-2 focus:ring-sky-deep/45 placeholder:text-sky-ink-3";

const selectCls =
  "w-full px-3 py-2 text-sm font-medium rounded-sky-chip bg-white/70 ring-1 ring-white/80 text-sky-ink " +
  "transition-shadow focus:outline-none focus:ring-2 focus:ring-sky-deep/45 cursor-pointer";

// ── TYPES ─────────────────────────────────────────────────────────────────────
interface SkyTableFilterBarProps<T extends Record<string, string>> {
  fields: FilterField[];
  /** Live filter state (from useTableFilters) — binds directly to input values */
  filters: T;
  onFilterChange: (key: keyof T & string, value: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────
/**
 * Sky-Pastel drop-in filter bar for any admin data table.
 *
 * Example — add a new filter in one config entry:
 *   { key: "status", label: "Status", type: "select", options: [
 *     { label: "Active",   value: "active"   },
 *     { label: "Inactive", value: "inactive" },
 *   ]}
 */
export function SkyTableFilterBar<T extends Record<string, string>>({
  fields,
  filters,
  onFilterChange,
  onClear,
  hasActiveFilters,
}: SkyTableFilterBarProps<T>) {
  return (
    <div className="flex flex-wrap items-end gap-3 px-5 py-4 border-b border-white/70 bg-white/40">
      {fields.map(field => (
        <div key={field.key} className="flex flex-col gap-1.5 min-w-[150px]">
          <label className={`${eyebrow} select-none`}>
            {field.label}
          </label>

          {field.type === "text" ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-ink-3 pointer-events-none w-3.5 h-3.5" />
              <input
                type="text"
                value={(filters[field.key] as string | undefined) ?? ""}
                onChange={e => onFilterChange(field.key, e.target.value)}
                placeholder={field.placeholder ?? `Filter ${field.label}…`}
                className={textInputCls}
              />
            </div>
          ) : (
            <select
              value={(filters[field.key] as string | undefined) ?? ""}
              onChange={e => onFilterChange(field.key, e.target.value)}
              className={selectCls}
            >
              <option value="">All</option>
              {field.options?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
        </div>
      ))}

      {/* Clear button — only visible when at least one filter is active.
          Clearing a filter is not destructive, so it stays a quiet glass chip
          that warms to rose ink on hover rather than shouting in red. */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1.5 self-end px-4 py-2 text-sm font-semibold rounded-sky-chip bg-white/65 ring-1 ring-white/85 text-sky-ink-2 shadow-sky-chip transition-colors hover:bg-white/90 hover:text-sky-rose-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-deep/45 whitespace-nowrap"
        >
          <X className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          Clear Filters
        </button>
      )}
    </div>
  );
}

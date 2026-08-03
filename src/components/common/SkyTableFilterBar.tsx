import { Search, X } from "lucide-react";
import type { FilterField } from "../../hooks/useTableFilters";

// ── STYLES ────────────────────────────────────────────────────────────────────
const textInputCls =
  "w-full pl-7 pr-3 py-[7px] text-sm font-medium rounded-sky-chip border border-sky-surf-border bg-white " +
  "focus:outline-none focus:border-sky-deep focus:ring-3 focus:ring-sky-deep/20 transition-all placeholder:text-sky-ink-3";

const selectCls =
  "w-full px-3 py-[7px] text-sm font-medium rounded-sky-chip border border-sky-surf-border bg-white " +
  "focus:outline-none focus:border-sky-deep focus:ring-3 focus:ring-sky-deep/20 transition-all cursor-pointer";

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
    <div className="flex flex-wrap items-end gap-3 px-5 py-4 border-b border-gray-200 bg-gray-50/60">
      {fields.map(field => (
        <div key={field.key} className="flex flex-col gap-1.5 min-w-37.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-sky-ink-3 select-none">
            {field.label}
          </label>

          {field.type === "text" ? (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sky-ink-3 pointer-events-none w-3 h-3" />
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

      {/* Clear button — only visible when at least one filter is active */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1.5 self-end px-4 py-[7px] text-sm font-bold rounded-sky-chip bg-error-100 text-error-700 hover:bg-error-200 transition-all whitespace-nowrap"
        >
          <X className="w-3 h-3" />
          Clear Filters
        </button>
      )}
    </div>
  );
}

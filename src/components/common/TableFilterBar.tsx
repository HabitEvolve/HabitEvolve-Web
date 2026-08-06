import type { FilterField } from "../../hooks/useTableFilters";

// ── STYLES ────────────────────────────────────────────────────────────────────
const fieldBase =
  "w-full py-[7px] text-sm rounded-sky-chip border border-white/80 bg-white/60 text-sky-ink transition " +
  "focus:outline-hidden focus:border-sky-deep focus:bg-white/85 focus:ring-3 focus:ring-sky-deep/18";

const textInputCls = `${fieldBase} pl-7 pr-3 placeholder:text-sky-ink-3`;
const selectCls = `${fieldBase} px-3 cursor-pointer`;

// ── TYPES ─────────────────────────────────────────────────────────────────────
interface TableFilterBarProps<T extends Record<string, string>> {
  fields: FilterField[];
  /** Live filter state (from useTableFilters) — binds directly to input values */
  filters: T;
  onFilterChange: (key: keyof T & string, value: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────
/**
 * Drop-in filter bar for any data table.
 *
 * Example — add a new filter in one config entry:
 *   { key: "status", label: "Status", type: "select", options: [
 *     { label: "Active",   value: "active"   },
 *     { label: "Inactive", value: "inactive" },
 *   ]}
 */
export function TableFilterBar<T extends Record<string, string>>({
  fields,
  filters,
  onFilterChange,
  onClear,
  hasActiveFilters,
}: TableFilterBarProps<T>) {
  return (
    <div className="flex flex-wrap items-end gap-3 px-5 py-4 border-b border-white/60 bg-white/35">
      {fields.map(field => (
        <div key={field.key} className="flex flex-col gap-1.5 min-w-[150px]">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-sky-ink-3 select-none">
            {field.label}
          </label>

          {field.type === "text" ? (
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sky-ink-3 pointer-events-none"
                width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
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
          Low-emphasis rose tint: it undoes work, but it isn't destructive. */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className={
            "inline-flex items-center gap-1.5 self-end px-4 py-[7px] text-sm font-medium " +
            "rounded-sky-chip bg-sky-rose/14 text-sky-rose-deep border border-sky-rose/30 " +
            "transition hover:bg-sky-rose/20 active:scale-[0.98] whitespace-nowrap"
          }
        >
          <svg
            width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Clear Filters
        </button>
      )}
    </div>
  );
}

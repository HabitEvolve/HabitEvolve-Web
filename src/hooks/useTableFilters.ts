import { useState, useEffect, useCallback, useRef } from "react";

// ── TYPES ─────────────────────────────────────────────────────────────────────

export type FilterFieldType = "text" | "select";

export interface FilterSelectOption {
  label: string;
  value: string;
}

/** One filter column descriptor. Drop into any table's fields array. */
export interface FilterField {
  key: string;
  label: string;
  type: FilterFieldType;
  placeholder?: string;
  /** Required when type === "select". Each option maps a display label to an API-compatible value string. */
  options?: FilterSelectOption[];
}

export interface UseTableFiltersReturn<T extends Record<string, string>> {
  /** Live filter state — bind to input values */
  filters: T;
  /** Debounced filter state — use in API calls and useCallback deps */
  debouncedFilters: T;
  setFilter: (key: keyof T & string, value: string) => void;
  /** Resets all filters AND page to their initial values instantly (no debounce delay) */
  clearFilters: () => void;
  /** True when any filter differs from its initial value */
  hasActiveFilters: boolean;
  page: number;
  setPage: (page: number) => void;
}

// ── HOOK ──────────────────────────────────────────────────────────────────────

/**
 * Manages filter state, debouncing, and pagination for a data table.
 *
 * Usage:
 *   const { filters, debouncedFilters, setFilter, clearFilters, hasActiveFilters, page, setPage }
 *     = useTableFilters({ search: "", status: "" });
 *
 * Pass `debouncedFilters` to your fetch useCallback deps + API call.
 * Pass `filters` to <TableFilterBar filters={...} />.
 * Page resets to 1 automatically whenever filters change.
 */
export function useTableFilters<T extends Record<string, string>>(
  initialFilters: T,
  debounceMs = 400
): UseTableFiltersReturn<T> {
  // Capture the initial value once so consumers don't need to memoize it.
  const initialRef = useRef<T>(initialFilters);

  const [filters, setFiltersState] = useState<T>(() => initialRef.current);
  const [debouncedFilters, setDebouncedFilters] = useState<T>(() => initialRef.current);
  const [page, setPageState] = useState(1);

  // Debounce: after the user stops changing filters, push to debouncedFilters and reset page.
  // React 18 batches both setState calls, so consumers see a single re-render with both new values.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
      setPageState(1);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [filters, debounceMs]);

  const setFilter = useCallback((key: keyof T & string, value: string) => {
    setFiltersState(prev => ({ ...prev, [key]: value }));
  }, []);

  // Clear bypasses the debounce so the table resets instantly.
  const clearFilters = useCallback(() => {
    const initial = initialRef.current;
    setFiltersState(initial);
    setDebouncedFilters(initial);
    setPageState(1);
  }, []);

  const setPage = useCallback((p: number) => setPageState(p), []);

  const hasActiveFilters = (Object.keys(initialRef.current) as Array<keyof T>).some(
    k => filters[k] !== initialRef.current[k]
  );

  return {
    filters,
    debouncedFilters,
    setFilter,
    clearFilters,
    hasActiveFilters,
    page,
    setPage,
  };
}

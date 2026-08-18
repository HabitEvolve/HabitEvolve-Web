import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Filter, Search, X } from 'lucide-react';
import type { FilterField } from '../../hooks/useTableFilters';

// Drop-in replacement for TableFilterBar/SkyTableFilterBar — same
// {fields, filters, onFilterChange, onClear, hasActiveFilters} contract from
// useTableFilters, but collapsed behind a single funnel button instead of
// leaving every field exposed inline on the toolbar.
interface FilterDropdownProps<T extends Record<string, string>> {
  fields: FilterField[];
  filters: T;
  onFilterChange: (key: keyof T & string, value: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  /** Aligns the panel's leading edge. Defaults to right-aligned (common toolbar placement). */
  align?: 'left' | 'right';
}

const eyebrow = 'text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3';

const textInputCls = [
  'w-full pl-8 pr-3 py-2 text-sm font-medium rounded-sky-chip bg-white/70 ring-1 ring-white/80 text-sky-ink',
  'transition-shadow focus:outline-none focus:ring-2 focus:ring-sky-deep/45 placeholder:text-sky-ink-3',
].join(' ');

const selectCls = [
  'w-full px-3 py-2 text-sm font-medium rounded-sky-chip bg-white/70 ring-1 ring-white/80 text-sky-ink',
  'transition-shadow focus:outline-none focus:ring-2 focus:ring-sky-deep/45 cursor-pointer',
].join(' ');

export function FilterDropdown<T extends Record<string, string>>({
  fields,
  filters,
  onFilterChange,
  onClear,
  hasActiveFilters,
  align = 'right',
}: FilterDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Panel is portaled to <body> and positioned via fixed coords computed from the
  // trigger button — every glass card on these pages uses backdrop-filter, which
  // establishes its own stacking context, so an absolutely-positioned panel nested
  // inside one card can render BEHIND a later sibling card no matter its z-index.
  // Portaling escapes that trap entirely instead of chasing z-index values.
  const [panelStyle, setPanelStyle] = useState<{ top: number; left?: number; right?: number } | null>(null);

  const reposition = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPanelStyle(
      align === 'right'
        ? { top: rect.bottom + 8, right: window.innerWidth - rect.right }
        : { top: rect.bottom + 8, left: rect.left }
    );
  };

  useEffect(() => {
    if (!open) return;
    reposition();

    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, align]);

  const activeCount = fields.filter(f => ((filters[f.key] as string | undefined) ?? '').length > 0).length;

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-sky-chip text-sm font-semibold ring-1 transition-colors whitespace-nowrap ${
          hasActiveFilters
            ? 'bg-sky-deep/12 ring-sky-deep/26 text-sky-deep'
            : 'bg-white/65 ring-white/85 text-sky-ink-2 hover:bg-white/85 hover:text-sky-ink'
        }`}
      >
        <Filter className="w-4 h-4 shrink-0" aria-hidden="true" />
        Filters
        {activeCount > 0 && (
          <span className="grid place-items-center min-w-[1.125rem] h-[1.125rem] rounded-full bg-sky-deep text-white text-[10px] font-bold tabular-nums px-1">
            {activeCount}
          </span>
        )}
      </button>

      {open && panelStyle && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: panelStyle.top, left: panelStyle.left, right: panelStyle.right }}
          className="sky-in z-50 w-72 rounded-sky-card bg-white/95 backdrop-blur-md ring-1 ring-white/85 shadow-sky-glass p-4 space-y-3.5"
        >
          {fields.map(field => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <label className={eyebrow}>{field.label}</label>
              {field.type === 'text' ? (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-ink-3 pointer-events-none w-3.5 h-3.5" aria-hidden="true" />
                  <input
                    type="text"
                    value={(filters[field.key] as string | undefined) ?? ''}
                    onChange={e => onFilterChange(field.key, e.target.value)}
                    placeholder={field.placeholder ?? `Filter ${field.label}…`}
                    className={textInputCls}
                  />
                </div>
              ) : (
                <select
                  value={(filters[field.key] as string | undefined) ?? ''}
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

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-sky-chip bg-white/70 ring-1 ring-white/85 text-sky-ink-2 transition-colors hover:bg-white/95 hover:text-sky-rose-deep"
            >
              <X className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Clear Filters
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

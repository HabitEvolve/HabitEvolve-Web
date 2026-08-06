import type { ReactNode } from 'react';

// Sky-Pastel page header, extracted from AdminDailyBossManagement's header block
// so every page shares one icon-chip + eyebrow/title/description + actions layout
// instead of each page re-implementing a near-duplicate.
export type PageHeaderTone = 'deep' | 'peach' | 'dmg' | 'violet' | 'teal' | 'rose' | 'neutral';

const TONE_ICON: Record<PageHeaderTone, string> = {
  deep:    'bg-sky-deep/12 ring-sky-deep/22 text-sky-deep',
  peach:   'bg-sky-peach/20 ring-sky-peach/32 text-sky-peach-deep',
  dmg:     'bg-sky-dmg/12 ring-sky-dmg/22 text-sky-dmg-deep',
  violet:  'bg-sky-violet/12 ring-sky-violet/22 text-sky-violet-deep',
  teal:    'bg-sky-teal-bg ring-sky-teal/26 text-sky-teal',
  rose:    'bg-sky-rose/12 ring-sky-rose/22 text-sky-rose-deep',
  neutral: 'bg-white/72 ring-white/85 text-sky-ink-2',
};

export interface PageHeaderProps {
  /** Small uppercase label above the title, e.g. "Game content". */
  eyebrow?: ReactNode;
  /** Page title — the one <h1> for the page. */
  title: ReactNode;
  /** One-line description under the title. */
  description?: ReactNode;
  /** Icon rendered inside the tinted chip on the left. Omit for pages with no icon. */
  icon?: ReactNode;
  /** Preset chip tint; ignored if `iconClassName` is given. */
  tone?: PageHeaderTone;
  /** Escape hatch for a chip tint not covered by `tone` (bg/ring/text classes). */
  iconClassName?: string;
  /** Title scale — most pages use h2; hub-style landing pages use h1. */
  size?: 'h1' | 'h2';
  /** Right-aligned content — buttons, toggles, badges, search. Wraps below on narrow screens. */
  actions?: ReactNode;
  className?: string;
}

export default function PageHeader({
  eyebrow,
  title,
  description,
  icon,
  tone = 'deep',
  iconClassName,
  size = 'h2',
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`sky-in flex items-center gap-4 flex-wrap ${className}`}>
      {icon && (
        <span className={`grid place-items-center w-12 h-12 shrink-0 rounded-sky-md ring-1 ${iconClassName ?? TONE_ICON[tone]}`}>
          {icon}
        </span>
      )}
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3">{eyebrow}</p>
        )}
        <h1 className={`font-display font-semibold leading-tight text-sky-ink ${size === 'h1' ? 'text-sky-h1' : 'text-sky-h2'}`}>
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 text-sm font-medium text-sky-ink-2">{description}</p>
        )}
      </div>
      {actions && (
        <div className="ml-auto flex items-center gap-3 flex-wrap">{actions}</div>
      )}
    </div>
  );
}

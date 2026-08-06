import {
  Check, Clock, Loader2, XCircle, Gavel, Trophy, Skull, MinusCircle,
  type LucideIcon,
} from 'lucide-react';

// Centralized lifecycle-status badge — one icon+color mapping so "Active",
// "Approved", "AiChecking", "Banned" etc. read identically everywhere,
// instead of each page redefining its own StatusBadge (see the ~10 local
// forks this replaces). Sky-Pastel tones only (src/index.css §STATUS BADGES).
export type StatusTone = 'success' | 'pending' | 'danger' | 'info' | 'neutral';

interface StatusConfig {
  tone: StatusTone;
  icon: LucideIcon;
  spin?: boolean;
}

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const STATUS_MAP: Record<string, StatusConfig> = {
  // success — teal
  active: { tone: 'success', icon: Check },
  approved: { tone: 'success', icon: Check },
  accepted: { tone: 'success', icon: Check },
  completed: { tone: 'success', icon: Check },
  published: { tone: 'success', icon: Check },
  success: { tone: 'success', icon: Check },
  defeated: { tone: 'success', icon: Trophy },

  // pending — peach
  pending: { tone: 'pending', icon: Clock },
  inprogress: { tone: 'pending', icon: Clock },
  submitted: { tone: 'pending', icon: Clock },
  draft: { tone: 'pending', icon: Clock },
  upcoming: { tone: 'pending', icon: Clock },
  notstarted: { tone: 'pending', icon: Clock },
  aichecking: { tone: 'pending', icon: Loader2, spin: true },

  // danger — rose
  rejected: { tone: 'danger', icon: XCircle },
  banned: { tone: 'danger', icon: XCircle },
  disbanded: { tone: 'danger', icon: XCircle },
  failed: { tone: 'danger', icon: XCircle },
  expired: { tone: 'danger', icon: XCircle },
  expiredautoapproved: { tone: 'danger', icon: XCircle },
  wipeout: { tone: 'danger', icon: Skull },

  // info — deep
  adminresolved: { tone: 'info', icon: Gavel },

  // neutral — ink
  deleted: { tone: 'neutral', icon: MinusCircle },
  archived: { tone: 'neutral', icon: MinusCircle },
};

const FALLBACK: StatusConfig = { tone: 'neutral', icon: MinusCircle };

export interface StatusBadgeProps {
  /** Raw status value, e.g. "Active", "AiChecking", "ADMIN_RESOLVED" — matched case/format-insensitively. */
  status: string;
  /** Display text, if different from the raw status (e.g. an i18n label). Defaults to `status`. */
  label?: string;
  /** Force a tone instead of the default lookup. */
  toneOverride?: StatusTone;
  /** Force an icon instead of the default lookup. */
  iconOverride?: LucideIcon;
  className?: string;
}

export default function StatusBadge({ status, label, toneOverride, iconOverride, className = '' }: StatusBadgeProps) {
  const cfg = STATUS_MAP[normalize(status)] ?? FALLBACK;
  const tone = toneOverride ?? cfg.tone;
  const Icon = iconOverride ?? cfg.icon;
  return (
    <span className={`sky-badge sky-badge-${tone} ${className}`}>
      <Icon className={`w-3 h-3 shrink-0 ${cfg.spin && !iconOverride ? 'animate-spin' : ''}`} aria-hidden="true" />
      {label ?? status}
    </span>
  );
}

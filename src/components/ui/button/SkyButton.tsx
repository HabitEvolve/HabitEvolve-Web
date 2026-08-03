import { ButtonHTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export type SkyButtonVariant = "primary" | "secondary" | "destructive" | "ghost" | "success";
export type SkyButtonSize = "default" | "sm" | "icon";

interface SkyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: SkyButtonVariant;
  size?: SkyButtonSize;
  className?: string;
}

// Radius/layout/transition are size-independent, so they stay in base rather
// than repeated per size step.
const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-sky-chip font-medium transition disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed";

const sizeClasses: Record<SkyButtonSize, string> = {
  default: "px-5 py-3.5 text-sm",
  sm: "px-3 py-2 text-sm",
  // Fixed square footprint for a single glyph child — no text-size utility
  // needed since icon buttons don't carry a text node.
  icon: "w-10 h-10 p-2 shrink-0",
};

// `sky-glass-fill` (index.css) bakes in rounded-sky-card (20px) — right for a
// hero/CTA card, wrong for a 14px button — so primary is composed from the
// raw sky-deep-lo/sky-deep/shadow-sky-fill tokens instead of that utility,
// keeping the button's own 14px radius intact.
const variantClasses: Record<SkyButtonVariant, string> = {
  primary: "bg-linear-to-br from-sky-deep-lo to-sky-deep text-white shadow-sky-fill hover:scale-[1.02]",
  secondary: "sky-glass-chip text-sky-ink hover:scale-[1.02]",
  destructive: "bg-sky-rose text-white shadow-sky-chip hover:scale-[1.02]",
  ghost: "bg-transparent text-sky-ink hover:bg-sky-surf",
  // Uses the app's existing --color-success-* scale (already used everywhere
  // else for approve/positive state — TX_META, badges, etc.) rather than a
  // parallel emerald-* reference, so "success" means the same green app-wide.
  success: "bg-success-500 text-white shadow-sky-chip hover:bg-success-600 hover:scale-[1.02]",
};

const SkyButton: React.FC<SkyButtonProps> = ({
  children,
  variant = "primary",
  size = "default",
  className,
  ...rest
}) => {
  return (
    <button
      className={clsx(twMerge(baseClasses, sizeClasses[size], variantClasses[variant], className))}
      {...rest}
    >
      {children}
    </button>
  );
};

export default SkyButton;

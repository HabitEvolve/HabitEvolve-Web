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

// Design-system §5. `primary` is composed from the raw sky-deep-lo/sky-deep/
// shadow-sky-fill tokens rather than the sky-glass-fill utility, because that
// utility bakes in the 26px card radius — right for a hero card, wrong for a
// 14px button.
const variantClasses: Record<SkyButtonVariant, string> = {
  primary: "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-fill sky-lift",
  secondary: "sky-glass-chip text-sky-deep sky-lift",
  // §5: "Nút phá huỷ: chữ roseDeep, nền rose 14% trên trắng" — a tinted
  // low-emphasis destructive, not a saturated red slab.
  destructive: "bg-sky-rose/14 text-sky-rose-deep border border-sky-rose/30 sky-lift",
  ghost: "bg-transparent text-sky-ink hover:bg-white/50",
  // TEAL, not green (§4). Same token the success badge uses, so "approved"
  // reads identically whether it's a button or a chip.
  success: "bg-sky-teal text-white shadow-sky-chip sky-lift",
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

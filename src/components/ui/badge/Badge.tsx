type BadgeVariant = "light" | "solid";
type BadgeSize = "sm" | "md";
type BadgeColor =
  | "primary"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "light"
  | "dark";

interface BadgeProps {
  variant?: BadgeVariant; // Light or solid variant
  size?: BadgeSize; // Badge size
  color?: BadgeColor; // Badge color
  startIcon?: React.ReactNode; // Icon at the start
  endIcon?: React.ReactNode; // Icon at the end
  children: React.ReactNode; // Badge content
}

const Badge: React.FC<BadgeProps> = ({
  variant = "light",
  color = "primary",
  size = "md",
  startIcon,
  endIcon,
  children,
}) => {
  const baseStyles =
    "inline-flex items-center px-2.5 py-0.5 justify-center gap-1 rounded-full font-medium";

  // Define size styles
  const sizeStyles = {
    sm: "text-theme-xs", // Smaller padding and font size
    md: "text-sm", // Default padding and font size
  };

  // Sky-Pastel status colours (design-system §5). The mapping is the contract:
  //   success/approved/valid → teal   (NEVER green — §4's repeat-offender rule)
  //   warning/pending        → peach
  //   primary/info           → deep
  //   error/destructive      → rose
  //   light/neutral/expired  → ink
  // Text always uses the *-deep member of a pair; the pastel tint is background
  // only (§7: "Pastel nền không bao giờ làm màu chữ").
  const variants = {
    light: {
      primary: "bg-sky-deep/12 text-sky-deep",
      success: "bg-sky-teal-bg text-sky-teal",
      error: "bg-sky-rose/16 text-sky-rose-deep",
      warning: "bg-sky-peach/22 text-sky-peach-deep",
      info: "bg-sky-deep/12 text-sky-deep",
      light: "bg-sky-ink/7 text-sky-ink-2",
      dark: "bg-sky-ink text-white",
    },
    solid: {
      primary: "bg-sky-deep text-white",
      success: "bg-sky-teal text-white",
      error: "bg-sky-rose text-white",
      warning: "bg-sky-peach text-sky-ink",
      info: "bg-sky-deep-lo text-white",
      light: "bg-sky-ink-3 text-white",
      dark: "bg-sky-ink text-white",
    },
  };

  // Get styles based on size and color variant
  const sizeClass = sizeStyles[size];
  const colorStyles = variants[variant][color];

  return (
    <span className={`${baseStyles} ${sizeClass} ${colorStyles}`}>
      {startIcon && <span className="mr-1">{startIcon}</span>}
      {children}
      {endIcon && <span className="ml-1">{endIcon}</span>}
    </span>
  );
};

export default Badge;

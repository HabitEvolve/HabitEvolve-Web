import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  size?: "sm" | "md";
  variant?: "primary" | "outline" | "game" | "game-outline";
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  onClick,
  className = "",
  disabled = false,
}) => {
  // Size Classes
  const sizeClasses = {
    sm: "px-4 py-3 text-sm",
    md: "px-5 py-3.5 text-sm",
  };

  // Sky-Pastel button variants (design-system §5).
  //   primary   → deep gradient + deep-tinted glow, white text
  //   outline   → glass chip, deep border, deep text
  //   game/-outline → legacy names kept so existing call-sites keep compiling;
  //                   both now resolve to the Sky-Pastel primary/secondary
  //                   treatments instead of neo-brutalism hard-shadow buttons.
  const variantClasses = {
    primary:
      "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-fill sky-lift disabled:opacity-50",
    outline:
      "sky-glass-chip text-sky-deep sky-lift",
    game:
      "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-fill sky-lift",
    "game-outline":
      "sky-glass-chip text-sky-deep sky-lift",
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-sky-chip font-medium transition ${className} ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      {startIcon && <span className="flex items-center">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </button>
  );
};

export default Button;

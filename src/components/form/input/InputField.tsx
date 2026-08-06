import type React from "react";
import type { FC } from "react";

interface InputProps {
  type?: "text" | "number" | "email" | "password" | "date" | "time" | string;
  id?: string;
  name?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  min?: string;
  max?: string;
  step?: number;
  disabled?: boolean;
  success?: boolean;
  error?: boolean;
  hint?: string;
}

const Input: FC<InputProps> = ({
  type = "text",
  id,
  name,
  placeholder,
  value,
  onChange,
  className = "",
  min,
  max,
  step,
  disabled = false,
  success = false,
  error = false,
  hint,
}) => {
  // Sky-Pastel field (design-system §5: glass fill, deep focus ring, ink2
  // label). State is never colour-only — error/success also change the hint
  // text, which stays rendered below the field.
  let inputClasses = ` h-11 w-full rounded-sky-chip border appearance-none px-4 py-2.5 text-sm transition placeholder:text-sky-ink-3 focus:outline-hidden focus:ring-3 ${className}`;

  if (disabled) {
    inputClasses += ` text-sky-ink-3 border-sky-ink/12 bg-sky-ink/5 opacity-50 cursor-not-allowed`;
  } else if (error) {
    inputClasses += ` bg-white/60 text-sky-ink border-sky-rose focus:border-sky-rose focus:ring-sky-rose/20`;
  } else if (success) {
    // TEAL for success (§4) — never green.
    inputClasses += ` bg-white/60 text-sky-ink border-sky-teal focus:border-sky-teal focus:ring-sky-teal/20`;
  } else {
    inputClasses += ` bg-white/60 text-sky-ink border-white/80 focus:border-sky-deep focus:ring-sky-deep/18`;
  }

  return (
    <div className="relative">
      <input
        type={type}
        id={id}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={inputClasses}
      />

      {hint && (
        <p
          className={`mt-1.5 text-xs ${
            error
              ? "text-sky-rose-deep"
              : success
              ? "text-sky-teal"
              : "text-sky-ink-2"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
};

export default Input;

import { useState } from "react";

interface SwitchProps {
  label: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  color?: "blue" | "gray"; // Added prop to toggle color theme
}

const Switch: React.FC<SwitchProps> = ({
  label,
  defaultChecked = false,
  disabled = false,
  onChange,
  color = "blue", // Default to blue color
}) => {
  const [isChecked, setIsChecked] = useState(defaultChecked);

  const handleToggle = () => {
    if (disabled) return;
    const newCheckedState = !isChecked;
    setIsChecked(newCheckedState);
    if (onChange) {
      onChange(newCheckedState);
    }
  };

  // "blue" / "gray" are the legacy prop values; both now map to Sky-Pastel
  // tokens (deep blue for the primary switch, ink for the neutral one).
  const switchColors =
    color === "blue"
      ? {
          background: isChecked ? "bg-sky-deep" : "bg-sky-ink/15",
          knob: isChecked
            ? "translate-x-full bg-white"
            : "translate-x-0 bg-white",
        }
      : {
          background: isChecked ? "bg-sky-ink" : "bg-sky-ink/15",
          knob: isChecked
            ? "translate-x-full bg-white"
            : "translate-x-0 bg-white",
        };

  return (
    <label
      className={`flex cursor-pointer select-none items-center gap-3 text-sm font-medium ${
        disabled ? "text-sky-ink-3" : "text-sky-ink-2"
      }`}
      onClick={handleToggle} // Toggle when the label itself is clicked
    >
      <div className="relative">
        <div
          className={`block transition duration-150 ease-linear h-6 w-11 rounded-full ring-1 ring-white/70 ${
            disabled ? "bg-sky-ink/10 pointer-events-none" : switchColors.background
          }`}
        ></div>
        {/* The knob carries a navy-tinted shadow so it reads as physically
            raised off the track — the one place a hard edge would flatten it. */}
        <div
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full shadow-sky-chip duration-150 ease-linear transform ${switchColors.knob}`}
        ></div>
      </div>
      {label}
    </label>
  );
};

export default Switch;

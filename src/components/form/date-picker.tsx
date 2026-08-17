import { useEffect } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import Label from "./Label";
import { CalenderIcon } from "../../icons";
import Hook = flatpickr.Options.Hook;
import DateOption = flatpickr.Options.DateOption;

type PropsType = {
  id: string;
  mode?: "single" | "multiple" | "range" | "time";
  onChange?: Hook | Hook[];
  defaultDate?: DateOption | DateOption[];
  label?: string;
  placeholder?: string;
};

export default function DatePicker({
  id,
  mode,
  onChange,
  label,
  defaultDate,
  placeholder,
}: PropsType) {
  useEffect(() => {
    const flatPickr = flatpickr(`#${id}`, {
      mode: mode || "single",
      // `static: true` keeps the calendar DOM-nested near the input instead of appended to
      // <body>, which traps its z-index inside whatever local stacking context the input
      // happens to sit in — e.g. PageHeader's `sky-in` entrance animation leaves a permanent
      // `transform: translateY(0)` (animation-fill-mode: both) that creates one, so any
      // sibling section painted later in the DOM (like the dashboard's card grid) covers the
      // calendar regardless of its own z-index. Default (non-static) mode appends the
      // calendar straight to <body>, escaping that trap entirely.
      monthSelectorType: "static",
      dateFormat: "Y-m-d",
      defaultDate,
      onChange,
    });

    return () => {
      if (!Array.isArray(flatPickr)) {
        flatPickr.destroy();
      }
    };
  }, [mode, onChange, id, defaultDate]);

  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}

      <div className="relative">
        <input
          id={id}
          placeholder={placeholder}
          // pr-11 (not px-4 on both sides) — the icon sits at right-3 and is size-6
          // (24px), so it occupies roughly the last 2.25rem of the box. With only
          // 1rem of right padding a full "YYYY-MM-DD to YYYY-MM-DD" range renders
          // straight under it; reserving pr-11 keeps the text clear of the icon.
          className="h-11 w-full rounded-sky-chip border appearance-none pl-4 pr-11 py-2.5 text-sm transition placeholder:text-sky-ink-3 focus:outline-hidden focus:ring-3 bg-white/60 text-sky-ink border-white/80 focus:border-sky-deep focus:ring-sky-deep/18"
        />

        <span className="absolute text-sky-ink-2 -translate-y-1/2 pointer-events-none right-3 top-1/2">
          <CalenderIcon className="size-6" />
        </span>
      </div>
    </div>
  );
}

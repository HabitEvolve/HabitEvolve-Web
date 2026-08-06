import { useState } from "react";

// Sky-Pastel segmented control (design-system §5: "Segmented/Tabs → thanh kính,
// pill active gradient deep"). Presentation only — the `selected` state and the
// three option keys are unchanged.
const ChartTab: React.FC = () => {
  const [selected, setSelected] = useState<
    "optionOne" | "optionTwo" | "optionThree"
  >("optionOne");

  const getButtonClass = (option: "optionOne" | "optionTwo" | "optionThree") =>
    selected === option
      ? "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-fill"
      : "text-sky-ink-2 hover:text-sky-ink hover:bg-white/50";

  return (
    <div className="flex items-center gap-0.5 rounded-sky-sm sky-glass-chip p-1">
      <button
        onClick={() => setSelected("optionOne")}
        className={`px-3 py-2 font-medium w-full rounded-sky-chip text-theme-sm transition ${getButtonClass(
          "optionOne"
        )}`}
      >
        Monthly
      </button>

      <button
        onClick={() => setSelected("optionTwo")}
        className={`px-3 py-2 font-medium w-full rounded-sky-chip text-theme-sm transition ${getButtonClass(
          "optionTwo"
        )}`}
      >
        Quarterly
      </button>

      <button
        onClick={() => setSelected("optionThree")}
        className={`px-3 py-2 font-medium w-full rounded-sky-chip text-theme-sm transition ${getButtonClass(
          "optionThree"
        )}`}
      >
        Annually
      </button>
    </div>
  );
};

export default ChartTab;

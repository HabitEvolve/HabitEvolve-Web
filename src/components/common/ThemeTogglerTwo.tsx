import { Moon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";

// The floating variant of the same control — see ThemeToggleButton for why it
// ships disabled. At 56px it is large enough to carry the deep gradient the
// primary action uses everywhere else, so the shape still reads as a real
// affordance rather than a grey puck, just dimmed until dark mode lands.
export default function ThemeTogglerTwo() {
  const { t } = useTranslation();
  const { toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      disabled
      aria-label={t("header.themeDisabledAdmin")}
      title={t("header.themeDisabledAdmin")}
      className="inline-flex items-center justify-center size-14 rounded-full bg-linear-to-b from-sky-deep-lo to-sky-deep text-white ring-1 ring-sky-deep/30 shadow-[0_10px_24px_-10px_rgba(36,52,77,0.55)] opacity-40 cursor-not-allowed"
    >
      <Moon className="w-5 h-5" strokeWidth={2.2} aria-hidden="true" />
    </button>
  );
}

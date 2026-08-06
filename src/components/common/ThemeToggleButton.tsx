import { Moon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";

// Disabled, not hidden — same call the Admin console and Mentor portal headers
// already make (see AppHeader / MentorHeader). Sky-Pastel has no dark-mode
// tokens yet and both layouts force the light theme, so a live toggle would
// visibly do nothing; a dimmed chip with a tooltip reads as "not yet
// available", where removing the button would just look like a gap in the row.
// The onClick handler stays wired so re-enabling is a one-word change.
export const ThemeToggleButton: React.FC = () => {
  const { t } = useTranslation();
  const { toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      disabled
      aria-label={t("header.themeDisabledAdmin")}
      title={t("header.themeDisabledAdmin")}
      className="relative flex items-center justify-center h-11 w-11 shrink-0 rounded-full bg-white/65 ring-1 ring-white/85 text-sky-ink-2 shadow-sky-chip opacity-40 cursor-not-allowed"
    >
      <Moon className="w-5 h-5" strokeWidth={2.2} aria-hidden="true" />
    </button>
  );
};

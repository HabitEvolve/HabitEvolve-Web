import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useSidebar } from "../context/SidebarContext";
import { useTheme } from "../context/ThemeContext";
import UserDropdown from "../components/header/UserDropdown";
import LanguageToggle from "../components/common/LanguageToggle";
import AdminGlobalSearch from "../components/header/AdminGlobalSearch";

const HamburgerIcon = () => (
  <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 1H18M0 7H18M0 13H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const AppHeader: React.FC = () => {
  const { t } = useTranslation();
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const { toggleSidebar, toggleMobileSidebar } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const searchRef = useRef<{ focus: () => void }>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleBtnClass =
    "flex items-center justify-center w-10 h-10 bg-white dark:bg-gray-800 border-4 border-black dark:border-gray-600 rounded-xl shadow-[3px_3px_0_0_#1A1D20] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#1A1D20] transition-all text-gray-800 dark:text-gray-200";

  return (
    <header className="sticky top-0 flex w-full bg-white dark:bg-gray-900 border-b-4 border-black dark:border-gray-700 shadow-[0px_4px_0px_0px_#1A1D20] z-40">
      <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">

        {/* ── PRIMARY ROW ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between w-full gap-2 px-4 py-3 lg:px-0 lg:py-4">

          {/* LEFT: hamburger toggles + mobile logo + desktop search */}
          <div className="flex items-center gap-3">

            {/* Desktop: collapses/expands sidebar in-place */}
            <button
              onClick={toggleSidebar}
              aria-label={t("header.toggleSidebar")}
              className={`hidden lg:flex ${toggleBtnClass}`}
            >
              <HamburgerIcon />
            </button>

            {/* Mobile: opens sidebar as overlay */}
            <button
              onClick={toggleMobileSidebar}
              aria-label={t("header.openSidebar")}
              className={`lg:hidden flex ${toggleBtnClass}`}
            >
              <HamburgerIcon />
            </button>

            {/* Mobile-only logo */}
            <Link to="/" className="lg:hidden">
              <img className="dark:hidden" src="./images/logo/logo.svg" alt="Logo" />
              <img className="hidden dark:block" src="./images/logo/logo-dark.svg" alt="Logo" />
            </Link>

            {/* Desktop search bar */}
            <div className="hidden lg:block w-85 xl:w-107.5">
              <AdminGlobalSearch ref={searchRef} shortcutHint="⌘K" />
            </div>
          </div>

          {/* RIGHT: dark mode toggle + mobile three-dots + desktop notifications/user */}
          <div className="flex items-center gap-2">

            {/* Language toggle — always visible */}
            <LanguageToggle />

            {/* Dark / Light mode toggle — always visible */}
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? t("header.switchToLight") : t("header.switchToDark")}
              className={toggleBtnClass}
            >
              {theme === "dark" ? (
                /* Sun */
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                /* Moon */
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>

            {/* Mobile: three-dots expands header notification area */}
            <button
              onClick={() => setApplicationMenuOpen(!isApplicationMenuOpen)}
              aria-label={t("header.openMenu")}
              className={`lg:hidden flex ${toggleBtnClass} border-2`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2.2" />
                <circle cx="12" cy="12" r="2.2" />
                <circle cx="19" cy="12" r="2.2" />
              </svg>
            </button>

            {/* Desktop: user dropdown */}
            <div className="hidden lg:flex items-center gap-3">
              <UserDropdown />
            </div>
          </div>
        </div>

        {/* ── MOBILE EXPANDED SECTION ──────────────────────────────────────── */}
        <div
          className={`${isApplicationMenuOpen ? "flex" : "hidden"
            } lg:hidden items-center gap-3 w-full px-4 pb-3 border-t-2 border-dashed border-gray-200 dark:border-gray-700 pt-3`}
        >
          <UserDropdown />
        </div>

      </div>
    </header>
  );
};

export default AppHeader;

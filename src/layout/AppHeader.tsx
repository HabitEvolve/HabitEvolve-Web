import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useSidebar } from "../context/SidebarContext";
import UserDropdown from "../components/header/UserDropdown";
import LanguageToggle from "../components/common/LanguageToggle";
import AdminGlobalSearch from "../components/header/AdminGlobalSearch";
import SkyButton from "../components/ui/button/SkyButton";

const HamburgerIcon = () => (
  <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 1H18M0 7H18M0 13H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const AppHeader: React.FC = () => {
  const { t } = useTranslation();
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const { toggleSidebar, toggleMobileSidebar } = useSidebar();
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

  return (
    // Glass chrome composed directly rather than via .sky-glass-admin: that
    // utility bakes in a card radius + all-sides border meant for floating
    // panels, which is the wrong shape for a flush, edge-to-edge sticky bar.
    // Same language (§5 glass header), applied to a header shape.
    <header className="sticky top-0 flex w-full bg-white/55 backdrop-blur-[18px] backdrop-saturate-150 border-b border-white/70 shadow-[0_10px_24px_-18px_rgba(36,52,77,0.30)] z-40">
      <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">

        {/* ── PRIMARY ROW ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between w-full gap-2 px-4 py-3 lg:px-0 lg:py-4">

          {/* LEFT: hamburger toggles + mobile logo + desktop search */}
          <div className="flex items-center gap-3">

            {/* Desktop: collapses/expands sidebar in-place */}
            <SkyButton
              type="button"
              variant="secondary"
              size="icon"
              onClick={toggleSidebar}
              aria-label={t("header.toggleSidebar")}
              className="hidden lg:flex"
            >
              <HamburgerIcon />
            </SkyButton>

            {/* Mobile: opens sidebar as overlay */}
            <SkyButton
              type="button"
              variant="secondary"
              size="icon"
              onClick={toggleMobileSidebar}
              aria-label={t("header.openSidebar")}
              className="lg:hidden flex"
            >
              <HamburgerIcon />
            </SkyButton>

            {/* Mobile-only logo */}
            <Link to="/" className="lg:hidden">
              <img
                src="https://saiseocacvyfegzkewop.supabase.co/storage/v1/object/public/image/icon%20(1).png"
                alt="HabitEvolve"
                className="h-8 w-8 object-contain"
              />
            </Link>

            {/* Desktop search bar */}
            <div className="hidden lg:block w-85 xl:w-107.5">
              <AdminGlobalSearch ref={searchRef} shortcutHint="Search" />
            </div>
          </div>

          {/* RIGHT: mobile three-dots + desktop notifications/user */}
          <div className="flex items-center gap-2">

            {/* Language toggle — always visible */}
            <LanguageToggle />

            {/* Dark/light toggle disabled, not hidden: Sky-Pastel has no
                dark-mode tokens yet (see AppLayout's forced-light effect),
                so toggling here would visibly do nothing. */}
            {/* <SkyButton
              type="button"
              variant="secondary"
              size="icon"
              disabled
              aria-label={t("header.themeDisabledAdmin")}
              title={t("header.themeDisabledAdmin")}
              className="opacity-40 cursor-not-allowed"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </SkyButton> */}

            {/* Mobile: three-dots expands header notification area */}
            <SkyButton
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => setApplicationMenuOpen(!isApplicationMenuOpen)}
              aria-label={t("header.openMenu")}
              className="lg:hidden flex"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2.2" />
                <circle cx="12" cy="12" r="2.2" />
                <circle cx="19" cy="12" r="2.2" />
              </svg>
            </SkyButton>

            {/* Desktop: user dropdown */}
            <div className="hidden lg:flex items-center gap-3">
              <UserDropdown />
            </div>
          </div>
        </div>

        {/* ── MOBILE EXPANDED SECTION ──────────────────────────────────────── */}
        <div
          className={`${isApplicationMenuOpen ? "flex" : "hidden"
            } lg:hidden items-center gap-3 w-full px-4 pb-3 border-t border-dashed border-sky-ink/15 pt-3`}
        >
          <UserDropdown />
        </div>

      </div>
    </header>
  );
};

export default AppHeader;

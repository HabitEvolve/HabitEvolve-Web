import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext";
import UserDropdown from "../components/header/UserDropdown";
import LanguageToggle from "../components/common/LanguageToggle";
import mentorApi from "../api/mentorApi";

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
// Same "Guild Command Center" neo-brutalism system used across the Mentor
// portal this session: tinted ink (game-outline / brand-300 in dark) instead
// of pure black, so the ribbon reads consistently with the party workspace.
const inkBorder = "border-game-outline dark:border-brand-300";
const shadowSm = "shadow-[2px_2px_0_0_var(--color-game-outline)] dark:shadow-[2px_2px_0_0_var(--color-brand-300)]";
const shadowMd = "shadow-[3px_3px_0_0_var(--color-game-outline)] dark:shadow-[3px_3px_0_0_var(--color-brand-300)]";
const shadowLg = "shadow-[5px_5px_0_0_var(--color-game-outline)] dark:shadow-[5px_5px_0_0_var(--color-brand-300)]";
const hoverInkBorder = "hover:border-game-outline dark:hover:border-brand-300";
const easeExpo = "ease-[cubic-bezier(0.16,1,0.3,1)]";

// Center nav + its toggles only appear from `xl:` up. At `lg:` the right
// cluster (gem chip + language + theme + user dropdown w/ name) realistically
// runs ~400px wide, which would collide with an absolutely-centered nav —
// so the breakpoint is pushed out one step to guarantee no overlap, and the
// hamburger overlay covers everything below it instead.
const NAV_ITEMS = [
  { to: "/mentor/dashboard", labelKey: "nav.mentor.dashboard", icon: "/icon/Main/House/64px/Green House 1st 64px.png" },
  { to: "/mentor/parties", labelKey: "nav.mentor.myParties", icon: "/icon/Player/Friend/64px/Friend 1st 64px.png" },
  { to: "/mentor/wallet", labelKey: "nav.mentor.wallet", icon: "/icon/Currency/Premium/64px/Premium 1st 64px.png" },
] as const;

const pillBase =
  `inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-lg font-extrabold whitespace-nowrap ` +
  `transition-all duration-150 ${easeExpo}`;

const HamburgerIcon = ({ open }: { open: boolean }) => (
  <svg width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    {open ? (
      <path d="M1 1L19 15M19 1L1 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    ) : (
      <path d="M0 1H20M0 8H20M0 15H20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    )}
  </svg>
);

const GemBalance = () => {
  const [gems, setGems] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    mentorApi.getWallet().then((res) => {
      if (!cancelled && res.success && res.data) setGems(res.data.gemsBalance);
    });
    return () => { cancelled = true; };
  }, []);

  if (gems === null) return null;

  return (
    <Link
      to="/mentor/wallet"
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-gray-25 dark:bg-gray-800 border-[3px] ${inkBorder} ${shadowSm} hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all duration-150 ${easeExpo}`}
    >
      <img src="/icon/Currency/Diamond/64px/Purple Diamond 1st 64px.png" alt="" className="w-5 h-5 object-contain" />
      <span className="text-sm font-black text-gray-900 dark:text-white">{gems.toLocaleString()}</span>
    </Link>
  );
};

const ThemeToggleInline = () => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? t("header.switchToLight") : t("header.switchToDark")}
      className={`flex items-center justify-center w-10 h-10 shrink-0 bg-gray-25 dark:bg-gray-800 border-[3px] ${inkBorder} rounded-xl ${shadowSm} hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all duration-150 ${easeExpo} text-gray-800 dark:text-gray-200`}
    >
      {theme === "dark" ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
          <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
};

const MentorHeader: React.FC = () => {
  const { t } = useTranslation();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <header className={`sticky top-0 z-40 flex items-center justify-between h-24 w-full px-4 sm:px-6 bg-white dark:bg-gray-900 border-b-4 ${inkBorder}`}>
      {/* LEFT — logo + mascot, stable width so it never shrinks when the center/right clusters grow */}
      <Link to="/mentor/dashboard" className="flex items-center gap-4 min-w-44 sm:min-w-60 shrink-0">
        <img className="h-16 w-auto dark:hidden" src="https://saiseocacvyfegzkewop.supabase.co/storage/v1/object/public/image/icon%20(1).png" alt="HabitEvolve" />
        <img className="hidden h-16 w-auto dark:block" src="https://saiseocacvyfegzkewop.supabase.co/storage/v1/object/public/image/icon%20(1).png" alt="HabitEvolve" />
        <span className="hidden sm:block text-2xl font-black tracking-tight text-gray-900 dark:text-white leading-none">
          HabitEvolve
        </span>
      </Link>

      {/* CENTER — 3 chunky pill nav links, absolutely centered so left/right weight can't push them off-axis */}
      <nav
        className="hidden xl:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-x-6"
        aria-label={t("nav.mentor.myParties")}
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                pillBase,
                isActive
                  ? `bg-brand-200 dark:bg-brand-500/30 border-4 ${inkBorder} ${shadowLg} text-gray-900 dark:text-white hover:-translate-y-0.5`
                  : `border-2 border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-4 ${hoverInkBorder}`,
              ].join(" ")
            }
          >
            <img src={item.icon} alt="" className="w-6 h-6 object-contain" />
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>

      {/* RIGHT — wallet, theme, language, user; hamburger below xl */}
      <div className="flex items-center gap-x-3 min-w-40 sm:min-w-45 justify-end shrink-0">
        <div className="hidden sm:block">
          <GemBalance />
        </div>
        <div className="hidden xl:flex items-center gap-x-3">
          <LanguageToggle />
          <ThemeToggleInline />
        </div>
        <UserDropdown />

        <button
          onClick={() => setNavOpen((v) => !v)}
          aria-label={navOpen ? t("header.closeNav") : t("header.openNav")}
          aria-expanded={navOpen}
          className={`xl:hidden flex items-center justify-center w-10 h-10 shrink-0 bg-gray-25 dark:bg-gray-800 border-[3px] ${inkBorder} rounded-xl ${shadowSm} text-gray-800 dark:text-gray-200`}
        >
          <HamburgerIcon open={navOpen} />
        </button>
      </div>

      {/* MOBILE/TABLET OVERLAY — slide-down panel with nav links + toggles */}
      {navOpen && (
        <>
          <div
            className="fixed inset-0 top-24 bg-game-outline/50 z-30 xl:hidden"
            onClick={() => setNavOpen(false)}
          />
          <div
            className={`nav-overlay-in xl:hidden absolute top-full left-0 z-40 w-full bg-white dark:bg-gray-900 border-b-4 ${inkBorder} px-4 py-4 space-y-2`}
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setNavOpen(false)}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-base font-black border-[3px]",
                    `transition-all duration-150 ${easeExpo}`,
                    isActive
                      ? `bg-brand-200 dark:bg-brand-500/30 ${inkBorder} ${shadowMd} text-gray-900 dark:text-white`
                      : `border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800`,
                  ].join(" ")
                }
              >
                <img src={item.icon} alt="" className="w-6 h-6 object-contain" />
                {t(item.labelKey)}
              </NavLink>
            ))}
            <div className="flex items-center gap-2 pt-2 sm:hidden">
              <GemBalance />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <LanguageToggle />
              <ThemeToggleInline />
            </div>
          </div>
        </>
      )}
    </header>
  );
};

export default MentorHeader;

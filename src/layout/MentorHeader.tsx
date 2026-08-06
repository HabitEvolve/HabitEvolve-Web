import { useState } from "react";
import { Link, NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Users, Wallet, Menu, X, Moon } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import UserDropdown from "../components/header/UserDropdown";
import LanguageToggle from "../components/common/LanguageToggle";

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
// Sky-Pastel (design-system §5). Neo-brutalism's hard offset shadows and 3–5px
// ink borders are retired (§7); the ribbon is now glass with hairline white
// borders and soft navy shadows. Mentor identity comes from the violet active
// pill, mirroring how the Admin sidebar uses the deep-blue one.
const chipBase =
  "border border-white/80 bg-white/55 backdrop-blur-[14px] shadow-sky-chip";
const easeExpo = "ease-[cubic-bezier(0.16,1,0.3,1)]";

// Center nav + its toggles appear from `lg:` up. They used to wait for `xl:`,
// which left 1024–1279px hiding the three primary destinations behind a
// hamburger on a screen with room to spare. The pills tighten (smaller text,
// less padding, smaller gap) below `xl:` so all three still clear the right
// cluster at 1024px instead of colliding with it.
// Icons are lucide line glyphs, not the 64px pixel-art PNGs: at the 22px these
// pills render they turned to mush, and the crisp stroke reads far better next
// to Bricolage. The game art stays where it can be shown large.
const NAV_ITEMS = [
  { to: "/mentor/dashboard", labelKey: "nav.mentor.dashboard", Icon: LayoutDashboard },
  { to: "/mentor/parties", labelKey: "nav.mentor.myParties", Icon: Users },
  { to: "/mentor/wallet", labelKey: "nav.mentor.wallet", Icon: Wallet },
] as const;

const pillBase =
  `group relative inline-flex items-center gap-2 px-4 xl:px-6 py-2.5 rounded-sky-sm text-base xl:text-lg font-semibold whitespace-nowrap ` +
  `transition-all duration-150 ${easeExpo}`;

const GemBalance = () => {
  // Shared with the Wallet page via WalletContext — one fetch, both places update
  // together instead of each holding its own independent (and easily stale) copy.
  const { wallet } = useWallet();

  if (wallet === null) return null;

  return (
    <Link
      to="/mentor/wallet"
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full ${chipBase} sky-lift transition-all duration-150 ${easeExpo}`}
    >
      {/* The gem stays pixel art: it's the same brand asset the mobile app and
          the Wallet page use, and currency should look identical everywhere. */}
      <img src="/icon/Currency/Diamond/64px/Purple Diamond 1st 64px.png" alt="" className="w-5 h-5 object-contain" />
      <span className="font-display text-sm font-semibold text-sky-ink tabular-nums">
        {wallet.gemsBalance.toLocaleString()}
      </span>
    </Link>
  );
};

// Disabled, not hidden: Sky-Pastel has no dark-mode tokens yet (see
// MentorLayout's forced-light override), so toggling here would visibly do
// nothing — a disabled control with an explanatory tooltip reads as
// "not yet available", where hiding it would just look like a missing button.
const ThemeToggleInline = () => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      disabled
      aria-label={t("header.themeDisabledMentor")}
      title={t("header.themeDisabledMentor")}
      className={`flex items-center justify-center w-10 h-10 shrink-0 ${chipBase} rounded-sky-sm opacity-40 cursor-not-allowed text-sky-ink-2`}
    >
      <Moon className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
    </button>
  );
};

const MentorHeader: React.FC = () => {
  const { t } = useTranslation();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-24 w-full px-4 sm:px-6 border-b border-white/70 bg-white/45 backdrop-blur-[18px] backdrop-saturate-150 shadow-[0_10px_24px_-18px_rgba(36,52,77,0.30)]">
      {/* LEFT — logo + mascot, stable width so it never shrinks when the center/right clusters grow */}
      <Link to="/mentor/dashboard" className="flex items-center gap-4 min-w-44 sm:min-w-60 shrink-0">
        <img className="h-16 w-auto" src="https://saiseocacvyfegzkewop.supabase.co/storage/v1/object/public/image/icon%20(1).png" alt="HabitEvolve" />
        <span className="hidden sm:block font-display text-2xl font-semibold tracking-tight text-sky-ink leading-none">
          HabitEvolve
        </span>
      </Link>

      {/* CENTER — 3 chunky pill nav links, absolutely centered so left/right weight can't push them off-axis */}
      <nav
        className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-x-2 xl:gap-x-6"
        aria-label={t("nav.mentor.myParties")}
      >
        {NAV_ITEMS.map(({ to, labelKey, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                pillBase,
                isActive
                  ? `bg-linear-to-b from-sky-violet to-sky-violet-deep text-white shadow-sky-fill ring-1 ring-inset ring-white/25`
                  : `text-sky-ink-2 hover:bg-white/55 hover:text-sky-ink motion-safe:hover:-translate-y-px active:translate-y-0`,
              ].join(" ")
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={`w-5 h-5 shrink-0 transition-colors duration-150 ${isActive ? "text-white" : "text-sky-ink-3 group-hover:text-sky-violet"}`}
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
                {t(labelKey)}
                {/* Third cue past fill + weight: a short underline pinned under
                    the live section, so the current page survives without hue. */}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-6 right-6 bottom-1.5 h-0.5 rounded-full bg-white/55"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* RIGHT — wallet, theme, language, user; hamburger below xl */}
      <div className="flex items-center gap-x-3 min-w-40 sm:min-w-45 justify-end shrink-0">
        <div className="hidden sm:block">
          <GemBalance />
        </div>
        <div className="hidden lg:flex items-center gap-x-3">
          <LanguageToggle />
          <ThemeToggleInline />
        </div>
        <UserDropdown />

        <button
          onClick={() => setNavOpen((v) => !v)}
          aria-label={navOpen ? t("header.closeNav") : t("header.openNav")}
          aria-expanded={navOpen}
          className={`lg:hidden flex items-center justify-center w-10 h-10 shrink-0 ${chipBase} rounded-sky-sm text-sky-ink-2 hover:text-sky-ink active:scale-95 transition-all duration-150 ${easeExpo}`}
        >
          {navOpen
            ? <X className="w-5 h-5" strokeWidth={2.4} aria-hidden="true" />
            : <Menu className="w-5 h-5" strokeWidth={2.4} aria-hidden="true" />}
        </button>
      </div>

      {/* MOBILE/TABLET OVERLAY — slide-down panel with nav links + toggles */}
      {navOpen && (
        <>
          <div
            className="fixed inset-0 top-24 bg-sky-ink/45 backdrop-blur-[18px] z-40 lg:hidden"
            onClick={() => setNavOpen(false)}
          />
          {/* Sits in the main area as a lifted card rather than a strip welded to
              the ribbon: at bg-white/60 the dashboard read straight through the
              links. sky-glass-menu gives it a near-opaque floor, and z-50 clears
              both the scrim and the sticky header (both z-40). */}
          <div
            className="nav-overlay-in lg:hidden absolute top-full left-0 right-0 z-50 mx-3 mt-3 sky-glass-menu p-3 space-y-1.5"
          >
            {NAV_ITEMS.map(({ to, labelKey, Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setNavOpen(false)}
                className={({ isActive }) =>
                  [
                    "group relative flex items-center gap-3 w-full px-4 py-3 rounded-sky-sm text-base font-semibold",
                    `transition-all duration-150 ${easeExpo}`,
                    isActive
                      ? `bg-linear-to-b from-sky-violet to-sky-violet-deep text-white shadow-sky-fill ring-1 ring-inset ring-white/25`
                      : `text-sky-ink hover:bg-sky-violet/10 hover:text-sky-violet-deep`,
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-5 h-5 shrink-0 ${isActive ? "text-white" : "text-sky-ink-3 group-hover:text-sky-violet"}`}
                      strokeWidth={2.2}
                      aria-hidden="true"
                    />
                    {t(labelKey)}
                    {/* On a stacked list the underline has nowhere useful to go,
                        so the non-colour cue is a leading rail instead. */}
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-white/60"
                      />
                    )}
                  </>
                )}
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

import { NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import { Megaphone } from "lucide-react";

// ── DESIGN TOKENS ───────────────────────────────────────────────────────────────
// Same "Guild Command Center" neo-brutalism system as every other Mentor page:
// tinted ink (game-outline / brand-300 in dark) instead of pure black.
const inkBorder = "border-game-outline dark:border-brand-300";
const shadowSm = "shadow-[2px_2px_0_0_var(--color-game-outline)] dark:shadow-[2px_2px_0_0_var(--color-brand-300)]";
const easeExpo = "ease-[cubic-bezier(0.16,1,0.3,1)]";

const TABS = [
  { to: "overview",  iconSrc: "/icon/Item/Shield/64px/Shield 1st 64px.png",              labelKey: "mentor.workspace.tabs.overview" },
  { to: "quests",    iconSrc: "/icon/Item/Sword/64px/Sword 1st 64px.png",                labelKey: "mentor.workspace.tabs.quests" },
  { to: "proofs",    iconSrc: "/icon/Main/Magnifying Glass/64w/Magnifying Glass 1st 64px.png", labelKey: "mentor.workspace.tabs.proofs" },
  { to: "boss-raid", iconSrc: "/icon/Player/Skull/64px/Skull 1st 64px.png",              labelKey: "mentor.workspace.tabs.bossRaid" },
  { to: "rally",     iconSrc: null,                                                       labelKey: "mentor.workspace.tabs.rally" },
] as const;

export default function TabBar() {
  const { t } = useTranslation();
  return (
    <nav
      className={`flex flex-wrap gap-2 p-2 bg-gray-25 dark:bg-gray-800 border-[3px] ${inkBorder} rounded-xl overflow-x-auto`}
      aria-label={t("mentor.workspace.tabsAria")}
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            [
              "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-black whitespace-nowrap",
              `transition-all duration-150 ${easeExpo}`,
              isActive
                ? `bg-brand-200 dark:bg-brand-500/30 border-2 ${inkBorder} ${shadowSm} text-gray-900`
                : "border-2 border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
            ].join(" ")
          }
        >
          {tab.iconSrc ? (
            <img src={tab.iconSrc} alt="" className="w-4 h-4 object-contain" />
          ) : (
            <Megaphone className="w-4 h-4" aria-hidden="true" />
          )}
          {t(tab.labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}

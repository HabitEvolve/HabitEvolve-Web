import { NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import { Megaphone, Video } from "lucide-react";
import SkyCard from "../../../components/ui/card/SkyCard";
import { easeExpo } from "./sharedSky";

const TABS = [
  { to: "overview",  iconSrc: "/icon/Item/Shield/64px/Shield 1st 64px.png",              labelKey: "mentor.workspace.tabs.overview" },
  { to: "quests",    iconSrc: "/icon/Item/Sword/64px/Sword 1st 64px.png",                labelKey: "mentor.workspace.tabs.quests" },
  { to: "proofs",    iconSrc: "/icon/Main/Magnifying Glass/64w/Magnifying Glass 1st 64px.png", labelKey: "mentor.workspace.tabs.proofs" },
  { to: "boss-raid", iconSrc: "/icon/Player/Skull/64px/Skull 1st 64px.png",              labelKey: "mentor.workspace.tabs.bossRaid" },
  { to: "rally",     iconSrc: null,                                                       labelKey: "mentor.workspace.tabs.rally" },
  { to: "live-arena", iconSrc: null,                                                      labelKey: "mentor.workspace.tabs.liveArena" },
] as const;

export default function TabBar() {
  const { t } = useTranslation();
  return (
    <SkyCard variant="mentor" className="flex flex-wrap gap-2 p-2 overflow-x-auto">
      <nav
        className="flex flex-wrap gap-2 w-full"
        aria-label={t("mentor.workspace.tabsAria")}
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              [
                "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sky-chip text-sm font-semibold whitespace-nowrap",
                `transition-all duration-150 ${easeExpo}`,
                isActive
                  ? "bg-sky-deep text-white shadow-sky-chip"
                  : "text-sky-ink-2 hover:bg-sky-3/20",
              ].join(" ")
            }
          >
            {tab.iconSrc ? (
              <img src={tab.iconSrc} alt="" className="w-4 h-4 object-contain" />
            ) : tab.to === "live-arena" ? (
              <Video className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Megaphone className="w-4 h-4" aria-hidden="true" />
            )}
            {t(tab.labelKey)}
          </NavLink>
        ))}
      </nav>
    </SkyCard>
  );
}

import { NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import { Shield, Swords, ScanSearch, Skull, Megaphone, Video } from "lucide-react";
import SkyCard from "../../../components/ui/card/SkyCard";
import { easeExpo } from "./sharedSky";

// Pixel-art PNGs are retired here: at 16px the sprites turn to mush and clash
// with the lucide line vocabulary the rest of the workspace speaks. The game
// art stays where it can render large (the boss medallion, the weekly chest).
const TABS = [
  { to: "overview",   Icon: Shield,     labelKey: "mentor.workspace.tabs.overview" },
  { to: "quests",     Icon: Swords,     labelKey: "mentor.workspace.tabs.quests" },
  { to: "proofs",     Icon: ScanSearch, labelKey: "mentor.workspace.tabs.proofs" },
  { to: "boss-raid",  Icon: Skull,      labelKey: "mentor.workspace.tabs.bossRaid" },
  { to: "rally",      Icon: Megaphone,  labelKey: "mentor.workspace.tabs.rally" },
  { to: "live-arena", Icon: Video,      labelKey: "mentor.workspace.tabs.liveArena" },
] as const;

export default function TabBar() {
  const { t } = useTranslation();
  return (
    <SkyCard variant="mentor" className="p-2">
      <nav
        className="relative flex flex-wrap gap-1.5"
        aria-label={t("mentor.workspace.tabsAria")}
      >
        {TABS.map(({ to, Icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                "group relative inline-flex items-center gap-2 px-3.5 py-2.5 rounded-sky-chip",
                "text-sm font-semibold whitespace-nowrap",
                `transition-all duration-200 ${easeExpo}`,
                isActive
                  // Deep fill + a hairline top highlight, so the active tab reads
                  // as a raised key rather than a flat coloured rectangle.
                  ? "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-fill ring-1 ring-inset ring-white/25"
                  : "text-sky-ink-2 hover:bg-white/60 hover:text-sky-ink motion-safe:hover:-translate-y-px active:translate-y-0",
              ].join(" ")
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors duration-200 ${isActive ? "text-white" : "text-sky-ink-3 group-hover:text-sky-deep"}`}
                  strokeWidth={2.3}
                  aria-hidden="true"
                />
                {t(labelKey)}
                {/* Third cue beyond fill + weight: a short underline anchored to
                    the active key, so the selection survives without colour. */}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-3.5 right-3.5 -bottom-px h-0.5 rounded-full bg-white/55"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </SkyCard>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ChevronDownIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
import {
  Activity,
  BookOpen,
  ClipboardList,
  Coins,
  FileClock,
  Flame,
  Gavel,
  Gem,
  Goal,
  LayoutDashboard,
  Link2,
  Scale,
  ServerCog,
  Settings,
  Skull,
  Target,
  Users,
  UsersRound,
} from "lucide-react";

// Every nav glyph is now a line icon drawn in currentColor, so an item's icon
// inherits the row's ink and turns white on the deep active gradient. The old
// full-colour PNG sprites could not do that — they stayed bright against the
// selected row and made the whole rail read as a toy shelf rather than a
// console. One stroke weight, one size, one colour source: the list scans.
const navIcon = "w-5 h-5 shrink-0";

type NavItem = {
  nameKey: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { nameKey: string; path: string; pro?: boolean; new?: boolean }[];
  sectionKey?: string;
};

const navItems: NavItem[] = [
  {
    icon: <LayoutDashboard className={navIcon} aria-hidden="true" />,
    nameKey: "nav.admin.dashboard",
    path: "/home",
  },
  {
    icon: <Users className={navIcon} aria-hidden="true" />,
    nameKey: "nav.admin.user",
    path: "/user-management",
  },
  {
    icon: <Gavel className={navIcon} aria-hidden="true" />,
    nameKey: "nav.admin.court",
    path: "/court-management",
  },
  {
    icon: <Skull className={navIcon} aria-hidden="true" />,
    nameKey: "nav.admin.boss",
    path: "/boss-management",
    sectionKey: "nav.sections.GAMEPLAY",
  },
  {
    icon: <Flame className={navIcon} aria-hidden="true" />,
    nameKey: "nav.admin.dailyBoss",
    path: "/daily-boss",
  },
  {
    icon: <UsersRound className={navIcon} aria-hidden="true" />,
    nameKey: "nav.admin.party",
    path: "/admin/parties",
  },
  {
    icon: <BookOpen className={navIcon} aria-hidden="true" />,
    nameKey: "nav.admin.questLibrary",
    path: "/quest-library",
  },
  {
    icon: <Goal className={navIcon} aria-hidden="true" />,
    nameKey: "nav.admin.goalEngine",
    path: "/goal-engine",
    sectionKey: "nav.sections.PERSONALIZATION",
  },
  {
    icon: <Link2 className={navIcon} aria-hidden="true" />,
    nameKey: "nav.admin.goalRelationships",
    path: "/goal-relationships",
  },
  {
    icon: <ClipboardList className={navIcon} aria-hidden="true" />,
    nameKey: "nav.admin.onboardingEval",
    path: "/questionnaires",
  },
  {
    icon: <Target className={navIcon} aria-hidden="true" />,
    nameKey: "nav.admin.calcRules",
    path: "/target-rules",
    sectionKey: "nav.sections.CONFIGURATION",
  },
  {
    icon: <Settings className={navIcon} aria-hidden="true" />,
    nameKey: "nav.admin.systemConfig",
    path: "/system-config",
  },
  {
    icon: <Activity className={navIcon} aria-hidden="true" />,
    nameKey: "nav.admin.systemOps",
    path: "/system-ops",
  },
  {
    icon: <ServerCog className={navIcon} aria-hidden="true" />,
    nameKey: "nav.admin.systemJobs",
    path: "/system-jobs",
  },
  {
    icon: <Scale className={navIcon} aria-hidden="true" />,
    nameKey: "nav.admin.appeals",
    path: "/admin/appeals",
  },
  // {
  //   icon: <Cpu className={navIcon} aria-hidden="true" />,
  //   nameKey: "nav.admin.jobs",
  //   path: "/admin/jobs",
  // },
  {
    icon: <FileClock className={navIcon} aria-hidden="true" />,
    nameKey: "nav.admin.auditLog",
    path: "/admin/audit-log",
  },
  {
    icon: <Gem className={navIcon} aria-hidden="true" />,
    nameKey: "nav.admin.subscriptions",
    path: "/subscription-packages",
    sectionKey: "nav.sections.MONETIZATION",
  },
  {
    icon: <Coins className={navIcon} aria-hidden="true" />,
    nameKey: "nav.admin.economyHub",
    path: "/admin/economy",
  },
];

const AppSidebar: React.FC = () => {
  const { t } = useTranslation();
  const { isExpanded, isMobileOpen, setIsHovered } = useSidebar();
  const location = useLocation();

  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // On mobile the sidebar is always shown in full-width overlay mode.
  // On desktop it respects isExpanded (collapsed = icon-only).
  const showFull = isMobileOpen || isExpanded;

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  useEffect(() => {
    let matched = false;
    navItems.forEach((nav, index) => {
      if (nav.subItems) {
        nav.subItems.forEach((sub) => {
          if (isActive(sub.path)) {
            setOpenSubmenu(index);
            matched = true;
          }
        });
      }
    });
    if (!matched) setOpenSubmenu(null);
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `main-${openSubmenu}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prev) => ({
          ...prev,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number) => {
    setOpenSubmenu((prev) => (prev === index ? null : index));
  };

  return (
    <aside
      className={[
        // ── Base styles ──────────────────────────────────────────────────────
        // Design-system §5: "Sidebar/Nav → glass hoặc nền kính". Role identity
        // now comes from the *active item's* gradient (deep blue for Admin vs
        // violet for Mentor) rather than from a solid slab of Field Mint, so
        // the sidebar can join the glass surface system without losing the one
        // cue that tells the two portals apart.
        "h-screen flex flex-col",
        "sky-glass-sidebar",
        "text-sky-ink",
        "transition-all duration-300 overflow-hidden",
        // ── Mobile: fixed overlay, slides in/out ────────────────────────────
        // isMobileOpen controls translate; Backdrop handles dismiss
        "fixed top-0 left-0 z-50",
        isMobileOpen ? "translate-x-0 shadow-sky-glass" : "-translate-x-full",
        // ── Desktop: in-flow, width driven by isExpanded ────────────────────
        // lg:relative overrides fixed; lg:translate-x-0 overrides mobile translate
        "lg:relative lg:z-auto lg:translate-x-0 lg:shadow-none",
        isExpanded ? "lg:w-65 lg:p-6" : "lg:w-18 lg:px-2 lg:py-6",
        // Mobile width (while fixed overlay)
        "w-65 p-6",
      ].join(" ")}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Logo ────────────────────────────────────────────────────── */}
      <div className={`shrink-0 overflow-hidden transition-all duration-300 ${showFull ? "mb-2" : "mb-4"}`}>
        <Link to="/" className={`block ${!showFull ? "text-center" : ""}`}>
          {showFull ? (
            <h1 className="font-display text-3xl font-semibold text-sky-ink tracking-tight whitespace-nowrap">
              HabitEvolve
            </h1>
          ) : (
            // Collapsed, the mark needs to read as a deliberate badge — the
            // real brand mark (same asset the mascot below and MentorHeader
            // use), not a generated letter standing in for it.
            <img
              src="https://saiseocacvyfegzkewop.supabase.co/storage/v1/object/public/image/icon%20(1).png"
              alt="HabitEvolve"
              className="w-10 h-10 mx-auto rounded-sky-chip object-contain shadow-sky-chip"
            />
          )}
        </Link>
        {showFull && (
          <span className="text-balance inline-block mt-1 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] bg-linear-to-b from-sky-deep-lo to-sky-deep text-white rounded-full shadow-sky-chip">
            {t("common.admin")}
          </span>
        )}
      </div>

      {/* ── Mascot — hidden when collapsed ──────────────────────────── */}
      <div
        className={`shrink-0 flex justify-center transition-all duration-300 overflow-hidden ${showFull ? "mb-10 max-h-40 opacity-100" : "max-h-0 opacity-0 mb-0"
          }`}
      >
        <img
          alt="HabitEvolve Mascot"
          className="w-50 h-50 object-contain"
          src="https://saiseocacvyfegzkewop.supabase.co/storage/v1/object/public/image/icon%20(1).png"
        />
      </div>

      {/* ── Navigation ──────────────────────────────────────────────── */}
      <nav className="flex-1 min-h-0 overflow-y-auto space-y-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-sky-ink/20">
        {navItems.map((nav, index) => (
          <div key={nav.path ?? nav.nameKey}>
            {/* Section label — hidden when collapsed */}
            {nav.sectionKey && showFull && (
              <div className="px-2 pt-4 pb-1">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-sky-ink/15" />
                  <p className="text-[10px] font-semibold text-sky-ink-3 uppercase tracking-[0.14em] whitespace-nowrap">
                    {t(nav.sectionKey)}
                  </p>
                  <div className="h-px flex-1 bg-sky-ink/15" />
                </div>
              </div>
            )}
            {/* Collapsed spacer between sections */}
            {nav.sectionKey && !showFull && <div className="h-3" />}

            {nav.subItems ? (
              <button
                onClick={() => handleSubmenuToggle(index)}
                title={!showFull ? t(nav.nameKey) : undefined}
                aria-expanded={openSubmenu === index}
                className={`w-full flex items-center py-3 rounded-sky-sm transition-all
                  ${showFull ? "space-x-3 px-4" : "justify-center px-0"}
                  ${openSubmenu === index
                    ? "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-fill"
                    : "text-sky-ink-2 hover:bg-white/55"
                  }`}
              >
                {nav.icon}
                {showFull && (
                  <span className={`truncate ${openSubmenu === index ? "font-semibold" : "font-medium"}`}>
                    {t(nav.nameKey)}
                  </span>
                )}
                {showFull && (
                  <ChevronDownIcon
                    className={`ml-auto w-5 h-5 shrink-0 transition-transform duration-200 ${openSubmenu === index ? "rotate-180" : ""
                      }`}
                  />
                )}
              </button>
            ) : (
              nav.path && (
                <Link
                  to={nav.path}
                  title={!showFull ? t(nav.nameKey) : undefined}
                  aria-current={isActive(nav.path) ? "page" : undefined}
                  className={`flex items-center py-3 rounded-sky-sm transition-all
                    ${showFull ? "space-x-3 px-4" : "justify-center px-0"}
                    ${isActive(nav.path)
                      ? "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-fill"
                      : "text-sky-ink-2 hover:bg-white/55"
                    }`}
                >
                  {nav.icon}
                  {/* Selection is never colour alone: the active row also gains
                      weight, so it survives a greyscale or low-vision read. */}
                  {showFull && (
                    <span className={`truncate ${isActive(nav.path) ? "font-semibold" : "font-medium"}`}>
                      {t(nav.nameKey)}
                    </span>
                  )}
                </Link>
              )
            )}

            {nav.subItems && (
              <div
                ref={(el) => { subMenuRefs.current[`main-${index}`] = el; }}
                className="overflow-hidden transition-all duration-300"
                style={{
                  height: openSubmenu === index ? `${subMenuHeight[`main-${index}`]}px` : "0px",
                }}
              >
                <ul className="mt-2 space-y-1 ml-9">
                  {nav.subItems.map((subItem) => (
                    <li key={subItem.path}>
                      <Link
                        to={subItem.path}
                        className={`font-medium text-sm flex items-center px-3 py-2 rounded-sky-sm transition-all ${isActive(subItem.path)
                          ? "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-fill"
                          : "text-sky-ink-2 hover:bg-white/55"
                          }`}
                      >
                        {t(subItem.nameKey)}
                        {subItem.new && (
                          <span className="ml-auto text-xs bg-sky-deep text-white px-2 py-1 rounded-full">new</span>
                        )}
                        {subItem.pro && (
                          <span className="ml-auto text-xs bg-sky-violet text-white px-2 py-1 rounded-full">pro</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default AppSidebar;

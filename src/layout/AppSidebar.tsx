import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ChevronDownIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { Scale, Coins, Cpu, FileClock } from "lucide-react";

const GI = ({ src, alt = "" }: { src: string; alt?: string }) => (
  <img src={src} alt={alt} className="w-5 h-5 object-contain shrink-0" />
);

type NavItem = {
  nameKey: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { nameKey: string; path: string; pro?: boolean; new?: boolean }[];
  sectionKey?: string;
};

const navItems: NavItem[] = [
  {
    icon: <GI src="/icon/Main/House/64px/Blue House 1st 64px.png" alt="Dashboard" />,
    nameKey: "nav.admin.dashboard",
    path: "/home",
  },
  {
    icon: <GI src="/icon/Player/Player/64px/Player 1st 64px.png" alt="Users" />,
    nameKey: "nav.admin.user",
    path: "/user-management",
  },
  {
    icon: <GI src="/icon/Item/Hammer/64px/Hammer 1st 64px.png" alt="Court" />,
    nameKey: "nav.admin.court",
    path: "/court-management",
  },
  {
    icon: <GI src="/icon/Player/Skull/64px/Skull 1st 64px.png" alt="Boss" />,
    nameKey: "nav.admin.boss",
    path: "/boss-management",
    sectionKey: "nav.sections.GAMEPLAY",
  },
  {
    icon: <GI src="/icon/Main/Fire 2/64w/Fire 64px.png" alt="Daily Boss" />,
    nameKey: "nav.admin.dailyBoss",
    path: "/daily-boss",
  },
  {
    icon: <GI src="/icon/Item/Book/64px/Blue Book 1st 64px.png" alt="Quest Library" />,
    nameKey: "nav.admin.questLibrary",
    path: "/quest-library",
  },
  {
    icon: <GI src="/icon/Main/Stats/64px/Stats 1st 64px.png" alt="Goal Engine" />,
    nameKey: "nav.admin.goalEngine",
    path: "/goal-engine",
    sectionKey: "nav.sections.PERSONALIZATION",
  },
  {
    icon: <GI src="/icon/UI/Question Mark/64px/Question Mark 1st 64px.png" alt="Questionnaires" />,
    nameKey: "nav.admin.onboardingEval",
    path: "/questionnaires",
  },
  {
    icon: <GI src="/icon/Item/Target/64px/Golden Target 1st 64px.png" alt="Calc Rules" />,
    nameKey: "nav.admin.calcRules",
    path: "/target-rules",
    sectionKey: "nav.sections.CONFIGURATION",
  },
  {
    icon: <GI src="/icon/Main/Settings/64px/Settings 1 1st 64px.png" alt="System Config" />,
    nameKey: "nav.admin.systemConfig",
    path: "/system-config",
  },
  {
    icon: <GI src="/icon/Main/Stats/64px/Stats 2nd 64px.png" alt="System Ops" />,
    nameKey: "nav.admin.systemOps",
    path: "/system-ops",
  },
  {
    icon: <GI src="/icon/Main/Settings/64px/Settings 2 1st 64px.png" alt="System Jobs" />,
    nameKey: "nav.admin.systemJobs",
    path: "/system-jobs",
  },
  {
    icon: <Scale className="w-5 h-5 shrink-0" />,
    nameKey: "nav.admin.appeals",
    path: "/admin/appeals",
  },
  {
    icon: <Cpu className="w-5 h-5 shrink-0" />,
    nameKey: "nav.admin.jobs",
    path: "/admin/jobs",
  },
  {
    icon: <FileClock className="w-5 h-5 shrink-0" />,
    nameKey: "nav.admin.auditLog",
    path: "/admin/audit-log",
  },
  {
    icon: <GI src="/icon/Currency/Premium/64px/Premium 1st 64px.png" alt="Subscriptions" />,
    nameKey: "nav.admin.subscriptions",
    path: "/subscription-packages",
    sectionKey: "nav.sections.MONETIZATION",
  },
  {
    icon: <Coins className="w-5 h-5 shrink-0" />,
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
        "h-screen flex flex-col",
        "bg-[#B5EBE0] dark:bg-gray-800",
        "text-gray-900 dark:text-gray-100",
        "transition-all duration-300 overflow-hidden",
        // ── Mobile: fixed overlay, slides in/out ────────────────────────────
        // isMobileOpen controls translate; Backdrop handles dismiss
        "fixed top-0 left-0 z-50",
        isMobileOpen ? "translate-x-0 shadow-[4px_0_0_0_#1A1D20]" : "-translate-x-full",
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
            <h1 className="text-3xl font-black text-[#1a3a3a] dark:text-emerald-300 tracking-tight whitespace-nowrap">
              HabitEvolve
            </h1>
          ) : (
            <span className="text-2xl font-black text-[#1a3a3a] dark:text-emerald-300">H</span>
          )}
        </Link>
        {showFull && (
          <span className="text-balance inline-block mt-1 px-2 py-0.5 text-xs font-black bg-[#e18308] text-white rounded-full border-2 border-[#3b1f6e]">
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
      <nav className="flex-1 min-h-0 overflow-y-auto space-y-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#1a3a3a]/20 dark:[&::-webkit-scrollbar-thumb]:bg-white/20">
        {navItems.map((nav, index) => (
          <div key={nav.path ?? nav.nameKey}>
            {/* Section label — hidden when collapsed */}
            {nav.sectionKey && showFull && (
              <div className="px-2 pt-4 pb-1">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-[#1a3a3a]/20 dark:bg-gray-600" />
                  <p className="text-[10px] font-black text-[#1a3a3a]/50 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    {t(nav.sectionKey)}
                  </p>
                  <div className="h-px flex-1 bg-[#1a3a3a]/20 dark:bg-gray-600" />
                </div>
              </div>
            )}
            {/* Collapsed spacer between sections */}
            {nav.sectionKey && !showFull && <div className="h-3" />}

            {nav.subItems ? (
              <button
                onClick={() => handleSubmenuToggle(index)}
                title={!showFull ? t(nav.nameKey) : undefined}
                className={`w-full flex items-center py-3 rounded-xl transition-all shadow-sm
                  ${showFull ? "space-x-3 px-4" : "justify-center px-0"}
                  ${openSubmenu === index
                    ? "bg-[#f7a561] text-white"
                    : "text-gray-700 dark:text-gray-200 hover:bg-white/30 dark:hover:bg-white/10"
                  }`}
              >
                {nav.icon}
                {showFull && <span className="font-medium truncate">{t(nav.nameKey)}</span>}
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
                  className={`flex items-center py-3 rounded-xl transition-all shadow-sm
                    ${showFull ? "space-x-3 px-4" : "justify-center px-0"}
                    ${isActive(nav.path)
                      ? "bg-[#f7a561] text-white"
                      : "text-gray-700 dark:text-gray-200 hover:bg-white/30 dark:hover:bg-white/10"
                    }`}
                >
                  {nav.icon}
                  {showFull && <span className="font-medium truncate">{t(nav.nameKey)}</span>}
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
                        className={`font-medium text-sm flex items-center px-3 py-2 rounded transition-all ${isActive(subItem.path)
                          ? "bg-[#f7a561] text-white"
                          : "text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-white/10"
                          }`}
                      >
                        {t(subItem.nameKey)}
                        {subItem.new && (
                          <span className="ml-auto text-xs bg-blue-500 text-white px-2 py-1 rounded-full">new</span>
                        )}
                        {subItem.pro && (
                          <span className="ml-auto text-xs bg-purple-500 text-white px-2 py-1 rounded-full">pro</span>
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

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  ChevronDownIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { House, User, Handshake, Gavel, Swords, Layers, BadgeQuestionMark, Scale } from "lucide-react";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
  sectionLabel?: string;
};

const navItems: NavItem[] = [
  {
    icon: <House className="w-5 h-5 shrink-0" />,
    name: "Dashboard",
    path: "/home",
  },
  {
    icon: <User className="w-5 h-5 shrink-0" />,
    name: "User",
    path: "/user-management",
  },
  {
    icon: <Handshake className="w-5 h-5 shrink-0" />,
    name: "Party",
    path: "/party-management",
  },
  {
    icon: <Gavel className="w-5 h-5 shrink-0" />,
    name: "Court",
    path: "/court-management",
  },
  {
    icon: <Swords className="w-5 h-5 shrink-0" />,
    name: "Boss",
    path: "/boss-management",
    sectionLabel: "GAMEPLAY",
  },
  {
    icon: <Layers className="w-5 h-5 shrink-0" />,
    name: "Goal Engine",
    path: "/goal-engine",
    sectionLabel: "PERSONALIZATION",
  },
  {
    icon: <BadgeQuestionMark className="w-5 h-5 shrink-0" />,
    name: "Onboarding Eval",
    path: "/questionnaires",
  },
  {
    icon: <Scale className="w-5 h-5 shrink-0" />,
    name: "Calc Rules",
    path: "/target-rules",
    sectionLabel: "CONFIGURATION",
  },
];

const AppSidebar: React.FC = () => {
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
      <div className={`overflow-hidden transition-all duration-300 ${showFull ? "mb-8" : "mb-4"}`}>
        <Link to="/" className={`block ${!showFull ? "text-center" : ""}`}>
          {showFull ? (
            <h1 className="text-3xl font-black text-[#1a3a3a] dark:text-emerald-300 tracking-tight whitespace-nowrap">
              HabitEvolve
            </h1>
          ) : (
            <span className="text-2xl font-black text-[#1a3a3a] dark:text-emerald-300">H</span>
          )}
        </Link>
      </div>

      {/* ── Mascot — hidden when collapsed ──────────────────────────── */}
      <div
        className={`flex justify-center transition-all duration-300 overflow-hidden ${showFull ? "mb-10 max-h-40 opacity-100" : "max-h-0 opacity-0 mb-0"
          }`}
      >
        <img
          alt="HabitEvolve Mascot"
          className="w-32 h-32 object-contain"
          src="https://saiseocacvyfegzkewop.supabase.co/storage/v1/object/public/image/icon%20(1).png"
        />
      </div>

      {/* ── Navigation ──────────────────────────────────────────────── */}
      <nav className="grow space-y-1">
        {navItems.map((nav, index) => (
          <div key={nav.name}>
            {/* Section label — hidden when collapsed */}
            {nav.sectionLabel && showFull && (
              <div className="px-2 pt-4 pb-1">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-[#1a3a3a]/20 dark:bg-gray-600" />
                  <p className="text-[10px] font-black text-[#1a3a3a]/50 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    {nav.sectionLabel}
                  </p>
                  <div className="h-px flex-1 bg-[#1a3a3a]/20 dark:bg-gray-600" />
                </div>
              </div>
            )}
            {/* Collapsed spacer between sections */}
            {nav.sectionLabel && !showFull && <div className="h-3" />}

            {nav.subItems ? (
              <button
                onClick={() => handleSubmenuToggle(index)}
                title={!showFull ? nav.name : undefined}
                className={`w-full flex items-center py-3 rounded-xl transition-all shadow-sm
                  ${showFull ? "space-x-3 px-4" : "justify-center px-0"}
                  ${openSubmenu === index
                    ? "bg-[#f7a561] text-white"
                    : "text-gray-700 dark:text-gray-200 hover:bg-white/30 dark:hover:bg-white/10"
                  }`}
              >
                {nav.icon}
                {showFull && <span className="font-medium truncate">{nav.name}</span>}
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
                  title={!showFull ? nav.name : undefined}
                  className={`flex items-center py-3 rounded-xl transition-all shadow-sm
                    ${showFull ? "space-x-3 px-4" : "justify-center px-0"}
                    ${isActive(nav.path)
                      ? "bg-[#f7a561] text-white"
                      : "text-gray-700 dark:text-gray-200 hover:bg-white/30 dark:hover:bg-white/10"
                    }`}
                >
                  {nav.icon}
                  {showFull && <span className="font-medium truncate">{nav.name}</span>}
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
                    <li key={subItem.name}>
                      <Link
                        to={subItem.path}
                        className={`font-medium text-sm flex items-center px-3 py-2 rounded transition-all ${isActive(subItem.path)
                          ? "bg-[#f7a561] text-white"
                          : "text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-white/10"
                          }`}
                      >
                        {subItem.name}
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

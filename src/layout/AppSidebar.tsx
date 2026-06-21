import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";

// Assume these icons are imported from an icon library
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { House, User, Scale, Handshake, Goal, BadgeQuestionMark, CalendarCheck, Gavel, Swords, Layers } from "lucide-react";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
  sectionLabel?: string;
};

const navItems: NavItem[] = [
  {
    icon: <House className="w-5 h-5" />,
    name: "Dashboard",
    path: "/home",
  },
  {
    icon: <User className="w-5 h-5" />,
    name: "User",
    path: "/user-management",
  },
  {
    icon: <Handshake className="w-5 h-5" />,
    name: "Party",
    path: "/party-management",
  },
  {
    icon: <Gavel className="w-5 h-5" />,
    name: "Court",
    path: "/court-management",
  },
  {
    icon: <Swords className="w-5 h-5" />,
    name: "Boss",
    path: "/boss-management",
    sectionLabel: "GAMEPLAY",
  },
  {
    icon: <Layers className="w-5 h-5" />,
    name: "Goal Engine",
    path: "/goal-engine",
    sectionLabel: "PERSONALIZATION",
  },
  {
    icon: <BadgeQuestionMark className="w-5 h-5" />,
    name: "Onboarding Eval",
    path: "/questionnaires",
  },
  {
    icon: <Scale className="w-5 h-5" />,
    name: "Calc Rules",
    path: "/target-rules",
    sectionLabel: "CONFIGURATION",
  },
];



const AppSidebar: React.FC = () => {
  const { isMobileOpen, setIsHovered } = useSidebar();
  const location = useLocation();

  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // const isActive = (path: string) => location.pathname === path;
  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  useEffect(() => {
    let submenuMatched = false;
    navItems.forEach((nav, index) => {
      if (nav.subItems) {
        nav.subItems.forEach((subItem) => {
          if (isActive(subItem.path)) {
            setOpenSubmenu(index);
            submenuMatched = true;
          }
        });
      }
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `main-${openSubmenu}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number) => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (prevOpenSubmenu === index) {
        return null;
      }
      return index;
    });
  };

  return (
    <aside
      className="w-[260px] h-screen bg-[#B5EBE0] text-gray-900 flex flex-col p-6 flex-shrink-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo Section */}
      <div className="mb-8">
        <Link to="/">
          <h1 className="text-3xl font-black text-[#1a3a3a] tracking-tight">
            HabitEvolve
          </h1>
        </Link>
      </div>

      {/* Mascot Image */}
      <div className="flex justify-center mb-10">
        <img
          alt="HabitEvolve Mascot"
          className="w-32 h-32 object-contain"
          src="https://saiseocacvyfegzkewop.supabase.co/storage/v1/object/sign/image/logo%20new.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84NWVhZmI4Yi1iNjNiLTQ3N2ItOTAxOC05YmVmMWNhYTAzM2EiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZS9sb2dvIG5ldy5wbmciLCJpYXQiOjE3ODA5MDY1NzgsImV4cCI6MTgxMjQ0MjU3OH0.4zzwBNfttWLGR2QUArfCXsiPdvFOcLXV6Rjs1YZjjD8"
        />
      </div>

      {/* Navigation Menu */}
      <nav className="flex-grow space-y-2">
        {navItems.map((nav, index) => (
          <div key={nav.name}>
            {nav.sectionLabel && (
              <div className="px-2 pt-4 pb-1">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-[#1a3a3a]/20" />
                  <p className="text-[10px] font-black text-[#1a3a3a]/50 uppercase tracking-widest whitespace-nowrap">
                    {nav.sectionLabel}
                  </p>
                  <div className="h-px flex-1 bg-[#1a3a3a]/20" />
                </div>
              </div>
            )}
            {nav.subItems ? (
              <button
                onClick={() => handleSubmenuToggle(index)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all shadow-sm text-gray-700 hover:bg-white hover:bg-opacity-20 ${openSubmenu === index
                  ? "bg-[#f7a561] text-white"
                  : ""
                  }`}
              >
                {nav.icon}
                <span className="font-medium">{nav.name}</span>
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${openSubmenu === index
                    ? "rotate-180"
                    : ""
                    }`}
                />
              </button>
            ) : (
              nav.path && (
                <Link
                  to={nav.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all shadow-sm text-gray-700 hover:bg-white hover:bg-opacity-20 ${isActive(nav.path)
                    ? "bg-[#f7a561] text-white"
                    : ""
                    }`}
                >
                  {nav.icon}
                  <span className="font-medium">{nav.name}</span>
                </Link>
              )
            )}
            {nav.subItems && (
              <div
                ref={(el) => {
                  subMenuRefs.current[`main-${index}`] = el;
                }}
                className="overflow-hidden transition-all duration-300"
                style={{
                  height:
                    openSubmenu === index
                      ? `${subMenuHeight[`main-${index}`]}px`
                      : "0px",
                }}
              >
                <ul className="mt-2 space-y-1 ml-9">
                  {nav.subItems.map((subItem) => (
                    <li key={subItem.name}>
                      <Link
                        to={subItem.path}
                        className={`font-medium text-sm flex items-center px-3 py-2 rounded transition-all ${isActive(subItem.path)
                          ? "bg-[#f7a561] text-white"
                          : "text-gray-700 hover:bg-white hover:bg-opacity-20"
                          }`}
                      >
                        {subItem.name}
                        {subItem.new && (
                          <span className="ml-auto text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span className="ml-auto text-xs bg-purple-500 text-white px-2 py-1 rounded-full">
                            pro
                          </span>
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

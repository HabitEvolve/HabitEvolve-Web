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

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
      </svg>
    ),
    name: "Dashboard",
    path: "/",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
      </svg>
    ),
    name: "User Management",
    path: "/user-management",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
      </svg>
    ),
    name: "Party Management",
    path: "/party-management",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
      </svg>
    ),
    name: "Target Rules",
    path: "/target-rules",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
      </svg>
    ),
    name: "Goal Management",
    path: "/goal-management",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
      </svg>
    ),
    name: "Questionnaire Management",
    path: "/questionnaires",
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

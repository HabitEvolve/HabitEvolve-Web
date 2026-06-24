import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { useSidebar } from "../context/SidebarContext";
import { ChevronDownIcon } from "../icons";
import {
    LayoutDashboard,
    Users,
    Gem,
    Target,
    Inbox,
    Skull,
} from "lucide-react";

type NavItem = {
    name: string;
    icon: React.ReactNode;
    path?: string;
    subItems?: { name: string; path: string }[];
    sectionLabel?: string;
};

const navItems: NavItem[] = [
    {
        icon: <LayoutDashboard className="w-5 h-5 shrink-0" />,
        name: "Dashboard",
        path: "/mentor/dashboard",
    },
    {
        icon: <Users className="w-5 h-5 shrink-0" />,
        name: "My Parties",
        path: "/mentor/parties",
        sectionLabel: "GUILD",
    },
    {
        icon: <Gem className="w-5 h-5 shrink-0" />,
        name: "Subscription & Wallet",
        path: "/mentor/subscription",
    },
    {
        icon: <Target className="w-5 h-5 shrink-0" />,
        name: "Quest Command",
        path: "/mentor/quests",
        sectionLabel: "COMMAND",
    },
    {
        icon: <Inbox className="w-5 h-5 shrink-0" />,
        name: "Proof Queue",
        path: "/mentor/proofs",
    },
    {
        icon: <Skull className="w-5 h-5 shrink-0" />,
        name: "Boss Raid",
        path: "/mentor/boss-raid",
    },
];

const MentorSidebar: React.FC = () => {
    const { isExpanded, isMobileOpen, setIsHovered } = useSidebar();
    const location = useLocation();

    const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);
    const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
    const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Mobile overlay is always full-width; desktop respects isExpanded
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
                // ── Base ────────────────────────────────────────────────────────
                "h-screen flex flex-col",
                "bg-[#EDE9FE] dark:bg-gray-800",
                "text-gray-900 dark:text-gray-100",
                "transition-all duration-300 overflow-hidden",
                // ── Mobile: fixed overlay ────────────────────────────────────────
                "fixed top-0 left-0 z-50",
                isMobileOpen ? "translate-x-0 shadow-[4px_0_0_0_#1A1D20]" : "-translate-x-full",
                // ── Desktop: in-flow, collapsible ────────────────────────────────
                "lg:relative lg:z-auto lg:translate-x-0 lg:shadow-none",
                isExpanded ? "lg:w-65 lg:p-6" : "lg:w-18 lg:px-2 lg:py-6",
                // Mobile fixed overlay width
                "w-65 p-6",
            ].join(" ")}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* ── Logo ────────────────────────────────────────────────── */}
            <div className={`shrink-0 overflow-hidden transition-all duration-300 ${showFull ? "mb-2" : "mb-4"}`}>
                <Link to="/mentor/dashboard" className={`block ${!showFull ? "text-center" : ""}`}>
                    {showFull ? (
                        <h1 className="text-3xl font-black text-[#3b1f6e] dark:text-violet-300 tracking-tight whitespace-nowrap">
                            HabitEvolve
                        </h1>
                    ) : (
                        <span className="text-2xl font-black text-[#3b1f6e] dark:text-violet-300">H</span>
                    )}
                </Link>
                {showFull && (
                    <span className="text-balance inline-block mt-1 px-2 py-0.5 text-xs font-black bg-[#7C3AED] text-white rounded-full border-2 border-[#3b1f6e]">
                        MENTOR
                    </span>
                )}
            </div>

            {/* ── Mascot — hidden when collapsed ──────────────────────── */}
            <div
                className={`shrink-0 flex justify-center transition-all duration-300 overflow-hidden ${showFull ? "my-6 max-h-40 opacity-100" : "max-h-0 opacity-0 my-0"
                    }`}
            >
                <img
                    alt="HabitEvolve Mascot"
                    className="w-50 h-50 object-contain"
                    src="https://saiseocacvyfegzkewop.supabase.co/storage/v1/object/public/image/icon%20(1).png"
                />
            </div>

            {/* ── Navigation ──────────────────────────────────────────── */}
            <nav className="flex-1 min-h-0 overflow-y-auto space-y-1.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#3b1f6e]/20 dark:[&::-webkit-scrollbar-thumb]:bg-white/20">
                {navItems.map((nav, index) => (
                    <div key={nav.name}>
                        {/* Section label — hidden when collapsed */}
                        {nav.sectionLabel && showFull && (
                            <div className="px-2 pt-4 pb-1">
                                <div className="flex items-center gap-2">
                                    <div className="h-px flex-1 bg-[#3b1f6e]/20 dark:bg-gray-600" />
                                    <p className="text-[10px] font-black text-[#3b1f6e]/50 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                        {nav.sectionLabel}
                                    </p>
                                    <div className="h-px flex-1 bg-[#3b1f6e]/20 dark:bg-gray-600" />
                                </div>
                            </div>
                        )}
                        {nav.sectionLabel && !showFull && <div className="h-3" />}

                        {nav.subItems ? (
                            <button
                                onClick={() => handleSubmenuToggle(index)}
                                title={!showFull ? nav.name : undefined}
                                className={`w-full flex items-center py-3 rounded-xl transition-all shadow-sm
                                    ${showFull ? "space-x-3 px-4" : "justify-center px-0"}
                                    ${openSubmenu === index
                                        ? "bg-[#7C3AED] text-white"
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
                                            ? "bg-[#7C3AED] text-white"
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
                                    height: openSubmenu === index
                                        ? `${subMenuHeight[`main-${index}`]}px`
                                        : "0px",
                                }}
                            >
                                <ul className="mt-2 space-y-1 ml-9">
                                    {nav.subItems.map((sub) => (
                                        <li key={sub.name}>
                                            <Link
                                                to={sub.path}
                                                className={`font-medium text-sm flex items-center px-3 py-2 rounded transition-all ${isActive(sub.path)
                                                    ? "bg-[#7C3AED] text-white"
                                                    : "text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-white/10"
                                                    }`}
                                            >
                                                {sub.name}
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

export default MentorSidebar;

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { useSidebar } from "../context/SidebarContext";
import { ChevronDownIcon } from "../icons";
const GameIcon = ({ src, alt = "" }: { src: string; alt?: string }) => (
    <img src={src} alt={alt} className="w-5 h-5 object-contain shrink-0" />
);

type NavItem = {
    nameKey: string;
    icon: React.ReactNode;
    path?: string;
    subItems?: { nameKey: string; path: string }[];
    sectionKey?: string;
};

const navItems: NavItem[] = [
    {
        icon: <GameIcon src="/icon/Main/House/64px/Green House 1st 64px.png" alt="Dashboard" />,
        nameKey: "nav.mentor.dashboard",
        path: "/mentor/dashboard",
    },
    {
        icon: <GameIcon src="/icon/Player/Friend/64px/Friend 1st 64px.png" alt="My Parties" />,
        nameKey: "nav.mentor.myParties",
        path: "/mentor/parties",
        sectionKey: "nav.sections.GUILD",
    },
    {
        icon: <GameIcon src="/icon/Currency/Premium/64px/Premium 1st 64px.png" alt="Subscription" />,
        nameKey: "nav.mentor.subscriptionWallet",
        path: "/mentor/subscription",
    },
    {
        icon: <GameIcon src="/icon/Item/Target/64px/Golden Target 1st 64px.png" alt="Quest Command" />,
        nameKey: "nav.mentor.questCommand",
        path: "/mentor/quests",
        sectionKey: "nav.sections.COMMAND",
    },
    {
        icon: <GameIcon src="/icon/Main/Verify/64px/Verify 1st 64px.png" alt="Proof Queue" />,
        nameKey: "nav.mentor.proofQueue",
        path: "/mentor/proofs",
    },
    {
        icon: <GameIcon src="/icon/Player/Skull/64px/Skull 1st 64px.png" alt="Boss Raid" />,
        nameKey: "nav.mentor.bossRaid",
        path: "/mentor/boss-raid",
    },
    {
        icon: <GameIcon src="/icon/Item/Clock/64px/Golden Clock 1st 64px.png" alt="Party Reminder" />,
        nameKey: "nav.mentor.partyReminder",
        path: "/mentor/party-reminder",
    },
];

const MentorSidebar: React.FC = () => {
    const { t } = useTranslation();
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
                    <div key={nav.path ?? nav.nameKey}>
                        {/* Section label — hidden when collapsed */}
                        {nav.sectionKey && showFull && (
                            <div className="px-2 pt-4 pb-1">
                                <div className="flex items-center gap-2">
                                    <div className="h-px flex-1 bg-[#3b1f6e]/20 dark:bg-gray-600" />
                                    <p className="text-[10px] font-black text-[#3b1f6e]/50 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                        {t(nav.sectionKey)}
                                    </p>
                                    <div className="h-px flex-1 bg-[#3b1f6e]/20 dark:bg-gray-600" />
                                </div>
                            </div>
                        )}
                        {nav.sectionKey && !showFull && <div className="h-3" />}

                        {nav.subItems ? (
                            <button
                                onClick={() => handleSubmenuToggle(index)}
                                title={!showFull ? t(nav.nameKey) : undefined}
                                className={`w-full flex items-center py-3 rounded-xl transition-all shadow-sm
                                    ${showFull ? "space-x-3 px-4" : "justify-center px-0"}
                                    ${openSubmenu === index
                                        ? "bg-[#7C3AED] text-white"
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
                                            ? "bg-[#7C3AED] text-white"
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
                                    height: openSubmenu === index
                                        ? `${subMenuHeight[`main-${index}`]}px`
                                        : "0px",
                                }}
                            >
                                <ul className="mt-2 space-y-1 ml-9">
                                    {nav.subItems.map((sub) => (
                                        <li key={sub.path}>
                                            <Link
                                                to={sub.path}
                                                className={`font-medium text-sm flex items-center px-3 py-2 rounded transition-all ${isActive(sub.path)
                                                    ? "bg-[#7C3AED] text-white"
                                                    : "text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-white/10"
                                                    }`}
                                            >
                                                {t(sub.nameKey)}
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

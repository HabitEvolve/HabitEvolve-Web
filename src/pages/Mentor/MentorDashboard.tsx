import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import PageMeta from "../../components/common/PageMeta";
import { Gem, Target, Inbox, Skull, Users } from "lucide-react";

const hubs = [
    {
        titleKey: "mentor.dashboard.hubs.parties.title",
        descKey: "mentor.dashboard.hubs.parties.subtitle",
        icon: <Users className="w-8 h-8" />,
        path: "/mentor/parties",
        bg: "bg-[#D1FAE5]",
        darkBg: "dark:bg-emerald-900/30",
        border: "border-emerald-400",
        shadow: "shadow-[4px_4px_0_0_#065f46]",
    },
    {
        titleKey: "mentor.dashboard.hubs.subscription.title",
        descKey: "mentor.dashboard.hubs.subscription.subtitle",
        icon: <Gem className="w-8 h-8" />,
        path: "/mentor/subscription",
        bg: "bg-[#FEF9C3]",
        darkBg: "dark:bg-amber-900/30",
        border: "border-amber-400",
        shadow: "shadow-[4px_4px_0_0_#92400e]",
    },
    {
        titleKey: "mentor.dashboard.hubs.questCommand.title",
        descKey: "mentor.dashboard.hubs.questCommand.subtitle",
        icon: <Target className="w-8 h-8" />,
        path: "/mentor/quests",
        bg: "bg-[#EDE9FE]",
        darkBg: "dark:bg-violet-900/30",
        border: "border-violet-400",
        shadow: "shadow-[4px_4px_0_0_#3b1f6e]",
    },
    {
        titleKey: "mentor.dashboard.hubs.proofQueue.title",
        descKey: "mentor.dashboard.hubs.proofQueue.subtitle",
        icon: <Inbox className="w-8 h-8" />,
        path: "/mentor/proofs",
        bg: "bg-[#CCFBF1]",
        darkBg: "dark:bg-teal-900/30",
        border: "border-teal-400",
        shadow: "shadow-[4px_4px_0_0_#0f766e]",
    },
    {
        titleKey: "mentor.dashboard.hubs.bossRaid.title",
        descKey: "mentor.dashboard.hubs.bossRaid.subtitle",
        icon: <Skull className="w-8 h-8" />,
        path: "/mentor/boss-raid",
        bg: "bg-[#FEE2E2]",
        darkBg: "dark:bg-red-900/30",
        border: "border-red-400",
        shadow: "shadow-[4px_4px_0_0_#991b1b]",
    },
];

export default function MentorDashboard() {
    const { t } = useTranslation();

    return (
        <>
            <PageMeta
                title="Mentor Dashboard — HabitEvolve"
                description="Your mentor command centre"
            />

            {/* Header */}
            <div className="mb-8">
                <div className="inline-flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 text-xs font-black bg-[#7C3AED] text-white rounded-full border-2 border-black">
                        {t("mentor.dashboard.badge")}
                    </span>
                </div>
                <h1 className="text-4xl font-black text-gray-900 dark:text-white">{t("mentor.dashboard.welcome")}</h1>
            </div>

            {/* Hub cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {hubs.map((hub) => (
                    <Link
                        key={hub.path}
                        to={hub.path}
                        className={`
                            group flex flex-col gap-4 p-6
                            ${hub.bg} ${hub.darkBg} border-4 ${hub.border} rounded-2xl
                            ${hub.shadow}
                            transition-all duration-150
                            hover:translate-x-0.5 hover:translate-y-0.5
                            hover:shadow-[2px_2px_0_0_#1A1D20]
                            active:translate-x-1 active:translate-y-1
                            active:shadow-none
                        `}
                    >
                        <div className="p-3 bg-white dark:bg-gray-700 border-4 border-black rounded-xl w-fit shadow-[3px_3px_0_0_#1A1D20]">
                            {hub.icon}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white">{t(hub.titleKey)}</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mt-1">{t(hub.descKey)}</p>
                        </div>
                        <div className="mt-auto flex items-center gap-1 text-sm font-black text-gray-700 dark:text-gray-200">
                            {t("mentor.dashboard.enterHub")}
                            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </Link>
                ))}
            </div>
        </>
    );
}

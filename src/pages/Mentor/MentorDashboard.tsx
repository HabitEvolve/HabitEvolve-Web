import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import { Gem, Target, Inbox, Skull, Users } from "lucide-react";

const hubs = [
    {
        title: "My Parties",
        description: "Manage your squads, invite members, and handle join requests.",
        icon: <Users className="w-8 h-8" />,
        path: "/mentor/parties",
        bg: "bg-[#D1FAE5]",
        darkBg: "dark:bg-emerald-900/30",
        border: "border-emerald-400",
        shadow: "shadow-[4px_4px_0_0_#065f46]",
    },
    {
        title: "Subscription & Wallet",
        description: "Check your Gem balance, view your active plan, and upgrade.",
        icon: <Gem className="w-8 h-8" />,
        path: "/mentor/subscription",
        bg: "bg-[#FEF9C3]",
        darkBg: "dark:bg-amber-900/30",
        border: "border-amber-400",
        shadow: "shadow-[4px_4px_0_0_#92400e]",
    },
    {
        title: "Quest Command",
        description: "Assign quests to individual members or fan-out to your whole party.",
        icon: <Target className="w-8 h-8" />,
        path: "/mentor/quests",
        bg: "bg-[#EDE9FE]",
        darkBg: "dark:bg-violet-900/30",
        border: "border-violet-400",
        shadow: "shadow-[4px_4px_0_0_#3b1f6e]",
    },
    {
        title: "Proof Queue",
        description: "Review submitted proof, approve completions, or reject with feedback.",
        icon: <Inbox className="w-8 h-8" />,
        path: "/mentor/proofs",
        bg: "bg-[#CCFBF1]",
        darkBg: "dark:bg-teal-900/30",
        border: "border-teal-400",
        shadow: "shadow-[4px_4px_0_0_#0f766e]",
    },
    {
        title: "Boss Raid",
        description: "Register your party for the weekly boss and choose a difficulty mode.",
        icon: <Skull className="w-8 h-8" />,
        path: "/mentor/boss-raid",
        bg: "bg-[#FEE2E2]",
        darkBg: "dark:bg-red-900/30",
        border: "border-red-400",
        shadow: "shadow-[4px_4px_0_0_#991b1b]",
    },
];

export default function MentorDashboard() {
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
                        MENTOR PORTAL
                    </span>
                </div>
                <h1 className="text-4xl font-black text-gray-900 dark:text-white">Welcome back, Mentor!</h1>
                <p className="text-gray-500 mt-1 font-medium">
                    Use the hubs below to manage your parties, quests, and boss raids.
                </p>
            </div>

            {/* Hub cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {hubs.map((hub) => (
                    <Link
                        key={hub.title}
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
                            <h2 className="text-xl font-black text-gray-900 dark:text-white">{hub.title}</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mt-1">{hub.description}</p>
                        </div>
                        <div className="mt-auto flex items-center gap-1 text-sm font-black text-gray-700 dark:text-gray-200">
                            Enter Hub
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

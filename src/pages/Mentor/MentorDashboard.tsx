import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import PageMeta from "../../components/common/PageMeta";
import SkyCard from "../../components/ui/card/SkyCard";

const hubs = [
    {
        titleKey: "mentor.dashboard.hubs.parties.title",
        descKey: "mentor.dashboard.hubs.parties.subtitle",
        icon: "https://saiseocacvyfegzkewop.supabase.co/storage/v1/object/public/image/icon%20(1).png",
        path: "/mentor/parties",
    },
    {
        titleKey: "mentor.dashboard.hubs.subscription.title",
        descKey: "mentor.dashboard.hubs.subscription.subtitle",
        icon: "/icon/Currency/Premium/64px/Premium 1st 64px.png",
        path: "/mentor/wallet",
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
                    <span className="px-3 py-1 text-xs font-bold bg-mentor-active text-white rounded-full">
                        {t("mentor.dashboard.badge")}
                    </span>
                </div>
                <h1 className="text-sky-h1 font-extrabold text-sky-ink">{t("mentor.dashboard.welcome")}</h1>
            </div>

            {/* Hub cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {hubs.map((hub) => (
                    <Link key={hub.titleKey} to={hub.path} className="group block h-full">
                        <SkyCard
                            variant="mentor"
                            className="flex h-full flex-col gap-4 transition-transform duration-150 ease-out hover:scale-[1.01]"
                        >
                            <div className="sky-glass-chip w-fit p-3">
                                <img src={hub.icon} alt="" className="w-8 h-8 object-contain" />
                            </div>
                            <div>
                                <h2 className="text-sky-h3 font-semibold text-sky-ink">{t(hub.titleKey)}</h2>
                                <p className="text-sky-body text-sky-ink-2 mt-1">{t(hub.descKey)}</p>
                            </div>
                            <div className="mt-auto flex items-center gap-1 text-sky-small font-semibold text-sky-ink-2">
                                {t("mentor.dashboard.enterHub")}
                                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </SkyCard>
                    </Link>
                ))}
            </div>
        </>
    );
}

import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import playerProfileApi from "../api/userProfileApi";
import { PlayerProfile } from "../types/api.types";

// ── HELPERS ───────────────────────────────────────────────────────────────────
const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

const formatTime = (time: string | null): string => {
  if (!time) return "Not set";
  const parts = time.split(":");
  const h = parseInt(parts[0], 10);
  const m = parts[1] ?? "00";
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${period}`;
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

// ── ICONS ─────────────────────────────────────────────────────────────────────
const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const CheckCircleIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const PencilIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const ShieldCheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" />
  </svg>
);
const AlertCircleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// ── REMINDER BADGE STYLES ─────────────────────────────────────────────────────
const REMINDER_BADGE: Record<string, string> = {
  NONE:  "bg-gray-100 border-gray-400 text-gray-600",
  EMAIL: "bg-blue-100 border-blue-400 text-blue-800",
  PUSH:  "bg-emerald-100 border-emerald-400 text-emerald-800",
  BOTH:  "bg-purple-100 border-purple-400 text-purple-800",
};

// ── LOADING SKELETON ──────────────────────────────────────────────────────────
const ProfileSkeleton = () => (
  <div className="space-y-5 animate-pulse">
    <div className="bg-white border-4 border-gray-200 rounded-3xl p-6">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-24 h-24 rounded-full bg-gray-200 flex-shrink-0" />
        <div className="flex-1 space-y-3 w-full">
          <div className="h-7 w-48 bg-gray-200 rounded-full mx-auto sm:mx-0" />
          <div className="h-4 w-64 bg-gray-200 rounded-full mx-auto sm:mx-0" />
          <div className="h-4 w-32 bg-gray-200 rounded-full mx-auto sm:mx-0" />
        </div>
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <div className="bg-white border-4 border-gray-200 rounded-3xl p-6 h-32" />
      <div className="bg-white border-4 border-gray-200 rounded-3xl p-6 h-32" />
    </div>
    <div className="bg-white border-4 border-gray-200 rounded-3xl p-6 h-28" />
  </div>
);

// ── COMPLETION ITEM ───────────────────────────────────────────────────────────
const CompletionItem = ({ done, label }: { done: boolean; label: string }) => (
  <div className={`flex items-center gap-2.5 text-sm font-semibold ${done ? "text-green-700" : "text-amber-700"}`}>
    <span className={done ? "text-green-500" : "text-amber-500"}>
      <CheckCircleIcon filled={done} />
    </span>
    {label}
  </div>
);

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function UserProfiles() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await playerProfileApi.getMyProfile();
      if (res.success && res.data) {
        setProfile(res.data);
      } else {
        setError(res.message || "Failed to load profile.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <>
      <PageMeta
        title="My Profile | HabitEvolve"
        description="View and manage your HabitEvolve player profile"
      />
      <PageBreadcrumb pageTitle={t("profile.myProfile")} />

      {loading ? (
        <ProfileSkeleton />
      ) : error ? (
        <div className="bg-red-50 border-4 border-red-400 rounded-3xl shadow-[6px_6px_0_0_#1A1D20] p-8 text-center">
          <p className="font-black text-red-800 text-lg mb-2">{t("profile.failedToLoad")}</p>
          <p className="text-red-600 text-sm mb-5">{error}</p>
          <button
            onClick={fetchProfile}
            className="px-6 py-2.5 bg-red-400 text-white border-2 border-black rounded-full font-black text-sm shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
          >
            {t("profile.retry")}
          </button>
        </div>
      ) : profile ? (
        <div className="space-y-5">

          {/* ── PROFILE INCOMPLETE BANNER ──────────────────────────────────── */}
          {!profile.isProfileCreated && (
            <div className="bg-amber-50 border-4 border-amber-400 rounded-3xl shadow-[4px_4px_0_0_#1A1D20] p-5">
              <p className="font-black text-amber-900 mb-1">{t("profile.completeYourProfile")}</p>
              <p className="text-xs text-amber-700 mb-4">
                Finish setting up your account to get the most out of HabitEvolve!
              </p>
              <div className="space-y-2">
                <CompletionItem done={profile.hasAvatar}              label={t("profile.completionItems.avatar")}    />
                <CompletionItem done={profile.hasDailySchedule}       label={t("profile.completionItems.schedule")}  />
                <CompletionItem done={profile.hasReminderPreference}  label={t("profile.completionItems.reminder")}  />
              </div>
              <Link
                to="/edit-profile"
                className="mt-4 inline-flex items-center gap-2 px-5 py-2 bg-amber-400 border-2 border-black rounded-full font-black text-sm text-gray-900 shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
              >
                {t("profile.completeNow")}
              </Link>
            </div>
          )}

          {/* ── HERO CARD ──────────────────────────────────────────────────── */}
          <div className="bg-white border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {profile.hasAvatar && profile.avatarUrl ? (
                  <div className="w-32 h-32 rounded-full border-4 border-black overflow-hidden shadow-[4px_4px_0_0_#1A1D20]">
                    <img
                      src={profile.avatarUrl}
                      alt={profile.username}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full border-4 border-black flex items-center justify-center bg-gradient-to-br from-orange-200 to-pink-300 shadow-[4px_4px_0_0_#1A1D20]">
                    <span className="text-4xl font-black text-gray-800">
                      {getInitials(profile.username)}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                  <h2 className="text-2xl font-black text-gray-900">{profile.username}</h2>
                  <span className="inline-flex items-center gap-1 self-center px-2.5 py-0.5 text-xs font-black rounded-full border-2 bg-gray-100 border-gray-400 text-gray-600">
                    <UserIcon />
                    #{profile.userId}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                  <p className="text-gray-500 text-sm font-medium">{profile.email}</p>
                  {profile.emailVerified ? (
                    <span className="inline-flex items-center gap-1 self-center px-2.5 py-0.5 text-xs font-black rounded-full border-2 bg-green-100 border-green-400 text-green-800">
                      <ShieldCheckIcon />
                      {t("profile.verified")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 self-center px-2.5 py-0.5 text-xs font-black rounded-full border-2 bg-red-100 border-red-400 text-red-700">
                      <AlertCircleIcon />
                      {t("profile.unverified")}
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-400 font-medium mt-2">
                  {t("profile.memberSince")} {formatDate(profile.createdAt)}
                </p>
              </div>

              {/* Edit button */}
              <Link
                to="/edit-profile"
                className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-orange-300 border-2 border-black rounded-full font-black text-sm text-gray-900 shadow-[4px_4px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all whitespace-nowrap"
              >
                <PencilIcon />
                {t("profile.editProfileBtn")}
              </Link>
            </div>
          </div>

          {/* ── SETTINGS GRID ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Daily Schedule */}
            <div className="bg-white border-4 border-black rounded-3xl shadow-[4px_4px_0_0_#1A1D20] p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-9 h-9 flex items-center justify-center rounded-2xl border-2 border-black bg-sky-200 text-gray-800">
                  <ClockIcon />
                </span>
                <span className="text-xs font-black text-gray-400 uppercase tracking-wide">
                  {t("profile.sections.dailySchedule")}
                </span>
              </div>
              {profile.hasDailySchedule ? (
                <p className="text-2xl font-black text-gray-900">
                  {formatTime(profile.dailyScheduleTime)}
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-gray-400">{t("profile.notSet")}</p>
                  <Link
                    to="/edit-profile"
                    className="text-xs font-black text-orange-600 underline hover:no-underline"
                  >
                    {t("profile.setNow")}
                  </Link>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">{t("profile.dailyScheduleDesc")}</p>
            </div>

            {/* Reminder Preference */}
            <div className="bg-white border-4 border-black rounded-3xl shadow-[4px_4px_0_0_#1A1D20] p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-9 h-9 flex items-center justify-center rounded-2xl border-2 border-black bg-purple-200 text-gray-800">
                  <BellIcon />
                </span>
                <span className="text-xs font-black text-gray-400 uppercase tracking-wide">
                  {t("profile.sections.reminders")}
                </span>
              </div>
              {profile.hasReminderPreference && profile.reminderPreference ? (
                <span className={`inline-flex items-center px-3 py-1.5 text-sm font-black rounded-full border-2 ${REMINDER_BADGE[profile.reminderPreference] ?? "bg-gray-100 border-gray-400 text-gray-600"}`}>
                  {profile.reminderPreference}
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-gray-400">{t("profile.notSet")}</p>
                  <Link
                    to="/edit-profile"
                    className="text-xs font-black text-orange-600 underline hover:no-underline"
                  >
                    {t("profile.setNow")}
                  </Link>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">{t("profile.remindersDesc")}</p>
            </div>
          </div>

          {/* ── ACCOUNT DETAILS ────────────────────────────────────────────── */}
          <div className="bg-white border-4 border-black rounded-3xl shadow-[4px_4px_0_0_#1A1D20] p-5">
            <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-4">
              {t("profile.sections.accountDetails")}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: t("profile.details.userId"),      value: `#${profile.userId}` },
                { label: t("profile.details.verified"),    value: profile.emailVerified ? t("profile.emailVerifiedYes") : t("profile.emailVerifiedNo") },
                { label: t("profile.details.joined"),      value: formatDate(profile.createdAt) },
                { label: t("profile.details.lastUpdated"), value: profile.updatedAt ? formatDate(profile.updatedAt) : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      ) : null}
    </>
  );
}

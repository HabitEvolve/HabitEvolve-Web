import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Clock, Bell, Pencil, User, ShieldCheck, AlertCircle,
  Check, Minus, Mail, MailX, CalendarDays, Hash, RefreshCw, AlertTriangle, Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import PageHeader from "../components/common/PageHeader";
import playerProfileApi from "../api/userProfileApi";
import ChangePasswordCard from "../components/UserProfile/ChangePasswordCard";
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

// ── SHARED STYLES ─────────────────────────────────────────────────────────────
const eyebrow = "text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3";

// ── REMINDER BADGE ────────────────────────────────────────────────────────────
// Delivery channel is a taxonomy, not a status — nothing here is better or worse
// than the neighbouring option, so it rides the cool/violet accents with a glyph
// carrying the distinction. NONE stays neutral: an unset preference is not a fault.
const REMINDER_CFG: Record<string, { cls: string; Icon: LucideIcon }> = {
  NONE: { cls: "sky-badge-neutral", Icon: Minus },
  EMAIL: { cls: "sky-badge-info", Icon: Mail },
  PUSH: { cls: "sky-badge-info", Icon: Bell },
  BOTH: { cls: "sky-badge-epic", Icon: Sparkles },
};

// ── LOADING SKELETON ──────────────────────────────────────────────────────────
// Mirrors the real layout's rhythm so the page doesn't reflow when data lands.
const ProfileSkeleton = () => (
  <div className="space-y-5 animate-pulse">
    <div className="sky-glass-admin rounded-sky-card p-6">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-32 h-32 rounded-full bg-sky-ink/8 shrink-0" />
        <div className="flex-1 space-y-3 w-full">
          <div className="h-7 w-48 rounded-full bg-sky-ink/8 mx-auto sm:mx-0" />
          <div className="h-4 w-64 rounded-full bg-sky-ink/8 mx-auto sm:mx-0" />
          <div className="h-4 w-32 rounded-full bg-sky-ink/8 mx-auto sm:mx-0" />
        </div>
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <div className="sky-glass-admin rounded-sky-card p-6 h-32" />
      <div className="sky-glass-admin rounded-sky-card p-6 h-32" />
    </div>
    <div className="sky-glass-admin rounded-sky-card p-6 h-28" />
  </div>
);

// ── COMPLETION ITEM ───────────────────────────────────────────────────────────
// A checklist row, not a pass/fail verdict: done is teal, and an outstanding step
// is a hollow circle in quiet ink rather than a warning — the user hasn't done
// anything wrong, they just haven't finished yet.
const CompletionItem = ({ done, label }: { done: boolean; label: string }) => (
  <div className="flex items-center gap-2.5 text-sm">
    <span
      className={`grid place-items-center w-5 h-5 rounded-full shrink-0 ${
        done ? "bg-sky-teal text-white" : "border border-dashed border-sky-ink/25 text-transparent"
      }`}
    >
      <Check className="w-3 h-3" />
    </span>
    <span className={done ? "font-medium text-sky-ink-2 line-through decoration-sky-ink/25" : "font-semibold text-sky-ink"}>
      {label}
    </span>
  </div>
);

// ── STAT TILE ─────────────────────────────────────────────────────────────────
const DetailTile = ({ Icon, label, value }: { Icon: LucideIcon; label: string; value: string }) => (
  <div className="rounded-sky-md bg-white/55 ring-1 ring-white/75 p-3.5">
    <p className={`${eyebrow} flex items-center gap-1.5`}>
      <Icon className="w-3 h-3 shrink-0" /> {label}
    </p>
    <p className="font-display text-sm font-semibold text-sky-ink mt-1 tabular-nums">{value}</p>
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
        <div className="sky-in relative overflow-hidden rounded-sky-card bg-sky-rose/10 ring-1 ring-sky-rose/25 shadow-sky-glass p-8 text-center">
          <span className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-sky-rose to-sky-rose-deep" />
          <span className="grid place-items-center w-14 h-14 mx-auto mb-3 rounded-full bg-sky-rose/15 text-sky-rose-deep">
            <AlertTriangle className="w-6 h-6" />
          </span>
          <p className="font-display text-lg font-semibold text-sky-rose-deep mb-1">{t("profile.failedToLoad")}</p>
          <p className="text-sm font-medium text-sky-ink-2 mb-5">{error}</p>
          <button
            onClick={fetchProfile}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sky-chip bg-linear-to-b from-sky-rose to-sky-rose-deep text-white text-sm font-semibold shadow-sky-chip transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-rose/50"
          >
            <RefreshCw className="w-3.5 h-3.5" /> {t("profile.retry")}
          </button>
        </div>
      ) : profile ? (
        <div className="space-y-5 sky-stagger">

          {/* ── PROFILE INCOMPLETE BANNER ──────────────────────────────────── */}
          {/* Warm rail: an unfinished profile needs attention, but it isn't an
              error — so it never borrows the destructive hue. */}
          {!profile.isProfileCreated && (
            <div className="relative overflow-hidden rounded-sky-card bg-sky-peach/12 ring-1 ring-sky-peach/30 shadow-sky-glass pl-6 pr-5 py-5">
              <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-linear-to-b from-sky-peach to-sky-peach-deep" />
              <div className="flex items-start gap-3">
                <span className="grid place-items-center w-9 h-9 rounded-sky-chip bg-sky-peach/22 text-sky-peach-deep shrink-0">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-semibold text-sky-ink">{t("profile.completeYourProfile")}</p>
                  <p className="text-xs font-medium text-sky-ink-2 mt-1 mb-4">
                    Finish setting up your account to get the most out of HabitEvolve!
                  </p>
                  <div className="space-y-2.5 rounded-sky-md bg-white/50 ring-1 ring-white/70 px-4 py-3.5">
                    <CompletionItem done={profile.hasAvatar}              label={t("profile.completionItems.avatar")}    />
                    <CompletionItem done={profile.hasDailySchedule}       label={t("profile.completionItems.schedule")}  />
                    <CompletionItem done={profile.hasReminderPreference}  label={t("profile.completionItems.reminder")}  />
                  </div>
                  <Link
                    to="/edit-profile"
                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-sky-chip bg-linear-to-b from-sky-peach to-sky-peach-deep text-white text-sm font-semibold shadow-sky-chip transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-peach/50"
                  >
                    {t("profile.completeNow")}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ── HERO CARD ──────────────────────────────────────────────────── */}
          <div className="sky-glass-admin rounded-sky-card p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Avatar — a soft cool halo instead of a hard outline, so the
                  portrait sits on the glass rather than being stamped onto it. */}
              <div className="shrink-0">
                {profile.hasAvatar && profile.avatarUrl ? (
                  <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-white/85 shadow-sky-glass">
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
                  <div className="grid place-items-center w-32 h-32 rounded-full ring-4 ring-white/85 bg-linear-to-br from-sky-2 to-sky-violet/45 shadow-sky-glass">
                    <span className="font-display text-4xl font-semibold text-white drop-shadow-[0_2px_6px_rgba(36,52,77,0.35)]">
                      {getInitials(profile.username)}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <PageHeader title={profile.username} description={profile.email} />

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2.5">
                  <span className="sky-badge sky-badge-neutral tabular-nums">
                    <User className="w-3 h-3 shrink-0" />
                    #{profile.userId}
                  </span>
                  {/* Verified is the only teal state here; unverified is a real
                      gap in account security, so it takes destructive rose. */}
                  {profile.emailVerified ? (
                    <span className="sky-badge sky-badge-success">
                      <ShieldCheck className="w-3 h-3 shrink-0" />
                      {t("profile.verified")}
                    </span>
                  ) : (
                    <span className="sky-badge sky-badge-danger">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {t("profile.unverified")}
                    </span>
                  )}
                </div>

                <p className="text-xs font-medium text-sky-ink-3 mt-2.5">
                  {t("profile.memberSince")} {formatDate(profile.createdAt)}
                </p>
              </div>

              {/* Edit button — the one primary action on the page */}
              <Link
                to="/edit-profile"
                className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-sky-chip bg-linear-to-b from-sky-deep-lo to-sky-deep text-white text-sm font-semibold shadow-sky-fill whitespace-nowrap transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-deep/45"
              >
                <Pencil className="w-3.5 h-3.5" />
                {t("profile.editProfileBtn")}
              </Link>
            </div>
          </div>

          {/* ── SETTINGS GRID ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Daily Schedule */}
            <div className="sky-glass-admin rounded-sky-card p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="grid place-items-center w-9 h-9 rounded-sky-chip bg-sky-deep/12 text-sky-deep shrink-0">
                  <Clock className="w-4 h-4" />
                </span>
                <span className={eyebrow}>
                  {t("profile.sections.dailySchedule")}
                </span>
              </div>
              {profile.hasDailySchedule ? (
                <p className="font-display text-2xl font-semibold text-sky-ink tabular-nums">
                  {formatTime(profile.dailyScheduleTime)}
                </p>
              ) : (
                <div className="flex items-center gap-2.5">
                  <p className="font-display text-lg font-semibold text-sky-ink-3">{t("profile.notSet")}</p>
                  <Link
                    to="/edit-profile"
                    className="text-xs font-semibold text-sky-deep underline decoration-sky-deep/35 underline-offset-2 hover:decoration-sky-deep"
                  >
                    {t("profile.setNow")}
                  </Link>
                </div>
              )}
              <p className="text-xs font-medium text-sky-ink-3 mt-1.5">{t("profile.dailyScheduleDesc")}</p>
            </div>

            {/* Reminder Preference */}
            <div className="sky-glass-admin rounded-sky-card p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="grid place-items-center w-9 h-9 rounded-sky-chip bg-sky-violet/14 text-sky-violet-deep shrink-0">
                  <Bell className="w-4 h-4" />
                </span>
                <span className={eyebrow}>
                  {t("profile.sections.reminders")}
                </span>
              </div>
              {profile.hasReminderPreference && profile.reminderPreference ? (
                (() => {
                  const c = REMINDER_CFG[profile.reminderPreference] ?? REMINDER_CFG.NONE;
                  return (
                    <span className={`sky-badge ${c.cls} px-3 py-1.5 text-sm`}>
                      <c.Icon className="w-3.5 h-3.5 shrink-0" /> {profile.reminderPreference}
                    </span>
                  );
                })()
              ) : (
                <div className="flex items-center gap-2.5">
                  <p className="font-display text-lg font-semibold text-sky-ink-3">{t("profile.notSet")}</p>
                  <Link
                    to="/edit-profile"
                    className="text-xs font-semibold text-sky-deep underline decoration-sky-deep/35 underline-offset-2 hover:decoration-sky-deep"
                  >
                    {t("profile.setNow")}
                  </Link>
                </div>
              )}
              <p className="text-xs font-medium text-sky-ink-3 mt-2.5">{t("profile.remindersDesc")}</p>
            </div>
          </div>

          {/* ── ACCOUNT DETAILS ────────────────────────────────────────────── */}
          <div className="sky-glass-admin rounded-sky-card p-5">
            <p className={`${eyebrow} mb-4`}>
              {t("profile.sections.accountDetails")}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { Icon: Hash,         label: t("profile.details.userId"),      value: `#${profile.userId}` },
                { Icon: profile.emailVerified ? ShieldCheck : MailX, label: t("profile.details.verified"), value: profile.emailVerified ? t("profile.emailVerifiedYes") : t("profile.emailVerifiedNo") },
                { Icon: CalendarDays, label: t("profile.details.joined"),      value: formatDate(profile.createdAt) },
                { Icon: RefreshCw,    label: t("profile.details.lastUpdated"), value: profile.updatedAt ? formatDate(profile.updatedAt) : "—" },
              ].map(({ Icon, label, value }) => (
                <DetailTile key={label} Icon={Icon} label={label} value={value} />
              ))}
            </div>
          </div>

          {/* ── CHANGE PASSWORD ────────────────────────────────────────────── */}
          {/* Last in the stack: it is the one destructive-ish action here, and it
              posts on its own rather than reading the profile above it. */}
          <ChangePasswordCard />

        </div>
      ) : null}
    </>
  );
}

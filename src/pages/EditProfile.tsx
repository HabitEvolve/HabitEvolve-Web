import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, Save, ImageIcon, Clock, Bell, Lock, Loader2,
  CheckCircle2, AlertTriangle, ChevronDown, UserCog,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import PageHeader from "../components/common/PageHeader";
import playerProfileApi from "../api/userProfileApi";
import { UpdatePlayerProfilePayload } from "../types/api.types";
import { uploadApi } from "../api/uploadApi";

// ── SHARED STYLES ─────────────────────────────────────────────────────────────
const eyebrow = "text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3";
const inputCls =
  "w-full px-3.5 py-2.5 rounded-sky-chip bg-white/70 ring-1 ring-white/80 text-sky-ink text-sm font-medium transition-shadow focus:outline-none focus:ring-2 focus:ring-sky-deep/45 placeholder:text-sky-ink-3";

// ── LOADING SKELETON ──────────────────────────────────────────────────────────
const EditSkeleton = () => (
  <div className="max-w-2xl justify-self-center w-full animate-pulse">
    <div className="sky-glass-admin rounded-sky-card p-6 space-y-5">
      <div className="h-7 w-40 bg-sky-ink/8 rounded-full" />
      <div className="h-4 w-72 bg-sky-ink/8 rounded-full" />
      <div className="space-y-2.5">
        <div className="h-3 w-24 bg-sky-ink/8 rounded-full" />
        <div className="h-11 bg-sky-ink/8 rounded-sky-chip" />
      </div>
      <div className="space-y-2.5">
        <div className="h-3 w-32 bg-sky-ink/8 rounded-full" />
        <div className="h-11 bg-sky-ink/8 rounded-sky-chip" />
      </div>
      <div className="space-y-2.5">
        <div className="h-3 w-36 bg-sky-ink/8 rounded-full" />
        <div className="h-11 bg-sky-ink/8 rounded-sky-chip" />
      </div>
    </div>
  </div>
);

// ── SHARED FORM FIELD WRAPPER ─────────────────────────────────────────────────
// The glyph sits inside the label row in quiet ink so it identifies the field
// without competing with the value the user is about to type.
const FormField = ({
  label, hint, Icon, children,
}: {
  label: string;
  hint?: string;
  Icon: LucideIcon;
  children: React.ReactNode;
}) => (
  <div>
    <div className="flex items-center gap-2 mb-1.5">
      <Icon className="w-3.5 h-3.5 shrink-0 text-sky-ink-3" />
      <label className={eyebrow}>{label}</label>
    </div>
    {children}
    {hint && <p className="text-xs font-medium text-sky-ink-3 mt-1.5">{hint}</p>}
  </div>
);

// ── LOCKED FIELD ──────────────────────────────────────────────────────────────
// Recessed and dashed rather than raised: the well reads as "you cannot type
// here" before the padlock is even noticed.
const LockedField = ({ label, value }: { label: string; value: string }) => (
  <div>
    <label className={`block mb-1.5 ${eyebrow}`}>{label}</label>
    <div className="flex items-center gap-2 w-full px-3.5 py-2.5 rounded-sky-chip bg-white/38 border border-dashed border-sky-ink/20 text-sm font-medium text-sky-ink-2">
      <Lock className="w-3.5 h-3.5 shrink-0 text-sky-ink-3" />
      <span className="truncate">{value}</span>
    </div>
  </div>
);

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function EditProfile() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const REMINDER_OPTIONS: { value: string; label: string }[] = [
    { value: "", label: t("editProfile.selectPreference") },
    { value: "NONE", label: t("editProfile.reminderNone") },
    { value: "EMAIL", label: t("editProfile.reminderEmail") },
    { value: "PUSH", label: t("editProfile.reminderPush") },
    { value: "BOTH", label: t("editProfile.reminderEmailPush") },
  ];

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read-only display values (not editable here)
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  // Editable form state, typed exactly as the payload
  const [formData, setFormData] = useState<UpdatePlayerProfilePayload>({
    userId: 0,
    avatarUrl: "",
    dailyScheduleTime: "",
    reminderPreference: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await playerProfileApi.getMyProfile();
        if (res.success && res.data) {
          const d = res.data;
          // Display-only fields
          setUsername(d.username);
          setEmail(d.email);
          // Pre-populate editable form fields with existing data
          setFormData({
            userId: d.userId,
            avatarUrl: d.avatarUrl ?? "",
            // Strip seconds if backend returns "HH:mm:ss" — <input type="time"> needs "HH:mm"
            dailyScheduleTime: d.dailyScheduleTime?.slice(0, 5) ?? "",
            reminderPreference: d.reminderPreference ?? "",
          });
        } else {
          setError(res.message ?? "Failed to load profile.");
        }
      } catch (err: any) {
        setError(err?.response?.data?.message ?? "Failed to load your profile.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await playerProfileApi.updateProfile(formData);
      if (res.success) {
        setSuccess(true);
        // Navigate back to profile after a short delay so the user sees the success banner
        setTimeout(() => navigate("/profile"), 1800);
      } else {
        setError(res.message ?? "Failed to update profile.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to update profile.");
    } finally {
      setSubmitting(false);
    }
  };

  const set = <K extends keyof UpdatePlayerProfilePayload>(
    key: K,
    value: UpdatePlayerProfilePayload[K]
  ) => setFormData((prev) => ({ ...prev, [key]: value }));

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const url = await uploadApi.uploadImage(file, "avatars");
      if (url) {
        set("avatarUrl", url);
      } else {
        setError(t("editProfile.uploadFailed"));
      }
    } catch {
      setError(t("editProfile.uploadFailed"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <PageMeta
        title="Edit Profile | HabitEvolve"
        description="Update your HabitEvolve profile settings"
      />
      <PageBreadcrumb pageTitle={t("editProfile.title")} />

      {loading ? (
        <EditSkeleton />
      ) : (
        <div className="max-w-2xl justify-self-center w-full">

          <PageHeader
            className="mb-5"
            icon={<UserCog className="w-6 h-6" strokeWidth={2.1} aria-hidden="true" />}
            tone="deep"
            title={t("editProfile.title")}
            description="Update your avatar, schedule time, and notification preferences."
          />

          {/* ── SUCCESS BANNER ──────────────────────────────────────────────── */}
          {/* teal is the only success hue in the system — never green (§4). */}
          {success && (
            <div className="sky-in relative overflow-hidden mb-5 flex items-start gap-3 rounded-sky-card bg-sky-teal-bg/70 ring-1 ring-sky-teal/30 shadow-sky-glass pl-6 pr-5 py-4">
              <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-sky-teal" />
              <span className="grid place-items-center w-9 h-9 rounded-sky-chip bg-sky-teal text-white shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold text-sky-ink">{t("editProfile.profileUpdated")}</p>
                <p className="text-xs font-medium text-sky-ink-2 mt-0.5">{t("editProfile.redirecting")}</p>
              </div>
            </div>
          )}

          {/* ── ERROR BANNER ────────────────────────────────────────────────── */}
          {error && !success && (
            <div className="sky-in relative overflow-hidden mb-5 flex items-start gap-3 rounded-sky-card bg-sky-rose/10 ring-1 ring-sky-rose/25 shadow-sky-glass pl-6 pr-5 py-4">
              <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-linear-to-b from-sky-rose to-sky-rose-deep" />
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-sky-rose-deep" />
              <p className="text-sm font-semibold text-sky-rose-deep">{error}</p>
            </div>
          )}

          {/* ── FORM CARD ───────────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="sky-glass-admin rounded-sky-card overflow-hidden">

            <div className="px-6 py-6 space-y-6">

              {/* ── READ-ONLY ACCOUNT INFO ──────────────────────────────────── */}
              <div>
                <p className={`${eyebrow} mb-3`}>
                  {t("editProfile.accountInfo")}
                  <span className="ml-2 normal-case tracking-normal text-sky-ink-3">
                    {t("editProfile.managedByAdmin")}
                  </span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <LockedField label={t("editProfile.usernameLabel")} value={username} />
                  <LockedField label={t("editProfile.emailLabel")} value={email} />
                </div>
              </div>

              <hr className="border-t border-dashed border-sky-ink/12" />

              {/* ── AVATAR ──────────────────────────────────────────────────── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ImageIcon className="w-3.5 h-3.5 shrink-0 text-sky-ink-3" />
                  <span className={eyebrow}>{t("editProfile.avatarLabel")}</span>
                </div>

                <div className="flex items-start gap-5">
                  {/* Preview circle with upload overlay */}
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white/85 bg-linear-to-br from-sky-2 to-sky-violet/45 shadow-sky-glass">
                      {formData.avatarUrl ? (
                        <img
                          src={formData.avatarUrl}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="font-display text-2xl font-semibold text-white select-none drop-shadow-[0_2px_6px_rgba(36,52,77,0.35)]">
                            {username ? username.slice(0, 2).toUpperCase() : "?"}
                          </span>
                        </div>
                      )}
                    </div>
                    {isUploading && (
                      <div className="absolute inset-0 rounded-full bg-sky-abyss/55 backdrop-blur-sm flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                      </div>
                    )}
                  </div>

                  {/* Upload controls */}
                  <div className="flex-1 min-w-0 space-y-2.5 pt-1">
                    <button
                      type="button"
                      disabled={isUploading || submitting}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-sky-chip bg-white/70 ring-1 ring-white/85 text-sky-ink text-sm font-semibold shadow-sky-chip transition hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-deep/45"
                    >
                      {isUploading
                        ? <><Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" /> {t("editProfile.uploadingAvatar")}</>
                        : <><ImageIcon className="w-3.5 h-3.5 shrink-0" /> {t("editProfile.changeAvatar")}</>
                      }
                    </button>
                    <p className="text-xs font-medium text-sky-ink-3">{t("editProfile.avatarHint")}</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleAvatarFileChange}
                    />
                  </div>
                </div>

              </div>

              {/* ── DAILY SCHEDULE TIME ─────────────────────────────────────── */}
              <FormField
                label={t("editProfile.reminderLabel")}
                hint={t("editProfile.scheduleHint")}
                Icon={Clock}
              >
                <input
                  type="time"
                  value={formData.dailyScheduleTime ?? ""}
                  onChange={(e) => set("dailyScheduleTime", e.target.value)}
                  className={`${inputCls} cursor-pointer tabular-nums`}
                />
              </FormField>

              {/* ── REMINDER PREFERENCE ─────────────────────────────────────── */}
              <FormField
                label={t("editProfile.reminderPrefLabel")}
                hint={t("editProfile.reminderPrefHint")}
                Icon={Bell}
              >
                {/* Native select keeps its keyboard behaviour; the stock arrow is
                    swapped for a token glyph so it matches every other control. */}
                <div className="relative">
                  <select
                    value={formData.reminderPreference ?? ""}
                    onChange={(e) => set("reminderPreference", e.target.value)}
                    className={`${inputCls} appearance-none pr-10 cursor-pointer`}
                  >
                    {REMINDER_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value} disabled={value === ""}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-ink-3" />
                </div>
              </FormField>

            </div>

            {/* ── FORM ACTIONS ──────────────────────────────────────────────── */}
            {/* Save is the one filled control on the page; going back is a glass
                chip, so the hierarchy is visible before either label is read. */}
            <div className="px-6 py-5 bg-white/45 border-t border-white/70 flex flex-col sm:flex-row gap-3">
              <Link
                to="/profile"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-sky-chip bg-white/70 ring-1 ring-white/85 text-sky-ink-2 text-sm font-semibold shadow-sky-chip transition hover:bg-white/90 hover:text-sky-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-deep/45"
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                {t("editProfile.backToProfile")}
              </Link>
              <button
                type="submit"
                disabled={submitting || success}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-sky-chip bg-linear-to-b from-sky-deep-lo to-sky-deep text-white text-sm font-semibold shadow-sky-fill transition hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-deep/45"
              >
                {submitting
                  ? <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                  : success
                    ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    : <Save className="w-3.5 h-3.5 shrink-0" />}
                {submitting ? t("editProfile.saving") : success ? t("editProfile.saved") : t("editProfile.saveChanges")}
              </button>
            </div>
          </form>

        </div>
      )}
    </>
  );
}

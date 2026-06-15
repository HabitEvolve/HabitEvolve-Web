import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import playerProfileApi from "../api/userProfileApi";
import { UpdatePlayerProfilePayload } from "../types/api.types";
import { uploadApi } from "../api/uploadApi";

// ── REMINDER OPTIONS ──────────────────────────────────────────────────────────
const REMINDER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Select a preference…" },
  { value: "NONE", label: "None — I'll check manually" },
  { value: "EMAIL", label: "Email" },
  { value: "PUSH", label: "Push Notification" },
  { value: "BOTH", label: "Email & Push" },
];

// ── ICONS ─────────────────────────────────────────────────────────────────────
const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);
const SaveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
  </svg>
);
const ImageIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);
const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const SmallSpinner = () => (
  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── LOADING SKELETON ──────────────────────────────────────────────────────────
const EditSkeleton = () => (
  <div className="animate-pulse space-y-5">
    <div className="bg-white border-4 border-gray-200 rounded-3xl p-6 space-y-5">
      <div className="h-7 w-40 bg-gray-200 rounded-full" />
      <div className="h-4 w-72 bg-gray-200 rounded-full" />
      <div className="space-y-3">
        <div className="h-4 w-24 bg-gray-200 rounded-full" />
        <div className="h-12 bg-gray-200 rounded-2xl" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-32 bg-gray-200 rounded-full" />
        <div className="h-12 bg-gray-200 rounded-2xl" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-36 bg-gray-200 rounded-full" />
        <div className="h-12 bg-gray-200 rounded-2xl" />
      </div>
    </div>
  </div>
);

// ── SHARED FORM FIELD WRAPPER ─────────────────────────────────────────────────
const FormField = ({
  label, hint, icon, children,
}: {
  label: string;
  hint?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div>
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-gray-500">{icon}</span>
      <label className="text-xs font-black text-gray-700 uppercase tracking-wide">
        {label}
      </label>
    </div>
    {children}
    {hint && <p className="text-xs text-gray-400 mt-1.5 font-medium">{hint}</p>}
  </div>
);

// ── LOCKED FIELD ──────────────────────────────────────────────────────────────
const LockedField = ({ label, value }: { label: string; value: string }) => (
  <div>
    <label className="block text-xs font-black text-gray-700 uppercase tracking-wide mb-1.5">
      {label}
    </label>
    <div className="flex items-center gap-2 w-full px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 text-sm font-medium text-gray-500">
      <span className="text-gray-400"><LockIcon /></span>
      {value}
    </div>
  </div>
);

const inputCls =
  "w-full px-4 py-2.5 border-2 border-black rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white placeholder:text-gray-400";

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function EditProfile() {
  const navigate = useNavigate();

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
        setError("Avatar upload failed. Please try again or paste a URL below.");
      }
    } catch {
      setError("Avatar upload failed. Please try again or paste a URL below.");
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
      <PageBreadcrumb pageTitle="Edit Profile" />

      {loading ? (
        <EditSkeleton />
      ) : (
        <div className="max-w-2xl justify-self-center">

          {/* ── SUCCESS BANNER ──────────────────────────────────────────────── */}
          {success && (
            <div className="mb-5 flex items-center gap-3 bg-green-50 border-4 border-green-400 rounded-3xl shadow-[4px_4px_0_0_#1A1D20] px-5 py-4">
              <span className="text-green-500"><CheckIcon /></span>
              <div>
                <p className="font-black text-green-800">Profile updated!</p>
                <p className="text-xs text-green-700">Redirecting to your profile…</p>
              </div>
            </div>
          )}

          {/* ── ERROR BANNER ────────────────────────────────────────────────── */}
          {error && !success && (
            <div className="mb-5 bg-red-50 border-4 border-red-400 rounded-3xl shadow-[4px_4px_0_0_#1A1D20] px-5 py-4">
              <p className="font-black text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* ── FORM CARD ───────────────────────────────────────────────────── */}
          <form
            onSubmit={handleSubmit}
            className="bg-white border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20]"
          >
            {/* Card header */}
            <div className="px-6 pt-6 pb-5 border-b-2 border-gray-200">
              <h2 className="text-lg font-black text-gray-900">Edit Profile</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Update your avatar, schedule time, and notification preferences.
              </p>
            </div>

            <div className="px-6 py-6 space-y-6">

              {/* ── READ-ONLY ACCOUNT INFO ──────────────────────────────────── */}
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-3">
                  Account Info
                  <span className="ml-2 normal-case font-semibold text-gray-400">
                    (managed by admin)
                  </span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <LockedField label="Username" value={username} />
                  <LockedField label="Email" value={email} />
                </div>
              </div>

              <hr className="border-dashed border-gray-200" />

              {/* ── AVATAR ──────────────────────────────────────────────────── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-gray-500"><ImageIcon /></span>
                  <span className="text-xs font-black text-gray-700 uppercase tracking-wide">Avatar</span>
                </div>

                <div className="flex items-start gap-5">
                  {/* Preview circle with upload overlay */}
                  <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 rounded-full border-4 border-black overflow-hidden bg-gradient-to-br from-orange-200 to-pink-300 shadow-[4px_4px_0_0_#1A1D20]">
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
                          <span className="text-2xl font-black text-gray-800 select-none">
                            {username ? username.slice(0, 2).toUpperCase() : "?"}
                          </span>
                        </div>
                      )}
                    </div>
                    {isUploading && (
                      <div className="absolute inset-0 rounded-full bg-black/55 flex items-center justify-center">
                        <SmallSpinner />
                      </div>
                    )}
                  </div>

                  {/* Upload controls */}
                  <div className="flex-1 space-y-2.5 pt-1">
                    <button
                      type="button"
                      disabled={isUploading || submitting}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-black rounded-full font-black text-sm bg-sky-100 text-sky-900 shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[3px_3px_0_0_#1A1D20] transition-all"
                    >
                      {isUploading
                        ? <><SmallSpinner /> Uploading…</>
                        : <><ImageIcon /> Change Avatar</>
                      }
                    </button>
                    <p className="text-xs text-gray-400 font-medium">JPG or PNG  — max 5 MB</p>
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
                label="Daily Habit Reminder Time"
                hint="The time each day when you'll be prompted to check in on your habits."
                icon={<ClockIcon />}
              >
                <input
                  type="time"
                  value={formData.dailyScheduleTime ?? ""}
                  onChange={(e) => set("dailyScheduleTime", e.target.value)}
                  className={`${inputCls} cursor-pointer`}
                />
              </FormField>

              {/* ── REMINDER PREFERENCE ─────────────────────────────────────── */}
              <FormField
                label="Reminder Preference"
                hint="Choose how you'd like to receive habit reminders."
                icon={<BellIcon />}
              >
                <select
                  value={formData.reminderPreference ?? ""}
                  onChange={(e) => set("reminderPreference", e.target.value)}
                  className={inputCls}
                >
                  {REMINDER_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value} disabled={value === ""}>
                      {label}
                    </option>
                  ))}
                </select>
              </FormField>

            </div>

            {/* ── FORM ACTIONS ──────────────────────────────────────────────── */}
            <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
              <Link
                to="/profile"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-black rounded-full font-bold text-sm bg-white text-gray-700 shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
              >
                <ArrowLeftIcon />
                Back to Profile
              </Link>
              <button
                type="submit"
                disabled={submitting || success}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-black rounded-full font-black text-sm bg-orange-300 text-gray-900 shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[3px_3px_0_0_#1A1D20] transition-all"
              >
                <SaveIcon />
                {submitting ? "Saving…" : success ? "Saved!" : "Save Changes"}
              </button>
            </div>
          </form>

        </div>
      )}
    </>
  );
}

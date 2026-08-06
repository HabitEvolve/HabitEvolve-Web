import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Users } from "lucide-react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import PageHeader from "../components/common/PageHeader";
import Pagination from "../components/common/SkyPagination";
import adminUserApi from "../api/adminUserApi";
import { UserItem, UpdateUserStatusPayload } from "../types/api.types";
import { useAlert } from "../context/AlertContext";
import SkyCard from "../components/ui/card/SkyCard";
import SkyButton from "../components/ui/button/SkyButton";
import SharedStatusBadge from "../components/common/StatusBadge";

// ── TYPES ─────────────────────────────────────────────────────────────────────
type ModalType = "create" | "update" | "delete" | null;
const PAGE_SIZE = 10;

// ── HELPERS ───────────────────────────────────────────────────────────────────
const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

// Exported: reused by UserDetail.tsx (Admin 360 view) to keep date formatting consistent.
export const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

// Identity gradients, drawn only from the Sky-Pastel palette (§4) — no green,
// no off-palette rainbow. Deterministic per user id, so the same person keeps
// the same colour across the table, the detail page, and the modals.
const AVATAR_GRADIENTS = [
  "from-sky-3 to-sky-deep-lo",
  "from-sky-peach to-sky-peach-deep",
  "from-sky-violet to-sky-violet-deep",
  "from-sky-teal to-sky-deep",
  "from-sky-4 to-sky-3",
  "from-sky-rose to-sky-rose-deep",
  "from-sky-deep-lo to-sky-violet",
];
const getAvatarGradient = (id: number) =>
  AVATAR_GRADIENTS[id % AVATAR_GRADIENTS.length];

// ── USER AVATAR ───────────────────────────────────────────────────────────────
// Exported: reused by UserDetail.tsx (Admin 360 view header).
export const UserAvatar = ({
  username,
  userId,
  avatarUrl,
  size = "sm",
}: {
  username: string;
  userId: number;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) => {
  const [imgError, setImgError] = useState(false);
  const sizeMap = {
    sm: "w-9 h-9 border-2 text-xs",
    md: "w-10 h-10 border-2 text-sm",
    lg: "w-16 h-16 border-4 text-2xl",
  };
  const showImage = !!avatarUrl && !imgError;
  return (
    <div
      className={`${sizeMap[size]} shrink-0 rounded-full border-white/70 flex items-center justify-center font-display font-semibold overflow-hidden shadow-sky-chip ${
        showImage ? "" : `text-white bg-linear-to-br ${getAvatarGradient(userId)}`
      }`}
    >
      {showImage ? (
        <img
          src={avatarUrl!}
          alt={username}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="leading-none">{getInitials(username)}</span>
      )}
    </div>
  );
};

// ── ICONS ─────────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const UserGroupIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
// ── ROLE BADGE ────────────────────────────────────────────────────────────────
// §4 role mapping: admin = rose (highest privilege, reads as "careful"),
// mentor = violet (matches the Mentor portal's identity colour), player = deep
// blue (the default user colour).
const ROLE_STYLES: Record<string, string> = {
  ADMIN:  "bg-sky-rose/16 text-sky-rose-deep",
  MENTOR: "bg-sky-violet/16 text-sky-violet-deep",
  PLAYER: "bg-sky-deep/12 text-sky-deep",
};
// Exported: reused by UserDetail.tsx (Admin 360 view).
export const RoleBadge = ({ role }: { role: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full ${ROLE_STYLES[role] ?? "bg-sky-ink/7 text-sky-ink-2"}`}>
    {role}
  </span>
);

// ── STATUS BADGE ──────────────────────────────────────────────────────────────
// Re-exported from the shared centralized StatusBadge — Active/Banned/Deleted
// already resolve to the same success/danger/neutral tones the old bespoke
// badge used. Kept under this name so this file's own table and UserDetail.tsx
// (Admin 360 view) keep importing it unchanged.
export const StatusBadge = SharedStatusBadge;

// ── SKY-PASTEL TABLE ATOMS ────────────────────────────────────────────────────
// These were forked from UserAvatar/RoleBadge/StatusBadge above while
// UserDetail.tsx (which imports the exported originals) was still on the old
// skin — restyling the exports back then would have reskinned badges on an
// unmigrated page. Both pages are Sky-Pastel now, so the fork is gone: the
// Table* names are thin aliases kept only so the table's JSX call-sites don't
// need editing. One definition, no drift.

const TableUserAvatar = ({
  username, userId, avatarUrl,
}: { username: string; userId: number; avatarUrl?: string | null }) => (
  <UserAvatar username={username} userId={userId} avatarUrl={avatarUrl} size="sm" />
);

const TableRoleBadge = RoleBadge;
const TableStatusBadge = StatusBadge;

// ── MODAL WRAPPER ─────────────────────────────────────────────────────────────
// Name kept (call-sites unchanged) but the "game" skin is gone: navy blurred
// scrim + a single glass panel. The accent strip along the top edge is the only
// per-action colour, so create/edit/delete are distinguishable at a glance
// without three differently-coloured modals.
const MODAL_ACCENTS: Record<string, string> = {
  deep: "from-sky-deep-lo to-sky-deep",
  violet: "from-sky-violet to-sky-violet-deep",
  rose: "from-sky-rose to-sky-rose-deep",
};

const GameModal = ({
  isOpen, onClose, title, children, maxWidth = "max-w-lg", accent = "deep",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  accent?: keyof typeof MODAL_ACCENTS;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-sky-ink/45 backdrop-blur-[18px]" onClick={onClose} />
      <div
        className={`relative z-10 w-full ${maxWidth} my-4 sky-glass rounded-sky-card sky-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          aria-hidden
          className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${MODAL_ACCENTS[accent]}`}
        />
        <div className="relative flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/60">
          <h2 className="font-display text-base font-semibold text-sky-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-full text-sky-ink-2 hover:bg-white/70 hover:text-sky-ink active:scale-95 transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="relative px-6 pb-6 pt-5">{children}</div>
      </div>
    </div>
  );
};

// ── REUSABLE FORM INPUT ───────────────────────────────────────────────────────
const FormField = ({
  label, children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div>
    <label className="block text-xs font-semibold text-sky-ink-2 mb-1.5">
      {label}
    </label>
    {children}
  </div>
);

// One field treatment for every modal. The old signature took an `accent` so
// each modal could tint its focus ring a different colour — and it interpolated
// that into the class name, which Tailwind can't see at build time, so the ring
// never actually rendered. Focus is now always the primary deep ring: one
// consistent, and real, focus affordance.
const inputCls = () =>
  "w-full px-4 py-2.5 rounded-sky-chip border border-white/80 bg-white/60 text-sm text-sky-ink transition placeholder:text-sky-ink-3 focus:outline-hidden focus:border-sky-deep focus:bg-white/85 focus:ring-3 focus:ring-sky-deep/18";

// ── MODAL: CREATE ─────────────────────────────────────────────────────────────
const CreateUserForm = ({
  onClose, onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const { t } = useTranslation();
  const alert = useAlert();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "PLAYER",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminUserApi.createUser(form);
      alert.success(t("admin.userManagement.errors.createSuccess", "User created successfully."));
      onSuccess();
      onClose();
    } catch (err: any) {
      alert.error(err?.response?.data?.message ?? t("admin.userManagement.errors.createFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label={t("admin.userManagement.form.usernameLabel")}>
        <input
          required
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          placeholder={t("admin.userManagement.form.usernamePlaceholder")}
          className={inputCls()}
        />
      </FormField>
      <FormField label={t("admin.userManagement.form.emailLabel")}>
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder={t("admin.userManagement.form.emailPlaceholder")}
          className={inputCls()}
        />
      </FormField>
      <FormField label={t("admin.userManagement.form.passwordLabel")}>
        <input
          required
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder={t("admin.userManagement.form.passwordPlaceholder")}
          className={inputCls()}
        />
      </FormField>
      <FormField label={t("admin.userManagement.form.roleLabel")}>
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className={inputCls()}
        >
          <option value="PLAYER">PLAYER</option>
          <option value="MENTOR">MENTOR</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </FormField>
      <div className="flex gap-3 pt-1">
        <SkyButton type="button" variant="secondary" onClick={onClose} className="flex-1">
          {t("admin.userManagement.form.cancel")}
        </SkyButton>
        <SkyButton type="submit" variant="primary" disabled={submitting} className="flex-1">
          {submitting ? t("admin.userManagement.form.creating") : t("admin.userManagement.form.createTitle")}
        </SkyButton>
      </div>
    </form>
  );
};

// ── MODAL: UPDATE ─────────────────────────────────────────────────────────────
const UpdateUserForm = ({
  user, onClose, onSuccess,
}: {
  user: UserItem;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const { t } = useTranslation();
  const alert = useAlert();
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    username: user.username,
    email: user.email,
  });
  const [statusForm, setStatusForm] = useState<UpdateUserStatusPayload>({
    status: user.status,
    reason: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const profileChanged =
      profileForm.username !== user.username || profileForm.email !== user.email;
    const statusChanged = statusForm.status !== user.status;

    if (!profileChanged && !statusChanged) {
      onClose();
      return;
    }
    if (statusChanged && !statusForm.reason?.trim()) {
      setApiError(t("admin.userManagement.errors.reasonRequired"));
      return;
    }

    setSubmitting(true);
    setApiError(null);
    try {
      if (profileChanged) {
        await adminUserApi.updateUser(user.userId, profileForm);
      }
      if (statusChanged) {
        await adminUserApi.updateUserStatus(user.userId, statusForm);
      }
      alert.success(t("admin.userManagement.errors.updateSuccess", "User updated successfully."));
      onSuccess();
      onClose();
    } catch (err: any) {
      alert.error(err?.response?.data?.message ?? t("admin.userManagement.errors.updateFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {apiError && (
        <div className="relative overflow-hidden rounded-sky-chip bg-sky-rose/12 border border-sky-rose/30 p-3 pl-4 text-sm text-sky-rose-deep font-medium">
          <span aria-hidden className="absolute left-0 inset-y-0 w-[3px] bg-sky-rose" />
          {apiError}
        </div>
      )}

      <div className="flex items-center gap-3 p-3 rounded-sky-chip bg-white/55 border border-white/80">
        <UserAvatar username={user.username} userId={user.userId} size="md" />
        <div>
          <p className="font-display font-semibold text-sky-ink text-sm">{user.username}</p>
          <p className="text-xs text-sky-ink-3">ID: #{user.userId}</p>
        </div>
      </div>

      <FormField label={t("admin.userManagement.form.usernameLabel")}>
        <input
          required
          value={profileForm.username}
          onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
          className={inputCls()}
        />
      </FormField>
      <FormField label={t("admin.userManagement.form.emailLabel")}>
        <input
          required
          type="email"
          value={profileForm.email}
          onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
          className={inputCls()}
        />
      </FormField>

      <div className="border-t border-dashed border-sky-ink/15 pt-4 space-y-3">
        <p className="text-xs font-semibold text-sky-ink-3 uppercase tracking-wider">{t("admin.userManagement.form.statusLabel")}</p>
        <select
          value={statusForm.status}
          onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
          className={inputCls()}
        >
          <option value="Active">{t("admin.userManagement.form.statusActive")}</option>
          <option value="Banned">{t("admin.userManagement.form.statusBanned")}</option>
        </select>
        {statusForm.status !== user.status && (
          <input
            value={statusForm.reason}
            onChange={(e) => setStatusForm({ ...statusForm, reason: e.target.value })}
            placeholder={t("admin.userManagement.form.reasonPlaceholder")}
            className={inputCls()}
          />
        )}
      </div>

      <RolesEditor user={user} onRefresh={onSuccess} />

      <div className="flex gap-3 pt-1">
        <SkyButton type="button" variant="secondary" onClick={onClose} className="flex-1">
          {t("admin.userManagement.form.cancel")}
        </SkyButton>
        <SkyButton type="submit" variant="primary" disabled={submitting} className="flex-1">
          {submitting ? t("admin.userManagement.form.saving") : t("admin.userManagement.form.saveChanges")}
        </SkyButton>
      </div>
    </form>
  );
};

// ── MODAL: DELETE ─────────────────────────────────────────────────────────────
const DeleteConfirm = ({
  user, onClose, onSuccess,
}: {
  user: UserItem;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const { t } = useTranslation();
  const alert = useAlert();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await adminUserApi.deleteUser(user.userId);
      alert.success(t("admin.userManagement.errors.deleteSuccess", "User deleted successfully."));
      onSuccess();
      onClose();
    } catch (err: any) {
      alert.error(err?.response?.data?.message ?? t("admin.userManagement.errors.deleteFailed"));
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center py-2">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-sky-rose/14 border border-sky-rose/30 text-sky-rose-deep flex items-center justify-center">
          <TrashIcon />
        </div>
        <p className="font-display font-semibold text-sky-ink text-lg">{t("admin.userManagement.deleteModal.title")}</p>
        <p className="text-sm text-sky-ink-2 mt-1.5 leading-relaxed">
          {t("admin.userManagement.deleteModal.message")}{" "}
          <span className="font-semibold text-sky-ink">{user.username}</span>.
          <br />
          {t("admin.userManagement.deleteModal.warning")}
        </p>
      </div>
      <div className="relative overflow-hidden rounded-sky-chip bg-sky-rose/12 border border-sky-rose/30 p-3.5 pl-4 text-sm text-sky-rose-deep font-medium text-center">
        <span aria-hidden className="absolute left-0 inset-y-0 w-[3px] bg-sky-rose" />
        {t("admin.userManagement.deleteModal.dataLoss")}
      </div>
      <div className="flex gap-3">
        <SkyButton type="button" variant="secondary" onClick={onClose} disabled={deleting} className="flex-1">
          {t("admin.userManagement.deleteModal.keepUser")}
        </SkyButton>
        {/* The one saturated-rose fill in the app: an irreversible action is the
            only thing that earns more weight than the primary CTA. */}
        <SkyButton
          type="button"
          variant="destructive"
          onClick={handleDelete}
          disabled={deleting}
          className="flex-1 bg-sky-rose text-white border-sky-rose shadow-[0_10px_20px_-10px_rgba(196,112,138,0.95)] hover:bg-sky-rose-deep"
        >
          {deleting ? t("admin.userManagement.deleteModal.deleting") : t("admin.userManagement.deleteModal.deleteForever")}
        </SkyButton>
      </div>
    </div>
  );
};

// ── ROLES EDITOR (embedded inline in the Edit User modal) ──────────────────
const ALL_ROLES = ["PLAYER", "MENTOR", "ADMIN"] as const;

// Exported: reused by UserDetail.tsx (Admin 360 view, Overview tab — Role Management).
export const RolesEditor = ({
  user,
  onRefresh,
}: {
  user: UserItem;
  onRefresh: () => void;
}) => {
  const { t } = useTranslation();
  const alert = useAlert();
  const [localRoles, setLocalRoles] = useState<string[]>(user.roles);
  const [removingRole, setRemovingRole] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [selectedNewRole, setSelectedNewRole] = useState<string>("");

  // Roles not yet assigned to this user
  const availableRoles = ALL_ROLES.filter((r) => !localRoles.includes(r));
  // Keep the dropdown pointing at a valid option after each change
  const dropdownValue = availableRoles.includes(selectedNewRole as (typeof ALL_ROLES)[number])
    ? selectedNewRole
    : availableRoles[0] ?? "";

  const handleRemove = async (roleCode: string) => {
    setRemovingRole(roleCode);
    try {
      const res = await adminUserApi.removeRole(user.userId, roleCode);
      if (res.success && res.data) {
        setLocalRoles(res.data.roles);
        onRefresh();
      } else {
        alert.error(res.message ?? `Failed to remove ${roleCode}.`);
      }
    } catch (err: any) {
      alert.error(
        err?.response?.data?.message ?? `Cannot remove ${roleCode}: ${err?.message ?? "unknown error"}.`
      );
    } finally {
      setRemovingRole(null);
    }
  };

  const handleAssign = async () => {
    if (!dropdownValue) return;
    setAssigning(true);
    try {
      const res = await adminUserApi.assignRole(user.userId, { roleCode: dropdownValue });
      if (res.success && res.data) {
        setLocalRoles(res.data.roles);
        setSelectedNewRole("");
        onRefresh();
      } else {
        alert.error(res.message ?? `Failed to assign ${dropdownValue}.`);
      }
    } catch (err: any) {
      alert.error(
        err?.response?.data?.message ?? `Failed to assign ${dropdownValue}.`
      );
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="border-t border-dashed border-sky-ink/15 pt-4 space-y-3">
      <p className="text-xs font-semibold text-sky-ink-3 uppercase tracking-wider">
        {t("admin.userManagement.rolesModal.title")}
      </p>

      {localRoles.length === 0 ? (
        <p className="text-sm text-sky-ink-3 italic">{t("admin.userManagement.rolesModal.noRoles")}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {localRoles.map((role) => {
            const style = ROLE_STYLES[role] ?? "bg-sky-ink/7 text-sky-ink-2";
            const isRemoving = removingRole === role;
            return (
              <span
                key={role}
                className={`inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full font-semibold text-xs ${style}`}
              >
                {isRemoving && (
                  <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                )}
                {role}
                <button
                  type="button"
                  onClick={() => handleRemove(role)}
                  disabled={!!removingRole}
                  title={`Remove ${role}`}
                  className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-sky-ink/15 disabled:cursor-not-allowed transition-colors leading-none font-semibold text-sm shrink-0"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      {availableRoles.length === 0 ? (
        // "All roles assigned" is a success state → TEAL, never green (§4).
        <div className="rounded-sky-chip bg-sky-teal-bg border border-sky-teal/30 p-2.5 text-xs text-sky-teal font-semibold text-center">
          {t("admin.userManagement.rolesModal.allRolesAssigned")}
        </div>
      ) : (
        <div className="flex gap-2">
          <select
            value={dropdownValue}
            onChange={(e) => setSelectedNewRole(e.target.value)}
            className="flex-1 px-3 py-2 rounded-sky-chip border border-white/80 bg-white/60 text-sm font-medium text-sky-ink transition focus:outline-hidden focus:border-sky-deep focus:bg-white/85 focus:ring-3 focus:ring-sky-deep/18"
          >
            {availableRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {/* Violet = the mentor/role-grant accent, matching the MENTOR badge. */}
          <SkyButton
            type="button"
            size="sm"
            onClick={handleAssign}
            disabled={assigning || !dropdownValue}
            className="whitespace-nowrap from-sky-violet to-sky-violet-deep shadow-[0_10px_20px_-10px_rgba(124,106,199,0.95)]"
          >
            {assigning ? t("admin.userManagement.rolesModal.adding") : t("admin.userManagement.rolesModal.assign")}
          </SkyButton>
        </div>
      )}
    </div>
  );
};

// ── SKELETON ROW ─────────────────────────────────────────────────────────────
// Widths are fixed arbitrary values, not `w-${w}` interpolation — Tailwind
// scans source text, so a computed class name produces no CSS at all.
const SKELETON_WIDTHS = ["10rem", "16rem", "8rem", "7rem", "9rem", "6rem"];
const SkeletonRow = () => (
  <tr className="sky-table-row">
    {SKELETON_WIDTHS.map((w, i) => (
      <td key={i} className="px-5 py-4">
        <div className="h-4 max-w-full rounded-full bg-sky-ink/10 animate-pulse" style={{ width: w }} />
      </td>
    ))}
  </tr>
);

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function UserManagement() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const TABLE_HEADERS = [
    t("admin.userManagement.table.user"),
    t("admin.userManagement.table.email"),
    t("admin.userManagement.table.roles"),
    t("admin.userManagement.table.status"),
    t("admin.userManagement.table.createdAt"),
    t("admin.userManagement.table.actions"),
  ];

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Pagination state (driven by API response)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Search: immediate input value + debounced query value
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Debounce: update searchQuery 500ms after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await adminUserApi.getUsers({
        pageNumber: currentPage,
        pageSize: PAGE_SIZE,
        search: searchQuery.trim() || undefined,
      });
      setUsers(res.data);
      setTotalPages(res.totalPages);
      setTotalRecords(res.totalRecords);
      setHasPreviousPage(res.hasPreviousPage);
      setHasNextPage(res.hasNextPage);
    } catch (err: any) {
      setFetchError(err?.response?.data?.message ?? t("admin.userManagement.errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openModal = (type: Exclude<ModalType, null>, user?: UserItem) => {
    setSelectedUser(user ?? null);
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedUser(null);
  };

  const handleMutationSuccess = () => {
    // Re-fetch current page after any create / update / delete
    fetchUsers();
  };

  return (
    <>
      <PageMeta
        title="User Management | HabitEvolve Admin"
        description="Manage all users on the HabitEvolve platform"
      />
      <PageBreadcrumb pageTitle={t("admin.userManagement.pageTitle")} />

      <div className="space-y-5">
        <PageHeader
          icon={<Users className="w-6 h-6" strokeWidth={2.1} aria-hidden="true" />}
          tone="deep"
          title={t("admin.userManagement.pageTitle")}
          description="Manage all users on the HabitEvolve platform."
        />

        {/* ── TOP ACTION BAR ────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-ink-2 pointer-events-none">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder={t("admin.userManagement.searchPlaceholder")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-sky-chip border border-white/80 bg-white/60 text-sky-ink text-sm font-medium transition focus:outline-hidden focus:border-sky-deep focus:bg-white/85 focus:ring-3 focus:ring-sky-deep/18 placeholder:text-sky-ink-3"
            />
          </div>

          {/* Create button */}
          <SkyButton type="button" variant="primary" onClick={() => openModal("create")}>
            <PlusIcon />
            {t("admin.userManagement.createUser")}
          </SkyButton>
        </div>

        {/* ── TABLE CARD ──────────────────────────────────────────────────── */}
        <SkyCard variant="admin" className="p-0 overflow-hidden">
          {/* Card header */}
          <div className="px-6 py-4 border-b border-white/60 flex items-center gap-2 bg-white/40">
            <span className="text-sky-deep">
              <UserGroupIcon />
            </span>
            <span className="font-display font-semibold text-sky-ink text-sm">
              {t("admin.userManagement.allUsers")}
            </span>
            {!loading && (
              <span className="ml-auto font-display bg-sky-deep/12 text-sky-deep text-xs font-semibold px-2.5 py-0.5 rounded-full tabular-nums">
                {totalRecords}
              </span>
            )}
          </div>

          {/* Error banner */}
          {fetchError && (
            <div className="relative overflow-hidden mx-6 mt-5 rounded-sky-chip bg-sky-rose/12 border border-sky-rose/30 p-3 pl-4 text-sm text-sky-rose-deep font-medium flex items-center justify-between gap-3">
              <span aria-hidden className="absolute left-0 inset-y-0 w-[3px] bg-sky-rose" />
              <span>{fetchError}</span>
              <button
                type="button"
                onClick={fetchUsers}
                className="underline decoration-sky-rose/40 underline-offset-2 font-semibold hover:decoration-sky-rose-deep shrink-0"
              >
                {t("admin.userManagement.retry")}
              </button>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="sky-table-head border-b border-sky-ink/8">
                  {TABLE_HEADERS.map((h) => (
                    <th key={h} className="px-5 py-3 text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-sky-deep/8 text-sky-deep flex items-center justify-center">
                        <SearchIcon />
                      </div>
                      <p className="font-display text-sky-ink text-sm font-semibold">
                        {t("admin.userManagement.noUsersFound")}
                      </p>
                      <p className="text-sky-ink-3 text-xs mt-1">
                        {searchQuery ? t("admin.userManagement.tryDifferentSearch") : t("admin.userManagement.noUsersYet")}
                      </p>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    // sky-table-row already bakes in a bottom border + zebra
                    // striping + hover state (index.css) — no extra hover/
                    // border override here, that would just fight its own
                    // :hover/:nth-child rules over cascade order.
                    <tr key={user.userId} className="sky-table-row">
                      {/* User */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <TableUserAvatar username={user.username} userId={user.userId} />
                          <span className="font-semibold text-sky-ink text-sm">
                            {user.username}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-4 text-sm text-sky-ink-2 font-medium">
                        {user.email}
                      </td>

                      {/* Roles */}
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {user.roles.map((r) => (
                            <TableRoleBadge key={r} role={r} />
                          ))}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <TableStatusBadge status={user.status} />
                      </td>

                      {/* Created At */}
                      <td className="px-5 py-4 text-sm text-sky-ink-3 font-medium">
                        {formatDate(user.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <SkyButton
                            type="button"
                            variant="secondary"
                            size="icon"
                            title="View User"
                            onClick={() => navigate(`/user-management/${user.userId}`)}
                          >
                            <EyeIcon />
                          </SkyButton>
                          <SkyButton
                            type="button"
                            variant="secondary"
                            size="icon"
                            title="Edit User"
                            onClick={() => openModal("update", user)}
                          >
                            <PencilIcon />
                          </SkyButton>
                          <SkyButton
                            type="button"
                            variant="destructive"
                            size="icon"
                            title="Delete User"
                            onClick={() => openModal("delete", user)}
                          >
                            <TrashIcon />
                          </SkyButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination + footer */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            hasPreviousPage={hasPreviousPage}
            hasNextPage={hasNextPage}
            onPageChange={setCurrentPage}
          />

          <div className="px-6 py-3 border-t border-white/60 bg-white/40">
            <span className="text-xs text-sky-ink-3 font-medium tabular-nums">
              {loading ? t("admin.userManagement.loading") : `Showing ${users.length} of ${totalRecords} users — page ${currentPage} of ${totalPages}`}
            </span>
          </div>
        </SkyCard>
      </div>

      {/* ── MODALS ────────────────────────────────────────────────────────────── */}
      <GameModal isOpen={activeModal === "create"} onClose={closeModal} title={t("admin.userManagement.form.createTitle")} accent="deep">
        <CreateUserForm onClose={closeModal} onSuccess={handleMutationSuccess} />
      </GameModal>

      <GameModal isOpen={activeModal === "update"} onClose={closeModal} title={t("admin.userManagement.form.editTitle")} accent="violet">
        {selectedUser && (
          <UpdateUserForm
            user={selectedUser}
            onClose={closeModal}
            onSuccess={handleMutationSuccess}
          />
        )}
      </GameModal>

      <GameModal
        isOpen={activeModal === "delete"}
        onClose={closeModal}
        title={t("admin.userManagement.deleteModal.title")}
        maxWidth="max-w-md"
        accent="rose"
      >
        {selectedUser && (
          <DeleteConfirm
            user={selectedUser}
            onClose={closeModal}
            onSuccess={handleMutationSuccess}
          />
        )}
      </GameModal>
    </>
  );
}

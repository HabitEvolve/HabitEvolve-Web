import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Pagination from "../components/common/SkyPagination";
import adminUserApi from "../api/adminUserApi";
import { UserItem, UpdateUserStatusPayload } from "../types/api.types";
import { useAlert } from "../context/AlertContext";
import SkyCard from "../components/ui/card/SkyCard";
import SkyButton from "../components/ui/button/SkyButton";

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

const AVATAR_GRADIENTS = [
  "from-orange-200 to-pink-300",
  "from-sky-200 to-indigo-300",
  "from-emerald-200 to-teal-300",
  "from-purple-200 to-fuchsia-300",
  "from-yellow-200 to-orange-300",
  "from-rose-200 to-red-300",
  "from-cyan-200 to-blue-300",
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
      className={`${sizeMap[size]} flex-shrink-0 rounded-full border-black flex items-center justify-center font-black overflow-hidden ${
        showImage ? "" : `text-gray-800 bg-gradient-to-br ${getAvatarGradient(userId)}`
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
const ROLE_STYLES: Record<string, string> = {
  ADMIN:  "bg-red-100 border-red-400 text-red-800",
  MENTOR: "bg-purple-100 border-purple-400 text-purple-800",
  PLAYER: "bg-blue-100 border-blue-400 text-blue-800",
};
// Exported: reused by UserDetail.tsx (Admin 360 view).
export const RoleBadge = ({ role }: { role: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-black rounded-full border-2 ${ROLE_STYLES[role] ?? "bg-gray-100 border-gray-400 text-gray-700"}`}>
    {role}
  </span>
);

// ── STATUS BADGE ──────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  Active:  { badge: "bg-green-100 border-green-400 text-green-800", dot: "bg-green-500" },
  Banned:  { badge: "bg-red-100 border-red-400 text-red-800",       dot: "bg-red-500"   },
  Deleted: { badge: "bg-gray-100 border-gray-400 text-gray-500",    dot: "bg-gray-400"  },
};
// Exported: reused by UserDetail.tsx (Admin 360 view).
export const StatusBadge = ({ status }: { status: string }) => {
  const s = STATUS_STYLES[status] ?? { badge: "bg-gray-100 border-gray-400 text-gray-600", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border-2 ${s.badge}`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
      {status}
    </span>
  );
};

// ── SKY-PASTEL TABLE ATOMS ────────────────────────────────────────────────────
// Forked from UserAvatar/RoleBadge/StatusBadge above rather than restyling
// those in place: UserDetail.tsx imports the originals directly (`import {
// UserAvatar, StatusBadge, RoleBadge, RolesEditor, formatDate } from
// "./UserManagement"`), and that page hasn't been migrated yet. Restyling
// the exports would have silently reskinned badges on an otherwise-untouched
// neo-brutalism page. These Table-prefixed versions are local to this file's
// table only; the exported originals (and the CRUD modals that use them,
// also out of scope for this pass) are untouched.

const TableUserAvatar = ({
  username, userId, avatarUrl,
}: { username: string; userId: number; avatarUrl?: string | null }) => {
  const [imgError, setImgError] = useState(false);
  const showImage = !!avatarUrl && !imgError;
  return (
    <div
      className={`w-9 h-9 text-xs shrink-0 rounded-full flex items-center justify-center font-bold overflow-hidden ${
        showImage ? "" : `text-sky-ink bg-linear-to-br ${getAvatarGradient(userId)}`
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

const TABLE_ROLE_STYLES: Record<string, string> = {
  ADMIN: "bg-error-100 text-error-800",
  MENTOR: "bg-purple-100 text-purple-800",
  PLAYER: "bg-blue-100 text-blue-800",
};
const TableRoleBadge = ({ role }: { role: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full ${TABLE_ROLE_STYLES[role] ?? "bg-gray-100 text-gray-700"}`}>
    {role}
  </span>
);

const TABLE_STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  Active: { badge: "bg-success-100 text-success-800", dot: "bg-success-500" },
  Banned: { badge: "bg-error-100 text-error-800", dot: "bg-error-500" },
  Deleted: { badge: "bg-gray-100 text-gray-500", dot: "bg-gray-400" },
};
const TableStatusBadge = ({ status }: { status: string }) => {
  const s = TABLE_STATUS_STYLES[status] ?? { badge: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${s.badge}`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
      {status}
    </span>
  );
};

// ── GAMIFIED MODAL WRAPPER ────────────────────────────────────────────────────
const GameModal = ({
  isOpen, onClose, title, children, maxWidth = "max-w-lg",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative z-10 w-full ${maxWidth} my-4 bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0_0_#1A1D20]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b-2 border-gray-200">
          <h2 className="text-base font-black text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-black bg-gray-100 hover:bg-red-200 active:translate-x-0.5 active:translate-y-0.5 transition-all font-bold text-gray-700 text-sm leading-none"
          >
            ✕
          </button>
        </div>
        <div className="px-6 pb-6 pt-5">{children}</div>
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
    <label className="block text-xs font-black text-gray-700 mb-1.5 uppercase tracking-wide">
      {label}
    </label>
    {children}
  </div>
);

const inputCls = (accent = "orange") =>
  `w-full px-4 py-2.5 border-2 border-black rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-${accent}-300 bg-white placeholder:text-gray-400`;

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
          className={inputCls("orange")}
        />
      </FormField>
      <FormField label={t("admin.userManagement.form.emailLabel")}>
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder={t("admin.userManagement.form.emailPlaceholder")}
          className={inputCls("orange")}
        />
      </FormField>
      <FormField label={t("admin.userManagement.form.passwordLabel")}>
        <input
          required
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder={t("admin.userManagement.form.passwordPlaceholder")}
          className={inputCls("orange")}
        />
      </FormField>
      <FormField label={t("admin.userManagement.form.roleLabel")}>
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className={inputCls("orange")}
        >
          <option value="PLAYER">PLAYER</option>
          <option value="MENTOR">MENTOR</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </FormField>
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 border-2 border-black rounded-full font-bold text-sm bg-white text-gray-700 shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75 transition-all"
        >
          {t("admin.userManagement.form.cancel")}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2.5 border-2 border-black rounded-full font-black text-sm bg-orange-300 text-gray-900 shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {submitting ? t("admin.userManagement.form.creating") : t("admin.userManagement.form.createTitle")}
        </button>
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
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-3 text-sm text-red-700 font-semibold">
          {apiError}
        </div>
      )}

      <div className={`flex items-center gap-3 p-3 bg-amber-50 border-2 border-amber-200 rounded-2xl`}>
        <UserAvatar username={user.username} userId={user.userId} size="md" />
        <div>
          <p className="font-black text-gray-800 text-sm">{user.username}</p>
          <p className="text-xs text-gray-500">ID: #{user.userId}</p>
        </div>
      </div>

      <FormField label={t("admin.userManagement.form.usernameLabel")}>
        <input
          required
          value={profileForm.username}
          onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
          className={inputCls("amber")}
        />
      </FormField>
      <FormField label={t("admin.userManagement.form.emailLabel")}>
        <input
          required
          type="email"
          value={profileForm.email}
          onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
          className={inputCls("amber")}
        />
      </FormField>

      <div className="border-t-2 border-dashed border-gray-200 pt-4 space-y-3">
        <p className="text-xs font-black text-gray-400 uppercase tracking-wide">{t("admin.userManagement.form.statusLabel")}</p>
        <select
          value={statusForm.status}
          onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
          className={inputCls("amber")}
        >
          <option value="Active">{t("admin.userManagement.form.statusActive")}</option>
          <option value="Banned">{t("admin.userManagement.form.statusBanned")}</option>
        </select>
        {statusForm.status !== user.status && (
          <input
            value={statusForm.reason}
            onChange={(e) => setStatusForm({ ...statusForm, reason: e.target.value })}
            placeholder={t("admin.userManagement.form.reasonPlaceholder")}
            className={inputCls("amber")}
          />
        )}
      </div>

      <RolesEditor user={user} onRefresh={onSuccess} />

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 border-2 border-black rounded-full font-bold text-sm bg-white text-gray-700 shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75 transition-all"
        >
          {t("admin.userManagement.form.cancel")}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2.5 border-2 border-black rounded-full font-black text-sm bg-amber-300 text-gray-900 shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {submitting ? t("admin.userManagement.form.saving") : t("admin.userManagement.form.saveChanges")}
        </button>
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
        <div className="w-16 h-16 mx-auto mb-3 rounded-full border-4 border-black bg-red-100 flex items-center justify-center">
          <TrashIcon />
        </div>
        <p className="font-black text-gray-900 text-lg">{t("admin.userManagement.deleteModal.title")}</p>
        <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
          {t("admin.userManagement.deleteModal.message")}{" "}
          <span className="font-black text-gray-800">{user.username}</span>.
          <br />
          {t("admin.userManagement.deleteModal.warning")}
        </p>
      </div>
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-3.5 text-sm text-red-700 font-semibold text-center">
        {t("admin.userManagement.deleteModal.dataLoss")}
      </div>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          disabled={deleting}
          className="flex-1 py-2.5 border-2 border-black rounded-full font-bold text-sm bg-white text-gray-700 shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75 transition-all"
        >
          {t("admin.userManagement.deleteModal.keepUser")}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex-1 py-2.5 border-2 border-black rounded-full font-black text-sm bg-red-400 text-white shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {deleting ? t("admin.userManagement.deleteModal.deleting") : t("admin.userManagement.deleteModal.deleteForever")}
        </button>
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
    <div className="border-t-2 border-dashed border-gray-200 pt-4 space-y-3">
      <p className="text-xs font-black text-gray-400 uppercase tracking-wide">
        {t("admin.userManagement.rolesModal.title")}
      </p>

      {localRoles.length === 0 ? (
        <p className="text-sm text-gray-400 italic">{t("admin.userManagement.rolesModal.noRoles")}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {localRoles.map((role) => {
            const style = ROLE_STYLES[role] ?? "bg-gray-100 border-gray-400 text-gray-700";
            const isRemoving = removingRole === role;
            return (
              <span
                key={role}
                className={`inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-xl border-2 font-black text-xs ${style}`}
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
                  className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-black/15 disabled:cursor-not-allowed transition-colors leading-none font-black text-sm shrink-0"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      {availableRoles.length === 0 ? (
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-2.5 text-xs text-green-700 font-semibold text-center">
          {t("admin.userManagement.rolesModal.allRolesAssigned")}
        </div>
      ) : (
        <div className="flex gap-2">
          <select
            value={dropdownValue}
            onChange={(e) => setSelectedNewRole(e.target.value)}
            className="flex-1 px-3 py-2 border-2 border-black rounded-xl text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
          >
            {availableRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAssign}
            disabled={assigning || !dropdownValue}
            className="px-4 py-2 bg-violet-300 border-2 border-black rounded-xl font-black text-sm text-gray-900 shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[3px_3px_0_0_#1A1D20] transition-all whitespace-nowrap"
          >
            {assigning ? t("admin.userManagement.rolesModal.adding") : t("admin.userManagement.rolesModal.assign")}
          </button>
        </div>
      )}
    </div>
  );
};

// ── SKELETON ROW ─────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr className="sky-table-row">
    {[40, 64, 32, 28, 36, 24].map((w, i) => (
      <td key={i} className="px-5 py-4">
        <div className={`h-4 w-${w} rounded-full bg-gray-200 animate-pulse`} />
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
              className="w-full pl-10 pr-4 py-2.5 rounded-sky-chip border border-sky-surf-border bg-white text-sky-ink text-sm font-medium focus:outline-none focus:border-sky-deep focus:ring-3 focus:ring-sky-deep/20 transition-all placeholder:text-sky-ink-3"
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
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2 bg-sky-admin-bg-deep">
            <span className="text-sky-ink-2">
              <UserGroupIcon />
            </span>
            <span className="font-semibold text-sky-ink text-sm">
              {t("admin.userManagement.allUsers")}
            </span>
            {!loading && (
              <span className="ml-auto bg-admin-active/15 text-sky-ink text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {totalRecords}
              </span>
            )}
          </div>

          {/* Error banner */}
          {fetchError && (
            <div className="mx-6 mt-5 bg-error-50 border border-error-300 rounded-sky-chip p-3 text-sm text-error-700 font-semibold flex items-center justify-between">
              <span>{fetchError}</span>
              <button
                type="button"
                onClick={fetchUsers}
                className="underline font-semibold hover:no-underline"
              >
                {t("admin.userManagement.retry")}
              </button>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-sky-admin-bg-deep border-b border-slate-200">
                  {TABLE_HEADERS.map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-sky-ink"
                    >
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
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                        <SearchIcon />
                      </div>
                      <p className="text-sky-ink-2 text-sm font-semibold">
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

          <div className="px-6 py-3 border-t border-gray-200 bg-sky-admin-bg-deep">
            <span className="text-xs text-sky-ink-3 font-medium">
              {loading ? t("admin.userManagement.loading") : `Showing ${users.length} of ${totalRecords} users — page ${currentPage} of ${totalPages}`}
            </span>
          </div>
        </SkyCard>
      </div>

      {/* ── MODALS ────────────────────────────────────────────────────────────── */}
      <GameModal isOpen={activeModal === "create"} onClose={closeModal} title={t("admin.userManagement.form.createTitle")}>
        <CreateUserForm onClose={closeModal} onSuccess={handleMutationSuccess} />
      </GameModal>

      <GameModal isOpen={activeModal === "update"} onClose={closeModal} title={t("admin.userManagement.form.editTitle")}>
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

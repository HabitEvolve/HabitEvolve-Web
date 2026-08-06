import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Dropdown } from "../ui/dropdown/Dropdown";
import playerProfileApi from "../../api/userProfileApi";
import { useAuth } from "../../context/AuthContext";
import type { PlayerProfile } from "../../types/api.types";

const MENU_ITEMS = [
  {
    to: "/edit-profile",
    labelKey: "userDropdown.editProfile",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    to: "/profile",
    labelKey: "userDropdown.accountSettings",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    to: "/",
    labelKey: "userDropdown.support",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
];

// Derive initials from a username for the avatar fallback
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function UserDropdown() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<PlayerProfile | null>(null);

  // Fetch the logged-in user's profile on mount
  useEffect(() => {
    playerProfileApi.getMyProfile().then((res) => {
      if (res.success && res.data) setUser(res.data);
    }).catch(() => {
      // silently ignore — UI shows fallback text
    });
  }, []);

  const closeDropdown = () => setIsOpen(false);

  const handleLogout = () => {
    logout(); // clears React state + all localStorage keys + Supabase session
    // Navigation is handled by SignIn.tsx: isAuthenticated becomes false → shows login form
  };

  const displayName = user?.username ?? t("userDropdown.loading");
  const displayEmail = user?.email ?? "...";
  const hasAvatar = user?.hasAvatar && user?.avatarUrl;

  return (
    <div className="relative">
      {/* ── TRIGGER ───────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full sky-glass-chip sky-lift"
      >
        {/* Avatar: real image or gradient initials */}
        <span className="flex items-center justify-center w-9 h-9 rounded-full border border-white/70 overflow-hidden bg-linear-to-br from-sky-3 to-sky-deep-lo shrink-0">
          {hasAvatar ? (
            <img
              src={user!.avatarUrl!}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="font-display text-xs font-semibold text-white leading-none select-none">
              {user ? getInitials(displayName) : "?"}
            </span>
          )}
        </span>

        <span className="hidden sm:block text-sm font-medium text-sky-ink max-w-[96px] truncate">
          {displayName}
        </span>

        <svg
          className={`transition-transform duration-200 text-sky-ink-3 shrink-0 ${isOpen ? "rotate-180" : ""}`}
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* ── DROPDOWN PANEL ────────────────────────────────────────── */}
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-3 w-64 sky-glass-menu sky-in"
      >
        {/* Header: name + email */}
        <div className="relative px-4 py-4 bg-linear-to-br from-sky-3/60 to-transparent border-b border-sky-ink/10">
          <p className="font-display font-semibold text-sky-ink text-sm leading-tight truncate">{displayName}</p>
          <p className="text-xs text-sky-ink-2 mt-0.5 truncate">{displayEmail}</p>
        </div>

        {/* Nav items */}
        <ul className="relative p-2 space-y-0.5 border-b border-sky-ink/10">
          {MENU_ITEMS.map(({ to, labelKey, icon }) => (
            <li key={labelKey}>
              <Link
                to={to}
                onClick={closeDropdown}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-sky-sm text-sm font-medium text-sky-ink hover:bg-sky-3/55 hover:text-sky-deep transition"
              >
                <span className="text-sky-ink-2 group-hover:text-sky-deep transition-colors shrink-0">
                  {icon}
                </span>
                {t(labelKey)}
              </Link>
            </li>
          ))}
        </ul>

        {/* Sign out */}
        <div className="relative p-2">
          <button
            type="button"
            onClick={handleLogout}
            className="group flex items-center gap-3 px-3 py-2.5 w-full rounded-sky-sm text-sm font-medium text-sky-rose-deep hover:bg-sky-rose/12 transition"
          >
            <span className="text-sky-rose group-hover:text-sky-rose-deep transition-colors shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            {t("userDropdown.signOut")}
          </button>
        </div>
      </Dropdown>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Dropdown } from "../ui/dropdown/Dropdown";
import playerProfileApi from "../../api/userProfileApi";
import { useAuth } from "../../context/AuthContext";
import type { PlayerProfile } from "../../types/api.types";

const MENU_ITEMS = [
  {
    to: "/edit-profile",
    label: "Edit profile",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    to: "/profile",
    label: "Account settings",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    to: "/",
    label: "Support",
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

  const displayName = user?.username ?? "Loading...";
  const displayEmail = user?.email ?? "...";
  const hasAvatar = user?.hasAvatar && user?.avatarUrl;

  return (
    <div className="relative">
      {/* ── TRIGGER ───────────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-2 bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-600 rounded-full shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
      >
        {/* Avatar: real image or gradient initials */}
        <span className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-black overflow-hidden bg-gradient-to-br from-orange-300 to-yellow-300 flex-shrink-0">
          {hasAvatar ? (
            <img
              src={user!.avatarUrl!}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs font-black text-gray-900 dark:text-white leading-none select-none">
              {user ? getInitials(displayName) : "?"}
            </span>
          )}
        </span>

        <span className="hidden sm:block text-sm font-black text-gray-900 dark:text-white max-w-[96px] truncate">
          {displayName}
        </span>

        <svg
          className={`transition-transform duration-200 text-gray-600 dark:text-gray-400 flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* ── DROPDOWN PANEL ────────────────────────────────────────── */}
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-3 w-64 bg-white dark:bg-gray-800 border-4 border-black dark:border-gray-600 rounded-2xl shadow-[4px_4px_0_0_#1A1D20] overflow-hidden"
      >
        {/* Header: name + email */}
        <div className="px-4 py-4 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-gray-700 dark:to-gray-700 border-b-2 border-black dark:border-gray-600">
          <p className="font-black text-gray-900 dark:text-white text-sm leading-tight truncate">{displayName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium truncate">{displayEmail}</p>
        </div>

        {/* Nav items */}
        <ul className="p-2 space-y-0.5 border-b-2 border-black dark:border-gray-600">
          {MENU_ITEMS.map(({ to, label, icon }) => (
            <li key={label}>
              <Link
                to={to}
                onClick={closeDropdown}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-orange-100 dark:hover:bg-gray-700 hover:border-black dark:hover:border-gray-500 hover:shadow-[2px_2px_0_0_#1A1D20] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
              >
                <span className="text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors flex-shrink-0">
                  {icon}
                </span>
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Sign out */}
        <div className="p-2">
          <button
            onClick={handleLogout}
            className="group flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-bold text-red-600 dark:text-red-400 border-2 border-transparent hover:bg-red-100 dark:hover:bg-red-900/30 hover:border-red-400 hover:shadow-[2px_2px_0_0_#DC2626] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
          >
            <span className="text-red-400 group-hover:text-red-600 transition-colors flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            Sign out
          </button>
        </div>
      </Dropdown>
    </div>
  );
}

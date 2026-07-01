import { useTranslation } from "react-i18next";
import type { JoinPolicy } from "../../../types/api.types";

// ── DESIGN TOKENS ───────────────────────────────────────────────────────────────
// Shared by every file under PartyWorkspace/ — same "Guild Command Center"
// neo-brutalism system used across all Mentor pages this session: tinted ink
// (game-outline / brand-300 in dark) instead of pure black, `gray-25` instead
// of pure white, every pastel surface carries an explicit dark: pair.
export const inkBorder = "border-game-outline dark:border-brand-300";
export const shadowSm = "shadow-[3px_3px_0_0_var(--color-game-outline)] dark:shadow-[3px_3px_0_0_var(--color-brand-300)]";
export const shadowMd = "shadow-[5px_5px_0_0_var(--color-game-outline)] dark:shadow-[5px_5px_0_0_var(--color-brand-300)]";
export const shadowLg = "shadow-[9px_9px_0_0_var(--color-game-outline)] dark:shadow-[9px_9px_0_0_var(--color-brand-300)]";
export const easeExpo = "ease-[cubic-bezier(0.16,1,0.3,1)]";

export const btnBase =
  `inline-flex items-center gap-2 px-4 py-2.5 font-black text-sm border-[3px] ${inkBorder} rounded-full ${shadowSm} ` +
  "hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] " +
  "active:shadow-none active:translate-x-[3px] active:translate-y-[3px] " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 " +
  `disabled:${shadowSm} transition-all duration-150 ${easeExpo}`;

export const inputCls =
  `w-full px-4 py-2.5 border-[3px] ${inkBorder} rounded-2xl text-sm font-medium bg-gray-25 dark:bg-gray-800 ` +
  "focus:outline-none focus:ring-4 focus:ring-orange-200 dark:focus:ring-orange-500/20 placeholder:text-gray-400";

export const getMentorId = () => {
  const id = localStorage.getItem("user_id");
  return id ? parseInt(id, 10) : 0;
};

// ── SPINNER ───────────────────────────────────────────────────────────────────
export const Spinner = ({ size = 20 }: { size?: number }) => (
  <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

// ── JOIN POLICY ───────────────────────────────────────────────────────────────
export const POLICY_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  PUBLIC: { bg: "bg-success-100 dark:bg-success-500/15", border: "border-success-500", text: "text-success-800 dark:text-success-300" },
  APPROVAL_REQUIRED: { bg: "bg-warning-100 dark:bg-warning-500/15", border: "border-warning-500", text: "text-warning-800 dark:text-warning-300" },
  INVITE_ONLY: { bg: "bg-purple-100 dark:bg-purple-500/15", border: "border-purple-500", text: "text-purple-800 dark:text-purple-300" },
};

export const JOIN_POLICIES = ["PUBLIC", "APPROVAL_REQUIRED", "INVITE_ONLY"] as const;

export const POLICY_LABEL_KEYS: Record<string, string> = {
  PUBLIC: "admin.partyManagement.form.policyPublic",
  APPROVAL_REQUIRED: "admin.partyManagement.form.policyApproval",
  INVITE_ONLY: "admin.partyManagement.form.policyInvite",
};

export const JoinPolicyBadge = ({ policy }: { policy: JoinPolicy | string }) => {
  const { t } = useTranslation();
  const s = POLICY_STYLES[policy] ?? POLICY_STYLES["PUBLIC"];
  const label = t(POLICY_LABEL_KEYS[policy] ?? "admin.partyManagement.form.policyPublic");
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black border-2 shrink-0 ${s.bg} ${s.border} ${s.text}`}
    >
      {label}
    </span>
  );
};

// ── CAPACITY METER ────────────────────────────────────────────────────────────
export const CapacityMeter = ({ current, max }: { current: number; max: number }) => {
  const { t } = useTranslation();
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  const isFull = max > 0 && current >= max;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-2 min-w-[56px] max-w-[120px] rounded-full bg-gray-100 border border-game-outline/20 dark:border-brand-300/20 overflow-hidden shrink-0">
        <div
          className={`h-full rounded-full transition-all duration-500 ${easeExpo} ${isFull ? "bg-orange-500" : "bg-brand-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold text-gray-500 whitespace-nowrap">
        {isFull
          ? t("admin.partyManagement.hub.full")
          : t("admin.partyManagement.hub.capacity", { current, max })}
      </span>
    </div>
  );
};

// ── GAME MODAL ────────────────────────────────────────────────────────────────
export const GameModal = ({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) => (
  <div className="fixed inset-0 bg-game-outline/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
    <div className={`bg-gray-25 dark:bg-gray-800 border-[3px] ${inkBorder} rounded-[28px] ${shadowLg} w-full max-w-md my-4`}>
      <div className={`flex items-center justify-between px-6 py-5 border-b-[3px] ${inkBorder}`}>
        <h2 className="text-lg font-black text-gray-900">{title}</h2>
        <button
          onClick={onClose}
          className={`flex items-center justify-center w-8 h-8 border-[3px] ${inkBorder} rounded-xl bg-gray-25 dark:bg-gray-700 shadow-[2px_2px_0_0_var(--color-game-outline)] dark:shadow-[2px_2px_0_0_var(--color-brand-300)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all duration-150 ${easeExpo}`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="px-6 py-6">{children}</div>
    </div>
  </div>
);

// ── PANEL (varied tint per section — never identical nested cards) ───────────
export const Panel = ({
  title, icon, badge, tint = "plain", children,
}: {
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  tint?: "plain" | "mint" | "peach";
  children: React.ReactNode;
}) => {
  const tintClass =
    tint === "mint" ? "bg-brand-50 dark:bg-brand-500/10"
      : tint === "peach" ? "bg-orange-50 dark:bg-orange-500/10"
        : "bg-gray-25 dark:bg-gray-800";
  return (
    <div className={`${tintClass} border-[3px] ${inkBorder} rounded-[28px] ${shadowMd} p-6 sm:p-7`}>
      <div className="flex items-center justify-between gap-3 mb-5">
        <h2 className="text-sm font-black uppercase tracking-wide text-gray-700 flex items-center gap-2">
          <span className="text-game-outline dark:text-brand-300">{icon}</span>
          {title}
        </h2>
        {badge}
      </div>
      {children}
    </div>
  );
};

// ── COUNTER BADGE ─────────────────────────────────────────────────────────────
export const CountBadge = ({ count, color = "bg-blue-100 text-blue-900 dark:bg-blue-500/15 dark:text-blue-300" }: { count: number; color?: string }) => (
  <span className={`flex items-center justify-center h-6 min-w-7 px-2 border-2 ${inkBorder} rounded-full text-xs font-black shadow-[1px_1px_0_0_var(--color-game-outline)] dark:shadow-[1px_1px_0_0_var(--color-brand-300)] ${color}`}>
    {count}
  </span>
);

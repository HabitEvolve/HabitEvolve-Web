import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import SkyCard from "../../../components/ui/card/SkyCard";

// ── Sky-Pastel design helpers for the whole PartyWorkspace/ tree ────────────
// shared.tsx (the old inkBorder/shadowSm-Lg/btnBase/POLICY_STYLES/
// JoinPolicyBadge/CapacityMeter/GameModal/Panel/CountBadge module) has been
// fully retired — every consumer (PartyList, PartyWorkspace shell, and all 5
// tabs) now imports from here instead. Deleted rather than left as unused
// dead code so nobody accidentally reaches for the neo-brutalism versions.

export const getMentorId = () => {
  const id = localStorage.getItem("user_id");
  return id ? parseInt(id, 10) : 0;
};

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

export const JOIN_POLICIES = ["PUBLIC", "APPROVAL_REQUIRED", "INVITE_ONLY"] as const;

export const POLICY_LABEL_KEYS: Record<string, string> = {
  PUBLIC: "admin.partyManagement.form.policyPublic",
  APPROVAL_REQUIRED: "admin.partyManagement.form.policyApproval",
  INVITE_ONLY: "admin.partyManagement.form.policyInvite",
};

export const easeExpo = "ease-[cubic-bezier(0.16,1,0.3,1)]";

export const inputCls =
  "w-full px-4 py-3 rounded-sky-chip border border-sky-surf-border bg-transparent text-sm font-medium " +
  "text-sky-ink focus:outline-none focus:border-sky-deep focus:ring-3 focus:ring-sky-deep/20 placeholder:text-sky-ink-3";

export const POLICY_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  PUBLIC: { bg: "bg-success-100", text: "text-success-800", ring: "ring-success-400" },
  APPROVAL_REQUIRED: { bg: "bg-warning-100", text: "text-warning-800", ring: "ring-warning-400" },
  INVITE_ONLY: { bg: "bg-purple-100", text: "text-purple-800", ring: "ring-purple-400" },
};

export const JoinPolicyBadge = ({ policy }: { policy: string }) => {
  const { t } = useTranslation();
  const s = POLICY_STYLES[policy] ?? POLICY_STYLES.PUBLIC;
  const label = t(POLICY_LABEL_KEYS[policy] ?? "admin.partyManagement.form.policyPublic");
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${s.bg} ${s.text}`}>
      {label}
    </span>
  );
};

export const CapacityMeter = ({ current, max }: { current: number; max: number }) => {
  const { t } = useTranslation();
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  const isFull = max > 0 && current >= max;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-2 min-w-14 max-w-30 rounded-full bg-sky-3/40 overflow-hidden shrink-0">
        <div
          className={`h-full rounded-full transition-all duration-500 ${easeExpo} ${isFull ? "bg-warning-500" : "bg-sky-deep"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-sky-ink-2 whitespace-nowrap">
        {isFull
          ? t("admin.partyManagement.hub.full")
          : t("admin.partyManagement.hub.capacity", { current, max })}
      </span>
    </div>
  );
};

// Sky-Pastel Panel: replaces shared.tsx's Panel (tint prop drove a solid bg +
// ink border there). Here every tint sits on the same sky-glass surface;
// "tint" instead adds a soft colored wash overlay so panels stay visually
// distinct without breaking the one glass-card language.
export const Panel = ({
  title, icon, badge, tint = "plain", children,
}: {
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  tint?: "plain" | "mint" | "peach";
  children: React.ReactNode;
}) => {
  const washClass =
    tint === "mint" ? "bg-success-500/5"
      : tint === "peach" ? "bg-sky-peach/10"
        : null;
  return (
    <SkyCard variant="mentor" className="relative">
      {washClass && <div className={`absolute inset-0 rounded-sky-card ${washClass} pointer-events-none`} aria-hidden="true" />}
      <div className="relative flex items-center justify-between gap-3 mb-5">
        <h2 className="text-sky-small font-semibold uppercase tracking-wide text-sky-ink-2 flex items-center gap-2">
          <span className="text-sky-deep">{icon}</span>
          {title}
        </h2>
        {badge}
      </div>
      <div className="relative">{children}</div>
    </SkyCard>
  );
};

// Sky-Pastel CountBadge: replaces shared.tsx's hard-bordered version. `color`
// still takes a tinted-bg + text className pair — that part of the API is
// unchanged, only the ink border + hard shadow are dropped.
export const CountBadge = ({ count, color = "bg-blue-100 text-blue-900" }: { count: number; color?: string }) => (
  <span className={`flex items-center justify-center h-6 min-w-7 px-2 rounded-full text-xs font-semibold ${color}`}>
    {count}
  </span>
);

export const SkyModal = ({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) => createPortal(
  <div
    className="fixed inset-0 bg-sky-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
    onClick={onClose}
  >
    <SkyCard variant="mentor" className="w-full max-w-md my-4 p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-6 py-5 border-b border-sky-surf-border">
        <h2 className="text-sky-h3 font-bold text-sky-ink">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-full text-sky-ink-2 hover:bg-sky-3/30 hover:text-sky-ink transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="px-6 py-6">{children}</div>
    </SkyCard>
  </div>,
  document.body
);

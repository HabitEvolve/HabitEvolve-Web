import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import {
  ArrowLeft, Coins, Flame, ImageOff, Loader2, Swords, ClipboardList,
  BarChart3, History as HistoryIcon, FileClock, UserRoundCog, Camera, Users as UsersIcon, Trophy,
} from "lucide-react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Pagination from "../components/common/Pagination";
import adminUserApi from "../api/adminUserApi";
import playerDataApi from "../api/playerDataApi";
import { adminAuditApi } from "../api/adminAuditApi";
import { useAlert } from "../context/AlertContext";
import { UserItem, UpdateUserStatusPayload } from "../types/api.types";
import { WalletDto, DailyStreakDto, UserProofDto } from "../types/userDetail.types";
import { UserQuestDto, UserQuestsDto, UserStatsDto, UserActivityDto } from "../types/userWorkspace.types";
import type { AuditLogDto } from "../types/adminAudit.types";
import { UserAvatar, StatusBadge, RoleBadge, RolesEditor, formatDate } from "./UserManagement";

const AUDIT_PAGE_SIZE = 10;

const errMsg = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

// ── PROOF STATUS BADGE (small, for the Overview proof gallery) ──────────────
const PROOF_STATUS_STYLES: Record<string, string> = {
  Approved: "bg-green-100 border-green-400 text-green-800",
  Rejected: "bg-red-100 border-red-400 text-red-800",
  Pending: "bg-amber-100 border-amber-400 text-amber-800",
  Suspicious: "bg-orange-100 border-orange-400 text-orange-800",
  AiChecking: "bg-sky-100 border-sky-400 text-sky-800",
};
const ProofStatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${PROOF_STATUS_STYLES[status] ?? "bg-gray-100 border-gray-400 text-gray-700"}`}>
    {status}
  </span>
);

// ── QUEST STATUS BADGE ───────────────────────────────────────────────────────
const QUEST_STATUS_STYLES: Record<string, string> = {
  InProgress: "bg-sky-100 border-sky-400 text-sky-800",
  Submitted: "bg-amber-100 border-amber-400 text-amber-800",
  Approved: "bg-green-100 border-green-400 text-green-800",
  Rejected: "bg-red-100 border-red-400 text-red-800",
  Expired: "bg-gray-100 border-gray-400 text-gray-600",
  Failed: "bg-red-100 border-red-400 text-red-800",
  NotStarted: "bg-gray-100 border-gray-300 text-gray-500",
};
const QuestStatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black border-2 ${QUEST_STATUS_STYLES[status] ?? "bg-gray-100 border-gray-400 text-gray-700"}`}>
    {status}
  </span>
);
const DIFFICULTY_STYLES: Record<string, string> = {
  EASY: "bg-emerald-100 border-emerald-400 text-emerald-800",
  NORMAL: "bg-blue-100 border-blue-400 text-blue-800",
  HARD: "bg-rose-100 border-rose-400 text-rose-800",
};
const DifficultyBadge = ({ difficulty }: { difficulty: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${DIFFICULTY_STYLES[difficulty] ?? "bg-gray-100 border-gray-400 text-gray-700"}`}>
    {difficulty}
  </span>
);

// ── SKELETONS ─────────────────────────────────────────────────────────────────
const SkeletonBlock = ({ className = "", style }: { className?: string; style?: React.CSSProperties }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${className}`} style={style} />
);
const CardSkeletonGrid = ({ count = 3 }: { count?: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonBlock key={i} className="h-32 border-2 border-gray-200" />
    ))}
  </div>
);
const ChartSkeleton = ({ height = 260 }: { height?: number }) => (
  <SkeletonBlock className="w-full" style={{ height }} />
);
const TimelineSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex gap-3">
        <SkeletonBlock className="w-9 h-9 rounded-full shrink-0" />
        <SkeletonBlock className="h-9 flex-1" />
      </div>
    ))}
  </div>
);
const TableSkeleton = ({ rows = 6 }: { rows?: number }) => (
  <div className="divide-y divide-gray-100 dark:divide-white/5">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="px-4 py-3">
        <SkeletonBlock className="h-4 w-full" />
      </div>
    ))}
  </div>
);

// ── EMPTY STATE ───────────────────────────────────────────────────────────────
const EmptyState = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) => (
  <div className="flex flex-col items-center gap-2 py-14 text-gray-400">
    {icon}
    <p className="font-black text-sm text-gray-500">{title}</p>
    {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
  </div>
);

// ── TAB: OVERVIEW ─────────────────────────────────────────────────────────────
const OverviewTab = ({
  user,
  onUserChange,
}: {
  user: UserItem;
  onUserChange: (u: UserItem) => void;
}) => {
  const { t } = useTranslation();
  const alert = useAlert();

  const [wallet, setWallet] = useState<WalletDto | null>(null);
  const [streak, setStreak] = useState<DailyStreakDto | null>(null);
  const [proofs, setProofs] = useState<UserProofDto[]>([]);
  const [detailLoading, setDetailLoading] = useState(true);

  const [statusForm, setStatusForm] = useState<UpdateUserStatusPayload>({ status: user.status, reason: "" });
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDetailLoading(true);
    Promise.allSettled([
      playerDataApi.getWallet(user.userId),
      playerDataApi.getDailyStreak(user.userId),
      playerDataApi.getProofs(user.userId),
    ]).then(([walletRes, streakRes, proofsRes]) => {
      if (cancelled) return;
      if (walletRes.status === "fulfilled" && walletRes.value.success) setWallet(walletRes.value.data ?? null);
      if (streakRes.status === "fulfilled" && streakRes.value.success) setStreak(streakRes.value.data ?? null);
      if (proofsRes.status === "fulfilled" && proofsRes.value.success) setProofs(proofsRes.value.data ?? []);
    }).finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [user.userId]);

  const handleSaveStatus = async () => {
    if (statusForm.status === user.status) return;
    if (!statusForm.reason?.trim()) {
      alert.error(t("admin.userManagement.errors.reasonRequired"));
      return;
    }
    setSavingStatus(true);
    try {
      const res = await adminUserApi.updateUserStatus(user.userId, statusForm);
      if (res.success && res.data) {
        onUserChange(res.data);
        alert.success(t("admin.userManagement.errors.updateSuccess", "User updated successfully."));
      } else {
        alert.error(res.message ?? "Failed to update status.");
      }
    } catch (err) {
      alert.error(errMsg(err) ?? "Failed to update status.");
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Basic Info ───────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2">Basic Info</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "User ID", value: `#${user.userId}` },
            { label: "Email Verified", value: user.emailVerified ? "Verified" : "Unverified" },
            { label: "Created At", value: formatDate(user.createdAt) },
            { label: "Updated At", value: user.updatedAt ? formatDate(user.updatedAt) : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-2xl p-3">
              <p className="text-xs font-black text-gray-400 uppercase tracking-wide">{label}</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Status control ───────────────────────────────────────────────── */}
      <div className="border-2 border-black rounded-2xl p-4 bg-white dark:bg-white/3 shadow-[3px_3px_0_0_#1A1D20]">
        <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-3">Account Status</p>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusForm.status}
            onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
            className="px-3.5 py-2 border-2 border-black rounded-xl text-sm font-bold bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
          >
            <option value="Active">Active</option>
            <option value="Banned">Banned</option>
          </select>
          {statusForm.status !== user.status && (
            <input
              value={statusForm.reason}
              onChange={(e) => setStatusForm({ ...statusForm, reason: e.target.value })}
              placeholder="Reason for this change…"
              className="flex-1 min-w-[200px] px-3.5 py-2 border-2 border-black rounded-xl text-sm font-medium bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-300 placeholder:text-gray-400"
            />
          )}
          <button
            onClick={handleSaveStatus}
            disabled={savingStatus || statusForm.status === user.status}
            className="px-4 py-2 bg-amber-300 border-2 border-black rounded-full font-black text-sm text-gray-900 shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[3px_3px_0_0_#1A1D20] transition-all whitespace-nowrap"
          >
            {savingStatus ? "Saving…" : "Save Status"}
          </button>
        </div>
      </div>

      {/* ── Role Management ──────────────────────────────────────────────── */}
      <div className="border-2 border-black rounded-2xl p-4 bg-white dark:bg-white/3 shadow-[3px_3px_0_0_#1A1D20]">
        <RolesEditor user={user} onRefresh={() => { /* RolesEditor keeps its own local role list in sync */ }} />
      </div>

      {/* ── Wallet + Streak ──────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2">Wallet & Streak</p>
        {detailLoading ? (
          <CardSkeletonGrid count={3} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3 flex items-center gap-2.5">
              <Coins className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-wide">Gold</p>
                <p className="text-sm font-black text-amber-800">{wallet ? wallet.totalGold.toLocaleString() : "—"}</p>
              </div>
            </div>
            <div className="bg-fuchsia-50 border-2 border-fuchsia-200 rounded-2xl p-3">
              <p className="text-[10px] font-black text-fuchsia-500 uppercase tracking-wide">Gems</p>
              <p className="text-sm font-black text-fuchsia-800">{wallet ? wallet.gemsBalance.toLocaleString() : "—"}</p>
            </div>
            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-3">
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wide">M-Gold</p>
              <p className="text-sm font-black text-indigo-800">{wallet ? wallet.mentorGoldBalance.toLocaleString() : "—"}</p>
            </div>
            <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-3 flex items-center gap-2.5 col-span-2 sm:col-span-1">
              <Flame className="w-5 h-5 text-orange-600 shrink-0" />
              <div>
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-wide">Current Streak</p>
                <p className="text-sm font-black text-orange-800">{streak ? `${streak.currentStreak}d` : "—"}</p>
              </div>
            </div>
            <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-3">
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-wide">Best Streak</p>
              <p className="text-sm font-black text-rose-800">{streak ? `${streak.bestStreak}d` : "—"}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Verification Portrait ────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2">Verification Portrait</p>
        <div className="flex items-center gap-4">
          <a
            href={user.portraitUrl ?? undefined}
            target={user.portraitUrl ? "_blank" : undefined}
            rel="noreferrer"
            className="relative w-24 h-24 rounded-xl border-2 border-black overflow-hidden bg-gray-100 shadow-[2px_2px_0_0_#1A1D20] shrink-0"
          >
            {user.portraitUrl ? (
              <img src={user.portraitUrl} alt="Verification portrait" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <Camera className="w-6 h-6 text-gray-300" />
              </div>
            )}
          </a>
          <div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${
                user.hasVerifiedPortrait
                  ? "bg-green-100 border-green-400 text-green-800"
                  : "bg-gray-100 border-gray-400 text-gray-600"
              }`}
            >
              {user.hasVerifiedPortrait ? "Verified" : "Not verified"}
            </span>
            {user.portraitVerifiedAt && (
              <p className="text-xs text-gray-400 font-medium mt-1">Verified {fmtDateTime(user.portraitVerifiedAt)}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Proof Gallery ────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2">
          Recent Proofs {!detailLoading && `(${proofs.length})`}
        </p>
        {detailLoading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm font-semibold py-3">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : proofs.length === 0 ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm font-medium py-3">
            <ImageOff className="w-4 h-4" /> No proofs submitted yet.
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 max-h-64 overflow-y-auto pr-1">
            {proofs.slice(0, 12).map((p) => {
              const thumb = p.mediaUrls?.[0];
              return (
                <a
                  key={p.proofId}
                  href={thumb ?? undefined}
                  target={thumb ? "_blank" : undefined}
                  rel="noreferrer"
                  className="relative aspect-square rounded-xl border-2 border-black overflow-hidden bg-gray-100 shadow-[2px_2px_0_0_#1A1D20]"
                  title={p.questTitle ?? p.proofType}
                >
                  {thumb ? (
                    <img src={thumb} alt={p.questTitle ?? "proof"} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                      <ImageOff className="w-5 h-5 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1 right-1">
                    <ProofStatusBadge status={p.status} />
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ── TAB: CURRENT QUESTS ───────────────────────────────────────────────────────
const QuestCard = ({ quest, mode }: { quest: UserQuestDto; mode: "active" | "completed" }) => (
  <div className="border-2 border-black rounded-2xl p-4 bg-white dark:bg-white/3 shadow-[3px_3px_0_0_#1A1D20] space-y-2">
    <div className="flex items-start justify-between gap-2">
      <p className="font-black text-sm text-gray-900 dark:text-gray-100 leading-snug">{quest.title}</p>
      <QuestStatusBadge status={quest.status} />
    </div>
    <div className="flex flex-wrap gap-1.5">
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border bg-violet-100 border-violet-400 text-violet-800">
        {quest.questType}
      </span>
      <DifficultyBadge difficulty={quest.difficulty} />
      {quest.proofType && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border bg-gray-100 border-gray-400 text-gray-700">
          {quest.proofType}
        </span>
      )}
    </div>
    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium pt-1 border-t border-dashed border-gray-200 dark:border-white/10">
      <span>
        {mode === "active"
          ? quest.deadlineAt ? `Due ${formatDate(quest.deadlineAt)}` : "No deadline"
          : quest.completedAt ? `Completed ${formatDate(quest.completedAt)}` : "—"}
      </span>
      <span className="font-black text-gray-700 dark:text-gray-200">
        {quest.rewardGold}g · {quest.rewardXp}xp{quest.damage > 0 ? ` · ${quest.damage} dmg` : ""}
      </span>
    </div>
  </div>
);

const QuestsTab = ({ data, loading }: { data: UserQuestsDto | null; loading: boolean }) => {
  if (loading) {
    return (
      <div className="space-y-6">
        <CardSkeletonGrid count={3} />
        <CardSkeletonGrid count={3} />
      </div>
    );
  }

  const active = data?.active ?? [];
  const recentCompleted = data?.recentCompleted ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2">
          Active Quests ({active.length})
        </p>
        {active.length === 0 ? (
          <EmptyState icon={<ClipboardList className="w-10 h-10 opacity-40" />} title="No active quests right now" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {active.map((q) => <QuestCard key={q.questId} quest={q} mode="active" />)}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2">
          Recently Completed ({recentCompleted.length})
        </p>
        {recentCompleted.length === 0 ? (
          <EmptyState icon={<Trophy className="w-10 h-10 opacity-40" />} title="No completed quests yet" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentCompleted.map((q) => <QuestCard key={q.questId} quest={q} mode="completed" />)}
          </div>
        )}
      </div>
    </div>
  );
};

// ── TAB: ANALYTICS ────────────────────────────────────────────────────────────
// Tailwind's JIT compiler needs literal class strings — a template-interpolated
// `bg-${color}-50` is invisible to its scanner, so every variant is spelled out here.
const STAT_TILE_STYLES = {
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", label: "text-emerald-500", value: "text-emerald-800" },
  violet: { bg: "bg-violet-50", border: "border-violet-200", label: "text-violet-500", value: "text-violet-800" },
  rose: { bg: "bg-rose-50", border: "border-rose-200", label: "text-rose-500", value: "text-rose-800" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", label: "text-amber-500", value: "text-amber-800" },
} as const;
const StatTile = ({ label, value, color }: { label: string; value: string; color: keyof typeof STAT_TILE_STYLES }) => {
  const s = STAT_TILE_STYLES[color];
  return (
    <div className={`${s.bg} border-2 ${s.border} rounded-2xl p-3`}>
      <p className={`text-[10px] font-black ${s.label} uppercase tracking-wide`}>{label}</p>
      <p className={`text-lg font-black ${s.value}`}>{value}</p>
    </div>
  );
};

const AnalyticsTab = ({ data, loading }: { data: UserStatsDto | null; loading: boolean }) => {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-20 border-2 border-gray-200" />)}
        </div>
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  const daily = data?.daily ?? [];
  const categories = daily.map((d) => d.date.slice(5)); // MM-DD

  const chartFont = { fontFamily: "Space Grotesk, sans-serif" };
  const completionOptions: ApexOptions = {
    chart: { ...chartFont, height: 260, type: "area", toolbar: { show: false } },
    colors: ["#7C3AED"],
    stroke: { curve: "smooth", width: 2 },
    dataLabels: { enabled: false },
    fill: { type: "gradient", gradient: { opacityFrom: 0.35, opacityTo: 0.05 } },
    xaxis: { categories, labels: { style: { fontSize: "10px" }, rotate: 0 } },
    yaxis: { max: 100, labels: { formatter: (v: number) => `${Math.round(v ?? 0)}%`, style: { fontSize: "11px" } } },
    grid: { xaxis: { lines: { show: false } }, borderColor: "rgba(148,163,184,0.2)" },
  };
  const completionSeries = [{ name: "Completion Rate", data: daily.map((d) => d.completionRate) }];

  const damageOptions: ApexOptions = {
    chart: { ...chartFont, height: 260, type: "bar", toolbar: { show: false } },
    colors: ["#f04438"],
    plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
    dataLabels: { enabled: false },
    xaxis: { categories, labels: { style: { fontSize: "10px" } } },
    yaxis: { labels: { style: { fontSize: "11px" } } },
    grid: { xaxis: { lines: { show: false } }, borderColor: "rgba(148,163,184,0.2)" },
  };
  const damageSeries = [{ name: "Damage Dealt", data: daily.map((d) => d.damageDealt) }];

  const goldOptions: ApexOptions = {
    chart: { ...chartFont, height: 260, type: "bar", toolbar: { show: false } },
    colors: ["#f79009"],
    plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
    dataLabels: { enabled: false },
    xaxis: { categories, labels: { style: { fontSize: "10px" } } },
    yaxis: { labels: { style: { fontSize: "11px" } } },
    grid: { xaxis: { lines: { show: false } }, borderColor: "rgba(148,163,184,0.2)" },
  };
  const goldSeries = [{ name: "Gold Earned", data: daily.map((d) => d.goldEarned) }];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Quests Completed" value={`${data?.totalQuestsCompleted ?? 0}`} color="emerald" />
        <StatTile label="Completion Rate" value={`${data?.overallCompletionRate ?? 0}%`} color="violet" />
        <StatTile label="Damage Dealt" value={`${(data?.totalDamageDealt ?? 0).toLocaleString()}`} color="rose" />
        <StatTile label="Gold Earned" value={`${(data?.totalGoldEarned ?? 0).toLocaleString()}`} color="amber" />
      </div>

      <div className="border-2 border-black rounded-2xl p-4 bg-white dark:bg-white/3 shadow-[3px_3px_0_0_#1A1D20]">
        <p className="font-black text-sm text-gray-800 dark:text-gray-100 mb-3">Habit Completion Rate — last {data?.rangeDays ?? 30} days</p>
        {daily.length > 0 ? (
          <div className="max-w-full overflow-x-auto"><div className="min-w-100"><Chart options={completionOptions} series={completionSeries} type="area" height={260} /></div></div>
        ) : <p className="text-sm text-gray-400 font-medium py-10 text-center">No daily habit data in this range.</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border-2 border-black rounded-2xl p-4 bg-white dark:bg-white/3 shadow-[3px_3px_0_0_#1A1D20]">
          <p className="font-black text-sm text-gray-800 dark:text-gray-100 mb-3">Boss Damage per Day</p>
          {daily.length > 0 ? (
            <div className="max-w-full overflow-x-auto"><div className="min-w-100"><Chart options={damageOptions} series={damageSeries} type="bar" height={260} /></div></div>
          ) : <p className="text-sm text-gray-400 font-medium py-10 text-center">No raid activity in this range.</p>}
        </div>
        <div className="border-2 border-black rounded-2xl p-4 bg-white dark:bg-white/3 shadow-[3px_3px_0_0_#1A1D20]">
          <p className="font-black text-sm text-gray-800 dark:text-gray-100 mb-3">Gold Earned per Day</p>
          {daily.length > 0 ? (
            <div className="max-w-full overflow-x-auto"><div className="min-w-100"><Chart options={goldOptions} series={goldSeries} type="bar" height={260} /></div></div>
          ) : <p className="text-sm text-gray-400 font-medium py-10 text-center">No reward history in this range.</p>}
        </div>
      </div>
    </div>
  );
};

// ── TAB: ACTIVITY HISTORY ─────────────────────────────────────────────────────
const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  PROOF_SUBMITTED: <Camera className="w-4 h-4" />,
  RAID_CONTRIBUTION: <Swords className="w-4 h-4" />,
  PARTY_JOIN_REQUESTED: <UsersIcon className="w-4 h-4" />,
};
const ACTIVITY_COLORS: Record<string, string> = {
  PROOF_SUBMITTED: "bg-sky-200",
  RAID_CONTRIBUTION: "bg-rose-200",
  PARTY_JOIN_REQUESTED: "bg-violet-200",
};

const HistoryTab = ({ data, loading }: { data: UserActivityDto[]; loading: boolean }) => {
  if (loading) return <TimelineSkeleton />;
  if (data.length === 0) {
    return <EmptyState icon={<HistoryIcon className="w-10 h-10 opacity-40" />} title="No recent activity" subtitle="Proof submissions, boss raids, and party requests will show up here." />;
  }
  return (
    <div className="relative pl-4">
      <div className="absolute left-[1.15rem] top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-white/10" />
      <div className="space-y-4">
        {data.map((a, i) => (
          <div key={i} className="relative flex gap-3">
            <div className={`w-9 h-9 rounded-full border-2 border-black flex items-center justify-center shrink-0 z-10 ${ACTIVITY_COLORS[a.type] ?? "bg-gray-200"}`}>
              {ACTIVITY_ICONS[a.type] ?? <HistoryIcon className="w-4 h-4" />}
            </div>
            <div className="flex-1 bg-white dark:bg-white/3 border-2 border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{a.description}</p>
              <p className="text-xs text-gray-400 mt-0.5">{fmtDateTime(a.timestamp)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── TAB: EDIT HISTORY (AUDIT LOGS) ────────────────────────────────────────────
const AuditTab = ({ userId }: { userId: number }) => {
  const alert = useAlert();
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAuditApi.getAuditLogs({
        pageNumber: page,
        pageSize: AUDIT_PAGE_SIZE,
        targetType: "User",
        targetId: userId,
      });
      setLogs(res.data ?? []);
      setTotalPages(res.totalPages ?? 1);
      setTotalRecords(res.totalRecords ?? 0);
      setHasNextPage(res.hasNextPage ?? false);
      setHasPreviousPage(res.hasPreviousPage ?? false);
    } catch (err) {
      alert.error(errMsg(err) ?? "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }, [userId, page, alert]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-white/3 border-2 border-black rounded-2xl shadow-[3px_3px_0_0_#1A1D20] overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : logs.length === 0 ? (
          <EmptyState icon={<FileClock className="w-10 h-10 opacity-40" />} title="No edit history for this account" subtitle="Status changes, role assignments, and profile edits will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-white/2">
                  {["Actor", "Action", "Before", "After", "Note", "When"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {logs.map((log) => (
                  <tr key={log.auditLogId} className="hover:bg-amber-50/40 dark:hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-300">{log.actorUserId != null ? `User #${log.actorUserId}` : "SYSTEM"}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[16rem] truncate" title={log.beforeValue ?? ""}>{log.beforeValue ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[16rem] truncate" title={log.afterValue ?? ""}>{log.afterValue ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[12rem] truncate" title={log.note ?? ""}>{log.note ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDateTime(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          onPageChange={setPage}
        />
      </div>
      {!loading && logs.length > 0 && (
        <p className="text-xs text-gray-400 font-medium">{totalRecords} audit entr{totalRecords === 1 ? "y" : "ies"} total</p>
      )}
    </div>
  );
};

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
type TabId = "overview" | "quests" | "analytics" | "history" | "audit";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <UserRoundCog className="w-4 h-4" /> },
  { id: "quests", label: "Current Quests", icon: <ClipboardList className="w-4 h-4" /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "history", label: "Activity History", icon: <HistoryIcon className="w-4 h-4" /> },
  { id: "audit", label: "Edit History", icon: <FileClock className="w-4 h-4" /> },
];

export default function UserDetail() {
  const { userId: userIdParam } = useParams<{ userId: string }>();
  const userId = Number(userIdParam);
  const navigate = useNavigate();
  const alert = useAlert();

  const [tab, setTab] = useState<TabId>("overview");
  const [user, setUser] = useState<UserItem | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);

  const [quests, setQuests] = useState<UserQuestsDto | null>(null);
  const [questsLoading, setQuestsLoading] = useState(true);
  const [stats, setStats] = useState<UserStatsDto | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [history, setHistory] = useState<UserActivityDto[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (!userId || Number.isNaN(userId)) return;
    let cancelled = false;

    setUserLoading(true);
    setUserError(null);
    adminUserApi.getUserById(userId).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setUser(res.data);
      else setUserError(res.message ?? "User not found.");
    }).catch((err) => {
      if (!cancelled) setUserError(errMsg(err) ?? "Failed to load user.");
    }).finally(() => { if (!cancelled) setUserLoading(false); });

    setQuestsLoading(true);
    adminUserApi.getUserQuests(userId).then((res) => {
      if (!cancelled && res.success) setQuests(res.data ?? null);
    }).catch(() => { if (!cancelled) alert.error("Failed to load quests."); })
      .finally(() => { if (!cancelled) setQuestsLoading(false); });

    setStatsLoading(true);
    adminUserApi.getUserStats(userId, 30).then((res) => {
      if (!cancelled && res.success) setStats(res.data ?? null);
    }).catch(() => { if (!cancelled) alert.error("Failed to load analytics."); })
      .finally(() => { if (!cancelled) setStatsLoading(false); });

    setHistoryLoading(true);
    adminUserApi.getUserHistory(userId, 50).then((res) => {
      if (!cancelled && res.success) setHistory(res.data ?? []);
    }).catch(() => { if (!cancelled) alert.error("Failed to load activity history."); })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (!userId || Number.isNaN(userId)) {
    return <EmptyState icon={<ClipboardList className="w-10 h-10 opacity-40" />} title="Invalid user id" />;
  }

  return (
    <>
      <PageMeta title="User Detail | HabitEvolve Admin" description="360-degree view of a user's progress, analytics, and history." />
      <PageBreadcrumb pageTitle="User Detail" />

      <div className="space-y-6">
        <button
          onClick={() => navigate("/user-management")}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to User Management
        </button>

        {/* ── Header ────────────────────────────────────────────────────── */}
        {userLoading ? (
          <div className="flex items-center gap-4">
            <SkeletonBlock className="w-16 h-16 rounded-full" />
            <div className="space-y-2">
              <SkeletonBlock className="h-6 w-40" />
              <SkeletonBlock className="h-4 w-56" />
            </div>
          </div>
        ) : userError || !user ? (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 text-sm text-red-700 font-semibold">
            {userError ?? "User not found."}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <UserAvatar username={user.username} userId={user.userId} size="lg" />
            <div>
              <p className="text-xl font-black text-gray-900 dark:text-gray-100">{user.username}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{user.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={user.status} />
                {user.roles.map((r) => <RoleBadge key={r} role={r} />)}
              </div>
            </div>
          </div>
        )}

        {!userLoading && user && (
          <>
            {/* ── Tab bar ─────────────────────────────────────────────────── */}
            <div className="flex items-end gap-1 border-b-2 border-black/10 overflow-x-auto">
              {TABS.map((tt) => (
                <button
                  key={tt.id}
                  onClick={() => setTab(tt.id)}
                  className={`px-5 py-2.5 font-black text-sm rounded-t-2xl border-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    tab === tt.id
                      ? "bg-orange-300 border-black text-gray-900 shadow-[3px_0_0_0_#1A1D20,0_3px_0_0_#1A1D20] -mb-0.5 relative z-10"
                      : "bg-white dark:bg-gray-800 border-black/20 dark:border-white/20 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {tt.icon} {tt.label}
                </button>
              ))}
            </div>

            {/* ── Tab content ─────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#1e2a3a] border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] p-5">
              {tab === "overview" && <OverviewTab user={user} onUserChange={setUser} />}
              {tab === "quests" && <QuestsTab data={quests} loading={questsLoading} />}
              {tab === "analytics" && <AnalyticsTab data={stats} loading={statsLoading} />}
              {tab === "history" && <HistoryTab data={history} loading={historyLoading} />}
              {tab === "audit" && <AuditTab userId={user.userId} />}
            </div>
          </>
        )}
      </div>
    </>
  );
}

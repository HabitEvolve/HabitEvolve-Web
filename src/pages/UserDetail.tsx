import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import {
  ArrowLeft, Coins, Flame, ImageOff, Loader2, Swords, ClipboardList,
  BarChart3, History as HistoryIcon, FileClock, UserRoundCog, Camera, Users as UsersIcon, Trophy,
  Gem, Wallet, ShieldCheck, ShieldOff, AlertTriangle,
} from "lucide-react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import PageHeader from "../components/common/PageHeader";
import Pagination from "../components/common/SkyPagination";
import adminUserApi from "../api/adminUserApi";
import playerDataApi from "../api/playerDataApi";
import { adminAuditApi } from "../api/adminAuditApi";
import { useAlert } from "../context/AlertContext";
import { UserItem, UpdateUserStatusPayload } from "../types/api.types";
import { WalletDto, DailyStreakDto, UserProofDto } from "../types/userDetail.types";
import { UserQuestDto, UserQuestsDto, UserStatsDto, UserActivityDto } from "../types/userWorkspace.types";
import type { AuditLogDto } from "../types/adminAudit.types";
import { UserAvatar, StatusBadge, RoleBadge, RolesEditor, formatDate } from "./UserManagement";
import SharedStatusBadge, { type StatusTone } from "../components/common/StatusBadge";
import { skyChartBase, skyAreaFill, skyBarPlotOptions, SKY_SEMANTIC, SKY } from "../utils/skyChart";

const AUDIT_PAGE_SIZE = 10;

const errMsg = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

// ── PROOF STATUS BADGE (small, for the Overview proof gallery) ──────────────
// Delegates to the shared lifecycle StatusBadge. "Suspicious" isn't in its
// default map (falls back neutral) and "AiChecking" reads info/deep here
// rather than the shared default peach/pending, so both get pinned overrides
// to keep the original tones.
const PROOF_STATUS_OVERRIDES: Record<string, StatusTone> = {
  Suspicious: "pending",
  AiChecking: "info",
};
const ProofStatusBadge = ({ status }: { status: string }) => (
  <SharedStatusBadge
    status={status}
    toneOverride={PROOF_STATUS_OVERRIDES[status]}
    className="shadow-[0_1px_4px_rgba(36,52,77,0.18)]"
  />
);

// ── QUEST STATUS BADGE ───────────────────────────────────────────────────────
// Same shared delegation. InProgress/Expired/NotStarted read differently here
// than the shared map's defaults (info/neutral/neutral vs. pending/danger/
// pending), so those three get pinned overrides — matches the same quest
// status semantics used on AdminPartyDetail.tsx.
const QUEST_STATUS_OVERRIDES: Record<string, StatusTone> = {
  InProgress: "info",
  Expired: "neutral",
  NotStarted: "neutral",
};
const QuestStatusBadge = ({ status }: { status: string }) => (
  <SharedStatusBadge status={status} toneOverride={QUEST_STATUS_OVERRIDES[status]} />
);
// Difficulty is a cool→warm ramp, not a good/bad axis — HARD borrows the warm
// "damage" accent rather than destructive rose.
const DIFFICULTY_STYLES: Record<string, string> = {
  EASY: "bg-sky-teal-bg text-sky-teal",
  NORMAL: "bg-sky-deep/10 text-sky-deep",
  HARD: "bg-sky-peach/22 text-sky-peach-deep",
};
const DifficultyBadge = ({ difficulty }: { difficulty: string }) => (
  <span className={`sky-badge text-[10px] px-2 py-0.5 ${DIFFICULTY_STYLES[difficulty] ?? "bg-sky-ink/7 text-sky-ink-2"}`}>
    {difficulty}
  </span>
);

// ── SKELETONS ─────────────────────────────────────────────────────────────────
const SkeletonBlock = ({ className = "", style }: { className?: string; style?: React.CSSProperties }) => (
  <div className={`animate-pulse bg-sky-ink/8 rounded-sky-md ${className}`} style={style} />
);
const CardSkeletonGrid = ({ count = 3 }: { count?: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonBlock key={i} className="h-32" />
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
  <div className="divide-y divide-sky-ink/8">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="px-4 py-3">
        <SkeletonBlock className="h-4 w-full" />
      </div>
    ))}
  </div>
);

// ── SHARED ATOMS ──────────────────────────────────────────────────────────────
// Small-caps section label that opens each block — quieter than a heading, but
// it still gives the eye a hard edge to scan down.
const eyebrow = "text-[10px] font-semibold text-sky-ink-3 uppercase tracking-[0.14em]";

const inputCls = [
  "px-4 py-2.5 rounded-sky-chip border border-white/80 bg-white/60",
  "text-sm font-medium text-sky-ink transition",
  "focus:outline-hidden focus:border-sky-deep focus:bg-white/85 focus:ring-3 focus:ring-sky-deep/18",
  "placeholder:text-sky-ink-3 placeholder:font-normal",
].join(" ");

// ── EMPTY STATE ───────────────────────────────────────────────────────────────
const EmptyState = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) => (
  <div className="flex flex-col items-center gap-2.5 py-14">
    <span className="grid place-items-center w-14 h-14 rounded-full bg-sky-deep/8 text-sky-deep">{icon}</span>
    <p className="font-display text-sm font-semibold text-sky-ink">{title}</p>
    {subtitle && <p className="text-xs font-medium text-sky-ink-3 max-w-xs text-center">{subtitle}</p>}
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
    <div className="space-y-7">
      {/* ── Basic Info ───────────────────────────────────────────────────── */}
      <div>
        <p className={`${eyebrow} mb-2.5`}>Basic Info</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "User ID", value: `#${user.userId}` },
            { label: "Email Verified", value: user.emailVerified ? "Verified" : "Unverified" },
            { label: "Created At", value: formatDate(user.createdAt) },
            { label: "Updated At", value: user.updatedAt ? formatDate(user.updatedAt) : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="sky-glass-chip rounded-sky-md p-3.5">
              <p className={eyebrow}>{label}</p>
              <p className="text-sm font-semibold text-sky-ink tabular-nums mt-1">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Status control ───────────────────────────────────────────────── */}
      <div className="sky-glass-admin rounded-sky-card p-4">
        <p className={`${eyebrow} mb-3`}>Account Status</p>
        <div className="relative flex flex-wrap items-center gap-3">
          <select
            value={statusForm.status}
            onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
            className={inputCls}
          >
            <option value="Active">Active</option>
            <option value="Banned">Banned</option>
          </select>
          {statusForm.status !== user.status && (
            <input
              value={statusForm.reason}
              onChange={(e) => setStatusForm({ ...statusForm, reason: e.target.value })}
              placeholder="Reason for this change…"
              className={`${inputCls} flex-1 min-w-[200px]`}
            />
          )}
          <button
            onClick={handleSaveStatus}
            disabled={savingStatus || statusForm.status === user.status}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sky-chip bg-linear-to-b from-sky-deep-lo to-sky-deep text-white text-sm font-semibold shadow-sky-fill transition hover:-translate-y-px hover:shadow-[0_10px_22px_-8px_rgba(36,52,77,0.45)] active:translate-y-0 active:scale-[0.98] disabled:opacity-45 disabled:translate-y-0 disabled:shadow-none disabled:cursor-not-allowed whitespace-nowrap"
          >
            {savingStatus ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : "Save Status"}
          </button>
        </div>
      </div>

      {/* ── Role Management ──────────────────────────────────────────────── */}
      <div className="sky-glass-admin rounded-sky-card p-4">
        <div className="relative">
          <RolesEditor user={user} onRefresh={() => { /* RolesEditor keeps its own local role list in sync */ }} />
        </div>
      </div>

      {/* ── Wallet + Streak ──────────────────────────────────────────────── */}
      <div>
        <p className={`${eyebrow} mb-2.5`}>Wallet &amp; Streak</p>
        {detailLoading ? (
          <CardSkeletonGrid count={3} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Currency tiles ride the reward/epic/primary accents; the streak pair
                is warm because a streak is a reward stat, not a status. */}
            {[
              { label: "Gold",           value: wallet ? wallet.totalGold.toLocaleString() : "—",           icon: <Coins className="w-4 h-4" />, tint: "bg-sky-peach/14",  glyph: "bg-sky-peach/25 text-sky-peach-deep",   text: "text-sky-peach-deep" },
              { label: "Gems",           value: wallet ? wallet.gemsBalance.toLocaleString() : "—",         icon: <Gem className="w-4 h-4" />,   tint: "bg-sky-violet/10", glyph: "bg-sky-violet/20 text-sky-violet-deep", text: "text-sky-violet-deep" },
              { label: "M-Gold",         value: wallet ? wallet.mentorGoldBalance.toLocaleString() : "—",   icon: <Wallet className="w-4 h-4" />,tint: "bg-sky-deep/8",    glyph: "bg-sky-deep/15 text-sky-deep",          text: "text-sky-deep" },
              { label: "Current Streak", value: streak ? `${streak.currentStreak}d` : "—",                  icon: <Flame className="w-4 h-4" />, tint: "bg-sky-peach/14",  glyph: "bg-sky-peach/25 text-sky-peach-deep",   text: "text-sky-peach-deep" },
              { label: "Best Streak",    value: streak ? `${streak.bestStreak}d` : "—",                     icon: <Trophy className="w-4 h-4" />,tint: "bg-sky-violet/10", glyph: "bg-sky-violet/20 text-sky-violet-deep", text: "text-sky-violet-deep" },
            ].map((tile) => (
              <div key={tile.label} className={`sky-lift rounded-sky-md border border-white/70 ${tile.tint} p-3.5 flex items-center gap-3`}>
                <span className={`grid place-items-center w-9 h-9 rounded-sky-chip shrink-0 ${tile.glyph}`}>{tile.icon}</span>
                <div className="min-w-0">
                  <p className={eyebrow}>{tile.label}</p>
                  <p className={`font-display text-lg font-semibold tabular-nums leading-tight ${tile.text}`}>{tile.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Verification Portrait ────────────────────────────────────────── */}
      <div>
        <p className={`${eyebrow} mb-2.5`}>Verification Portrait</p>
        <div className="flex items-center gap-4">
          <a
            href={user.portraitUrl ?? undefined}
            target={user.portraitUrl ? "_blank" : undefined}
            rel="noreferrer"
            className="relative w-24 h-24 rounded-sky-md overflow-hidden bg-white/60 ring-1 ring-white/80 shadow-[0_6px_18px_-8px_rgba(36,52,77,0.35)] shrink-0 transition hover:-translate-y-0.5 hover:shadow-[0_12px_26px_-10px_rgba(36,52,77,0.45)]"
          >
            {user.portraitUrl ? (
              <img src={user.portraitUrl} alt="Verification portrait" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center bg-sky-3/40">
                <Camera className="w-6 h-6 text-sky-ink-3" />
              </div>
            )}
          </a>
          <div>
            {/* Glyph + tint, never colour alone. */}
            <span className={`sky-badge ${user.hasVerifiedPortrait ? "sky-badge-success" : "sky-badge-neutral"}`}>
              {user.hasVerifiedPortrait ? <ShieldCheck className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
              {user.hasVerifiedPortrait ? "Verified" : "Not verified"}
            </span>
            {user.portraitVerifiedAt && (
              <p className="text-xs text-sky-ink-3 font-medium mt-1.5">Verified {fmtDateTime(user.portraitVerifiedAt)}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Proof Gallery ────────────────────────────────────────────────── */}
      <div>
        <p className={`${eyebrow} mb-2.5`}>
          Recent Proofs {!detailLoading && <span className="tabular-nums">({proofs.length})</span>}
        </p>
        {detailLoading ? (
          <div className="flex items-center gap-2 text-sky-ink-3 text-sm font-medium py-3">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : proofs.length === 0 ? (
          <div className="flex items-center gap-2 text-sky-ink-3 text-sm font-medium py-3">
            <ImageOff className="w-4 h-4" /> No proofs submitted yet.
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 max-h-64 overflow-y-auto pr-1">
            {proofs.slice(0, 12).map((p) => {
              const thumb = p.mediaUrls?.[0];
              return (
                <a
                  key={p.proofId}
                  href={thumb ?? undefined}
                  target={thumb ? "_blank" : undefined}
                  rel="noreferrer"
                  className="group relative aspect-square rounded-sky-md overflow-hidden bg-white/60 ring-1 ring-white/80 shadow-[0_4px_14px_-6px_rgba(36,52,77,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_22px_-8px_rgba(36,52,77,0.42)]"
                  title={p.questTitle ?? p.proofType}
                >
                  {thumb ? (
                    <img src={thumb} alt={p.questTitle ?? "proof"} className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.04]" />
                  ) : (
                    <div className="w-full h-full grid place-items-center bg-sky-3/40">
                      <ImageOff className="w-5 h-5 text-sky-ink-3" />
                    </div>
                  )}
                  {/* Scrim keeps the badge legible over any photograph. */}
                  <span className="absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-sky-ink/45 to-transparent" />
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
  <div className="sky-glass-admin sky-lift rounded-sky-card p-4 space-y-2.5">
    <div className="relative flex items-start justify-between gap-2">
      <p className="font-display text-sm font-semibold text-sky-ink leading-snug">{quest.title}</p>
      <QuestStatusBadge status={quest.status} />
    </div>
    <div className="relative flex flex-wrap gap-1.5">
      <span className="sky-badge text-[10px] px-2 py-0.5 bg-sky-violet/12 text-sky-violet-deep">
        {quest.questType}
      </span>
      <DifficultyBadge difficulty={quest.difficulty} />
      {quest.proofType && (
        <span className="sky-badge sky-badge-neutral text-[10px] px-2 py-0.5">
          {quest.proofType}
        </span>
      )}
    </div>
    <div className="relative flex items-center justify-between gap-2 text-xs font-medium text-sky-ink-3 pt-2.5 border-t border-sky-ink/8">
      <span className="tabular-nums">
        {mode === "active"
          ? quest.deadlineAt ? `Due ${formatDate(quest.deadlineAt)}` : "No deadline"
          : quest.completedAt ? `Completed ${formatDate(quest.completedAt)}` : "—"}
      </span>
      {/* Reward line is the payoff — warm accent, display face, tabular figures. */}
      <span className="font-display font-semibold tabular-nums text-sky-peach-deep whitespace-nowrap">
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
    <div className="space-y-7">
      <div>
        <p className={`${eyebrow} mb-2.5`}>
          Active Quests <span className="tabular-nums">({active.length})</span>
        </p>
        {active.length === 0 ? (
          <EmptyState icon={<ClipboardList className="w-6 h-6" />} title="No active quests right now" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {active.map((q) => <QuestCard key={q.questId} quest={q} mode="active" />)}
          </div>
        )}
      </div>
      <div>
        <p className={`${eyebrow} mb-2.5`}>
          Recently Completed <span className="tabular-nums">({recentCompleted.length})</span>
        </p>
        {recentCompleted.length === 0 ? (
          <EmptyState icon={<Trophy className="w-6 h-6" />} title="No completed quests yet" />
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
  teal:   { bg: "bg-sky-teal-bg/55",  value: "text-sky-teal" },
  violet: { bg: "bg-sky-violet/10",   value: "text-sky-violet-deep" },
  deep:   { bg: "bg-sky-deep/8",      value: "text-sky-deep" },
  peach:  { bg: "bg-sky-peach/14",    value: "text-sky-peach-deep" },
} as const;
const StatTile = ({ label, value, color }: { label: string; value: string; color: keyof typeof STAT_TILE_STYLES }) => {
  const s = STAT_TILE_STYLES[color];
  return (
    <div className={`sky-lift rounded-sky-md border border-white/70 ${s.bg} p-3.5`}>
      <p className={eyebrow}>{label}</p>
      <p className={`font-display text-2xl font-semibold tabular-nums leading-tight mt-1 ${s.value}`}>{value}</p>
    </div>
  );
};

// Panel wrapper for a chart — glass card, display-face title, quiet caption slot.
const ChartPanel = ({ title, caption, children }: { title: string; caption?: string; children: React.ReactNode }) => (
  <div className="sky-glass-admin rounded-sky-card p-5">
    <div className="relative mb-4">
      <p className="font-display text-sm font-semibold text-sky-ink">{title}</p>
      {caption && <p className="text-xs font-medium text-sky-ink-3 mt-0.5">{caption}</p>}
    </div>
    <div className="relative">{children}</div>
  </div>
);

const NoChartData = ({ label }: { label: string }) => (
  <p className="text-sm font-medium text-sky-ink-3 py-10 text-center">{label}</p>
);

const AnalyticsTab = ({ data, loading }: { data: UserStatsDto | null; loading: boolean }) => {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-20" />)}
        </div>
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  const daily = data?.daily ?? [];
  const categories = daily.map((d) => d.date.slice(5)); // MM-DD

  const completionOptions: ApexOptions = {
    ...skyChartBase,
    chart: { ...skyChartBase.chart, height: 260, type: "area" },
    colors: [SKY_SEMANTIC.primary],
    stroke: { curve: "smooth", width: 2.5 },
    fill: skyAreaFill,
    markers: { size: 0, hover: { size: 5 }, strokeColors: SKY.white, strokeWidth: 2 },
    xaxis: { ...skyChartBase.xaxis, categories, labels: { ...skyChartBase.xaxis.labels, rotate: 0 } },
    yaxis: { ...skyChartBase.yaxis, max: 100, labels: { ...skyChartBase.yaxis.labels, formatter: (v: number) => `${Math.round(v ?? 0)}%` } },
  };
  const completionSeries = [{ name: "Completion Rate", data: daily.map((d) => d.completionRate) }];

  // Damage is a warm reward stat here (how hard they hit), not an error — peach, not rose.
  const damageOptions: ApexOptions = {
    ...skyChartBase,
    chart: { ...skyChartBase.chart, height: 260, type: "bar" },
    colors: [SKY_SEMANTIC.epic],
    plotOptions: skyBarPlotOptions,
    xaxis: { ...skyChartBase.xaxis, categories },
  };
  const damageSeries = [{ name: "Damage Dealt", data: daily.map((d) => d.damageDealt) }];

  const goldOptions: ApexOptions = {
    ...skyChartBase,
    chart: { ...skyChartBase.chart, height: 260, type: "bar" },
    colors: [SKY_SEMANTIC.reward],
    plotOptions: skyBarPlotOptions,
    xaxis: { ...skyChartBase.xaxis, categories },
  };
  const goldSeries = [{ name: "Gold Earned", data: daily.map((d) => d.goldEarned) }];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Quests Completed" value={`${data?.totalQuestsCompleted ?? 0}`} color="teal" />
        <StatTile label="Completion Rate" value={`${data?.overallCompletionRate ?? 0}%`} color="deep" />
        <StatTile label="Damage Dealt" value={`${(data?.totalDamageDealt ?? 0).toLocaleString()}`} color="violet" />
        <StatTile label="Gold Earned" value={`${(data?.totalGoldEarned ?? 0).toLocaleString()}`} color="peach" />
      </div>

      <ChartPanel title="Habit Completion Rate" caption={`Last ${data?.rangeDays ?? 30} days`}>
        {daily.length > 0 ? (
          <div className="max-w-full overflow-x-auto"><div className="min-w-100"><Chart options={completionOptions} series={completionSeries} type="area" height={260} /></div></div>
        ) : <NoChartData label="No daily habit data in this range." />}
      </ChartPanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartPanel title="Boss Damage per Day">
          {daily.length > 0 ? (
            <div className="max-w-full overflow-x-auto"><div className="min-w-100"><Chart options={damageOptions} series={damageSeries} type="bar" height={260} /></div></div>
          ) : <NoChartData label="No raid activity in this range." />}
        </ChartPanel>
        <ChartPanel title="Gold Earned per Day">
          {daily.length > 0 ? (
            <div className="max-w-full overflow-x-auto"><div className="min-w-100"><Chart options={goldOptions} series={goldSeries} type="bar" height={260} /></div></div>
          ) : <NoChartData label="No reward history in this range." />}
        </ChartPanel>
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
// Activity type is a taxonomy, not a verdict — the glyph does the identifying
// work and the tint only groups. No success/failure hues in this ramp.
const ACTIVITY_COLORS: Record<string, string> = {
  PROOF_SUBMITTED: "bg-sky-deep/12 text-sky-deep",
  RAID_CONTRIBUTION: "bg-sky-peach/22 text-sky-peach-deep",
  PARTY_JOIN_REQUESTED: "bg-sky-violet/14 text-sky-violet-deep",
};

const HistoryTab = ({ data, loading }: { data: UserActivityDto[]; loading: boolean }) => {
  if (loading) return <TimelineSkeleton />;
  if (data.length === 0) {
    return <EmptyState icon={<HistoryIcon className="w-6 h-6" />} title="No recent activity" subtitle="Proof submissions, boss raids, and party requests will show up here." />;
  }
  return (
    <div className="relative pl-4">
      {/* Spine sits behind the dots and fades out at both ends so it reads as a
          thread rather than a hard rule. */}
      <div className="absolute left-[1.15rem] top-2 bottom-2 w-px bg-linear-to-b from-transparent via-sky-ink/15 to-transparent" />
      <div className="space-y-3.5">
        {data.map((a, i) => (
          <div key={i} className="relative flex gap-3">
            <span className={`grid place-items-center w-9 h-9 rounded-full shrink-0 z-10 ring-4 ring-white/70 ${ACTIVITY_COLORS[a.type] ?? "bg-sky-ink/8 text-sky-ink-2"}`}>
              {ACTIVITY_ICONS[a.type] ?? <HistoryIcon className="w-4 h-4" />}
            </span>
            <div className="flex-1 sky-glass-chip rounded-sky-md px-4 py-2.5">
              <p className="text-sm font-medium text-sky-ink">{a.description}</p>
              <p className="text-xs font-medium text-sky-ink-3 tabular-nums mt-0.5">{fmtDateTime(a.timestamp)}</p>
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
      <div className="sky-glass-admin rounded-sky-card overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : logs.length === 0 ? (
          <EmptyState icon={<FileClock className="w-6 h-6" />} title="No edit history for this account" subtitle="Status changes, role assignments, and profile edits will appear here." />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sky-table-head">
                <tr>
                  {["Actor", "Action", "Before", "After", "Note", "When"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.auditLogId} className="sky-table-row">
                    <td className="px-4 py-3 text-xs font-semibold text-sky-ink-2 whitespace-nowrap">{log.actorUserId != null ? `User #${log.actorUserId}` : "SYSTEM"}</td>
                    <td className="px-4 py-3">
                      <span className="sky-badge sky-badge-info font-mono text-[10px] tracking-tight">
                        {log.action}
                      </span>
                    </td>
                    {/* Before/after read as data, so they get the mono face and the
                        arrow of change is implied by column order. */}
                    <td className="px-4 py-3 text-xs font-medium text-sky-ink-3 max-w-[16rem] truncate" title={log.beforeValue ?? ""}>{log.beforeValue ?? "—"}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-sky-ink max-w-[16rem] truncate" title={log.afterValue ?? ""}>{log.afterValue ?? "—"}</td>
                    <td className="px-4 py-3 text-xs font-medium text-sky-ink-3 max-w-[12rem] truncate" title={log.note ?? ""}>{log.note ?? "—"}</td>
                    <td className="px-4 py-3 text-xs font-medium text-sky-ink-3 tabular-nums whitespace-nowrap">{fmtDateTime(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="relative">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            hasPreviousPage={hasPreviousPage}
            hasNextPage={hasNextPage}
            onPageChange={setPage}
          />
        </div>
      </div>
      {!loading && logs.length > 0 && (
        <p className="text-xs font-medium text-sky-ink-3 tabular-nums">{totalRecords} audit entr{totalRecords === 1 ? "y" : "ies"} total</p>
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
    return <EmptyState icon={<ClipboardList className="w-6 h-6" />} title="Invalid user id" />;
  }

  return (
    <>
      <PageMeta title="User Detail | HabitEvolve Admin" description="360-degree view of a user's progress, analytics, and history." />
      <PageBreadcrumb pageTitle="User Detail" />

      <div className="space-y-6">
        <button
          onClick={() => navigate("/user-management")}
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-sky-ink-2 hover:text-sky-deep transition-colors"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" /> Back to User Management
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
          <div className="relative flex items-start gap-2.5 overflow-hidden sky-glass-admin rounded-sky-card pl-5 pr-4 py-4">
            <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" />
            <AlertTriangle className="relative w-4 h-4 shrink-0 mt-0.5 text-sky-rose-deep" />
            <p className="relative text-sm font-semibold text-sky-rose-deep">{userError ?? "User not found."}</p>
          </div>
        ) : (
          <div className="sky-glass-admin rounded-sky-card p-5 flex flex-wrap items-center gap-4">
            <div className="relative"><UserAvatar username={user.username} userId={user.userId} size="lg" /></div>
            <div className="relative min-w-0 flex-1">
              <PageHeader title={user.username} description={user.email} />
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <StatusBadge status={user.status} />
                {user.roles.map((r) => <RoleBadge key={r} role={r} />)}
              </div>
            </div>
          </div>
        )}

        {!userLoading && user && (
          <>
            {/* ── Tab bar ─────────────────────────────────────────────────── */}
            {/* Segmented control rather than folder tabs: it stays legible on the
                mesh background and the deep fill marks the active pane clearly. */}
            <div className="sky-glass-chip inline-flex max-w-full gap-1 p-1 rounded-sky-chip overflow-x-auto">
              {TABS.map((tt) => {
                const on = tab === tt.id;
                return (
                  <button
                    key={tt.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setTab(tt.id)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-sky-chip text-sm font-semibold whitespace-nowrap transition ${
                      on
                        ? "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-fill"
                        : "text-sky-ink-2 hover:text-sky-ink hover:bg-white/55"
                    }`}
                  >
                    {tt.icon} {tt.label}
                  </button>
                );
              })}
            </div>

            {/* ── Tab content ─────────────────────────────────────────────── */}
            <div key={tab} className="sky-in sky-glass-admin rounded-sky-card p-5 sm:p-6">
              <div className="relative">
                {tab === "overview" && <OverviewTab user={user} onUserChange={setUser} />}
                {tab === "quests" && <QuestsTab data={quests} loading={questsLoading} />}
                {tab === "analytics" && <AnalyticsTab data={stats} loading={statsLoading} />}
                {tab === "history" && <HistoryTab data={history} loading={historyLoading} />}
                {tab === "audit" && <AuditTab userId={user.userId} />}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft, Users, ClipboardList, Swords, UserCog, UserRoundCog,
  Loader2, Trash2, Copy, Check, KeyRound,
} from "lucide-react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import adminPartyApi from "../api/adminPartyApi";
import adminUserApi from "../api/adminUserApi";
import { useAlert } from "../context/AlertContext";
import { PartyItem, PartyMember, JoinRequestItem, JoinPolicy, UserItem } from "../types/api.types";
import { PartyRaidDto } from "../types/adminParty.types";
import { UserQuestDto } from "../types/userWorkspace.types";

const errMsg = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
const fmtDateTime = (d: string) => new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

const inputCls =
  "w-full px-3.5 py-2 border-2 border-black rounded-xl text-sm font-medium focus:outline-none " +
  "focus:ring-2 focus:ring-violet-300 bg-white dark:bg-gray-800 dark:text-gray-100 placeholder:text-gray-400";

const btnBase =
  "inline-flex items-center gap-2 px-4 py-2 font-black text-sm border-2 border-black rounded-full " +
  "shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 " +
  "disabled:shadow-[3px_3px_0_0_#1A1D20] transition-all";

// ── BADGES ────────────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  Active: "bg-green-100 border-green-400 text-green-800",
  Disbanded: "bg-gray-100 border-gray-400 text-gray-500",
  Archived: "bg-amber-100 border-amber-400 text-amber-800",
};
const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black border-2 ${STATUS_STYLES[status] ?? "bg-gray-100 border-gray-400 text-gray-700"}`}>{status}</span>
);
const POLICY_STYLES: Record<string, string> = {
  PUBLIC: "bg-sky-100 border-sky-400 text-sky-800",
  APPROVAL_REQUIRED: "bg-amber-100 border-amber-400 text-amber-800",
  INVITE_ONLY: "bg-fuchsia-100 border-fuchsia-400 text-fuchsia-800",
};
const PolicyBadge = ({ policy }: { policy: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${POLICY_STYLES[policy] ?? "bg-gray-100 border-gray-400 text-gray-700"}`}>{policy}</span>
);
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
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black border-2 ${QUEST_STATUS_STYLES[status] ?? "bg-gray-100 border-gray-400 text-gray-700"}`}>{status}</span>
);
const RAID_STATUS_STYLES: Record<string, string> = {
  Upcoming: "bg-sky-100 border-sky-400 text-sky-800",
  Active: "bg-amber-100 border-amber-400 text-amber-800",
  Defeated: "bg-green-100 border-green-400 text-green-800",
  Failed: "bg-red-100 border-red-400 text-red-800",
  Expired: "bg-gray-100 border-gray-400 text-gray-600",
  WipeOut: "bg-red-100 border-red-400 text-red-800",
};
const RaidStatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black border-2 ${RAID_STATUS_STYLES[status] ?? "bg-gray-100 border-gray-400 text-gray-700"}`}>{status}</span>
);

// ── SKELETONS ─────────────────────────────────────────────────────────────────
const SkeletonBlock = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${className}`} />
);
const CardSkeletonGrid = ({ count = 3 }: { count?: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    {Array.from({ length: count }).map((_, i) => <SkeletonBlock key={i} className="h-20 border-2 border-gray-200" />)}
  </div>
);
const ListSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <div className="space-y-3">{Array.from({ length: rows }).map((_, i) => <SkeletonBlock key={i} className="h-16 border-2 border-gray-200" />)}</div>
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
const OverviewTab = ({ party, onPartyChange }: { party: PartyItem; onPartyChange: (p: PartyItem) => void }) => {
  const alert = useAlert();
  const [editForm, setEditForm] = useState({ name: party.name, description: party.description ?? "", joinPolicy: party.joinPolicy });
  const [savingInfo, setSavingInfo] = useState(false);

  const [mentors, setMentors] = useState<UserItem[]>([]);
  const [mentorsLoading, setMentorsLoading] = useState(true);
  const [newMentorId, setNewMentorId] = useState("");
  const [transferring, setTransferring] = useState(false);

  const [generatingCode, setGeneratingCode] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    adminUserApi.getUsers({ roleCode: "MENTOR", pageSize: 200 })
      .then((res) => setMentors(res.data ?? []))
      .catch(() => alert.error("Failed to load mentor list."))
      .finally(() => setMentorsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const infoChanged = editForm.name !== party.name || editForm.description !== (party.description ?? "") || editForm.joinPolicy !== party.joinPolicy;

  const handleSaveInfo = async () => {
    if (!infoChanged) return;
    setSavingInfo(true);
    try {
      const res = await adminPartyApi.updateParty(party.partyId, editForm);
      if (res.success && res.data) {
        onPartyChange(res.data);
        alert.success("Party updated successfully.");
      } else {
        alert.error(res.message ?? "Failed to update party.");
      }
    } catch (err) {
      alert.error(errMsg(err) ?? "Failed to update party.");
    } finally {
      setSavingInfo(false);
    }
  };

  const handleTransfer = async () => {
    if (!newMentorId) return;
    setTransferring(true);
    try {
      const res = await adminPartyApi.transferMentor(party.partyId, { newMentorUserId: Number(newMentorId) });
      if (res.success && res.data) {
        onPartyChange(res.data);
        setNewMentorId("");
        alert.success("Party ownership transferred successfully.");
      } else {
        alert.error(res.message ?? "Failed to transfer ownership.");
      }
    } catch (err) {
      alert.error(errMsg(err) ?? "Failed to transfer ownership.");
    } finally {
      setTransferring(false);
    }
  };

  const handleGenerateInviteCode = async () => {
    setGeneratingCode(true);
    try {
      const res = await adminPartyApi.generateInviteCode(party.partyId);
      if (res.success && res.data) {
        onPartyChange({ ...party, inviteCode: res.data });
        alert.success("New invite code generated.");
      } else {
        alert.error(res.message ?? "Failed to generate invite code.");
      }
    } catch (err) {
      alert.error(errMsg(err) ?? "Failed to generate invite code.");
    } finally {
      setGeneratingCode(false);
    }
  };

  const copyInviteCode = () => {
    if (!party.inviteCode) return;
    navigator.clipboard.writeText(party.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Basic Info ───────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2">Basic Info</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Party ID", value: `#${party.partyId}` },
            { label: "Members", value: party.maxMembers > 0 ? `${party.memberCount} / ${party.maxMembers}` : `${party.memberCount}` },
            { label: "Created At", value: fmtDate(party.createdAt) },
            { label: "Updated At", value: party.updatedAt ? fmtDate(party.updatedAt) : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-2xl p-3">
              <p className="text-xs font-black text-gray-400 uppercase tracking-wide">{label}</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Invite Code ──────────────────────────────────────────────────── */}
      <div className="border-2 border-black rounded-2xl p-4 bg-white dark:bg-white/3 shadow-[3px_3px_0_0_#1A1D20]">
        <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-3">Invite Code</p>
        <div className="flex flex-wrap items-center gap-3">
          <code className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-2 border-black rounded-xl font-black text-sm tracking-widest">{party.inviteCode || "— none —"}</code>
          {party.inviteCode && (
            <button onClick={copyInviteCode} className={`${btnBase} bg-white text-gray-700 py-1.5`}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? "Copied" : "Copy"}
            </button>
          )}
          <button onClick={handleGenerateInviteCode} disabled={generatingCode} className={`${btnBase} bg-sky-200 text-gray-900 py-1.5`}>
            <KeyRound className="w-3.5 h-3.5" /> {generatingCode ? "Generating…" : "Regenerate"}
          </button>
        </div>
      </div>

      {/* ── Edit Info ────────────────────────────────────────────────────── */}
      <div className="border-2 border-black rounded-2xl p-4 bg-white dark:bg-white/3 shadow-[3px_3px_0_0_#1A1D20] space-y-3">
        <p className="text-xs font-black text-gray-400 uppercase tracking-wide">Edit Party Info</p>
        <div>
          <label className="block text-xs font-black text-gray-600 mb-1">Name</label>
          <input required maxLength={200} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-black text-gray-600 mb-1">Description</label>
          <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2} className={inputCls} />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-black text-gray-600 mb-1">Join Policy</label>
            <select value={editForm.joinPolicy} onChange={(e) => setEditForm({ ...editForm, joinPolicy: e.target.value as JoinPolicy })} className={inputCls}>
              <option value="APPROVAL_REQUIRED">APPROVAL_REQUIRED</option>
              <option value="PUBLIC">PUBLIC</option>
              <option value="INVITE_ONLY">INVITE_ONLY</option>
            </select>
          </div>
          <button onClick={handleSaveInfo} disabled={savingInfo || !infoChanged} className={`${btnBase} bg-amber-300 text-gray-900`}>
            {savingInfo ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* ── Transfer Mentor ──────────────────────────────────────────────── */}
      <div className="border-2 border-black rounded-2xl p-4 bg-white dark:bg-white/3 shadow-[3px_3px_0_0_#1A1D20]">
        <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-3">Transfer Ownership</p>
        <p className="text-sm text-gray-500 mb-3">Currently owned by <span className="font-black text-gray-800 dark:text-gray-100">{party.mentorUsername ?? `#${party.mentorUserId}`}</span>.</p>
        {mentorsLoading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm font-semibold py-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading mentors…</div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <select value={newMentorId} onChange={(e) => setNewMentorId(e.target.value)} className={`${inputCls} flex-1 min-w-[200px]`}>
              <option value="">Select a new mentor…</option>
              {mentors.filter((m) => m.userId !== party.mentorUserId).map((m) => (
                <option key={m.userId} value={m.userId}>{m.username} (#{m.userId})</option>
              ))}
            </select>
            <button onClick={handleTransfer} disabled={transferring || !newMentorId} className={`${btnBase} bg-violet-300 text-gray-900`}>
              <UserCog className="w-3.5 h-3.5" /> {transferring ? "Transferring…" : "Transfer"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── TAB: MEMBERS ──────────────────────────────────────────────────────────────
const MembersTab = ({ partyId, members, loading, onRefresh }: { partyId: number; members: PartyMember[]; loading: boolean; onRefresh: () => void }) => {
  const alert = useAlert();
  const [removingId, setRemovingId] = useState<number | null>(null);

  const handleRemove = async (userId: number) => {
    setRemovingId(userId);
    try {
      await adminPartyApi.removeMember(partyId, userId);
      alert.success("Member removed.");
      onRefresh();
    } catch (err) {
      alert.error(errMsg(err) ?? "Failed to remove member.");
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) return <ListSkeleton />;
  if (members.length === 0) return <EmptyState icon={<Users className="w-10 h-10 opacity-40" />} title="No members yet" />;

  return (
    <div className="space-y-2">
      {members.map((m) => (
        <div key={m.partyMemberId} className="flex items-center justify-between border-2 border-black rounded-2xl px-4 py-3 bg-white dark:bg-white/3 shadow-[2px_2px_0_0_#1A1D20]">
          <div>
            <p className="font-black text-sm text-gray-900 dark:text-gray-100">{m.username}</p>
            <p className="text-xs text-gray-400">#{m.userId} · Joined {m.joinedAt ? fmtDate(m.joinedAt) : "—"}</p>
          </div>
          <button
            onClick={() => handleRemove(m.userId)}
            disabled={removingId === m.userId}
            title="Remove from party"
            className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-red-200 hover:bg-red-300 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-50 transition-all text-gray-800"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

// ── TAB: JOIN REQUESTS ────────────────────────────────────────────────────────
const JoinRequestsTab = ({ partyId, requests, loading, onRefresh }: { partyId: number; requests: JoinRequestItem[]; loading: boolean; onRefresh: () => void }) => {
  const alert = useAlert();
  const [processingId, setProcessingId] = useState<number | null>(null);

  const handleDecision = async (requestId: number, approve: boolean) => {
    setProcessingId(requestId);
    try {
      if (approve) await adminPartyApi.approveJoinRequest(partyId, requestId);
      else await adminPartyApi.rejectJoinRequest(partyId, requestId);
      alert.success(approve ? "Request approved." : "Request rejected.");
      onRefresh();
    } catch (err) {
      alert.error(errMsg(err) ?? "Failed to process request.");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <ListSkeleton />;
  if (requests.length === 0) return <EmptyState icon={<ClipboardList className="w-10 h-10 opacity-40" />} title="No pending join requests" />;

  return (
    <div className="space-y-2">
      {requests.map((r) => (
        <div key={r.requestId} className="flex items-center justify-between gap-3 border-2 border-black rounded-2xl px-4 py-3 bg-white dark:bg-white/3 shadow-[2px_2px_0_0_#1A1D20]">
          <div className="min-w-0">
            <p className="font-black text-sm text-gray-900 dark:text-gray-100">{r.username}</p>
            {r.message && <p className="text-xs text-gray-500 truncate">"{r.message}"</p>}
            <p className="text-xs text-gray-400">Requested {fmtDateTime(r.requestedAt)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => handleDecision(r.requestId, true)} disabled={processingId === r.requestId} className={`${btnBase} bg-green-200 text-gray-900 py-1.5 px-3 text-xs`}>Approve</button>
            <button onClick={() => handleDecision(r.requestId, false)} disabled={processingId === r.requestId} className={`${btnBase} bg-red-200 text-gray-900 py-1.5 px-3 text-xs`}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── TAB: QUESTS ───────────────────────────────────────────────────────────────
const QuestsTab = ({ quests, loading }: { quests: UserQuestDto[]; loading: boolean }) => {
  if (loading) return <CardSkeletonGrid />;
  if (quests.length === 0) return <EmptyState icon={<ClipboardList className="w-10 h-10 opacity-40" />} title="No quests assigned to this party yet" />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {quests.map((q) => (
        <div key={q.questId} className="border-2 border-black rounded-2xl p-4 bg-white dark:bg-white/3 shadow-[3px_3px_0_0_#1A1D20] space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-black text-sm text-gray-900 dark:text-gray-100 leading-snug">{q.title}</p>
            <QuestStatusBadge status={q.status} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border bg-violet-100 border-violet-400 text-violet-800">{q.questType}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border bg-blue-100 border-blue-400 text-blue-800">{q.difficulty}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium pt-1 border-t border-dashed border-gray-200 dark:border-white/10">
            <span>{q.deadlineAt ? `Due ${fmtDate(q.deadlineAt)}` : "No deadline"}</span>
            <span className="font-black text-gray-700 dark:text-gray-200">{q.rewardGold}g · {q.rewardXp}xp{q.damage > 0 ? ` · ${q.damage} dmg` : ""}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── TAB: BOSS RAID ────────────────────────────────────────────────────────────
const RaidsTab = ({ raids, loading }: { raids: PartyRaidDto[]; loading: boolean }) => {
  if (loading) return <ListSkeleton />;
  if (raids.length === 0) return <EmptyState icon={<Swords className="w-10 h-10 opacity-40" />} title="No boss raid history for this party" />;

  return (
    <div className="space-y-3">
      {raids.map((r) => {
        const pct = Math.max(0, Math.min(100, r.healthPercentage));
        return (
          <div key={r.raidId} className="border-2 border-black rounded-2xl p-4 bg-white dark:bg-white/3 shadow-[3px_3px_0_0_#1A1D20] space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="font-black text-sm text-gray-900 dark:text-gray-100">{r.bossName}</p>
              <RaidStatusBadge status={r.status} />
            </div>
            <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 border-2 border-black rounded-full overflow-hidden">
              <div className="h-full bg-red-400" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium">
              <span>{r.currentHp.toLocaleString()} / {r.maxHp.toLocaleString()} HP ({pct.toFixed(0)}%)</span>
              <span>{fmtDate(r.weekStartDate)} → {fmtDate(r.weekEndDate)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
type TabId = "overview" | "members" | "joinRequests" | "quests" | "raids";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <UserRoundCog className="w-4 h-4" /> },
  { id: "members", label: "Members", icon: <Users className="w-4 h-4" /> },
  { id: "joinRequests", label: "Join Requests", icon: <ClipboardList className="w-4 h-4" /> },
  { id: "quests", label: "Quests", icon: <ClipboardList className="w-4 h-4" /> },
  { id: "raids", label: "Boss Raid", icon: <Swords className="w-4 h-4" /> },
];

export default function AdminPartyDetail() {
  const { partyId: partyIdParam } = useParams<{ partyId: string }>();
  const partyId = Number(partyIdParam);
  const navigate = useNavigate();
  const alert = useAlert();

  const [tab, setTab] = useState<TabId>("overview");
  const [party, setParty] = useState<PartyItem | null>(null);
  const [partyLoading, setPartyLoading] = useState(true);
  const [partyError, setPartyError] = useState<string | null>(null);

  const [members, setMembers] = useState<PartyMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [joinRequests, setJoinRequests] = useState<JoinRequestItem[]>([]);
  const [joinRequestsLoading, setJoinRequestsLoading] = useState(true);
  const [quests, setQuests] = useState<UserQuestDto[]>([]);
  const [questsLoading, setQuestsLoading] = useState(true);
  const [raids, setRaids] = useState<PartyRaidDto[]>([]);
  const [raidsLoading, setRaidsLoading] = useState(true);

  const fetchMembers = useCallback(() => {
    setMembersLoading(true);
    adminPartyApi.getMembers(partyId)
      .then((res) => { if (res.success) setMembers(res.data ?? []); })
      .catch(() => alert.error("Failed to load members."))
      .finally(() => setMembersLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId]);

  const fetchJoinRequests = useCallback(() => {
    setJoinRequestsLoading(true);
    adminPartyApi.getJoinRequests(partyId)
      .then((res) => { if (res.success) setJoinRequests(res.data ?? []); })
      .catch(() => alert.error("Failed to load join requests."))
      .finally(() => setJoinRequestsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId]);

  useEffect(() => {
    if (!partyId || Number.isNaN(partyId)) return;
    let cancelled = false;

    setPartyLoading(true);
    setPartyError(null);
    adminPartyApi.getPartyById(partyId).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setParty(res.data);
      else setPartyError(res.message ?? "Party not found.");
    }).catch((err) => { if (!cancelled) setPartyError(errMsg(err) ?? "Failed to load party."); })
      .finally(() => { if (!cancelled) setPartyLoading(false); });

    fetchMembers();
    fetchJoinRequests();

    setQuestsLoading(true);
    adminPartyApi.getQuests(partyId).then((res) => {
      if (!cancelled && res.success) setQuests(res.data ?? []);
    }).catch(() => { if (!cancelled) alert.error("Failed to load quests."); })
      .finally(() => { if (!cancelled) setQuestsLoading(false); });

    setRaidsLoading(true);
    adminPartyApi.getRaids(partyId).then((res) => {
      if (!cancelled && res.success) setRaids(res.data ?? []);
    }).catch(() => { if (!cancelled) alert.error("Failed to load boss raid history."); })
      .finally(() => { if (!cancelled) setRaidsLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId]);

  if (!partyId || Number.isNaN(partyId)) {
    return <EmptyState icon={<ClipboardList className="w-10 h-10 opacity-40" />} title="Invalid party id" />;
  }

  return (
    <>
      <PageMeta title="Party Detail | HabitEvolve Admin" description="Manage a party's members, join requests, quests, and boss raid history." />
      <PageBreadcrumb pageTitle="Party Detail" />

      <div className="space-y-6">
        <button onClick={() => navigate("/admin/parties")} className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Party Management
        </button>

        {partyLoading ? (
          <div className="flex items-center gap-4">
            <SkeletonBlock className="w-16 h-16 rounded-full" />
            <div className="space-y-2"><SkeletonBlock className="h-6 w-40" /><SkeletonBlock className="h-4 w-56" /></div>
          </div>
        ) : partyError || !party ? (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 text-sm text-red-700 font-semibold">{partyError ?? "Party not found."}</div>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-16 h-16 rounded-2xl border-4 border-black bg-violet-200 flex items-center justify-center shadow-[3px_3px_0_0_#1A1D20] shrink-0">
              <Users className="w-7 h-7 text-violet-800" />
            </div>
            <div>
              <p className="text-xl font-black text-gray-900 dark:text-gray-100">{party.name}</p>
              {party.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{party.description}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={party.status} />
                <PolicyBadge policy={party.joinPolicy} />
                <span className="text-xs text-gray-400 font-medium">Mentor: {party.mentorUsername ?? `#${party.mentorUserId}`}</span>
              </div>
            </div>
          </div>
        )}

        {!partyLoading && party && (
          <>
            <div className="flex items-end gap-1 border-b-2 border-black/10 overflow-x-auto">
              {TABS.map((tt) => (
                <button
                  key={tt.id}
                  onClick={() => setTab(tt.id)}
                  className={`px-5 py-2.5 font-black text-sm rounded-t-2xl border-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    tab === tt.id
                      ? "bg-violet-300 border-black text-gray-900 shadow-[3px_0_0_0_#1A1D20,0_3px_0_0_#1A1D20] -mb-0.5 relative z-10"
                      : "bg-white dark:bg-gray-800 border-black/20 dark:border-white/20 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {tt.icon} {tt.label}
                  {tt.id === "joinRequests" && !joinRequestsLoading && joinRequests.length > 0 && (
                    <span className="bg-red-400 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{joinRequests.length}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="bg-white dark:bg-[#1e2a3a] border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] p-5">
              {tab === "overview" && <OverviewTab party={party} onPartyChange={setParty} />}
              {tab === "members" && <MembersTab partyId={party.partyId} members={members} loading={membersLoading} onRefresh={fetchMembers} />}
              {tab === "joinRequests" && <JoinRequestsTab partyId={party.partyId} requests={joinRequests} loading={joinRequestsLoading} onRefresh={() => { fetchJoinRequests(); fetchMembers(); }} />}
              {tab === "quests" && <QuestsTab quests={quests} loading={questsLoading} />}
              {tab === "raids" && <RaidsTab raids={raids} loading={raidsLoading} />}
            </div>
          </>
        )}
      </div>
    </>
  );
}

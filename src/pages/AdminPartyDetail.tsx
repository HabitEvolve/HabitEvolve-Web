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
import SkyCard from "../components/ui/card/SkyCard";
import SkyButton from "../components/ui/button/SkyButton";
import { PartyItem, PartyMember, JoinRequestItem, JoinPolicy, UserItem } from "../types/api.types";
import { PartyRaidDto } from "../types/adminParty.types";
import { UserQuestDto } from "../types/userWorkspace.types";

const errMsg = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
const fmtDateTime = (d: string) => new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

const inputCls =
  "w-full px-3.5 py-2 rounded-sky-chip border border-sky-surf-border text-sm font-medium bg-white text-sky-ink " +
  "focus:outline-none focus:border-sky-deep focus:ring-3 focus:ring-sky-deep/20 placeholder:text-sky-ink-3";

// ── BADGES ────────────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  Active: "bg-success-100 text-success-800",
  Disbanded: "bg-gray-100 text-gray-500",
  Archived: "bg-warning-100 text-warning-800",
};
const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700"}`}>{status}</span>
);
const POLICY_STYLES: Record<string, string> = {
  PUBLIC: "bg-blue-100 text-blue-800",
  APPROVAL_REQUIRED: "bg-warning-100 text-warning-800",
  INVITE_ONLY: "bg-purple-100 text-purple-800",
};
const PolicyBadge = ({ policy }: { policy: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${POLICY_STYLES[policy] ?? "bg-gray-100 text-gray-700"}`}>{policy}</span>
);
const QUEST_STATUS_STYLES: Record<string, string> = {
  InProgress: "bg-blue-100 text-blue-800",
  Submitted: "bg-warning-100 text-warning-800",
  Approved: "bg-success-100 text-success-800",
  Rejected: "bg-error-100 text-error-800",
  Expired: "bg-gray-100 text-gray-600",
  Failed: "bg-error-100 text-error-800",
  NotStarted: "bg-gray-100 text-gray-500",
};
const QuestStatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${QUEST_STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700"}`}>{status}</span>
);
const RAID_STATUS_STYLES: Record<string, string> = {
  Upcoming: "bg-blue-100 text-blue-800",
  Active: "bg-warning-100 text-warning-800",
  Defeated: "bg-success-100 text-success-800",
  Failed: "bg-error-100 text-error-800",
  Expired: "bg-gray-100 text-gray-600",
  WipeOut: "bg-error-100 text-error-800",
};
const RaidStatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${RAID_STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700"}`}>{status}</span>
);

// ── SKELETONS ─────────────────────────────────────────────────────────────────
const SkeletonBlock = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-sky-chip ${className}`} />
);
const CardSkeletonGrid = ({ count = 3 }: { count?: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    {Array.from({ length: count }).map((_, i) => <SkeletonBlock key={i} className="h-20" />)}
  </div>
);
const ListSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <div className="space-y-3">{Array.from({ length: rows }).map((_, i) => <SkeletonBlock key={i} className="h-16" />)}</div>
);

// ── EMPTY STATE ───────────────────────────────────────────────────────────────
const EmptyState = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) => (
  <div className="flex flex-col items-center gap-2 py-14 text-sky-ink-3">
    {icon}
    <p className="font-bold text-sm text-sky-ink-2">{title}</p>
    {subtitle && <p className="text-xs text-sky-ink-3">{subtitle}</p>}
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
        <p className="text-xs font-semibold text-sky-ink-3 uppercase tracking-wide mb-2">Basic Info</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Party ID", value: `#${party.partyId}` },
            { label: "Members", value: party.maxMembers > 0 ? `${party.memberCount} / ${party.maxMembers}` : `${party.memberCount}` },
            { label: "Created At", value: fmtDate(party.createdAt) },
            { label: "Updated At", value: party.updatedAt ? fmtDate(party.updatedAt) : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 border border-gray-200 rounded-sky-chip p-3">
              <p className="text-xs font-semibold text-sky-ink-3 uppercase tracking-wide">{label}</p>
              <p className="text-sm font-semibold text-sky-ink mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Invite Code ──────────────────────────────────────────────────── */}
      <div className="rounded-sky-chip p-4 bg-white border border-sky-surf-border shadow-sky-tint">
        <p className="text-xs font-semibold text-sky-ink-3 uppercase tracking-wide mb-3">Invite Code</p>
        <div className="flex flex-wrap items-center gap-3">
          <code className="px-4 py-2 bg-gray-100 rounded-sky-chip font-bold text-sm tracking-widest text-sky-ink">{party.inviteCode || "— none —"}</code>
          {party.inviteCode && (
            <SkyButton type="button" variant="secondary" size="sm" onClick={copyInviteCode}>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? "Copied" : "Copy"}
            </SkyButton>
          )}
          <SkyButton type="button" variant="secondary" size="sm" onClick={handleGenerateInviteCode} disabled={generatingCode}>
            <KeyRound className="w-3.5 h-3.5" /> {generatingCode ? "Generating…" : "Regenerate"}
          </SkyButton>
        </div>
      </div>

      {/* ── Edit Info ────────────────────────────────────────────────────── */}
      <div className="rounded-sky-chip p-4 bg-white border border-sky-surf-border shadow-sky-tint space-y-3">
        <p className="text-xs font-semibold text-sky-ink-3 uppercase tracking-wide">Edit Party Info</p>
        <div>
          <label className="block text-xs font-semibold text-sky-ink-2 mb-1">Name</label>
          <input required maxLength={200} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-sky-ink-2 mb-1">Description</label>
          <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2} className={inputCls} />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-45">
            <label className="block text-xs font-semibold text-sky-ink-2 mb-1">Join Policy</label>
            <select value={editForm.joinPolicy} onChange={(e) => setEditForm({ ...editForm, joinPolicy: e.target.value as JoinPolicy })} className={inputCls}>
              <option value="APPROVAL_REQUIRED">APPROVAL_REQUIRED</option>
              <option value="PUBLIC">PUBLIC</option>
              <option value="INVITE_ONLY">INVITE_ONLY</option>
            </select>
          </div>
          <SkyButton type="button" variant="primary" onClick={handleSaveInfo} disabled={savingInfo || !infoChanged}>
            {savingInfo ? "Saving…" : "Save Changes"}
          </SkyButton>
        </div>
      </div>

      {/* ── Transfer Mentor ──────────────────────────────────────────────── */}
      <div className="rounded-sky-chip p-4 bg-white border border-sky-surf-border shadow-sky-tint">
        <p className="text-xs font-semibold text-sky-ink-3 uppercase tracking-wide mb-3">Transfer Ownership</p>
        <p className="text-sm text-sky-ink-2 mb-3">Currently owned by <span className="font-bold text-sky-ink">{party.mentorUsername ?? `#${party.mentorUserId}`}</span>.</p>
        {mentorsLoading ? (
          <div className="flex items-center gap-2 text-sky-ink-3 text-sm font-semibold py-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading mentors…</div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <select value={newMentorId} onChange={(e) => setNewMentorId(e.target.value)} className={`${inputCls} flex-1 min-w-50`}>
              <option value="">Select a new mentor…</option>
              {mentors.filter((m) => m.userId !== party.mentorUserId).map((m) => (
                <option key={m.userId} value={m.userId}>{m.username} (#{m.userId})</option>
              ))}
            </select>
            <SkyButton type="button" variant="primary" onClick={handleTransfer} disabled={transferring || !newMentorId}>
              <UserCog className="w-3.5 h-3.5" /> {transferring ? "Transferring…" : "Transfer"}
            </SkyButton>
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
        <div key={m.partyMemberId} className="flex items-center justify-between rounded-sky-chip px-4 py-3 bg-white border border-sky-surf-border shadow-sky-tint">
          <div>
            <p className="font-bold text-sm text-sky-ink">{m.username}</p>
            <p className="text-xs text-sky-ink-3">#{m.userId} · Joined {m.joinedAt ? fmtDate(m.joinedAt) : "—"}</p>
          </div>
          <SkyButton
            type="button"
            variant="destructive"
            size="icon"
            onClick={() => handleRemove(m.userId)}
            disabled={removingId === m.userId}
            title="Remove from party"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </SkyButton>
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
        <div key={r.requestId} className="flex items-center justify-between gap-3 rounded-sky-chip px-4 py-3 bg-white border border-sky-surf-border shadow-sky-tint">
          <div className="min-w-0">
            <p className="font-bold text-sm text-sky-ink">{r.username}</p>
            {r.message && <p className="text-xs text-sky-ink-2 truncate">"{r.message}"</p>}
            <p className="text-xs text-sky-ink-3">Requested {fmtDateTime(r.requestedAt)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SkyButton type="button" variant="success" size="sm" onClick={() => handleDecision(r.requestId, true)} disabled={processingId === r.requestId}>Approve</SkyButton>
            <SkyButton type="button" variant="destructive" size="sm" onClick={() => handleDecision(r.requestId, false)} disabled={processingId === r.requestId}>Reject</SkyButton>
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
        <div key={q.questId} className="rounded-sky-chip p-4 bg-white border border-sky-surf-border shadow-sky-tint space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-sm text-sky-ink leading-snug">{q.title}</p>
            <QuestStatusBadge status={q.status} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800">{q.questType}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">{q.difficulty}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-sky-ink-2 font-medium pt-1 border-t border-dashed border-sky-ink/15">
            <span>{q.deadlineAt ? `Due ${fmtDate(q.deadlineAt)}` : "No deadline"}</span>
            <span className="font-bold text-sky-ink">{q.rewardGold}g · {q.rewardXp}xp{q.damage > 0 ? ` · ${q.damage} dmg` : ""}</span>
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
          <div key={r.raidId} className="rounded-sky-chip p-4 bg-white border border-sky-surf-border shadow-sky-tint space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold text-sm text-sky-ink">{r.bossName}</p>
              <RaidStatusBadge status={r.status} />
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-error-500" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs text-sky-ink-2 font-medium">
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
        <button type="button" onClick={() => navigate("/admin/parties")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-ink-2 hover:text-sky-ink transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Party Management
        </button>

        {partyLoading ? (
          <div className="flex items-center gap-4">
            <SkeletonBlock className="w-16 h-16 rounded-full" />
            <div className="space-y-2"><SkeletonBlock className="h-6 w-40" /><SkeletonBlock className="h-4 w-56" /></div>
          </div>
        ) : partyError || !party ? (
          <div className="bg-error-50 border border-error-300 rounded-sky-chip p-4 text-sm text-error-700 font-semibold">{partyError ?? "Party not found."}</div>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-16 h-16 rounded-sky-card bg-purple-100 flex items-center justify-center shrink-0">
              <Users className="w-7 h-7 text-purple-700" />
            </div>
            <div>
              <p className="text-xl font-bold text-sky-ink">{party.name}</p>
              {party.description && <p className="text-sm text-sky-ink-2 mt-0.5">{party.description}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={party.status} />
                <PolicyBadge policy={party.joinPolicy} />
                <span className="text-xs text-sky-ink-3 font-medium">Mentor: {party.mentorUsername ?? `#${party.mentorUserId}`}</span>
              </div>
            </div>
          </div>
        )}

        {!partyLoading && party && (
          <>
            <div className="flex items-end gap-1 border-b border-gray-200 overflow-x-auto">
              {TABS.map((tt) => (
                <button
                  type="button"
                  key={tt.id}
                  onClick={() => setTab(tt.id)}
                  className={`px-5 py-2.5 font-semibold text-sm rounded-t-sky-chip transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    tab === tt.id
                      ? "bg-purple-100 text-purple-800 -mb-px"
                      : "text-sky-ink-2 hover:bg-sky-3/20"
                  }`}
                >
                  {tt.icon} {tt.label}
                  {tt.id === "joinRequests" && !joinRequestsLoading && joinRequests.length > 0 && (
                    <span className="bg-error-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">{joinRequests.length}</span>
                  )}
                </button>
              ))}
            </div>

            <SkyCard variant="admin">
              {tab === "overview" && <OverviewTab party={party} onPartyChange={setParty} />}
              {tab === "members" && <MembersTab partyId={party.partyId} members={members} loading={membersLoading} onRefresh={fetchMembers} />}
              {tab === "joinRequests" && <JoinRequestsTab partyId={party.partyId} requests={joinRequests} loading={joinRequestsLoading} onRefresh={() => { fetchJoinRequests(); fetchMembers(); }} />}
              {tab === "quests" && <QuestsTab quests={quests} loading={questsLoading} />}
              {tab === "raids" && <RaidsTab raids={raids} loading={raidsLoading} />}
            </SkyCard>
          </>
        )}
      </div>
    </>
  );
}

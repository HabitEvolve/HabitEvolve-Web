import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft, Users, ClipboardList, Swords, UserCog, UserRoundCog,
  Loader2, Trash2, Copy, Check, KeyRound,
  Archive, CircleSlash, Globe, Lock, UserCheck, Play, Send, X, Clock,
  CalendarClock, Trophy, Skull, Minus, AlertTriangle, Ticket,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

// ── TONE TAXONOMY ─────────────────────────────────────────────────────────────
// One hue per meaning, reused wherever that meaning shows up. teal is spent only
// on a state that genuinely succeeded (party live, quest approved, boss down),
// rose only on failure or a destructive control, peach on "needs a human",
// violet on the party/game concept itself, deep on the operational default.
type Tone = "deep" | "peach" | "dmg" | "violet" | "teal" | "rose" | "neutral";
const TONE: Record<Tone, { chip: string; wash: string; rail: string }> = {
  deep:    { chip: "bg-sky-deep/12 ring-sky-deep/22 text-sky-deep",            wash: "bg-sky-deep/8",    rail: "bg-sky-deep" },
  peach:   { chip: "bg-sky-peach/20 ring-sky-peach/32 text-sky-peach-deep",    wash: "bg-sky-peach/14",  rail: "bg-sky-peach" },
  dmg:     { chip: "bg-sky-dmg/14 ring-sky-dmg/26 text-sky-dmg-deep",          wash: "bg-sky-dmg/10",    rail: "bg-sky-dmg" },
  violet:  { chip: "bg-sky-violet/14 ring-sky-violet/26 text-sky-violet-deep", wash: "bg-sky-violet/10", rail: "bg-sky-violet" },
  teal:    { chip: "bg-sky-teal-bg ring-sky-teal/26 text-sky-teal",            wash: "bg-sky-teal/10",   rail: "bg-sky-teal" },
  rose:    { chip: "bg-sky-rose/14 ring-sky-rose/26 text-sky-rose-deep",       wash: "bg-sky-rose/10",   rail: "bg-sky-rose" },
  neutral: { chip: "bg-white/72 ring-white/85 text-sky-ink-2",                 wash: "bg-white/48",      rail: "bg-sky-ink/22" },
};

const eyebrow = "text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3";
const sectionLabel = `mb-3 ${eyebrow}`;
const fieldLabel = `block mb-1.5 ${eyebrow}`;

// Inner panels sit *inside* an already-glass card, so they take a lighter fill
// than the card itself — the same glass nested twice just reads as flat.
const panelCls = "rounded-sky-md bg-white/55 ring-1 ring-white/78 p-4";
const rowCls =
  "rounded-sky-md bg-white/58 ring-1 ring-white/78 shadow-sky-tint transition-all duration-200 " +
  "ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-white/72 hover:-translate-y-px";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-sky-chip bg-white/70 ring-1 ring-white/80 text-sm font-medium text-sky-ink " +
  "transition-shadow focus:outline-none focus:ring-2 focus:ring-sky-deep/45 placeholder:text-sky-ink-3";

// ── BADGES ────────────────────────────────────────────────────────────────────
// Every state carries a glyph as well as a hue, so none of them can only be told
// apart by colour.
type PillCfg = { tone: Tone; Icon: LucideIcon };
const FALLBACK_PILL: PillCfg = { tone: "neutral", Icon: Minus };

const StatePill = ({ value, map, tiny = false }: { value: string; map: Record<string, PillCfg>; tiny?: boolean }) => {
  const { tone, Icon } = map[value] ?? FALLBACK_PILL;
  return (
    <span className={`inline-flex items-center gap-1 rounded-sky-chip ring-1 font-semibold ${TONE[tone].chip} ${tiny ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs"}`}>
      <Icon className={tiny ? "w-2.5 h-2.5" : "w-3 h-3"} strokeWidth={2.8} aria-hidden="true" />
      {value}
    </span>
  );
};

const STATUS_PILL: Record<string, PillCfg> = {
  Active:    { tone: "teal",    Icon: Check },
  Disbanded: { tone: "neutral", Icon: CircleSlash },
  Archived:  { tone: "peach",   Icon: Archive },
};
const StatusBadge = ({ status }: { status: string }) => <StatePill value={status} map={STATUS_PILL} />;

// A join policy is a *setting*, not a verdict — so the three hues are picked for
// separation (open / gated / closed) and none of them means "good" or "bad".
const POLICY_PILL: Record<string, PillCfg> = {
  PUBLIC:            { tone: "deep",   Icon: Globe },
  APPROVAL_REQUIRED: { tone: "peach",  Icon: UserCheck },
  INVITE_ONLY:       { tone: "violet", Icon: Lock },
};
const PolicyBadge = ({ policy }: { policy: string }) => <StatePill value={policy} map={POLICY_PILL} tiny />;

const QUEST_STATUS_PILL: Record<string, PillCfg> = {
  InProgress: { tone: "deep",    Icon: Play },
  Submitted:  { tone: "peach",   Icon: Send },
  Approved:   { tone: "teal",    Icon: Check },
  Rejected:   { tone: "rose",    Icon: X },
  Expired:    { tone: "neutral", Icon: Clock },
  Failed:     { tone: "rose",    Icon: X },
  NotStarted: { tone: "neutral", Icon: Minus },
};
const QuestStatusBadge = ({ status }: { status: string }) => <StatePill value={status} map={QUEST_STATUS_PILL} />;

const RAID_STATUS_PILL: Record<string, PillCfg> = {
  Upcoming: { tone: "deep",    Icon: CalendarClock },
  Active:   { tone: "peach",   Icon: Swords },
  Defeated: { tone: "teal",    Icon: Trophy },
  Failed:   { tone: "rose",    Icon: X },
  Expired:  { tone: "neutral", Icon: Clock },
  WipeOut:  { tone: "rose",    Icon: Skull },
};
const RaidStatusBadge = ({ status }: { status: string }) => <StatePill value={status} map={RAID_STATUS_PILL} />;

// ── SKELETONS ─────────────────────────────────────────────────────────────────
const SkeletonBlock = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-sky-ink/8 rounded-sky-md ${className}`} />
);
const CardSkeletonGrid = ({ count = 3 }: { count?: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sky-stagger">
    {Array.from({ length: count }).map((_, i) => <SkeletonBlock key={i} className="h-20" />)}
  </div>
);
const ListSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <div className="space-y-3">{Array.from({ length: rows }).map((_, i) => <SkeletonBlock key={i} className="h-16" />)}</div>
);

// ── EMPTY STATE ───────────────────────────────────────────────────────────────
// An empty panel gets a dashed outline and a plated glyph so it reads as "this
// is a real, currently-empty list" rather than as content that failed to load.
const EmptyState = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) => (
  <div className="flex flex-col items-center gap-3 rounded-sky-card border border-dashed border-sky-ink/15 bg-white/38 py-14">
    <span className="grid place-items-center w-14 h-14 rounded-sky-md bg-white/72 ring-1 ring-white/85 text-sky-ink-3">{icon}</span>
    <p className="font-display text-sm font-semibold text-sky-ink">{title}</p>
    {subtitle && <p className="text-xs font-medium text-sky-ink-2">{subtitle}</p>}
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
        <p className={sectionLabel}>Basic Info</p>
        {/* These four are the facts an operator reads off the party before doing
            anything else, so the figure is the display face and the label
            recedes above it — never the other way round. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sky-stagger">
          {[
            { label: "Party ID", value: `#${party.partyId}` },
            { label: "Members", value: party.maxMembers > 0 ? `${party.memberCount} / ${party.maxMembers}` : `${party.memberCount}` },
            { label: "Created At", value: fmtDate(party.createdAt) },
            { label: "Updated At", value: party.updatedAt ? fmtDate(party.updatedAt) : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-sky-md bg-white/55 ring-1 ring-white/78 px-3.5 py-3">
              <p className={eyebrow}>{label}</p>
              <p className="mt-1 font-display text-sm font-semibold text-sky-ink tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Invite Code ──────────────────────────────────────────────────── */}
      <div className={panelCls}>
        <p className={`inline-flex items-center gap-1.5 ${sectionLabel}`}>
          <Ticket className="w-3.5 h-3.5" strokeWidth={2.4} aria-hidden="true" /> Invite Code
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {/* The code itself is what gets copied out of this screen, so it is
              plated and wide-tracked — a string of look-alike characters has to
              be readable one glyph at a time. */}
          <code className={`rounded-sky-chip px-4 py-2 font-mono text-sm font-semibold tracking-[0.22em] ${party.inviteCode ? "bg-sky-deep/10 ring-1 ring-sky-deep/20 text-sky-deep" : "bg-white/62 ring-1 ring-white/85 text-sky-ink-3 tracking-normal italic"}`}>{party.inviteCode || "— none —"}</code>
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
      <div className={`${panelCls} space-y-3.5`}>
        <p className={eyebrow}>Edit Party Info</p>
        <div>
          <label className={fieldLabel}>Name</label>
          <input required maxLength={200} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className={fieldLabel}>Description</label>
          <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2} className={inputCls} />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-45">
            <label className={fieldLabel}>Join Policy</label>
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
        {/* Unsaved edits are stated in words next to the button rather than left
            to the button's enabled-ness, which is easy to miss. */}
        {infoChanged && !savingInfo && (
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-peach-deep">
            <AlertTriangle className="w-3 h-3" strokeWidth={2.6} aria-hidden="true" /> Unsaved changes
          </p>
        )}
      </div>

      {/* ── Transfer Mentor ──────────────────────────────────────────────── */}
      {/* Handing a party to another mentor is the one consequential action on this
          tab, so it gets its own railed panel instead of sitting flush with the
          ordinary edit fields above it. */}
      <div className={`relative overflow-hidden ${panelCls} pl-5`}>
        <span className="absolute left-0 top-0 h-full w-[3px] bg-sky-peach" aria-hidden="true" />
        <p className={`inline-flex items-center gap-1.5 ${sectionLabel}`}>
          <UserCog className="w-3.5 h-3.5" strokeWidth={2.4} aria-hidden="true" /> Transfer Ownership
        </p>
        <p className="mb-3.5 text-sm font-medium text-sky-ink-2">Currently owned by <span className="font-display font-semibold text-sky-ink">{party.mentorUsername ?? `#${party.mentorUserId}`}</span>.</p>
        {mentorsLoading ? (
          <div className="flex items-center gap-2 py-2 text-sm font-medium text-sky-ink-3"><Loader2 className="w-4 h-4 animate-spin" /> Loading mentors…</div>
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
  if (members.length === 0) return <EmptyState icon={<Users className="w-6 h-6" strokeWidth={1.9} aria-hidden="true" />} title="No members yet" />;

  return (
    <div className="space-y-2 sky-stagger">
      {members.map((m) => (
        <div key={m.partyMemberId} className={`flex items-center justify-between gap-3 px-4 py-3 ${rowCls}`}>
          <div className="flex items-center gap-3 min-w-0">
            {/* An initial-plate gives a long roster a vertical rhythm to scan
                down, which a column of bare names does not have. */}
            <span className="grid place-items-center w-9 h-9 shrink-0 rounded-sky-chip bg-sky-violet/12 ring-1 ring-sky-violet/22 font-display text-sm font-semibold uppercase text-sky-violet-deep">
              {m.username?.charAt(0) ?? "?"}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold text-sky-ink">{m.username}</p>
              <p className="text-xs font-medium text-sky-ink-3 tabular-nums">#{m.userId} · Joined {m.joinedAt ? fmtDate(m.joinedAt) : "—"}</p>
            </div>
          </div>
          <SkyButton
            type="button"
            variant="destructive"
            size="icon"
            onClick={() => handleRemove(m.userId)}
            disabled={removingId === m.userId}
            title="Remove from party"
            aria-label={`Remove ${m.username} from party`}
          >
            {removingId === m.userId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
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
  if (requests.length === 0) return <EmptyState icon={<ClipboardList className="w-6 h-6" strokeWidth={1.9} aria-hidden="true" />} title="No pending join requests" />;

  return (
    <div className="space-y-2 sky-stagger">
      {requests.map((r) => (
        <div key={r.requestId} className={`relative flex items-center justify-between gap-3 overflow-hidden pl-5 pr-4 py-3 ${rowCls}`}>
          {/* Every row in this list is waiting on a decision, so each one carries
              the same peach rail — the tab badge says how many, the rail says
              which. */}
          <span className="absolute left-0 top-0 h-full w-[3px] bg-sky-peach" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold text-sky-ink">{r.username}</p>
            {r.message && <p className="truncate text-xs font-medium italic text-sky-ink-2">"{r.message}"</p>}
            <p className="text-xs font-medium text-sky-ink-3 tabular-nums">Requested {fmtDateTime(r.requestedAt)}</p>
          </div>
          {/* Approve is a genuinely affirmative outcome (teal) and reject closes
              the door (rose) — the pair reads as one decision, not two buttons. */}
          <div className="flex items-center gap-2 shrink-0">
            <SkyButton type="button" variant="success" size="sm" onClick={() => handleDecision(r.requestId, true)} disabled={processingId === r.requestId}>
              <Check className="w-3.5 h-3.5" /> Approve
            </SkyButton>
            <SkyButton type="button" variant="destructive" size="sm" onClick={() => handleDecision(r.requestId, false)} disabled={processingId === r.requestId}>
              <X className="w-3.5 h-3.5" /> Reject
            </SkyButton>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── TAB: QUESTS ───────────────────────────────────────────────────────────────
const QuestsTab = ({ quests, loading }: { quests: UserQuestDto[]; loading: boolean }) => {
  if (loading) return <CardSkeletonGrid />;
  if (quests.length === 0) return <EmptyState icon={<ClipboardList className="w-6 h-6" strokeWidth={1.9} aria-hidden="true" />} title="No quests assigned to this party yet" />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sky-stagger">
      {quests.map((q) => (
        <div key={q.questId} className={`flex flex-col gap-2.5 p-4 ${rowCls}`}>
          <div className="flex items-start justify-between gap-2">
            {/* The title is what an operator scans this grid by, so it is the
                only display-face element in the card. */}
            <p className="font-display text-sm font-semibold leading-snug text-sky-ink">{q.title}</p>
            <QuestStatusBadge status={q.status} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center rounded-sky-chip ring-1 px-2 py-0.5 text-[10px] font-semibold ${TONE.violet.chip}`}>{q.questType}</span>
            <span className={`inline-flex items-center rounded-sky-chip ring-1 px-2 py-0.5 text-[10px] font-semibold ${TONE.deep.chip}`}>{q.difficulty}</span>
          </div>
          {/* Each payout is tinted by what it *is* — gold is a reward (peach), xp
              is progress (deep), damage is damage (dmg) — so the three numbers
              stay distinguishable when they sit on one line. */}
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/72 pt-2.5">
            <span className="text-[11px] font-medium text-sky-ink-3">{q.deadlineAt ? `Due ${fmtDate(q.deadlineAt)}` : "No deadline"}</span>
            <span className="inline-flex items-center gap-1.5 font-display text-[11px] font-semibold tabular-nums">
              <span className="text-sky-peach-deep">{q.rewardGold}g</span>
              <span className="text-sky-ink-3">·</span>
              <span className="text-sky-deep">{q.rewardXp}xp</span>
              {q.damage > 0 && (
                <>
                  <span className="text-sky-ink-3">·</span>
                  <span className="text-sky-dmg-deep">{q.damage} dmg</span>
                </>
              )}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── TAB: BOSS RAID ────────────────────────────────────────────────────────────
const RaidsTab = ({ raids, loading }: { raids: PartyRaidDto[]; loading: boolean }) => {
  if (loading) return <ListSkeleton />;
  if (raids.length === 0) return <EmptyState icon={<Swords className="w-6 h-6" strokeWidth={1.9} aria-hidden="true" />} title="No boss raid history for this party" />;

  return (
    <div className="space-y-3 sky-stagger">
      {raids.map((r) => {
        const pct = Math.max(0, Math.min(100, r.healthPercentage));
        return (
          <div key={r.raidId} className={`space-y-2.5 p-4 ${rowCls}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="inline-flex items-center gap-2 font-display text-sm font-semibold text-sky-ink">
                <span className="grid place-items-center w-7 h-7 shrink-0 rounded-[10px] bg-sky-dmg/12 ring-1 ring-sky-dmg/22 text-sky-dmg-deep">
                  <Skull className="w-3.5 h-3.5" strokeWidth={2.3} aria-hidden="true" />
                </span>
                {r.bossName}
              </p>
              <RaidStatusBadge status={r.status} />
            </div>
            {/* Remaining boss HP is a damage quantity, so the fill is the damage
                orange on a recessed navy well — and the percentage is printed
                next to it, because a bar alone can't be read precisely. */}
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-sky-ink/10">
              <div className="h-full rounded-full bg-linear-to-r from-sky-peach to-sky-dmg transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-sky-ink-2 tabular-nums">
              <span><span className="font-display font-semibold text-sky-ink">{r.currentHp.toLocaleString()}</span> / {r.maxHp.toLocaleString()} HP ({pct.toFixed(0)}%)</span>
              <span className="text-sky-ink-3">{fmtDate(r.weekStartDate)} → {fmtDate(r.weekEndDate)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
type TabId = "overview" | "members" | "joinRequests" | "quests" | "raids";

const TABS: { id: TabId; label: string; Icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", Icon: UserRoundCog },
  { id: "members", label: "Members", Icon: Users },
  { id: "joinRequests", label: "Join Requests", Icon: ClipboardList },
  { id: "quests", label: "Quests", Icon: ClipboardList },
  { id: "raids", label: "Boss Raid", Icon: Swords },
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
    return <EmptyState icon={<ClipboardList className="w-6 h-6" strokeWidth={1.9} aria-hidden="true" />} title="Invalid party id" />;
  }

  return (
    <>
      <PageMeta title="Party Detail | HabitEvolve Admin" description="Manage a party's members, join requests, quests, and boss raid history." />
      <PageBreadcrumb pageTitle="Party Detail" />

      <div className="space-y-6">
        <button type="button" onClick={() => navigate("/admin/parties")} className="group inline-flex items-center gap-1.5 rounded-sky-chip bg-white/55 ring-1 ring-white/78 px-3 py-1.5 text-sm font-semibold text-sky-ink-2 transition-all hover:bg-white/78 hover:text-sky-ink">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" /> Back to Party Management
        </button>

        {partyLoading ? (
          <div className="flex items-center gap-4">
            <SkeletonBlock className="w-16 h-16 rounded-full" />
            <div className="space-y-2"><SkeletonBlock className="h-6 w-40" /><SkeletonBlock className="h-4 w-56" /></div>
          </div>
        ) : partyError || !party ? (
          <div className="relative flex items-start gap-3 overflow-hidden rounded-sky-card bg-sky-rose/10 pl-5 pr-4 py-4">
            <span className="absolute left-0 top-0 h-full w-[3px] bg-sky-rose" aria-hidden="true" />
            <AlertTriangle className="w-5 h-5 shrink-0 mt-px text-sky-rose-deep" strokeWidth={2.2} aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-sky-rose-deep">Couldn't load this party</p>
              <p className="mt-0.5 text-sm font-medium text-sky-ink-2">{partyError ?? "Party not found."}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4 sky-in">
            {/* A party is a game/social object, so its plate is violet — the same
                hue the party concept carries everywhere else in the console. */}
            <div className="grid place-items-center w-16 h-16 shrink-0 rounded-sky-md bg-sky-violet/12 ring-1 ring-sky-violet/22 text-sky-violet-deep">
              <Users className="w-7 h-7" strokeWidth={2} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className={eyebrow}>Party</p>
              <p className="font-display text-sky-h2 font-semibold leading-tight text-sky-ink">{party.name}</p>
              {party.description && <p className="mt-0.5 text-sm font-medium text-sky-ink-2">{party.description}</p>}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <StatusBadge status={party.status} />
                <PolicyBadge policy={party.joinPolicy} />
                <span className="inline-flex items-center gap-1.5 rounded-sky-chip bg-white/62 ring-1 ring-white/85 px-2 py-0.5 text-xs font-medium text-sky-ink-2">
                  <UserRoundCog className="w-3 h-3" strokeWidth={2.4} aria-hidden="true" />
                  Mentor: <span className="font-semibold text-sky-ink">{party.mentorUsername ?? `#${party.mentorUserId}`}</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {!partyLoading && party && (
          <>
            {/* One recessed track holding five segments, so the tab strip reads as
                a single control and only the active segment lifts out of it —
                cleaner than an underline that fights the glass card below. */}
            <div className="flex items-center gap-1.5 overflow-x-auto rounded-sky-md bg-white/42 ring-1 ring-white/70 p-2">
              {TABS.map((tt) => {
                const active = tab === tt.id;
                const TabIcon = tt.Icon;
                return (
                  <button
                    type="button"
                    key={tt.id}
                    onClick={() => setTab(tt.id)}
                    aria-pressed={active}
                    className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sky-chip px-4 py-2 text-sm font-semibold transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      active
                        ? "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-chip"
                        : "text-sky-ink-2 hover:bg-white/72 hover:text-sky-ink"
                    }`}
                  >
                    <TabIcon className="w-4 h-4" strokeWidth={2.3} aria-hidden="true" /> {tt.label}
                    {/* Pending requests are the one thing on this page that wants a
                        human, so the count is peach — attention, not error. */}
                    {tt.id === "joinRequests" && !joinRequestsLoading && joinRequests.length > 0 && (
                      <span className={`rounded-sky-chip px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${active ? "bg-white/25 text-white" : "bg-sky-peach/24 text-sky-peach-deep"}`}>{joinRequests.length}</span>
                    )}
                  </button>
                );
              })}
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

import { useState, useEffect, useCallback } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import partyMentorApi from "../api/mentorPartyApi";
import PartyChatDrawer from "../components/chat/PartyChatDrawer";
import type {
  PartyItem,
  JoinRequestItem,
  PartyMember,
  CreatePartyPayload,
  UpdatePartyPayload,
  JoinPolicy,
} from "../types/api.types";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const POLICY_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  PUBLIC:            { label: "Public",            bg: "bg-emerald-100", border: "border-emerald-500", text: "text-emerald-800" },
  APPROVAL_REQUIRED: { label: "Approval Required", bg: "bg-yellow-100",  border: "border-yellow-500",  text: "text-yellow-800"  },
  INVITE_ONLY:       { label: "Invite Only",       bg: "bg-purple-100",  border: "border-purple-500",  text: "text-purple-800"  },
};

const JOIN_POLICIES = ["PUBLIC", "APPROVAL_REQUIRED", "INVITE_ONLY"] as const;

// ── SHARED STYLES ─────────────────────────────────────────────────────────────
const btnBase =
  "inline-flex items-center gap-2 px-4 py-2 font-black text-sm border-2 border-black rounded-full " +
  "shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 " +
  "disabled:shadow-[3px_3px_0_0_#1A1D20] transition-all";

const inputCls =
  "w-full px-4 py-2.5 border-2 border-black rounded-2xl text-sm font-medium bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder:text-gray-400";

// ── SPINNER ───────────────────────────────────────────────────────────────────
const Spinner = ({ size = 20 }: { size?: number }) => (
  <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

// ── JOIN POLICY BADGE ─────────────────────────────────────────────────────────
const JoinPolicyBadge = ({ policy }: { policy: JoinPolicy | string }) => {
  const s = POLICY_STYLES[policy] ?? POLICY_STYLES["PUBLIC"];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black border-2 flex-shrink-0 ${s.bg} ${s.border} ${s.text}`}
    >
      {s.label}
    </span>
  );
};

// ── ALERT BANNER ──────────────────────────────────────────────────────────────
const AlertBanner = ({ alert }: { alert: { type: "success" | "error"; message: string } }) =>
  alert.type === "success" ? (
    <div className="mb-5 flex items-center gap-3 bg-emerald-50 border-4 border-emerald-500 rounded-2xl shadow-[4px_4px_0_0_#1A1D20] px-5 py-3.5">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span className="font-black text-emerald-800 text-sm">{alert.message}</span>
    </div>
  ) : (
    <div className="mb-5 flex items-center gap-3 bg-red-50 border-4 border-red-500 rounded-2xl shadow-[4px_4px_0_0_#1A1D20] px-5 py-3.5">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span className="font-black text-red-800 text-sm">{alert.message}</span>
    </div>
  );

// ── GAME MODAL ────────────────────────────────────────────────────────────────
const GameModal = ({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
    <div className="bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0_0_#1A1D20] w-full max-w-md my-4">
      <div className="flex items-center justify-between px-6 py-5 border-b-2 border-black">
        <h2 className="text-lg font-black text-gray-900">{title}</h2>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 border-2 border-black rounded-xl bg-white shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
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

// ── SECTION CARD WRAPPER ──────────────────────────────────────────────────────
const SectionCard = ({ title, icon, badge, children }: {
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="bg-white border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] p-6">
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
        <span className="text-gray-600">{icon}</span>
        {title}
      </h2>
      {badge}
    </div>
    {children}
  </div>
);

// ── COUNTER BADGE ─────────────────────────────────────────────────────────────
const CountBadge = ({ count, color = "bg-blue-100 text-blue-900" }: { count: number; color?: string }) => (
  <span className={`flex items-center justify-center h-6 min-w-[28px] px-2 border-2 border-black rounded-full text-xs font-black shadow-[1px_1px_0_0_#1A1D20] ${color}`}>
    {count}
  </span>
);

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function PartyManagement() {

  // ── VIEW STATE ─────────────────────────────────────────────────────────────
  const [selectedParty, setSelectedParty] = useState<PartyItem | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  // ── ALERT ──────────────────────────────────────────────────────────────────
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 4000);
    return () => clearTimeout(t);
  }, [alert]);

  // ── PARTY LIST ─────────────────────────────────────────────────────────────
  const [parties, setParties] = useState<PartyItem[]>([]);
  const [loadingParties, setLoadingParties] = useState(false);
  const [partiesError, setPartiesError] = useState<string | null>(null);

  const fetchParties = useCallback(async () => {
    setLoadingParties(true);
    setPartiesError(null);
    try {
      const res = await partyMentorApi.getMentorParties();
      if (res.success && res.data) setParties(res.data);
      else setPartiesError(res.message ?? "Failed to load parties.");
    } catch (err: any) {
      setPartiesError(err?.response?.data?.message ?? "Failed to load parties.");
    } finally {
      setLoadingParties(false);
    }
  }, []);

  useEffect(() => { fetchParties(); }, [fetchParties]);

  // ── CREATE PARTY ────────────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<Pick<CreatePartyPayload, "name" | "description" | "joinPolicy">>({
    name: "",
    description: "",
    joinPolicy: "PUBLIC",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const resetCreateModal = () => {
    setShowCreate(false);
    setCreateForm({ name: "", description: "", joinPolicy: "PUBLIC" });
    setCreateError(null);
  };

  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    const mentorUserId = Number(localStorage.getItem("user_id") ?? 0);
    try {
      const res = await partyMentorApi.createParty({ ...createForm, mentorUserId });
      if (res.success) {
        resetCreateModal();
        setAlert({ type: "success", message: "Party created successfully! 🎉" });
        fetchParties();
      } else {
        setCreateError(res.message ?? "Failed to create party.");
      }
    } catch (err: any) {
      setCreateError(err?.response?.data?.message ?? "Failed to create party.");
    } finally {
      setCreating(false);
    }
  };

  // ── INVITE CODE ─────────────────────────────────────────────────────────────
  const [inviteCode, setInviteCode] = useState("");
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    if (selectedParty) setInviteCode(selectedParty.inviteCode ?? "");
  }, [selectedParty]);

  const handleGenerateCode = async () => {
    if (!selectedParty) return;
    setGeneratingCode(true);
    try {
      const res = await partyMentorApi.generateInviteCode(selectedParty.partyId);
      if (res.success && res.data) {
        setInviteCode(res.data);
        setAlert({ type: "success", message: "New invite code generated!" });
      } else {
        setAlert({ type: "error", message: res.message ?? "Failed to regenerate code." });
      }
    } catch (err: any) {
      setAlert({ type: "error", message: err?.response?.data?.message ?? "Failed to regenerate code." });
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      setAlert({ type: "error", message: "Could not copy to clipboard." });
    }
  };

  // ── MEMBERS ─────────────────────────────────────────────────────────────────
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberToKick, setMemberToKick] = useState<PartyMember | null>(null);
  const [kicking, setKicking] = useState(false);

  const fetchMembers = useCallback(async (partyId: number) => {
    setLoadingMembers(true);
    try {
      const res = await partyMentorApi.getPartyMembers(partyId);
      if (res.success && res.data) setMembers(res.data);
    } catch {
      // silent — member list just stays empty
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  const handleKickConfirm = async () => {
    if (!selectedParty || !memberToKick) return;
    setKicking(true);
    try {
      const res = await partyMentorApi.removePlayerFromParty(selectedParty.partyId, memberToKick.userId);
      if (res.success) {
        setAlert({ type: "success", message: `${memberToKick.username} has been removed from the party.` });
        fetchMembers(selectedParty.partyId);
      } else {
        setAlert({ type: "error", message: res.message ?? "Failed to remove member." });
      }
    } catch (err: any) {
      setAlert({ type: "error", message: err?.response?.data?.message ?? "Failed to remove member." });
    } finally {
      setKicking(false);
      setMemberToKick(null);
    }
  };

  // ── JOIN REQUESTS ───────────────────────────────────────────────────────────
  const [joinRequests, setJoinRequests] = useState<JoinRequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [processingReqId, setProcessingReqId] = useState<number | null>(null);

  const fetchJoinRequests = useCallback(async (partyId: number) => {
    setLoadingRequests(true);
    try {
      const res = await partyMentorApi.getJoinRequests(partyId);
      if (res.success && res.data) setJoinRequests(res.data);
    } catch {
      // silent
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  const handleApprove = async (requestId: number) => {
    if (!selectedParty) return;
    setProcessingReqId(requestId);
    try {
      const res = await partyMentorApi.approveJoinRequest(selectedParty.partyId, requestId);
      if (res.success) {
        setAlert({ type: "success", message: "Join request approved! Player added to party." });
        fetchJoinRequests(selectedParty.partyId);
        fetchMembers(selectedParty.partyId);
      } else {
        setAlert({ type: "error", message: res.message ?? "Failed to approve request." });
      }
    } catch (err: any) {
      setAlert({ type: "error", message: err?.response?.data?.message ?? "Failed to approve request." });
    } finally {
      setProcessingReqId(null);
    }
  };

  const handleReject = async (requestId: number) => {
    if (!selectedParty) return;
    setProcessingReqId(requestId);
    try {
      const res = await partyMentorApi.rejectJoinRequest(selectedParty.partyId, requestId);
      if (res.success) {
        setAlert({ type: "success", message: "Request rejected." });
        fetchJoinRequests(selectedParty.partyId);
      } else {
        setAlert({ type: "error", message: res.message ?? "Failed to reject request." });
      }
    } catch (err: any) {
      setAlert({ type: "error", message: err?.response?.data?.message ?? "Failed to reject request." });
    } finally {
      setProcessingReqId(null);
    }
  };

  // Load detail data when party is selected
  useEffect(() => {
    if (!selectedParty) return;
    fetchMembers(selectedParty.partyId);
    if (selectedParty.joinPolicy === "APPROVAL_REQUIRED") {
      fetchJoinRequests(selectedParty.partyId);
    } else {
      setJoinRequests([]);
    }
  }, [selectedParty, fetchMembers, fetchJoinRequests]);

  const handleBackToList = () => {
    setSelectedParty(null);
    setMembers([]);
    setJoinRequests([]);
    setInviteCode("");
    setChatOpen(false);
  };

  // ── UPDATE PARTY ────────────────────────────────────────────────────────────
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<UpdatePartyPayload>({
    name: "",
    description: "",
    joinPolicy: "PUBLIC",
  });
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const openEditModal = () => {
    if (!selectedParty) return;
    setEditForm({
      name: selectedParty.name,
      description: selectedParty.description,
      joinPolicy: selectedParty.joinPolicy,
    });
    setEditError(null);
    setShowEdit(true);
  };

  const resetEditModal = () => {
    setShowEdit(false);
    setEditError(null);
  };

  const handleUpdateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty) return;
    setUpdating(true);
    setEditError(null);
    try {
      const res = await partyMentorApi.updateParty(selectedParty.partyId, editForm);
      if (res.success) {
        setSelectedParty((prev) => prev ? { ...prev, ...editForm } : null);
        resetEditModal();
        setAlert({ type: "success", message: "Party updated successfully!" });
        fetchParties();
      } else {
        setEditError(res.message ?? "Failed to update party.");
      }
    } catch (err) {
      setEditError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? "Failed to update party."
      );
    } finally {
      setUpdating(false);
    }
  };

  // ── DISBAND PARTY ───────────────────────────────────────────────────────────
  const [showDisband, setShowDisband] = useState(false);
  const [disbanding, setDisbanding] = useState(false);

  const handleDisbandConfirm = async () => {
    if (!selectedParty) return;
    setDisbanding(true);
    const disbandedName = selectedParty.name;
    try {
      const res = await partyMentorApi.deleteParty(selectedParty.partyId);
      if (res.success) {
        setShowDisband(false);
        setSelectedParty(null);
        setMembers([]);
        setJoinRequests([]);
        setInviteCode("");
        setAlert({ type: "success", message: `"${disbandedName}" has been disbanded.` });
        fetchParties();
      } else {
        setAlert({ type: "error", message: res.message ?? "Failed to disband party." });
        setShowDisband(false);
      }
    } catch (err) {
      setAlert({
        type: "error",
        message:
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            ?? "Failed to disband party.",
      });
      setShowDisband(false);
    } finally {
      setDisbanding(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <>
      <PageMeta
        title="Party Management | HabitEvolve"
        description="Manage your mentor parties and guide players"
      />
      <PageBreadcrumb pageTitle="Party Management" />

      {alert && <AlertBanner alert={alert} />}

      {/* ══════════════════ VIEW 1: PARTY OVERVIEW LIST ══════════════════ */}
      {!selectedParty && (
        <div>
          {/* Header bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-black text-gray-900">Group Workspace</h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                Build and manage parties to guide your players.
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className={`${btnBase} bg-orange-300 text-gray-900`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create New Party
            </button>
          </div>

          {/* Loading state */}
          {loadingParties && (
            <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
              <Spinner size={24} />
              <span className="font-bold text-sm">Loading parties…</span>
            </div>
          )}

          {/* Error state */}
          {!loadingParties && partiesError && (
            <div className="bg-red-50 border-4 border-red-400 rounded-3xl shadow-[4px_4px_0_0_#1A1D20] px-6 py-5 flex items-center justify-between gap-4">
              <span className="font-black text-red-800 text-sm">{partiesError}</span>
              <button onClick={fetchParties} className={`${btnBase} bg-white text-gray-800 text-xs`}>
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loadingParties && !partiesError && parties.length === 0 && (
            <div className="text-center py-24 border-4 border-dashed border-gray-300 rounded-3xl bg-gray-50">
              <div className="text-5xl mb-4">🏕️</div>
              <p className="font-black text-gray-700 text-xl">No parties yet</p>
              <p className="text-gray-500 text-sm mt-1 font-medium">
                Create your first party to start guiding players.
              </p>
            </div>
          )}

          {/* Party grid */}
          {!loadingParties && !partiesError && parties.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {parties.map((party) => (
                <button
                  key={party.partyId}
                  onClick={() => setSelectedParty(party)}
                  className="group text-left bg-white border-4 border-black rounded-3xl shadow-[6px_6px_0_0_#1A1D20] hover:shadow-[2px_2px_0_0_#1A1D20] hover:translate-x-[4px] hover:translate-y-[4px] transition-all p-6 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-black text-gray-900 leading-tight text-left">{party.name}</h3>
                    <JoinPolicyBadge policy={party.joinPolicy} />
                  </div>
                  <p className="text-sm text-gray-500 font-medium line-clamp-2 flex-1 text-left">
                    {party.description || "No description provided."}
                  </p>
                  <div className="flex items-center gap-2 pt-3 border-t-2 border-dashed border-gray-200">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span className="text-sm font-black text-gray-700">{party.memberCount ?? 0} members</span>
                    <span className="ml-auto text-xs text-gray-400 font-semibold group-hover:text-orange-500 transition-colors">
                      Open →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ VIEW 2: PARTY WORKSPACE ══════════════════ */}
      {selectedParty && (
        <div className="space-y-6">

          {/* Back + party title + edit button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <button onClick={handleBackToList} className={`${btnBase} bg-white text-gray-800 flex-shrink-0`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back to List
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-black text-gray-900 truncate">{selectedParty.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <JoinPolicyBadge policy={selectedParty.joinPolicy} />
                {selectedParty.description && (
                  <span className="text-sm text-gray-500 font-medium truncate">
                    {selectedParty.description}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={openEditModal}
              className={`${btnBase} bg-blue-100 text-blue-900 flex-shrink-0`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit Party
            </button>
            <button
              onClick={() => setChatOpen(true)}
              className={`${btnBase} bg-emerald-300 text-gray-900 flex-shrink-0`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Open Chat
            </button>
          </div>

          {/* ── SECTION A: Invite Code ─────────────────────────────────── */}
          <SectionCard
            title="Invite Code"
            icon={
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            }
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Code display box */}
              <div className="flex-1 flex items-center bg-gray-50 border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] px-5 py-3 min-w-0">
                <code className="flex-1 text-xl font-black tracking-widest text-gray-900 select-all truncate">
                  {inviteCode || "—"}
                </code>
              </div>
              {/* Action buttons */}
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={handleCopyCode}
                  disabled={!inviteCode}
                  className={`${btnBase} bg-blue-100 text-blue-900`}
                >
                  {codeCopied ? (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
                <button
                  onClick={handleGenerateCode}
                  disabled={generatingCode}
                  className={`${btnBase} bg-orange-300 text-gray-900`}
                >
                  {generatingCode ? (
                    <><Spinner size={13} /> Generating…</>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10" />
                        <polyline points="1 20 1 14 7 14" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                      </svg>
                      Regenerate
                    </>
                  )}
                </button>
              </div>
            </div>
          </SectionCard>

          {/* ── SECTION B: Members ─────────────────────────────────────── */}
          <SectionCard
            title="Active Members"
            icon={
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
            badge={<CountBadge count={members.length} color="bg-blue-100 text-blue-900" />}
          >
            {loadingMembers ? (
              <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
                <Spinner size={20} />
                <span className="text-sm font-bold">Loading members…</span>
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                <p className="text-sm font-bold text-gray-400">No members in this party yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="text-left pb-3 text-xs font-black text-gray-500 uppercase tracking-wide w-10">#</th>
                      <th className="text-left pb-3 text-xs font-black text-gray-500 uppercase tracking-wide">Player</th>
                      <th className="text-right pb-3 text-xs font-black text-gray-500 uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-gray-100">
                    {members.map((m, i) => (
                      <tr key={m.userId} className="hover:bg-red-50 transition-colors">
                        <td className="py-3 pr-3 text-sm font-black text-gray-400">{i + 1}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-black bg-gradient-to-br from-purple-200 to-blue-200 text-xs font-black text-gray-900 flex-shrink-0">
                              {m.username.charAt(0).toUpperCase()}
                            </span>
                            <span className="text-sm font-bold text-gray-800">{m.username}</span>
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => setMemberToKick(m)}
                            className={`${btnBase} bg-red-100 text-red-700 text-xs`}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6M14 11v6" />
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                            Kick
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* ── DANGER ZONE ────────────────────────────────────────────── */}
          <div className="bg-red-50 border-4 border-red-400 rounded-3xl shadow-[6px_6px_0_0_#1A1D20] p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-red-800 text-base flex items-center gap-2">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  Danger Zone
                </h3>
                <p className="text-sm text-red-700 font-medium mt-0.5">
                  Disbanding will permanently delete this party and remove all members.
                </p>
              </div>
              <button
                onClick={() => setShowDisband(true)}
                className={`${btnBase} bg-red-500 text-white flex-shrink-0`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
                Disband Party
              </button>
            </div>
          </div>

          {/* ── SECTION C: Join Requests (APPROVAL_REQUIRED only) ─────── */}
          {selectedParty.joinPolicy === "APPROVAL_REQUIRED" && (
            <SectionCard
              title="Pending Join Requests"
              icon={
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              }
              badge={
                joinRequests.length > 0 ? (
                  <CountBadge count={joinRequests.length} color="bg-yellow-100 text-yellow-900" />
                ) : undefined
              }
            >
              {loadingRequests ? (
                <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
                  <Spinner size={20} />
                  <span className="text-sm font-bold">Loading requests…</span>
                </div>
              ) : joinRequests.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                  <p className="text-sm font-bold text-gray-400">No pending requests. 🎉</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {joinRequests.map((req) => (
                    <div
                      key={req.requestId}
                      className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-yellow-50 border-2 border-black rounded-2xl shadow-[3px_3px_0_0_#1A1D20] px-4 py-4"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-black bg-gradient-to-br from-yellow-200 to-orange-200 text-sm font-black text-gray-900 flex-shrink-0">
                          {req.username.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-gray-900 truncate">{req.username}</p>
                          {req.message && (
                            <p className="text-xs text-gray-500 font-medium truncate">
                              "{req.message}"
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleApprove(req.requestId)}
                          disabled={processingReqId === req.requestId}
                          className={`${btnBase} bg-emerald-100 text-emerald-800 text-xs`}
                        >
                          {processingReqId === req.requestId ? (
                            <Spinner size={12} />
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(req.requestId)}
                          disabled={processingReqId === req.requestId}
                          className={`${btnBase} bg-red-100 text-red-700 text-xs`}
                        >
                          {processingReqId === req.requestId ? (
                            <Spinner size={12} />
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          )}
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}
        </div>
      )}

      {/* ══════════════════ MODAL: CREATE PARTY ══════════════════════ */}
      {showCreate && (
        <GameModal title="Create New Party" onClose={resetCreateModal}>
          <form onSubmit={handleCreateParty} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-xs font-black text-gray-700 uppercase tracking-wide mb-1.5">
                Party Name *
              </label>
              <input
                type="text"
                required
                value={createForm.name}
                onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Morning Risers Squad"
                className={inputCls}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-black text-gray-700 uppercase tracking-wide mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                value={createForm.description}
                onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="What is this party about?"
                className={`${inputCls} resize-none`}
              />
            </div>

            {/* Join Policy radio group */}
            <div>
              <label className="block text-xs font-black text-gray-700 uppercase tracking-wide mb-2">
                Join Policy *
              </label>
              <div className="flex flex-col gap-2">
                {JOIN_POLICIES.map((policy) => {
                  const s = POLICY_STYLES[policy];
                  const checked = createForm.joinPolicy === policy;
                  return (
                    <label
                      key={policy}
                      className={`flex items-center gap-3 px-4 py-3 border-2 rounded-2xl cursor-pointer transition-all ${
                        checked
                          ? `${s.bg} ${s.border} shadow-[2px_2px_0_0_#1A1D20]`
                          : "border-gray-200 bg-gray-50 hover:border-gray-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="joinPolicy"
                        value={policy}
                        checked={checked}
                        onChange={() => setCreateForm((p) => ({ ...p, joinPolicy: policy }))}
                        className="sr-only"
                      />
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          checked ? `${s.border} ${s.bg}` : "border-gray-400 bg-white"
                        }`}
                      >
                        {checked && <span className="w-2 h-2 rounded-full bg-gray-900" />}
                      </span>
                      <span className={`text-sm font-black ${checked ? s.text : "text-gray-600"}`}>
                        {s.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Inline error */}
            {createError && (
              <p className="text-xs font-bold text-red-600 bg-red-50 border-2 border-red-300 rounded-xl px-3 py-2">
                {createError}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={resetCreateModal}
                className={`${btnBase} flex-1 justify-center bg-white text-gray-700`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className={`${btnBase} flex-1 justify-center bg-orange-300 text-gray-900`}
              >
                {creating ? (
                  <><Spinner size={13} /> Creating…</>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Create Party
                  </>
                )}
              </button>
            </div>
          </form>
        </GameModal>
      )}

      {/* ══════════════════ MODAL: EDIT PARTY ═══════════════════════ */}
      {showEdit && (
        <GameModal title="Edit Party" onClose={resetEditModal}>
          <form onSubmit={handleUpdateParty} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-xs font-black text-gray-700 uppercase tracking-wide mb-1.5">
                Party Name *
              </label>
              <input
                type="text"
                required
                value={editForm.name ?? ""}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Morning Risers Squad"
                className={inputCls}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-black text-gray-700 uppercase tracking-wide mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                value={editForm.description ?? ""}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="What is this party about?"
                className={`${inputCls} resize-none`}
              />
            </div>

            {/* Join Policy radio group */}
            <div>
              <label className="block text-xs font-black text-gray-700 uppercase tracking-wide mb-2">
                Join Policy *
              </label>
              <div className="flex flex-col gap-2">
                {JOIN_POLICIES.map((policy) => {
                  const s = POLICY_STYLES[policy];
                  const checked = editForm.joinPolicy === policy;
                  return (
                    <label
                      key={policy}
                      className={`flex items-center gap-3 px-4 py-3 border-2 rounded-2xl cursor-pointer transition-all ${
                        checked
                          ? `${s.bg} ${s.border} shadow-[2px_2px_0_0_#1A1D20]`
                          : "border-gray-200 bg-gray-50 hover:border-gray-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="editJoinPolicy"
                        value={policy}
                        checked={checked}
                        onChange={() => setEditForm((p) => ({ ...p, joinPolicy: policy }))}
                        className="sr-only"
                      />
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          checked ? `${s.border} ${s.bg}` : "border-gray-400 bg-white"
                        }`}
                      >
                        {checked && <span className="w-2 h-2 rounded-full bg-gray-900" />}
                      </span>
                      <span className={`text-sm font-black ${checked ? s.text : "text-gray-600"}`}>
                        {s.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Inline error */}
            {editError && (
              <p className="text-xs font-bold text-red-600 bg-red-50 border-2 border-red-300 rounded-xl px-3 py-2">
                {editError}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={resetEditModal}
                className={`${btnBase} flex-1 justify-center bg-white text-gray-700`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className={`${btnBase} flex-1 justify-center bg-blue-100 text-blue-900`}
              >
                {updating ? (
                  <><Spinner size={13} /> Saving…</>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </GameModal>
      )}

      {/* ══════════════════ MODAL: CONFIRM DISBAND ═══════════════════ */}
      {showDisband && (
        <GameModal title="Disband Party?" onClose={() => setShowDisband(false)}>
          <div className="text-center space-y-5">
            <div className="flex items-center justify-center">
              <span className="flex items-center justify-center w-16 h-16 rounded-full border-4 border-black bg-red-100 shadow-[4px_4px_0_0_#1A1D20] text-3xl">
                ⚠️
              </span>
            </div>
            <div>
              <p className="font-black text-gray-900 text-lg">
                Disband{" "}
                <span className="text-red-600">{selectedParty?.name}</span>?
              </p>
              <p className="text-sm text-gray-600 font-medium mt-2 leading-relaxed bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3">
                Are you sure you want to disband this party? This action cannot be undone and all members will be kicked.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDisband(false)}
                disabled={disbanding}
                className={`${btnBase} flex-1 justify-center bg-white text-gray-700`}
              >
                Cancel
              </button>
              <button
                onClick={handleDisbandConfirm}
                disabled={disbanding}
                className={`${btnBase} flex-1 justify-center bg-red-500 text-white`}
              >
                {disbanding ? (
                  <><Spinner size={13} /> Disbanding…</>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                    Yes, Disband
                  </>
                )}
              </button>
            </div>
          </div>
        </GameModal>
      )}

      {/* ══════════════════ MODAL: CONFIRM KICK ══════════════════════ */}
      {memberToKick && (
        <GameModal title="Remove Member?" onClose={() => setMemberToKick(null)}>
          <div className="text-center space-y-5">
            <div className="flex items-center justify-center">
              <span className="flex items-center justify-center w-16 h-16 rounded-full border-4 border-black bg-red-100 shadow-[4px_4px_0_0_#1A1D20] text-3xl">
                🚫
              </span>
            </div>
            <div>
              <p className="font-black text-gray-900 text-lg">
                Remove{" "}
                <span className="text-red-600 font-black">{memberToKick.username}</span>?
              </p>
              <p className="text-sm text-gray-500 font-medium mt-1.5">
                This player will be kicked from the party. They can re-join if the party policy allows.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMemberToKick(null)}
                disabled={kicking}
                className={`${btnBase} flex-1 justify-center bg-white text-gray-700`}
              >
                Cancel
              </button>
              <button
                onClick={handleKickConfirm}
                disabled={kicking}
                className={`${btnBase} flex-1 justify-center bg-red-400 text-white`}
              >
                {kicking ? (
                  <><Spinner size={13} /> Removing…</>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                    Yes, Kick
                  </>
                )}
              </button>
            </div>
          </div>
        </GameModal>
      )}

      {/* ══════════════════ PARTY CHAT DRAWER ════════════════════════ */}
      {selectedParty && (
        <PartyChatDrawer
          partyId={selectedParty.partyId}
          partyName={selectedParty.name}
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      )}
    </>
  );
}

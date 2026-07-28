import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { Users, Search, Plus, Eye, Trash2, Loader2 } from "lucide-react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Pagination from "../components/common/Pagination";
import adminPartyApi from "../api/adminPartyApi";
import adminUserApi from "../api/adminUserApi";
import { useAlert } from "../context/AlertContext";
import { PartyItem, PartyStatus, JoinPolicy, UserItem } from "../types/api.types";

const PAGE_SIZE = 10;

const errMsg = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

const btnBase =
  "inline-flex items-center gap-2 px-4 py-2 font-black text-sm border-2 border-black rounded-full " +
  "shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 " +
  "disabled:shadow-[3px_3px_0_0_#1A1D20] transition-all";

const inputCls =
  "w-full px-4 py-2.5 border-2 border-black rounded-2xl text-sm font-medium focus:outline-none " +
  "focus:ring-2 focus:ring-violet-300 bg-white dark:bg-gray-800 dark:text-gray-100 placeholder:text-gray-400";

// ── BADGES ────────────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  Active: "bg-green-100 border-green-400 text-green-800",
  Disbanded: "bg-gray-100 border-gray-400 text-gray-500",
  Archived: "bg-amber-100 border-amber-400 text-amber-800",
};
const StatusBadge = ({ status }: { status: PartyStatus }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black border-2 ${STATUS_STYLES[status] ?? "bg-gray-100 border-gray-400 text-gray-700"}`}>
    {status}
  </span>
);
const POLICY_STYLES: Record<string, string> = {
  PUBLIC: "bg-sky-100 border-sky-400 text-sky-800",
  APPROVAL_REQUIRED: "bg-amber-100 border-amber-400 text-amber-800",
  INVITE_ONLY: "bg-fuchsia-100 border-fuchsia-400 text-fuchsia-800",
};
const PolicyBadge = ({ policy }: { policy: JoinPolicy }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${POLICY_STYLES[policy] ?? "bg-gray-100 border-gray-400 text-gray-700"}`}>
    {policy}
  </span>
);

// ── GAME MODAL ────────────────────────────────────────────────────────────────
const GameModal = ({ isOpen, onClose, title, children, maxWidth = "max-w-lg" }: {
  isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: string;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full ${maxWidth} my-4 bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0_0_#1A1D20]`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b-2 border-gray-200">
          <h2 className="text-base font-black text-gray-900">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-black bg-gray-100 hover:bg-red-200 active:translate-x-0.5 active:translate-y-0.5 transition-all font-bold text-gray-700 text-sm leading-none">✕</button>
        </div>
        <div className="px-6 pb-6 pt-5">{children}</div>
      </div>
    </div>
  );
};

// ── CREATE PARTY MODAL ───────────────────────────────────────────────────────
const CreatePartyForm = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
  const alert = useAlert();
  const [mentors, setMentors] = useState<UserItem[]>([]);
  const [mentorsLoading, setMentorsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ mentorUserId: "", name: "", description: "", joinPolicy: "APPROVAL_REQUIRED" as JoinPolicy });

  useEffect(() => {
    adminUserApi.getUsers({ roleCode: "MENTOR", pageSize: 200 })
      .then((res) => setMentors(res.data ?? []))
      .catch(() => alert.error("Failed to load mentor list."))
      .finally(() => setMentorsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.mentorUserId) {
      alert.error("Please select a mentor to own this party.");
      return;
    }
    setSubmitting(true);
    try {
      await adminPartyApi.createParty({
        mentorUserId: Number(form.mentorUserId),
        name: form.name,
        description: form.description,
        joinPolicy: form.joinPolicy,
      });
      alert.success("Party created successfully.");
      onSuccess();
      onClose();
    } catch (err) {
      alert.error(errMsg(err) ?? "Failed to create party.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-black text-gray-700 mb-1.5 uppercase tracking-wide">Mentor (Owner)</label>
        {mentorsLoading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm font-semibold py-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading mentors…</div>
        ) : (
          <select required value={form.mentorUserId} onChange={(e) => setForm({ ...form, mentorUserId: e.target.value })} className={inputCls}>
            <option value="">Select a mentor…</option>
            {mentors.map((m) => <option key={m.userId} value={m.userId}>{m.username} (#{m.userId})</option>)}
          </select>
        )}
      </div>
      <div>
        <label className="block text-xs font-black text-gray-700 mb-1.5 uppercase tracking-wide">Party Name</label>
        <input required maxLength={200} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Early Risers Club" className={inputCls} />
      </div>
      <div>
        <label className="block text-xs font-black text-gray-700 mb-1.5 uppercase tracking-wide">Description</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" rows={3} className={inputCls} />
      </div>
      <div>
        <label className="block text-xs font-black text-gray-700 mb-1.5 uppercase tracking-wide">Join Policy</label>
        <select value={form.joinPolicy} onChange={(e) => setForm({ ...form, joinPolicy: e.target.value as JoinPolicy })} className={inputCls}>
          <option value="APPROVAL_REQUIRED">APPROVAL_REQUIRED</option>
          <option value="PUBLIC">PUBLIC</option>
          <option value="INVITE_ONLY">INVITE_ONLY</option>
        </select>
      </div>
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 border-2 border-black rounded-full font-bold text-sm bg-white text-gray-700 shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75 transition-all">Cancel</button>
        <button type="submit" disabled={submitting} className="flex-1 py-2.5 border-2 border-black rounded-full font-black text-sm bg-violet-300 text-gray-900 shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75 disabled:opacity-60 disabled:cursor-not-allowed transition-all">
          {submitting ? "Creating…" : "Create Party"}
        </button>
      </div>
    </form>
  );
};

// ── DISBAND CONFIRM MODAL ────────────────────────────────────────────────────
const DisbandConfirm = ({ party, onClose, onSuccess }: { party: PartyItem; onClose: () => void; onSuccess: () => void }) => {
  const alert = useAlert();
  const [disbanding, setDisbanding] = useState(false);

  const handleDisband = async () => {
    setDisbanding(true);
    try {
      await adminPartyApi.disbandParty(party.partyId);
      alert.success("Party disbanded successfully.");
      onSuccess();
      onClose();
    } catch (err) {
      alert.error(errMsg(err) ?? "Failed to disband party.");
      setDisbanding(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center py-2">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full border-4 border-black bg-red-100 flex items-center justify-center">
          <Trash2 className="w-6 h-6 text-red-600" />
        </div>
        <p className="font-black text-gray-900 text-lg">Disband this party?</p>
        <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
          This will disband <span className="font-black text-gray-800">{party.name}</span>.
          <br />Members will no longer receive new quests from it. This cannot be undone.
        </p>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} disabled={disbanding} className="flex-1 py-2.5 border-2 border-black rounded-full font-bold text-sm bg-white text-gray-700 shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75 transition-all">Keep Party</button>
        <button onClick={handleDisband} disabled={disbanding} className="flex-1 py-2.5 border-2 border-black rounded-full font-black text-sm bg-red-400 text-white shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.75 hover:translate-y-0.75 disabled:opacity-60 disabled:cursor-not-allowed transition-all">
          {disbanding ? "Disbanding…" : "Disband Forever"}
        </button>
      </div>
    </div>
  );
};

// ── SKELETON ROW ─────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr className="border-b-2 border-gray-100">
    {[40, 64, 24, 20, 20, 24].map((w, i) => (
      <td key={i} className="px-5 py-4"><div className={`h-4 w-${w} rounded-full bg-gray-200 animate-pulse`} /></td>
    ))}
  </tr>
);

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
type ModalType = "create" | "disband" | null;

export default function AdminPartyManagement() {
  const navigate = useNavigate();

  const [parties, setParties] = useState<PartyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PartyStatus | "">("");

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedParty, setSelectedParty] = useState<PartyItem | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchParties = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await adminPartyApi.getParties({
        pageNumber: currentPage,
        pageSize: PAGE_SIZE,
        search: searchQuery.trim() || undefined,
        status: statusFilter || undefined,
      });
      setParties(res.data);
      setTotalPages(res.totalPages);
      setTotalRecords(res.totalRecords);
      setHasPreviousPage(res.hasPreviousPage);
      setHasNextPage(res.hasNextPage);
    } catch (err) {
      setFetchError(errMsg(err) ?? "Failed to load parties.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, statusFilter]);

  useEffect(() => { fetchParties(); }, [fetchParties]);

  const openModal = (type: Exclude<ModalType, null>, party?: PartyItem) => {
    setSelectedParty(party ?? null);
    setActiveModal(type);
  };
  const closeModal = () => { setActiveModal(null); setSelectedParty(null); };

  return (
    <>
      <PageMeta title="Party Management | HabitEvolve Admin" description="Manage all parties (groups) across the HabitEvolve platform" />
      <PageBreadcrumb pageTitle="Party Management" />

      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"><Search className="w-4 h-4" /></span>
              <input
                type="text"
                placeholder="Search party name…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-black rounded-2xl bg-white dark:bg-white/3 dark:border-white/20 dark:text-white dark:placeholder:text-gray-500 text-sm font-medium shadow-[3px_3px_0_0_#1A1D20] dark:shadow-none focus:outline-none focus:shadow-none focus:translate-x-0.75 focus:translate-y-0.75 transition-all placeholder:text-gray-400"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as PartyStatus | ""); setCurrentPage(1); }}
              className="px-3.5 py-2.5 border-2 border-black rounded-2xl text-sm font-bold bg-white dark:bg-white/3 dark:border-white/20 dark:text-white shadow-[3px_3px_0_0_#1A1D20] dark:shadow-none focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Disbanded">Disbanded</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          <button onClick={() => openModal("create")} className={`${btnBase} bg-violet-300 text-gray-900 whitespace-nowrap`}>
            <Plus className="w-4 h-4" /> Create Party
          </button>
        </div>

        <div className="bg-white dark:bg-white/3 border-4 border-black dark:border-white/20 rounded-3xl shadow-[6px_6px_0_0_#1A1D20] dark:shadow-none overflow-hidden">
          <div className="px-6 py-4 border-b-4 border-black dark:border-white/20 flex items-center gap-2 bg-gray-50 dark:bg-white/2">
            <Users className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            <span className="font-black text-gray-900 dark:text-white text-sm">All Parties</span>
            {!loading && <span className="ml-auto bg-violet-200 border-2 border-black dark:border-white/20 text-gray-800 text-xs font-black px-2.5 py-0.5 rounded-full">{totalRecords}</span>}
          </div>

          {fetchError && (
            <div className="mx-6 mt-5 bg-red-50 border-2 border-red-300 rounded-2xl p-3 text-sm text-red-700 font-semibold flex items-center justify-between">
              <span>{fetchError}</span>
              <button onClick={fetchParties} className="underline font-black hover:no-underline">Retry</button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-white/1">
                  {["Party", "Mentor", "Members", "Join Policy", "Status", "Created", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonRow key={i} />)
                ) : parties.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full border-4 border-black dark:border-white/20 bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                        <Search className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-bold">No parties found</p>
                      <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{searchQuery ? "Try a different search" : "No parties have been created yet"}</p>
                    </td>
                  </tr>
                ) : (
                  parties.map((party, idx) => (
                    <tr
                      key={party.partyId}
                      onClick={() => navigate(`/admin/parties/${party.partyId}`)}
                      className={`transition-colors hover:bg-violet-50/60 dark:hover:bg-white/3 cursor-pointer ${idx < parties.length - 1 ? "border-b-2 border-gray-100 dark:border-white/5" : ""}`}
                    >
                      <td className="px-5 py-4">
                        <p className="font-bold text-gray-800 dark:text-white/90 text-sm">{party.name}</p>
                        {party.description && <p className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{party.description}</p>}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">{party.mentorUsername ?? `#${party.mentorUserId}`}</td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">{party.memberCount}{party.maxMembers > 0 ? ` / ${party.maxMembers}` : ""}</td>
                      <td className="px-5 py-4"><PolicyBadge policy={party.joinPolicy} /></td>
                      <td className="px-5 py-4"><StatusBadge status={party.status} /></td>
                      <td className="px-5 py-4 text-sm text-gray-400 dark:text-gray-500 font-medium">{formatDate(party.createdAt)}</td>
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button title="View Party" onClick={() => navigate(`/admin/parties/${party.partyId}`)} className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-sky-200 hover:bg-sky-300 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-gray-800">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {party.status === "Active" && (
                            <button title="Disband Party" onClick={() => openModal("disband", party)} className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-red-200 hover:bg-red-300 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-gray-800">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination currentPage={currentPage} totalPages={totalPages} hasPreviousPage={hasPreviousPage} hasNextPage={hasNextPage} onPageChange={setCurrentPage} />

          <div className="px-6 py-3 border-t-2 border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/1">
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
              {loading ? "Loading…" : `Showing ${parties.length} of ${totalRecords} parties — page ${currentPage} of ${totalPages}`}
            </span>
          </div>
        </div>
      </div>

      <GameModal isOpen={activeModal === "create"} onClose={closeModal} title="Create New Party">
        <CreatePartyForm onClose={closeModal} onSuccess={fetchParties} />
      </GameModal>

      <GameModal isOpen={activeModal === "disband"} onClose={closeModal} title="Disband Party" maxWidth="max-w-md">
        {selectedParty && <DisbandConfirm party={selectedParty} onClose={closeModal} onSuccess={fetchParties} />}
      </GameModal>
    </>
  );
}

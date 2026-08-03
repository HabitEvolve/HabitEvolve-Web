import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { Users, Search, Plus, Eye, Trash2, Loader2 } from "lucide-react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Pagination from "../components/common/SkyPagination";
import adminPartyApi from "../api/adminPartyApi";
import adminUserApi from "../api/adminUserApi";
import { useAlert } from "../context/AlertContext";
import SkyCard from "../components/ui/card/SkyCard";
import SkyButton from "../components/ui/button/SkyButton";
import { PartyItem, PartyStatus, JoinPolicy, UserItem } from "../types/api.types";

const PAGE_SIZE = 10;

const errMsg = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

const inputCls =
  "w-full px-4 py-2.5 rounded-sky-chip border border-sky-surf-border text-sm font-medium bg-white text-sky-ink " +
  "focus:outline-none focus:border-sky-deep focus:ring-3 focus:ring-sky-deep/20 placeholder:text-sky-ink-3";

// ── BADGES ────────────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  Active: "bg-success-100 text-success-800",
  Disbanded: "bg-gray-100 text-gray-500",
  Archived: "bg-warning-100 text-warning-800",
};
const StatusBadge = ({ status }: { status: PartyStatus }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700"}`}>
    {status}
  </span>
);
const POLICY_STYLES: Record<string, string> = {
  PUBLIC: "bg-blue-100 text-blue-800",
  APPROVAL_REQUIRED: "bg-warning-100 text-warning-800",
  INVITE_ONLY: "bg-purple-100 text-purple-800",
};
const PolicyBadge = ({ policy }: { policy: JoinPolicy }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${POLICY_STYLES[policy] ?? "bg-gray-100 text-gray-700"}`}>
    {policy}
  </span>
);

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
        <label className="block text-xs font-semibold text-sky-ink-2 mb-1.5 uppercase tracking-wide">Mentor (Owner)</label>
        {mentorsLoading ? (
          <div className="flex items-center gap-2 text-sky-ink-3 text-sm font-semibold py-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading mentors…</div>
        ) : (
          <select required value={form.mentorUserId} onChange={(e) => setForm({ ...form, mentorUserId: e.target.value })} className={inputCls}>
            <option value="">Select a mentor…</option>
            {mentors.map((m) => <option key={m.userId} value={m.userId}>{m.username} (#{m.userId})</option>)}
          </select>
        )}
      </div>
      <div>
        <label className="block text-xs font-semibold text-sky-ink-2 mb-1.5 uppercase tracking-wide">Party Name</label>
        <input required maxLength={200} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Early Risers Club" className={inputCls} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-sky-ink-2 mb-1.5 uppercase tracking-wide">Description</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" rows={3} className={inputCls} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-sky-ink-2 mb-1.5 uppercase tracking-wide">Join Policy</label>
        <select value={form.joinPolicy} onChange={(e) => setForm({ ...form, joinPolicy: e.target.value as JoinPolicy })} className={inputCls}>
          <option value="APPROVAL_REQUIRED">APPROVAL_REQUIRED</option>
          <option value="PUBLIC">PUBLIC</option>
          <option value="INVITE_ONLY">INVITE_ONLY</option>
        </select>
      </div>
      <div className="flex gap-3 pt-1">
        <SkyButton type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</SkyButton>
        <SkyButton type="submit" variant="primary" disabled={submitting} className="flex-1">
          {submitting ? "Creating…" : "Create Party"}
        </SkyButton>
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
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-error-100 flex items-center justify-center">
          <Trash2 className="w-6 h-6 text-error-600" />
        </div>
        <p className="font-bold text-sky-ink text-lg">Disband this party?</p>
        <p className="text-sm text-sky-ink-2 mt-1.5 leading-relaxed">
          This will disband <span className="font-bold text-sky-ink">{party.name}</span>.
          <br />Members will no longer receive new quests from it. This cannot be undone.
        </p>
      </div>
      <div className="flex gap-3">
        <SkyButton type="button" variant="secondary" onClick={onClose} disabled={disbanding} className="flex-1">Keep Party</SkyButton>
        <SkyButton type="button" variant="destructive" onClick={handleDisband} disabled={disbanding} className="flex-1">
          {disbanding ? "Disbanding…" : "Disband Forever"}
        </SkyButton>
      </div>
    </div>
  );
};

// ── SKELETON ROW ─────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr className="sky-table-row">
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
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-ink-3 pointer-events-none"><Search className="w-4 h-4" /></span>
              <input
                type="text"
                placeholder="Search party name…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-sky-chip border border-sky-surf-border bg-white text-sky-ink text-sm font-medium focus:outline-none focus:border-sky-deep focus:ring-3 focus:ring-sky-deep/20 placeholder:text-sky-ink-3"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as PartyStatus | ""); setCurrentPage(1); }}
              className="px-3.5 py-2.5 rounded-sky-chip border border-sky-surf-border text-sm font-semibold bg-white text-sky-ink focus:outline-none focus:border-sky-deep"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Disbanded">Disbanded</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          <SkyButton type="button" variant="primary" onClick={() => openModal("create")} className="whitespace-nowrap">
            <Plus className="w-4 h-4" /> Create Party
          </SkyButton>
        </div>

        <SkyCard variant="admin" className="p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2 bg-sky-admin-bg-deep">
            <Users className="w-4 h-4 text-sky-ink-2" />
            <span className="font-semibold text-sky-ink text-sm">All Parties</span>
            {!loading && <span className="ml-auto bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">{totalRecords}</span>}
          </div>

          {fetchError && (
            <div className="mx-6 mt-5 bg-error-50 border border-error-300 rounded-sky-chip p-3 text-sm text-error-700 font-semibold flex items-center justify-between">
              <span>{fetchError}</span>
              <button type="button" onClick={fetchParties} className="underline font-semibold hover:no-underline">Retry</button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-sky-admin-bg-deep border-b border-slate-200">
                  {["Party", "Mentor", "Members", "Join Policy", "Status", "Created", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-sky-ink">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonRow key={i} />)
                ) : parties.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                        <Search className="w-5 h-5 text-sky-ink-3" />
                      </div>
                      <p className="text-sky-ink-2 text-sm font-semibold">No parties found</p>
                      <p className="text-sky-ink-3 text-xs mt-1">{searchQuery ? "Try a different search" : "No parties have been created yet"}</p>
                    </td>
                  </tr>
                ) : (
                  parties.map((party) => (
                    <tr
                      key={party.partyId}
                      onClick={() => navigate(`/admin/parties/${party.partyId}`)}
                      className="sky-table-row cursor-pointer"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-sky-ink text-sm">{party.name}</p>
                        {party.description && <p className="text-xs text-sky-ink-3 mt-0.5 max-w-xs truncate">{party.description}</p>}
                      </td>
                      <td className="px-5 py-4 text-sm text-sky-ink-2 font-medium">{party.mentorUsername ?? `#${party.mentorUserId}`}</td>
                      <td className="px-5 py-4 text-sm text-sky-ink-2 font-medium">{party.memberCount}{party.maxMembers > 0 ? ` / ${party.maxMembers}` : ""}</td>
                      <td className="px-5 py-4"><PolicyBadge policy={party.joinPolicy} /></td>
                      <td className="px-5 py-4"><StatusBadge status={party.status} /></td>
                      <td className="px-5 py-4 text-sm text-sky-ink-3 font-medium">{formatDate(party.createdAt)}</td>
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <SkyButton type="button" variant="secondary" size="icon" title="View Party" onClick={() => navigate(`/admin/parties/${party.partyId}`)}>
                            <Eye className="w-3.5 h-3.5" />
                          </SkyButton>
                          {party.status === "Active" && (
                            <SkyButton type="button" variant="destructive" size="icon" title="Disband Party" onClick={() => openModal("disband", party)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </SkyButton>
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

          <div className="px-6 py-3 border-t border-gray-200 bg-sky-admin-bg-deep">
            <span className="text-xs text-sky-ink-3 font-medium">
              {loading ? "Loading…" : `Showing ${parties.length} of ${totalRecords} parties — page ${currentPage} of ${totalPages}`}
            </span>
          </div>
        </SkyCard>
      </div>

      {activeModal === "create" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-sky-ink/60 backdrop-blur-sm" onClick={closeModal} />
          <SkyCard variant="admin" className="relative z-10 w-full max-w-lg my-4 p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-200">
              <h2 className="text-base font-bold text-sky-ink">Create New Party</h2>
              <SkyButton type="button" variant="ghost" size="icon" onClick={closeModal}>✕</SkyButton>
            </div>
            <div className="px-6 pb-6 pt-5">
              <CreatePartyForm onClose={closeModal} onSuccess={fetchParties} />
            </div>
          </SkyCard>
        </div>
      )}

      {activeModal === "disband" && selectedParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-sky-ink/60 backdrop-blur-sm" onClick={closeModal} />
          <SkyCard variant="admin" className="relative z-10 w-full max-w-md my-4 p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-200">
              <h2 className="text-base font-bold text-sky-ink">Disband Party</h2>
              <SkyButton type="button" variant="ghost" size="icon" onClick={closeModal}>✕</SkyButton>
            </div>
            <div className="px-6 pb-6 pt-5">
              <DisbandConfirm party={selectedParty} onClose={closeModal} onSuccess={fetchParties} />
            </div>
          </SkyCard>
        </div>
      )}
    </>
  );
}

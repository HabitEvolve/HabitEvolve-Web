import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Users, Search, Plus, Eye, Trash2, Loader2, X, Check, CircleSlash,
  Archive, Globe, Lock, UserCheck, AlertTriangle, Inbox, Filter, UserCog,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

const eyebrow = "text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3";
const fieldLabel = `block mb-1.5 ${eyebrow}`;

const inputCls = [
  "w-full px-3.5 py-2.5 rounded-sky-chip bg-white/70 ring-1 ring-white/80",
  "text-sky-ink text-sm font-medium transition-shadow",
  "focus:outline-none focus:ring-2 focus:ring-sky-deep/45",
  "placeholder:text-sky-ink-3",
].join(" ");

const overlayCls = "fixed inset-0 bg-sky-abyss/45 backdrop-blur-md";

// ── BADGES ────────────────────────────────────────────────────────────────────
// Every state carries a glyph as well as a hue — the lifecycle stays readable in
// greyscale. teal is reserved for the one state that is genuinely running; rose
// marks the party an admin deliberately tore down, so it reads differently from
// a party that was merely filed away (neutral).
const STATUS_CFG: Record<string, { cls: string; Icon: LucideIcon }> = {
  Active:    { cls: "sky-badge-success", Icon: Check },
  Disbanded: { cls: "sky-badge-danger",  Icon: CircleSlash },
  Archived:  { cls: "sky-badge-neutral", Icon: Archive },
};
const StatusBadge = ({ status }: { status: PartyStatus }) => {
  const c = STATUS_CFG[status] ?? { cls: "sky-badge-neutral", Icon: CircleSlash };
  return <span className={`sky-badge ${c.cls}`}><c.Icon className="w-3 h-3 shrink-0" /> {status}</span>;
};

// Join policy is a gate, not a severity: cool for the open door, peach for the
// one that parks people in a queue a human has to clear, violet for closed.
const POLICY_CFG: Record<string, { cls: string; Icon: LucideIcon; label: string }> = {
  PUBLIC:            { cls: "sky-badge-info",    Icon: Globe,     label: "Public" },
  APPROVAL_REQUIRED: { cls: "sky-badge-pending", Icon: UserCheck, label: "Approval" },
  INVITE_ONLY:       { cls: "sky-badge-epic",    Icon: Lock,      label: "Invite only" },
};
const PolicyBadge = ({ policy }: { policy: JoinPolicy }) => {
  const c = POLICY_CFG[policy] ?? { cls: "sky-badge-neutral", Icon: Lock, label: String(policy) };
  return <span className={`sky-badge ${c.cls} text-[10px]`}><c.Icon className="w-3 h-3 shrink-0" /> {c.label}</span>;
};

const STATUS_FILTERS: { value: PartyStatus | ""; label: string; Icon: LucideIcon }[] = [
  { value: "",          label: "All",       Icon: Filter },
  { value: "Active",    label: "Active",    Icon: Check },
  { value: "Disbanded", label: "Disbanded", Icon: CircleSlash },
  { value: "Archived",  label: "Archived",  Icon: Archive },
];

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
        <label className={fieldLabel}>Mentor (Owner)</label>
        {mentorsLoading ? (
          <div className="flex items-center gap-2 rounded-sky-chip bg-white/55 ring-1 ring-white/70 px-3.5 py-2.5 text-sm font-medium text-sky-ink-3">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading mentors…
          </div>
        ) : (
          <select required value={form.mentorUserId} onChange={(e) => setForm({ ...form, mentorUserId: e.target.value })} className={inputCls}>
            <option value="">Select a mentor…</option>
            {mentors.map((m) => <option key={m.userId} value={m.userId}>{m.username} (#{m.userId})</option>)}
          </select>
        )}
      </div>
      <div>
        <label className={fieldLabel}>Party Name</label>
        <input required maxLength={200} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Early Risers Club" className={inputCls} />
      </div>
      <div>
        <label className={fieldLabel}>Description</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" rows={3} className={inputCls} />
      </div>
      <div>
        <label className={fieldLabel}>Join Policy</label>
        <select value={form.joinPolicy} onChange={(e) => setForm({ ...form, joinPolicy: e.target.value as JoinPolicy })} className={inputCls}>
          <option value="APPROVAL_REQUIRED">Approval required — mentor clears a queue</option>
          <option value="PUBLIC">Public — anyone may join</option>
          <option value="INVITE_ONLY">Invite only — closed</option>
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
      <div className="text-center py-1">
        <div className="w-14 h-14 mx-auto mb-3 rounded-sky-md bg-sky-rose/12 text-sky-rose-deep grid place-items-center">
          <Trash2 className="w-6 h-6" />
        </div>
        <p className="font-display text-lg font-semibold text-sky-ink">Disband this party?</p>
        <p className="text-sm font-medium text-sky-ink-2 mt-1.5 leading-relaxed">
          Members of <span className="font-semibold text-sky-ink">{party.name}</span> will stop
          receiving new quests from it.
        </p>
      </div>
      {/* The irreversible part is stated once, in its own rose-railed strip, so it
          can't be skimmed past inside the paragraph above. */}
      <div className="relative flex items-start gap-2.5 overflow-hidden pl-4 pr-3 py-2.5 bg-sky-rose/12 ring-1 ring-sky-rose/25 rounded-sky-chip">
        <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" />
        <AlertTriangle className="w-4 h-4 shrink-0 mt-px text-sky-rose-deep" />
        <p className="text-xs font-semibold text-sky-rose-deep">This cannot be undone.</p>
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
    {[72, 56, 34, 60, 52, 48, 40].map((w, i) => (
      <td key={i} className="px-5 py-4">
        <div className="h-4 rounded-full bg-sky-ink/8 animate-pulse" style={{ width: `${w}%` }} />
      </td>
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
        <div className="sky-in flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-ink-3 pointer-events-none"><Search className="w-4 h-4" /></span>
              <input
                type="text"
                placeholder="Search party name…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Search party name"
                className={`${inputCls} pl-10`}
              />
            </div>
            {/* One recessed well instead of a dropdown: four states is few enough
                to show at once, and only the chosen segment is allowed to lift. */}
            <div className="flex flex-wrap gap-1 rounded-sky-chip bg-white/42 ring-1 ring-white/70 p-1 shrink-0">
              {STATUS_FILTERS.map(({ value, label, Icon }) => {
                const on = statusFilter === value;
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={on}
                    onClick={() => { setStatusFilter(value); setCurrentPage(1); }}
                    className={`inline-flex items-center gap-1.5 rounded-sky-chip px-3 py-1.5 text-xs transition ${
                      on
                        ? "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white font-semibold shadow-sky-chip"
                        : "text-sky-ink-2 font-medium hover:bg-white/70 hover:text-sky-ink"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" /> {label}
                  </button>
                );
              })}
            </div>
          </div>

          <SkyButton type="button" variant="primary" onClick={() => openModal("create")} className="whitespace-nowrap">
            <Plus className="w-4 h-4" /> Create Party
          </SkyButton>
        </div>

        <SkyCard variant="admin" className="p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/70 flex items-center gap-3 bg-white/45">
            <span className="grid place-items-center w-9 h-9 rounded-sky-chip bg-sky-deep/10 text-sky-deep shrink-0">
              <Users className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-sm font-semibold text-sky-ink">All Parties</h2>
              <p className="text-[11px] font-medium text-sky-ink-3">Every group on the platform</p>
            </div>
            {!loading && (
              <span className="ml-auto inline-flex items-baseline gap-1 rounded-sky-chip bg-white/60 ring-1 ring-white/80 px-2.5 py-1">
                <span className="font-display text-sm font-semibold text-sky-ink tabular-nums">{totalRecords}</span>
                <span className={eyebrow}>total</span>
              </span>
            )}
          </div>

          {fetchError && (
            <div className="relative mx-6 mt-5 flex items-center justify-between gap-3 overflow-hidden rounded-sky-chip bg-sky-rose/12 ring-1 ring-sky-rose/25 pl-4 pr-3 py-2.5">
              <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" />
              <span className="flex items-start gap-2 text-xs font-semibold text-sky-rose-deep">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-px" /> {fetchError}
              </span>
              <SkyButton type="button" variant="secondary" size="sm" onClick={fetchParties} className="shrink-0">Retry</SkyButton>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="sky-table-head">
                  {["Party", "Mentor", "Members", "Join Policy", "Status", "Created", "Actions"].map((h) => (
                    <th key={h} className={`px-5 py-3 ${h === "Actions" ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="sky-stagger">
                {loading ? (
                  Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonRow key={i} />)
                ) : parties.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-sky-deep/8 text-sky-deep grid place-items-center">
                        {searchQuery ? <Search className="w-6 h-6" /> : <Inbox className="w-6 h-6" />}
                      </div>
                      <p className="font-display text-base font-semibold text-sky-ink">
                        {searchQuery ? "No parties match that search" : "No parties yet"}
                      </p>
                      <p className="text-xs font-medium text-sky-ink-3 mt-1">
                        {searchQuery ? "Try a shorter name, or clear the status filter." : "Create the first party to get mentors and members paired up."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  parties.map((party) => (
                    <tr
                      key={party.partyId}
                      onClick={() => navigate(`/admin/parties/${party.partyId}`)}
                      className="sky-table-row group cursor-pointer"
                    >
                      <td className="px-5 py-4">
                        <p className="font-display text-sm font-semibold text-sky-ink">{party.name}</p>
                        {party.description && <p className="text-xs font-medium text-sky-ink-3 mt-0.5 max-w-xs truncate">{party.description}</p>}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-ink-2">
                          <UserCog className="w-3.5 h-3.5 shrink-0 text-sky-ink-3" />
                          {party.mentorUsername ?? `#${party.mentorUserId}`}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-sky-ink-2">
                        <span className="font-semibold text-sky-ink tabular-nums">{party.memberCount}</span>
                        {party.maxMembers > 0 && <span className="font-medium text-sky-ink-3 tabular-nums"> / {party.maxMembers}</span>}
                      </td>
                      <td className="px-5 py-4"><PolicyBadge policy={party.joinPolicy} /></td>
                      <td className="px-5 py-4"><StatusBadge status={party.status} /></td>
                      <td className="px-5 py-4 text-sm font-medium text-sky-ink-3 tabular-nums whitespace-nowrap">{formatDate(party.createdAt)}</td>
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2 opacity-45 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <SkyButton type="button" variant="secondary" size="icon" title="View Party" aria-label={`View ${party.name}`} onClick={() => navigate(`/admin/parties/${party.partyId}`)}>
                            <Eye className="w-3.5 h-3.5" />
                          </SkyButton>
                          {party.status === "Active" && (
                            <SkyButton type="button" variant="destructive" size="icon" title="Disband Party" aria-label={`Disband ${party.name}`} onClick={() => openModal("disband", party)}>
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

          <div className="px-6 py-3 border-t border-white/70 bg-white/45">
            <span className="text-xs font-medium text-sky-ink-3 tabular-nums">
              {loading ? "Loading…" : `Showing ${parties.length} of ${totalRecords} parties — page ${currentPage} of ${totalPages}`}
            </span>
          </div>
        </SkyCard>
      </div>

      {activeModal === "create" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className={overlayCls} onClick={closeModal} />
          <SkyCard variant="admin" className="sky-in relative z-10 w-full max-w-lg my-4 p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Cool rail — creating a party is an ordinary operational action. */}
            <span className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-sky-deep-lo to-sky-deep z-10" />
            <div className="relative flex items-center justify-between gap-3 px-6 pt-5 pb-4 border-b border-white/70 bg-white/45">
              <div className="flex items-center gap-3 min-w-0">
                <span className="grid place-items-center w-9 h-9 rounded-sky-chip bg-sky-deep/10 text-sky-deep shrink-0">
                  <Users className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-base font-semibold text-sky-ink">Create New Party</h2>
                  <p className="text-xs font-medium text-sky-ink-3">Pick a mentor to own it</p>
                </div>
              </div>
              <SkyButton type="button" variant="ghost" size="icon" onClick={closeModal} aria-label="Close"><X className="w-4 h-4" /></SkyButton>
            </div>
            <div className="px-6 pb-6 pt-5">
              <CreatePartyForm onClose={closeModal} onSuccess={fetchParties} />
            </div>
          </SkyCard>
        </div>
      )}

      {activeModal === "disband" && selectedParty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className={overlayCls} onClick={closeModal} />
          <SkyCard variant="admin" className="sky-in relative z-10 w-full max-w-md my-4 p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Rose rail — the only irreversible action on this screen. */}
            <span className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-sky-rose to-sky-rose-deep z-10" />
            <div className="relative flex items-center justify-between gap-3 px-6 pt-5 pb-4 border-b border-white/70 bg-white/45">
              <div className="flex items-center gap-3 min-w-0">
                <span className="grid place-items-center w-9 h-9 rounded-sky-chip bg-sky-rose/12 text-sky-rose-deep shrink-0">
                  <Trash2 className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-base font-semibold text-sky-ink">Disband Party</h2>
                  <p className="text-xs font-medium text-sky-ink-3 truncate">{selectedParty.name}</p>
                </div>
              </div>
              <SkyButton type="button" variant="ghost" size="icon" onClick={closeModal} aria-label="Close"><X className="w-4 h-4" /></SkyButton>
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

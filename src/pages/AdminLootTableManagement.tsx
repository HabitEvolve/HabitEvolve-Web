import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Dices, Plus, Settings2, X, Save, Loader2, Trash2 } from "lucide-react";
import { useAlert } from "../context/AlertContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Pagination from "../components/common/Pagination";
import { adminLootTableApi } from "../api/adminLootTableApi";
import type { LootTableDto, CreateLootTablePayload, AddLootTableEntryPayload } from "../types/adminLootTable.types";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;
const EMPTY_TABLE: CreateLootTablePayload = { name: "", description: "" };
const EMPTY_ENTRY: AddLootTableEntryPayload = { itemId: 0, weight: 1, minQuantity: 1, maxQuantity: 1 };

// ── STYLES ────────────────────────────────────────────────────────────────────
const btnBase =
    "inline-flex items-center gap-2 px-4 py-2 font-black text-sm border-2 border-black rounded-full " +
    "shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] " +
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 " +
    "disabled:shadow-[3px_3px_0_0_#1A1D20] transition-all";

const inputCls =
    "w-full px-4 py-2.5 border-2 border-black dark:border-gray-600 rounded-2xl text-sm font-medium " +
    "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 " +
    "focus:outline-none focus:ring-2 focus:ring-purple-300 dark:focus:ring-purple-600 " +
    "placeholder:text-gray-400 dark:placeholder:text-gray-500";

const errMsg = (e: unknown) =>
    (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const Label = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">{children}</p>
);

const Spinner = ({ size = 18 }: { size?: number }) => <Loader2 className="animate-spin" width={size} height={size} />;

// ── CREATE TABLE MODAL ────────────────────────────────────────────────────────
interface CreateTableModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const CreateTableModal = ({ onClose, onSuccess }: CreateTableModalProps) => {
    const alert = useAlert();
    const [form, setForm] = useState<CreateLootTablePayload>({ ...EMPTY_TABLE });
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setFormError(null);
        try {
            await adminLootTableApi.createLootTable(form);
            alert.success(`"${form.name}" created!`);
            onSuccess();
            onClose();
        } catch (err) {
            setFormError(errMsg(err) ?? "Failed to create loot table.");
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-99999 w-screen h-screen flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="modal-content bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[8px_8px_0_0_#1A1D20] w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-purple-300 dark:bg-purple-700 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#1A1D20]">
                            <Dices className="w-4.5 h-4.5" />
                        </div>
                        <h2 className="text-base font-black text-gray-900 dark:text-gray-100">New Loot Table</h2>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label>Name</Label>
                        <input required type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="Weekly Boss Chest" className={inputCls} />
                    </div>
                    <div>
                        <Label>Description</Label>
                        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            rows={2} placeholder="Drops awarded after Hard mode clear" className={`${inputCls} resize-none`} />
                    </div>
                    {formError && (
                        <p className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl px-3 py-2">{formError}</p>
                    )}
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} disabled={saving}
                            className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>Cancel</button>
                        <button type="submit" disabled={saving}
                            className={`${btnBase} flex-1 justify-center bg-purple-200 dark:bg-purple-700 text-purple-900 dark:text-white`}>
                            {saving ? <><Spinner size={13} /> Creating…</> : <><Save className="w-3.5 h-3.5" /> Create</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

// ── ENTRIES MODAL (master-detail) ─────────────────────────────────────────────
interface EntriesModalProps {
    table: LootTableDto;
    onClose: () => void;
    onChanged: (updated: LootTableDto) => void;
}

const EntriesModal = ({ table, onClose, onChanged }: EntriesModalProps) => {
    const alert = useAlert();
    const [form, setForm] = useState<AddLootTableEntryPayload>({ ...EMPTY_ENTRY });
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    // A toggle-active or add-entry response is never guaranteed to be the full entity —
    // `entries` may be missing entirely on a partial response. Normalize once, here.
    const entries = table.entries ?? [];
    const totalWeight = entries.reduce((sum, e) => sum + (e?.weight ?? 0), 0);

    const handleAddEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setFormError(null);
        try {
            const res = await adminLootTableApi.addEntry(table.lootTableId, form);
            if (res.success && res.data) {
                onChanged(res.data);
                alert.success("Entry added!");
                setForm({ ...EMPTY_ENTRY });
            } else {
                setFormError(res.message || "Failed to add entry.");
            }
        } catch (err) {
            setFormError(errMsg(err) ?? "Failed to add entry.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteEntry = async (entryId: number) => {
        setDeletingId(entryId);
        try {
            await adminLootTableApi.deleteEntry(table.lootTableId, entryId);
            onChanged({ ...table, entries: entries.filter(e => e.entryId !== entryId) });
            alert.success("Entry removed.");
        } catch (err) {
            alert.error(errMsg(err) ?? "Failed to delete entry.");
        } finally {
            setDeletingId(null);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-99999 w-screen h-screen flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="modal-content bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[8px_8px_0_0_#1A1D20] w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black bg-gray-50 dark:bg-gray-800 shrink-0 rounded-t-3xl">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-purple-300 dark:bg-purple-700 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#1A1D20]">
                            <Settings2 className="w-4.5 h-4.5" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-gray-900 dark:text-gray-100">Manage Entries</h2>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{table.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                    {/* LEFT: current entries */}
                    <div className="lg:w-[58%] border-b-2 lg:border-b-0 lg:border-r-2 border-black/10 overflow-y-auto p-5 space-y-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest sticky top-0 bg-white dark:bg-[#1e2a3a] pb-2">
                            Entries ({entries.length}) — total weight {totalWeight}
                        </p>
                        {entries.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
                                <Dices className="w-10 h-10" />
                                <p className="font-black text-gray-500 dark:text-gray-300">No entries yet</p>
                                <p className="text-xs font-medium">Add one from the form on the right</p>
                            </div>
                        ) : (
                            entries.map(entry => {
                                const weight = entry?.weight ?? 0;
                                const chance = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
                                return (
                                    <div key={entry.entryId} className="flex items-center justify-between gap-3 border-2 border-black/10 dark:border-white/10 rounded-2xl p-3 bg-gray-50/60 dark:bg-gray-800/40">
                                        <div className="min-w-0">
                                            <p className="font-black text-gray-900 dark:text-gray-100 truncate">{entry.itemName ?? `Item #${entry.itemId}`}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                Weight {weight} · {chance.toFixed(1)}% · Qty {entry.minQuantity ?? 0}–{entry.maxQuantity ?? 0}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteEntry(entry.entryId)}
                                            disabled={deletingId === entry.entryId}
                                            title="Delete entry"
                                            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-xl border-2 border-black bg-red-100 hover:bg-red-200 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-red-800 disabled:opacity-50"
                                        >
                                            {deletingId === entry.entryId ? <Spinner size={13} /> : <Trash2 className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* RIGHT: add entry form */}
                    <div className="lg:w-[42%] overflow-y-auto p-5">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Add Entry</p>
                        <form onSubmit={handleAddEntry} className="space-y-3">
                            <div>
                                <Label>Item ID</Label>
                                <input required type="number" min={1} value={form.itemId || ""}
                                    onChange={e => setForm(f => ({ ...f, itemId: Number(e.target.value) }))}
                                    placeholder="123" className={inputCls} />
                            </div>
                            <div>
                                <Label>Weight</Label>
                                <input required type="number" min={1} value={form.weight}
                                    onChange={e => setForm(f => ({ ...f, weight: Number(e.target.value) }))} className={inputCls} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Min Qty</Label>
                                    <input required type="number" min={1} value={form.minQuantity}
                                        onChange={e => setForm(f => ({ ...f, minQuantity: Number(e.target.value) }))} className={inputCls} />
                                </div>
                                <div>
                                    <Label>Max Qty</Label>
                                    <input required type="number" min={1} value={form.maxQuantity}
                                        onChange={e => setForm(f => ({ ...f, maxQuantity: Number(e.target.value) }))} className={inputCls} />
                                </div>
                            </div>
                            {formError && (
                                <p className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl px-3 py-2">{formError}</p>
                            )}
                            <button type="submit" disabled={submitting}
                                className={`${btnBase} w-full justify-center bg-purple-200 dark:bg-purple-700 text-purple-900 dark:text-white`}>
                                {submitting ? <><Spinner size={13} /> Adding…</> : <><Plus className="w-3.5 h-3.5" /> Add Entry</>}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function AdminLootTableManagement() {
    const alert = useAlert();
    const [tables, setTables] = useState<LootTableDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Tracked by array index, not lootTableId — the BE's actual primary-key field name
    // for this endpoint hasn't been confirmed, and matching by a possibly-undefined ID
    // would make every row compare equal (undefined === undefined) and update together.
    const [togglingIndex, setTogglingIndex] = useState<number | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [managingTable, setManagingTable] = useState<LootTableDto | null>(null);
    const [managingIndex, setManagingIndex] = useState<number | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchTables = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await adminLootTableApi.getLootTables({ pageNumber: page, pageSize: PAGE_SIZE });
            if (res.success) {
                setTables(res.data ?? []);
                setTotalPages(res.totalPages ?? 1);
            } else {
                setError(res.message || "Failed to load loot tables.");
            }
        } catch (err) {
            setError(errMsg(err) ?? "Network error fetching loot tables.");
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { fetchTables(); }, [fetchTables]);

    const handleToggleActive = async (table: LootTableDto, index: number) => {
        const nextActive = !table.isActive;
        setTogglingIndex(index);
        // Optimistic flip, matched by index — the toggle endpoint's response isn't
        // guaranteed to be the full entity (may omit `entries`), so local state is the
        // source of truth for isActive, not res.data. Index matching (not lootTableId)
        // avoids updating every row at once if the BE's real ID field differs.
        setTables(prev => prev.map((t, i) => i === index ? { ...t, isActive: nextActive } : t));
        try {
            const res = await adminLootTableApi.toggleActive(table.lootTableId, nextActive);
            if (res.success) {
                // Merge in whatever the BE did return — never replace, so a partial
                // response (e.g. missing `entries`) can't wipe out existing entries.
                if (res.data) setTables(prev => prev.map((t, i) => i === index ? { ...t, ...res.data } : t));
                alert.success(`"${table.name}" is now ${nextActive ? "active" : "inactive"}.`);
            } else {
                setTables(prev => prev.map((t, i) => i === index ? { ...t, isActive: table.isActive } : t));
                alert.error(res.message || "Failed to toggle table.");
            }
        } catch (err) {
            setTables(prev => prev.map((t, i) => i === index ? { ...t, isActive: table.isActive } : t));
            alert.error(errMsg(err) ?? "Failed to toggle table.");
        } finally {
            setTogglingIndex(null);
        }
    };

    const handleEntriesChanged = (updated: LootTableDto) => {
        if (managingIndex !== null) {
            setTables(prev => prev.map((t, i) => i === managingIndex ? updated : t));
        }
        setManagingTable(updated);
    };

    return (
        <>
            <PageMeta title="Loot Tables | HabitEvolve Admin" description="Manage gacha / chest drop tables" />
            <PageBreadcrumb pageTitle="Loot Tables" />

            <div className="space-y-6 p-1">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-300 border-2 border-black flex items-center justify-center shadow-[3px_3px_0_0_#1A1D20] shrink-0">
                            <Dices className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Loot Tables</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">Gacha and chest drop-rate tables</p>
                        </div>
                    </div>
                    <button onClick={() => setShowCreate(true)} className={`${btnBase} bg-purple-200 text-purple-900 shrink-0`}>
                        <Plus className="w-3.5 h-3.5" /> New Table
                    </button>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-900 border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] overflow-hidden">
                    {error ? (
                        <div className="flex flex-col items-center gap-3 py-16">
                            <p className="font-black text-gray-700 dark:text-gray-300">Couldn't load loot tables</p>
                            <p className="text-sm text-gray-400">{error}</p>
                            <button onClick={fetchTables} className={`${btnBase} bg-red-100 text-red-800`}>Retry</button>
                        </div>
                    ) : loading && tables.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                            <Spinner size={32} /><p className="font-bold text-sm">Loading loot tables…</p>
                        </div>
                    ) : tables.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                            <Dices className="w-12 h-12" />
                            <p className="font-black text-lg text-gray-500 dark:text-gray-300">No loot tables yet</p>
                            <button onClick={() => setShowCreate(true)} className={`${btnBase} bg-purple-200 text-purple-900`}>
                                <Plus className="w-3.5 h-3.5" /> Create your first table
                            </button>
                        </div>
                    ) : (
                        <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-50 pointer-events-none" : ""}`}>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b-2 border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60">
                                        {["Name", "Entries", "Active", "Actions"].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {tables.map((table, index) => (
                                        <tr key={table.lootTableId ?? index} className="hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-colors">
                                            <td className="px-4 py-4 max-w-70">
                                                <p className="font-black text-gray-900 dark:text-gray-100 truncate">{table.name}</p>
                                                <p className="text-xs text-gray-400 font-medium mt-0.5 truncate">{table.description || "No description"}</p>
                                            </td>
                                            <td className="px-4 py-4 text-gray-600 dark:text-gray-300 font-bold">{(table.entries ?? []).length}</td>
                                            <td className="px-4 py-4">
                                                <button
                                                    onClick={() => handleToggleActive(table, index)}
                                                    disabled={togglingIndex === index}
                                                    aria-label={table.isActive ? "Deactivate table" : "Activate table"}
                                                    className={`relative w-11 h-6 shrink-0 rounded-full border-2 border-black transition-colors disabled:opacity-50 ${table.isActive ? "bg-purple-400" : "bg-gray-200 dark:bg-gray-700"}`}
                                                >
                                                    <span className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white border border-black transition-transform ${table.isActive ? "translate-x-5" : "translate-x-0"}`} />
                                                </button>
                                            </td>
                                            <td className="px-4 py-4">
                                                <button title="Manage entries" onClick={() => { setManagingTable(table); setManagingIndex(index); }}
                                                    className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-orange-100 hover:bg-orange-200 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-orange-800">
                                                    <Settings2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
            </div>

            {showCreate && (
                <CreateTableModal onClose={() => setShowCreate(false)} onSuccess={fetchTables} />
            )}
            {managingTable && (
                <EntriesModal
                    table={managingTable}
                    onClose={() => { setManagingTable(null); setManagingIndex(null); }}
                    onChanged={handleEntriesChanged}
                />
            )}
        </>
    );
}

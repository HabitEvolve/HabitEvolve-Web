import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Dices, Plus, Settings2, X, Save, Loader2, Trash2 } from "lucide-react";
import { useAlert } from "../context/AlertContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Pagination from "../components/common/Pagination";
import { adminLootTableApi } from "../api/adminLootTableApi";
import type { LootTableDto, AddLootTableEntryPayload, RewardKind } from "../types/adminLootTable.types";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
// A loot table has no name/description on the BE — only a unique code
// (e.g. DAILY_CHEST, WEEKLY_CHEST_EASY, GACHA_STANDARD).
const REWARD_KINDS: RewardKind[] = ["ITEM", "GOLD", "GEMS", "MGOLD"];
const EMPTY_ENTRY: AddLootTableEntryPayload = { rewardKind: "ITEM", itemDefinitionId: 0, weight: 1, amountMin: 1, amountMax: 1 };

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
    const [code, setCode] = useState("");
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) { setFormError("Code is required."); return; }
        setSaving(true);
        setFormError(null);
        try {
            await adminLootTableApi.createLootTable(code.trim().toUpperCase());
            alert.success(`"${code}" created!`);
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
                        <Label>Code</Label>
                        <input required type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                            placeholder="WEEKLY_CHEST_HARD" className={inputCls} />
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
            onChanged({ ...table, entries: entries.filter(e => e.lootTableEntryId !== entryId) });
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
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 font-mono">{table.code}</p>
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
                                    <div key={entry.lootTableEntryId} className="flex items-center justify-between gap-3 border-2 border-black/10 dark:border-white/10 rounded-2xl p-3 bg-gray-50/60 dark:bg-gray-800/40">
                                        <div className="min-w-0">
                                            <p className="font-black text-gray-900 dark:text-gray-100 truncate">
                                                {entry.rewardKind === "ITEM" ? (entry.itemName ?? `Item #${entry.itemDefinitionId}`) : entry.rewardKind}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                Weight {weight} · {chance.toFixed(1)}% · Amount {entry.amountMin ?? 0}–{entry.amountMax ?? 0}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteEntry(entry.lootTableEntryId)}
                                            disabled={deletingId === entry.lootTableEntryId}
                                            title="Delete entry"
                                            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-xl border-2 border-black bg-red-100 hover:bg-red-200 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-red-800 disabled:opacity-50"
                                        >
                                            {deletingId === entry.lootTableEntryId ? <Spinner size={13} /> : <Trash2 className="w-3.5 h-3.5" />}
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
                                <Label>Reward Kind</Label>
                                <select value={form.rewardKind}
                                    onChange={e => setForm(f => ({ ...f, rewardKind: e.target.value, itemDefinitionId: e.target.value === "ITEM" ? f.itemDefinitionId : null }))}
                                    className={inputCls}>
                                    {REWARD_KINDS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            {form.rewardKind === "ITEM" && (
                                <div>
                                    <Label>Item Definition ID</Label>
                                    <input required type="number" min={1} value={form.itemDefinitionId || ""}
                                        onChange={e => setForm(f => ({ ...f, itemDefinitionId: Number(e.target.value) }))}
                                        placeholder="123" className={inputCls} />
                                </div>
                            )}
                            <div>
                                <Label>Weight</Label>
                                <input required type="number" min={1} value={form.weight}
                                    onChange={e => setForm(f => ({ ...f, weight: Number(e.target.value) }))} className={inputCls} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Amount Min</Label>
                                    <input required type="number" min={1} value={form.amountMin}
                                        onChange={e => setForm(f => ({ ...f, amountMin: Number(e.target.value) }))} className={inputCls} />
                                </div>
                                <div>
                                    <Label>Amount Max</Label>
                                    <input required type="number" min={1} value={form.amountMax}
                                        onChange={e => setForm(f => ({ ...f, amountMax: Number(e.target.value) }))} className={inputCls} />
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
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [managingTable, setManagingTable] = useState<LootTableDto | null>(null);
    const [page, setPage] = useState(1);
    // BE (GetLootTablesQuery) takes no params and returns a plain list — no pagination on
    // this endpoint — so this always resolves to a single page. Kept for layout parity.
    const totalPages = 1;

    const fetchTables = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await adminLootTableApi.getLootTables();
            if (res.success) {
                setTables(res.data ?? []);
            } else {
                setError(res.message || "Failed to load loot tables.");
            }
        } catch (err) {
            setError(errMsg(err) ?? "Network error fetching loot tables.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTables(); }, [fetchTables]);

    const handleToggleActive = async (table: LootTableDto) => {
        const nextActive = !table.isActive;
        const id = table.lootTableId;
        setTogglingId(id);
        // Optimistic flip — BE's setActive endpoint (SetLootTableActiveCommand) returns a
        // bare boolean, not the updated table, so local state stays the source of truth.
        setTables(prev => prev.map(t => t.lootTableId === id ? { ...t, isActive: nextActive } : t));
        try {
            const res = await adminLootTableApi.setActive(id, nextActive);
            if (res.success) {
                alert.success(`"${table.code}" is now ${nextActive ? "active" : "inactive"}.`);
            } else {
                setTables(prev => prev.map(t => t.lootTableId === id ? { ...t, isActive: table.isActive } : t));
                alert.error(res.message || "Failed to toggle table.");
            }
        } catch (err) {
            setTables(prev => prev.map(t => t.lootTableId === id ? { ...t, isActive: table.isActive } : t));
            alert.error(errMsg(err) ?? "Failed to toggle table.");
        } finally {
            setTogglingId(null);
        }
    };

    const handleEntriesChanged = (updated: LootTableDto) => {
        setTables(prev => prev.map(t => t.lootTableId === updated.lootTableId ? updated : t));
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
                                        {["Code", "Entries", "Active", "Actions"].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {tables.map((table) => (
                                        <tr key={table.lootTableId} className="hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-colors">
                                            <td className="px-4 py-4 max-w-70">
                                                <p className="font-black text-gray-900 dark:text-gray-100 font-mono truncate">{table.code}</p>
                                            </td>
                                            <td className="px-4 py-4 text-gray-600 dark:text-gray-300 font-bold">{(table.entries ?? []).length}</td>
                                            <td className="px-4 py-4">
                                                <button
                                                    onClick={() => handleToggleActive(table)}
                                                    disabled={togglingId === table.lootTableId}
                                                    aria-label={table.isActive ? "Deactivate table" : "Activate table"}
                                                    className={`relative w-11 h-6 shrink-0 rounded-full border-2 border-black transition-colors disabled:opacity-50 ${table.isActive ? "bg-purple-400" : "bg-gray-200 dark:bg-gray-700"}`}
                                                >
                                                    <span className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white border border-black transition-transform ${table.isActive ? "translate-x-5" : "translate-x-0"}`} />
                                                </button>
                                            </td>
                                            <td className="px-4 py-4">
                                                <button title="Manage entries" onClick={() => setManagingTable(table)}
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
                    onClose={() => setManagingTable(null)}
                    onChanged={handleEntriesChanged}
                />
            )}
        </>
    );
}

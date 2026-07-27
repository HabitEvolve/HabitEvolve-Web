import { useState, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Swords, Plus, Pencil, X, Save, Loader2, Image as ImageIcon } from "lucide-react";
import { useAlert } from "../context/AlertContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Pagination from "../components/common/Pagination";
import { TableFilterBar } from "../components/common/TableFilterBar";
import { useTableFilters, type FilterField } from "../hooks/useTableFilters";
import { adminCombatItemApi } from "../api/adminCombatItemApi";
import type { CombatItemDefinitionDto, CreateCombatItemPayload, CombatItemKind } from "../types/adminCombatItem.types";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const COMBAT_ITEM_KINDS: CombatItemKind[] = ["CHARACTER", "SPELL"];

const EMPTY_ITEM: CreateCombatItemPayload = {
    kind: "CHARACTER",
    code: "",
    name: "",
    iconUrl: "",
    price: 0,
    currency: "GOLD",
    damageBonus: 0,
    isDefault: false,
};

const FILTER_FIELDS: FilterField[] = [
    {
        key: "kind",
        label: "Kind",
        type: "select",
        options: COMBAT_ITEM_KINDS.map(k => ({ label: k, value: k })),
    },
];

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

// ── HELPERS ───────────────────────────────────────────────────────────────────
const errMsg = (e: unknown) =>
    (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const Label = ({ children }: { children: ReactNode }) => (
    <p className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">{children}</p>
);

const Spinner = ({ size = 18 }: { size?: number }) => <Loader2 className="animate-spin" width={size} height={size} />;

const KIND_CFG: Record<string, { bg: string; border: string; text: string }> = {
    CHARACTER: { bg: "bg-blue-100 dark:bg-blue-900/40", border: "border-blue-400", text: "text-blue-800 dark:text-blue-300" },
    SPELL: { bg: "bg-purple-100 dark:bg-purple-900/40", border: "border-purple-400", text: "text-purple-800 dark:text-purple-300" },
};
const KindBadge = ({ kind }: { kind: CombatItemKind }) => {
    const c = KIND_CFG[kind] ?? KIND_CFG.CHARACTER;
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black border ${c.bg} ${c.border} ${c.text}`}>{kind}</span>;
};

// ── COMBAT ITEM FORM MODAL ────────────────────────────────────────────────────
interface CombatItemFormModalProps {
    item: CombatItemDefinitionDto | null;
    onClose: () => void;
    onSuccess: () => void;
}

const CombatItemFormModal = ({ item, onClose, onSuccess }: CombatItemFormModalProps) => {
    const alert = useAlert();
    const isEdit = item !== null;
    const [form, setForm] = useState<CreateCombatItemPayload>(() =>
        isEdit
            ? {
                kind: item.kind,
                code: item.code,
                name: item.name,
                iconUrl: item.iconUrl ?? "",
                price: item.price,
                currency: item.currency,
                damageBonus: item.damageBonus,
                isDefault: item.isDefault,
            }
            : { ...EMPTY_ITEM }
    );
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const set = <K extends keyof CreateCombatItemPayload>(k: K, v: CreateCombatItemPayload[K]) =>
        setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.code.trim() || !form.name.trim()) {
            setFormError("Code and name are required.");
            return;
        }
        setSaving(true);
        setFormError(null);
        try {
            if (isEdit) {
                // Kind and Code are immutable after creation — BE's update endpoint
                // (UpdateCombatItemBody) doesn't accept them.
                await adminCombatItemApi.updateCombatItem(item.combatItemDefinitionId, {
                    name: form.name,
                    iconUrl: form.iconUrl,
                    price: form.price,
                    damageBonus: form.damageBonus,
                    isDefault: form.isDefault,
                });
                alert.success(`"${form.name}" updated!`);
            } else {
                await adminCombatItemApi.createCombatItem(form);
                alert.success(`"${form.name}" created!`);
            }
            onSuccess();
            onClose();
        } catch (err) {
            setFormError(errMsg(err) ?? "Failed to save combat item.");
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-99999 w-screen h-screen flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="modal-content bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[8px_8px_0_0_#1A1D20] w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black bg-[#FDE68A] dark:bg-amber-900/30 shrink-0 rounded-t-3xl">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-amber-300 dark:bg-amber-700 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#1A1D20]">
                            <Swords className="w-4.5 h-4.5" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-gray-900 dark:text-gray-100">{isEdit ? "Edit Combat Item" : "New Combat Item"}</h2>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{isEdit ? item.name : "Character / Spell — adds damage"}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form */}
                <div className="flex-1 overflow-y-auto p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Code</Label>
                                <input required disabled={isEdit} type="text" value={form.code}
                                    onChange={e => set("code", e.target.value.toUpperCase())}
                                    placeholder="CHAR_MAYA_LEADER" className={`${inputCls} disabled:opacity-60`} />
                            </div>
                            <div>
                                <Label>Name</Label>
                                <input required type="text" value={form.name} onChange={e => set("name", e.target.value)}
                                    placeholder="Maya Leader" className={inputCls} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Kind</Label>
                                <select disabled={isEdit} value={form.kind} onChange={e => set("kind", e.target.value)} className={`${inputCls} disabled:opacity-60`}>
                                    {COMBAT_ITEM_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
                                </select>
                            </div>
                            <div>
                                <Label>Currency</Label>
                                <input disabled type="text" value={form.currency} className={`${inputCls} disabled:opacity-60`} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Price (Gold)</Label>
                                <input required type="number" min={0} value={form.price}
                                    onChange={e => set("price", Number(e.target.value))} className={inputCls} />
                            </div>
                            <div>
                                <Label>Damage Bonus</Label>
                                <input required type="number" min={0} value={form.damageBonus}
                                    onChange={e => set("damageBonus", Number(e.target.value))}
                                    placeholder="Damage added when equipped" className={inputCls} />
                            </div>
                        </div>
                        <div>
                            <Label>Icon URL</Label>
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 shrink-0 rounded-xl border-2 border-black bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                                    {form.iconUrl ? (
                                        <img src={form.iconUrl} alt="" className="w-full h-full object-contain" onError={e => (e.currentTarget.style.visibility = "hidden")} />
                                    ) : (
                                        <ImageIcon className="w-5 h-5 text-gray-400" />
                                    )}
                                </div>
                                <input type="text" value={form.iconUrl} onChange={e => set("iconUrl", e.target.value)}
                                    placeholder="https://…" className={inputCls} />
                            </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                            <input type="checkbox" checked={form.isDefault} onChange={e => set("isDefault", e.target.checked)} className="w-4 h-4" />
                            Default (free, owned by everyone — e.g. starter character)
                        </label>

                        {formError && (
                            <p className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl px-3 py-2">{formError}</p>
                        )}

                        <div className="flex gap-3 pt-2 border-t-2 border-gray-100 dark:border-gray-700">
                            <button type="button" onClick={onClose} disabled={saving}
                                className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>Cancel</button>
                            <button type="submit" disabled={saving}
                                className={`${btnBase} flex-1 justify-center bg-amber-200 dark:bg-amber-700 text-amber-900 dark:text-white`}>
                                {saving ? <><Spinner size={13} /> Saving…</> : <><Save className="w-3.5 h-3.5" /> {isEdit ? "Update" : "Create"}</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function AdminCombatItemManagement() {
    const alert = useAlert();
    const [items, setItems] = useState<CombatItemDefinitionDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [editingItem, setEditingItem] = useState<CombatItemDefinitionDto | null | "new">(null);
    // BE (GetCombatItemsQuery) returns a plain list — no pagination on this endpoint —
    // so this always resolves to a single page. Pagination control kept for layout parity.
    const totalPages = 1;

    const { filters, debouncedFilters, setFilter, clearFilters, hasActiveFilters, page, setPage } =
        useTableFilters({ kind: "" });

    const fetchItems = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await adminCombatItemApi.getCombatItems(debouncedFilters.kind || undefined);
            if (res.success) {
                setItems(res.data ?? []);
            } else {
                setError(res.message || "Failed to load combat items.");
            }
        } catch (err) {
            setError(errMsg(err) ?? "Network error fetching combat items.");
        } finally {
            setLoading(false);
        }
    }, [debouncedFilters.kind]);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    const handleToggleActive = async (item: CombatItemDefinitionDto) => {
        const nextActive = !item.isActive;
        const id = item.combatItemDefinitionId;
        setTogglingId(id);
        setItems(prev => prev.map(i => i.combatItemDefinitionId === id ? { ...i, isActive: nextActive } : i));
        try {
            const res = await adminCombatItemApi.setActive(id, nextActive);
            if (res.success) {
                if (res.data) setItems(prev => prev.map(i => i.combatItemDefinitionId === id ? res.data! : i));
                alert.success(`"${item.name}" is now ${nextActive ? "active" : "inactive"}.`);
            } else {
                setItems(prev => prev.map(i => i.combatItemDefinitionId === id ? { ...i, isActive: item.isActive } : i));
                alert.error(res.message || "Failed to toggle combat item.");
            }
        } catch (err) {
            setItems(prev => prev.map(i => i.combatItemDefinitionId === id ? { ...i, isActive: item.isActive } : i));
            alert.error(errMsg(err) ?? "Failed to toggle combat item.");
        } finally {
            setTogglingId(null);
        }
    };

    return (
        <>
            <PageMeta title="Combat Items | HabitEvolve Admin" description="Manage Character/Spell damage stats" />
            <PageBreadcrumb pageTitle="Combat Items" />

            <div className="space-y-6 p-1">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-300 border-2 border-black flex items-center justify-center shadow-[3px_3px_0_0_#1A1D20] shrink-0">
                            <Swords className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Combat Items</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">Character / Spell ("chưởng lực") — damage bonus when equipped. Separate from cosmetic Item Catalog.</p>
                        </div>
                    </div>
                    <button onClick={() => setEditingItem("new")} className={`${btnBase} bg-amber-200 text-amber-900 shrink-0`}>
                        <Plus className="w-3.5 h-3.5" /> New Combat Item
                    </button>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-900 border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] overflow-hidden">
                    <TableFilterBar fields={FILTER_FIELDS} filters={filters} onFilterChange={setFilter} onClear={clearFilters} hasActiveFilters={hasActiveFilters} />

                    {error ? (
                        <div className="flex flex-col items-center gap-3 py-16">
                            <p className="font-black text-gray-700 dark:text-gray-300">Couldn't load combat items</p>
                            <p className="text-sm text-gray-400">{error}</p>
                            <button onClick={fetchItems} className={`${btnBase} bg-red-100 text-red-800`}>Retry</button>
                        </div>
                    ) : loading && items.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                            <Spinner size={32} /><p className="font-bold text-sm">Loading combat items…</p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                            <Swords className="w-12 h-12" />
                            <p className="font-black text-lg text-gray-500 dark:text-gray-300">No combat items yet</p>
                            <button onClick={() => setEditingItem("new")} className={`${btnBase} bg-amber-200 text-amber-900`}>
                                <Plus className="w-3.5 h-3.5" /> Create your first combat item
                            </button>
                        </div>
                    ) : (
                        <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-50 pointer-events-none" : ""}`}>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b-2 border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60">
                                        {["Icon", "Code", "Name", "Kind", "Price", "Damage Bonus", "Default", "Active", "Actions"].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {items.map((item) => (
                                        <tr key={item.combatItemDefinitionId} className="hover:bg-amber-50/30 dark:hover:bg-amber-900/10 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="w-9 h-9 rounded-xl border-2 border-black bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                                                    {item.iconUrl ? <img src={item.iconUrl} alt="" className="w-full h-full object-contain" /> : <ImageIcon className="w-4 h-4 text-gray-400" />}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="font-mono text-xs font-bold text-gray-600 dark:text-gray-300">{item.code}</span>
                                            </td>
                                            <td className="px-4 py-4 max-w-60">
                                                <p className="font-black text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                                            </td>
                                            <td className="px-4 py-4"><KindBadge kind={item.kind} /></td>
                                            <td className="px-4 py-4">
                                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{item.price === 0 ? "Free" : `${item.price} ${item.currency}`}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black border bg-red-100 dark:bg-red-900/40 border-red-400 text-red-800 dark:text-red-300">+{item.damageBonus}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                {item.isDefault && <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Default</span>}
                                            </td>
                                            <td className="px-4 py-4">
                                                <button
                                                    onClick={() => handleToggleActive(item)}
                                                    disabled={togglingId === item.combatItemDefinitionId}
                                                    aria-label={item.isActive ? "Deactivate item" : "Activate item"}
                                                    className={`relative w-11 h-6 shrink-0 rounded-full border-2 border-black transition-colors disabled:opacity-50 ${item.isActive ? "bg-emerald-400" : "bg-gray-200 dark:bg-gray-700"}`}
                                                >
                                                    <span className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white border border-black transition-transform ${item.isActive ? "translate-x-5" : "translate-x-0"}`} />
                                                </button>
                                            </td>
                                            <td className="px-4 py-4">
                                                <button title="Edit combat item" onClick={() => setEditingItem(item)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-blue-100 hover:bg-blue-200 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-blue-800">
                                                    <Pencil className="w-3 h-3" />
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

            {editingItem !== null && (
                <CombatItemFormModal
                    item={editingItem === "new" ? null : editingItem}
                    onClose={() => setEditingItem(null)}
                    onSuccess={fetchItems}
                />
            )}
        </>
    );
}

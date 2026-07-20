import { useState, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Gem, Plus, Pencil, X, Save, Loader2, Image as ImageIcon } from "lucide-react";
import { useAlert } from "../context/AlertContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Pagination from "../components/common/Pagination";
import { TableFilterBar } from "../components/common/TableFilterBar";
import { useTableFilters, type FilterField } from "../hooks/useTableFilters";
import { adminItemApi } from "../api/adminItemApi";
import type { ItemDto, CreateItemPayload, ItemType, ItemRarity } from "../types/adminItem.types";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;
const ITEM_TYPES: ItemType[] = ["AVATAR_FRAME", "BADGE", "TITLE", "PET_SKIN", "THEME"];
const ITEM_RARITIES: ItemRarity[] = ["COMMON", "RARE", "EPIC", "LEGENDARY"];

const EMPTY_ITEM: CreateItemPayload = {
    name: "",
    description: "",
    itemType: "AVATAR_FRAME",
    rarity: "COMMON",
    iconUrl: "",
};

const FILTER_FIELDS: FilterField[] = [
    {
        key: "itemType",
        label: "Item Type",
        type: "select",
        options: ITEM_TYPES.map(t => ({ label: t, value: t })),
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

const RARITY_CFG: Record<string, { bg: string; border: string; text: string }> = {
    COMMON: { bg: "bg-gray-100 dark:bg-gray-700", border: "border-gray-400", text: "text-gray-700 dark:text-gray-200" },
    RARE: { bg: "bg-blue-100 dark:bg-blue-900/40", border: "border-blue-400", text: "text-blue-800 dark:text-blue-300" },
    EPIC: { bg: "bg-purple-100 dark:bg-purple-900/40", border: "border-purple-400", text: "text-purple-800 dark:text-purple-300" },
    LEGENDARY: { bg: "bg-yellow-100 dark:bg-yellow-900/40", border: "border-yellow-500", text: "text-yellow-800 dark:text-yellow-300" },
};
const RarityBadge = ({ rarity }: { rarity: ItemRarity }) => {
    const c = RARITY_CFG[rarity] ?? RARITY_CFG.COMMON;
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black border ${c.bg} ${c.border} ${c.text}`}>{rarity}</span>;
};

// ── ITEM FORM MODAL ───────────────────────────────────────────────────────────
interface ItemFormModalProps {
    item: ItemDto | null;
    onClose: () => void;
    onSuccess: () => void;
}

const ItemFormModal = ({ item, onClose, onSuccess }: ItemFormModalProps) => {
    const alert = useAlert();
    const isEdit = item !== null;
    const [form, setForm] = useState<CreateItemPayload>(() =>
        isEdit
            ? {
                name: item.name,
                description: item.description ?? "",
                itemType: item.itemType,
                rarity: item.rarity,
                iconUrl: item.iconUrl ?? "",
            }
            : { ...EMPTY_ITEM }
    );
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const set = <K extends keyof CreateItemPayload>(k: K, v: CreateItemPayload[K]) =>
        setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setFormError(null);
        try {
            if (isEdit) {
                await adminItemApi.updateItem(item.itemId, form);
                alert.success(`"${form.name}" updated!`);
            } else {
                await adminItemApi.createItem(form);
                alert.success(`"${form.name}" created!`);
            }
            onSuccess();
            onClose();
        } catch (err) {
            setFormError(errMsg(err) ?? "Failed to save item.");
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-99999 w-screen h-screen flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="modal-content bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[8px_8px_0_0_#1A1D20] w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black bg-[#C8F7DC] dark:bg-emerald-900/30 shrink-0 rounded-t-3xl">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-emerald-300 dark:bg-emerald-700 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#1A1D20]">
                            <Gem className="w-4.5 h-4.5" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-gray-900 dark:text-gray-100">{isEdit ? "Edit Item" : "New Item"}</h2>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{isEdit ? item.name : "Cosmetic catalog entry"}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form */}
                <div className="flex-1 overflow-y-auto p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label>Name</Label>
                            <input required type="text" value={form.name} onChange={e => set("name", e.target.value)}
                                placeholder="Golden Frame" className={inputCls} />
                        </div>
                        <div>
                            <Label>Description</Label>
                            <textarea value={form.description} onChange={e => set("description", e.target.value)}
                                rows={2} placeholder="Cosmetic-only, no gameplay effect" className={`${inputCls} resize-none`} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Item Type</Label>
                                <select value={form.itemType} onChange={e => set("itemType", e.target.value)} className={inputCls}>
                                    {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <Label>Rarity</Label>
                                <select value={form.rarity} onChange={e => set("rarity", e.target.value)} className={inputCls}>
                                    {ITEM_RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
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

                        {formError && (
                            <p className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl px-3 py-2">{formError}</p>
                        )}

                        <div className="flex gap-3 pt-2 border-t-2 border-gray-100 dark:border-gray-700">
                            <button type="button" onClick={onClose} disabled={saving}
                                className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>Cancel</button>
                            <button type="submit" disabled={saving}
                                className={`${btnBase} flex-1 justify-center bg-emerald-200 dark:bg-emerald-700 text-emerald-900 dark:text-white`}>
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
export default function AdminItemManagement() {
    const alert = useAlert();
    const [items, setItems] = useState<ItemDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Tracked by array index, not itemId — the BE's actual primary-key field name for
    // this endpoint hasn't been confirmed, and matching by a possibly-undefined ID would
    // make every row compare equal (undefined === undefined) and update together.
    const [togglingIndex, setTogglingIndex] = useState<number | null>(null);
    const [editingItem, setEditingItem] = useState<ItemDto | null | "new">(null);
    const [totalPages, setTotalPages] = useState(1);

    // `page` resets to 1 automatically whenever a filter changes (built into the hook) —
    // that's the "reset page on filter change" requirement, for free.
    const { filters, debouncedFilters, setFilter, clearFilters, hasActiveFilters, page, setPage } =
        useTableFilters({ itemType: "" });

    const fetchItems = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await adminItemApi.getItems({
                itemType: debouncedFilters.itemType || undefined,
                pageNumber: page,
                pageSize: PAGE_SIZE,
            });
            if (res.success) {
                setItems(res.data ?? []);
                setTotalPages(res.totalPages ?? 1);
            } else {
                setError(res.message || "Failed to load items.");
            }
        } catch (err) {
            setError(errMsg(err) ?? "Network error fetching items.");
        } finally {
            setLoading(false);
        }
    }, [debouncedFilters.itemType, page]);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    const handleToggleActive = async (item: ItemDto, index: number) => {
        const nextActive = !item.isActive;
        setTogglingIndex(index);
        // Optimistic flip, matched by index — the toggle endpoint's response isn't
        // guaranteed to be the full entity, so local state is the source of truth for
        // isActive, not res.data. Index matching (not itemId) avoids updating every row
        // at once if the BE's real ID field is named differently than expected.
        setItems(prev => prev.map((i, idx) => idx === index ? { ...i, isActive: nextActive } : i));
        try {
            const res = await adminItemApi.toggleActive(item.itemId, nextActive);
            if (res.success) {
                // Merge in whatever the BE did return (partial or full) — never replace,
                // so a partial response can't wipe out fields like name/description.
                if (res.data) setItems(prev => prev.map((i, idx) => idx === index ? { ...i, ...res.data } : i));
                alert.success(`"${item.name}" is now ${nextActive ? "active" : "inactive"}.`);
            } else {
                setItems(prev => prev.map((i, idx) => idx === index ? { ...i, isActive: item.isActive } : i));
                alert.error(res.message || "Failed to toggle item.");
            }
        } catch (err) {
            setItems(prev => prev.map((i, idx) => idx === index ? { ...i, isActive: item.isActive } : i));
            alert.error(errMsg(err) ?? "Failed to toggle item.");
        } finally {
            setTogglingIndex(null);
        }
    };

    return (
        <>
            <PageMeta title="Item Catalog | HabitEvolve Admin" description="Manage cosmetic-only items" />
            <PageBreadcrumb pageTitle="Item Catalog" />

            <div className="space-y-6 p-1">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-300 border-2 border-black flex items-center justify-center shadow-[3px_3px_0_0_#1A1D20] shrink-0">
                            <Gem className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Item Catalog</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">Cosmetic-only items — avatar frames, badges, titles, pet skins, themes</p>
                        </div>
                    </div>
                    <button onClick={() => setEditingItem("new")} className={`${btnBase} bg-emerald-200 text-emerald-900 shrink-0`}>
                        <Plus className="w-3.5 h-3.5" /> New Item
                    </button>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-900 border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] overflow-hidden">
                    <TableFilterBar fields={FILTER_FIELDS} filters={filters} onFilterChange={setFilter} onClear={clearFilters} hasActiveFilters={hasActiveFilters} />

                    {error ? (
                        <div className="flex flex-col items-center gap-3 py-16">
                            <p className="font-black text-gray-700 dark:text-gray-300">Couldn't load items</p>
                            <p className="text-sm text-gray-400">{error}</p>
                            <button onClick={fetchItems} className={`${btnBase} bg-red-100 text-red-800`}>Retry</button>
                        </div>
                    ) : loading && items.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                            <Spinner size={32} /><p className="font-bold text-sm">Loading items…</p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                            <Gem className="w-12 h-12" />
                            <p className="font-black text-lg text-gray-500 dark:text-gray-300">No items yet</p>
                            <button onClick={() => setEditingItem("new")} className={`${btnBase} bg-emerald-200 text-emerald-900`}>
                                <Plus className="w-3.5 h-3.5" /> Create your first item
                            </button>
                        </div>
                    ) : (
                        <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-50 pointer-events-none" : ""}`}>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b-2 border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60">
                                        {["Icon", "Name", "Type", "Rarity", "Active", "Actions"].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {items.map((item, index) => (
                                        <tr key={item.itemId ?? index} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="w-9 h-9 rounded-xl border-2 border-black bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                                                    {item.iconUrl ? <img src={item.iconUrl} alt="" className="w-full h-full object-contain" /> : <ImageIcon className="w-4 h-4 text-gray-400" />}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 max-w-60">
                                                <p className="font-black text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                                                <p className="text-xs text-gray-400 font-medium mt-0.5 truncate">{item.description || "No description"}</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{item.itemType}</span>
                                            </td>
                                            <td className="px-4 py-4"><RarityBadge rarity={item.rarity} /></td>
                                            <td className="px-4 py-4">
                                                <button
                                                    onClick={() => handleToggleActive(item, index)}
                                                    disabled={togglingIndex === index}
                                                    aria-label={item.isActive ? "Deactivate item" : "Activate item"}
                                                    className={`relative w-11 h-6 shrink-0 rounded-full border-2 border-black transition-colors disabled:opacity-50 ${item.isActive ? "bg-emerald-400" : "bg-gray-200 dark:bg-gray-700"}`}
                                                >
                                                    <span className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white border border-black transition-transform ${item.isActive ? "translate-x-5" : "translate-x-0"}`} />
                                                </button>
                                            </td>
                                            <td className="px-4 py-4">
                                                <button title="Edit item" onClick={() => setEditingItem(item)}
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
                <ItemFormModal
                    item={editingItem === "new" ? null : editingItem}
                    onClose={() => setEditingItem(null)}
                    onSuccess={fetchItems}
                />
            )}
        </>
    );
}

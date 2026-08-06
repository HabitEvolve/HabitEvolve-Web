import { useState, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Swords, Plus, Pencil, X, Save, Loader2, Image as ImageIcon } from "lucide-react";
import { useAlert } from "../context/AlertContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import PageHeader from "../components/common/PageHeader";
import Pagination from "../components/common/SkyPagination";
import { FilterDropdown } from "../components/common/FilterDropdown";
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
    description: "",
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
    "inline-flex items-center gap-2 px-4 py-2 font-medium text-sm rounded-sky-chip " +
    "transition disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

const btnPrimary = "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-fill sky-lift";
const btnGhost = "sky-glass-chip text-sky-deep sky-lift";

const inputCls =
    "w-full px-4 py-2.5 rounded-sky-chip border border-white/80 bg-white/60 text-sm text-sky-ink transition " +
    "placeholder:text-sky-ink-3 focus:outline-hidden focus:border-sky-deep focus:bg-white/85 focus:ring-3 focus:ring-sky-deep/18";

// ── HELPERS ───────────────────────────────────────────────────────────────────
const errMsg = (e: unknown) =>
    (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const Label = ({ children }: { children: ReactNode }) => (
    <p className="text-xs font-semibold text-sky-ink-2 mb-1.5">{children}</p>
);

const Spinner = ({ size = 18 }: { size?: number }) => <Loader2 className="animate-spin" width={size} height={size} />;

// Kind is a taxonomy, not a status: cool deep for the mundane CHARACTER,
// violet (the "epic" hue) for SPELL.
const KIND_CFG: Record<string, string> = {
    CHARACTER: "bg-sky-deep/10 text-sky-deep",
    SPELL: "bg-sky-violet/12 text-sky-violet-deep",
};
const KindBadge = ({ kind }: { kind: CombatItemKind }) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${KIND_CFG[kind] ?? KIND_CFG.CHARACTER}`}>{kind}</span>
);

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
                description: item.description ?? "",
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
                    description: form.description,
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
        <div className="fixed inset-0 z-99999 w-screen h-screen flex items-center justify-center bg-sky-ink/45 backdrop-blur-[18px] p-4">
            <div className="modal-content relative sky-glass rounded-sky-card w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden sky-in">
                {/* Combat items are game content, so the rail is violet (epic)
                    rather than the operational deep used on admin CRUD. */}
                <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-sky-violet to-sky-violet-deep" />
                {/* Header */}
                <div className="relative flex items-center justify-between px-6 py-4 border-b border-white/60 bg-white/70 backdrop-blur-[14px] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-sky-chip bg-sky-violet/12 text-sky-violet-deep flex items-center justify-center">
                            <Swords className="w-4.5 h-4.5" />
                        </div>
                        <div>
                            <h2 className="font-display text-base font-semibold text-sky-ink">{isEdit ? "Edit Combat Item" : "New Combat Item"}</h2>
                            <p className="text-xs text-sky-ink-2">{isEdit ? item.name : "Character / Spell — adds damage"}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close"
                        className="w-8 h-8 flex items-center justify-center rounded-full text-sky-ink-2 hover:bg-white/80 hover:text-sky-ink active:scale-95 transition">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form */}
                <div className="relative flex-1 overflow-y-auto p-6">
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
                                    onChange={e => set("price", Number(e.target.value))} className={`${inputCls} tabular-nums`} />
                            </div>
                            <div>
                                <Label>Damage Bonus</Label>
                                <input required type="number" min={0} value={form.damageBonus}
                                    onChange={e => set("damageBonus", Number(e.target.value))}
                                    placeholder="Damage added when equipped" className={`${inputCls} tabular-nums`} />
                            </div>
                        </div>
                        <div>
                            <Label>Icon URL</Label>
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 shrink-0 rounded-sky-chip border border-white/85 bg-white/60 flex items-center justify-center overflow-hidden">
                                    {form.iconUrl ? (
                                        <img src={form.iconUrl} alt="" className="w-full h-full object-contain" onError={e => (e.currentTarget.style.visibility = "hidden")} />
                                    ) : (
                                        <ImageIcon className="w-5 h-5 text-sky-ink-3" />
                                    )}
                                </div>
                                <input type="text" value={form.iconUrl} onChange={e => set("iconUrl", e.target.value)}
                                    placeholder="https://…" className={inputCls} />
                            </div>
                        </div>
                        <div>
                            <Label>Description</Label>
                            <textarea value={form.description} onChange={e => set("description", e.target.value)}
                                placeholder="Shown to players on the item detail sheet (optional, max 1000 chars)."
                                rows={3} maxLength={1000} className={`${inputCls} resize-none`} />
                        </div>
                        <label className="flex items-center gap-2.5 px-4 py-3 rounded-sky-chip bg-white/55 border border-white/80 text-sm font-medium text-sky-ink cursor-pointer">
                            <input type="checkbox" checked={form.isDefault} onChange={e => set("isDefault", e.target.checked)} className="w-4 h-4 accent-sky-deep" />
                            Default (free, owned by everyone — e.g. starter character)
                        </label>

                        {formError && (
                            <p className="text-xs font-medium text-sky-rose-deep bg-sky-rose/12 border border-sky-rose/28 rounded-sky-chip px-3 py-2">{formError}</p>
                        )}

                        <div className="flex gap-3 pt-3 border-t border-white/60">
                            <button type="button" onClick={onClose} disabled={saving}
                                className={`${btnBase} ${btnGhost} flex-1 justify-center`}>Cancel</button>
                            <button type="submit" disabled={saving}
                                className={`${btnBase} ${btnPrimary} flex-1 justify-center`}>
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
                <PageHeader
                    icon={<Swords className="w-6 h-6" />}
                    tone="violet"
                    title="Combat Items"
                    description={'Character / Spell ("chưởng lực") — damage bonus when equipped. Separate from cosmetic Item Catalog.'}
                    actions={
                        <button type="button" onClick={() => setEditingItem("new")} className={`${btnBase} ${btnPrimary} shrink-0`}>
                            <Plus className="w-3.5 h-3.5" /> New Combat Item
                        </button>
                    }
                />

                {/* Table */}
                <div className="sky-glass-admin rounded-sky-card overflow-hidden">
                    <div className="flex justify-end px-5 py-3 border-b border-white/60 bg-white/35">
                        <FilterDropdown fields={FILTER_FIELDS} filters={filters} onFilterChange={setFilter} onClear={clearFilters} hasActiveFilters={hasActiveFilters} />
                    </div>

                    {error ? (
                        <div className="relative flex flex-col items-center gap-3 py-16">
                            <span className="flex items-center justify-center w-14 h-14 rounded-full bg-sky-rose/12 text-sky-rose-deep">
                                <Swords className="w-6 h-6" />
                            </span>
                            <p className="font-display font-semibold text-sky-ink">Couldn't load combat items</p>
                            <p className="text-sm text-sky-ink-2">{error}</p>
                            <button type="button" onClick={fetchItems} className={`${btnBase} ${btnGhost}`}>Retry</button>
                        </div>
                    ) : loading && items.length === 0 ? (
                        <div className="relative flex flex-col items-center gap-3 py-16 text-sky-ink-2">
                            <Spinner size={32} /><p className="text-sm font-medium">Loading combat items…</p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="relative flex flex-col items-center gap-3 py-16">
                            <span className="flex items-center justify-center w-16 h-16 rounded-full bg-sky-violet/10 text-sky-violet-deep">
                                <Swords className="w-7 h-7" />
                            </span>
                            <p className="font-display font-semibold text-lg text-sky-ink">No combat items yet</p>
                            <button type="button" onClick={() => setEditingItem("new")} className={`${btnBase} ${btnPrimary}`}>
                                <Plus className="w-3.5 h-3.5" /> Create your first combat item
                            </button>
                        </div>
                    ) : (
                        <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-50 pointer-events-none" : ""}`}>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="sky-table-head">
                                        {["Icon", "Code", "Name", "Kind", "Price", "Damage Bonus", "Default", "Active", "Actions"].map(h => (
                                            <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item) => (
                                        <tr key={item.combatItemDefinitionId} className="sky-table-row">
                                            <td className="px-4 py-3">
                                                <div className="w-9 h-9 rounded-sky-chip border border-white/85 bg-white/60 flex items-center justify-center overflow-hidden">
                                                    {item.iconUrl ? <img src={item.iconUrl} alt="" className="w-full h-full object-contain" /> : <ImageIcon className="w-4 h-4 text-sky-ink-3" />}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="font-mono text-xs font-medium text-sky-ink-2">{item.code}</span>
                                            </td>
                                            <td className="px-4 py-4 max-w-60">
                                                <p className="font-medium text-sky-ink truncate">{item.name}</p>
                                            </td>
                                            <td className="px-4 py-4"><KindBadge kind={item.kind} /></td>
                                            <td className="px-4 py-4">
                                                <span className="text-xs font-medium text-sky-ink-2 tabular-nums">{item.price === 0 ? "Free" : `${item.price} ${item.currency}`}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                {/* Damage is warm (peach), not rose — it's a reward stat, not an error. */}
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums bg-sky-peach/20 text-sky-peach-deep">+{item.damageBonus}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                {item.isDefault && <span className="sky-badge sky-badge-success">Default</span>}
                                            </td>
                                            <td className="px-4 py-4">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleActive(item)}
                                                    disabled={togglingId === item.combatItemDefinitionId}
                                                    aria-label={item.isActive ? "Deactivate item" : "Activate item"}
                                                    aria-pressed={item.isActive}
                                                    className={`relative w-11 h-6 shrink-0 rounded-full transition-colors disabled:opacity-50 ${item.isActive ? "bg-sky-teal shadow-[inset_0_1px_2px_rgba(36,52,77,0.25)]" : "bg-sky-ink/15"}`}
                                                >
                                                    <span className={`absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${item.isActive ? "translate-x-5" : "translate-x-0"}`} />
                                                </button>
                                            </td>
                                            <td className="px-4 py-4">
                                                <button type="button" title="Edit combat item" onClick={() => setEditingItem(item)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-sky-chip border border-sky-deep/20 bg-sky-deep/8 text-sky-deep hover:bg-sky-deep/14 hover:-translate-y-px active:translate-y-0 active:scale-95 transition">
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

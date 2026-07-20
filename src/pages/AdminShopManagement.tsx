import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Store, Plus, Pencil, X, Save, Loader2 } from "lucide-react";
import { useAlert } from "../context/AlertContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Pagination from "../components/common/Pagination";
import { adminShopApi } from "../api/adminShopApi";
import type { ShopListingDto, CreateShopListingPayload, ShopCurrency } from "../types/adminShop.types";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;
const CURRENCIES: ShopCurrency[] = ["GOLD", "GEMS", "MGOLD"];
const EMPTY_LISTING: CreateShopListingPayload = {
    itemId: 0,
    price: 0,
    currency: "GOLD",
    stock: null,
    rotationGroup: "",
    startsAt: "",
    endsAt: "",
};

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

const CURRENCY_CFG: Record<string, { bg: string; text: string }> = {
    GOLD: { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-800 dark:text-amber-300" },
    GEMS: { bg: "bg-purple-100 dark:bg-purple-900/40", text: "text-purple-800 dark:text-purple-300" },
    MGOLD: { bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-800 dark:text-orange-300" },
};
const CurrencyBadge = ({ currency }: { currency: ShopCurrency }) => {
    const c = CURRENCY_CFG[currency] ?? CURRENCY_CFG.GOLD;
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black ${c.bg} ${c.text}`}>{currency}</span>;
};

// ── LISTING FORM MODAL ────────────────────────────────────────────────────────
interface ListingFormModalProps {
    listing: ShopListingDto | null;
    onClose: () => void;
    onSuccess: () => void;
}

const ListingFormModal = ({ listing, onClose, onSuccess }: ListingFormModalProps) => {
    const alert = useAlert();
    const isEdit = listing !== null;
    const [form, setForm] = useState<CreateShopListingPayload>(() =>
        isEdit
            ? {
                itemId: listing.itemId,
                price: listing.price,
                currency: listing.currency,
                stock: listing.stock,
                rotationGroup: listing.rotationGroup ?? "",
                startsAt: listing.startsAt ?? "",
                endsAt: listing.endsAt ?? "",
            }
            : { ...EMPTY_LISTING }
    );
    const [unlimitedStock, setUnlimitedStock] = useState(isEdit ? listing.stock === null : true);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setFormError(null);
        try {
            const stock = unlimitedStock ? null : form.stock;
            if (isEdit) {
                await adminShopApi.updateListing(listing.listingId, {
                    price: form.price,
                    stock,
                    rotationGroup: form.rotationGroup || undefined,
                    startsAt: form.startsAt || undefined,
                    endsAt: form.endsAt || undefined,
                });
                alert.success(`Listing #${listing.listingId} updated!`);
            } else {
                await adminShopApi.createListing({ ...form, stock });
                alert.success("Listing created!");
            }
            onSuccess();
            onClose();
        } catch (err) {
            setFormError(errMsg(err) ?? "Failed to save listing.");
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-99999 w-screen h-screen flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="modal-content bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[8px_8px_0_0_#1A1D20] w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black bg-[#fde8c8] dark:bg-orange-900/30 shrink-0 rounded-t-3xl">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-orange-300 dark:bg-orange-700 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#1A1D20]">
                            <Store className="w-4.5 h-4.5" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-gray-900 dark:text-gray-100">{isEdit ? "Edit Listing" : "New Listing"}</h2>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{isEdit ? `#${listing.listingId}` : "Shop listing"}</p>
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
                                <Label>Item ID</Label>
                                <input required type="number" min={1} disabled={isEdit} value={form.itemId || ""}
                                    onChange={e => setForm(f => ({ ...f, itemId: Number(e.target.value) }))}
                                    placeholder="123" className={`${inputCls} disabled:opacity-60`} />
                            </div>
                            <div>
                                <Label>Currency</Label>
                                <select disabled={isEdit} value={form.currency}
                                    onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                                    className={`${inputCls} disabled:opacity-60`}>
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <Label>Price</Label>
                            <input required type="number" min={0} value={form.price}
                                onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} className={inputCls} />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <Label>Stock</Label>
                                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 cursor-pointer select-none">
                                    <input type="checkbox" checked={unlimitedStock} onChange={e => setUnlimitedStock(e.target.checked)} />
                                    Unlimited
                                </label>
                            </div>
                            {!unlimitedStock && (
                                <input type="number" min={0} value={form.stock ?? ""}
                                    onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))}
                                    placeholder="e.g. 50" className={inputCls} />
                            )}
                        </div>
                        <div>
                            <Label>Rotation Group (optional)</Label>
                            <input type="text" value={form.rotationGroup} onChange={e => setForm(f => ({ ...f, rotationGroup: e.target.value }))}
                                placeholder="weekly-rotation-a" className={inputCls} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Starts At (optional)</Label>
                                <input type="date" value={form.startsAt?.slice(0, 10) ?? ""} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} className={inputCls} />
                            </div>
                            <div>
                                <Label>Ends At (optional)</Label>
                                <input type="date" value={form.endsAt?.slice(0, 10) ?? ""} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} className={inputCls} />
                            </div>
                        </div>

                        {formError && (
                            <p className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl px-3 py-2">{formError}</p>
                        )}

                        <div className="flex gap-3 pt-2 border-t-2 border-gray-100 dark:border-gray-700">
                            <button type="button" onClick={onClose} disabled={saving}
                                className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>Cancel</button>
                            <button type="submit" disabled={saving}
                                className={`${btnBase} flex-1 justify-center bg-orange-200 dark:bg-orange-700 text-orange-900 dark:text-white`}>
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
export default function AdminShopManagement() {
    const alert = useAlert();
    const [listings, setListings] = useState<ShopListingDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Tracked by array index, not listingId — the BE's actual primary-key field name
    // for this endpoint hasn't been confirmed, and matching by a possibly-undefined ID
    // would make every row compare equal (undefined === undefined) and update together.
    const [togglingIndex, setTogglingIndex] = useState<number | null>(null);
    const [editingListing, setEditingListing] = useState<ShopListingDto | null | "new">(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchListings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await adminShopApi.getListings({ pageNumber: page, pageSize: PAGE_SIZE });
            if (res.success) {
                setListings(res.data ?? []);
                setTotalPages(res.totalPages ?? 1);
            } else {
                setError(res.message || "Failed to load listings.");
            }
        } catch (err) {
            setError(errMsg(err) ?? "Network error fetching listings.");
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { fetchListings(); }, [fetchListings]);

    const handleToggleActive = async (listing: ShopListingDto, index: number) => {
        const nextActive = !listing.isActive;
        setTogglingIndex(index);
        // Optimistic flip, matched by index — the toggle endpoint's response isn't
        // guaranteed to be the full entity, so local state is the source of truth for
        // isActive, not res.data. Index matching (not listingId) avoids updating every
        // row at once if the BE's real ID field is named differently than expected.
        setListings(prev => prev.map((l, i) => i === index ? { ...l, isActive: nextActive } : l));
        try {
            const res = await adminShopApi.toggleActive(listing.listingId, nextActive);
            if (res.success) {
                // Merge in whatever the BE did return — never replace, so a partial
                // response can't wipe out fields like price/stock/rotationGroup.
                if (res.data) setListings(prev => prev.map((l, i) => i === index ? { ...l, ...res.data } : l));
                alert.success(`Listing #${listing.listingId} is now ${nextActive ? "active" : "inactive"}.`);
            } else {
                setListings(prev => prev.map((l, i) => i === index ? { ...l, isActive: listing.isActive } : l));
                alert.error(res.message || "Failed to toggle listing.");
            }
        } catch (err) {
            setListings(prev => prev.map((l, i) => i === index ? { ...l, isActive: listing.isActive } : l));
            alert.error(errMsg(err) ?? "Failed to toggle listing.");
        } finally {
            setTogglingIndex(null);
        }
    };

    return (
        <>
            <PageMeta title="Shop Management | HabitEvolve Admin" description="Manage shop listings — price, stock, and rotation" />
            <PageBreadcrumb pageTitle="Shop Management" />

            <div className="space-y-6 p-1">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-300 border-2 border-black flex items-center justify-center shadow-[3px_3px_0_0_#1A1D20] shrink-0">
                            <Store className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Shop Management</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">Listings — price, stock, and rotation</p>
                        </div>
                    </div>
                    <button onClick={() => setEditingListing("new")} className={`${btnBase} bg-orange-200 text-orange-900 shrink-0`}>
                        <Plus className="w-3.5 h-3.5" /> New Listing
                    </button>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-900 border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] overflow-hidden">
                    {error ? (
                        <div className="flex flex-col items-center gap-3 py-16">
                            <p className="font-black text-gray-700 dark:text-gray-300">Couldn't load listings</p>
                            <p className="text-sm text-gray-400">{error}</p>
                            <button onClick={fetchListings} className={`${btnBase} bg-red-100 text-red-800`}>Retry</button>
                        </div>
                    ) : loading && listings.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                            <Spinner size={32} /><p className="font-bold text-sm">Loading listings…</p>
                        </div>
                    ) : listings.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                            <Store className="w-12 h-12" />
                            <p className="font-black text-lg text-gray-500 dark:text-gray-300">No listings yet</p>
                            <button onClick={() => setEditingListing("new")} className={`${btnBase} bg-orange-200 text-orange-900`}>
                                <Plus className="w-3.5 h-3.5" /> Create your first listing
                            </button>
                        </div>
                    ) : (
                        <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-50 pointer-events-none" : ""}`}>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b-2 border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60">
                                        {["Item", "Price", "Stock", "Rotation", "Active", "Actions"].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {listings.map((listing, index) => (
                                        <tr key={listing.listingId ?? index} className="hover:bg-orange-50/30 dark:hover:bg-orange-900/10 transition-colors">
                                            <td className="px-4 py-4">
                                                <p className="font-black text-gray-900 dark:text-gray-100">{listing.itemName ?? `Item #${listing.itemId}`}</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="font-black text-gray-800 dark:text-gray-200">{(listing.price ?? 0).toLocaleString()}</span>{" "}
                                                <CurrencyBadge currency={listing.currency ?? "GOLD"} />
                                            </td>
                                            <td className="px-4 py-4 text-gray-600 dark:text-gray-300 font-bold">
                                                {listing.stock === null || listing.stock === undefined ? "Unlimited" : listing.stock}
                                            </td>
                                            <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400 font-medium">{listing.rotationGroup ?? "—"}</td>
                                            <td className="px-4 py-4">
                                                <button
                                                    onClick={() => handleToggleActive(listing, index)}
                                                    disabled={togglingIndex === index}
                                                    aria-label={listing.isActive ? "Deactivate listing" : "Activate listing"}
                                                    className={`relative w-11 h-6 shrink-0 rounded-full border-2 border-black transition-colors disabled:opacity-50 ${listing.isActive ? "bg-orange-400" : "bg-gray-200 dark:bg-gray-700"}`}
                                                >
                                                    <span className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white border border-black transition-transform ${listing.isActive ? "translate-x-5" : "translate-x-0"}`} />
                                                </button>
                                            </td>
                                            <td className="px-4 py-4">
                                                <button title="Edit listing" onClick={() => setEditingListing(listing)}
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

            {editingListing !== null && (
                <ListingFormModal
                    listing={editingListing === "new" ? null : editingListing}
                    onClose={() => setEditingListing(null)}
                    onSuccess={fetchListings}
                />
            )}
        </>
    );
}

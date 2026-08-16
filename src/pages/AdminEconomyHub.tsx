import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Coins, Store, Dices, Sparkles, Plus, Pencil, X, Save, Trash2, Loader2,
  Check, Minus, AlertTriangle, Gem, Package, Star, Crown, Inbox, Infinity as InfinityIcon, Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAlert } from "../context/AlertContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import PageHeader from "../components/common/PageHeader";
import { adminItemApi } from "../api/adminItemApi";
import { adminShopListingApi } from "../api/adminShopListingApi";
import { adminLootTableApi } from "../api/adminLootTableApi";
import SkyCard from "../components/ui/card/SkyCard";
import SkyButton from "../components/ui/button/SkyButton";
import { FilterDropdown } from "../components/common/FilterDropdown";
import type { FilterField } from "../hooks/useTableFilters";
import type {
  ItemDefinitionDto, CreateItemPayload,
  ShopListingDto, CreateShopListingPayload,
  ShopPurchaseRowDto,
  LootTableDto, AddLootTableEntryPayload,
} from "../types/adminEconomy.types";

const ITEM_TYPES = ["SKIN", "SCENE", "BADGE", "TITLE", "FRAME", "EMOTE", "CONSUMABLE"];
const RARITIES = ["COMMON", "RARE", "EPIC", "LEGENDARY"];
const CURRENCIES = ["GOLD", "GEMS", "MGOLD"];
const REWARD_KINDS = ["ITEM", "GOLD", "GEMS", "MGOLD"];

const eyebrow = "text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3";

const inputCls = [
  "w-full px-3.5 py-2.5 rounded-sky-chip bg-white/70 ring-1 ring-white/80",
  "text-sky-ink text-sm font-medium transition-shadow",
  "focus:outline-none focus:ring-2 focus:ring-sky-deep/45",
  "placeholder:text-sky-ink-3",
].join(" ");

const errMsg = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const Spinner = ({ size = 16 }: { size?: number }) => <Loader2 className="animate-spin" width={size} height={size} />;
const Label = ({ children }: { children: React.ReactNode }) => (
  <p className={`${eyebrow} mb-1.5`}>{children}</p>
);

// Every form on this hub rejects input the same way, so the banner is one
// component: rose rail + glyph, matching the rest of the console.
const ErrorNote = ({ children }: { children: React.ReactNode }) => (
  <div className="relative flex items-start gap-2.5 overflow-hidden rounded-sky-chip bg-sky-rose/12 ring-1 ring-sky-rose/25 pl-4 pr-3 py-2.5">
    <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-rose" />
    <AlertTriangle className="w-4 h-4 shrink-0 mt-px text-sky-rose-deep" />
    <p className="text-xs font-semibold text-sky-rose-deep">{children}</p>
  </div>
);

// Status pill shared by every tab. teal marks the one state that is genuinely
// live; "off" takes neutral rather than rose — an admin switching a listing off
// is housekeeping, not a failure. Glyph + word carry it without colour.
const StatusPill = ({ active }: { active: boolean }) => (
  <span className={`sky-badge ${active ? "sky-badge-success" : "sky-badge-neutral"} text-[10px]`}>
    {active ? <Check className="w-3 h-3 shrink-0" /> : <Minus className="w-3 h-3 shrink-0" />}
    {active ? "Active" : "Off"}
  </span>
);

// Rarity is a value ramp, not a severity ramp: neutral → cool → epic violet →
// peach at the top. Nothing here is a warning, so the peach reads as "best".
const RARITY_CFG: Record<string, { cls: string; Icon: LucideIcon }> = {
  COMMON:    { cls: "sky-badge-neutral", Icon: Package },
  RARE:      { cls: "sky-badge-info",    Icon: Star },
  EPIC:      { cls: "sky-badge-epic",    Icon: Sparkles },
  LEGENDARY: { cls: "sky-badge-pending", Icon: Crown },
};
const RarityBadge = ({ rarity }: { rarity: string }) => {
  const c = RARITY_CFG[rarity] ?? RARITY_CFG.COMMON;
  return <span className={`sky-badge ${c.cls} text-[10px]`}><c.Icon className="w-3 h-3 shrink-0" /> {rarity}</span>;
};

// Currency is money, so it takes the reward hues — gems are the premium one, so
// they get violet; both golds share peach with a distinct glyph.
const CURRENCY_CFG: Record<string, { cls: string; Icon: LucideIcon }> = {
  GOLD:  { cls: "text-sky-peach-deep",   Icon: Coins },
  MGOLD: { cls: "text-sky-peach-deep",   Icon: Coins },
  GEMS:  { cls: "text-sky-violet-deep",  Icon: Gem },
};
// Price reads as one unit: numeral in the display face, currency as a quiet suffix.
const PriceTag = ({ amount, currency }: { amount: number; currency: string }) => {
  const c = CURRENCY_CFG[currency] ?? { cls: "text-sky-ink-2", Icon: Coins };
  return (
    <span className={`inline-flex items-baseline gap-1.5 ${c.cls}`}>
      <c.Icon className="w-3.5 h-3.5 shrink-0 self-center" />
      <span className="font-display text-sm font-semibold tabular-nums">{amount.toLocaleString()}</span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] opacity-70">{currency}</span>
    </span>
  );
};

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return createPortal(
    <div className="fixed inset-0 z-99999 w-screen h-screen flex items-center justify-center bg-sky-abyss/45 backdrop-blur-md p-4">
      <SkyCard variant="admin" className={`modal-content sky-in relative p-0 overflow-hidden w-full ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[92vh] flex flex-col`}>
        {/* Peach rail — every dialog on this hub authors something that costs or
            pays out currency, which is the reward accent, not an operational one. */}
        <span className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-sky-peach to-sky-peach-deep z-10" />
        <div className="relative flex items-center justify-between gap-3 px-6 py-4 border-b border-white/70 bg-white/45 shrink-0">
          <h2 className="font-display text-base font-semibold text-sky-ink">{title}</h2>
          <SkyButton type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close"><X className="w-4 h-4" /></SkyButton>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </SkyCard>
    </div>,
    document.body
  );
}

// ═══════════════════════ TAB A — ITEM CATALOG ═══════════════════════════════
function ItemForm({ editing, onSave, onClose }: { editing: ItemDefinitionDto | null; onSave: (p: CreateItemPayload) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState<CreateItemPayload>({
    code: editing?.code ?? "", name: editing?.name ?? "", description: editing?.description ?? "",
    iconUrl: editing?.iconUrl ?? "", itemType: editing?.itemType ?? "SKIN", rarity: editing?.rarity ?? "COMMON",
    categoryCode: editing?.categoryCode ?? "", isMentorExclusive: editing?.isMentorExclusive ?? false, isStackable: editing?.isStackable ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) { setErr("Code and name are required."); return; }
    setSaving(true); setErr("");
    try { await onSave(form); onClose(); }
    catch (ex) { setErr(errMsg(ex) ?? "Save failed."); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {err && <ErrorNote>{err}</ErrorNote>}
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Code *</Label><input value={form.code} disabled={!!editing} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className={inputCls} placeholder="SKIN_NINJA" /></div>
        <div><Label>Icon (emoji/URL)</Label><input value={form.iconUrl} onChange={e => setForm(f => ({ ...f, iconUrl: e.target.value }))} className={inputCls} placeholder="🥷" /></div>
      </div>
      <div><Label>Name *</Label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} /></div>
      <div><Label>Description</Label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className={`${inputCls} resize-none`} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Type</Label>
          <select value={form.itemType} disabled={!!editing} onChange={e => setForm(f => ({ ...f, itemType: e.target.value }))} className={inputCls}>
            {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div><Label>Rarity</Label>
          <select value={form.rarity} onChange={e => setForm(f => ({ ...f, rarity: e.target.value }))} className={inputCls}>
            {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div><Label>Category Code (optional)</Label><input value={form.categoryCode ?? ""} onChange={e => setForm(f => ({ ...f, categoryCode: e.target.value }))} className={inputCls} /></div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-sky-chip bg-white/42 ring-1 ring-white/70 px-4 py-3">
        <label className="flex items-center gap-2 text-sm font-medium text-sky-ink-2 cursor-pointer"><input type="checkbox" checked={form.isMentorExclusive} onChange={e => setForm(f => ({ ...f, isMentorExclusive: e.target.checked }))} className="w-4 h-4 accent-sky-deep" /> Mentor exclusive</label>
        <label className="flex items-center gap-2 text-sm font-medium text-sky-ink-2 cursor-pointer"><input type="checkbox" checked={form.isStackable} onChange={e => setForm(f => ({ ...f, isStackable: e.target.checked }))} className="w-4 h-4 accent-sky-deep" /> Stackable</label>
      </div>
      <div className="flex gap-3 pt-3 border-t border-white/70">
        <SkyButton type="button" variant="secondary" onClick={onClose} disabled={saving} className="flex-1">Cancel</SkyButton>
        <SkyButton type="submit" variant="primary" disabled={saving} className="flex-1">
          {saving ? <><Spinner /> Saving…</> : <><Save className="w-3.5 h-3.5" /> {editing ? "Update" : "Create"}</>}
        </SkyButton>
      </div>
    </form>
  );
}

function ItemCatalogTab({ onAlert }: { onAlert: (a: { type: "success" | "error"; message: string }) => void }) {
  const [items, setItems] = useState<ItemDefinitionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [modal, setModal] = useState<{ editing: ItemDefinitionDto | null } | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminItemApi.getItems(typeFilter || undefined);
      if (res.success) setItems(res.data ?? []);
    } finally { setLoading(false); }
  }, [typeFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async (payload: CreateItemPayload) => {
    if (modal?.editing) {
      const { code: _c, itemType: _t, ...updatePayload } = payload;
      await adminItemApi.updateItem(modal.editing.itemDefinitionId, updatePayload);
      onAlert({ type: "success", message: `"${payload.name}" updated.` });
    } else {
      await adminItemApi.createItem(payload);
      onAlert({ type: "success", message: `"${payload.name}" created.` });
    }
    fetch();
  };

  const toggleActive = async (item: ItemDefinitionDto) => {
    try {
      await adminItemApi.setActive(item.itemDefinitionId, !item.isActive);
      fetch();
    } catch (ex) { onAlert({ type: "error", message: errMsg(ex) ?? "Toggle failed." }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-sky-chip bg-white/42 ring-1 ring-white/70 p-2.5">
        <FilterDropdown<{ type: string }>
          fields={[{
            key: "type",
            label: "Type",
            type: "select",
            options: ITEM_TYPES.map(t => ({ label: t, value: t })),
          } satisfies FilterField]}
          filters={{ type: typeFilter }}
          onFilterChange={(_, value) => setTypeFilter(value)}
          onClear={() => setTypeFilter("")}
          hasActiveFilters={typeFilter !== ""}
          align="left"
        />
        {!loading && (
          <span className="inline-flex items-baseline gap-1">
            <span className="font-display text-sm font-semibold text-sky-ink tabular-nums">{items.length}</span>
            <span className={eyebrow}>items</span>
          </span>
        )}
        <SkyButton type="button" variant="primary" size="sm" onClick={() => setModal({ editing: null })} className="ml-auto"><Plus className="w-3.5 h-3.5" /> New Item</SkyButton>
      </div>
      {loading ? <div className="flex justify-center py-10 text-sky-ink-3"><Spinner size={24} /></div> : (
        <SkyCard variant="admin" className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="sky-table-head">
              {["Icon", "Code", "Name", "Type", "Rarity", "Status", ""].map(h => <th key={h} className="px-3 py-2.5 text-left">{h}</th>)}
            </tr></thead>
            <tbody className="sky-stagger">
              {items.map(item => (
                <tr key={item.itemDefinitionId} className="sky-table-row group">
                  <td className="px-3 py-2">
                    <span className="grid place-items-center w-9 h-9 rounded-sky-chip bg-white/60 ring-1 ring-white/80 text-base shrink-0">
                      {item.iconUrl || <Package className="w-4 h-4 text-sky-ink-3" />}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs font-semibold tracking-[0.06em] text-sky-ink-2">{item.code}</td>
                  <td className="px-3 py-2 font-display text-sm font-semibold text-sky-ink">{item.name}</td>
                  <td className="px-3 py-2 text-xs font-medium text-sky-ink-2">{item.itemType}</td>
                  <td className="px-3 py-2"><RarityBadge rarity={item.rarity} /></td>
                  <td className="px-3 py-2"><StatusPill active={item.isActive} /></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1.5 opacity-45 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <SkyButton type="button" variant="secondary" size="icon" onClick={() => setModal({ editing: item })} aria-label={`Edit ${item.name}`}><Pencil className="w-3.5 h-3.5" /></SkyButton>
                      <SkyButton type="button" variant="secondary" size="sm" className="min-w-24" onClick={() => toggleActive(item)}>{item.isActive ? "Deactivate" : "Activate"}</SkyButton>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="py-14 text-center">
                  <span className="grid place-items-center w-14 h-14 mx-auto mb-3 rounded-full bg-sky-deep/8 text-sky-deep"><Inbox className="w-6 h-6" /></span>
                  <p className="font-display text-base font-semibold text-sky-ink">No items yet</p>
                  <p className="text-xs font-medium text-sky-ink-3 mt-1">Author an item before it can be sold, dropped, or pulled.</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </SkyCard>
      )}
      {modal && <Modal title={modal.editing ? "Edit Item" : "New Item"} onClose={() => setModal(null)}><ItemForm editing={modal.editing} onSave={handleSave} onClose={() => setModal(null)} /></Modal>}
    </div>
  );
}

// ═══════════════════════ TAB B — SHOP LISTINGS ═══════════════════════════════
function ShopListingForm({ editing, items, onSave, onClose }: {
  editing: ShopListingDto | null; items: ItemDefinitionDto[];
  onSave: (p: CreateShopListingPayload) => Promise<void>; onClose: () => void;
}) {
  const [form, setForm] = useState<CreateShopListingPayload>({
    itemDefinitionId: editing?.itemDefinitionId ?? items[0]?.itemDefinitionId ?? 0,
    shopType: editing?.shopType ?? "GENERAL", currency: editing?.currency ?? "GOLD",
    price: editing?.price ?? 100, stockLimit: editing?.stockLimit ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr("");
    try { await onSave(form); onClose(); }
    catch (ex) { setErr(errMsg(ex) ?? "Save failed."); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {err && <ErrorNote>{err}</ErrorNote>}
      <div>
        <Label>Item *</Label>
        <select disabled={!!editing} value={form.itemDefinitionId} onChange={e => setForm(f => ({ ...f, itemDefinitionId: Number(e.target.value) }))} className={inputCls}>
          {items.map(i => <option key={i.itemDefinitionId} value={i.itemDefinitionId}>{i.name} ({i.code})</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Shop Type</Label><input value={form.shopType} onChange={e => setForm(f => ({ ...f, shopType: e.target.value }))} className={inputCls} placeholder="GENERAL" /></div>
        <div><Label>Currency</Label>
          <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className={inputCls}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Price</Label><input type="number" min={0} value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} className={inputCls} /></div>
        <div><Label>Stock Limit (blank = ∞)</Label><input type="number" min={0} value={form.stockLimit ?? ""} onChange={e => setForm(f => ({ ...f, stockLimit: e.target.value ? Number(e.target.value) : null }))} className={inputCls} /></div>
      </div>
      <div className="flex gap-3 pt-3 border-t border-white/70">
        <SkyButton type="button" variant="secondary" onClick={onClose} disabled={saving} className="flex-1">Cancel</SkyButton>
        <SkyButton type="submit" variant="primary" disabled={saving} className="flex-1">
          {saving ? <><Spinner /> Saving…</> : <><Save className="w-3.5 h-3.5" /> {editing ? "Update" : "Create"}</>}
        </SkyButton>
      </div>
    </form>
  );
}

// Read-only ledger of who has bought this listing — no actions here, so it
// skips the peach reward rail every other modal on this hub carries.
function PurchaseHistoryModal({ listing, onClose }: { listing: ShopListingDto; onClose: () => void }) {
  const [rows, setRows] = useState<ShopPurchaseRowDto[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminShopListingApi.getPurchases(listing.shopListingId).then(res => {
      if (!cancelled) setRows(res.success ? res.data ?? [] : []);
    });
    return () => { cancelled = true; };
  }, [listing.shopListingId]);

  return (
    <Modal title={`Buyers — ${listing.itemName}`} onClose={onClose} wide>
      {rows === null ? (
        <div className="flex justify-center py-10 text-sky-ink-3"><Spinner size={24} /></div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="grid place-items-center w-12 h-12 rounded-full bg-sky-deep/8 text-sky-deep"><Users className="w-5 h-5" /></span>
          <p className="font-display text-sm font-semibold text-sky-ink">No purchases yet</p>
          <p className="text-xs font-medium text-sky-ink-3">Nobody has bought this listing so far.</p>
        </div>
      ) : (
        <div className="rounded-sky-chip ring-1 ring-white/70 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="sky-table-head">
              {["Player", "Email", "Price Paid", "Purchased At"].map(h => <th key={h} className="px-3 py-2.5 text-left">{h}</th>)}
            </tr></thead>
            <tbody className="sky-stagger">
              {rows.map(r => (
                <tr key={r.shopPurchaseId} className="sky-table-row">
                  <td className="px-3 py-2 font-display text-sm font-semibold text-sky-ink">{r.username}</td>
                  <td className="px-3 py-2 text-xs font-medium text-sky-ink-2">{r.email}</td>
                  <td className="px-3 py-2"><PriceTag amount={r.priceSnapshot} currency={r.currency} /></td>
                  <td className="px-3 py-2 text-xs font-medium text-sky-ink-2 tabular-nums">{new Date(r.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

function ShopListingsTab({ onAlert }: { onAlert: (a: { type: "success" | "error"; message: string }) => void }) {
  const [listings, setListings] = useState<ShopListingDto[]>([]);
  const [items, setItems] = useState<ItemDefinitionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ editing: ShopListingDto | null } | null>(null);
  const [buyersModal, setBuyersModal] = useState<ShopListingDto | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [lRes, iRes] = await Promise.all([adminShopListingApi.getListings(), adminItemApi.getItems()]);
      if (lRes.success) setListings(lRes.data ?? []);
      if (iRes.success) setItems((iRes.data ?? []).filter(i => i.isActive));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async (payload: CreateShopListingPayload) => {
    if (modal?.editing) {
      // shopType/currency/item are immutable after creation — BE's update command only
      // accepts price/stock/rotation window (UpdateShopListingBody).
      const { price, stockLimit, availableFrom, availableTo } = payload;
      await adminShopListingApi.updateListing(modal.editing.shopListingId, { price, stockLimit, availableFrom, availableTo });
      onAlert({ type: "success", message: "Listing updated." });
    } else {
      await adminShopListingApi.createListing(payload);
      onAlert({ type: "success", message: "Listing created." });
    }
    fetch();
  };

  const toggleActive = async (l: ShopListingDto) => {
    try { await adminShopListingApi.setActive(l.shopListingId, !l.isActive); fetch(); }
    catch (ex) { onAlert({ type: "error", message: errMsg(ex) ?? "Toggle failed." }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <SkyButton type="button" variant="primary" size="sm" onClick={() => setModal({ editing: null })} disabled={items.length === 0}><Plus className="w-3.5 h-3.5" /> New Listing</SkyButton>
      </div>
      {loading ? <div className="flex justify-center py-10 text-sky-ink-3"><Spinner size={24} /></div> : (
        <SkyCard variant="admin" className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="sky-table-head">
              {["Item", "Shop", "Price", "Stock", "Status", ""].map(h => <th key={h} className="px-3 py-2.5 text-left">{h}</th>)}
            </tr></thead>
            <tbody className="sky-stagger">
              {listings.map(l => (
                <tr key={l.shopListingId} className="sky-table-row group">
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-2">
                      <span className="grid place-items-center w-8 h-8 rounded-sky-chip bg-white/60 ring-1 ring-white/80 text-sm shrink-0">
                        {l.itemIconUrl || <Package className="w-3.5 h-3.5 text-sky-ink-3" />}
                      </span>
                      <span className="font-display text-sm font-semibold text-sky-ink">{l.itemName}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs font-medium text-sky-ink-2">{l.shopType}</td>
                  <td className="px-3 py-2"><PriceTag amount={l.price} currency={l.currency} /></td>
                  <td className="px-3 py-2 text-xs text-sky-ink-2">
                    {l.stockLimit != null ? (
                      <span className="font-semibold tabular-nums">{l.stockSold}<span className="font-medium text-sky-ink-3"> / {l.stockLimit}</span></span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium text-sky-ink-3" title="Unlimited stock"><InfinityIcon className="w-3.5 h-3.5" /> unlimited</span>
                    )}
                  </td>
                  <td className="px-3 py-2"><StatusPill active={l.isActive} /></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1.5 opacity-45 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <SkyButton type="button" variant="secondary" size="icon" onClick={() => setModal({ editing: l })} aria-label={`Edit listing for ${l.itemName}`}><Pencil className="w-3.5 h-3.5" /></SkyButton>
                      <SkyButton type="button" variant="secondary" size="icon" onClick={() => setBuyersModal(l)} aria-label={`View buyers of ${l.itemName}`}><Users className="w-3.5 h-3.5" /></SkyButton>
                      <SkyButton type="button" variant="secondary" size="sm" className="min-w-24" onClick={() => toggleActive(l)}>{l.isActive ? "Deactivate" : "Activate"}</SkyButton>
                    </div>
                  </td>
                </tr>
              ))}
              {listings.length === 0 && (
                <tr><td colSpan={6} className="py-14 text-center">
                  <span className="grid place-items-center w-14 h-14 mx-auto mb-3 rounded-full bg-sky-deep/8 text-sky-deep"><Store className="w-6 h-6" /></span>
                  <p className="font-display text-base font-semibold text-sky-ink">Nothing on sale</p>
                  <p className="text-xs font-medium text-sky-ink-3 mt-1">List an active item to put it in front of players.</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </SkyCard>
      )}
      {modal && <Modal title={modal.editing ? "Edit Listing" : "New Listing"} onClose={() => setModal(null)}><ShopListingForm editing={modal.editing} items={items} onSave={handleSave} onClose={() => setModal(null)} /></Modal>}
      {buyersModal && <PurchaseHistoryModal listing={buyersModal} onClose={() => setBuyersModal(null)} />}
    </div>
  );
}

// ═══════════════════════ TAB C — LOOT TABLES ═════════════════════════════════
function LootTablesTab({ items, onAlert }: { items: ItemDefinitionDto[]; onAlert: (a: { type: "success" | "error"; message: string }) => void }) {
  const [tables, setTables] = useState<LootTableDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [entryForm, setEntryForm] = useState<{ tableId: number } | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminLootTableApi.getLootTables();
      if (res.success) setTables(res.data ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const createTable = async () => {
    if (!newCode.trim()) return;
    setCreating(true);
    try {
      await adminLootTableApi.createLootTable(newCode.trim().toUpperCase());
      onAlert({ type: "success", message: `Loot table "${newCode}" created.` });
      setNewCode("");
      fetch();
    } catch (ex) { onAlert({ type: "error", message: errMsg(ex) ?? "Create failed." }); }
    finally { setCreating(false); }
  };

  const toggleActive = async (t: LootTableDto) => {
    try { await adminLootTableApi.setActive(t.lootTableId, !t.isActive); fetch(); }
    catch (ex) { onAlert({ type: "error", message: errMsg(ex) ?? "Toggle failed." }); }
  };

  const deleteEntry = async (tableId: number, entryId: number) => {
    try { await adminLootTableApi.deleteEntry(tableId, entryId); fetch(); }
    catch (ex) { onAlert({ type: "error", message: errMsg(ex) ?? "Delete failed." }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 rounded-sky-chip bg-white/42 ring-1 ring-white/70 p-2.5">
        <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="NEW_TABLE_CODE" aria-label="New loot table code" className={`${inputCls} w-auto flex-1 font-mono tracking-[0.06em]`} />
        <SkyButton type="button" variant="primary" size="sm" onClick={createTable} disabled={creating || !newCode.trim()}>
          {creating ? <Spinner /> : <Plus className="w-3.5 h-3.5" />} Create Table
        </SkyButton>
      </div>
      {loading ? <div className="flex justify-center py-10 text-sky-ink-3"><Spinner size={24} /></div> : (
        <div className="space-y-3">
          {tables.map(t => (
            <SkyCard key={t.lootTableId} variant="admin">
              <div className="flex items-center justify-between mb-3">
                <div className="space-y-1.5">
                  <p className="font-mono text-sm font-semibold tracking-[0.06em] text-sky-ink">{t.code}</p>
                  <StatusPill active={t.isActive} />
                </div>
                <div className="flex gap-2">
                  <SkyButton type="button" variant="secondary" size="sm" onClick={() => setEntryForm({ tableId: t.lootTableId })}><Plus className="w-3 h-3" /> Add Entry</SkyButton>
                  <SkyButton type="button" variant="secondary" size="sm" onClick={() => toggleActive(t)}>{t.isActive ? "Deactivate" : "Activate"}</SkyButton>
                </div>
              </div>
              {t.entries.length === 0 ? (
                <div className="flex items-center gap-2 rounded-sky-chip border border-dashed border-sky-ink/15 px-3 py-2.5 text-xs font-medium text-sky-ink-3">
                  <Dices className="w-3.5 h-3.5 shrink-0" /> No entries yet — this table will never drop anything.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {t.entries.map(e => (
                    <div key={e.lootTableEntryId} className="group flex items-center gap-2.5 px-3 py-2 rounded-sky-chip bg-white/55 ring-1 ring-white/70 text-xs">
                      <span className="sky-badge sky-badge-neutral text-[10px]">{e.rewardKind}</span>
                      {e.itemDefinitionId != null && <span className="font-mono text-[10px] text-sky-ink-3">#{e.itemDefinitionId}</span>}
                      <span className="font-medium text-sky-ink-2 tabular-nums">{e.amountMin}–{e.amountMax}</span>
                      <span className="ml-auto inline-flex items-baseline gap-1">
                        <span className={eyebrow}>weight</span>
                        <span className="font-display text-sm font-semibold text-sky-ink tabular-nums">{e.weight}</span>
                      </span>
                      <SkyButton type="button" variant="ghost" size="icon" onClick={() => deleteEntry(t.lootTableId, e.lootTableEntryId)} aria-label="Delete entry" className="w-7 h-7 shrink-0 text-sky-rose-deep opacity-40 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-sky-rose/12"><Trash2 className="w-3.5 h-3.5" /></SkyButton>
                    </div>
                  ))}
                </div>
              )}
            </SkyCard>
          ))}
          {tables.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <span className="grid place-items-center w-14 h-14 rounded-full bg-sky-deep/8 text-sky-deep"><Dices className="w-6 h-6" /></span>
              <p className="font-display text-base font-semibold text-sky-ink">No loot tables yet</p>
              <p className="text-xs font-medium text-sky-ink-3">Create one above, then add the rewards it can roll.</p>
            </div>
          )}
        </div>
      )}
      {entryForm && (
        <Modal title="Add Loot Table Entry" onClose={() => setEntryForm(null)}>
          <LootEntryForm items={items} onSave={async (payload) => { await adminLootTableApi.addEntry(entryForm.tableId, payload); onAlert({ type: "success", message: "Entry added." }); fetch(); }} onClose={() => setEntryForm(null)} />
        </Modal>
      )}
    </div>
  );
}

function LootEntryForm({ items, onSave, onClose }: { items: ItemDefinitionDto[]; onSave: (p: AddLootTableEntryPayload) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState<AddLootTableEntryPayload>({ rewardKind: "ITEM", itemDefinitionId: items[0]?.itemDefinitionId ?? null, amountMin: 1, amountMax: 1, weight: 10 });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr("");
    try { await onSave(form); onClose(); }
    catch (ex) { setErr(errMsg(ex) ?? "Save failed."); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {err && <ErrorNote>{err}</ErrorNote>}
      <div><Label>Reward Kind</Label>
        <select value={form.rewardKind} onChange={e => setForm(f => ({ ...f, rewardKind: e.target.value, itemDefinitionId: e.target.value === "ITEM" ? (items[0]?.itemDefinitionId ?? null) : null }))} className={inputCls}>
          {REWARD_KINDS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      {form.rewardKind === "ITEM" && (
        <div><Label>Item</Label>
          <select value={form.itemDefinitionId ?? ""} onChange={e => setForm(f => ({ ...f, itemDefinitionId: Number(e.target.value) }))} className={inputCls}>
            {items.map(i => <option key={i.itemDefinitionId} value={i.itemDefinitionId}>{i.name} ({i.code})</option>)}
          </select>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <div><Label>Amount Min</Label><input type="number" min={1} value={form.amountMin} onChange={e => setForm(f => ({ ...f, amountMin: Number(e.target.value) }))} className={inputCls} /></div>
        <div><Label>Amount Max</Label><input type="number" min={1} value={form.amountMax} onChange={e => setForm(f => ({ ...f, amountMax: Number(e.target.value) }))} className={inputCls} /></div>
        <div><Label>Weight</Label><input type="number" min={1} value={form.weight} onChange={e => setForm(f => ({ ...f, weight: Number(e.target.value) }))} className={inputCls} /></div>
      </div>
      <div className="flex gap-3 pt-3 border-t border-white/70">
        <SkyButton type="button" variant="secondary" onClick={onClose} disabled={saving} className="flex-1">Cancel</SkyButton>
        <SkyButton type="submit" variant="primary" disabled={saving} className="flex-1">
          {saving ? <><Spinner /> Saving…</> : <><Save className="w-3.5 h-3.5" /> Add Entry</>}
        </SkyButton>
      </div>
    </form>
  );
}

// ═══════════════════════ MAIN PAGE ═══════════════════════════════════════════
type TabId = "items" | "shop" | "loot";

export default function AdminEconomyHub() {
  const globalAlert = useAlert();
  const setAlert = useCallback(
    (a: { type: "success" | "error"; message: string }) => a.type === "success" ? globalAlert.success(a.message) : globalAlert.error(a.message),
    [globalAlert]
  );
  const [tab, setTab] = useState<TabId>("items");
  const [items, setItems] = useState<ItemDefinitionDto[]>([]);

  useEffect(() => {
    adminItemApi.getItems().then(res => { if (res.success) setItems(res.data ?? []); });
  }, [tab]);

  const tabs: { id: TabId; label: string; Icon: LucideIcon }[] = [
    { id: "items", label: "Item Catalog", Icon: Coins },
    { id: "shop", label: "Shop Listings", Icon: Store },
    { id: "loot", label: "Loot Tables", Icon: Dices },
  ];

  return (
    <>
      <PageMeta title="Economy Hub" description="Manage item catalog, shop listings, and loot tables." />
      <PageBreadcrumb pageTitle="Economy Hub" />

      <div className="space-y-6 p-1">
        <PageHeader
          icon={<Coins className="w-6 h-6" />}
          tone="peach"
          title="Economy Hub"
          description="Author items, shop listings, and loot tables."
        />

        {/* A recessed well with one lifted segment, rather than four tabs sitting on
            a hairline: the group reads as a single control and the selection is
            unmistakable at a glance. */}
        <div className="flex gap-1 rounded-sky-md bg-white/42 ring-1 ring-white/70 p-2 overflow-x-auto">
          {tabs.map(tt => {
            const on = tab === tt.id;
            return (
              <button
                type="button"
                key={tt.id}
                aria-pressed={on}
                onClick={() => setTab(tt.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-sky-chip text-sm whitespace-nowrap transition ${
                  on
                    ? "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white font-semibold shadow-sky-chip"
                    : "text-sky-ink-2 font-medium hover:bg-white/70 hover:text-sky-ink"
                }`}
              >
                <tt.Icon className="w-4 h-4 shrink-0" /> {tt.label}
              </button>
            );
          })}
        </div>

        <SkyCard variant="admin">
          {tab === "items" && <ItemCatalogTab onAlert={setAlert} />}
          {tab === "shop" && <ShopListingsTab onAlert={setAlert} />}
          {tab === "loot" && <LootTablesTab items={items} onAlert={setAlert} />}
        </SkyCard>
      </div>
    </>
  );
}

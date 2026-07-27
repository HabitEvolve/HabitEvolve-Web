import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Coins, Store, Dices, Sparkles, Plus, Pencil, X, Save, Trash2, Loader2,
} from "lucide-react";
import { useAlert } from "../context/AlertContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { adminItemApi } from "../api/adminItemApi";
import { adminShopListingApi } from "../api/adminShopListingApi";
import { adminLootTableApi } from "../api/adminLootTableApi";
import { adminGachaBannerApi } from "../api/adminGachaBannerApi";
import type {
  ItemDefinitionDto, CreateItemPayload,
  ShopListingDto, CreateShopListingPayload,
  LootTableDto, AddLootTableEntryPayload,
  GachaBannerDto, CreateGachaBannerPayload,
} from "../types/adminEconomy.types";

const ITEM_TYPES = ["SKIN", "SCENE", "BADGE", "TITLE", "FRAME", "EMOTE", "CONSUMABLE"];
const RARITIES = ["COMMON", "RARE", "EPIC", "LEGENDARY"];
const CURRENCIES = ["GOLD", "GEMS", "MGOLD"];
const REWARD_KINDS = ["ITEM", "GOLD", "GEMS", "MGOLD"];

const btnBase =
  "inline-flex items-center gap-2 px-4 py-2 font-black text-sm border-2 border-black rounded-full " +
  "shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 " +
  "disabled:shadow-[3px_3px_0_0_#1A1D20] transition-all";

const inputCls =
  "w-full px-3.5 py-2 border-2 border-black dark:border-gray-600 rounded-xl text-sm font-medium " +
  "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 " +
  "focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-600 " +
  "placeholder:text-gray-400 dark:placeholder:text-gray-500";

const errMsg = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const Spinner = ({ size = 16 }: { size?: number }) => <Loader2 className="animate-spin" width={size} height={size} />;
const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">{children}</p>
);

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return createPortal(
    <div className="fixed inset-0 z-99999 w-screen h-screen flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`modal-content bg-white dark:bg-[#1e2a3a] border-4 border-black rounded-3xl shadow-[8px_8px_0_0_#1A1D20] w-full ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[92vh] flex flex-col overflow-hidden`}>
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black bg-emerald-50 dark:bg-emerald-900/20 shrink-0 rounded-t-3xl">
          <h2 className="text-base font-black text-gray-900 dark:text-gray-100">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl border-2 border-black bg-white dark:bg-gray-700 hover:bg-red-50 shadow-[2px_2px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
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
      {err && <p className="text-xs font-bold text-red-600 bg-red-50 border-2 border-red-300 rounded-xl px-3 py-2">{err}</p>}
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
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300"><input type="checkbox" checked={form.isMentorExclusive} onChange={e => setForm(f => ({ ...f, isMentorExclusive: e.target.checked }))} className="w-4 h-4" /> Mentor exclusive</label>
        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300"><input type="checkbox" checked={form.isStackable} onChange={e => setForm(f => ({ ...f, isStackable: e.target.checked }))} className="w-4 h-4" /> Stackable</label>
      </div>
      <div className="flex gap-3 pt-2 border-t-2 border-gray-100 dark:border-gray-700">
        <button type="button" onClick={onClose} disabled={saving} className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>Cancel</button>
        <button type="submit" disabled={saving} className={`${btnBase} flex-1 justify-center bg-emerald-200 dark:bg-emerald-700 text-emerald-900 dark:text-white`}>
          {saving ? <><Spinner /> Saving…</> : <><Save className="w-3.5 h-3.5" /> {editing ? "Update" : "Create"}</>}
        </button>
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
      <div className="flex items-center gap-2">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={`${inputCls} w-auto`}>
          <option value="">All types</option>
          {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={() => setModal({ editing: null })} className={`${btnBase} bg-emerald-200 text-emerald-900 ml-auto`}><Plus className="w-3.5 h-3.5" /> New Item</button>
      </div>
      {loading ? <div className="flex justify-center py-10 text-gray-400"><Spinner size={24} /></div> : (
        <div className="border-2 border-black dark:border-gray-600 rounded-2xl overflow-hidden shadow-[3px_3px_0_0_#1A1D20]">
          <table className="w-full text-sm">
            <thead><tr className="border-b-2 border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800">
              {["Icon", "Code", "Name", "Type", "Rarity", "Status", ""].map(h => <th key={h} className="px-3 py-2.5 text-left text-xs font-black uppercase text-gray-500">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {items.map(item => (
                <tr key={item.itemDefinitionId} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10">
                  <td className="px-3 py-2 text-lg">{item.iconUrl}</td>
                  <td className="px-3 py-2 font-mono text-xs font-bold text-gray-600 dark:text-gray-300">{item.code}</td>
                  <td className="px-3 py-2 font-bold text-gray-900 dark:text-gray-100">{item.name}</td>
                  <td className="px-3 py-2 text-xs">{item.itemType}</td>
                  <td className="px-3 py-2 text-xs">{item.rarity}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${item.isActive ? "bg-green-100 border-green-300 text-green-700" : "bg-gray-100 border-gray-300 text-gray-500"}`}>{item.isActive ? "Active" : "Off"}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setModal({ editing: item })} className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg text-blue-500"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => toggleActive(item)} className="text-[10px] font-black px-2 py-1 rounded-full border border-gray-300 hover:bg-gray-100">{item.isActive ? "Deactivate" : "Activate"}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-gray-400">No items found.</td></tr>}
            </tbody>
          </table>
        </div>
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
      {err && <p className="text-xs font-bold text-red-600 bg-red-50 border-2 border-red-300 rounded-xl px-3 py-2">{err}</p>}
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
      <div className="flex gap-3 pt-2 border-t-2 border-gray-100 dark:border-gray-700">
        <button type="button" onClick={onClose} disabled={saving} className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>Cancel</button>
        <button type="submit" disabled={saving} className={`${btnBase} flex-1 justify-center bg-emerald-200 dark:bg-emerald-700 text-emerald-900 dark:text-white`}>
          {saving ? <><Spinner /> Saving…</> : <><Save className="w-3.5 h-3.5" /> {editing ? "Update" : "Create"}</>}
        </button>
      </div>
    </form>
  );
}

function ShopListingsTab({ onAlert }: { onAlert: (a: { type: "success" | "error"; message: string }) => void }) {
  const [listings, setListings] = useState<ShopListingDto[]>([]);
  const [items, setItems] = useState<ItemDefinitionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ editing: ShopListingDto | null } | null>(null);

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
        <button onClick={() => setModal({ editing: null })} disabled={items.length === 0} className={`${btnBase} bg-emerald-200 text-emerald-900`}><Plus className="w-3.5 h-3.5" /> New Listing</button>
      </div>
      {loading ? <div className="flex justify-center py-10 text-gray-400"><Spinner size={24} /></div> : (
        <div className="border-2 border-black dark:border-gray-600 rounded-2xl overflow-hidden shadow-[3px_3px_0_0_#1A1D20]">
          <table className="w-full text-sm">
            <thead><tr className="border-b-2 border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800">
              {["Item", "Shop", "Price", "Stock", "Status", ""].map(h => <th key={h} className="px-3 py-2.5 text-left text-xs font-black uppercase text-gray-500">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {listings.map(l => (
                <tr key={l.shopListingId} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10">
                  <td className="px-3 py-2"><span className="mr-1">{l.itemIconUrl}</span><span className="font-bold text-gray-900 dark:text-gray-100">{l.itemName}</span></td>
                  <td className="px-3 py-2 text-xs">{l.shopType}</td>
                  <td className="px-3 py-2 text-xs font-bold">{l.price} {l.currency}</td>
                  <td className="px-3 py-2 text-xs">{l.stockLimit != null ? `${l.stockSold}/${l.stockLimit}` : "∞"}</td>
                  <td className="px-3 py-2"><span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${l.isActive ? "bg-green-100 border-green-300 text-green-700" : "bg-gray-100 border-gray-300 text-gray-500"}`}>{l.isActive ? "Active" : "Off"}</span></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setModal({ editing: l })} className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg text-blue-500"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => toggleActive(l)} className="text-[10px] font-black px-2 py-1 rounded-full border border-gray-300 hover:bg-gray-100">{l.isActive ? "Deactivate" : "Activate"}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {listings.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-400">No shop listings yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {modal && <Modal title={modal.editing ? "Edit Listing" : "New Listing"} onClose={() => setModal(null)}><ShopListingForm editing={modal.editing} items={items} onSave={handleSave} onClose={() => setModal(null)} /></Modal>}
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
      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 border-2 border-black rounded-2xl">
        <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="NEW_TABLE_CODE" className={`${inputCls} w-auto flex-1`} />
        <button onClick={createTable} disabled={creating || !newCode.trim()} className={`${btnBase} bg-emerald-200 text-emerald-900`}>
          {creating ? <Spinner /> : <Plus className="w-3.5 h-3.5" />} Create Table
        </button>
      </div>
      {loading ? <div className="flex justify-center py-10 text-gray-400"><Spinner size={24} /></div> : (
        <div className="space-y-3">
          {tables.map(t => (
            <div key={t.lootTableId} className="border-2 border-black dark:border-gray-600 rounded-2xl p-4 shadow-[3px_3px_0_0_#1A1D20]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-black text-gray-900 dark:text-gray-100 font-mono">{t.code}</p>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${t.isActive ? "bg-green-100 border-green-300 text-green-700" : "bg-gray-100 border-gray-300 text-gray-500"}`}>{t.isActive ? "Active" : "Off"}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEntryForm({ tableId: t.lootTableId })} className={`${btnBase} bg-blue-100 text-blue-900 py-1 px-3 text-xs`}><Plus className="w-3 h-3" /> Add Entry</button>
                  <button onClick={() => toggleActive(t)} className="text-[10px] font-black px-3 py-1 rounded-full border border-gray-300 hover:bg-gray-100">{t.isActive ? "Deactivate" : "Activate"}</button>
                </div>
              </div>
              {t.entries.length === 0 ? <p className="text-xs text-gray-400 italic">No entries yet.</p> : (
                <div className="space-y-1.5">
                  {t.entries.map(e => (
                    <div key={e.lootTableEntryId} className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs">
                      <span className="font-black text-gray-700 dark:text-gray-300">{e.rewardKind}</span>
                      {e.itemDefinitionId != null && <span className="text-gray-500">itemId:{e.itemDefinitionId}</span>}
                      <span className="text-gray-500">amount {e.amountMin}–{e.amountMax}</span>
                      <span className="text-gray-500">weight {e.weight}</span>
                      <button onClick={() => deleteEntry(t.lootTableId, e.lootTableEntryId)} className="ml-auto p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {tables.length === 0 && <p className="text-center py-10 text-gray-400">No loot tables yet.</p>}
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
      {err && <p className="text-xs font-bold text-red-600 bg-red-50 border-2 border-red-300 rounded-xl px-3 py-2">{err}</p>}
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
      <div className="flex gap-3 pt-2 border-t-2 border-gray-100 dark:border-gray-700">
        <button type="button" onClick={onClose} disabled={saving} className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>Cancel</button>
        <button type="submit" disabled={saving} className={`${btnBase} flex-1 justify-center bg-emerald-200 dark:bg-emerald-700 text-emerald-900 dark:text-white`}>
          {saving ? <><Spinner /> Saving…</> : <><Save className="w-3.5 h-3.5" /> Add Entry</>}
        </button>
      </div>
    </form>
  );
}

// ═══════════════════════ TAB D — GACHA BANNERS ═══════════════════════════════
function GachaBannerForm({ editing, lootTables, onSave, onClose }: {
  editing: GachaBannerDto | null; lootTables: LootTableDto[];
  onSave: (p: CreateGachaBannerPayload) => Promise<void>; onClose: () => void;
}) {
  const [form, setForm] = useState<CreateGachaBannerPayload>({
    code: editing?.code ?? "", name: editing?.name ?? "",
    lootTableId: editing?.lootTableId ?? lootTables[0]?.lootTableId ?? 0,
    pullCostGems: editing?.pullCostGems ?? 100,
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
      {err && <p className="text-xs font-bold text-red-600 bg-red-50 border-2 border-red-300 rounded-xl px-3 py-2">{err}</p>}
      <div><Label>Code * {editing && "(immutable)"}</Label><input value={form.code} disabled={!!editing} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className={inputCls} placeholder="GACHA_STANDARD" /></div>
      <div><Label>Name *</Label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Standard Banner" /></div>
      <div><Label>Loot Table</Label>
        <select value={form.lootTableId} onChange={e => setForm(f => ({ ...f, lootTableId: Number(e.target.value) }))} className={inputCls}>
          {lootTables.map(t => <option key={t.lootTableId} value={t.lootTableId}>{t.code}</option>)}
        </select>
      </div>
      <div><Label>Pull Cost (Gems)</Label><input type="number" min={1} value={form.pullCostGems} onChange={e => setForm(f => ({ ...f, pullCostGems: Number(e.target.value) }))} className={inputCls} /></div>
      <div className="flex gap-3 pt-2 border-t-2 border-gray-100 dark:border-gray-700">
        <button type="button" onClick={onClose} disabled={saving} className={`${btnBase} flex-1 justify-center bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200`}>Cancel</button>
        <button type="submit" disabled={saving} className={`${btnBase} flex-1 justify-center bg-emerald-200 dark:bg-emerald-700 text-emerald-900 dark:text-white`}>
          {saving ? <><Spinner /> Saving…</> : <><Save className="w-3.5 h-3.5" /> {editing ? "Update" : "Create"}</>}
        </button>
      </div>
    </form>
  );
}

function GachaBannersTab({ onAlert }: { onAlert: (a: { type: "success" | "error"; message: string }) => void }) {
  const [banners, setBanners] = useState<GachaBannerDto[]>([]);
  const [lootTables, setLootTables] = useState<LootTableDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ editing: GachaBannerDto | null } | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, tRes] = await Promise.all([adminGachaBannerApi.getBanners(), adminLootTableApi.getLootTables()]);
      if (bRes.success) setBanners(bRes.data ?? []);
      if (tRes.success) setLootTables(tRes.data ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async (payload: CreateGachaBannerPayload) => {
    if (modal?.editing) {
      const { code: _c, ...updatePayload } = payload;
      await adminGachaBannerApi.updateBanner(modal.editing.gachaBannerId, updatePayload);
      onAlert({ type: "success", message: "Banner updated." });
    } else {
      await adminGachaBannerApi.createBanner(payload);
      onAlert({ type: "success", message: "Banner created." });
    }
    fetch();
  };

  const toggleActive = async (b: GachaBannerDto) => {
    try { await adminGachaBannerApi.setActive(b.gachaBannerId, !b.isActive); fetch(); }
    catch (ex) { onAlert({ type: "error", message: errMsg(ex) ?? "Toggle failed." }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setModal({ editing: null })} disabled={lootTables.length === 0} className={`${btnBase} bg-emerald-200 text-emerald-900`}><Plus className="w-3.5 h-3.5" /> New Banner</button>
      </div>
      {loading ? <div className="flex justify-center py-10 text-gray-400"><Spinner size={24} /></div> : (
        <div className="border-2 border-black dark:border-gray-600 rounded-2xl overflow-hidden shadow-[3px_3px_0_0_#1A1D20]">
          <table className="w-full text-sm">
            <thead><tr className="border-b-2 border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800">
              {["Code", "Name", "Loot Table", "Cost (Gems)", "Status", ""].map(h => <th key={h} className="px-3 py-2.5 text-left text-xs font-black uppercase text-gray-500">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {banners.map(b => (
                <tr key={b.gachaBannerId} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10">
                  <td className="px-3 py-2 font-mono text-xs font-bold text-gray-600 dark:text-gray-300">{b.code}</td>
                  <td className="px-3 py-2 font-bold text-gray-900 dark:text-gray-100">{b.name}</td>
                  <td className="px-3 py-2 text-xs">#{b.lootTableId}</td>
                  <td className="px-3 py-2 text-xs font-bold">💎 {b.pullCostGems}</td>
                  <td className="px-3 py-2"><span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${b.isActive ? "bg-green-100 border-green-300 text-green-700" : "bg-gray-100 border-gray-300 text-gray-500"}`}>{b.isActive ? "Active" : "Off"}</span></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setModal({ editing: b })} className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg text-blue-500"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => toggleActive(b)} className="text-[10px] font-black px-2 py-1 rounded-full border border-gray-300 hover:bg-gray-100">{b.isActive ? "Deactivate" : "Activate"}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {banners.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-400">No gacha banners yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {modal && <Modal title={modal.editing ? "Edit Banner" : "New Banner"} onClose={() => setModal(null)}><GachaBannerForm editing={modal.editing} lootTables={lootTables} onSave={handleSave} onClose={() => setModal(null)} /></Modal>}
    </div>
  );
}

// ═══════════════════════ MAIN PAGE ═══════════════════════════════════════════
type TabId = "items" | "shop" | "loot" | "gacha";

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

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "items", label: "Item Catalog", icon: <Coins className="w-4 h-4" /> },
    { id: "shop", label: "Shop Listings", icon: <Store className="w-4 h-4" /> },
    { id: "loot", label: "Loot Tables", icon: <Dices className="w-4 h-4" /> },
    { id: "gacha", label: "Gacha Banners", icon: <Sparkles className="w-4 h-4" /> },
  ];

  return (
    <>
      <PageMeta title="Economy Hub" description="Manage item catalog, shop listings, loot tables, and gacha banners." />
      <PageBreadcrumb pageTitle="Economy Hub" />

      <div className="space-y-6 p-1">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-300 border-2 border-black flex items-center justify-center shadow-[3px_3px_0_0_#1A1D20] shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Economy Hub</h1>
            <p className="text-sm text-gray-500 font-medium mt-0.5">Author items, shop listings, loot tables, and gacha banners.</p>
          </div>
        </div>

        <div className="flex items-end gap-1 border-b-2 border-black/10 overflow-x-auto">
          {tabs.map(tt => (
            <button key={tt.id} onClick={() => setTab(tt.id)}
              className={`px-5 py-2.5 font-black text-sm rounded-t-2xl border-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${tab === tt.id
                ? "bg-emerald-300 border-black text-gray-900 shadow-[3px_0_0_0_#1A1D20,0_3px_0_0_#1A1D20] -mb-0.5 relative z-10"
                : "bg-white dark:bg-gray-800 border-black/20 dark:border-white/20 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
              {tt.icon} {tt.label}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-[#1e2a3a] border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] p-5">
          {tab === "items" && <ItemCatalogTab onAlert={setAlert} />}
          {tab === "shop" && <ShopListingsTab onAlert={setAlert} />}
          {tab === "loot" && <LootTablesTab items={items} onAlert={setAlert} />}
          {tab === "gacha" && <GachaBannersTab onAlert={setAlert} />}
        </div>
      </div>
    </>
  );
}

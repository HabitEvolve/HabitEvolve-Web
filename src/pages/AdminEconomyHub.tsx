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
import SkyCard from "../components/ui/card/SkyCard";
import SkyButton from "../components/ui/button/SkyButton";
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

const inputCls =
  "w-full px-3.5 py-2 rounded-sky-chip border border-sky-surf-border bg-white text-sky-ink text-sm font-medium " +
  "focus:outline-none focus:border-sky-deep focus:ring-3 focus:ring-sky-deep/20 placeholder:text-sky-ink-3";

const errMsg = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const Spinner = ({ size = 16 }: { size?: number }) => <Loader2 className="animate-spin" width={size} height={size} />;
const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-semibold text-sky-ink-2 uppercase tracking-wide mb-1">{children}</p>
);

// Flat status pill shared by every tab's table — Active/Off.
const StatusPill = ({ active }: { active: boolean }) => (
  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${active ? "bg-success-100 text-success-700" : "bg-gray-100 text-gray-500"}`}>
    {active ? "Active" : "Off"}
  </span>
);

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return createPortal(
    <div className="fixed inset-0 z-99999 w-screen h-screen flex items-center justify-center bg-sky-ink/60 backdrop-blur-sm p-4">
      <SkyCard variant="admin" className={`modal-content p-0 overflow-hidden w-full ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[92vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-sky-admin-bg-deep shrink-0">
          <h2 className="text-base font-bold text-sky-ink">{title}</h2>
          <SkyButton type="button" variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></SkyButton>
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
      {err && <p className="text-xs font-semibold text-error-600 bg-error-50 border border-error-300 rounded-sky-chip px-3 py-2">{err}</p>}
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
        <label className="flex items-center gap-2 text-sm font-semibold text-sky-ink-2"><input type="checkbox" checked={form.isMentorExclusive} onChange={e => setForm(f => ({ ...f, isMentorExclusive: e.target.checked }))} className="w-4 h-4 accent-sky-deep" /> Mentor exclusive</label>
        <label className="flex items-center gap-2 text-sm font-semibold text-sky-ink-2"><input type="checkbox" checked={form.isStackable} onChange={e => setForm(f => ({ ...f, isStackable: e.target.checked }))} className="w-4 h-4 accent-sky-deep" /> Stackable</label>
      </div>
      <div className="flex gap-3 pt-2 border-t border-gray-200">
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
      <div className="flex items-center gap-2">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={`${inputCls} w-auto`}>
          <option value="">All types</option>
          {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <SkyButton type="button" variant="primary" size="sm" onClick={() => setModal({ editing: null })} className="ml-auto"><Plus className="w-3.5 h-3.5" /> New Item</SkyButton>
      </div>
      {loading ? <div className="flex justify-center py-10 text-sky-ink-3"><Spinner size={24} /></div> : (
        <SkyCard variant="admin" className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-sky-admin-bg-deep border-b border-slate-200">
              {["Icon", "Code", "Name", "Type", "Rarity", "Status", ""].map(h => <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase text-sky-ink">{h}</th>)}
            </tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item.itemDefinitionId} className="sky-table-row">
                  <td className="px-3 py-2 text-lg">{item.iconUrl}</td>
                  <td className="px-3 py-2 font-mono text-xs font-semibold text-sky-ink-2">{item.code}</td>
                  <td className="px-3 py-2 font-semibold text-sky-ink">{item.name}</td>
                  <td className="px-3 py-2 text-xs text-sky-ink-2">{item.itemType}</td>
                  <td className="px-3 py-2 text-xs text-sky-ink-2">{item.rarity}</td>
                  <td className="px-3 py-2"><StatusPill active={item.isActive} /></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <SkyButton type="button" variant="secondary" size="icon" onClick={() => setModal({ editing: item })}><Pencil className="w-3.5 h-3.5" /></SkyButton>
                      <SkyButton type="button" variant="secondary" size="sm" onClick={() => toggleActive(item)}>{item.isActive ? "Deactivate" : "Activate"}</SkyButton>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-sky-ink-3">No items found.</td></tr>}
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
      {err && <p className="text-xs font-semibold text-error-600 bg-error-50 border border-error-300 rounded-sky-chip px-3 py-2">{err}</p>}
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
      <div className="flex gap-3 pt-2 border-t border-gray-200">
        <SkyButton type="button" variant="secondary" onClick={onClose} disabled={saving} className="flex-1">Cancel</SkyButton>
        <SkyButton type="submit" variant="primary" disabled={saving} className="flex-1">
          {saving ? <><Spinner /> Saving…</> : <><Save className="w-3.5 h-3.5" /> {editing ? "Update" : "Create"}</>}
        </SkyButton>
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
        <SkyButton type="button" variant="primary" size="sm" onClick={() => setModal({ editing: null })} disabled={items.length === 0}><Plus className="w-3.5 h-3.5" /> New Listing</SkyButton>
      </div>
      {loading ? <div className="flex justify-center py-10 text-sky-ink-3"><Spinner size={24} /></div> : (
        <SkyCard variant="admin" className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-sky-admin-bg-deep border-b border-slate-200">
              {["Item", "Shop", "Price", "Stock", "Status", ""].map(h => <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase text-sky-ink">{h}</th>)}
            </tr></thead>
            <tbody>
              {listings.map(l => (
                <tr key={l.shopListingId} className="sky-table-row">
                  <td className="px-3 py-2"><span className="mr-1">{l.itemIconUrl}</span><span className="font-semibold text-sky-ink">{l.itemName}</span></td>
                  <td className="px-3 py-2 text-xs text-sky-ink-2">{l.shopType}</td>
                  <td className="px-3 py-2 text-xs font-semibold text-sky-ink">{l.price} {l.currency}</td>
                  <td className="px-3 py-2 text-xs text-sky-ink-2">{l.stockLimit != null ? `${l.stockSold}/${l.stockLimit}` : "∞"}</td>
                  <td className="px-3 py-2"><StatusPill active={l.isActive} /></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <SkyButton type="button" variant="secondary" size="icon" onClick={() => setModal({ editing: l })}><Pencil className="w-3.5 h-3.5" /></SkyButton>
                      <SkyButton type="button" variant="secondary" size="sm" onClick={() => toggleActive(l)}>{l.isActive ? "Deactivate" : "Activate"}</SkyButton>
                    </div>
                  </td>
                </tr>
              ))}
              {listings.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-sky-ink-3">No shop listings yet.</td></tr>}
            </tbody>
          </table>
        </SkyCard>
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
      <div className="flex items-center gap-2 p-3 bg-sky-admin-bg-deep rounded-sky-chip">
        <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="NEW_TABLE_CODE" className={`${inputCls} w-auto flex-1`} />
        <SkyButton type="button" variant="primary" size="sm" onClick={createTable} disabled={creating || !newCode.trim()}>
          {creating ? <Spinner /> : <Plus className="w-3.5 h-3.5" />} Create Table
        </SkyButton>
      </div>
      {loading ? <div className="flex justify-center py-10 text-sky-ink-3"><Spinner size={24} /></div> : (
        <div className="space-y-3">
          {tables.map(t => (
            <SkyCard key={t.lootTableId} variant="admin">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-sky-ink font-mono">{t.code}</p>
                  <StatusPill active={t.isActive} />
                </div>
                <div className="flex gap-2">
                  <SkyButton type="button" variant="secondary" size="sm" onClick={() => setEntryForm({ tableId: t.lootTableId })}><Plus className="w-3 h-3" /> Add Entry</SkyButton>
                  <SkyButton type="button" variant="secondary" size="sm" onClick={() => toggleActive(t)}>{t.isActive ? "Deactivate" : "Activate"}</SkyButton>
                </div>
              </div>
              {t.entries.length === 0 ? <p className="text-xs text-sky-ink-3 italic">No entries yet.</p> : (
                <div className="space-y-1.5">
                  {t.entries.map(e => (
                    <div key={e.lootTableEntryId} className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-sky-chip text-xs">
                      <span className="font-semibold text-sky-ink-2">{e.rewardKind}</span>
                      {e.itemDefinitionId != null && <span className="text-sky-ink-3">itemId:{e.itemDefinitionId}</span>}
                      <span className="text-sky-ink-3">amount {e.amountMin}–{e.amountMax}</span>
                      <span className="text-sky-ink-3">weight {e.weight}</span>
                      <SkyButton type="button" variant="ghost" size="icon" onClick={() => deleteEntry(t.lootTableId, e.lootTableEntryId)} className="ml-auto w-6 h-6 text-error-500 hover:bg-error-50"><Trash2 className="w-3.5 h-3.5" /></SkyButton>
                    </div>
                  ))}
                </div>
              )}
            </SkyCard>
          ))}
          {tables.length === 0 && <p className="text-center py-10 text-sky-ink-3">No loot tables yet.</p>}
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
      {err && <p className="text-xs font-semibold text-error-600 bg-error-50 border border-error-300 rounded-sky-chip px-3 py-2">{err}</p>}
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
      <div className="flex gap-3 pt-2 border-t border-gray-200">
        <SkyButton type="button" variant="secondary" onClick={onClose} disabled={saving} className="flex-1">Cancel</SkyButton>
        <SkyButton type="submit" variant="primary" disabled={saving} className="flex-1">
          {saving ? <><Spinner /> Saving…</> : <><Save className="w-3.5 h-3.5" /> Add Entry</>}
        </SkyButton>
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
      {err && <p className="text-xs font-semibold text-error-600 bg-error-50 border border-error-300 rounded-sky-chip px-3 py-2">{err}</p>}
      <div><Label>Code * {editing && "(immutable)"}</Label><input value={form.code} disabled={!!editing} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className={inputCls} placeholder="GACHA_STANDARD" /></div>
      <div><Label>Name *</Label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Standard Banner" /></div>
      <div><Label>Loot Table</Label>
        <select value={form.lootTableId} onChange={e => setForm(f => ({ ...f, lootTableId: Number(e.target.value) }))} className={inputCls}>
          {lootTables.map(t => <option key={t.lootTableId} value={t.lootTableId}>{t.code}</option>)}
        </select>
      </div>
      <div><Label>Pull Cost (Gems)</Label><input type="number" min={1} value={form.pullCostGems} onChange={e => setForm(f => ({ ...f, pullCostGems: Number(e.target.value) }))} className={inputCls} /></div>
      <div className="flex gap-3 pt-2 border-t border-gray-200">
        <SkyButton type="button" variant="secondary" onClick={onClose} disabled={saving} className="flex-1">Cancel</SkyButton>
        <SkyButton type="submit" variant="primary" disabled={saving} className="flex-1">
          {saving ? <><Spinner /> Saving…</> : <><Save className="w-3.5 h-3.5" /> {editing ? "Update" : "Create"}</>}
        </SkyButton>
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
        <SkyButton type="button" variant="primary" size="sm" onClick={() => setModal({ editing: null })} disabled={lootTables.length === 0}><Plus className="w-3.5 h-3.5" /> New Banner</SkyButton>
      </div>
      {loading ? <div className="flex justify-center py-10 text-sky-ink-3"><Spinner size={24} /></div> : (
        <SkyCard variant="admin" className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-sky-admin-bg-deep border-b border-slate-200">
              {["Code", "Name", "Loot Table", "Cost (Gems)", "Status", ""].map(h => <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase text-sky-ink">{h}</th>)}
            </tr></thead>
            <tbody>
              {banners.map(b => (
                <tr key={b.gachaBannerId} className="sky-table-row">
                  <td className="px-3 py-2 font-mono text-xs font-semibold text-sky-ink-2">{b.code}</td>
                  <td className="px-3 py-2 font-semibold text-sky-ink">{b.name}</td>
                  <td className="px-3 py-2 text-xs text-sky-ink-2">#{b.lootTableId}</td>
                  <td className="px-3 py-2 text-xs font-semibold text-sky-ink">💎 {b.pullCostGems}</td>
                  <td className="px-3 py-2"><StatusPill active={b.isActive} /></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <SkyButton type="button" variant="secondary" size="icon" onClick={() => setModal({ editing: b })}><Pencil className="w-3.5 h-3.5" /></SkyButton>
                      <SkyButton type="button" variant="secondary" size="sm" onClick={() => toggleActive(b)}>{b.isActive ? "Deactivate" : "Activate"}</SkyButton>
                    </div>
                  </td>
                </tr>
              ))}
              {banners.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-sky-ink-3">No gacha banners yet.</td></tr>}
            </tbody>
          </table>
        </SkyCard>
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
          <div className="w-12 h-12 rounded-sky-chip bg-success-100 flex items-center justify-center shrink-0">
            <Coins className="w-6 h-6 text-success-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-sky-ink">Economy Hub</h1>
            <p className="text-sm text-sky-ink-2 font-medium mt-0.5">Author items, shop listings, loot tables, and gacha banners.</p>
          </div>
        </div>

        <div className="flex items-end gap-1 border-b border-gray-200 overflow-x-auto">
          {tabs.map(tt => (
            <button
              type="button"
              key={tt.id}
              onClick={() => setTab(tt.id)}
              className={`px-5 py-2.5 font-semibold text-sm rounded-t-sky-chip transition-all whitespace-nowrap flex items-center gap-1.5 ${
                tab === tt.id ? "bg-success-100 text-success-800 -mb-px" : "text-sky-ink-2 hover:bg-sky-3/20"
              }`}
            >
              {tt.icon} {tt.label}
            </button>
          ))}
        </div>

        <SkyCard variant="admin">
          {tab === "items" && <ItemCatalogTab onAlert={setAlert} />}
          {tab === "shop" && <ShopListingsTab onAlert={setAlert} />}
          {tab === "loot" && <LootTablesTab items={items} onAlert={setAlert} />}
          {tab === "gacha" && <GachaBannersTab onAlert={setAlert} />}
        </SkyCard>
      </div>
    </>
  );
}

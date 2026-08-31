import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Coins, Swords, Dices, Sparkles, Plus, Pencil, X, Save, Trash2, Loader2,
  Check, Minus, AlertTriangle, Gem, Package, Star, Crown, Inbox,
  ShoppingBag, Zap, Upload, Image as ImageIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAlert } from "../context/AlertContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import PageHeader from "../components/common/PageHeader";
import { adminItemApi } from "../api/adminItemApi";
import { adminCombatItemApi } from "../api/adminCombatItemApi";
import { adminLootTableApi } from "../api/adminLootTableApi";
import { uploadApi } from "../api/uploadApi";
import SkyCard from "../components/ui/card/SkyCard";
import SkyButton from "../components/ui/button/SkyButton";
import { FilterDropdown } from "../components/common/FilterDropdown";
import type { FilterField } from "../hooks/useTableFilters";
import { positiveIntDisplay, parsePositiveInt } from "../utils/numberInput";
import type {
  ItemDefinitionDto, CreateItemPayload,
  CombatItemDefinitionDto, CombatItemKind, CombatItemCurrency, CreateCombatItemPayload,
  LootTableDto, AddLootTableEntryPayload,
} from "../types/adminEconomy.types";

const ITEM_TYPES = ["SKIN", "SCENE", "BADGE", "TITLE", "FRAME", "EMOTE", "CONSUMABLE"];
const RARITIES = ["COMMON", "RARE", "EPIC", "LEGENDARY"];
const REWARD_KINDS = ["ITEM", "GOLD", "GEMS", "MGOLD"];
const COMBAT_KINDS: CombatItemKind[] = ["CHARACTER", "SPELL"];

// The mobile Shop only ever sells Character/Spell combat items — the same
// Regular (Gold) / Mentor (M-Gold) split as its segmented switch
// (ShopScreen.tsx: SYSTEM_ACCENT blue, MENTOR_ACCENT gold), reusing this admin
// surface's existing sky-deep (primary) / sky-violet ("epic / mentor accent"
// per index.css) tokens instead of introducing a new palette. Currency IS the
// storefront here — CombatItemDefinition has no separate shopType field.
const SHOP_LABEL: Record<CombatItemCurrency, string> = { GOLD: "Regular", MGOLD: "Mentor" };
const SHOP_ICON: Record<CombatItemCurrency, LucideIcon> = { GOLD: ShoppingBag, MGOLD: Crown };
const KIND_ICON: Record<CombatItemKind, LucideIcon> = { CHARACTER: Crown, SPELL: Zap };

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

// Icon field shared by Item Catalog + Combat Shop forms — an admin can either
// type an emoji straight in (still just text, no upload needed) or pick an
// image from their device, which uploads client-side to Supabase Storage
// (mirrors the avatar-upload pattern in EditProfile.tsx) and drops the
// resulting public URL into the same field. Bucket "game-assets" matches
// where the BE's own item-icon upload endpoint writes cosmetic icons.
function IconUploadField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const isImageUrl = /^https?:\/\//.test(value);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErr("");
    try {
      const url = await uploadApi.uploadImage(file, "game-assets");
      if (url) onChange(url);
      else setErr("Upload failed.");
    } catch {
      setErr("Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div>
      <Label>Icon (emoji, or upload an image)</Label>
      <div className="flex items-center gap-2">
        <span className="grid place-items-center w-11 h-11 shrink-0 rounded-sky-chip bg-white/60 ring-1 ring-white/80 text-lg overflow-hidden">
          {isImageUrl
            ? <img src={value} alt="" className="w-full h-full object-cover" />
            : value || <ImageIcon className="w-4 h-4 text-sky-ink-3" />}
        </span>
        <input value={isImageUrl ? "" : value} onChange={e => onChange(e.target.value)} className={`${inputCls} flex-1 min-w-0`} placeholder="🥷" />
        <SkyButton type="button" variant="secondary" size="icon" onClick={() => fileInputRef.current?.click()} disabled={uploading} aria-label="Upload icon image">
          {uploading ? <Spinner size={14} /> : <Upload className="w-3.5 h-3.5" />}
        </SkyButton>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>
      {err && <p className="mt-1 text-[11px] font-semibold text-sky-rose-deep">{err}</p>}
    </div>
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
    // Code is normalized here and on blur, never live on every keystroke — forcing
    // .toUpperCase() synchronously in onChange breaks IME composition (garbles/drops
    // characters while typing Vietnamese diacritics into this field).
    const code = form.code.trim().toUpperCase();
    if (!code || !form.name.trim()) { setErr("Code and name are required."); return; }
    setSaving(true); setErr("");
    try { await onSave({ ...form, code }); onClose(); }
    catch (ex) { setErr(errMsg(ex) ?? "Save failed."); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {err && <ErrorNote>{err}</ErrorNote>}
      <div><Label>Code *</Label><input value={form.code} disabled={!!editing} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} onBlur={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className={inputCls} placeholder="SKIN_NINJA" /></div>
      <IconUploadField value={form.iconUrl} onChange={url => setForm(f => ({ ...f, iconUrl: url }))} />
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

// ═══════════════════════ TAB B — COMBAT SHOP (Character/Spell) ═══════════════
// The mobile Shop screen sells exactly one thing in each of its two tabs:
// Character and Spell "chưởng lực" (CombatItemDefinition — separate from the
// cosmetic Item Catalog, these add real DamageBonus in combat). This tab is
// the admin CRUD for that catalog, split Regular/Mentor by Currency.

// Kind + shop are locked to context (not free text): Kind/Code are immutable
// after creation (BE's update command doesn't accept them), and Currency is
// implied by which storefront sub-tab the listing was opened from.
function CombatItemForm({ currency, editing, onSave, onClose }: {
  currency: CombatItemCurrency; editing: CombatItemDefinitionDto | null;
  onSave: (p: CreateCombatItemPayload) => Promise<void>; onClose: () => void;
}) {
  const ShopIcon = SHOP_ICON[currency];
  const [form, setForm] = useState<CreateCombatItemPayload>({
    kind: editing?.kind ?? "CHARACTER",
    code: editing?.code ?? "",
    name: editing?.name ?? "",
    iconUrl: editing?.iconUrl ?? "",
    price: editing?.price ?? 100,
    currency,
    // Damage bonus is no longer admin-editable — preserve whatever an existing
    // item already had (legacy data), default new items to 0 (no combat effect).
    damageBonus: editing?.damageBonus ?? 0,
    isDefault: editing?.isDefault ?? false,
    description: editing?.description ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Normalized here and on blur, never live on every keystroke — forcing
    // .toUpperCase() synchronously in onChange breaks IME composition.
    const code = form.code.trim().toUpperCase();
    if (!code || !form.name.trim()) { setErr("Code and name are required."); return; }
    setSaving(true); setErr("");
    try { await onSave({ ...form, code }); onClose(); }
    catch (ex) { setErr(errMsg(ex) ?? "Save failed."); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {err && <ErrorNote>{err}</ErrorNote>}
      <div><Label>Code *</Label><input value={form.code} disabled={!!editing} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} onBlur={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className={inputCls} placeholder="CHAR_NINJA" /></div>
      <IconUploadField value={form.iconUrl ?? ""} onChange={url => setForm(f => ({ ...f, iconUrl: url }))} />
      <div><Label>Name *</Label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Must match the mobile sprite name exactly" /></div>
      <div><Label>Description</Label><textarea value={form.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className={`${inputCls} resize-none`} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Kind</Label>
          <select value={form.kind} disabled={!!editing} onChange={e => setForm(f => ({ ...f, kind: e.target.value as CombatItemKind }))} className={inputCls}>
            {COMBAT_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <Label>Shop</Label>
          <div className={`${inputCls} flex items-center gap-2 bg-white/40! text-sky-ink cursor-not-allowed`}>
            <ShopIcon className={`w-4 h-4 shrink-0 ${currency === "MGOLD" ? "text-sky-violet-deep" : "text-sky-deep"}`} />
            {SHOP_LABEL[currency]} ({currency})
          </div>
        </div>
      </div>
      <div><Label>Price ({currency})</Label><input type="number" min={1} value={positiveIntDisplay(form.price)} onChange={e => setForm(f => ({ ...f, price: parsePositiveInt(e.target.value) }))} className={inputCls} /></div>
      <label className="flex items-center gap-2 text-sm font-medium text-sky-ink-2 cursor-pointer rounded-sky-chip bg-white/42 ring-1 ring-white/70 px-4 py-3">
        <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} className="w-4 h-4 accent-sky-deep" />
        Default — every player already owns this for free, no purchase needed
      </label>
      <div className="flex gap-3 pt-3 border-t border-white/70">
        <SkyButton type="button" variant="secondary" onClick={onClose} disabled={saving} className="flex-1">Cancel</SkyButton>
        <SkyButton type="submit" variant="primary" disabled={saving} className="flex-1">
          {saving ? <><Spinner /> Saving…</> : <><Save className="w-3.5 h-3.5" /> {editing ? "Update" : "Create"}</>}
        </SkyButton>
      </div>
    </form>
  );
}

// Sub-tab switch — Regular (Gold) vs Mentor (M-Gold) storefront, the same split
// as the mobile Shop screen's segmented control. A pill-in-a-well control
// nested one level below the hub's own Items/Shop/Loot tab bar, so it reads as
// subordinate rather than a second top-level nav.
function ShopSubTabBar({ active, onChange, counts }: {
  active: CombatItemCurrency; onChange: (c: CombatItemCurrency) => void; counts: Record<CombatItemCurrency, number>;
}) {
  return (
    <div className="inline-flex gap-1 rounded-sky-chip bg-white/42 ring-1 ring-white/70 p-1">
      {(["GOLD", "MGOLD"] as CombatItemCurrency[]).map(c => {
        const on = active === c;
        const Icon = SHOP_ICON[c];
        return (
          <button
            type="button"
            key={c}
            aria-pressed={on}
            onClick={() => onChange(c)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-sky-sm text-xs font-semibold whitespace-nowrap transition ${
              on
                ? c === "MGOLD"
                  ? "bg-linear-to-b from-sky-violet to-sky-violet-deep text-white shadow-sky-chip"
                  : "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-chip"
                : "text-sky-ink-2 hover:bg-white/70 hover:text-sky-ink"
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" /> {SHOP_LABEL[c]}
            <span className={`inline-grid place-items-center min-w-4.5 h-4.5 px-1 text-[10px] font-semibold rounded-full tabular-nums ${
              on ? "bg-white/25 text-white" : "bg-sky-ink/8 text-sky-ink-2"
            }`}>
              {counts[c]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CombatShopTab({ onAlert }: { onAlert: (a: { type: "success" | "error"; message: string }) => void }) {
  const [subTab, setSubTab] = useState<CombatItemCurrency>("GOLD");
  const [allItems, setAllItems] = useState<CombatItemDefinitionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState<CombatItemKind | "">("");
  const [modal, setModal] = useState<{ currency: CombatItemCurrency; editing: CombatItemDefinitionDto | null } | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminCombatItemApi.getItems();
      if (res.success) setAllItems(res.data ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  // Currency IS the storefront split (no separate shopType field on this entity).
  const goldItems = allItems.filter(i => i.currency === "GOLD");
  const mgoldItems = allItems.filter(i => i.currency === "MGOLD");
  const scoped = subTab === "GOLD" ? goldItems : mgoldItems;
  const visible = kindFilter ? scoped.filter(i => i.kind === kindFilter) : scoped;

  const handleSave = async (payload: CreateCombatItemPayload) => {
    if (modal?.editing) {
      // kind/code are immutable after creation — BE's update command only accepts
      // name/icon/price/currency/damageBonus/isDefault/description (UpdateCombatItemBody).
      const { name, iconUrl, price, currency, damageBonus, isDefault, description } = payload;
      await adminCombatItemApi.updateItem(modal.editing.combatItemDefinitionId, { name, iconUrl, price, currency, damageBonus, isDefault, description });
      onAlert({ type: "success", message: `"${payload.name}" updated.` });
    } else {
      await adminCombatItemApi.createItem(payload);
      onAlert({ type: "success", message: `"${payload.name}" created.` });
    }
    fetch();
  };

  const toggleActive = async (item: CombatItemDefinitionDto) => {
    try { await adminCombatItemApi.setActive(item.combatItemDefinitionId, !item.isActive); fetch(); }
    catch (ex) { onAlert({ type: "error", message: errMsg(ex) ?? "Toggle failed." }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ShopSubTabBar
          active={subTab}
          onChange={setSubTab}
          counts={{ GOLD: goldItems.length, MGOLD: mgoldItems.length }}
        />
        <div className="flex items-center gap-2">
          <FilterDropdown<{ kind: string }>
            fields={[{
              key: "kind",
              label: "Kind",
              type: "select",
              options: COMBAT_KINDS.map(k => ({ label: k, value: k })),
            } satisfies FilterField]}
            filters={{ kind: kindFilter }}
            onFilterChange={(_, value) => setKindFilter(value as CombatItemKind | "")}
            onClear={() => setKindFilter("")}
            hasActiveFilters={kindFilter !== ""}
            align="left"
          />
          <SkyButton type="button" variant="primary" size="sm" onClick={() => setModal({ currency: subTab, editing: null })}>
            <Plus className="w-3.5 h-3.5" /> New Item
          </SkyButton>
        </div>
      </div>
      {loading ? <div className="flex justify-center py-10 text-sky-ink-3"><Spinner size={24} /></div> : (
        <SkyCard variant="admin" className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="sky-table-head">
              {["Icon", "Code", "Name", "Kind", "Price", "Status", ""].map(h => <th key={h} className="px-3 py-2.5 text-left">{h}</th>)}
            </tr></thead>
            <tbody className="sky-stagger">
              {visible.map(item => {
                const KindIcon = KIND_ICON[item.kind];
                return (
                  <tr key={item.combatItemDefinitionId} className="sky-table-row group">
                    <td className="px-3 py-2">
                      <span className="grid place-items-center w-9 h-9 rounded-sky-chip bg-white/60 ring-1 ring-white/80 text-base shrink-0">
                        {item.iconUrl || <KindIcon className="w-4 h-4 text-sky-ink-3" />}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs font-semibold tracking-[0.06em] text-sky-ink-2">{item.code}</td>
                    <td className="px-3 py-2 font-display text-sm font-semibold text-sky-ink">{item.name}</td>
                    <td className="px-3 py-2 text-xs font-medium text-sky-ink-2">
                      <span className="inline-flex items-center gap-1"><KindIcon className="w-3 h-3 shrink-0" /> {item.kind}</span>
                    </td>
                    <td className="px-3 py-2">
                      {item.isDefault ? (
                        <span className="sky-badge sky-badge-neutral text-[10px]"><Check className="w-3 h-3 shrink-0" /> Free (default)</span>
                      ) : (
                        <PriceTag amount={item.price} currency={item.currency} />
                      )}
                    </td>
                    <td className="px-3 py-2"><StatusPill active={item.isActive} /></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1.5 opacity-45 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <SkyButton type="button" variant="secondary" size="icon" onClick={() => setModal({ currency: subTab, editing: item })} aria-label={`Edit ${item.name}`}><Pencil className="w-3.5 h-3.5" /></SkyButton>
                        <SkyButton type="button" variant="secondary" size="sm" className="min-w-24" onClick={() => toggleActive(item)}>{item.isActive ? "Deactivate" : "Activate"}</SkyButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr><td colSpan={7} className="py-14 text-center">
                  <span className="grid place-items-center w-14 h-14 mx-auto mb-3 rounded-full bg-sky-deep/8 text-sky-deep"><Swords className="w-6 h-6" /></span>
                  <p className="font-display text-base font-semibold text-sky-ink">Nothing in the {SHOP_LABEL[subTab]} Shop</p>
                  <p className="text-xs font-medium text-sky-ink-3 mt-1">Author a Character or Spell to put it in front of players.</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </SkyCard>
      )}
      {modal && (
        <Modal title={modal.editing ? "Edit Combat Item" : `New ${SHOP_LABEL[modal.currency]} Combat Item`} onClose={() => setModal(null)}>
          <CombatItemForm currency={modal.currency} editing={modal.editing} onSave={handleSave} onClose={() => setModal(null)} />
        </Modal>
      )}
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
        <div><Label>Amount Min</Label><input type="number" min={1} value={positiveIntDisplay(form.amountMin)} onChange={e => setForm(f => ({ ...f, amountMin: parsePositiveInt(e.target.value) }))} className={inputCls} /></div>
        <div><Label>Amount Max</Label><input type="number" min={1} value={positiveIntDisplay(form.amountMax)} onChange={e => setForm(f => ({ ...f, amountMax: parsePositiveInt(e.target.value) }))} className={inputCls} /></div>
        <div><Label>Weight</Label><input type="number" min={1} value={positiveIntDisplay(form.weight)} onChange={e => setForm(f => ({ ...f, weight: parsePositiveInt(e.target.value) }))} className={inputCls} /></div>
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
  const [tab, setTab] = useState<TabId>("shop");
  const [items, setItems] = useState<ItemDefinitionDto[]>([]);

  useEffect(() => {
    adminItemApi.getItems().then(res => { if (res.success) setItems(res.data ?? []); });
  }, [tab]);

  // Item Catalog (cosmetic Shop/Gacha items) is retired — hidden from the tab bar below.
  // The tab's component/route/API still exist; flip this back on to bring it back.
  const tabs: { id: TabId; label: string; Icon: LucideIcon }[] = [
    { id: "shop", label: "Shop", Icon: Swords },
    { id: "loot", label: "Loot Tables", Icon: Dices },
  ];

  return (
    <>
      <PageMeta title="Economy Hub" description="Manage item catalog, the Character/Spell combat shop, and loot tables." />
      <PageBreadcrumb pageTitle="Economy Hub" />

      <div className="space-y-6 p-1">
        <PageHeader
          icon={<Coins className="w-6 h-6" />}
          tone="peach"
          title="Economy Hub"
          description="Author items, the Character/Spell combat shop, and loot tables."
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
          {tab === "shop" && <CombatShopTab onAlert={setAlert} />}
          {tab === "loot" && <LootTablesTab items={items} onAlert={setAlert} />}
        </SkyCard>
      </div>
    </>
  );
}

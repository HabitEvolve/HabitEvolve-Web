import { useState, useCallback, useEffect } from "react";
import { useAlert } from "../context/AlertContext";
import { useAuth } from "../context/AuthContext";
import {
    Zap, Flame, RotateCcw, Bell, User, Loader2,
    CheckCircle2, AlertCircle, ShieldAlert, HeartPulse,
    TrendingDown, TrendingUp, Search, X, Swords,
    Check, Users, Info, Skull, type LucideIcon,
} from "lucide-react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import PageHeader from "../components/common/PageHeader";
import { adminSystemOpsApi } from "../api/adminSystemOpsApi";
import adminUserApi from "../api/adminUserApi";
import adminSearchApi from "../api/adminSearchApi";
import playerDataApi from "../api/playerDataApi";
import mentorApi from "../api/mentorApi";
import SkyCard from "../components/ui/card/SkyCard";
import SkyButton from "../components/ui/button/SkyButton";
import type {
    BroadcastTarget, BroadcastResultDto, NotificationDto,
    ProofDecision, ProofDto, SharedHpDto,
} from "../types/adminSystemOps.types";
import type { UserProofDto } from "../types/userDetail.types";
import type { WeeklyBossStatusDto } from "../types/mentor.types";

// ── Shared entity-picker types ──────────────────────────────────────────────
interface UserOption {
    userId: number;
    username: string;
    email: string;
}
interface PartyOption {
    partyId: number;
    name: string;
    status?: string | null;
}

// Debounced search shared by the user pickers below.
function useDebouncedUserSearch(query: string) {
    const [results, setResults] = useState<UserOption[]>([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (!query.trim()) { setResults([]); return; }
        setSearching(true);
        const handle = setTimeout(async () => {
            try {
                const res = await adminUserApi.getUsers({ search: query.trim(), pageSize: 8 });
                setResults(res.data.map(u => ({ userId: u.userId, username: u.username, email: u.email })));
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(handle);
    }, [query]);

    return { results, searching };
}

// ── SHARED SKY-PASTEL ATOMS ─────────────────────────────────────────────────
// This page is a wall of operator forms, so every field, label, panel header and
// result banner is defined once here. Left to per-panel copies they drift within
// a single screen — which is exactly what makes a console feel machine-generated.

// Glass field, not a bordered box: the surface itself carries the affordance
// (translucent fill + white hairline ring) and focus deepens the ring rather
// than swapping a border colour.
const fieldInputCls = [
    "w-full rounded-sky-chip bg-white/70 ring-1 ring-white/80 px-3.5 py-2.5",
    "text-sm font-medium text-sky-ink transition-shadow",
    "focus:outline-none focus:ring-2 focus:ring-sky-deep/45 placeholder:text-sky-ink-3",
].join(" ");

const pickerInputCls = fieldInputCls.replace("px-3.5 py-2.5", "pl-10 pr-3.5 py-2.5");

const eyebrow = "text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3";
const fieldLabel = `block mb-1.5 ${eyebrow}`;

// Dropdown surface shared by all three pickers.
const menuCls = "absolute z-20 mt-1.5 w-full rounded-sky-md bg-white/92 backdrop-blur-xl ring-1 ring-white/80 shadow-sky-glass max-h-48 overflow-y-auto p-1";
const menuRowCls = "w-full text-left px-3 py-2 rounded-sky-chip text-sm transition-colors hover:bg-sky-deep/8";

/** Selected-entity chip: the picker collapses into a confirmation, not a form field. */
const pickedCls = "relative flex items-center justify-between gap-2 rounded-sky-chip bg-sky-deep/8 ring-1 ring-sky-deep/20 pl-4 pr-2 py-2 overflow-hidden";

// Panel accent tones. These are a *taxonomy of what the panel does*, not a
// severity ramp — so teal (success) and rose (destructive) are only handed to
// the panels that genuinely mean those things (§4).
type Tone = "deep" | "peach" | "teal" | "violet" | "rose";
const TONE: Record<Tone, { wash: string; rail: string; chip: string }> = {
    deep: { wash: "bg-sky-deep/8", rail: "bg-sky-deep", chip: "bg-sky-deep/12 ring-sky-deep/22 text-sky-deep" },
    peach: { wash: "bg-sky-peach/14", rail: "bg-sky-peach", chip: "bg-sky-peach/20 ring-sky-peach/32 text-sky-peach-deep" },
    teal: { wash: "bg-sky-teal/10", rail: "bg-sky-teal", chip: "bg-sky-teal-bg ring-sky-teal/26 text-sky-teal" },
    violet: { wash: "bg-sky-violet/10", rail: "bg-sky-violet", chip: "bg-sky-violet/14 ring-sky-violet/24 text-sky-violet-deep" },
    rose: { wash: "bg-sky-rose/10", rail: "bg-sky-rose", chip: "bg-sky-rose/14 ring-sky-rose/26 text-sky-rose-deep" },
};

/**
 * Panel header — a tinted strip with a colour rail down its left edge and the
 * icon in a matching chip. The rail is what lets an operator find a panel again
 * at a glance in a page this dense, without the tint having to shout.
 */
function PanelHead({ Icon, title, subtitle, tone }: {
    Icon: LucideIcon; title: string; subtitle: string; tone: Tone;
}) {
    const t = TONE[tone];
    return (
        <div className={`relative ${t.wash} px-5 py-4 flex items-center gap-3 border-b border-white/70 overflow-hidden`}>
            <span aria-hidden="true" className={`absolute left-0 top-0 bottom-0 w-1.5 ${t.rail}`} />
            <span className={`grid place-items-center w-10 h-10 shrink-0 rounded-sky-chip ring-1 ${t.chip}`}>
                <Icon className="w-5 h-5" strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div className="min-w-0">
                <h3 className="font-display text-lg font-semibold text-sky-ink leading-tight truncate">{title}</h3>
                <p className="text-xs font-medium text-sky-ink-3 truncate">{subtitle}</p>
            </div>
        </div>
    );
}

/**
 * Result / error banner. Every variant carries a rail, a glyph AND wording, so
 * the outcome never rests on hue alone — teal for done, rose for failed, peach
 * for "look at this before continuing".
 */
const NOTICE: Record<"success" | "danger" | "attention", { box: string; text: string; rail: string; Icon: LucideIcon }> = {
    success: { box: "bg-sky-teal/10 ring-sky-teal/26", text: "text-sky-teal", rail: "bg-sky-teal", Icon: CheckCircle2 },
    danger: { box: "bg-sky-rose/10 ring-sky-rose/26", text: "text-sky-rose-deep", rail: "bg-sky-rose", Icon: AlertCircle },
    attention: { box: "bg-sky-peach/16 ring-sky-peach/30", text: "text-sky-peach-deep", rail: "bg-sky-peach", Icon: Info },
};

function Notice({ variant, title, children }: {
    variant: keyof typeof NOTICE; title?: string; children?: React.ReactNode;
}) {
    const n = NOTICE[variant];
    const { Icon } = n;
    return (
        <div className={`relative overflow-hidden rounded-sky-chip ring-1 ${n.box} pl-4 pr-4 py-3`}>
            <span aria-hidden="true" className={`absolute left-0 top-0 bottom-0 w-1 ${n.rail}`} />
            {title && (
                <div className={`flex items-center gap-2 ${n.text}`}>
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />
                    <span className="text-sm font-semibold">{title}</span>
                </div>
            )}
            {children && <div className={title ? "mt-2" : ""}>{children}</div>}
        </div>
    );
}

/** Section rule — hairline, centred label, no heavy divider. */
function SectionRule({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3 mb-5">
            <span aria-hidden="true" className="h-px flex-1 bg-linear-to-r from-transparent to-sky-ink/14" />
            <span className={`${eyebrow} px-1`}>{label}</span>
            <span aria-hidden="true" className="h-px flex-1 bg-linear-to-l from-transparent to-sky-ink/14" />
        </div>
    );
}

/** Key/value read-out used inside result banners. */
const kv = "text-xs font-medium text-sky-ink-2";
const kvKey = "font-semibold text-sky-ink-3";

/** Segmented-control button shared by the Target and Decision pickers. */
const segBase = "relative inline-flex items-center justify-center gap-1.5 rounded-sky-chip text-xs font-semibold transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]";
const segOff = "text-sky-ink-2 hover:bg-white/72 hover:text-sky-ink";

// ── User Picker (single-select) ─────────────────────────────────────────────
function UserPicker({
    value, onChange, placeholder = "Search username or email...",
}: {
    value: UserOption | null;
    onChange: (u: UserOption | null) => void;
    placeholder?: string;
}) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const { results, searching } = useDebouncedUserSearch(query);

    if (value) {
        return (
            <div className={pickedCls}>
                <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1 bg-sky-deep" />
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-sky-ink truncate">{value.username}</p>
                    <p className="text-xs text-sky-ink-3 truncate">{value.email}</p>
                </div>
                <SkyButton type="button" variant="ghost" size="icon" onClick={() => onChange(null)} className="w-7 h-7 shrink-0">
                    <X className="w-3.5 h-3.5" />
                </SkyButton>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-ink-3 pointer-events-none" aria-hidden="true" />
                <input
                    value={query}
                    onChange={e => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    placeholder={placeholder}
                    className={pickerInputCls}
                />
            </div>
            {open && query.trim() && (
                <div className={menuCls}>
                    {searching ? (
                        <div className="px-3 py-2 text-xs font-medium text-sky-ink-3 flex items-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching...
                        </div>
                    ) : results.length === 0 ? (
                        <div className="px-3 py-2 text-xs font-medium text-sky-ink-3">No users found.</div>
                    ) : results.map(u => (
                        <button
                            type="button"
                            key={u.userId}
                            onMouseDown={() => { onChange(u); setQuery(""); setOpen(false); }}
                            className={menuRowCls}
                        >
                            <div className="font-semibold text-sky-ink">{u.username}</div>
                            <div className="text-xs text-sky-ink-3">{u.email}</div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── User Picker (multi-select, chips) ───────────────────────────────────────
function UserMultiPicker({
    value, onChange, placeholder = "Search username or email to add...",
}: {
    value: UserOption[];
    onChange: (users: UserOption[]) => void;
    placeholder?: string;
}) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const { results, searching } = useDebouncedUserSearch(query);
    const selectedIds = new Set(value.map(u => u.userId));

    const addUser = (u: UserOption) => {
        if (!selectedIds.has(u.userId)) onChange([...value, u]);
        setQuery("");
        setOpen(false);
    };
    const removeUser = (userId: number) => onChange(value.filter(u => u.userId !== userId));

    return (
        <div className="space-y-2">
            {value.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {value.map(u => (
                        <span
                            key={u.userId}
                            className="inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full bg-sky-deep/10 ring-1 ring-sky-deep/20 text-xs font-semibold text-sky-ink"
                        >
                            {u.username}
                            <button
                                type="button"
                                onClick={() => removeUser(u.userId)}
                                aria-label={`Remove ${u.username}`}
                                className="w-5 h-5 grid place-items-center rounded-full text-sky-ink-2 hover:bg-sky-ink/12 hover:text-sky-ink transition-colors"
                            >
                                <X className="w-3 h-3" strokeWidth={2.6} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <div className="relative">
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-ink-3 pointer-events-none" aria-hidden="true" />
                    <input
                        value={query}
                        onChange={e => { setQuery(e.target.value); setOpen(true); }}
                        onFocus={() => setOpen(true)}
                        onBlur={() => setTimeout(() => setOpen(false), 150)}
                        placeholder={placeholder}
                        className={pickerInputCls}
                    />
                </div>
                {open && query.trim() && (
                    <div className={menuCls}>
                        {searching ? (
                            <div className="px-3 py-2 text-xs font-medium text-sky-ink-3 flex items-center gap-2">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching...
                            </div>
                        ) : results.length === 0 ? (
                            <div className="px-3 py-2 text-xs font-medium text-sky-ink-3">No users found.</div>
                        ) : results.map(u => {
                            const already = selectedIds.has(u.userId);
                            return (
                                <button
                                    type="button"
                                    key={u.userId}
                                    onMouseDown={() => addUser(u)}
                                    disabled={already}
                                    className={`${menuRowCls} disabled:opacity-45 disabled:hover:bg-transparent`}
                                >
                                    <div className="flex items-center gap-1.5 font-semibold text-sky-ink">
                                        {/* Already-added rows say so with a tick, not just dimming. */}
                                        {already && <Check className="w-3.5 h-3.5 shrink-0 text-sky-teal" strokeWidth={2.6} aria-hidden="true" />}
                                        {u.username}
                                    </div>
                                    <div className="text-xs text-sky-ink-3">{u.email}</div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Party Picker (single-select) — resolves via Global Search, type=party ──
function PartyPicker({
    value, onChange, placeholder = "Search party name...",
}: {
    value: PartyOption | null;
    onChange: (p: PartyOption | null) => void;
    placeholder?: string;
}) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [results, setResults] = useState<PartyOption[]>([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (!query.trim()) { setResults([]); return; }
        setSearching(true);
        const handle = setTimeout(async () => {
            try {
                const res = await adminSearchApi.globalSearch(query.trim(), 8);
                const parties = res.data?.parties ?? [];
                setResults(parties.map(p => ({ partyId: p.id, name: p.title, status: p.status })));
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(handle);
    }, [query]);

    if (value) {
        return (
            <div className={pickedCls}>
                <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1 bg-sky-deep" />
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-sky-ink truncate">{value.name}</p>
                    {value.status && <p className="text-xs text-sky-ink-3 truncate">{value.status}</p>}
                </div>
                <SkyButton type="button" variant="ghost" size="icon" onClick={() => onChange(null)} className="w-7 h-7 shrink-0">
                    <X className="w-3.5 h-3.5" />
                </SkyButton>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-ink-3 pointer-events-none" aria-hidden="true" />
                <input
                    value={query}
                    onChange={e => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    placeholder={placeholder}
                    className={pickerInputCls}
                />
            </div>
            {open && query.trim() && (
                <div className={menuCls}>
                    {searching ? (
                        <div className="px-3 py-2 text-xs font-medium text-sky-ink-3 flex items-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching...
                        </div>
                    ) : results.length === 0 ? (
                        <div className="px-3 py-2 text-xs font-medium text-sky-ink-3">No parties found.</div>
                    ) : results.map(p => (
                        <button
                            type="button"
                            key={p.partyId}
                            onMouseDown={() => { onChange(p); setQuery(""); setOpen(false); }}
                            className={menuRowCls}
                        >
                            <div className="font-semibold text-sky-ink">{p.name}</div>
                            {p.status && <div className="text-xs text-sky-ink-3">{p.status}</div>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Daily Task Panel ────────────────────────────────────────────────────────
interface DailyTaskPanelProps {
    Icon: LucideIcon;
    title: string;
    subtitle: string;
    tone: Tone;
    onRun: (date?: string) => Promise<number>;
}

function DailyTaskPanel({ Icon, title, subtitle, tone, onRun }: DailyTaskPanelProps) {
    const alert = useAlert();
    const [date, setDate] = useState("");
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<number | null>(null);

    const handleRun = async () => {
        setRunning(true);
        setResult(null);
        try {
            const count = await onRun(date || undefined);
            setResult(count);
            alert.success(`Done — ${count} record(s) affected`);
        } catch (e: unknown) {
            alert.error(e instanceof Error ? e.message : "Operation failed.");
        } finally {
            setRunning(false);
        }
    };

    return (
        <SkyCard variant="admin" className="p-0 overflow-hidden">
            <PanelHead Icon={Icon} title={title} subtitle={subtitle} tone={tone} />
            <div className="relative px-5 py-5 space-y-4">
                <div>
                    <label className={fieldLabel}>
                        Date — optional, defaults to today
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className={fieldInputCls}
                    />
                </div>
                <SkyButton type="button" variant="primary" onClick={handleRun} disabled={running} className="w-full">
                    {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    {running ? "Running..." : "Run Now"}
                </SkyButton>
                {result !== null && (
                    <Notice variant="success" title="Run complete">
                        {/* The count is the payload of this panel, so it gets display
                            type and its own line rather than being buried in prose. */}
                        <p className="flex items-baseline gap-2">
                            <span className="font-display text-2xl font-semibold text-sky-ink tabular-nums leading-none">{result}</span>
                            <span className={kv}>record(s) affected</span>
                        </p>
                    </Notice>
                )}
            </div>
        </SkyCard>
    );
}

// ── Broadcast Panel ─────────────────────────────────────────────────────────
const TARGET_ICON: Record<BroadcastTarget, LucideIcon> = {
    ALL: Bell,
    ROLE: ShieldAlert,
    USERS: Users,
};

function BroadcastPanel() {
    const alert = useAlert();
    const [target, setTarget] = useState<BroadcastTarget>("ALL");
    const [role, setRole] = useState("");
    const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([]);
    const [type, setType] = useState("");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<BroadcastResultDto | null>(null);

    const handleSend = async () => {
        if (!title.trim()) { alert.error("Title is required."); return; }
        if (target === "ROLE" && !role.trim()) { alert.error("Role is required for ROLE target."); return; }
        if (target === "USERS" && selectedUsers.length === 0) { alert.error("Select at least one user for USERS target."); return; }

        setRunning(true);
        setResult(null);
        try {
            const res = await adminSystemOpsApi.broadcastNotification({
                target,
                role: target === "ROLE" ? role.trim() : undefined,
                userIds: target === "USERS" ? selectedUsers.map(u => u.userId) : undefined,
                type: type.trim() || undefined,
                title: title.trim(),
                body: body.trim() || undefined,
            });
            if (res.success) setResult(res.data ?? null);
            else alert.error(res.message ?? "Broadcast failed.");
        } catch (e: unknown) {
            alert.error(e instanceof Error ? e.message : "Broadcast failed.");
        } finally {
            setRunning(false);
        }
    };

    return (
        <SkyCard variant="admin" className="p-0 overflow-hidden">
            <PanelHead
                Icon={Bell}
                title="Broadcast Notification"
                subtitle="Send to ALL users, a ROLE group, or specific users"
                tone="violet"
            />
            <div className="relative px-5 py-5 space-y-4">
                <div>
                    <label className={fieldLabel}>Target</label>
                    {/* One glass track with the live segment filled, so the three
                        options read as a single switch instead of loose buttons. */}
                    <div className="inline-flex gap-1 p-1 rounded-sky-chip bg-white/58 ring-1 ring-white/80">
                        {(["ALL", "ROLE", "USERS"] as BroadcastTarget[]).map(t => {
                            const on = target === t;
                            const TIcon = TARGET_ICON[t];
                            return (
                                <button
                                    key={t}
                                    onClick={() => setTarget(t)}
                                    aria-pressed={on}
                                    className={`${segBase} px-3.5 py-1.5 ${on
                                        ? "bg-linear-to-b from-sky-deep-lo to-sky-deep text-white shadow-sky-fill ring-1 ring-inset ring-white/25"
                                        : segOff
                                        }`}
                                >
                                    <TIcon className={`w-3.5 h-3.5 shrink-0 ${on ? "text-white" : "text-sky-ink-3"}`} strokeWidth={2.4} aria-hidden="true" />
                                    {t}
                                </button>
                            );
                        })}
                    </div>
                </div>
                {target === "ROLE" && (
                    <div>
                        <label className={fieldLabel}>Role *</label>
                        <select
                            value={role}
                            onChange={e => setRole(e.target.value)}
                            className={fieldInputCls}
                        >
                            <option value="">— Select role —</option>
                            <option value="PLAYER">PLAYER</option>
                            <option value="MENTOR">MENTOR</option>
                            <option value="ADMIN">ADMIN</option>
                        </select>
                    </div>
                )}
                {target === "USERS" && (
                    <div>
                        <label className={fieldLabel}>Users *</label>
                        <UserMultiPicker value={selectedUsers} onChange={setSelectedUsers} />
                    </div>
                )}
                <div>
                    <label className={fieldLabel}>Type (optional)</label>
                    <input
                        value={type}
                        onChange={e => setType(e.target.value)}
                        placeholder="SYSTEM | QUEST | STREAK ..."
                        className={fieldInputCls}
                    />
                </div>
                <div>
                    <label className={fieldLabel}>Title *</label>
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Notification title..."
                        className={fieldInputCls}
                    />
                </div>
                <div>
                    <label className={fieldLabel}>Body (optional)</label>
                    <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        rows={3}
                        placeholder="Notification body text..."
                        className={`${fieldInputCls} resize-none`}
                    />
                </div>
                <SkyButton type="button" variant="primary" onClick={handleSend} disabled={running} className="w-full">
                    {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                    {running ? "Sending..." : "Broadcast"}
                </SkyButton>
                {result && (
                    <Notice variant="success" title="Broadcast sent">
                        {/* Delivered is teal (it worked), skipped is peach (a fact to
                            notice, not a failure), and the total stays neutral — it's
                            a denominator, not an outcome. */}
                        <div className="grid grid-cols-3 gap-2">
                            {([
                                { n: result.totalRecipients, label: "Recipients", cls: "text-sky-ink" },
                                { n: result.notificationsCreated, label: "Sent", cls: "text-sky-teal" },
                                { n: result.skippedByPreference, label: "Skipped", cls: "text-sky-peach-deep" },
                            ] as const).map(s => (
                                <div key={s.label} className="rounded-sky-chip bg-white/62 ring-1 ring-white/80 px-2 py-2.5 text-center">
                                    <div className={`font-display text-xl font-semibold tabular-nums leading-none ${s.cls}`}>{s.n}</div>
                                    <div className={`${eyebrow} mt-1`}>{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </Notice>
                )}
            </div>
        </SkyCard>
    );
}

// ── In-App Single Notification Panel ───────────────────────────────────────
function InAppPanel() {
    const [user, setUser] = useState<UserOption | null>(null);
    const [type, setType] = useState("");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<NotificationDto | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const handleSend = async () => {
        if (!user) { setErr("Select a user."); return; }
        if (!title.trim()) { setErr("Title is required."); return; }

        setRunning(true);
        setResult(null);
        setErr(null);
        try {
            const res = await adminSystemOpsApi.createInAppNotification({
                userId: user.userId,
                type: type.trim() || undefined,
                title: title.trim(),
                body: body.trim() || undefined,
            });
            if (res.success) setResult(res.data ?? null);
            else setErr(res.message ?? "Failed to send notification.");
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : "Failed to send notification.");
        } finally {
            setRunning(false);
        }
    };

    return (
        <SkyCard variant="admin" className="p-0 overflow-hidden">
            <PanelHead
                Icon={User}
                title="Send In-App Notification"
                subtitle="Direct notification to a single user"
                tone="peach"
            />
            <div className="relative px-5 py-5 space-y-4">
                <div>
                    <label className={fieldLabel}>User *</label>
                    <UserPicker value={user} onChange={setUser} />
                </div>
                <div>
                    <label className={fieldLabel}>Type (optional)</label>
                    <input
                        value={type}
                        onChange={e => setType(e.target.value)}
                        placeholder="SYSTEM | QUEST | STREAK ..."
                        className={fieldInputCls}
                    />
                </div>
                <div>
                    <label className={fieldLabel}>Title *</label>
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Notification title..."
                        className={fieldInputCls}
                    />
                </div>
                <div>
                    <label className={fieldLabel}>Body (optional)</label>
                    <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        rows={3}
                        placeholder="Notification body..."
                        className={`${fieldInputCls} resize-none`}
                    />
                </div>
                {err && <Notice variant="danger" title={err} />}
                <SkyButton type="button" variant="primary" onClick={handleSend} disabled={running} className="w-full">
                    {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
                    {running ? "Sending..." : "Send Notification"}
                </SkyButton>
                {result && (
                    <Notice variant="success" title="Sent Successfully">
                        <div className="space-y-1.5">
                            <div className={`${kv} flex flex-wrap gap-x-3 gap-y-0.5`}>
                                <span><span className={kvKey}>ID</span> <span className="tabular-nums">{result.notificationId}</span></span>
                                <span><span className={kvKey}>User</span> {user?.username}</span>
                                <span><span className={kvKey}>Type</span> {result.type}</span>
                            </div>
                            {/* The delivered notification is echoed back as a quote so
                                the operator can proof-read exactly what landed. */}
                            <div className="pl-2.5 border-l-2 border-sky-teal/40">
                                <div className="text-xs font-semibold text-sky-ink">{result.title}</div>
                                {result.body && <div className="text-xs text-sky-ink-3">{result.body}</div>}
                            </div>
                        </div>
                    </Notice>
                )}
            </div>
        </SkyCard>
    );
}

// ── Proof Override Panel ────────────────────────────────────────────────────
function ProofOverridePanel() {
    const { user: currentAdmin } = useAuth();
    const [targetUser, setTargetUser] = useState<UserOption | null>(null);
    const [proofs, setProofs] = useState<UserProofDto[] | null>(null);
    const [proofsLoading, setProofsLoading] = useState(false);
    const [selectedProofId, setSelectedProofId] = useState<number | null>(null);
    const [decision, setDecision] = useState<ProofDecision>("approve");
    const [reason, setReason] = useState("");
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<ProofDto | null>(null);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        setSelectedProofId(null);
        setProofs(null);
        if (!targetUser) return;
        setProofsLoading(true);
        playerDataApi.getProofs(targetUser.userId)
            .then(res => setProofs(res.success ? (res.data ?? []) : []))
            .catch(() => setProofs([]))
            .finally(() => setProofsLoading(false));
    }, [targetUser]);

    const handleSubmit = async () => {
        if (!selectedProofId) { setErr("Select a proof to override."); return; }
        if (!currentAdmin?.userId) { setErr("Could not determine the current admin — please sign in again."); return; }

        setRunning(true);
        setResult(null);
        setErr(null);
        try {
            const res = await adminSystemOpsApi.overrideProof(selectedProofId, {
                adminUserId: currentAdmin.userId,
                decision,
                reason: reason.trim() || undefined,
            });
            if (res.success) setResult(res.data ?? null);
            else setErr(res.message ?? "Override failed.");
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : "Override failed.");
        } finally {
            setRunning(false);
        }
    };

    return (
        <SkyCard variant="admin" className="p-0 overflow-hidden">
            <PanelHead
                Icon={ShieldAlert}
                title="Override Proof Verdict"
                subtitle="Admin final verdict — overrides AI/Mentor review"
                tone="rose"
            />
            <div className="relative px-5 py-5 space-y-4">
                <div>
                    <label className={fieldLabel}>Proof Submitter *</label>
                    <UserPicker value={targetUser} onChange={setTargetUser} placeholder="Search the user who submitted the proof..." />
                </div>

                {targetUser && (
                    <div>
                        <label className={fieldLabel}>Proof *</label>
                        {proofsLoading ? (
                            <div className="flex items-center gap-2 text-xs font-medium text-sky-ink-3 py-2">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading proofs...
                            </div>
                        ) : !proofs || proofs.length === 0 ? (
                            <div className="text-xs font-medium text-sky-ink-3 py-2">No proofs found for this user.</div>
                        ) : (
                            <div className="space-y-1 max-h-48 overflow-y-auto rounded-sky-md bg-white/50 ring-1 ring-white/78 p-1.5">
                                {proofs.map(p => {
                                    const picked = selectedProofId === p.proofId;
                                    return (
                                        <button
                                            type="button"
                                            key={p.proofId}
                                            onClick={() => setSelectedProofId(p.proofId)}
                                            aria-pressed={picked}
                                            className={`relative w-full text-left px-3 py-2 pl-4 rounded-sky-chip overflow-hidden transition-all duration-150 ${picked
                                                ? "bg-sky-deep/12 ring-1 ring-sky-deep/26"
                                                : "hover:bg-white/70"
                                                }`}
                                        >
                                            {/* Selection carries a rail and a tick as well as
                                                the tint, so the choice is never colour-only. */}
                                            {picked && <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1 bg-sky-deep" />}
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="flex items-center gap-1.5 min-w-0 text-sm font-semibold text-sky-ink">
                                                    {picked && <Check className="w-3.5 h-3.5 shrink-0 text-sky-deep" strokeWidth={2.6} aria-hidden="true" />}
                                                    <span className="truncate">{p.questTitle ?? p.proofType}</span>
                                                </span>
                                                <span className={`${eyebrow} shrink-0`}>
                                                    {p.status}
                                                </span>
                                            </div>
                                            <div className="text-[10px] font-medium text-sky-ink-3 tabular-nums">
                                                {new Date(p.submittedAt).toLocaleString()}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <label className={fieldLabel}>Decision</label>
                    <div className="flex gap-1 p-1 rounded-sky-chip bg-white/58 ring-1 ring-white/80">
                        {(["approve", "reject"] as ProofDecision[]).map(d => {
                            const on = decision === d;
                            const DIcon = d === "approve" ? Check : X;
                            return (
                                <button
                                    key={d}
                                    onClick={() => setDecision(d)}
                                    aria-pressed={on}
                                    className={`${segBase} flex-1 py-2 capitalize ${on
                                        ? d === "approve"
                                            // Teal, never green (§4) — approve is success.
                                            ? "bg-sky-teal text-white shadow-sky-fill ring-1 ring-inset ring-white/25"
                                            : "bg-linear-to-b from-sky-rose to-sky-rose-deep text-white shadow-sky-fill ring-1 ring-inset ring-white/25"
                                        : segOff
                                        }`}
                                >
                                    <DIcon className={`w-3.5 h-3.5 shrink-0 ${on ? "text-white" : "text-sky-ink-3"}`} strokeWidth={2.6} aria-hidden="true" />
                                    {d}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div>
                    <label className={fieldLabel}>Reason (optional)</label>
                    <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        rows={2}
                        placeholder="Reason shown to player..."
                        className={`${fieldInputCls} resize-none`}
                    />
                </div>
                {/* This action is attributed and irreversible, so who is acting is
                    stated on the panel rather than assumed from the session. */}
                <p className="flex items-center gap-1.5 text-[10px] font-semibold text-sky-ink-3">
                    <ShieldAlert className="w-3 h-3 shrink-0" strokeWidth={2.4} aria-hidden="true" />
                    Acting as <span className="font-semibold text-sky-ink-2">{currentAdmin?.username ?? "—"}</span> (you)
                </p>
                {err && <Notice variant="danger" title={err} />}
                <SkyButton
                    type="button"
                    variant={decision === "approve" ? "success" : "destructive"}
                    onClick={handleSubmit}
                    disabled={running || !selectedProofId}
                    className="w-full"
                >
                    {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                    {running ? "Overriding..." : `Override — ${decision}`}
                </SkyButton>
                {result && (
                    <Notice variant="success" title="Override Applied">
                        <div className="space-y-1">
                            <div className={`${kv} flex flex-wrap gap-x-3 gap-y-0.5`}>
                                <span><span className={kvKey}>Status</span> {result.status}</span>
                                <span><span className={kvKey}>Route</span> {result.reviewRoute}</span>
                            </div>
                            {result.questTitle && (
                                <div className="text-xs text-sky-ink-3">Quest: {result.questTitle}</div>
                            )}
                            {result.rejectReason && (
                                <div className="text-xs text-sky-ink-3">Reason: {result.rejectReason}</div>
                            )}
                        </div>
                    </Notice>
                )}
            </div>
        </SkyCard>
    );
}

// ── Shared HP Panel ─────────────────────────────────────────────────────────
// Risk ramp, matching the Mentor Rally screen exactly so one concept doesn't get
// two colour languages: teal is the only genuinely safe end, deep is the neutral
// middle, then it heats through peach to damage-orange, and rose is held back
// for WIPED so the ramp never spends its loudest hue early.
const RISK_META: Record<string, { text: string; bar: string; Icon: LucideIcon }> = {
    SAFE: { text: "text-sky-teal", bar: "bg-sky-teal", Icon: Check },
    LOW: { text: "text-sky-deep", bar: "bg-sky-deep", Icon: Info },
    MEDIUM: { text: "text-sky-peach-deep", bar: "bg-sky-peach", Icon: Info },
    HIGH: { text: "text-sky-dmg-deep", bar: "bg-sky-dmg", Icon: AlertCircle },
    WIPED: { text: "text-sky-rose-deep", bar: "bg-sky-rose", Icon: Skull },
};

function SharedHpPanel() {
    const [party, setParty] = useState<PartyOption | null>(null);
    const [bossStatus, setBossStatus] = useState<WeeklyBossStatusDto | null>(null);
    const [statusLoading, setStatusLoading] = useState(false);
    const [statusError, setStatusError] = useState<string | null>(null);

    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const [running, setRunning] = useState<"penalty" | "restore" | null>(null);
    const [result, setResult] = useState<SharedHpDto | null>(null);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        setBossStatus(null);
        setStatusError(null);
        setResult(null);
        if (!party) return;
        setStatusLoading(true);
        mentorApi.getPartyBossStatus(party.partyId)
            .then(res => {
                if (res.success && res.data) setBossStatus(res.data);
                else setStatusError(res.message ?? "This party has no active raid.");
            })
            .catch((e: unknown) => {
                const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
                setStatusError(msg ?? "This party has no active raid this week.");
            })
            .finally(() => setStatusLoading(false));
    }, [party]);

    const handleAction = async (action: "penalty" | "restore") => {
        if (!bossStatus) { setErr("Select a party with an active raid first."); return; }

        const parsedAmount = amount.trim() ? parseInt(amount.trim(), 10) : undefined;
        if (amount.trim() && isNaN(parsedAmount!)) { setErr("Amount must be a valid number."); return; }

        setRunning(action);
        setResult(null);
        setErr(null);
        try {
            const payload = { amount: parsedAmount, reason: reason.trim() || undefined };
            const res = action === "penalty"
                ? await adminSystemOpsApi.applyHpPenalty(bossStatus.raidId, payload)
                : await adminSystemOpsApi.restoreHp(bossStatus.raidId, payload);
            if (res.success) setResult(res.data ?? null);
            else setErr(res.message ?? `${action} failed.`);
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : `${action} failed.`);
        } finally {
            setRunning(null);
        }
    };

    const risk = result ? (RISK_META[result.riskLevel] ?? RISK_META.LOW) : null;
    const RiskIcon = risk?.Icon;

    return (
        <SkyCard variant="admin" className="p-0 overflow-hidden">
            <PanelHead
                Icon={HeartPulse}
                title="Shared HP Management"
                subtitle="Manually apply penalty or restore HP for a party's raid"
                tone="deep"
            />
            <div className="relative px-5 py-5 space-y-4">
                <div>
                    <label className={fieldLabel}>Party *</label>
                    <PartyPicker value={party} onChange={setParty} />
                </div>

                {party && (
                    statusLoading ? (
                        <div className="flex items-center gap-2 text-xs font-medium text-sky-ink-3 py-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading raid status...
                        </div>
                    ) : statusError ? (
                        /* No active raid isn't an error the operator caused — it's a
                           precondition to notice, so peach rather than rose. */
                        <Notice variant="attention" title={statusError} />
                    ) : bossStatus ? (
                        <div className="relative overflow-hidden rounded-sky-chip bg-sky-deep/7 ring-1 ring-sky-deep/16 p-3.5 pl-4 space-y-2">
                            <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1 bg-sky-deep/45" />
                            <div className="flex items-center gap-2">
                                <Swords className="w-4 h-4 shrink-0 text-sky-deep" strokeWidth={2.3} aria-hidden="true" />
                                <span className="font-display text-sm font-semibold text-sky-ink truncate">{bossStatus.bossName}</span>
                                <span className={`${eyebrow} shrink-0 tabular-nums`}>Raid #{bossStatus.raidId}</span>
                            </div>
                            <div className="flex justify-between items-baseline text-xs font-medium text-sky-ink-2">
                                <span>HP</span>
                                <span className="font-display font-semibold text-sky-ink tabular-nums">
                                    {bossStatus.currentHp} / {bossStatus.maxHp}
                                    <span className="ml-1.5 text-sky-ink-3">({Math.round(bossStatus.hpPercent)}%)</span>
                                </span>
                            </div>
                            <div className="w-full h-2 bg-sky-ink/10 rounded-full overflow-hidden">
                                <div className="h-full bg-linear-to-r from-sky-deep-lo to-sky-deep rounded-full" style={{ width: `${bossStatus.hpPercent}%` }} />
                            </div>
                        </div>
                    ) : null
                )}

                <div>
                    <label className={fieldLabel}>Amount (optional)</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="default"
                        className={fieldInputCls}
                    />
                </div>
                <div>
                    <label className={fieldLabel}>Reason (optional)</label>
                    <input
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Admin manual adjustment..."
                        className={fieldInputCls}
                    />
                </div>
                {err && <Notice variant="danger" title={err} />}
                <div className="grid grid-cols-2 gap-3">
                    <SkyButton type="button" variant="destructive" onClick={() => handleAction("penalty")} disabled={running !== null || !bossStatus}>
                        {running === "penalty" ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingDown className="w-4 h-4" />}
                        {running === "penalty" ? "Applying..." : "Penalty"}
                    </SkyButton>
                    <SkyButton type="button" variant="success" onClick={() => handleAction("restore")} disabled={running !== null || !bossStatus}>
                        {running === "restore" ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                        {running === "restore" ? "Restoring..." : "Restore"}
                    </SkyButton>
                </div>
                {result && risk && RiskIcon && (
                    <Notice variant="success" title="Updated">
                        <div className="space-y-2">
                            {/* The risk level gets a glyph next to its label, so the
                                severity reads even where the hue can't be told apart. */}
                            <div className="flex items-center justify-between gap-2">
                                <span className={kv}>Risk level</span>
                                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] ${risk.text}`}>
                                    <RiskIcon className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                                    {result.riskLevel}
                                </span>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs font-medium text-sky-ink-2">
                                    <span>Shared HP</span>
                                    <span className="font-display font-semibold text-sky-ink tabular-nums">{result.sharedHpCurrent} / {result.sharedHpMax}</span>
                                </div>
                                <div className="w-full h-3 bg-sky-ink/10 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${risk.bar}`}
                                        style={{ width: `${Math.min(100, Math.max(0, Number(result.percentage)))}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs font-medium text-sky-ink-3 tabular-nums">
                                    <span>Raid #{result.raidId} · Party #{result.partyId}</span>
                                    <span>{Number(result.percentage).toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                    </Notice>
                )}
            </div>
        </SkyCard>
    );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function AdminSystemOpsPage() {
    const spawnMonsters = useCallback(async (date?: string) => {
        const res = await adminSystemOpsApi.spawnMonsters(date);
        if (!res.success) throw new Error(res.message ?? "Spawn failed.");
        return res.data as number;
    }, []);

    const finalizeStreak = useCallback(async (date?: string) => {
        const res = await adminSystemOpsApi.finalizeStreak(date);
        if (!res.success) throw new Error(res.message ?? "Finalize failed.");
        return res.data as number;
    }, []);

    return (
        <>
            <PageMeta title="System Operations | HabitEvolve Admin" description="Trigger daily tasks and broadcast notifications" />
            <PageBreadcrumb pageTitle="System Operations" />
            <div className="space-y-8 p-1">
                {/* These controls fire real jobs at real users, so the page title
                    says so plainly and the icon chip carries the warm attention
                    tone rather than the neutral operational blue. */}
                <PageHeader
                    icon={<Zap className="w-6 h-6" strokeWidth={2.2} aria-hidden="true" />}
                    tone="peach"
                    size="h1"
                    eyebrow="Admin · live operations"
                    title="System Operations"
                    description="Trigger daily tasks and send notifications"
                />

                <section>
                    <SectionRule label="Daily Tasks" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sky-stagger">
                        <DailyTaskPanel
                            Icon={Flame}
                            title="Spawn Daily Monsters"
                            subtitle="POST /api/admin/daily-monsters/spawn"
                            tone="peach"
                            onRun={spawnMonsters}
                        />
                        <DailyTaskPanel
                            Icon={RotateCcw}
                            title="Finalize Daily Streak"
                            subtitle="POST /api/admin/daily-streak/finalize"
                            tone="teal"
                            onRun={finalizeStreak}
                        />
                    </div>
                </section>

                <section>
                    <SectionRule label="Notifications" />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sky-stagger">
                        <BroadcastPanel />
                        <InAppPanel />
                    </div>
                </section>

                <section>
                    <SectionRule label="Proof & Raid Management" />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sky-stagger">
                        <ProofOverridePanel />
                        <SharedHpPanel />
                    </div>
                </section>
            </div>
        </>
    );
}

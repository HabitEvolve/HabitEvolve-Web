import { useState, useCallback, useEffect } from "react";
import { useAlert } from "../context/AlertContext";
import { useAuth } from "../context/AuthContext";
import {
    Zap, Flame, RotateCcw, Bell, User, Loader2,
    CheckCircle2, AlertCircle, ShieldAlert, HeartPulse,
    TrendingDown, TrendingUp, Search, X, Swords,
} from "lucide-react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
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

const pickerInputCls = [
    "w-full rounded-sky-chip border border-sky-surf-border bg-white pl-9 pr-3 py-2",
    "text-sm font-medium text-sky-ink",
    "focus:outline-none focus:border-sky-deep focus:ring-3 focus:ring-sky-deep/20",
].join(" ");

const fieldInputCls = [
    "w-full rounded-sky-chip border border-sky-surf-border bg-white px-3 py-2",
    "text-sm font-medium text-sky-ink",
    "focus:outline-none focus:border-sky-deep focus:ring-3 focus:ring-sky-deep/20",
].join(" ");

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
            <div className="flex items-center justify-between gap-2 rounded-sky-chip border border-sky-surf-border px-3 py-2 bg-blue-50">
                <div className="min-w-0">
                    <p className="text-sm font-bold text-sky-ink truncate">{value.username}</p>
                    <p className="text-xs text-sky-ink-3 truncate">{value.email}</p>
                </div>
                <SkyButton type="button" variant="ghost" size="icon" onClick={() => onChange(null)} className="w-6 h-6 shrink-0">
                    <X className="w-3.5 h-3.5" />
                </SkyButton>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sky-ink-3" />
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
                <div className="absolute z-20 mt-1 w-full bg-white rounded-sky-chip border border-sky-surf-border shadow-sky-glass max-h-48 overflow-y-auto">
                    {searching ? (
                        <div className="px-3 py-2 text-xs text-sky-ink-3 flex items-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching...
                        </div>
                    ) : results.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-sky-ink-3">No users found.</div>
                    ) : results.map(u => (
                        <button
                            type="button"
                            key={u.userId}
                            onMouseDown={() => { onChange(u); setQuery(""); setOpen(false); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-warning-50 border-b border-gray-100 last:border-0"
                        >
                            <div className="font-bold text-sky-ink">{u.username}</div>
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
                            className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-sky-chip border border-sky-surf-border bg-blue-50 text-xs font-bold text-sky-ink"
                        >
                            {u.username}
                            <button
                                type="button"
                                onClick={() => removeUser(u.userId)}
                                className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-black/10"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <div className="relative">
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sky-ink-3" />
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
                    <div className="absolute z-20 mt-1 w-full bg-white rounded-sky-chip border border-sky-surf-border shadow-sky-glass max-h-48 overflow-y-auto">
                        {searching ? (
                            <div className="px-3 py-2 text-xs text-sky-ink-3 flex items-center gap-2">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching...
                            </div>
                        ) : results.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-sky-ink-3">No users found.</div>
                        ) : results.map(u => (
                            <button
                                type="button"
                                key={u.userId}
                                onMouseDown={() => addUser(u)}
                                disabled={selectedIds.has(u.userId)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-warning-50 border-b border-gray-100 last:border-0 disabled:opacity-40"
                            >
                                <div className="font-bold text-sky-ink">{u.username}</div>
                                <div className="text-xs text-sky-ink-3">{u.email}</div>
                            </button>
                        ))}
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
            <div className="flex items-center justify-between gap-2 rounded-sky-chip border border-sky-surf-border px-3 py-2 bg-blue-50">
                <div className="min-w-0">
                    <p className="text-sm font-bold text-sky-ink truncate">{value.name}</p>
                    {value.status && <p className="text-xs text-sky-ink-3 truncate">{value.status}</p>}
                </div>
                <SkyButton type="button" variant="ghost" size="icon" onClick={() => onChange(null)} className="w-6 h-6 shrink-0">
                    <X className="w-3.5 h-3.5" />
                </SkyButton>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sky-ink-3" />
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
                <div className="absolute z-20 mt-1 w-full bg-white rounded-sky-chip border border-sky-surf-border shadow-sky-glass max-h-48 overflow-y-auto">
                    {searching ? (
                        <div className="px-3 py-2 text-xs text-sky-ink-3 flex items-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching...
                        </div>
                    ) : results.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-sky-ink-3">No parties found.</div>
                    ) : results.map(p => (
                        <button
                            type="button"
                            key={p.partyId}
                            onMouseDown={() => { onChange(p); setQuery(""); setOpen(false); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-warning-50 border-b border-gray-100 last:border-0"
                        >
                            <div className="font-bold text-sky-ink">{p.name}</div>
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
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    accentBg: string;
    onRun: (date?: string) => Promise<number>;
}

function DailyTaskPanel({ icon, title, subtitle, accentBg, onRun }: DailyTaskPanelProps) {
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
            <div className={`${accentBg} px-5 py-4 flex items-center gap-3 border-b border-gray-200`}>
                {icon}
                <div>
                    <h3 className="font-bold text-lg text-sky-ink">{title}</h3>
                    <p className="text-xs font-medium text-sky-ink-3">{subtitle}</p>
                </div>
            </div>
            <div className="bg-white px-5 py-5 space-y-4">
                <div>
                    <label className="block text-xs font-bold text-sky-ink-2 mb-1">
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
                    <div className="flex items-center gap-3 bg-success-100 rounded-sky-chip px-4 py-3">
                        <CheckCircle2 className="w-5 h-5 text-success-700 shrink-0" />
                        <span className="text-sm font-bold text-success-800">
                            Done — <span className="text-xl">{result}</span> record(s) affected
                        </span>
                    </div>
                )}
            </div>
        </SkyCard>
    );
}

// ── Broadcast Panel ─────────────────────────────────────────────────────────
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
            <div className="bg-purple-50 px-5 py-4 flex items-center gap-3 border-b border-gray-200">
                <Bell className="w-6 h-6 shrink-0 text-purple-600" />
                <div>
                    <h3 className="font-bold text-lg text-sky-ink">Broadcast Notification</h3>
                    <p className="text-xs font-medium text-sky-ink-3">Send to ALL users, a ROLE group, or specific users</p>
                </div>
            </div>
            <div className="bg-white px-5 py-5 space-y-4">
                <div>
                    <label className="block text-xs font-bold text-sky-ink-2 mb-2">Target</label>
                    <div className="flex gap-2">
                        {(["ALL", "ROLE", "USERS"] as BroadcastTarget[]).map(t => (
                            <button
                                key={t}
                                onClick={() => setTarget(t)}
                                className={`px-4 py-1.5 rounded-sky-chip text-xs font-bold transition-all ${target === t
                                    ? "bg-sky-deep text-white"
                                    : "bg-white border border-sky-surf-border text-sky-ink-2 hover:bg-gray-50"
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
                {target === "ROLE" && (
                    <div>
                        <label className="block text-xs font-bold text-sky-ink-2 mb-1">Role *</label>
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
                        <label className="block text-xs font-bold text-sky-ink-2 mb-1">Users *</label>
                        <UserMultiPicker value={selectedUsers} onChange={setSelectedUsers} />
                    </div>
                )}
                <div>
                    <label className="block text-xs font-bold text-sky-ink-2 mb-1">Type (optional)</label>
                    <input
                        value={type}
                        onChange={e => setType(e.target.value)}
                        placeholder="SYSTEM | QUEST | STREAK ..."
                        className={fieldInputCls}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-sky-ink-2 mb-1">Title *</label>
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Notification title..."
                        className={fieldInputCls}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-sky-ink-2 mb-1">Body (optional)</label>
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
                    <div className="grid grid-cols-3 gap-3 bg-success-50 rounded-sky-chip p-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-sky-ink">{result.totalRecipients}</div>
                            <div className="text-xs font-bold text-sky-ink-3 mt-0.5">Total Recipients</div>
                        </div>
                        <div className="text-center border-x border-sky-ink/10">
                            <div className="text-2xl font-bold text-success-700">{result.notificationsCreated}</div>
                            <div className="text-xs font-bold text-sky-ink-3 mt-0.5">Sent</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-warning-700">{result.skippedByPreference}</div>
                            <div className="text-xs font-bold text-sky-ink-3 mt-0.5">Skipped</div>
                        </div>
                    </div>
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
            <div className="bg-warning-50 px-5 py-4 flex items-center gap-3 border-b border-gray-200">
                <User className="w-6 h-6 shrink-0 text-warning-700" />
                <div>
                    <h3 className="font-bold text-lg text-sky-ink">Send In-App Notification</h3>
                    <p className="text-xs font-medium text-sky-ink-3">Direct notification to a single user</p>
                </div>
            </div>
            <div className="bg-white px-5 py-5 space-y-4">
                <div>
                    <label className="block text-xs font-bold text-sky-ink-2 mb-1">User *</label>
                    <UserPicker value={user} onChange={setUser} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-sky-ink-2 mb-1">Type (optional)</label>
                    <input
                        value={type}
                        onChange={e => setType(e.target.value)}
                        placeholder="SYSTEM | QUEST | STREAK ..."
                        className={fieldInputCls}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-sky-ink-2 mb-1">Title *</label>
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Notification title..."
                        className={fieldInputCls}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-sky-ink-2 mb-1">Body (optional)</label>
                    <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        rows={3}
                        placeholder="Notification body..."
                        className={`${fieldInputCls} resize-none`}
                    />
                </div>
                {err && (
                    <div className="flex items-center gap-2 bg-error-100 rounded-sky-chip px-4 py-2">
                        <AlertCircle className="w-4 h-4 text-error-700 shrink-0" />
                        <span className="text-xs font-bold text-error-800">{err}</span>
                    </div>
                )}
                <SkyButton type="button" variant="primary" onClick={handleSend} disabled={running} className="w-full">
                    {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
                    {running ? "Sending..." : "Send Notification"}
                </SkyButton>
                {result && (
                    <div className="bg-success-50 rounded-sky-chip p-4 space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-success-700" />
                            <span className="text-sm font-bold text-success-800">Sent Successfully</span>
                        </div>
                        <div className="text-xs font-medium text-sky-ink-2 space-x-2">
                            <span><span className="font-bold">ID:</span> {result.notificationId}</span>
                            <span>·</span>
                            <span><span className="font-bold">User:</span> {user?.username}</span>
                            <span>·</span>
                            <span><span className="font-bold">Type:</span> {result.type}</span>
                        </div>
                        <div className="text-xs font-bold text-sky-ink">{result.title}</div>
                        {result.body && <div className="text-xs text-sky-ink-3">{result.body}</div>}
                    </div>
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
            <div className="bg-error-50 px-5 py-4 flex items-center gap-3 border-b border-gray-200">
                <ShieldAlert className="w-6 h-6 shrink-0 text-error-600" />
                <div>
                    <h3 className="font-bold text-lg text-sky-ink">Override Proof Verdict</h3>
                    <p className="text-xs font-medium text-sky-ink-3">Admin final verdict — overrides AI/Mentor review</p>
                </div>
            </div>
            <div className="bg-white px-5 py-5 space-y-4">
                <div>
                    <label className="block text-xs font-bold text-sky-ink-2 mb-1">Proof Submitter *</label>
                    <UserPicker value={targetUser} onChange={setTargetUser} placeholder="Search the user who submitted the proof..." />
                </div>

                {targetUser && (
                    <div>
                        <label className="block text-xs font-bold text-sky-ink-2 mb-1">Proof *</label>
                        {proofsLoading ? (
                            <div className="flex items-center gap-2 text-xs text-sky-ink-3 py-2">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading proofs...
                            </div>
                        ) : !proofs || proofs.length === 0 ? (
                            <div className="text-xs text-sky-ink-3 py-2">No proofs found for this user.</div>
                        ) : (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 border border-sky-surf-border rounded-sky-chip p-2">
                                {proofs.map(p => (
                                    <button
                                        type="button"
                                        key={p.proofId}
                                        onClick={() => setSelectedProofId(p.proofId)}
                                        className={`w-full text-left px-3 py-2 rounded-sky-chip transition-all ${selectedProofId === p.proofId
                                            ? "ring-2 ring-warning-400 bg-warning-50"
                                            : "hover:bg-gray-50"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-sm font-bold text-sky-ink truncate">
                                                {p.questTitle ?? p.proofType}
                                            </span>
                                            <span className="text-[10px] font-bold uppercase text-sky-ink-3 shrink-0">
                                                {p.status}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-sky-ink-3">
                                            {new Date(p.submittedAt).toLocaleString()}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-sky-ink-2 mb-2">Decision</label>
                    <div className="flex gap-2">
                        {(["approve", "reject"] as ProofDecision[]).map(d => (
                            <button
                                key={d}
                                onClick={() => setDecision(d)}
                                className={`flex-1 py-2 rounded-sky-chip text-xs font-bold transition-all capitalize ${decision === d
                                    ? d === "approve"
                                        ? "bg-success-600 text-white"
                                        : "bg-error-600 text-white"
                                    : "bg-white border border-sky-surf-border text-sky-ink-2 hover:bg-gray-50"
                                    }`}
                            >
                                {d === "approve" ? "✓ Approve" : "✕ Reject"}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-sky-ink-2 mb-1">Reason (optional)</label>
                    <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        rows={2}
                        placeholder="Reason shown to player..."
                        className={`${fieldInputCls} resize-none`}
                    />
                </div>
                <p className="text-[10px] font-semibold text-sky-ink-3">
                    Acting as: <span className="font-bold text-sky-ink-2">{currentAdmin?.username ?? "—"}</span> (you)
                </p>
                {err && (
                    <div className="flex items-center gap-2 bg-error-100 rounded-sky-chip px-4 py-2">
                        <AlertCircle className="w-4 h-4 text-error-700 shrink-0" />
                        <span className="text-xs font-bold text-error-800">{err}</span>
                    </div>
                )}
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
                    <div className="bg-success-50 rounded-sky-chip p-4 space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 className="w-4 h-4 text-success-700" />
                            <span className="text-sm font-bold text-success-800">Override Applied</span>
                        </div>
                        <div className="text-xs font-medium text-sky-ink-2 space-x-2">
                            <span><span className="font-bold">Status:</span> {result.status}</span>
                            <span>·</span>
                            <span><span className="font-bold">Route:</span> {result.reviewRoute}</span>
                        </div>
                        {result.questTitle && (
                            <div className="text-xs text-sky-ink-3">Quest: {result.questTitle}</div>
                        )}
                        {result.rejectReason && (
                            <div className="text-xs text-sky-ink-3">Reason: {result.rejectReason}</div>
                        )}
                    </div>
                )}
            </div>
        </SkyCard>
    );
}

// ── Shared HP Panel ─────────────────────────────────────────────────────────
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

    const RISK_COLOR: Record<string, string> = {
        SAFE: "text-success-700",
        LOW: "text-success-600",
        MEDIUM: "text-warning-600",
        HIGH: "text-orange-600",
        WIPED: "text-error-700",
    };
    const RISK_BAR: Record<string, string> = {
        SAFE: "bg-success-600",
        LOW: "bg-success-600",
        MEDIUM: "bg-warning-500",
        HIGH: "bg-orange-500",
        WIPED: "bg-error-600",
    };

    return (
        <SkyCard variant="admin" className="p-0 overflow-hidden">
            <div className="bg-blue-50 px-5 py-4 flex items-center gap-3 border-b border-gray-200">
                <HeartPulse className="w-6 h-6 shrink-0 text-blue-600" />
                <div>
                    <h3 className="font-bold text-lg text-sky-ink">Shared HP Management</h3>
                    <p className="text-xs font-medium text-sky-ink-3">Manually apply penalty or restore HP for a party's raid</p>
                </div>
            </div>
            <div className="bg-white px-5 py-5 space-y-4">
                <div>
                    <label className="block text-xs font-bold text-sky-ink-2 mb-1">Party *</label>
                    <PartyPicker value={party} onChange={setParty} />
                </div>

                {party && (
                    statusLoading ? (
                        <div className="flex items-center gap-2 text-xs text-sky-ink-3 py-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading raid status...
                        </div>
                    ) : statusError ? (
                        <div className="flex items-center gap-2 bg-error-100 rounded-sky-chip px-4 py-2">
                            <AlertCircle className="w-4 h-4 text-error-700 shrink-0" />
                            <span className="text-xs font-bold text-error-800">{statusError}</span>
                        </div>
                    ) : bossStatus ? (
                        <div className="bg-blue-50/60 rounded-sky-chip p-3 space-y-2">
                            <div className="flex items-center gap-2">
                                <Swords className="w-4 h-4 text-sky-ink-3" />
                                <span className="text-sm font-bold text-sky-ink">{bossStatus.bossName}</span>
                                <span className="text-[10px] font-bold text-sky-ink-3 uppercase">Raid #{bossStatus.raidId}</span>
                            </div>
                            <div className="flex justify-between text-xs font-medium text-sky-ink-2">
                                <span>HP</span>
                                <span className="font-bold">{bossStatus.currentHp} / {bossStatus.maxHp}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-success-600 rounded-full" style={{ width: `${bossStatus.hpPercent}%` }} />
                            </div>
                        </div>
                    ) : null
                )}

                <div>
                    <label className="block text-xs font-bold text-sky-ink-2 mb-1">Amount (optional)</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="default"
                        className={fieldInputCls}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-sky-ink-2 mb-1">Reason (optional)</label>
                    <input
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Admin manual adjustment..."
                        className={fieldInputCls}
                    />
                </div>
                {err && (
                    <div className="flex items-center gap-2 bg-error-100 rounded-sky-chip px-4 py-2">
                        <AlertCircle className="w-4 h-4 text-error-700 shrink-0" />
                        <span className="text-xs font-bold text-error-800">{err}</span>
                    </div>
                )}
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
                {result && (
                    <div className="bg-success-50 rounded-sky-chip p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-success-700" />
                                <span className="text-sm font-bold text-success-800">Updated</span>
                            </div>
                            <span className={`text-xs font-bold uppercase ${RISK_COLOR[result.riskLevel] ?? "text-sky-ink"}`}>
                                {result.riskLevel}
                            </span>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-medium text-sky-ink-2">
                                <span>Shared HP</span>
                                <span className="font-bold">{result.sharedHpCurrent} / {result.sharedHpMax}</span>
                            </div>
                            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${RISK_BAR[result.riskLevel] ?? "bg-success-600"}`}
                                    style={{ width: `${Math.min(100, Math.max(0, Number(result.percentage)))}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-sky-ink-3">
                                <span>Raid #{result.raidId} · Party #{result.partyId}</span>
                                <span>{Number(result.percentage).toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
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
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-warning-100 rounded-sky-chip">
                        <Zap className="w-6 h-6 text-warning-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-sky-ink">System Operations</h1>
                        <p className="text-sm text-sky-ink-3 font-medium">
                            Trigger daily tasks and send notifications
                        </p>
                    </div>
                </div>

                <section>
                    <div className="flex items-center gap-2 mb-5">
                        <div className="h-px flex-1 bg-sky-ink/10" />
                        <span className="text-[10px] font-bold text-sky-ink-3 uppercase tracking-widest px-2">
                            Daily Tasks
                        </span>
                        <div className="h-px flex-1 bg-sky-ink/10" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DailyTaskPanel
                            icon={<Flame className="w-6 h-6 text-warning-600" />}
                            title="Spawn Daily Monsters"
                            subtitle="POST /api/admin/daily-monsters/spawn"
                            accentBg="bg-warning-50"
                            onRun={spawnMonsters}
                        />
                        <DailyTaskPanel
                            icon={<RotateCcw className="w-6 h-6 text-success-700" />}
                            title="Finalize Daily Streak"
                            subtitle="POST /api/admin/daily-streak/finalize"
                            accentBg="bg-success-50"
                            onRun={finalizeStreak}
                        />
                    </div>
                </section>

                <section>
                    <div className="flex items-center gap-2 mb-5">
                        <div className="h-px flex-1 bg-sky-ink/10" />
                        <span className="text-[10px] font-bold text-sky-ink-3 uppercase tracking-widest px-2">
                            Notifications
                        </span>
                        <div className="h-px flex-1 bg-sky-ink/10" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <BroadcastPanel />
                        <InAppPanel />
                    </div>
                </section>

                <section>
                    <div className="flex items-center gap-2 mb-5">
                        <div className="h-px flex-1 bg-sky-ink/10" />
                        <span className="text-[10px] font-bold text-sky-ink-3 uppercase tracking-widest px-2">
                            Proof & Raid Management
                        </span>
                        <div className="h-px flex-1 bg-sky-ink/10" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ProofOverridePanel />
                        <SharedHpPanel />
                    </div>
                </section>
            </div>
        </>
    );
}

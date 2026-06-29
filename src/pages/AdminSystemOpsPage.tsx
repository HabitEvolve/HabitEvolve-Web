import { useState, useCallback } from "react";
import { useAlert } from "../context/AlertContext";
import {
    Zap, Flame, RotateCcw, Bell, User, Loader2,
    CheckCircle2, AlertCircle, ShieldAlert, HeartPulse,
    TrendingDown, TrendingUp,
} from "lucide-react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { adminSystemOpsApi } from "../api/adminSystemOpsApi";
import type {
    BroadcastTarget, BroadcastResultDto, NotificationDto,
    ProofDecision, ProofDto, SharedHpDto,
} from "../types/adminSystemOps.types";

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
        <div className="border-4 border-[#1A1D20] rounded-2xl shadow-[4px_4px_0_0_#1A1D20] overflow-hidden">
            <div className={`${accentBg} px-5 py-4 flex items-center gap-3 border-b-4 border-[#1A1D20]`}>
                {icon}
                <div>
                    <h3 className="font-black text-lg text-[#1A1D20]">{title}</h3>
                    <p className="text-xs font-medium text-[#1A1D20]/70">{subtitle}</p>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-900 px-5 py-5 space-y-4">
                <div>
                    <label className="block text-xs font-black text-[#1A1D20] dark:text-gray-300 mb-1">
                        Date — optional, defaults to today
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full border-2 border-[#1A1D20] rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f7a561] dark:bg-gray-800 dark:text-gray-100"
                    />
                </div>
                <button
                    onClick={handleRun}
                    disabled={running}
                    className="w-full flex items-center justify-center gap-2 bg-[#1A1D20] text-white font-black text-sm py-2.5 rounded-xl border-2 border-[#1A1D20] shadow-[3px_3px_0_0_#555] hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#555] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    {running ? "Running..." : "Run Now"}
                </button>
                {result !== null && (
                    <div className="flex items-center gap-3 bg-[#C8F7DC] border-2 border-[#1A1D20] rounded-xl px-4 py-3">
                        <CheckCircle2 className="w-5 h-5 text-green-700 shrink-0" />
                        <span className="text-sm font-black text-[#1a6b3a]">
                            Done — <span className="text-xl">{result}</span> record(s) affected
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Broadcast Panel ─────────────────────────────────────────────────────────
function BroadcastPanel() {
    const alert = useAlert();
    const [target, setTarget] = useState<BroadcastTarget>("ALL");
    const [role, setRole] = useState("");
    const [userIds, setUserIds] = useState("");
    const [type, setType] = useState("");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<BroadcastResultDto | null>(null);

    const handleSend = async () => {
        if (!title.trim()) { alert.error("Title is required."); return; }
        if (target === "ROLE" && !role.trim()) { alert.error("Role is required for ROLE target."); return; }
        if (target === "USERS" && !userIds.trim()) { alert.error("User IDs are required for USERS target."); return; }

        const parsedIds = target === "USERS"
            ? userIds.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
            : undefined;

        setRunning(true);
        setResult(null);
        try {
            const res = await adminSystemOpsApi.broadcastNotification({
                target,
                role: target === "ROLE" ? role.trim() : undefined,
                userIds: parsedIds,
                type: type.trim() || undefined,
                title: title.trim(),
                body: body.trim() || undefined,
            });
            if (res.success) setResult(res.data);
            else alert.error(res.message ?? "Broadcast failed.");
        } catch (e: unknown) {
            alert.error(e instanceof Error ? e.message : "Broadcast failed.");
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="border-4 border-[#1A1D20] rounded-2xl shadow-[4px_4px_0_0_#1A1D20] overflow-hidden">
            <div className="bg-[#e0d4f7] px-5 py-4 flex items-center gap-3 border-b-4 border-[#1A1D20]">
                <Bell className="w-6 h-6 shrink-0" />
                <div>
                    <h3 className="font-black text-lg text-[#1A1D20]">Broadcast Notification</h3>
                    <p className="text-xs font-medium text-[#1A1D20]/70">Send to ALL users, a ROLE group, or specific user IDs</p>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-900 px-5 py-5 space-y-4">
                <div>
                    <label className="block text-xs font-black text-[#1A1D20] dark:text-gray-300 mb-2">Target</label>
                    <div className="flex gap-2">
                        {(["ALL", "ROLE", "USERS"] as BroadcastTarget[]).map(t => (
                            <button
                                key={t}
                                onClick={() => setTarget(t)}
                                className={`px-4 py-1.5 rounded-lg border-2 border-[#1A1D20] text-xs font-black transition-all ${target === t
                                    ? "bg-[#1A1D20] text-white shadow-[2px_2px_0_0_#555]"
                                    : "bg-white dark:bg-gray-800 text-[#1A1D20] dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
                {target === "ROLE" && (
                    <div>
                        <label className="block text-xs font-black text-[#1A1D20] dark:text-gray-300 mb-1">Role *</label>
                        <input
                            value={role}
                            onChange={e => setRole(e.target.value)}
                            placeholder="ADMIN | MENTOR | USER"
                            className="w-full border-2 border-[#1A1D20] rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f7a561] dark:bg-gray-800 dark:text-gray-100"
                        />
                    </div>
                )}
                {target === "USERS" && (
                    <div>
                        <label className="block text-xs font-black text-[#1A1D20] dark:text-gray-300 mb-1">User IDs * (comma-separated)</label>
                        <input
                            value={userIds}
                            onChange={e => setUserIds(e.target.value)}
                            placeholder="1, 2, 3, ..."
                            className="w-full border-2 border-[#1A1D20] rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f7a561] dark:bg-gray-800 dark:text-gray-100"
                        />
                    </div>
                )}
                <div>
                    <label className="block text-xs font-black text-[#1A1D20] dark:text-gray-300 mb-1">Type (optional)</label>
                    <input
                        value={type}
                        onChange={e => setType(e.target.value)}
                        placeholder="SYSTEM | QUEST | STREAK ..."
                        className="w-full border-2 border-[#1A1D20] rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f7a561] dark:bg-gray-800 dark:text-gray-100"
                    />
                </div>
                <div>
                    <label className="block text-xs font-black text-[#1A1D20] dark:text-gray-300 mb-1">Title *</label>
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Notification title..."
                        className="w-full border-2 border-[#1A1D20] rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f7a561] dark:bg-gray-800 dark:text-gray-100"
                    />
                </div>
                <div>
                    <label className="block text-xs font-black text-[#1A1D20] dark:text-gray-300 mb-1">Body (optional)</label>
                    <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        rows={3}
                        placeholder="Notification body text..."
                        className="w-full border-2 border-[#1A1D20] rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f7a561] dark:bg-gray-800 dark:text-gray-100 resize-none"
                    />
                </div>
                <button
                    onClick={handleSend}
                    disabled={running}
                    className="w-full flex items-center justify-center gap-2 bg-[#3b1f6e] text-white font-black text-sm py-2.5 rounded-xl border-2 border-[#1A1D20] shadow-[3px_3px_0_0_#555] hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#555] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                    {running ? "Sending..." : "Broadcast"}
                </button>
                {result && (
                    <div className="grid grid-cols-3 gap-3 bg-[#C8F7DC] border-2 border-[#1A1D20] rounded-xl p-4">
                        <div className="text-center">
                            <div className="text-2xl font-black text-[#1A1D20]">{result.totalRecipients}</div>
                            <div className="text-xs font-bold text-[#1A1D20]/70 mt-0.5">Total Recipients</div>
                        </div>
                        <div className="text-center border-x-2 border-[#1A1D20]/20">
                            <div className="text-2xl font-black text-[#1a6b3a]">{result.notificationsCreated}</div>
                            <div className="text-xs font-bold text-[#1A1D20]/70 mt-0.5">Sent</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-black text-[#8b4513]">{result.skippedByPreference}</div>
                            <div className="text-xs font-bold text-[#1A1D20]/70 mt-0.5">Skipped</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── In-App Single Notification Panel ───────────────────────────────────────
function InAppPanel() {
    const [userId, setUserId] = useState("");
    const [type, setType] = useState("");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<NotificationDto | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const handleSend = async () => {
        const uid = parseInt(userId.trim(), 10);
        if (!userId.trim() || isNaN(uid)) { setErr("Valid User ID is required."); return; }
        if (!title.trim()) { setErr("Title is required."); return; }

        setRunning(true);
        setResult(null);
        setErr(null);
        try {
            const res = await adminSystemOpsApi.createInAppNotification({
                userId: uid,
                type: type.trim() || undefined,
                title: title.trim(),
                body: body.trim() || undefined,
            });
            if (res.success) setResult(res.data);
            else setErr(res.message ?? "Failed to send notification.");
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : "Failed to send notification.");
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="border-4 border-[#1A1D20] rounded-2xl shadow-[4px_4px_0_0_#1A1D20] overflow-hidden">
            <div className="bg-[#fde8c8] px-5 py-4 flex items-center gap-3 border-b-4 border-[#1A1D20]">
                <User className="w-6 h-6 shrink-0" />
                <div>
                    <h3 className="font-black text-lg text-[#1A1D20]">Send In-App Notification</h3>
                    <p className="text-xs font-medium text-[#1A1D20]/70">Direct notification to a single user</p>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-900 px-5 py-5 space-y-4">
                <div>
                    <label className="block text-xs font-black text-[#1A1D20] dark:text-gray-300 mb-1">User ID *</label>
                    <input
                        type="number"
                        value={userId}
                        onChange={e => setUserId(e.target.value)}
                        placeholder="123"
                        className="w-full border-2 border-[#1A1D20] rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f7a561] dark:bg-gray-800 dark:text-gray-100"
                    />
                </div>
                <div>
                    <label className="block text-xs font-black text-[#1A1D20] dark:text-gray-300 mb-1">Type (optional)</label>
                    <input
                        value={type}
                        onChange={e => setType(e.target.value)}
                        placeholder="SYSTEM | QUEST | STREAK ..."
                        className="w-full border-2 border-[#1A1D20] rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f7a561] dark:bg-gray-800 dark:text-gray-100"
                    />
                </div>
                <div>
                    <label className="block text-xs font-black text-[#1A1D20] dark:text-gray-300 mb-1">Title *</label>
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Notification title..."
                        className="w-full border-2 border-[#1A1D20] rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f7a561] dark:bg-gray-800 dark:text-gray-100"
                    />
                </div>
                <div>
                    <label className="block text-xs font-black text-[#1A1D20] dark:text-gray-300 mb-1">Body (optional)</label>
                    <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        rows={3}
                        placeholder="Notification body..."
                        className="w-full border-2 border-[#1A1D20] rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f7a561] dark:bg-gray-800 dark:text-gray-100 resize-none"
                    />
                </div>
                {err && (
                    <div className="flex items-center gap-2 bg-[#FFD6D6] border-2 border-[#1A1D20] rounded-lg px-4 py-2">
                        <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
                        <span className="text-xs font-black text-[#8b0000]">{err}</span>
                    </div>
                )}
                <button
                    onClick={handleSend}
                    disabled={running}
                    className="w-full flex items-center justify-center gap-2 bg-[#e18308] text-white font-black text-sm py-2.5 rounded-xl border-2 border-[#1A1D20] shadow-[3px_3px_0_0_#555] hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#555] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
                    {running ? "Sending..." : "Send Notification"}
                </button>
                {result && (
                    <div className="bg-[#C8F7DC] border-2 border-[#1A1D20] rounded-xl p-4 space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-green-700" />
                            <span className="text-sm font-black text-[#1a6b3a]">Sent Successfully</span>
                        </div>
                        <div className="text-xs font-medium text-[#1A1D20]/80 space-x-2">
                            <span><span className="font-black">ID:</span> {result.notificationId}</span>
                            <span>·</span>
                            <span><span className="font-black">User:</span> {result.userId}</span>
                            <span>·</span>
                            <span><span className="font-black">Type:</span> {result.type}</span>
                        </div>
                        <div className="text-xs font-bold text-[#1A1D20]">{result.title}</div>
                        {result.body && <div className="text-xs text-[#1A1D20]/70">{result.body}</div>}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Proof Override Panel ────────────────────────────────────────────────────
function ProofOverridePanel() {
    const [proofId, setProofId] = useState("");
    const [adminUserId, setAdminUserId] = useState("");
    const [decision, setDecision] = useState<ProofDecision>("approve");
    const [reason, setReason] = useState("");
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<ProofDto | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const handleSubmit = async () => {
        const pid = parseInt(proofId.trim(), 10);
        const aid = parseInt(adminUserId.trim(), 10);
        if (!proofId.trim() || isNaN(pid)) { setErr("Valid Proof ID is required."); return; }
        if (!adminUserId.trim() || isNaN(aid)) { setErr("Valid Admin User ID is required."); return; }

        setRunning(true);
        setResult(null);
        setErr(null);
        try {
            const res = await adminSystemOpsApi.overrideProof(pid, {
                adminUserId: aid,
                decision,
                reason: reason.trim() || undefined,
            });
            if (res.success) setResult(res.data);
            else setErr(res.message ?? "Override failed.");
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : "Override failed.");
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="border-4 border-[#1A1D20] rounded-2xl shadow-[4px_4px_0_0_#1A1D20] overflow-hidden">
            <div className="bg-[#ffd6d6] px-5 py-4 flex items-center gap-3 border-b-4 border-[#1A1D20]">
                <ShieldAlert className="w-6 h-6 shrink-0" />
                <div>
                    <h3 className="font-black text-lg text-[#1A1D20]">Override Proof Verdict</h3>
                    <p className="text-xs font-medium text-[#1A1D20]/70">Admin final verdict — overrides AI/Mentor review</p>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-900 px-5 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-black text-[#1A1D20] dark:text-gray-300 mb-1">Proof ID *</label>
                        <input
                            type="number"
                            value={proofId}
                            onChange={e => setProofId(e.target.value)}
                            placeholder="123"
                            className="w-full border-2 border-[#1A1D20] rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f7a561] dark:bg-gray-800 dark:text-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-[#1A1D20] dark:text-gray-300 mb-1">Admin User ID *</label>
                        <input
                            type="number"
                            value={adminUserId}
                            onChange={e => setAdminUserId(e.target.value)}
                            placeholder="1"
                            className="w-full border-2 border-[#1A1D20] rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f7a561] dark:bg-gray-800 dark:text-gray-100"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-black text-[#1A1D20] dark:text-gray-300 mb-2">Decision</label>
                    <div className="flex gap-2">
                        {(["approve", "reject"] as ProofDecision[]).map(d => (
                            <button
                                key={d}
                                onClick={() => setDecision(d)}
                                className={`flex-1 py-2 rounded-lg border-2 border-[#1A1D20] text-xs font-black transition-all capitalize ${decision === d
                                    ? d === "approve"
                                        ? "bg-[#1a6b3a] text-white shadow-[2px_2px_0_0_#555]"
                                        : "bg-[#8b0000] text-white shadow-[2px_2px_0_0_#555]"
                                    : "bg-white dark:bg-gray-800 text-[#1A1D20] dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                            >
                                {d === "approve" ? "✓ Approve" : "✕ Reject"}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-black text-[#1A1D20] dark:text-gray-300 mb-1">Reason (optional)</label>
                    <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        rows={2}
                        placeholder="Reason shown to player..."
                        className="w-full border-2 border-[#1A1D20] rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f7a561] dark:bg-gray-800 dark:text-gray-100 resize-none"
                    />
                </div>
                {err && (
                    <div className="flex items-center gap-2 bg-[#FFD6D6] border-2 border-[#1A1D20] rounded-lg px-4 py-2">
                        <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
                        <span className="text-xs font-black text-[#8b0000]">{err}</span>
                    </div>
                )}
                <button
                    onClick={handleSubmit}
                    disabled={running}
                    className={`w-full flex items-center justify-center gap-2 text-white font-black text-sm py-2.5 rounded-xl border-2 border-[#1A1D20] shadow-[3px_3px_0_0_#555] hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#555] transition-all disabled:opacity-60 disabled:cursor-not-allowed ${decision === "approve" ? "bg-[#1a6b3a]" : "bg-[#8b0000]"}`}
                >
                    {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                    {running ? "Overriding..." : `Override — ${decision}`}
                </button>
                {result && (
                    <div className="bg-[#C8F7DC] border-2 border-[#1A1D20] rounded-xl p-4 space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 className="w-4 h-4 text-green-700" />
                            <span className="text-sm font-black text-[#1a6b3a]">Override Applied</span>
                        </div>
                        <div className="text-xs font-medium text-[#1A1D20]/80 space-x-2">
                            <span><span className="font-black">Proof:</span> #{result.proofId}</span>
                            <span>·</span>
                            <span><span className="font-black">Status:</span> {result.status}</span>
                            <span>·</span>
                            <span><span className="font-black">Route:</span> {result.reviewRoute}</span>
                        </div>
                        {result.questTitle && (
                            <div className="text-xs text-[#1A1D20]/70">Quest: {result.questTitle}</div>
                        )}
                        {result.rejectReason && (
                            <div className="text-xs text-[#1A1D20]/70">Reason: {result.rejectReason}</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Shared HP Panel ─────────────────────────────────────────────────────────
function SharedHpPanel() {
    const [raidId, setRaidId] = useState("");
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const [running, setRunning] = useState<"penalty" | "restore" | null>(null);
    const [result, setResult] = useState<SharedHpDto | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const handleAction = async (action: "penalty" | "restore") => {
        const rid = parseInt(raidId.trim(), 10);
        if (!raidId.trim() || isNaN(rid)) { setErr("Valid Raid ID is required."); return; }

        const parsedAmount = amount.trim() ? parseInt(amount.trim(), 10) : undefined;
        if (amount.trim() && isNaN(parsedAmount!)) { setErr("Amount must be a valid number."); return; }

        setRunning(action);
        setResult(null);
        setErr(null);
        try {
            const payload = { amount: parsedAmount, reason: reason.trim() || undefined };
            const res = action === "penalty"
                ? await adminSystemOpsApi.applyHpPenalty(rid, payload)
                : await adminSystemOpsApi.restoreHp(rid, payload);
            if (res.success) setResult(res.data);
            else setErr(res.message ?? `${action} failed.`);
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : `${action} failed.`);
        } finally {
            setRunning(null);
        }
    };

    const RISK_COLOR: Record<string, string> = {
        SAFE: "text-[#1a6b3a]",
        LOW: "text-[#3a7a1a]",
        MEDIUM: "text-[#e18308]",
        HIGH: "text-[#c45000]",
        WIPED: "text-[#8b0000]",
    };

    return (
        <div className="border-4 border-[#1A1D20] rounded-2xl shadow-[4px_4px_0_0_#1A1D20] overflow-hidden">
            <div className="bg-[#d4eeff] px-5 py-4 flex items-center gap-3 border-b-4 border-[#1A1D20]">
                <HeartPulse className="w-6 h-6 shrink-0" />
                <div>
                    <h3 className="font-black text-lg text-[#1A1D20]">Shared HP Management</h3>
                    <p className="text-xs font-medium text-[#1A1D20]/70">Manually apply penalty or restore HP for a raid</p>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-900 px-5 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-black text-[#1A1D20] dark:text-gray-300 mb-1">Raid ID *</label>
                        <input
                            type="number"
                            value={raidId}
                            onChange={e => setRaidId(e.target.value)}
                            placeholder="123"
                            className="w-full border-2 border-[#1A1D20] rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f7a561] dark:bg-gray-800 dark:text-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-[#1A1D20] dark:text-gray-300 mb-1">Amount (optional)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="default"
                            className="w-full border-2 border-[#1A1D20] rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f7a561] dark:bg-gray-800 dark:text-gray-100"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-black text-[#1A1D20] dark:text-gray-300 mb-1">Reason (optional)</label>
                    <input
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Admin manual adjustment..."
                        className="w-full border-2 border-[#1A1D20] rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f7a561] dark:bg-gray-800 dark:text-gray-100"
                    />
                </div>
                {err && (
                    <div className="flex items-center gap-2 bg-[#FFD6D6] border-2 border-[#1A1D20] rounded-lg px-4 py-2">
                        <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
                        <span className="text-xs font-black text-[#8b0000]">{err}</span>
                    </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => handleAction("penalty")}
                        disabled={running !== null}
                        className="flex items-center justify-center gap-2 bg-[#8b0000] text-white font-black text-sm py-2.5 rounded-xl border-2 border-[#1A1D20] shadow-[3px_3px_0_0_#555] hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#555] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {running === "penalty" ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingDown className="w-4 h-4" />}
                        {running === "penalty" ? "Applying..." : "Penalty"}
                    </button>
                    <button
                        onClick={() => handleAction("restore")}
                        disabled={running !== null}
                        className="flex items-center justify-center gap-2 bg-[#1a6b3a] text-white font-black text-sm py-2.5 rounded-xl border-2 border-[#1A1D20] shadow-[3px_3px_0_0_#555] hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#555] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {running === "restore" ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                        {running === "restore" ? "Restoring..." : "Restore"}
                    </button>
                </div>
                {result && (
                    <div className="bg-[#C8F7DC] border-2 border-[#1A1D20] rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-700" />
                                <span className="text-sm font-black text-[#1a6b3a]">Updated</span>
                            </div>
                            <span className={`text-xs font-black uppercase ${RISK_COLOR[result.riskLevel] ?? "text-[#1A1D20]"}`}>
                                {result.riskLevel}
                            </span>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-medium text-[#1A1D20]/80">
                                <span>Shared HP</span>
                                <span className="font-black">{result.sharedHpCurrent} / {result.sharedHpMax}</span>
                            </div>
                            <div className="w-full h-3 bg-[#1A1D20]/10 rounded-full overflow-hidden border border-[#1A1D20]/20">
                                <div
                                    className={`h-full rounded-full transition-all ${result.riskLevel === "WIPED" ? "bg-[#8b0000]" : result.riskLevel === "HIGH" ? "bg-[#c45000]" : result.riskLevel === "MEDIUM" ? "bg-[#e18308]" : "bg-[#1a6b3a]"}`}
                                    style={{ width: `${Math.min(100, Math.max(0, Number(result.percentage)))}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-[#1A1D20]/60">
                                <span>Raid #{result.raidId} · Party #{result.partyId}</span>
                                <span>{Number(result.percentage).toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
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
                    <div className="p-2 bg-[#fde8c8] border-2 border-[#1A1D20] rounded-xl shadow-[3px_3px_0_0_#1A1D20]">
                        <Zap className="w-6 h-6 text-[#e18308]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-[#1A1D20] dark:text-gray-100">System Operations</h1>
                        <p className="text-sm text-[#1A1D20]/60 dark:text-gray-400 font-medium">
                            Trigger daily tasks and send notifications
                        </p>
                    </div>
                </div>

                <section>
                    <div className="flex items-center gap-2 mb-5">
                        <div className="h-px flex-1 bg-[#1A1D20]/20 dark:bg-gray-600" />
                        <span className="text-[10px] font-black text-[#1A1D20]/50 dark:text-gray-400 uppercase tracking-widest px-2">
                            Daily Tasks
                        </span>
                        <div className="h-px flex-1 bg-[#1A1D20]/20 dark:bg-gray-600" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DailyTaskPanel
                            icon={<Flame className="w-6 h-6 text-[#e18308]" />}
                            title="Spawn Daily Monsters"
                            subtitle="POST /api/admin/daily-monsters/spawn"
                            accentBg="bg-[#fde8c8]"
                            onRun={spawnMonsters}
                        />
                        <DailyTaskPanel
                            icon={<RotateCcw className="w-6 h-6 text-[#1a6b3a]" />}
                            title="Finalize Daily Streak"
                            subtitle="POST /api/admin/daily-streak/finalize"
                            accentBg="bg-[#C8F7DC]"
                            onRun={finalizeStreak}
                        />
                    </div>
                </section>

                <section>
                    <div className="flex items-center gap-2 mb-5">
                        <div className="h-px flex-1 bg-[#1A1D20]/20 dark:bg-gray-600" />
                        <span className="text-[10px] font-black text-[#1A1D20]/50 dark:text-gray-400 uppercase tracking-widest px-2">
                            Notifications
                        </span>
                        <div className="h-px flex-1 bg-[#1A1D20]/20 dark:bg-gray-600" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <BroadcastPanel />
                        <InAppPanel />
                    </div>
                </section>

                <section>
                    <div className="flex items-center gap-2 mb-5">
                        <div className="h-px flex-1 bg-[#1A1D20]/20 dark:bg-gray-600" />
                        <span className="text-[10px] font-black text-[#1A1D20]/50 dark:text-gray-400 uppercase tracking-widest px-2">
                            Proof & Raid Management
                        </span>
                        <div className="h-px flex-1 bg-[#1A1D20]/20 dark:bg-gray-600" />
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

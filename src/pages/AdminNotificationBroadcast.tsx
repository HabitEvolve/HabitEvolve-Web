import { useState } from "react";
import { Megaphone, Send, Loader2 } from "lucide-react";
import { useAlert } from "../context/AlertContext";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { notificationApi } from "../api/notificationApi";
import type { BroadcastPayload, BroadcastTarget, BroadcastResultDto } from "../types/notification.types";

const btnBase =
  "inline-flex items-center gap-2 px-4 py-2 font-black text-sm border-2 border-black rounded-full " +
  "shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 " +
  "disabled:shadow-[3px_3px_0_0_#1A1D20] transition-all";

const inputCls =
  "w-full px-4 py-2.5 border-2 border-black dark:border-gray-600 rounded-2xl text-sm font-medium " +
  "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 " +
  "focus:outline-none focus:ring-2 focus:ring-orange-300 dark:focus:ring-orange-600 " +
  "placeholder:text-gray-400 dark:placeholder:text-gray-500";

const errMsg = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? undefined;

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">{children}</p>
);

const ROLES = ["PLAYER", "MENTOR", "ADMIN"];
const NOTIF_TYPES = ["SYSTEM", "ANNOUNCEMENT", "EVENT", "MAINTENANCE"];

export default function AdminNotificationBroadcast() {
  const globalAlert = useAlert();
  const [form, setForm] = useState<BroadcastPayload>({
    target: "ALL", role: "PLAYER", userIds: [], type: "ANNOUNCEMENT", title: "", body: "",
  });
  const [userIdsInput, setUserIdsInput] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<BroadcastResultDto | null>(null);

  const setTarget = (target: BroadcastTarget) => setForm(f => ({ ...f, target }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) { setErr("Title and message are required."); return; }
    setErr(null);
    setResult(null);
    const payload: BroadcastPayload = { ...form };
    if (form.target === "USERS") {
      payload.userIds = userIdsInput.split(",").map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
      if (payload.userIds.length === 0) { setErr("Enter at least one valid user ID."); return; }
    }
    if (form.target !== "ROLE") delete payload.role;
    if (form.target !== "USERS") delete payload.userIds;

    setSending(true);
    try {
      const res = await notificationApi.broadcast(payload);
      if (res.success && res.data) {
        setResult(res.data);
        globalAlert.success(`Broadcast sent to ${res.data.notificationsCreated} recipient(s).`);
      } else {
        setErr(res.message ?? "Broadcast failed.");
      }
    } catch (ex) {
      setErr(errMsg(ex) ?? "Broadcast failed.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageMeta title="Notification Broadcast" description="Send in-app notifications to all users, a role, or specific users." />
      <PageBreadcrumb pageTitle="Notification Broadcast" />

      <div className="max-w-2xl space-y-6 p-1">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-300 border-2 border-black flex items-center justify-center shadow-[3px_3px_0_0_#1A1D20] shrink-0">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Notification Broadcast</h1>
            <p className="text-sm text-gray-500 font-medium mt-0.5">Compose and send an in-app notification.</p>
          </div>
        </div>

        <form onSubmit={submit} className="bg-white dark:bg-[#1e2a3a] border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] p-6 space-y-4">
          <div>
            <Label>Target Audience</Label>
            <div className="flex gap-2">
              {(["ALL", "ROLE", "USERS"] as BroadcastTarget[]).map(target => (
                <button key={target} type="button" onClick={() => setTarget(target)}
                  className={`flex-1 py-2.5 border-2 rounded-2xl font-black text-sm transition-all ${form.target === target
                    ? "bg-orange-200 border-orange-500 text-orange-900"
                    : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400"}`}>
                  {target === "ALL" ? "All Users" : target === "ROLE" ? "By Role" : "Specific Users"}
                </button>
              ))}
            </div>
          </div>

          {form.target === "ROLE" && (
            <div>
              <Label>Role</Label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={inputCls}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}

          {form.target === "USERS" && (
            <div>
              <Label>User IDs (comma-separated)</Label>
              <input value={userIdsInput} onChange={e => setUserIdsInput(e.target.value)} className={inputCls} placeholder="e.g. 1,2,3" />
            </div>
          )}

          <div>
            <Label>Notification Type</Label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inputCls}>
              {NOTIF_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <Label>Title *</Label>
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="e.g. Scheduled maintenance tonight" />
          </div>

          <div>
            <Label>Message *</Label>
            <textarea required value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={4} className={`${inputCls} resize-none`} placeholder="Notification body shown to users…" />
          </div>

          {err && <p className="text-xs font-bold text-red-600 bg-red-50 border-2 border-red-300 rounded-xl px-3 py-2">{err}</p>}

          {result && (
            <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-400 rounded-2xl px-4 py-3 text-sm font-bold text-green-800 dark:text-green-300">
              Sent to {result.target} — {result.totalRecipients} recipient(s) targeted, {result.notificationsCreated} notification(s) created
              {result.skippedByPreference > 0 && `, ${result.skippedByPreference} skipped by preference`}.
            </div>
          )}

          <button type="submit" disabled={sending} className={`${btnBase} w-full justify-center bg-orange-300 text-gray-900`}>
            {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><Send className="w-4 h-4" /> Send Broadcast</>}
          </button>
        </form>
      </div>
    </>
  );
}

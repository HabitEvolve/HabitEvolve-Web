import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";
import { Megaphone, Bell, Mail, Smartphone } from "lucide-react";
import { useAlert } from "../../../context/AlertContext";
import partyReminderApi from "../../../api/partyReminderApi";
import PartyChatDrawer from "../../../components/chat/PartyChatDrawer";
import SkyCard from "../../../components/ui/card/SkyCard";
import SkyButton from "../../../components/ui/button/SkyButton";
import { getMentorId, Spinner } from "./sharedSky";
import type { PartyWorkspaceContext } from "./PartyWorkspace";
import type { SharedHpDto, PartyReminderSettingDto, ReminderDispatchResultDto } from "../../../types/mentor.types";

// ── GUILD RALLY (extracted, now embedded as its own tab) ─────────────────────
const RISK_STYLES: Record<string, { bar: string; badge: string }> = {
  SAFE:   { bar: "bg-success-500", badge: "bg-success-100 text-success-800" },
  LOW:    { bar: "bg-blue-500",    badge: "bg-blue-100 text-blue-800" },
  MEDIUM: { bar: "bg-warning-400", badge: "bg-warning-100 text-warning-800" },
  HIGH:   { bar: "bg-orange-500",  badge: "bg-orange-100 text-orange-800" },
  WIPED:  { bar: "bg-error-600",   badge: "bg-error-100 text-error-800" },
};

// Each "template" is flavor text for one of the 4 real dispatch categories the
// backend actually supports — there is no free-text/custom-message endpoint,
// so clicking a card dispatches that exact type immediately (no textarea).
const RALLY_TEMPLATES: { type: string; iconSrc: string; title: string; flavor: string; tint: string }[] = [
  { type: "WEEKLY_BOSS",    iconSrc: "/icon/Item/Sword/64px/Sword 1st 64px.png",   title: "Boss Alert",     flavor: "Sắp hết giờ diệt Boss! Dậy làm quest đi các đồng chí!", tint: "bg-error-50 border-error-300" },
  { type: "ALL",            iconSrc: "/icon/Item/Shield/64px/Shield 1st 64px.png", title: "All-Hands Rally", flavor: "Shared HP đang giảm mạnh, cứu team cứu team!", tint: "bg-orange-50 border-orange-300" },
  { type: "QUEST_DEADLINE", iconSrc: "/icon/Item/Clock/64px/Clock 1st 64px.png",   title: "Deadline Ping",   flavor: "Nhiệm vụ sắp hết hạn — đừng để cả team gánh hộ!", tint: "bg-warning-50 border-warning-300" },
  { type: "DAILY",          iconSrc: "/icon/Main/Star/64px/Golden Star 1st 64px.png", title: "Daily Nudge",  flavor: "Điểm danh thói quen hôm nay chưa nào, chiến binh?", tint: "bg-brand-50 border-brand-300" },
];

const DAY_NAMES = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

const DEFAULT_REMINDER_SETTINGS: PartyReminderSettingDto = {
  partyId: 0,
  questDeadline2hEnabled: true,
  questDeadline30mEnabled: true,
  dailyReminderEnabled: true,
  dailyReminderHour: 20,
  weeklyBossReminderEnabled: true,
  weeklyBossReminderDay: 0,
  weeklyBossReminderHour: 18,
  sendInApp: true,
  sendPush: true,
  sendEmail: false,
  sendPartyChat: true,
};

const RallyToggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none ${checked ? "bg-sky-deep" : "bg-gray-200"}`}
  >
    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow translate-y-0.5 transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
  </button>
);

const RallyCheckbox = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode }) => (
  <label className="flex items-center gap-2 cursor-pointer select-none">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 rounded accent-sky-deep"
    />
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-ink-2">{label}</span>
  </label>
);

export default function RallyTab() {
  const { party, partyId } = useOutletContext<PartyWorkspaceContext>();
  const { t } = useTranslation();
  const notify = useAlert();

  const [chatOpen, setChatOpen] = useState(false);

  const [rallyRisk, setRallyRisk] = useState<SharedHpDto | null>(null);
  const [rallyRiskLoading, setRallyRiskLoading] = useState(false);
  const [rallyRiskError, setRallyRiskError] = useState<string | null>(null);
  const [rallySettings, setRallySettings] = useState<PartyReminderSettingDto>(DEFAULT_REMINDER_SETTINGS);
  const [rallySettingsLoading, setRallySettingsLoading] = useState(false);
  const [rallySaving, setRallySaving] = useState(false);
  const [rallyDispatching, setRallyDispatching] = useState<string | null>(null);
  const [rallyResult, setRallyResult] = useState<ReminderDispatchResultDto | null>(null);
  const [showRallySchedule, setShowRallySchedule] = useState(false);

  const loadRallyData = useCallback(async () => {
    setRallyRiskLoading(true);
    setRallySettingsLoading(true);
    setRallyRisk(null);
    setRallyRiskError(null);
    setRallyResult(null);

    const [riskRes, settingsRes] = await Promise.allSettled([
      partyReminderApi.getPartyRisk(partyId),
      partyReminderApi.getReminderSettings(partyId),
    ]);

    if (riskRes.status === "fulfilled" && riskRes.value.success) {
      setRallyRisk(riskRes.value.data ?? null);
    } else {
      const msg =
        riskRes.status === "rejected"
          ? (riskRes.reason as any)?.response?.data?.message
          : riskRes.value.message;
      setRallyRiskError(msg || t("mentor.partyReminder.noActiveRaid"));
    }

    if (settingsRes.status === "fulfilled" && settingsRes.value.success) {
      setRallySettings(settingsRes.value.data ?? { ...DEFAULT_REMINDER_SETTINGS, partyId });
    } else {
      setRallySettings({ ...DEFAULT_REMINDER_SETTINGS, partyId });
    }

    setRallyRiskLoading(false);
    setRallySettingsLoading(false);
  }, [partyId, t]);

  useEffect(() => { loadRallyData(); }, [loadRallyData]);

  const handleSaveRallySettings = async () => {
    setRallySaving(true);
    try {
      const res = await partyReminderApi.updateReminderSettings(
        partyId,
        { mentorUserId: getMentorId(), ...rallySettings }
      );
      if (res.success) {
        notify.success(t("mentor.partyReminder.saveSuccess"));
        if (res.data) setRallySettings(res.data);
      } else {
        notify.error(res.message || t("mentor.partyReminder.saveFailed"));
      }
    } catch (err: any) {
      notify.error(err?.response?.data?.message || t("mentor.partyReminder.saveFailed"));
    } finally {
      setRallySaving(false);
    }
  };

  const handleDispatchRally = async (reminderType: string) => {
    setRallyDispatching(reminderType);
    setRallyResult(null);
    try {
      const res = await partyReminderApi.dispatchReminders(partyId, reminderType);
      if (res.success && res.data) {
        setRallyResult(res.data);
        notify.success(t("mentor.partyReminder.dispatchSuccess"));
      } else {
        notify.error(res.message || t("mentor.partyReminder.dispatchFailed"));
      }
    } catch (err: any) {
      notify.error(err?.response?.data?.message || t("mentor.partyReminder.dispatchFailed"));
    } finally {
      setRallyDispatching(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Party Chat — same createPortal drawer as before, just triggered from here now */}
      <div className="flex items-center justify-between gap-4 p-5 bg-brand-50 border border-brand-200 rounded-sky-card shadow-sky-tint">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-sky-ink flex items-center gap-2">
            <img src="/icon/UI/Chat/64w/Chat 1st 64px.png" alt="" className="w-5 h-5 object-contain" />
            {t("admin.partyManagement.openChat")}
          </h2>
          <p className="text-xs text-sky-ink-2 font-medium mt-0.5">{party.name}</p>
        </div>
        <SkyButton type="button" variant="secondary" onClick={() => setChatOpen(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {t("admin.partyManagement.openChat")}
        </SkyButton>
      </div>

      <SkyCard variant="mentor" className="p-6 sm:p-7">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-sky-ink flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-sky-deep" aria-hidden="true" />
            {t("mentor.partyReminder.guildRally")}
          </h2>
          {(rallyRiskLoading || rallySettingsLoading) && <Spinner size={16} />}
        </div>
        <p className="text-xs text-sky-ink-2 font-medium mb-5">
          {t("mentor.partyReminder.guildRallySubtitle")}
        </p>

        {rallyRiskLoading ? (
          <div className="flex items-center justify-center py-6 text-sky-ink-3">
            <Spinner size={22} />
          </div>
        ) : rallyRiskError ? (
          <div className="inline-flex items-center gap-2 p-3 mb-5 bg-warning-50 border border-warning-300 rounded-sky-chip text-sm font-medium text-warning-700">
            <img src="/icon/UI/Info/64px/Info 1st 64px.png" alt="" className="w-4 h-4 object-contain" /> {rallyRiskError}
          </div>
        ) : rallyRisk ? (
          <div className="mb-5">
            <div className="flex justify-between text-xs font-semibold mb-1.5 text-sky-ink">
              <span>Shared HP</span>
              <span>{rallyRisk.sharedHpCurrent} / {rallyRisk.sharedHpMax}</span>
            </div>
            <div className="h-4 bg-sky-3/20 rounded-full overflow-hidden">
              <div
                className={`h-full ${(RISK_STYLES[rallyRisk.riskLevel] ?? RISK_STYLES.SAFE).bar} transition-all duration-700`}
                style={{ width: `${rallyRisk.sharedHpMax > 0 ? Math.max(0, Math.min((rallyRisk.sharedHpCurrent / rallyRisk.sharedHpMax) * 100, 100)) : 0}%` }}
              />
            </div>
            <span className={`inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full ${(RISK_STYLES[rallyRisk.riskLevel] ?? RISK_STYLES.SAFE).badge}`}>
              {t("mentor.partyReminder.riskLevel")}: {rallyRisk.riskLevel}
            </span>
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
          {RALLY_TEMPLATES.map((tpl) => (
            <button
              key={tpl.type}
              type="button"
              onClick={() => handleDispatchRally(tpl.type)}
              disabled={rallyDispatching !== null}
              className={`text-left p-4 border ${tpl.tint} rounded-sky-chip hover:shadow-sky-chip disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 font-semibold text-sm text-sky-ink">
                  <img src={tpl.iconSrc} alt="" className="w-4 h-4 object-contain" /> {tpl.title}
                </span>
                {rallyDispatching === tpl.type && <Spinner size={14} />}
              </div>
              <p className="text-xs text-sky-ink-2 font-medium leading-relaxed">{tpl.flavor}</p>
            </button>
          ))}
        </div>

        {rallyResult && (
          <div className="mt-4 p-4 bg-success-100 border border-success-400 rounded-sky-chip space-y-2">
            <p className="inline-flex items-center gap-1.5 font-bold text-success-800">
              <img src="/icon/UI/Checkmark/64px/Checkmark 1st 64px.png" alt="" className="w-4 h-4 object-contain" /> {t("mentor.partyReminder.dispatchSuccess")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              {[
                [t("mentor.partyReminder.type"), rallyResult.reminderType],
                [t("mentor.partyReminder.notifications"), rallyResult.notificationsCreated],
                [t("mentor.partyReminder.chatMessages"), rallyResult.chatMessagesCreated],
              ].map(([k, v]) => (
                <div key={String(k)} className="bg-white/60 rounded-lg p-2.5 border border-success-200">
                  <p className="text-sky-ink-2">{k}</p>
                  <p className="font-bold text-sky-ink">{v}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowRallySchedule((v) => !v)}
          className="mt-5 text-xs font-semibold text-sky-ink-2 hover:text-sky-ink inline-flex items-center gap-1.5"
        >
          <span className={`transition-transform duration-150 ${showRallySchedule ? "rotate-90" : ""}`}>▸</span>
          <img src="/icon/Main/Settings/64px/Settings 1 1st 64px.png" alt="" className="w-3.5 h-3.5 object-contain" /> {t("mentor.partyReminder.autoRallySchedule")}
        </button>

        {showRallySchedule && (
          <div className="mt-3 p-4 border border-dashed border-sky-ink/15 rounded-sky-card space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-sky-ink-2 mb-2">
                {t("mentor.partyReminder.questDeadline")}
              </p>
              <div className="space-y-2">
                <RallyCheckbox
                  checked={rallySettings.questDeadline2hEnabled}
                  onChange={(v) => setRallySettings((s) => ({ ...s, questDeadline2hEnabled: v }))}
                  label={t("mentor.partyReminder.remind2h")}
                />
                <RallyCheckbox
                  checked={rallySettings.questDeadline30mEnabled}
                  onChange={(v) => setRallySettings((s) => ({ ...s, questDeadline30mEnabled: v }))}
                  label={t("mentor.partyReminder.remind30m")}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-sky-ink-2">
                  {t("mentor.partyReminder.dailyReminder")}
                </p>
                <RallyToggle
                  checked={rallySettings.dailyReminderEnabled}
                  onChange={(v) => setRallySettings((s) => ({ ...s, dailyReminderEnabled: v }))}
                />
              </div>
              {rallySettings.dailyReminderEnabled && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-sky-ink-2">{t("mentor.partyReminder.hour")}</label>
                  <select
                    value={rallySettings.dailyReminderHour}
                    onChange={(e) => setRallySettings((s) => ({ ...s, dailyReminderHour: parseInt(e.target.value) }))}
                    className="px-2 py-1 rounded-lg border border-sky-surf-border text-sm font-medium bg-transparent text-sky-ink focus:outline-none focus:ring-2 focus:ring-sky-deep/30"
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{String(h).padStart(2, "0")}:00 UTC</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-sky-ink-2">
                  {t("mentor.partyReminder.weeklyBossReminder")}
                </p>
                <RallyToggle
                  checked={rallySettings.weeklyBossReminderEnabled}
                  onChange={(v) => setRallySettings((s) => ({ ...s, weeklyBossReminderEnabled: v }))}
                />
              </div>
              {rallySettings.weeklyBossReminderEnabled && (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-sky-ink-2">{t("mentor.partyReminder.day")}</label>
                    <select
                      value={rallySettings.weeklyBossReminderDay}
                      onChange={(e) => setRallySettings((s) => ({ ...s, weeklyBossReminderDay: parseInt(e.target.value) }))}
                      className="px-2 py-1 rounded-lg border border-sky-surf-border text-sm font-medium bg-transparent text-sky-ink focus:outline-none focus:ring-2 focus:ring-sky-deep/30"
                    >
                      {DAY_NAMES.map((day, i) => (
                        <option key={i} value={i}>{day}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-sky-ink-2">{t("mentor.partyReminder.hour")}</label>
                    <select
                      value={rallySettings.weeklyBossReminderHour}
                      onChange={(e) => setRallySettings((s) => ({ ...s, weeklyBossReminderHour: parseInt(e.target.value) }))}
                      className="px-2 py-1 rounded-lg border border-sky-surf-border text-sm font-medium bg-transparent text-sky-ink focus:outline-none focus:ring-2 focus:ring-sky-deep/30"
                    >
                      {Array.from({ length: 24 }, (_, h) => (
                        <option key={h} value={h}>{String(h).padStart(2, "0")}:00 UTC</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-sky-ink-2 mb-2">
                {t("mentor.partyReminder.channels")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <RallyCheckbox checked={rallySettings.sendInApp} onChange={(v) => setRallySettings((s) => ({ ...s, sendInApp: v }))} label={<><Smartphone className="w-4 h-4" aria-hidden="true" /> In-App</>} />
                <RallyCheckbox checked={rallySettings.sendPush} onChange={(v) => setRallySettings((s) => ({ ...s, sendPush: v }))} label={<><Bell className="w-4 h-4" aria-hidden="true" /> Push</>} />
                <RallyCheckbox checked={rallySettings.sendEmail} onChange={(v) => setRallySettings((s) => ({ ...s, sendEmail: v }))} label={<><Mail className="w-4 h-4" aria-hidden="true" /> Email</>} />
                <RallyCheckbox checked={rallySettings.sendPartyChat} onChange={(v) => setRallySettings((s) => ({ ...s, sendPartyChat: v }))} label={<><img src="/icon/UI/Chat/64w/Chat 1st 64px.png" alt="" className="w-4 h-4 object-contain" /> Party Chat</>} />
              </div>
            </div>

            <SkyButton type="button" variant="primary" onClick={handleSaveRallySettings} disabled={rallySaving} className="w-full">
              {rallySaving ? (
                <><Spinner size={16} /> {t("mentor.partyReminder.saving")}</>
              ) : (
                <><img src="/icon/Main/Save/64w/Save 1st 64px.png" alt="" className="w-4 h-4 object-contain" /> {t("mentor.partyReminder.saveBtn")}</>
              )}
            </SkyButton>
          </div>
        )}
      </SkyCard>

      <PartyChatDrawer
        partyId={partyId}
        partyName={party.name}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </div>
  );
}

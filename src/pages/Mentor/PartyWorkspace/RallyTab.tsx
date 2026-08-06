import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Megaphone, Bell, Mail, Smartphone, MessageSquare, Info, Check, ChevronRight,
  Settings, Save, Swords, Shield, Clock, Star, AlertTriangle,
} from "lucide-react";
import { useAlert } from "../../../context/AlertContext";
import partyReminderApi from "../../../api/partyReminderApi";
import PartyChatDrawer from "../../../components/chat/PartyChatDrawer";
import SkyCard from "../../../components/ui/card/SkyCard";
import SkyButton from "../../../components/ui/button/SkyButton";
import { getMentorId, Spinner } from "./sharedSky";
import type { PartyWorkspaceContext } from "./PartyWorkspace";
import type { SharedHpDto, PartyReminderSettingDto, ReminderDispatchResultDto } from "../../../types/mentor.types";

const eyebrow = "text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3";

// ── GUILD RALLY (extracted, now embedded as its own tab) ─────────────────────
// Party HP is an ordered ramp, calm → hot: teal is the only genuinely safe end,
// deep/peach carry the middle, and rose is held back for WIPED so the ramp never
// spends its loudest hue early. Each level also gets a glyph, so risk is never
// communicated by colour alone.
const RISK_STYLES: Record<string, { bar: string; badge: string; icon: React.ReactNode }> = {
  SAFE:   { bar: "bg-sky-teal",     badge: "sky-badge-success", icon: <Check className="w-3 h-3" /> },
  LOW:    { bar: "bg-sky-deep",     badge: "sky-badge-info",    icon: <Info className="w-3 h-3" /> },
  MEDIUM: { bar: "bg-sky-peach",    badge: "sky-badge-pending", icon: <AlertTriangle className="w-3 h-3" /> },
  HIGH:   { bar: "bg-sky-dmg",      badge: "sky-badge-pending", icon: <AlertTriangle className="w-3 h-3" /> },
  WIPED:  { bar: "bg-sky-rose",     badge: "sky-badge-danger",  icon: <AlertTriangle className="w-3 h-3" /> },
};

// Each "template" is flavor text for one of the 4 real dispatch categories the
// backend actually supports — there is no free-text/custom-message endpoint,
// so clicking a card dispatches that exact type immediately (no textarea).
// Tints are a taxonomy, not a severity ramp: boss=damage, all-hands=peach,
// deadline=violet, daily=deep. None borrows teal (success) or rose (destructive).
const RALLY_TEMPLATES: {
  type: string; icon: React.ReactNode; title: string; flavor: string; tint: string; accent: string;
}[] = [
  { type: "WEEKLY_BOSS",    icon: <Swords className="w-4 h-4" />, title: "Boss Alert",      flavor: "Sắp hết giờ diệt Boss! Dậy làm quest đi các đồng chí!", tint: "bg-sky-dmg/10 ring-sky-dmg/25",       accent: "text-sky-dmg-deep" },
  { type: "ALL",            icon: <Shield className="w-4 h-4" />, title: "All-Hands Rally", flavor: "Shared HP đang giảm mạnh, cứu team cứu team!",           tint: "bg-sky-peach/14 ring-sky-peach/28",   accent: "text-sky-peach-deep" },
  { type: "QUEST_DEADLINE", icon: <Clock className="w-4 h-4" />,  title: "Deadline Ping",   flavor: "Nhiệm vụ sắp hết hạn — đừng để cả team gánh hộ!",        tint: "bg-sky-violet/12 ring-sky-violet/26", accent: "text-sky-violet-deep" },
  { type: "DAILY",          icon: <Star className="w-4 h-4" />,   title: "Daily Nudge",     flavor: "Điểm danh thói quen hôm nay chưa nào, chiến binh?",      tint: "bg-sky-deep/10 ring-sky-deep/24",     accent: "text-sky-deep" },
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
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none ${checked ? "bg-sky-deep" : "bg-sky-ink/14"}`}
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
      <div className="relative flex items-center justify-between gap-4 overflow-hidden rounded-sky-card sky-glass p-5">
        <span className="absolute left-0 top-0 bottom-0 w-1 bg-linear-to-b from-sky-deep-lo to-sky-deep" aria-hidden="true" />
        <div className="relative flex items-center gap-3 min-w-0">
          <span className="grid place-items-center w-10 h-10 shrink-0 rounded-sky-chip bg-sky-deep/10 ring-1 ring-sky-deep/18 text-sky-deep">
            <MessageSquare className="w-5 h-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold text-sky-ink truncate">
              {t("admin.partyManagement.openChat")}
            </h2>
            <p className="text-xs text-sky-ink-2 font-medium mt-0.5 truncate">{party.name}</p>
          </div>
        </div>
        <SkyButton type="button" variant="secondary" onClick={() => setChatOpen(true)} className="relative shrink-0">
          <MessageSquare className="w-4 h-4" aria-hidden="true" />
          {t("admin.partyManagement.openChat")}
        </SkyButton>
      </div>

      <SkyCard variant="mentor" className="p-6 sm:p-7">
        <div className="relative flex items-center justify-between gap-3 mb-1">
          <h2 className="inline-flex items-center gap-2 font-display text-base font-semibold text-sky-ink">
            <Megaphone className="w-5 h-5 text-sky-deep" aria-hidden="true" />
            {t("mentor.partyReminder.guildRally")}
          </h2>
          {(rallyRiskLoading || rallySettingsLoading) && <Spinner size={16} />}
        </div>
        <p className="relative text-xs text-sky-ink-2 font-medium mb-5">
          {t("mentor.partyReminder.guildRallySubtitle")}
        </p>

        {rallyRiskLoading ? (
          <div className="relative flex items-center justify-center py-6 text-sky-ink-3">
            <Spinner size={22} />
          </div>
        ) : rallyRiskError ? (
          <div className="relative inline-flex items-center gap-2 mb-5 rounded-sky-chip bg-sky-peach/14 ring-1 ring-sky-peach/28 px-3 py-2.5 text-sm font-medium text-sky-peach-deep">
            <Info className="w-4 h-4 shrink-0" aria-hidden="true" /> {rallyRiskError}
          </div>
        ) : rallyRisk ? (
          <div className="relative mb-5 rounded-sky-chip bg-white/50 ring-1 ring-white/70 px-4 py-3.5">
            {(() => {
              const risk = RISK_STYLES[rallyRisk.riskLevel] ?? RISK_STYLES.SAFE;
              const pct = rallyRisk.sharedHpMax > 0
                ? Math.max(0, Math.min((rallyRisk.sharedHpCurrent / rallyRisk.sharedHpMax) * 100, 100))
                : 0;
              return (
                <>
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <span className={eyebrow}>Shared HP</span>
                    <span className="font-display text-sm font-semibold text-sky-ink tabular-nums">
                      {rallyRisk.sharedHpCurrent}
                      <span className="text-sky-ink-3"> / {rallyRisk.sharedHpMax}</span>
                      <span className="ml-2 text-sky-ink-2">{Math.round(pct)}%</span>
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-sky-ink/8 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${risk.bar} transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`sky-badge ${risk.badge} mt-2.5`}>
                    {risk.icon}
                    {t("mentor.partyReminder.riskLevel")}: {rallyRisk.riskLevel}
                  </span>
                </>
              );
            })()}
          </div>
        ) : null}

        <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
          {RALLY_TEMPLATES.map((tpl) => (
            <button
              key={tpl.type}
              type="button"
              onClick={() => handleDispatchRally(tpl.type)}
              disabled={rallyDispatching !== null}
              className={`text-left p-4 rounded-sky-chip ring-1 ${tpl.tint} transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:hover:-translate-y-px hover:shadow-sky-chip active:translate-y-0 active:scale-[0.99] disabled:opacity-55 disabled:cursor-not-allowed disabled:translate-y-0`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="inline-flex items-center gap-2 font-semibold text-sm text-sky-ink">
                  <span className={`shrink-0 ${tpl.accent}`}>{tpl.icon}</span> {tpl.title}
                </span>
                {rallyDispatching === tpl.type && <Spinner size={14} />}
              </div>
              <p className="text-xs text-sky-ink-2 font-medium leading-relaxed">{tpl.flavor}</p>
            </button>
          ))}
        </div>

        {rallyResult && (
          /* Teal, never green (§4) — and the tick carries the state alongside it. */
          <div className="relative mt-4 overflow-hidden rounded-sky-chip bg-sky-teal/10 ring-1 ring-sky-teal/28 p-4 pl-5 space-y-2.5">
            <span className="absolute left-0 top-0 bottom-0 w-1 bg-sky-teal" aria-hidden="true" />
            <p className="inline-flex items-center gap-1.5 font-display text-sm font-semibold text-sky-teal">
              <Check className="w-4 h-4" aria-hidden="true" /> {t("mentor.partyReminder.dispatchSuccess")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              {[
                [t("mentor.partyReminder.type"), rallyResult.reminderType],
                [t("mentor.partyReminder.notifications"), rallyResult.notificationsCreated],
                [t("mentor.partyReminder.chatMessages"), rallyResult.chatMessagesCreated],
              ].map(([k, v]) => (
                <div key={String(k)} className="rounded-sky-chip bg-white/65 ring-1 ring-white/75 p-2.5">
                  <p className={eyebrow}>{k}</p>
                  <p className="font-display text-sm font-semibold text-sky-ink tabular-nums mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowRallySchedule((v) => !v)}
          aria-expanded={showRallySchedule}
          className="relative mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-ink-2 hover:text-sky-ink transition-colors duration-150"
        >
          <ChevronRight
            className={`w-3.5 h-3.5 transition-transform duration-150 ${showRallySchedule ? "rotate-90" : ""}`}
            aria-hidden="true"
          />
          <Settings className="w-3.5 h-3.5" aria-hidden="true" /> {t("mentor.partyReminder.autoRallySchedule")}
        </button>

        {showRallySchedule && (
          <div className="relative mt-3 rounded-sky-card bg-white/45 ring-1 ring-white/70 p-4 space-y-5 sky-in">
            <div>
              <p className={`${eyebrow} mb-2`}>
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
                <p className={eyebrow}>
                  {t("mentor.partyReminder.dailyReminder")}
                </p>
                <RallyToggle
                  checked={rallySettings.dailyReminderEnabled}
                  onChange={(v) => setRallySettings((s) => ({ ...s, dailyReminderEnabled: v }))}
                />
              </div>
              {rallySettings.dailyReminderEnabled && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-sky-ink-2 shrink-0">{t("mentor.partyReminder.hour")}</label>
                  <select
                    value={rallySettings.dailyReminderHour}
                    onChange={(e) => setRallySettings((s) => ({ ...s, dailyReminderHour: parseInt(e.target.value) }))}
                    className="px-2.5 py-1.5 rounded-sky-chip bg-white/70 ring-1 ring-white/80 text-sm font-medium text-sky-ink transition-shadow focus:outline-none focus:ring-2 focus:ring-sky-deep/45"
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
                <p className={eyebrow}>
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
                    <label className="text-xs font-medium text-sky-ink-2 shrink-0">{t("mentor.partyReminder.day")}</label>
                    <select
                      value={rallySettings.weeklyBossReminderDay}
                      onChange={(e) => setRallySettings((s) => ({ ...s, weeklyBossReminderDay: parseInt(e.target.value) }))}
                      className="px-2.5 py-1.5 rounded-sky-chip bg-white/70 ring-1 ring-white/80 text-sm font-medium text-sky-ink transition-shadow focus:outline-none focus:ring-2 focus:ring-sky-deep/45"
                    >
                      {DAY_NAMES.map((day, i) => (
                        <option key={i} value={i}>{day}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-sky-ink-2 shrink-0">{t("mentor.partyReminder.hour")}</label>
                    <select
                      value={rallySettings.weeklyBossReminderHour}
                      onChange={(e) => setRallySettings((s) => ({ ...s, weeklyBossReminderHour: parseInt(e.target.value) }))}
                      className="px-2.5 py-1.5 rounded-sky-chip bg-white/70 ring-1 ring-white/80 text-sm font-medium text-sky-ink transition-shadow focus:outline-none focus:ring-2 focus:ring-sky-deep/45"
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
              <p className={`${eyebrow} mb-2`}>
                {t("mentor.partyReminder.channels")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <RallyCheckbox checked={rallySettings.sendInApp} onChange={(v) => setRallySettings((s) => ({ ...s, sendInApp: v }))} label={<><Smartphone className="w-4 h-4" aria-hidden="true" /> In-App</>} />
                <RallyCheckbox checked={rallySettings.sendPush} onChange={(v) => setRallySettings((s) => ({ ...s, sendPush: v }))} label={<><Bell className="w-4 h-4" aria-hidden="true" /> Push</>} />
                <RallyCheckbox checked={rallySettings.sendEmail} onChange={(v) => setRallySettings((s) => ({ ...s, sendEmail: v }))} label={<><Mail className="w-4 h-4" aria-hidden="true" /> Email</>} />
                <RallyCheckbox checked={rallySettings.sendPartyChat} onChange={(v) => setRallySettings((s) => ({ ...s, sendPartyChat: v }))} label={<><MessageSquare className="w-4 h-4" aria-hidden="true" /> Party Chat</>} />
              </div>
            </div>

            <SkyButton type="button" variant="primary" onClick={handleSaveRallySettings} disabled={rallySaving} className="w-full">
              {rallySaving ? (
                <><Spinner size={16} /> {t("mentor.partyReminder.saving")}</>
              ) : (
                <><Save className="w-4 h-4" aria-hidden="true" /> {t("mentor.partyReminder.saveBtn")}</>
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

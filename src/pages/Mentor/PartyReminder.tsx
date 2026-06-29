import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import partyMentorApi from "../../api/mentorPartyApi";
import partyReminderApi from "../../api/partyReminderApi";
import { useAlert } from "../../context/AlertContext";
import type { PartyItem } from "../../types/api.types";
import type {
    SharedHpDto,
    PartyReminderSettingDto,
    ReminderDispatchResultDto,
} from "../../types/mentor.types";

const getMentorId = () => {
    const id = localStorage.getItem("user_id");
    return id ? parseInt(id, 10) : 0;
};

const Spinner = ({ size = 18 }: { size?: number }) => (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
);

const RISK_STYLES: Record<string, { bar: string; badge: string }> = {
    SAFE:   { bar: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-800 border-emerald-400" },
    LOW:    { bar: "bg-blue-500",    badge: "bg-blue-100 text-blue-800 border-blue-400"          },
    MEDIUM: { bar: "bg-amber-400",   badge: "bg-amber-100 text-amber-800 border-amber-400"       },
    HIGH:   { bar: "bg-orange-500",  badge: "bg-orange-100 text-orange-800 border-orange-400"    },
    WIPED:  { bar: "bg-red-600",     badge: "bg-red-100 text-red-800 border-red-400"             },
};

const DAY_NAMES = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

const DISPATCH_TYPES = [
    { value: "ALL",            label: "⚡ ALL"           },
    { value: "QUEST_DEADLINE", label: "📋 Quest Deadline" },
    { value: "DAILY",          label: "🌅 Daily"          },
    { value: "WEEKLY_BOSS",    label: "💀 Weekly Boss"    },
] as const;

const DEFAULT_SETTINGS: PartyReminderSettingDto = {
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

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-black transition-colors duration-200 focus:outline-none ${checked ? "bg-violet-600" : "bg-gray-200"}`}
    >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow border border-gray-200 transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
);

const CheckBox = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
            type="checkbox"
            checked={checked}
            onChange={e => onChange(e.target.checked)}
            className="w-4 h-4 rounded border-2 border-black accent-violet-600"
        />
        <span className="text-sm font-medium text-gray-700">{label}</span>
    </label>
);

export default function PartyReminder() {
    const { t } = useTranslation();
    const alert = useAlert();

    const [parties, setParties] = useState<PartyItem[]>([]);
    const [selectedPartyId, setSelectedPartyId] = useState<number | "">("");

    const [risk, setRisk] = useState<SharedHpDto | null>(null);
    const [riskLoading, setRiskLoading] = useState(false);
    const [riskError, setRiskError] = useState<string | null>(null);

    const [settings, setSettings] = useState<PartyReminderSettingDto>(DEFAULT_SETTINGS);
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);

    const [dispatchType, setDispatchType] = useState("ALL");
    const [dispatchLoading, setDispatchLoading] = useState(false);
    const [dispatchResult, setDispatchResult] = useState<ReminderDispatchResultDto | null>(null);

    useEffect(() => {
        partyMentorApi.getMentorParties().then(res => {
            if (res.success) setParties(res.data ?? []);
        });
    }, []);

    const loadPartyData = useCallback(async (partyId: number) => {
        setRiskLoading(true);
        setSettingsLoading(true);
        setRisk(null);
        setRiskError(null);
        setDispatchResult(null);

        const [riskRes, settingsRes] = await Promise.allSettled([
            partyReminderApi.getPartyRisk(partyId),
            partyReminderApi.getReminderSettings(partyId),
        ]);

        if (riskRes.status === "fulfilled" && riskRes.value.success) {
            setRisk(riskRes.value.data ?? null);
        } else {
            const msg =
                riskRes.status === "rejected"
                    ? (riskRes.reason as any)?.response?.data?.message
                    : riskRes.value.message;
            setRiskError(msg || t("mentor.partyReminder.noActiveRaid"));
        }

        if (settingsRes.status === "fulfilled" && settingsRes.value.success) {
            setSettings(settingsRes.value.data ?? { ...DEFAULT_SETTINGS, partyId });
        } else {
            setSettings({ ...DEFAULT_SETTINGS, partyId });
        }

        setRiskLoading(false);
        setSettingsLoading(false);
    }, [t]);

    useEffect(() => {
        if (selectedPartyId) {
            loadPartyData(selectedPartyId as number);
        } else {
            setRisk(null);
            setRiskError(null);
            setSettings(DEFAULT_SETTINGS);
            setDispatchResult(null);
        }
    }, [selectedPartyId, loadPartyData]);

    const handleSave = async () => {
        if (!selectedPartyId) return;
        setSaveLoading(true);
        try {
            const res = await partyReminderApi.updateReminderSettings(
                selectedPartyId as number,
                { mentorUserId: getMentorId(), ...settings }
            );
            if (res.success) {
                alert.success(t("mentor.partyReminder.saveSuccess"));
                if (res.data) setSettings(res.data);
            } else {
                alert.error(res.message || t("mentor.partyReminder.saveFailed"));
            }
        } catch (e: any) {
            alert.error(e?.response?.data?.message || t("mentor.partyReminder.saveFailed"));
        } finally {
            setSaveLoading(false);
        }
    };

    const handleDispatch = async () => {
        if (!selectedPartyId) return;
        setDispatchLoading(true);
        setDispatchResult(null);
        try {
            const res = await partyReminderApi.dispatchReminders(
                selectedPartyId as number,
                dispatchType
            );
            if (res.success && res.data) {
                setDispatchResult(res.data);
                alert.success(t("mentor.partyReminder.dispatchSuccess"));
            } else {
                alert.error(res.message || t("mentor.partyReminder.dispatchFailed"));
            }
        } catch (e: any) {
            alert.error(e?.response?.data?.message || t("mentor.partyReminder.dispatchFailed"));
        } finally {
            setDispatchLoading(false);
        }
    };

    const riskStyle = RISK_STYLES[risk?.riskLevel ?? ""] ?? RISK_STYLES.SAFE;
    const hpPct =
        risk && risk.sharedHpMax > 0
            ? Math.max(0, Math.min((risk.sharedHpCurrent / risk.sharedHpMax) * 100, 100))
            : 0;

    return (
        <>
            <PageMeta
                title="Party Reminder — HabitEvolve"
                description="Configure party reminders and monitor shared HP risk"
            />
            <PageBreadcrumb pageTitle={t("mentor.partyReminder.pageTitle")} />

            {/* Party Selector */}
            <div className="mb-6 bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] p-5">
                <label className="block text-xs font-black uppercase tracking-wider mb-2 text-gray-500">
                    {t("mentor.partyReminder.selectParty")}
                </label>
                <select
                    value={selectedPartyId}
                    onChange={e => setSelectedPartyId(e.target.value ? parseInt(e.target.value) : "")}
                    className="w-full max-w-sm px-3 py-2.5 border-2 border-black rounded-xl text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
                >
                    <option value="">{t("mentor.partyReminder.chooseParty")}</option>
                    {parties.map(p => (
                        <option key={p.partyId} value={p.partyId}>
                            {p.name} ({p.memberCount} {t("mentor.bossRaid.members")})
                        </option>
                    ))}
                </select>
            </div>

            {!selectedPartyId ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-3">
                    <span className="text-5xl">⏰</span>
                    <p className="font-medium text-sm">{t("mentor.partyReminder.selectPartyHint")}</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* ── Shared HP Risk ───────────────────────────────── */}
                        <div className="bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] p-6">
                            <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                                <img src="/icon/Main/Heart/64px/Heart 1st 64px.png" alt="" className="w-6 h-6 object-contain" />
                                {t("mentor.partyReminder.sharedHpRisk")}
                                {riskLoading && (
                                    <span className="ml-1 opacity-60 inline-flex">
                                        <Spinner size={16} />
                                    </span>
                                )}
                            </h2>

                            {riskLoading ? (
                                <div className="flex items-center justify-center h-32">
                                    <Spinner size={32} />
                                </div>
                            ) : riskError ? (
                                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl text-sm font-medium text-amber-700">
                                    💤 {riskError}
                                </div>
                            ) : risk ? (
                                <div className="space-y-4">
                                    {/* HP Bar */}
                                    <div>
                                        <div className="flex justify-between text-xs font-black mb-1.5">
                                            <span>Shared HP</span>
                                            <span>
                                                {risk.sharedHpCurrent} / {risk.sharedHpMax}
                                            </span>
                                        </div>
                                        <div className="h-5 bg-gray-200 border-2 border-black rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${riskStyle.bar} transition-all duration-700`}
                                                style={{ width: `${hpPct}%` }}
                                            />
                                        </div>
                                        <p className="text-right text-xs font-bold mt-1 text-gray-500">
                                            {Math.round(hpPct)}%
                                        </p>
                                    </div>

                                    {/* Risk + Status badges */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`px-3 py-1 text-xs font-black border-2 rounded-full ${riskStyle.badge}`}>
                                            {t("mentor.partyReminder.riskLevel")}: {risk.riskLevel}
                                        </span>
                                        {risk.status && (
                                            <span className={`px-3 py-1 text-xs font-black border-2 rounded-full ${
                                                risk.status === "Active"
                                                    ? "bg-emerald-100 text-emerald-800 border-emerald-400"
                                                    : risk.status === "WipeOut"
                                                    ? "bg-red-100 text-red-800 border-red-400"
                                                    : "bg-gray-100 text-gray-700 border-gray-400"
                                            }`}>
                                                {risk.status}
                                            </span>
                                        )}
                                    </div>

                                    {/* Stats grid */}
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-3">
                                            <p className="text-gray-500 text-xs font-medium">Raid ID</p>
                                            <p className="font-black">#{risk.raidId}</p>
                                        </div>
                                        <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-3">
                                            <p className="text-gray-500 text-xs font-medium">{t("mentor.partyReminder.sharedHpEnabled")}</p>
                                            <p className="font-black">{risk.enabled ? "✓ Bật" : "✕ Tắt"}</p>
                                        </div>
                                    </div>

                                    {risk.riskLevel === "HIGH" && (
                                        <div className="p-3 bg-orange-50 border-2 border-orange-300 rounded-xl text-xs font-bold text-orange-700 flex items-center gap-2">
                                            <img src="/icon/UI/Warning/64px/Warning 1st 64px.png" alt="" className="w-4 h-4 object-contain shrink-0" />
                                            {t("mentor.partyReminder.highRiskWarning")}
                                        </div>
                                    )}
                                    {risk.riskLevel === "WIPED" && (
                                        <div className="p-3 bg-red-50 border-2 border-red-400 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                                            <img src="/icon/Main/Broken Heart/64w/Broken Heart 1st 64px.png" alt="" className="w-4 h-4 object-contain shrink-0" />
                                            {t("mentor.partyReminder.wipedWarning")}
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>

                        {/* ── Reminder Settings ─────────────────────────── */}
                        <div className="bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] p-6">
                            <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                                <img src="/icon/Item/Clock/64px/Golden Clock 1st 64px.png" alt="" className="w-6 h-6 object-contain" />
                                {t("mentor.partyReminder.settings")}
                                {settingsLoading && (
                                    <span className="ml-1 opacity-60 inline-flex">
                                        <Spinner size={16} />
                                    </span>
                                )}
                            </h2>

                            {settingsLoading ? (
                                <div className="flex items-center justify-center h-32">
                                    <Spinner size={32} />
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {/* Quest Deadline */}
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2">
                                            {t("mentor.partyReminder.questDeadline")}
                                        </p>
                                        <div className="space-y-2">
                                            <CheckBox
                                                checked={settings.questDeadline2hEnabled}
                                                onChange={v => setSettings(s => ({ ...s, questDeadline2hEnabled: v }))}
                                                label={t("mentor.partyReminder.remind2h")}
                                            />
                                            <CheckBox
                                                checked={settings.questDeadline30mEnabled}
                                                onChange={v => setSettings(s => ({ ...s, questDeadline30mEnabled: v }))}
                                                label={t("mentor.partyReminder.remind30m")}
                                            />
                                        </div>
                                    </div>

                                    {/* Daily Reminder */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                                                {t("mentor.partyReminder.dailyReminder")}
                                            </p>
                                            <Toggle
                                                checked={settings.dailyReminderEnabled}
                                                onChange={v => setSettings(s => ({ ...s, dailyReminderEnabled: v }))}
                                            />
                                        </div>
                                        {settings.dailyReminderEnabled && (
                                            <div className="flex items-center gap-2 mt-2">
                                                <label className="text-xs font-medium text-gray-600">
                                                    {t("mentor.partyReminder.hour")}
                                                </label>
                                                <select
                                                    value={settings.dailyReminderHour}
                                                    onChange={e =>
                                                        setSettings(s => ({ ...s, dailyReminderHour: parseInt(e.target.value) }))
                                                    }
                                                    className="px-2 py-1 border-2 border-black rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-300"
                                                >
                                                    {Array.from({ length: 24 }, (_, h) => (
                                                        <option key={h} value={h}>
                                                            {String(h).padStart(2, "0")}:00 UTC
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {/* Weekly Boss Reminder */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                                                {t("mentor.partyReminder.weeklyBossReminder")}
                                            </p>
                                            <Toggle
                                                checked={settings.weeklyBossReminderEnabled}
                                                onChange={v => setSettings(s => ({ ...s, weeklyBossReminderEnabled: v }))}
                                            />
                                        </div>
                                        {settings.weeklyBossReminderEnabled && (
                                            <div className="flex flex-wrap items-center gap-3 mt-2">
                                                <div className="flex items-center gap-2">
                                                    <label className="text-xs font-medium text-gray-600">
                                                        {t("mentor.partyReminder.day")}
                                                    </label>
                                                    <select
                                                        value={settings.weeklyBossReminderDay}
                                                        onChange={e =>
                                                            setSettings(s => ({
                                                                ...s,
                                                                weeklyBossReminderDay: parseInt(e.target.value),
                                                            }))
                                                        }
                                                        className="px-2 py-1 border-2 border-black rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-300"
                                                    >
                                                        {DAY_NAMES.map((day, i) => (
                                                            <option key={i} value={i}>
                                                                {day}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <label className="text-xs font-medium text-gray-600">
                                                        {t("mentor.partyReminder.hour")}
                                                    </label>
                                                    <select
                                                        value={settings.weeklyBossReminderHour}
                                                        onChange={e =>
                                                            setSettings(s => ({
                                                                ...s,
                                                                weeklyBossReminderHour: parseInt(e.target.value),
                                                            }))
                                                        }
                                                        className="px-2 py-1 border-2 border-black rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-300"
                                                    >
                                                        {Array.from({ length: 24 }, (_, h) => (
                                                            <option key={h} value={h}>
                                                                {String(h).padStart(2, "0")}:00 UTC
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Channels */}
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2">
                                            {t("mentor.partyReminder.channels")}
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <CheckBox
                                                checked={settings.sendInApp}
                                                onChange={v => setSettings(s => ({ ...s, sendInApp: v }))}
                                                label="📱 In-App"
                                            />
                                            <CheckBox
                                                checked={settings.sendPush}
                                                onChange={v => setSettings(s => ({ ...s, sendPush: v }))}
                                                label="🔔 Push"
                                            />
                                            <CheckBox
                                                checked={settings.sendEmail}
                                                onChange={v => setSettings(s => ({ ...s, sendEmail: v }))}
                                                label="📧 Email"
                                            />
                                            <CheckBox
                                                checked={settings.sendPartyChat}
                                                onChange={v => setSettings(s => ({ ...s, sendPartyChat: v }))}
                                                label="💬 Party Chat"
                                            />
                                        </div>
                                    </div>


                                    <button
                                        onClick={handleSave}
                                        disabled={saveLoading}
                                        className="w-full py-3 border-2 border-black rounded-full font-black text-sm bg-violet-600 text-white shadow-[4px_4px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[4px_4px_0_0_#1A1D20] transition-all inline-flex items-center justify-center gap-2"
                                    >
                                        {saveLoading ? (
                                            <>
                                                <Spinner size={16} /> {t("mentor.partyReminder.saving")}
                                            </>
                                        ) : (
                                            <><img src="/icon/Main/Save/64w/Save 1st 64px.png" alt="" className="w-4 h-4 object-contain" /> {t("mentor.partyReminder.saveBtn")}</>

                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Dispatch Section ──────────────────────────────── */}
                    <div className="bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#1A1D20] p-6">
                        <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                            <img src="/icon/Item/Rocket/64px/Rocket 1st 64px.png" alt="" className="w-6 h-6 object-contain" />
                            {t("mentor.partyReminder.dispatchTitle")}
                        </h2>

                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            <div className="flex flex-wrap gap-2">
                                {DISPATCH_TYPES.map(({ value, label }) => (
                                    <button
                                        key={value}
                                        onClick={() => setDispatchType(value)}
                                        className={`px-3 py-1.5 text-xs font-black border-2 rounded-full transition-all ${
                                            dispatchType === value
                                                ? "bg-violet-600 text-white border-violet-600"
                                                : "bg-white text-gray-700 border-black hover:bg-gray-50"
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleDispatch}
                                disabled={dispatchLoading}
                                className="px-5 py-2 border-2 border-black rounded-full font-black text-sm bg-emerald-500 text-white shadow-[3px_3px_0_0_#1A1D20] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[3px_3px_0_0_#1A1D20] transition-all inline-flex items-center gap-2"
                            >
                                {dispatchLoading ? (
                                    <>
                                        <Spinner size={14} /> {t("mentor.partyReminder.dispatching")}
                                    </>
                                ) : (
                                    <><img src="/icon/Item/Rocket/64px/Rocket 1st 64px.png" alt="" className="w-4 h-4 object-contain" /> {t("mentor.partyReminder.dispatchBtn")}</>
                                )}
                            </button>
                        </div>


                        {dispatchResult && (
                            <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-xl space-y-3">
                                <p className="font-black text-emerald-800">
                                    ✓ {t("mentor.partyReminder.dispatchSuccess")}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                    {[
                                        [t("mentor.partyReminder.type"), dispatchResult.reminderType],
                                        [t("mentor.partyReminder.notifications"), dispatchResult.notificationsCreated],
                                        [t("mentor.partyReminder.chatMessages"), dispatchResult.chatMessagesCreated],
                                    ].map(([k, v]) => (
                                        <div key={String(k)} className="bg-white rounded-xl p-3 border border-emerald-200">
                                            <p className="text-gray-500 text-xs">{k}</p>
                                            <p className="font-black">{v}</p>
                                        </div>
                                    ))}
                                </div>
                                {dispatchResult.details.length > 0 && (
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wider text-emerald-700 mb-1">
                                            Details
                                        </p>
                                        <ul className="space-y-1">
                                            {dispatchResult.details.map((d, i) => (
                                                <li
                                                    key={i}
                                                    className="text-xs font-medium text-gray-700 flex items-start gap-1"
                                                >
                                                    <span className="text-emerald-500 mt-0.5 shrink-0">→</span>
                                                    {d}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </>
    );
}

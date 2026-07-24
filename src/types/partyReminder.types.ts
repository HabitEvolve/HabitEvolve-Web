export interface PartyReminderSettingDto {
  partyId: number;
  questDeadline2hEnabled: boolean;
  questDeadline30mEnabled: boolean;
  dailyReminderEnabled: boolean;
  dailyReminderHour: number;
  weeklyBossReminderEnabled: boolean;
  weeklyBossReminderDay: number; // 0=Sunday..6=Saturday (assumed)
  weeklyBossReminderHour: number;
  sendInApp: boolean;
  sendPush: boolean;
  sendEmail: boolean;
  sendPartyChat: boolean;
}

export type UpdatePartyReminderSettingPayload = Omit<PartyReminderSettingDto, "partyId"> & { mentorUserId: number };

export type ReminderDispatchType = "ALL" | "QUEST_DEADLINE" | "DAILY" | "WEEKLY_BOSS";

export interface ReminderDispatchResultDto {
  partyId: number;
  reminderType: string;
  notificationsCreated: number;
  chatMessagesCreated: number;
  details: string[];
}

// GET /api/parties/{partyId}/shared-hp/risk — data shape is SharedHpDto
export interface SharedHpRiskDto {
  raidId: number;
  partyId: number;
  enabled: boolean;
  sharedHpMax: number;
  sharedHpCurrent: number;
  percentage: number;
  status: string; // Active | WipeOut | Defeated | ...
  riskLevel: string; // SAFE | LOW | MEDIUM | HIGH | WIPED
}

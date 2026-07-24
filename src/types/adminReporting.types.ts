export interface EconomyCurrencyStatDto {
  currency: string;
  earned: number;
  spent: number;
  net: number;
}

export interface EconomyReportDto {
  from: string;
  to: string;
  byCurrency: EconomyCurrencyStatDto[];
}

export interface QuestTypeStatDto {
  questType: string;
  total: number;
  approved: number;
  rejected: number;
  failed: number;
  completionRate: number;
}

export interface QuestCompletionReportDto {
  from: string;
  to: string;
  byQuestType: QuestTypeStatDto[];
}

export interface UserActivityReportDto {
  from: string;
  to: string;
  newUsers: number;
  activeUsers: number;
}

export const achievementStatuses = ['未送信', '既読', '達成', 'スキップ', 'キャンセル'] as const;

export type AchievementStatus = typeof achievementStatuses[number];

export type AdminAchievement = {
  id: number;
  instruction: string;
  user_name: string | null;
  user_ip: string;
  created_at: string;
  status: AchievementStatus;
  updated_at: string;
  admin_memo: string | null;
};

export type AchievementListResponse = {
  items: AdminAchievement[];
  nextCursor: number | null;
};


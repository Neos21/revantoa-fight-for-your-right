// TODO
function getTodayStartInTokyoIso(): string {
  const tokyoNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  tokyoNow.setUTCHours(0, 0, 0, 0);
  return new Date(tokyoNow.getTime() - 9 * 60 * 60 * 1000).toISOString();
}

export async function getRandomSendCandidate(db: D1Database): Promise<Achievement | null> {
  const row = await db.prepare(`
    SELECT id, instruction, user_name, user_ip, created_at, status, updated_at, admin_memo
    FROM achievements
    WHERE status = '未送信'
      OR (status = 'スキップ' AND updated_at < ?)
    ORDER BY RANDOM()
    LIMIT 1
  `).bind(getTodayStartInTokyoIso()).first<Achievement>();
  
  return row ?? null;
}

import { nowIso } from './http';

import type { Achievement, AdminAchievement, PublicAchievement } from '../types/achievement';

type ListResult<T> = {
  items: T[];
  nextCursor: number | null;
};

export async function createAchievement(
  db: D1Database,
  input: {
    instruction: string;
    userName: string | null;
    userIp: string;
  }
): Promise<Pick<Achievement, 'id' | 'created_at' | 'status'>> {
  const timestamp = nowIso();
  const result = await db.prepare(`
    INSERT INTO achievements (instruction, user_name, user_ip, created_at, status, updated_at, admin_memo)
    VALUES (?, ?, ?, ?, '未送信', ?, NULL)
  `).bind(input.instruction, input.userName, input.userIp, timestamp, timestamp).run();
  
  const id = result.meta.last_row_id;
  if(typeof id !== 'number') throw new Error('Failed to read created achievement ID');
  
  return {
    id,
    created_at: timestamp,
    status: '未送信'
  };
}

export async function listPublicAchievements(db: D1Database, options: { cursor?: number; limit: number; }): Promise<ListResult<PublicAchievement>> {
  const limit = options.limit;
  const rows = await db.prepare(`
    SELECT id, instruction, user_name, created_at, status, updated_at, admin_memo
    FROM achievements
    WHERE (? IS NULL OR id < ?)
    ORDER BY id DESC
    LIMIT ?
  `).bind(options.cursor ?? null, options.cursor ?? null, limit + 1).all<PublicAchievement>();
  
  const items = rows.results.slice(0, limit);
  const nextCursor = rows.results.length > limit ? items.at(-1)?.id ?? null : null;
  
  return {
    items,
    nextCursor
  };
}

export async function listAdminAchievements(db: D1Database, options: { cursor?: number; limit: number; }): Promise<ListResult<AdminAchievement>> {
  const limit = options.limit;
  const rows = await db.prepare(`
    SELECT id, instruction, user_name, user_ip, created_at, status, updated_at, admin_memo
    FROM achievements
    WHERE (? IS NULL OR id < ?)
    ORDER BY id DESC
    LIMIT ?
  `).bind(options.cursor ?? null, options.cursor ?? null, limit + 1).all<AdminAchievement>();
  
  const items = rows.results.slice(0, limit);
  const nextCursor = rows.results.length > limit ? items.at(-1)?.id ?? null : null;
  
  return {
    items,
    nextCursor
  };
}

export async function getAdminAchievement(db: D1Database, id: number): Promise<AdminAchievement | null> {
  const row = await db.prepare(`
    SELECT id, instruction, user_name, user_ip, created_at, status, updated_at, admin_memo
    FROM achievements
    WHERE id = ?
  `).bind(id).first<AdminAchievement>();
  
  return row ?? null;
}

export async function updateAchievement(
  db: D1Database,
  id: number,
  input: {
    instruction: string;
    userName: string | null;
    status: Achievement['status'];
    adminMemo: string | null;
  }
): Promise<AdminAchievement | null> {
  await db.prepare(`
    UPDATE achievements
    SET instruction = ?, user_name = ?, status = ?, admin_memo = ?, updated_at = ?
    WHERE id = ?
  `).bind(input.instruction, input.userName, input.status, input.adminMemo, nowIso(), id).run();
  
  return getAdminAchievement(db, id);
}

export async function deleteAchievement(db: D1Database, id: number): Promise<boolean> {
  const result = await db.prepare('DELETE FROM achievements WHERE id = ?').bind(id).run();
  return result.meta.changes > 0;
}

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

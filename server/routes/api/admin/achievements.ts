import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import z from 'zod';

import { updateAchievementSchema } from '../../../../shared/schemas/achievement';
import { mergeIssues } from '../../../helpers/merge-issues';

import type { AdminAchievement } from '../../../../shared/types/achievement';
import type { HonoBindings } from '../../../types/hono-bindings';

export const adminAchievementsApi = new Hono<{ Bindings: HonoBindings; }>();

adminAchievementsApi.use((context, next) => jwt({ secret: context.env.ADMIN_JWT_SECRET, alg: 'HS256' })(context, next));

const idParamSchema = z.object({
  id: z.coerce.number({ error: 'ID に数値が指定されていません' })
        .int({ error: 'ID に整数が指定されていません' })
        .min(1, { error: 'ID に1以上の整数が指定されていません' })
});

adminAchievementsApi.get('/', async context => {
  const result = await context.env.DB.prepare(`
    SELECT id, instruction, user_name, user_ip, created_at, status, updated_at, admin_memo
    FROM achievements
    ORDER BY id DESC
  `).all<AdminAchievement>();
  return context.json({ result: result.results }, 200);
});

adminAchievementsApi.get('/:id', async context => {  // eslint-disable-line
  const parsed = idParamSchema.safeParse(context.req.param());
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, 400);
  
  const achievement = await context.env.DB.prepare(`
    SELECT id, instruction, user_name, user_ip, created_at, status, updated_at, admin_memo
    FROM achievements
    WHERE id = ?
    LIMIT 1
  `).bind(parsed.data.id).first<AdminAchievement>();
  if(achievement == null) return context.json({ error: '指定された指示が見つかりません' }, 404);
  return context.json({ result: achievement }, 200);
});

adminAchievementsApi.put(':id', async context => {  // eslint-disable-line
  const parsedParams = idParamSchema.safeParse(context.req.param());
  if(!parsedParams.success) return context.json({ error: mergeIssues(parsedParams.error) }, 400);
  
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: 'リクエストボディが不正です' }, 400);
  const parsed = updateAchievementSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, 400);
  
  await context.env.DB.prepare(`
    UPDATE achievements
    SET instruction = ?, user_name = ?, status = ?, admin_memo = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(parsed.data.instruction, parsed.data.user_name, parsed.data.status, parsed.data.admin_memo || null, parsedParams.data.id).run();
  
  const updatedAchievement = await context.env.DB.prepare(`
    SELECT id, instruction, user_name, user_ip, created_at, status, updated_at, admin_memo
    FROM achievements
    WHERE id = ?
    LIMIT 1
  `).bind(parsedParams.data.id).first<AdminAchievement>();
  return context.json({ result: updatedAchievement }, 200);
});

adminAchievementsApi.delete(':id', async context => {  // eslint-disable-line
  const parsed = idParamSchema.safeParse(context.req.param());
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, 400);
  
  await context.env.DB.prepare('DELETE FROM achievements WHERE id = ?').bind(parsed.data.id).run();
  return context.body(null, 204);
});

import { Hono } from 'hono';

import { newAchievementSchema } from '../../../shared/schemas/achievement';
import { getIp } from '../../helpers/get-ip';
import { mergeIssues } from '../../helpers/merge-issues';
import { validateTurnstile } from '../../helpers/validate-turnstile';

import type { PublicAchievement } from '../../../shared/types/achievement';
import type { HonoBindings } from '../../types/hono-bindings';

export const achievementsApi = new Hono<{ Bindings: HonoBindings; }>();

achievementsApi.post('/', async context => {
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: 'リクエストボディが不正です' }, 400);
  
  const parsed = newAchievementSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, 400);
  
  const userIp = getIp(context);
  const isHuman = await validateTurnstile(context.env.TURNSTILE_SECRET_KEY, parsed.data.turnstile_token, userIp);
  if(!isHuman) return context.json({ error: 'Turnstile 認証に失敗しました' }, 400);
  
  await context.env.DB.prepare(`
    INSERT INTO achievements (instruction, user_name, user_ip, status, admin_memo)
    VALUES (?, ?, ?, '未送信', NULL)
  `).bind(parsed.data.instruction, parsed.data.user_name || null, userIp).run();
  
  return context.json({ result: true }, 201);
});

achievementsApi.get('/', async context => {
  const result = await context.env.DB.prepare(`
    SELECT id, instruction, user_name, created_at, status, updated_at, admin_memo
    FROM achievements
    ORDER BY id DESC
  `).all<PublicAchievement>();
  return context.json({ result: result.results }, 200);
});

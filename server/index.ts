import { Hono } from 'hono';

import { createAchievement, deleteAchievement, getAdminAchievement, listAdminAchievements, listPublicAchievements, updateAchievement } from './lib/achievements';
import { requireAdmin, signAdminJwt } from './lib/admin-auth';
import { handleDiscordInteraction, sendNextDiscordInstruction, verifyDiscordSignature } from './lib/discord';
import { getClientIp, jsonError } from './lib/http';
import { verifyTurnstile } from './lib/turnstile';
import { achievementListQuerySchema, adminLoginSchema, createPostSchema, idParamSchema, updateAchievementSchema } from './lib/validation';

import type { HonoBindings } from './types/hono-bindings';

const app = new Hono<{ Bindings: HonoBindings; }>();

app.get('/api/config', (c) => c.json({
  turnstileSiteKey: c.env.TURNSTILE_SITE_KEY
}));

app.post('/api/posts', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createPostSchema.safeParse(body);
  if(!parsed.success) return jsonError(c, 422, 'INVALID_POST', '投稿内容を確認してください');
  
  const userIp = getClientIp(c);
  const isHuman = await verifyTurnstile(c.env.TURNSTILE_SECRET_KEY, parsed.data.turnstileToken, userIp);
  if(!isHuman) return jsonError(c, 403, 'TURNSTILE_FAILED', 'Turnstile の検証に失敗しました');
  
  const created = await createAchievement(c.env.DB, {
    instruction: parsed.data.instruction,
    userName: parsed.data.userName === '' ? null : parsed.data.userName ?? null,
    userIp
  });
  
  return c.json({
    achievement: created
  }, 201);
});

app.get('/api/achievements', async (c) => {
  const parsed = achievementListQuerySchema.safeParse(c.req.query());
  if(!parsed.success) return jsonError(c, 422, 'INVALID_QUERY', '一覧の取得条件を確認してください');
  
  const result = await listPublicAchievements(c.env.DB, parsed.data);
  return c.json(result);
});

app.post('/api/admin/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = adminLoginSchema.safeParse(body);
  if(!parsed.success) return jsonError(c, 422, 'INVALID_LOGIN', 'パスワードを入力してください');
  if(parsed.data.password !== c.env.ADMIN_PASSWORD) return jsonError(c, 401, 'INVALID_PASSWORD', 'パスワードが違います');
  
  return c.json({
    token: await signAdminJwt(c.env.ADMIN_JWT_SECRET)
  });
});

app.get('/api/admin/achievements', requireAdmin, async (c) => {
  const parsed = achievementListQuerySchema.safeParse(c.req.query());
  if(!parsed.success) return jsonError(c, 422, 'INVALID_QUERY', '一覧の取得条件を確認してください');
  
  const result = await listAdminAchievements(c.env.DB, parsed.data);
  return c.json(result);
});

app.get('/api/admin/achievements/ : id', requireAdmin, async (c) => {
  const parsed = idParamSchema.safeParse(c.req.param());
  if(!parsed.success) return jsonError(c, 422, 'INVALID_ID', 'ID を確認してください');
  
  const achievement = await getAdminAchievement(c.env.DB, parsed.data.id);
  if(achievement == null) return jsonError(c, 404, 'NOT_FOUND', '指定された指示が見つかりません');
  
  return c.json({
    achievement
  });
});

app.put('/api/admin/achievements/ : id', requireAdmin, async (c) => {
  const params = idParamSchema.safeParse(c.req.param());
  if(!params.success) return jsonError(c, 422, 'INVALID_ID', 'ID を確認してください');
  
  const body = await c.req.json().catch(() => null);
  const parsed = updateAchievementSchema.safeParse(body);
  if(!parsed.success) return jsonError(c, 422, 'INVALID_ACHIEVEMENT', '更新内容を確認してください');
  
  const achievement = await updateAchievement(c.env.DB, params.data.id, parsed.data);
  if(achievement == null) return jsonError(c, 404, 'NOT_FOUND', '指定された指示が見つかりません');
  
  return c.json({
    achievement
  });
});

app.delete('/api/admin/achievements/ : id', requireAdmin, async (c) => {
  const parsed = idParamSchema.safeParse(c.req.param());
  if(!parsed.success) return jsonError(c, 422, 'INVALID_ID', 'ID を確認してください');
  
  const deleted = await deleteAchievement(c.env.DB, parsed.data.id);
  if(!deleted) return jsonError(c, 404, 'NOT_FOUND', '指定された指示が見つかりません');
  
  return c.json({
    deleted: true
  });
});

app.post('/discord/interactions', async (c) => {
  const body = await c.req.text();
  const isValid = await verifyDiscordSignature(
    c.env.DISCORD_PUBLIC_KEY,
    c.req.header('X-Signature-Ed25519') ?? null,
    c.req.header('X-Signature-Timestamp') ?? null,
    body
  );
  if(!isValid) return new Response('invalid request signature', { status: 401 });
  
  const interaction = JSON.parse(body) as Parameters<typeof handleDiscordInteraction>[1];
  return handleDiscordInteraction(c.env, interaction);
});

async function scheduled(_event: ScheduledEvent, env: HonoBindings): Promise<void> {
  await sendNextDiscordInstruction(env);
}

Object.assign(app, { scheduled });

export default app;

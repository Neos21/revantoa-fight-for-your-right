import { Hono } from 'hono';
import { sign } from 'hono/jwt';

import { isEmpty } from '../../../../shared/helpers/is-empty';
import { adminLoginSchema } from '../../../../shared/schemas/admin-login';
import { getIp } from '../../../helpers/get-ip';
import { mergeIssues } from '../../../helpers/merge-issues';
import { validateTurnstile } from '../../../helpers/validate-turnstile';

import type { HonoBindings } from '../../../types/hono-bindings';

export const adminLoginApi = new Hono<{ Bindings: HonoBindings; }>();

adminLoginApi.post('/', async context => {
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: 'リクエストボディが不正です' }, 400);
  
  const parsed = adminLoginSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, 400);
  
  const userIp = getIp(context);
  const isHuman = await validateTurnstile(context.env.TURNSTILE_SECRET_KEY, parsed.data.turnstile_token, userIp);
  if(!isHuman) return context.json({ error: 'Turnstile 認証に失敗しました' }, 400);
  
  const adminPassword  = context.env.ADMIN_PASSWORD;
  const adminJwtSecret = context.env.ADMIN_JWT_SECRET;
  if(isEmpty(adminPassword) || isEmpty(adminJwtSecret)) return context.json({ error: 'ログイン処理中にエラーが発生しました' }, 500);
  if(body.password !== adminPassword) return context.json({ error: 'パスワードが間違っています' }, 401);
  
  const adminJwt = await sign({ exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, adminJwtSecret, 'HS256');
  return context.json({ result: { admin_jwt: adminJwt } }, 200);
});

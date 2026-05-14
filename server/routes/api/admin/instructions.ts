import { Hono } from 'hono';
import { jwt } from 'hono/jwt';

import { InstructionService } from '../../../services/instruction';

import type { AdminAchievement } from '../../../../shared/types/achievement';
import type { HonoBindings } from '../../../types/hono-bindings';

export const adminInstructionsApi = new Hono<{ Bindings: HonoBindings; }>();

adminInstructionsApi.use((context, next) => jwt({ secret: context.env.ADMIN_JWT_SECRET, alg: 'HS256' })(context, next));

adminInstructionsApi.get('/from-db', async context => {
  const jstNow = new Date(Date.now() + ((new Date().getTimezoneOffset() + (9 * 60)) * 60 * 1000));
  jstNow.setUTCHours(0, 0, 0, 0);
  const todayStartUtcString = jstNow.toISOString().replace('T', ' ').replace('.000Z', '');  // YYYY-MM-DD HH:mm:SS
  
  const achievement = await context.env.DB.prepare(`
    SELECT id, instruction, status, updated_at
    FROM achievements
    WHERE status = '未送信'
      OR  status = '既読'
      OR (status = 'スキップ' AND updated_at < ?)
    ORDER BY RANDOM()
    LIMIT 1
  `).bind(todayStartUtcString).first<AdminAchievement>();
  
  return context.json({ result: achievement }, 200);
});

adminInstructionsApi.get('/from-prepared', async context => {
  const instruction = new InstructionService().pickPreparedInstruction();
  return context.json({ result: instruction }, 200);
});

adminInstructionsApi.get('/from-template', async context => {
  const instruction = new InstructionService().pickInstructionFromTemplate();
  return context.json({ result: instruction }, 200);
});

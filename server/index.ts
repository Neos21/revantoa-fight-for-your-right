import { Hono } from 'hono';

import { handleDiscordInteraction, sendNextDiscordInstruction, verifyDiscordSignature } from './lib/discord';
import { achievementsApi } from './routes/api/achievements';
import { adminAchievementsApi } from './routes/api/admin/achievements';
import { adminLoginApi } from './routes/api/admin/login';

import type { HonoBindings } from './types/hono-bindings';

export const app = new Hono<{ Bindings: HonoBindings; }>();

app.route('/api/achievements'      , achievementsApi);
app.route('/api/admin/login'       , adminLoginApi);
app.route('/api/admin/achievements', adminAchievementsApi);

// TODO
achievementsApi.post('/discord/interactions', async context => {
  const body = await context.req.text();
  const isValid = await verifyDiscordSignature(
    context.env.DISCORD_PUBLIC_KEY,
    context.req.header('X-Signature-Ed25519') ?? null,
    context.req.header('X-Signature-Timestamp') ?? null,
    body
  );
  if(!isValid) return new Response('invalid request signature', { status: 401 });
  
  const interaction = JSON.parse(body) as Parameters<typeof handleDiscordInteraction>[1];
  return handleDiscordInteraction(context.env, interaction);
});

// TODO
const scheduled = async (_event: ScheduledEvent, env: HonoBindings): Promise<void> => {
  await sendNextDiscordInstruction(env);
};

export default {
  fetch: achievementsApi.fetch,
  scheduled
};

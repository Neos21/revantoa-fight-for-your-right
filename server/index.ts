import { Hono } from 'hono';

import { achievementsApi } from './routes/api/achievements';
import { adminAchievementsApi } from './routes/api/admin/achievements';
import { adminLoginApi } from './routes/api/admin/login';
import { discordInteractionsApi } from './routes/discord/interactions';
import { DiscordService } from './services/discord';

import type { HonoBindings } from './types/hono-bindings';

const app = new Hono<{ Bindings: HonoBindings; }>();
app.route('/api/achievements'      , achievementsApi);
app.route('/api/admin/login'       , adminLoginApi);
app.route('/api/admin/achievements', adminAchievementsApi);
app.route('/discord/interactions'  , discordInteractionsApi);

const scheduled = async (_event: ScheduledEvent, env: HonoBindings): Promise<void> => {
  const discordService = new DiscordService(env.DB, env.DISCORD_BOT_TOKEN, env.DISCORD_USER_ID, env.DISCORD_PUBLIC_KEY);
  await discordService.sendNextInstruction();
};

export default {
  fetch: app.fetch,
  scheduled
};

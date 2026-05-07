import { Hono } from 'hono';

import { achievementsApi } from './routes/api/achievements';
import { adminAchievementsApi } from './routes/api/admin/achievements';
import { adminLoginApi } from './routes/api/admin/login';
import { discordInteractionsApi } from './routes/discord/interactions';

import type { HonoBindings } from './types/hono-bindings';

export const app = new Hono<{ Bindings: HonoBindings; }>();

app.route('/api/achievements'      , achievementsApi);
app.route('/api/admin/login'       , adminLoginApi);
app.route('/api/admin/achievements', adminAchievementsApi);
app.route('/discord/interactions'  , discordInteractionsApi);

// NOTE : For Vite
export default app;

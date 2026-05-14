import { Hono } from 'hono';

import { achievementsApi } from './routes/api/achievements';
import { adminAchievementsApi } from './routes/api/admin/achievements';
import { adminAiApi } from './routes/api/admin/ai';
import { adminInstructionsApi } from './routes/api/admin/instructions';
import { adminLoginApi } from './routes/api/admin/login';
import { discordInteractionsApi } from './routes/discord/interactions';

import type { HonoBindings } from './types/hono-bindings';

export const app = new Hono<{ Bindings: HonoBindings; }>();

app.route('/api/achievements'      , achievementsApi);
app.route('/api/admin/login'       , adminLoginApi);
app.route('/api/admin/achievements', adminAchievementsApi);
app.route('/api/admin/ai'          , adminAiApi);
app.route('/api/admin/instructions', adminInstructionsApi);
app.route('/discord/interactions'  , discordInteractionsApi);

// NOTE : For Vite
export default app;

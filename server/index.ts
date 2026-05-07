import { app } from './app';
import { DiscordService } from './services/discord';

import type { HonoBindings } from './types/hono-bindings';

const scheduled = async (_event: ScheduledEvent, env: HonoBindings): Promise<void> => {
  const discordService = new DiscordService(env.DB, env.DISCORD_BOT_TOKEN, env.DISCORD_USER_ID, env.DISCORD_PUBLIC_KEY);
  await discordService.sendNextInstruction();
};

export default {
  fetch: app.fetch,
  scheduled
};

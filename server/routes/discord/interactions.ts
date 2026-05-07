import { Hono } from 'hono';

import { DiscordService, type DiscordInteraction } from '../../services/discord';

import type { HonoBindings } from '../../types/hono-bindings';

export const discordInteractionsApi = new Hono<{ Bindings: HonoBindings; }>();

discordInteractionsApi.post('/', async context => {
  const discordService = new DiscordService(context.env.DB, context.env.DISCORD_BOT_TOKEN, context.env.DISCORD_USER_ID, context.env.DISCORD_PUBLIC_KEY);
  
  const body = await context.req.text();
  const isValid = await discordService.verifySignature(
    context.req.header('X-Signature-Ed25519') ?? null,
    context.req.header('X-Signature-Timestamp') ?? null,
    body
  );
  if(!isValid) return new Response('Invalid Request Signature', { status: 401 });
  
  const interaction = JSON.parse(body) as DiscordInteraction;
  const responseObject = await discordService.handleInteraction(interaction);
  return context.json(responseObject);
});

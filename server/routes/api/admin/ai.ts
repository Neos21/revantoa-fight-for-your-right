import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import z from 'zod';

import { mergeIssues } from '../../../helpers/merge-issues';

import type { HonoBindings } from '../../../types/hono-bindings';

export const adminAiApi = new Hono<{ Bindings: HonoBindings; }>();

adminAiApi.use((context, next) => jwt({ secret: context.env.ADMIN_JWT_SECRET, alg: 'HS256' })(context, next));

const aiSchema = z.object({
  prompt: z.string().min(1, 'プロンプトを入力してください')
});

adminAiApi.post('/', async context => {
  const body = await context.req.json().catch(() => null);
  if(body == null) return context.json({ error: 'リクエストボディが不正です' }, 400);
  
  const parsed = aiSchema.safeParse(body);
  if(!parsed.success) return context.json({ error: mergeIssues(parsed.error) }, 400);
  
  try {
    // https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/
    const messages = [
      {
        role: 'user',
        content: parsed.data.prompt
      }
    ];
    const response = await context.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast',  { messages });
    return context.json({ result: response }, 200);
  }
  catch(error) {
    return context.json({ error }, 500);
  }
});

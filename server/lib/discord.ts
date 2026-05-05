import { getRandomSendCandidate, updateAchievement } from './achievements';
import { nowIso } from './http';

import type { Achievement } from '../types/achievement';
import type { HonoBindings } from '../types/hono-bindings';

type DiscordInteraction = {
  type: number;
  data?: {
    name?: string;
    custom_id?: string;
    options?: Array<{
      name: string;
      value: string | number;
    }>;
  };
};

type DiscordMessageResponse = {
  id: string;
};

type DiscordChannelResponse = {
  id: string;
};

const interactionType = {
  ping: 1,
  applicationCommand: 2,
  messageComponent: 3
} as const;

const interactionResponseType = {
  pong: 1,
  channelMessageWithSource: 4,
  deferredUpdateMessage: 6
} as const;

const actionStatuses = {
  done: '達成',
  skip: 'スキップ',
  cancel: 'キャンセル'
} as const;

type DiscordAction = keyof typeof actionStatuses;

function hexToBytes(hex: string): ArrayBuffer {
  const buffer = new ArrayBuffer(hex.length / 2);
  const bytes = new Uint8Array(buffer);
  for(let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return buffer;
}

async function discordFetch<T>(env: HonoBindings, path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`https://discord.com/api/v10${path}`, {
    ...init,
    headers: {
      'Authorization': `Bot ${env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
      ...init.headers
    }
  });
  
  if(!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Discord API error ${response.status}: ${text}`);
  }
  
  return response.json<T>();
}

async function getSendChannelId(env: HonoBindings): Promise<string> {
  if(env.DISCORD_USER_ID !== '') {
    const channel = await discordFetch<DiscordChannelResponse>(env, '/users/@me/channels', {
      method: 'POST',
      body: JSON.stringify({
        recipient_id: env.DISCORD_USER_ID
      })
    });
    return channel.id;
  }
  
  if(env.DISCORD_CHANNEL_ID !== '') return env.DISCORD_CHANNEL_ID;
  throw new Error('DISCORD_USER_ID or DISCORD_CHANNEL_ID is required');
}

function buildMessage(achievement: Achievement): {
  content: string;
  components: Array<{
    type: 1;
    components: Array<{
      type: 2;
      style: 2 | 3 | 4;
      label: string;
      custom_id: string;
    }>;
  }>;
} {
  const date = nowIso().slice(0, 10);
  return {
    content: `${date} はこれをせよ : [ID ${achievement.id}] ${achievement.instruction}`,
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            label: '達成',
            custom_id: `achievement:done:${achievement.id}`
          },
          {
            type: 2,
            style: 2,
            label: 'スキップ',
            custom_id: `achievement:skip:${achievement.id}`
          },
          {
            type: 2,
            style: 4,
            label: 'キャンセル',
            custom_id: `achievement:cancel:${achievement.id}`
          }
        ]
      }
    ]
  };
}

export async function sendNextDiscordInstruction(env: HonoBindings): Promise<DiscordMessageResponse | null> {
  const achievement = await getRandomSendCandidate(env.DB);
  if(achievement == null) return null;
  
  const channelId = await getSendChannelId(env);
  const message = await discordFetch<DiscordMessageResponse>(env, `/channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify(buildMessage(achievement))
  });
  
  await updateAchievement(env.DB, achievement.id, {
    instruction: achievement.instruction,
    userName: achievement.user_name,
    status: '既読',
    adminMemo: achievement.admin_memo
  });
  
  return message;
}

export async function verifyDiscordSignature(publicKey: string, signature: string | null, timestamp: string | null, body: string): Promise<boolean> {
  if(signature == null || timestamp == null) return false;
  
  const key = await crypto.subtle.importKey(
    'raw',
    hexToBytes(publicKey),
    'Ed25519',
    false,
    ['verify']
  );
  
  const payload = new TextEncoder().encode(`${timestamp}${body}`);
  return crypto.subtle.verify('Ed25519', key, hexToBytes(signature), payload);
}

function parseButtonAction(customId: string | undefined): { action: DiscordAction; id: number; } | null {
  const match = customId?.match(/^achievement:(done|skip|cancel):(\d+)$/);
  if(match == null) return null;
  return {
    action: match[1] as DiscordAction,
    id: Number(match[2])
  };
}

function parseCommandAction(name: string | undefined): DiscordAction | null {
  if(name === '達成') return 'done';
  if(name === 'スキップ') return 'skip';
  if(name === 'キャンセル') return 'cancel';
  return null;
}

function getOption(interaction: DiscordInteraction, name: string): string | number | null {
  return interaction.data?.options?.find((option) => option.name === name)?.value ?? null;
}

export async function handleDiscordInteraction(env: HonoBindings, interaction: DiscordInteraction): Promise<Response> {
  if(interaction.type === interactionType.ping) {
    return Response.json({
      type: interactionResponseType.pong
    });
  }
  
  if(interaction.type === interactionType.messageComponent) {
    const parsed = parseButtonAction(interaction.data?.custom_id);
    if(parsed == null) {
      return Response.json({
        type: interactionResponseType.channelMessageWithSource,
        data: { content: '対象の操作を判別できませんでした', flags: 64 }
      });
    }
    
    try {
      await applyDiscordAction(env, parsed.id, parsed.action, null);
      if(parsed.action === 'skip') await sendNextDiscordInstruction(env);
    }
    catch(error) {
      return Response.json({
        type: interactionResponseType.channelMessageWithSource,
        data: { content: error instanceof Error ? error.message : '操作に失敗しました', flags: 64 }
      });
    }
    
    return Response.json({
      type: interactionResponseType.deferredUpdateMessage
    });
  }
  
  if(interaction.type === interactionType.applicationCommand) {
    const action = parseCommandAction(interaction.data?.name);
    const id = Number(getOption(interaction, 'id'));
    const memo = getOption(interaction, 'memo');
    
    if(action == null || !Number.isInteger(id) || id <= 0) {
      return Response.json({
        type: interactionResponseType.channelMessageWithSource,
        data: { content: 'コマンドの内容を確認してください', flags: 64 }
      });
    }
    
    try {
      await applyDiscordAction(env, id, action, typeof memo === 'string' ? memo : null);
      if(action === 'skip') await sendNextDiscordInstruction(env);
    }
    catch(error) {
      return Response.json({
        type: interactionResponseType.channelMessageWithSource,
        data: { content: error instanceof Error ? error.message : '操作に失敗しました', flags: 64 }
      });
    }
    
    return Response.json({
      type: interactionResponseType.channelMessageWithSource,
      data: { content: `[ID ${id}] を ${actionStatuses[action]} にしました`, flags: 64 }
    });
  }
  
  return Response.json({
    type: interactionResponseType.channelMessageWithSource,
    data: { content: '未対応の操作です', flags: 64 }
  });
}

async function applyDiscordAction(env: HonoBindings, id: number, action: DiscordAction, memo: string | null): Promise<void> {
  const current = await env.DB.prepare(`
    SELECT id, instruction, user_name, user_ip, created_at, status, updated_at, admin_memo
    FROM achievements
    WHERE id = ?
  `).bind(id).first<Achievement>();
  if(current == null) throw new Error(`Achievement ${id} not found`);
  
  await updateAchievement(env.DB, id, {
    instruction: current.instruction,
    userName: current.user_name,
    status: actionStatuses[action],
    adminMemo: memo ?? current.admin_memo
  });
}

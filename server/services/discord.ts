import { InstructionService } from './instruction';

import type { AdminAchievement } from '../../shared/types/achievement';

export type DiscordInteraction = {
  type: number;
  data?: {
    name?: string;
    custom_id?: string;
    options?: Array<{
      name: string;
      value: string | number;
    }>;
  };
  id: string;
  application_id: string;
  token: string;
  channel_id: string;
  message?: {
    id: string;
    channel_id: string;
    content: string;
    components?: Array<{
      type: 1;
      components: Array<{
        type: 2;
        style: number;
        label: string;
        custom_id: string;
        disabled?: boolean;
      }>;
    }>;
  };
};

const interactionType = {
  ping: 1,
  applicationCommand: 2,
  messageComponent: 3
} as const;

const interactionResponseType = {
  pong: 1,
  channelMessageWithSource: 4,
  deferredUpdateMessage: 6,  // NOTE : 現状未使用
  updateMessage: 7
} as const;

const actionStatuses = {
  done: '達成',
  skip: 'スキップ',
  cancel: 'キャンセル'
} as const;

type DiscordAction = keyof typeof actionStatuses;

export class DiscordService {
  private db: D1Database;
  private discordBotToken: string;
  private discordUserId: string;
  private discordPublicKey: string;
  
  constructor(db: D1Database, discordBotToken: string, discordUserId: string, discordPublicKey: string) {
    this.db               = db;
    this.discordBotToken  = discordBotToken;
    this.discordUserId    = discordUserId;
    this.discordPublicKey = discordPublicKey;
  }
  
  public async sendNextInstruction(): Promise<{ id: string; } | null> {
    const jstNow = new Date(Date.now() + ((new Date().getTimezoneOffset() + (9 * 60)) * 60 * 1000));
    jstNow.setUTCHours(0, 0, 0, 0);
    const todayStartUtcString = jstNow.toISOString().replace('T', ' ').replace('Z', '');
    const todayString = todayStartUtcString.slice(0, 10);
    
    const achievement = await this.db.prepare(`
      SELECT id, instruction
      FROM achievements
      WHERE status = '未送信'
        OR (status = 'スキップ' AND updated_at < ?)
      ORDER BY RANDOM()
      LIMIT 1
    `).bind(todayStartUtcString).first<AdminAchievement>();
    
    const channel = await this.callDiscord<{ id: string; }>('/users/@me/channels', {
      method: 'POST',
      body: JSON.stringify({ recipient_id: this.discordUserId })
    });
    
    if(achievement == null) {
      const instruction = new InstructionService().pickRandomInstruction();
      const message = await this.callDiscord<{ id: string; }>(`/channels/${channel.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: `${todayString} の指示を自動生成した : ${instruction}` })
      });
      return message;
    }
    else {
      const messageBody = {
        content: `${todayString} はこれをせよ : [ID ${achievement.id}] ${achievement.instruction}`,
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
      const message = await this.callDiscord<{ id: string; }>(`/channels/${channel.id}/messages`, {
        method: 'POST',
        body: JSON.stringify(messageBody)
      });
      
      await this.db.prepare('UPDATE achievements SET status = \'既読\', updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(achievement.id).run();
      
      return message;
    }
  }
  
  public async verifySignature(signature: string | null, timestamp: string | null, body: string): Promise<boolean> {
    if(signature == null || timestamp == null) return false;
    
    const key = await crypto.subtle.importKey('raw', this.hexToBytes(this.discordPublicKey), 'Ed25519', false, ['verify']);
    const payload = new TextEncoder().encode(`${timestamp}${body}`);
    return await crypto.subtle.verify('Ed25519', key, this.hexToBytes(signature), payload);
  }
  
  public async handleInteraction(interaction: DiscordInteraction): Promise<any> {  // eslint-disable-line @typescript-eslint/no-explicit-any
    // NOTE : Interactions API には通常のチャットメッセージがそもそも届かないのでココに到達することもない
    if(interaction.type === interactionType.ping) return { type: interactionResponseType.pong };
    
    // ボタン押下時の反応
    if(interaction.type === interactionType.messageComponent) {
      const parsed = this.parseButtonAction(interaction.data?.custom_id);
      
      if(parsed == null) return {
        type: interactionResponseType.channelMessageWithSource,
        data: { content: `対象の操作を判別できなかった。 : Custom ID [${interaction.data?.custom_id}]` }
      };
      
      try {
        await this.db.prepare('UPDATE achievements SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(actionStatuses[parsed.action], parsed.id).run();
        
        if(parsed.action === 'skip') await this.sendNextInstruction();
        
        if(interaction.message != null) {
          await this.callDiscord<{ id: string; }>(`/channels/${interaction.channel_id}/messages`, {
            method: 'POST',
            body: JSON.stringify({ content: `ID [${parsed.id}] を ${actionStatuses[parsed.action]} に更新した。ボタンは非活性にした。` })
          }).catch(error => console.warn(error));
          
          // 元メッセージのボタンを非活性に編集更新する
          const updatedMessageBody = {
            content: interaction.message.content,
            components: interaction.message.components?.map(row => ({
              ...row,
              components: row.components.map(button => ({
                ...button,
                disabled: true
              }))
            })) || []
          };
          return {
            type: interactionResponseType.updateMessage,
            data: updatedMessageBody
          };
        }
        else {
          // 元メッセージの編集ができなさそうだったので返信のみとする
          return {
            type: interactionResponseType.channelMessageWithSource,
            data: { content: `ID [${parsed.id}] を ${actionStatuses[parsed.action]} に更新した。` }
          };
        }
      }
      catch(error) {
        return {
          type: interactionResponseType.channelMessageWithSource,
          data: { content: `操作に失敗した。 : ${error instanceof Error ? error.message : '(不明なエラー)'}` }
        };
      }
    }
    
    // スラッシュコマンド受付時
    if(interaction.type === interactionType.applicationCommand) {
      const action = this.parseCommandAction(interaction.data?.name);
      const id = Number(this.getOption(interaction, 'id'));
      const memo = String(this.getOption(interaction, 'memo') || '');
      
      if(action == null || !Number.isInteger(id) || id <= 0) return {
        type: interactionResponseType.channelMessageWithSource,
        data: { content: 'コマンドの内容がおかしいみたい。' }
      };
      
      try {
        await this.db.prepare('UPDATE achievements SET status = ?, admin_memo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(actionStatuses[action], memo || null, id).run();
        
        if(action === 'skip') await this.sendNextInstruction();
        
        return {
          type: interactionResponseType.channelMessageWithSource,
          data: { content: `コマンドを受け付けた。ID [${id}] を ${actionStatuses[action]} に更新した。` }
        };
      }
      catch(error) {
        return {
          type: interactionResponseType.channelMessageWithSource,
          data: { content: `コマンドを受け付けたが操作に失敗した。 : ${error instanceof Error ? error.message : '(不明なエラー)'}` }
        };
      }
    }
    
    return {
      type: interactionResponseType.channelMessageWithSource,
      data: { content: '未対応の操作だ。' }
    };
  }
  
  private async callDiscord<T>(path: string, requestInit: RequestInit): Promise<T> {
    const response = await fetch(`https://discord.com/api/v10${path}`, {
      ...requestInit,
      headers: {
        'Authorization': `Bot ${this.discordBotToken}`,
        'Content-Type': 'application/json',
        ...requestInit.headers
      }
    });
    
    if(!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Discord API Error ${response.status} : ${text}`);
    }
    
    return response.json<T>();
  }
  
  private hexToBytes(hex: string): ArrayBuffer {
    const buffer = new ArrayBuffer(hex.length / 2);
    const bytes = new Uint8Array(buffer);
    for(let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
    return buffer;
  }
  
  private parseButtonAction(customId: string | undefined): { action: DiscordAction; id: number; } | null {
    const match = customId?.match(/^achievement:(done|skip|cancel):(\d+)$/);
    if(match == null) return null;
    return {
      action: match[1] as DiscordAction,
      id: Number(match[2])
    };
  }
  
  private parseCommandAction(name: string | undefined): DiscordAction | null {
    if(name === '達成') return 'done';
    if(name === 'スキップ') return 'skip';
    if(name === 'キャンセル') return 'cancel';
    return null;
  }
  
  private getOption(interaction: DiscordInteraction, name: string): string | number | null {
    return interaction.data?.options?.find(option => option.name === name)?.value ?? null;
  }
}

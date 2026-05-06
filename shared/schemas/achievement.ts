import z from 'zod';

import { reduceNewlines } from '../helpers/reduce-newlines';
import { achievementStatuses } from '../types/achievement';

export const instructionMaxLength = 1000;
export const userNameMaxLength = 80;

export const newAchievementSchema = z.object({
  instruction    : z.preprocess(
                     value => value == null ? '' : typeof value === 'string' ? reduceNewlines(value.trim()) : value,
                     z.string({ error: '指示に文字列でないデータが入力されています' })
                       .min(1, { error: '指示を入力してください' })
                       .max(instructionMaxLength, { error: `指示は${instructionMaxLength}文字以内で入力してください` })
                   ),
  user_name      : z.preprocess(
                     value => value == null ? '' : typeof value === 'string' ? value.trim() : value,
                     z.string({ error: '名前に文字列でないデータが入力されています' })
                       .max(userNameMaxLength, { error: `名前は${userNameMaxLength}文字以内で入力してください` })
                       .nullable()
                   ),
  turnstile_token: z.preprocess(
                    value => value == null ? '' : typeof value === 'string' ? value.trim() : value,
                    z.string({ error: 'Turnstile 認証を行ってください' })
                      .min(1, { error: 'Turnstile 認証を行ってください' })
                   )
});

export const updateAchievementSchema = z.object({
  id         : z.coerce.number({ error: 'ID に数値が指定されていません' })
                 .int({ error: 'ID に整数が指定されていません' })
                 .min(1, { error: 'ID に1以上の整数が指定されていません' }),
  instruction: z.preprocess(
                 value => value == null ? '' : typeof value === 'string' ? reduceNewlines(value.trim()) : value,
                 z.string({ error: '指示に文字列でないデータが入力されています' })
                   .min(1, { error: '指示を入力してください' })
                   .max(instructionMaxLength, { error: `指示は${instructionMaxLength}文字以内で入力してください` })
               ),
  user_name  : z.preprocess(
                 value => value == null ? '' : typeof value === 'string' ? value.trim() : value,
                 z.string({ error: '名前に文字列でないデータが入力されています' })
                   .max(userNameMaxLength, { error: `名前は${userNameMaxLength}文字以内で入力してください` })
                   .nullable()
               ),
  status     : z.enum(achievementStatuses, { error: 'ステータスが不正です' }),
  admin_memo : z.preprocess(
                 value => value == null ? '' : typeof value === 'string' ? value.trim() : value,
                 z.string({ error: 'メモに文字列でないデータが入力されています' })
                   .max(2000, { error: `メモは2000文字以内で入力してください` })
                   .nullable()
               )
});

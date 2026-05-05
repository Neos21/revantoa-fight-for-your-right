import { z } from 'zod';

import { achievementStatuses } from '../types/achievement';

export const createPostSchema = z.object({
  instruction: z.string().trim().min(1).max(1000),
  userName: z.string().trim().max(80).optional(),
  turnstileToken: z.string().min(1)
});

export const achievementListQuerySchema = z.object({
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30)
});

export const adminLoginSchema = z.object({
  password: z.string().min(1)
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const updateAchievementSchema = z.object({
  instruction: z.string().trim().min(1).max(1000),
  userName: z.string().trim().max(80).nullable(),
  status: z.enum(achievementStatuses),
  adminMemo: z.string().trim().max(2000).nullable()
});


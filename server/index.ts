import { Hono } from 'hono';

import type { HonoBindings } from './types/hono-bindings';

const app = new Hono<{ Bindings: HonoBindings; }>();

export default app;

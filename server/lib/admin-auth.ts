import { createMiddleware } from 'hono/factory';

import { jsonError } from './http';

import type { HonoBindings } from '../types/hono-bindings';

const algorithm = {
  name: 'HMAC',
  hash: 'SHA-256'
};

type JwtPayload = {
  sub: 'admin';
  exp: number;
};

function base64UrlEncode(input: ArrayBuffer | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function base64UrlDecode(input: string): ArrayBuffer {
  const base64 = input.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0)).buffer;
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    algorithm,
    false,
    ['sign', 'verify']
  );
}

export async function signAdminJwt(secret: string): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  const payload: JwtPayload = {
    sub: 'admin',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
  };
  
  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const signature = await crypto.subtle.sign(algorithm, await getKey(secret), new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64UrlEncode(signature)}`;
}

export async function verifyAdminJwt(secret: string, token: string): Promise<boolean> {
  const parts = token.split('.');
  if(parts.length !== 3) return false;
  
  const [header, payload, signature] = parts;
  const unsigned = `${header}.${payload}`;
  const isValid = await crypto.subtle.verify(
    algorithm,
    await getKey(secret),
    base64UrlDecode(signature),
    new TextEncoder().encode(unsigned)
  );
  if(!isValid) return false;
  
  const data = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as Partial<JwtPayload>;
  return data.sub === 'admin' && typeof data.exp === 'number' && data.exp > Math.floor(Date.now() / 1000);
}

export const requireAdmin = createMiddleware<{ Bindings: HonoBindings; }>(async (c, next) => {
  const authorization = c.req.header('Authorization');
  const token = authorization?.startsWith('Bearer ') === true ? authorization.slice('Bearer '.length) : null;
  if(token == null) return jsonError(c, 401, 'UNAUTHORIZED', '管理者ログインが必要です');
  
  const isValid = await verifyAdminJwt(c.env.ADMIN_JWT_SECRET, token);
  if(!isValid) return jsonError(c, 401, 'UNAUTHORIZED', '管理者ログインが必要です');
  
  await next();
});

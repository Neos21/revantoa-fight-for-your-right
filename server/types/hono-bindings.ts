export type HonoBindings = {
  DB: D1Database;
  AI: Ai;
  
  TURNSTILE_SECRET_KEY: string;
  
  ADMIN_PASSWORD: string;
  ADMIN_JWT_SECRET: string;
  
  DISCORD_BOT_TOKEN: string;
  DISCORD_USER_ID: string;
  DISCORD_PUBLIC_KEY: string;
};

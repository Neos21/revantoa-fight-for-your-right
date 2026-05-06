export type HonoBindings = {
  DB: D1Database;
  
  TURNSTILE_SECRET_KEY: string;
  ADMIN_PASSWORD: string;
  ADMIN_JWT_SECRET: string;
  
  DISCORD_PUBLIC_KEY: string;
  DISCORD_BOT_TOKEN: string;
  DISCORD_APPLICATION_ID: string;
  DISCORD_USER_ID: string;
  DISCORD_CHANNEL_ID: string;
};

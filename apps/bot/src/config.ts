import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const config = {
  token: required('DISCORD_TOKEN'),
  clientId: required('CLIENT_ID'),
  mongoUri: required('MONGO_URI'),
  internalSecret: process.env.INTERNAL_API_SECRET ?? '',
  internalPort: Number(process.env.BOT_INTERNAL_PORT ?? 3001),
  dashboardUrl: process.env.DASHBOARD_URL ?? '',
  env: process.env.NODE_ENV ?? 'development',

  // Stream alert providers
  youtubeApiKey: process.env.YOUTUBE_API_KEY ?? '',
  twitchClientId: process.env.TWITCH_CLIENT_ID ?? '',
  twitchClientSecret: process.env.TWITCH_CLIENT_SECRET ?? '',
  facebookAppId: process.env.FACEBOOK_APP_ID ?? '',
  facebookAppSecret: process.env.FACEBOOK_APP_SECRET ?? '',
  rsshubInstances: (process.env.RSSHUB_INSTANCES ?? 'https://rsshub.app')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};

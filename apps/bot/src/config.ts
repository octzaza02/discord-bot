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
};

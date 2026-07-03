import { connectMongo } from '@discord-bot/shared';

let ready: Promise<unknown> | null = null;
export function ensureDb() {
  if (!ready) ready = connectMongo(process.env.MONGO_URI!);
  return ready;
}

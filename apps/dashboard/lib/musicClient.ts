export class MusicBotNotConfigured extends Error {
  constructor() {
    super('music-bot-not-configured');
  }
}

export async function callMusic(pathName: string, init: RequestInit = {}) {
  const base = process.env.MUSIC_BOT_INTERNAL_URL;
  const secret = process.env.MUSIC_INTERNAL_SECRET;
  if (!base || !secret) throw new MusicBotNotConfigured();
  const res = await fetch(`${base}${pathName}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${secret}`,
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(json?.error ?? `music ${res.status}`);
  return json;
}

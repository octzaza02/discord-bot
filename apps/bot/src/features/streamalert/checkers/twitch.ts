import { config } from '../../../config.js';
import type { CheckResult, CreatorChecker, CreatorInfo, StreamEvent } from '../types.js';

// Twitch Helix API — auto-refresh app access token when expired.

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAppToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.token;
  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: config.twitchClientId,
      client_secret: config.twitchClientSecret,
      grant_type: 'client_credentials',
    }),
  });
  if (!res.ok) throw new Error(`Twitch token ${res.status}`);
  const j: any = await res.json();
  cachedToken = { token: j.access_token, expiresAt: Date.now() + j.expires_in * 1000 };
  return cachedToken.token;
}

async function helix(pathAndQuery: string): Promise<any> {
  const token = await getAppToken();
  const res = await fetch(`https://api.twitch.tv/helix${pathAndQuery}`, {
    headers: {
      'Client-Id': config.twitchClientId,
      Authorization: `Bearer ${token}`,
    },
  });
  if (res.status === 401) {
    cachedToken = null;
    const t2 = await getAppToken();
    const r2 = await fetch(`https://api.twitch.tv/helix${pathAndQuery}`, {
      headers: { 'Client-Id': config.twitchClientId, Authorization: `Bearer ${t2}` },
    });
    if (!r2.ok) throw new Error(`Twitch API ${r2.status}`);
    return r2.json();
  }
  if (!res.ok) throw new Error(`Twitch API ${res.status}`);
  return res.json();
}

export const twitchChecker: CreatorChecker = {
  platform: 'twitch',
  isEnabled: () => !!config.twitchClientId && !!config.twitchClientSecret,
  reason: () =>
    'ต้องตั้ง TWITCH_CLIENT_ID และ TWITCH_CLIENT_SECRET จาก dev.twitch.tv',

  async validate(input: string): Promise<CreatorInfo | null> {
    if (!config.twitchClientId || !config.twitchClientSecret) return null;
    const j = await helix(`/users?login=${encodeURIComponent(input)}`);
    const u = j.data?.[0];
    if (!u) return null;
    return { creatorId: u.login as string, name: u.display_name as string, avatarUrl: u.profile_image_url };
  },

  async check(login: string): Promise<CheckResult> {
    if (!config.twitchClientId || !config.twitchClientSecret) {
      return { events: [], liveId: null, latestVideoId: null };
    }
    const j = await helix(`/streams?user_login=${encodeURIComponent(login)}`);
    const stream = j.data?.[0];
    if (!stream) return { events: [], liveId: null, latestVideoId: null };

    const ev: StreamEvent = {
      kind: 'live',
      id: stream.id as string,
      title: stream.title || `${stream.user_name} is live`,
      url: `https://twitch.tv/${login}`,
      thumbnail: (stream.thumbnail_url as string)
        ?.replace('{width}', '1280')
        .replace('{height}', '720'),
      publishedAt: stream.started_at ? new Date(stream.started_at) : null,
      channelName: stream.user_name as string,
      channelUrl: `https://twitch.tv/${login}`,
    };

    return { events: [ev], liveId: ev.id, latestVideoId: null };
  },
};

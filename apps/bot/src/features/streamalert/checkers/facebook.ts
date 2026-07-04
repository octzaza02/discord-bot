import { config } from '../../../config.js';
import type { CheckResult, CreatorChecker, CreatorInfo, StreamEvent } from '../types.js';

// Facebook Graph API — requires a Page Access Token per page (page admin only).
// The token itself is passed via ${creatorId}|${pageAccessToken} format.
// This means the "creatorId" stored per subscription IS the token bundle.
// LIMITATION: Meta requires app review for many permissions; page tokens expire in ~60 days
// unless converted to long-lived. We only detect currently-live videos here.

async function graph(pageId: string, token: string, endpoint: string): Promise<any> {
  const url = `https://graph.facebook.com/v18.0/${pageId}${endpoint}${
    endpoint.includes('?') ? '&' : '?'
  }access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Facebook Graph ${res.status}`);
  return res.json();
}

// Encode: pageId + token as one string (colon-separated) for storage in creatorId
function encodeCreator(pageId: string, token: string): string {
  return `${pageId}|${token}`;
}
function decodeCreator(creatorId: string): { pageId: string; token: string } | null {
  const idx = creatorId.indexOf('|');
  if (idx < 1) return null;
  return { pageId: creatorId.slice(0, idx), token: creatorId.slice(idx + 1) };
}

export const facebookChecker: CreatorChecker = {
  platform: 'facebook',
  isEnabled: () => !!config.facebookAppId, // App ID is required for context; token per-subscription
  reason: () =>
    'ต้องมี FACEBOOK_APP_ID + ผู้ใช้ต้องขอ Page Access Token ต่อเพจเอง (Meta policy)',

  async validate(input: string): Promise<CreatorInfo | null> {
    // Input format: pageIdOrName:pageAccessToken
    const m = input.match(/^([^:]+):(.+)$/);
    if (!m) return null;
    const [_, pageInput, token] = m;
    try {
      const info = await graph(pageInput, token, '?fields=id,name,picture');
      if (!info?.id) return null;
      return {
        creatorId: encodeCreator(info.id, token),
        name: info.name ?? info.id,
        avatarUrl: info.picture?.data?.url ?? null,
      };
    } catch {
      return null;
    }
  },

  async check(creatorId: string): Promise<CheckResult> {
    const decoded = decodeCreator(creatorId);
    if (!decoded) return { events: [], liveId: null, latestVideoId: null };
    const { pageId, token } = decoded;

    // Get currently-live videos only (status=LIVE)
    const j = await graph(
      pageId,
      token,
      '/live_videos?fields=id,title,description,status,permalink_url,creation_time,embed_html&broadcast_status=["LIVE_NOW"]',
    );

    const events: StreamEvent[] = [];
    let liveId: string | null = null;

    const items: any[] = j?.data ?? [];
    const activeLive = items.find((x) => x.status === 'LIVE');
    if (activeLive) {
      liveId = activeLive.id;
      events.push({
        kind: 'live',
        id: activeLive.id,
        title: activeLive.title || activeLive.description?.slice(0, 100) || 'Live now',
        url: activeLive.permalink_url
          ? `https://facebook.com${activeLive.permalink_url}`
          : `https://facebook.com/${pageId}/videos/${activeLive.id}`,
        thumbnail: null,
        publishedAt: activeLive.creation_time ? new Date(activeLive.creation_time) : null,
        channelName: pageId,
        channelUrl: `https://facebook.com/${pageId}`,
      });
    }

    return { events, liveId, latestVideoId: null };
  },
};

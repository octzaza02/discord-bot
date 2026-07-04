import { config } from '../../../config.js';
import type { CheckResult, CreatorChecker, CreatorInfo, StreamEvent } from '../types.js';

// TikTok via RSSHub (open source RSS gateway).
// Falls back through configured instances if one fails.
// Endpoint: /tiktok/user/:user  → returns latest videos as RSS 2.0

interface RssItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  description?: string;
}

function parseRss2(xml: string): { channelName: string; items: RssItem[] } {
  const channelTitle = xml.match(/<channel>[\s\S]*?<title>([^<]+)<\/title>/)?.[1] ?? '';
  const items: RssItem[] = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const b = m[1];
    const title = b.match(/<title>(?:<!\[CDATA\[)?([^<\]]+)(?:\]\]>)?<\/title>/)?.[1]?.trim();
    const link = b.match(/<link>([^<]+)<\/link>/)?.[1]?.trim();
    const guid = b.match(/<guid[^>]*>([^<]+)<\/guid>/)?.[1]?.trim();
    const pubDate = b.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1]?.trim();
    if (title && link && pubDate) {
      items.push({ id: guid ?? link, title, link, pubDate });
    }
  }
  return { channelName: channelTitle, items };
}

async function tryRsshub(pathAfterBase: string): Promise<string | null> {
  for (const base of config.rsshubInstances) {
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}${pathAfterBase}`, {
        headers: { 'user-agent': 'Mozilla/5.0 (StreamAlertBot/1.0)' },
      });
      if (res.ok) return await res.text();
    } catch (err) {
      // try next instance
    }
  }
  return null;
}

function extractVideoIdFromLink(link: string): string {
  const m = link.match(/\/video\/(\d+)/);
  return m ? m[1] : link;
}

export const tiktokChecker: CreatorChecker = {
  platform: 'tiktok',
  isEnabled: () => config.rsshubInstances.length > 0,
  reason: () => 'ใช้ RSSHub public instance (ฟรี ไม่ต้อง key) — ตั้ง RSSHUB_INSTANCES ถ้าอยาก self-host',

  async validate(username: string): Promise<CreatorInfo | null> {
    const clean = username.replace(/^@/, '');
    const xml = await tryRsshub(`/tiktok/user/@${clean}`);
    if (!xml) return null;
    const { channelName, items } = parseRss2(xml);
    if (items.length === 0 && !channelName) return null;
    return {
      creatorId: clean,
      name: channelName || `@${clean}`,
    };
  },

  async check(username: string): Promise<CheckResult> {
    const clean = username.replace(/^@/, '');
    const events: StreamEvent[] = [];
    let latestVideoId: string | null = null;
    let liveId: string | null = null;

    // New videos
    const videosXml = await tryRsshub(`/tiktok/user/@${clean}`);
    if (videosXml) {
      const { channelName, items } = parseRss2(videosXml);
      const latest = items[0];
      if (latest) {
        latestVideoId = extractVideoIdFromLink(latest.link);
        events.push({
          kind: 'video',
          id: latestVideoId,
          title: latest.title.slice(0, 200),
          url: latest.link,
          thumbnail: null,
          publishedAt: new Date(latest.pubDate),
          channelName: channelName || `@${clean}`,
          channelUrl: `https://www.tiktok.com/@${clean}`,
        });
      }
    }

    // Live status (separate RSSHub route)
    const liveXml = await tryRsshub(`/tiktok/user/live/@${clean}`);
    if (liveXml) {
      const { channelName, items } = parseRss2(liveXml);
      const live = items[0];
      if (live) {
        liveId = live.id;
        events.push({
          kind: 'live',
          id: liveId,
          title: live.title.slice(0, 200),
          url: live.link || `https://www.tiktok.com/@${clean}/live`,
          thumbnail: null,
          publishedAt: new Date(live.pubDate),
          channelName: channelName || `@${clean}`,
          channelUrl: `https://www.tiktok.com/@${clean}`,
        });
      }
    }

    return { events, liveId, latestVideoId };
  },
};

import type { CheckResult, CreatorChecker, CreatorInfo, StreamEvent } from '../types.js';

// YouTube checker: RSS-only. Detects new videos and livestream starts
// (livestreams appear in the RSS as regular video entries when broadcast starts).
// No API key required.

const YT_RSS = (channelId: string) =>
  `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

interface RssEntry {
  videoId: string;
  title: string;
  published: string;
}

function parseRss(xml: string): { channelName: string; entries: RssEntry[] } {
  const nameMatch = xml.match(/<author>\s*<name>([^<]+)<\/name>/);
  const channelName = nameMatch ? nameMatch[1].trim() : '';
  const entries: RssEntry[] = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(xml)) !== null) {
    const block = m[1];
    const vid = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = block.match(/<title>([^<]+)<\/title>/)?.[1];
    const published = block.match(/<published>([^<]+)<\/published>/)?.[1];
    if (vid && title && published) entries.push({ videoId: vid, title, published });
  }
  return { channelName, entries };
}

// Bypass YouTube EU cookie consent page (returns different HTML without channelId)
const YT_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9',
  cookie: 'CONSENT=YES+cb.20210328-17-p0.en+FX+000',
};

function extractChannelId(html: string): string | null {
  // Try multiple patterns — YouTube tweaks HTML periodically
  const patterns = [
    /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/,
    /<meta property="og:url" content="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/,
    /"channelId":"(UC[\w-]{22})"/,
    /"externalId":"(UC[\w-]{22})"/,
    /\/channel\/(UC[\w-]{22})/,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractChannelName(html: string): string | null {
  const patterns = [
    /<meta property="og:title" content="([^"]+)"/,
    /<meta name="title" content="([^"]+)"/,
    /"title":"([^"]{1,120})"/,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1];
  }
  return null;
}

async function resolveChannelId(
  input: string,
): Promise<{ id: string; name: string } | null> {
  // Already a channel ID
  if (/^UC[\w-]{22}$/.test(input)) {
    const res = await fetch(YT_RSS(input));
    if (!res.ok) return null;
    const xml = await res.text();
    const { channelName } = parseRss(xml);
    if (!channelName) return null;
    return { id: input, name: channelName };
  }

  // Try handle then bare name
  const attempts = input.startsWith('@')
    ? [input]
    : [`@${input}`, `c/${input}`, `user/${input}`];

  for (const path of attempts) {
    try {
      const res = await fetch(`https://www.youtube.com/${path}`, {
        headers: YT_HEADERS,
        redirect: 'follow',
      });
      if (!res.ok) continue;
      const html = await res.text();
      const id = extractChannelId(html);
      if (!id) continue;
      const name = extractChannelName(html) ?? id;
      return { id, name };
    } catch (err) {
      console.warn('[youtube resolve]', path, err instanceof Error ? err.message : err);
    }
  }
  return null;
}

export const youtubeChecker: CreatorChecker = {
  platform: 'youtube',

  async validate(input: string): Promise<CreatorInfo | null> {
    const info = await resolveChannelId(input);
    if (!info) return null;
    return { creatorId: info.id, name: info.name };
  },

  async check(channelId: string, prevVideoId: string | null): Promise<CheckResult> {
    const res = await fetch(YT_RSS(channelId));
    if (!res.ok) throw new Error(`YouTube RSS ${res.status}`);
    const xml = await res.text();
    const { channelName, entries } = parseRss(xml);
    if (entries.length === 0) {
      return { events: [], latestVideoId: null };
    }
    const latest = entries[0];

    // If nothing changed since last cycle, skip status check to save requests
    if (latest.videoId === prevVideoId) {
      return { events: [], latestVideoId: latest.videoId };
    }

    // NEW entry — verify it's actually watchable content (not a scheduled/waiting-room live)
    const status = await getLiveStatus(latest.videoId);
    if (status === 'upcoming') {
      // Scheduled livestream not yet broadcasting — do NOT notify, do NOT advance state
      // (so we recheck next cycle and fire when broadcast actually starts)
      return { events: [], latestVideoId: null };
    }

    const ev: StreamEvent = {
      id: latest.videoId,
      title: latest.title,
      url: `https://youtube.com/watch?v=${latest.videoId}`,
      thumbnail: `https://i.ytimg.com/vi/${latest.videoId}/maxresdefault.jpg`,
      publishedAt: new Date(latest.published),
      channelName,
      channelUrl: `https://youtube.com/channel/${channelId}`,
    };
    return { events: [ev], latestVideoId: latest.videoId };
  },
};

async function getLiveStatus(videoId: string): Promise<'live' | 'upcoming' | 'video'> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: YT_HEADERS,
    });
    if (!res.ok) return 'video';
    const html = await res.text();

    // Explicit upcoming markers (scheduled / waiting room / pre-broadcast)
    if (/"isUpcoming"\s*:\s*true/.test(html)) return 'upcoming';
    if (/"liveBroadcastDetails"\s*:\s*\{[^}]*"isLiveNow"\s*:\s*false/.test(html)) {
      // Has broadcast details but not live now — could be upcoming or ended
      // Check scheduledStartTime to distinguish
      if (/"scheduledStartTime"/.test(html) && !/"endTimestamp"/.test(html)) return 'upcoming';
    }

    // Explicit live markers
    if (/"isLiveNow"\s*:\s*true/.test(html)) return 'live';
    if (/"isLive"\s*:\s*true/.test(html)) return 'live';

    // Regular uploaded video
    return 'video';
  } catch {
    // Network error → fail-safe: treat as video (don't want to miss real uploads)
    return 'video';
  }
}

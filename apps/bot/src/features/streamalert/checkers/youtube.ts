import { config } from '../../../config.js';
import type { CheckResult, CreatorChecker, CreatorInfo, StreamEvent } from '../types.js';

// YouTube checker uses RSS for new-video detection (no API key required)
// and Data API v3 (if configured) for accurate live status.
// Without API key: still detect new videos + livestream START (RSS entry appears),
// but cannot distinguish "actually live now" vs "waiting room" reliably.
// With API key: use liveStreamingDetails.actualStartTime for precise live state.

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YT_RSS = (channelId: string) =>
  `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

interface RssEntry {
  videoId: string;
  title: string;
  published: string; // ISO
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

async function resolveChannelId(input: string): Promise<{ id: string; name: string } | null> {
  // Already a channel ID (starts with UC and 24 chars)
  if (/^UC[\w-]{22}$/.test(input)) {
    // Verify by fetching RSS
    const res = await fetch(YT_RSS(input));
    if (!res.ok) return null;
    const xml = await res.text();
    const { channelName } = parseRss(xml);
    if (!channelName) return null;
    return { id: input, name: channelName };
  }

  // Handle (@name) or bare name — need API key or scrape page
  if (config.youtubeApiKey) {
    const q = encodeURIComponent(input.replace(/^@/, ''));
    const url = `${YT_API_BASE}/search?part=snippet&type=channel&maxResults=1&q=${q}&key=${config.youtubeApiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json: any = await res.json();
    const item = json.items?.[0];
    if (!item) return null;
    return {
      id: item.snippet.channelId,
      name: item.snippet.channelTitle,
    };
  }

  // Fallback: scrape channel page HTML for channelId meta tag
  const handle = input.startsWith('@') ? input : `@${input}`;
  const res = await fetch(`https://www.youtube.com/${handle}`, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; StreamAlertBot/1.0)' },
  });
  if (!res.ok) return null;
  const html = await res.text();
  const idMatch = html.match(/"channelId":"(UC[\w-]{22})"/);
  const nameMatch =
    html.match(/<meta property="og:title" content="([^"]+)"/) ??
    html.match(/"title":"([^"]+)"/);
  if (!idMatch) return null;
  return { id: idMatch[1], name: nameMatch ? nameMatch[1] : idMatch[1] };
}

async function isLiveViaApi(videoId: string): Promise<boolean> {
  if (!config.youtubeApiKey) return false;
  const url = `${YT_API_BASE}/videos?part=liveStreamingDetails&id=${videoId}&key=${config.youtubeApiKey}`;
  const res = await fetch(url);
  if (!res.ok) return false;
  const json: any = await res.json();
  const d = json.items?.[0]?.liveStreamingDetails;
  if (!d) return false;
  return !!d.actualStartTime && !d.actualEndTime;
}

export const youtubeChecker: CreatorChecker = {
  platform: 'youtube',
  isEnabled: () => true, // RSS works without any key
  reason: () => 'ใช้ YouTube RSS ฟรี ไม่ต้องตั้ง key',

  async validate(input: string): Promise<CreatorInfo | null> {
    const info = await resolveChannelId(input);
    if (!info) return null;
    return { creatorId: info.id, name: info.name };
  },

  async check(channelId: string): Promise<CheckResult> {
    const res = await fetch(YT_RSS(channelId));
    if (!res.ok) throw new Error(`YouTube RSS ${res.status}`);
    const xml = await res.text();
    const { channelName, entries } = parseRss(xml);
    if (entries.length === 0) {
      return { events: [], liveId: null, latestVideoId: null };
    }

    const events: StreamEvent[] = [];
    const latest = entries[0];

    // Check if latest is a currently-active live (requires API key for accuracy)
    let liveId: string | null = null;
    if (config.youtubeApiKey) {
      // Check top 3 entries for a live one (usually only the most recent 1-2)
      for (const e of entries.slice(0, 3)) {
        const live = await isLiveViaApi(e.videoId);
        if (live) {
          liveId = e.videoId;
          events.push({
            kind: 'live',
            id: e.videoId,
            title: e.title,
            url: `https://youtube.com/watch?v=${e.videoId}`,
            thumbnail: `https://i.ytimg.com/vi/${e.videoId}/maxresdefault.jpg`,
            publishedAt: new Date(e.published),
            channelName,
            channelUrl: `https://youtube.com/channel/${channelId}`,
          });
          break;
        }
      }
    }

    // New video (upload event)
    events.push({
      kind: 'video',
      id: latest.videoId,
      title: latest.title,
      url: `https://youtube.com/watch?v=${latest.videoId}`,
      thumbnail: `https://i.ytimg.com/vi/${latest.videoId}/maxresdefault.jpg`,
      publishedAt: new Date(latest.published),
      channelName,
      channelUrl: `https://youtube.com/channel/${channelId}`,
    });

    return { events, liveId, latestVideoId: latest.videoId };
  },
};

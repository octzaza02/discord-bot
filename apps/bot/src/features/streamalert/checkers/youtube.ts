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

  // Handle / bare name → scrape channel page for channelId meta
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

export const youtubeChecker: CreatorChecker = {
  platform: 'youtube',

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
      return { events: [], latestVideoId: null };
    }
    const latest = entries[0];
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

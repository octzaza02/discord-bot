import type { StreamPlatform } from '@discord-bot/shared';

// Extract creator identifier from URL or plain input.
// Returns platform-normalized "creatorId" (channel ID for YT, login for Twitch, etc.)
// If input is already a plain ID/name, returns it trimmed.

export function parseYouTubeInput(input: string): { channelIdOrHandle: string } | null {
  const s = input.trim();
  // Channel ID: UCxxxxxxxxxxxxxxxxxx (24 chars starting with UC)
  if (/^UC[\w-]{22}$/.test(s)) return { channelIdOrHandle: s };
  // Handle: @name
  if (/^@[\w.-]+$/.test(s)) return { channelIdOrHandle: s };
  // URL patterns
  const m = s.match(
    /(?:youtube\.com\/(?:channel\/(UC[\w-]+)|@([\w.-]+)|c\/([\w.-]+)|user\/([\w.-]+)))/i,
  );
  if (m) {
    if (m[1]) return { channelIdOrHandle: m[1] };
    if (m[2]) return { channelIdOrHandle: `@${m[2]}` };
    if (m[3]) return { channelIdOrHandle: m[3] };
    if (m[4]) return { channelIdOrHandle: m[4] };
  }
  // Bare name (assume handle)
  if (/^[\w.-]+$/.test(s)) return { channelIdOrHandle: s };
  return null;
}

export function parseTwitchInput(input: string): { login: string } | null {
  const s = input.trim().toLowerCase();
  const m = s.match(/twitch\.tv\/([a-z0-9_]{3,25})/i);
  if (m) return { login: m[1].toLowerCase() };
  if (/^[a-z0-9_]{3,25}$/i.test(s)) return { login: s.toLowerCase() };
  return null;
}

export function parseTikTokInput(input: string): { username: string } | null {
  const s = input.trim();
  const m = s.match(/tiktok\.com\/@([\w.-]+)/i);
  if (m) return { username: m[1] };
  const withAt = s.match(/^@([\w.-]+)$/);
  if (withAt) return { username: withAt[1] };
  if (/^[\w.-]+$/.test(s)) return { username: s };
  return null;
}

export function parseFacebookInput(input: string): { pageIdOrName: string } | null {
  const s = input.trim();
  const m = s.match(/facebook\.com\/([\w.-]+)/i);
  if (m) return { pageIdOrName: m[1] };
  if (/^\d+$/.test(s)) return { pageIdOrName: s }; // numeric page ID
  if (/^[\w.-]+$/.test(s)) return { pageIdOrName: s };
  return null;
}

export function normalizeInput(platform: StreamPlatform, input: string): string | null {
  switch (platform) {
    case 'youtube':
      return parseYouTubeInput(input)?.channelIdOrHandle ?? null;
    case 'twitch':
      return parseTwitchInput(input)?.login ?? null;
    case 'tiktok':
      return parseTikTokInput(input)?.username ?? null;
    case 'facebook':
      return parseFacebookInput(input)?.pageIdOrName ?? null;
  }
}

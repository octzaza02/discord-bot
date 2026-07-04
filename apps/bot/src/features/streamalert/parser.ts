export function parseYouTubeInput(input: string): { channelIdOrHandle: string } | null {
  const s = input.trim();
  // Channel ID: UCxxxxxxxxxxxxxxxxxx
  if (/^UC[\w-]{22}$/.test(s)) return { channelIdOrHandle: s };
  // Handle: @name
  if (/^@[\w.-]+$/.test(s)) return { channelIdOrHandle: s };
  // URL
  const m = s.match(
    /(?:youtube\.com\/(?:channel\/(UC[\w-]+)|@([\w.-]+)|c\/([\w.-]+)|user\/([\w.-]+)))/i,
  );
  if (m) {
    if (m[1]) return { channelIdOrHandle: m[1] };
    if (m[2]) return { channelIdOrHandle: `@${m[2]}` };
    if (m[3]) return { channelIdOrHandle: m[3] };
    if (m[4]) return { channelIdOrHandle: m[4] };
  }
  if (/^[\w.-]+$/.test(s)) return { channelIdOrHandle: s };
  return null;
}

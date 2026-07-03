export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  permissions: string; // bitfield as string
  owner: boolean;
}

const MANAGE_GUILD = 0x20n;
const CACHE_TTL_MS = 60_000;
const guildsCache = new Map<string, { expiresAt: number; guilds: DiscordGuild[] }>();

export async function fetchUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
  const now = Date.now();
  const cached = guildsCache.get(accessToken);
  if (cached && cached.expiresAt > now) return cached.guilds;

  const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    // On rate limit or transient error, fall back to stale cache if we have one
    if (cached) return cached.guilds;
    throw new Error(`Discord API ${res.status}`);
  }
  const guilds = (await res.json()) as DiscordGuild[];
  guildsCache.set(accessToken, { expiresAt: now + CACHE_TTL_MS, guilds });
  return guilds;
}

export function userCanManage(guild: Pick<DiscordGuild, 'permissions' | 'owner'>): boolean {
  if (guild.owner) return true;
  try {
    return (BigInt(guild.permissions) & MANAGE_GUILD) === MANAGE_GUILD;
  } catch {
    return false;
  }
}

export function guildIconUrl(id: string, icon: string | null | undefined): string | null {
  if (!icon) return null;
  return `https://cdn.discordapp.com/icons/${id}/${icon}.png`;
}

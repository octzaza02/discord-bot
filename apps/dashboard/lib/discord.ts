export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  permissions: string; // bitfield as string
  owner: boolean;
}

const MANAGE_GUILD = 0x20n;

export async function fetchUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
  const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Discord API ${res.status}`);
  return res.json();
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

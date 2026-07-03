import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { fetchUserGuilds, userCanManage } from './discord';

export async function authorizeGuild(guildId: string): Promise<boolean> {
  const session = await getServerSession(authOptions);
  const token = (session as any)?.accessToken as string | undefined;
  if (!token) {
    console.warn('[authorize] no session token for guild', guildId);
    return false;
  }
  try {
    const guilds = await fetchUserGuilds(token);
    const g = guilds.find((x) => x.id === guildId);
    if (!g) {
      console.warn('[authorize] user not in guild', guildId, 'has', guilds.length, 'guilds');
      return false;
    }
    const can = userCanManage(g);
    if (!can) console.warn('[authorize] user lacks MANAGE_GUILD for', guildId);
    return can;
  } catch (err) {
    console.error('[authorize] fetchUserGuilds failed for', guildId, err);
    return false;
  }
}

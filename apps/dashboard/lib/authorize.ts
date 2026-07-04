import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { fetchUserGuilds, userCanManage } from './discord';

export type AuthReason =
  | 'ok'
  | 'no_session'
  | 'discord_error'
  | 'not_in_guild'
  | 'no_permission';

export async function authorizeGuildDetailed(
  guildId: string,
): Promise<{ ok: boolean; reason: AuthReason }> {
  const session = await getServerSession(authOptions);
  const token = (session as any)?.accessToken as string | undefined;
  if (!token) {
    console.warn('[authorize] no session token for guild', guildId);
    return { ok: false, reason: 'no_session' };
  }
  try {
    const guilds = await fetchUserGuilds(token);
    const g = guilds.find((x) => x.id === guildId);
    if (!g) {
      console.warn('[authorize] user not in guild', guildId, 'has', guilds.length, 'guilds');
      return { ok: false, reason: 'not_in_guild' };
    }
    const can = userCanManage(g);
    if (!can) {
      console.warn('[authorize] user lacks MANAGE_GUILD for', guildId);
      return { ok: false, reason: 'no_permission' };
    }
    return { ok: true, reason: 'ok' };
  } catch (err) {
    console.error('[authorize] fetchUserGuilds failed for', guildId, err);
    return { ok: false, reason: 'discord_error' };
  }
}

export async function authorizeGuild(guildId: string): Promise<boolean> {
  return (await authorizeGuildDetailed(guildId)).ok;
}

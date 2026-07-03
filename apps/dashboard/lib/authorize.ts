import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { fetchUserGuilds, userCanManage } from './discord';

export async function authorizeGuild(guildId: string): Promise<boolean> {
  const session = await getServerSession(authOptions);
  const token = (session as any)?.accessToken as string | undefined;
  if (!token) return false;
  const guilds = await fetchUserGuilds(token).catch(() => []);
  const g = guilds.find((x) => x.id === guildId);
  return !!g && userCanManage(g);
}

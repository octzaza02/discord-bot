import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import { ensureDb } from '../../lib/db';
import { fetchUserGuilds, userCanManage, guildIconUrl } from '../../lib/discord';
import { BotGuild } from '@discord-bot/shared';

export const dynamic = 'force-dynamic';

export default async function ServersPage() {
  const session = await getServerSession(authOptions);
  const accessToken = (session as any)?.accessToken as string | undefined;
  if (!accessToken) redirect('/api/auth/signin/discord');

  const [userGuilds] = await Promise.all([fetchUserGuilds(accessToken), ensureDb()]);
  const manageable = userGuilds.filter(userCanManage);
  const botGuildIds = new Set(
    (await BotGuild.find({ guildId: { $in: manageable.map((g) => g.id) } })).map((g) => g.guildId),
  );

  const withBot = manageable.filter((g) => botGuildIds.has(g.id));
  const withoutBot = manageable.filter((g) => !botGuildIds.has(g.id));

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-semibold mb-6">เลือกเซิร์ฟเวอร์</h1>

      <h2 className="text-sm uppercase tracking-wide text-neutral-400 mb-3">มีบอทอยู่แล้ว</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
        {withBot.length === 0 && (
          <p className="text-neutral-500 text-sm">ยังไม่มีเซิร์ฟเวอร์ที่บอทเข้าอยู่</p>
        )}
        {withBot.map((g) => (
          <Link
            key={g.id}
            href={`/servers/${g.id}/welcome`}
            className="flex items-center gap-3 p-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800"
          >
            {guildIconUrl(g.id, g.icon) ? (
              <Image src={guildIconUrl(g.id, g.icon)!} width={40} height={40} alt="" className="rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center text-sm">
                {g.name.slice(0, 1)}
              </div>
            )}
            <span className="font-medium truncate">{g.name}</span>
          </Link>
        ))}
      </div>

      <h2 className="text-sm uppercase tracking-wide text-neutral-400 mb-3">ยังไม่ได้เชิญบอท</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {withoutBot.map((g) => (
          <div
            key={g.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-neutral-900 border border-neutral-800 opacity-70"
          >
            <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center text-sm">
              {g.name.slice(0, 1)}
            </div>
            <span className="truncate flex-1">{g.name}</span>
            <span className="text-xs text-neutral-500">ยังไม่ได้เชิญ</span>
          </div>
        ))}
      </div>
    </main>
  );
}

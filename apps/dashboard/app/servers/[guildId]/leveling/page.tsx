import { ensureDb } from '../../../../lib/db';
import { getOrCreateGuildConfig } from '@discord-bot/shared';
import { LevelingForm } from './LevelingForm';
import { UserAdmin } from './UserAdmin';

export const dynamic = 'force-dynamic';

export default async function LevelingPage({ params }: { params: { guildId: string } }) {
  await ensureDb();
  const cfg = await getOrCreateGuildConfig(params.guildId);
  const lv = cfg.leveling;

  return (
    <div className="space-y-10 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold mb-2">⭐ Leveling</h1>
        <p className="text-sm text-neutral-400">
          ผู้ใช้ได้ XP จากการแชท → สะสมจนขึ้นเลเวล เปิด/ปิดฟีเจอร์ที่{' '}
          <a className="text-indigo-400 hover:underline" href={`/servers/${params.guildId}`}>
            หน้าภาพรวม
          </a>
        </p>
      </div>

      <LevelingForm
        guildId={params.guildId}
        initial={{
          xpPerMessage: lv.xpPerMessage,
          cooldownSeconds: lv.cooldownSeconds,
          minMessageLength: lv.minMessageLength,
          ignoredChannels: (lv.ignoredChannels ?? []).join(', '),
          ignoredRoles: (lv.ignoredRoles ?? []).join(', '),
          stackRewards: lv.stackRewards,
          announce: {
            mode: lv.announce?.mode ?? 'same',
            channelId: lv.announce?.channelId ?? '',
            template: lv.announce?.template ?? '',
          },
          rewards: (lv.rewards ?? []).map((r) => ({ level: r.level, roleId: r.roleId })),
        }}
      />

      <UserAdmin guildId={params.guildId} />
    </div>
  );
}

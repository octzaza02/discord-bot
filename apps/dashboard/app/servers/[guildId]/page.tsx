import { ensureDb } from '../../../lib/db';
import { getOrCreateGuildConfig } from '@discord-bot/shared';
import { FeatureToggles } from './FeatureToggles';

export const dynamic = 'force-dynamic';

export default async function GuildOverviewPage({
  params,
}: {
  params: { guildId: string };
}) {
  await ensureDb();
  const cfg = await getOrCreateGuildConfig(params.guildId);

  const features = {
    welcome: cfg.features?.welcome?.enabled ?? true,
    rolebutton: cfg.features?.rolebutton?.enabled ?? true,
    leveling: cfg.features?.leveling?.enabled ?? false,
    dashboardDm: cfg.features?.dashboardDm?.enabled ?? true,
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">📊 ภาพรวม</h1>
      <p className="text-sm text-neutral-400 mb-6">
        เปิด/ปิดแต่ละฟีเจอร์ที่ต้องการใช้ในเซิร์ฟเวอร์นี้
      </p>
      <FeatureToggles guildId={params.guildId} initial={features} />
    </div>
  );
}

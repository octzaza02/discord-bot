import { ensureDb } from '../../../lib/db';
import { getOrCreateGuildConfig } from '@discord-bot/shared';
import { FeatureToggles } from './FeatureToggles';
import { HowToUse, Kbd } from '../../../components/HowToUse';

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

      <HowToUse title="วิธีใช้ Feature Toggles" defaultOpen>
        <p>
          แต่ละการ์ดคือฟีเจอร์แยกอิสระ — <b>สลับ toggle</b> = เปิด/ปิดฟีเจอร์นั้นทันที
          (บันทึกอัตโนมัติ)
        </p>
        <ul className="list-disc pl-5 space-y-1 text-neutral-400">
          <li>
            <b>👋 Welcome message</b> — ส่งข้อความต้อนรับเมื่อสมาชิกใหม่เข้าเซิร์ฟ
          </li>
          <li>
            <b>🎯 Role panels</b> — ปุ่มให้ผู้ใช้กดรับยศเอง
          </li>
          <li>
            <b>⭐ Leveling</b> — ผู้ใช้ได้ XP จากการแชท → ขึ้นเลเวล + Level rewards
          </li>
          <li>
            <b>🔧 Owner DM</b> — บอท DM หา owner ตอนถูกเชิญเข้าเซิร์ฟใหม่ พร้อมลิงก์นี้
          </li>
        </ul>
        <p className="text-neutral-400">
          กดปุ่ม <Kbd>ตั้งค่า →</Kbd> ในแต่ละการ์ดเพื่อเข้าไปปรับรายละเอียด
        </p>
        <p className="text-neutral-500 text-xs pt-2 border-t border-neutral-800">
          <b>Tip:</b> ทุกฟีเจอร์แยกกันต่อเซิร์ฟ ปิดในเซิร์ฟหนึ่งไม่กระทบเซิร์ฟอื่น
        </p>
      </HowToUse>

      <FeatureToggles guildId={params.guildId} initial={features} />
    </div>
  );
}

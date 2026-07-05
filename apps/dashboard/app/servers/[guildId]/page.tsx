import Link from 'next/link';
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
    poll: cfg.features?.poll?.enabled ?? true,
    streamalert: cfg.features?.streamalert?.enabled ?? false,
    dashboardDm: cfg.features?.dashboardDm?.enabled ?? true,
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2 text-amber-heading">📊 ภาพรวม</h1>
      <p className="text-sm text-amber-sub mb-6">
        เปิด/ปิดแต่ละฟีเจอร์ที่ต้องการใช้ในเซิร์ฟเวอร์นี้
      </p>

      <HowToUse title="วิธีใช้ Feature Toggles" defaultOpen>
        <p>
          แต่ละการ์ดคือฟีเจอร์แยกอิสระ — <b>สลับ toggle</b> = เปิด/ปิดฟีเจอร์นั้นทันที
          (บันทึกอัตโนมัติ)
        </p>
        <ul className="list-disc pl-5 space-y-1 text-amber-sub">
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
            <b>📊 Polls</b> — สร้างโพลโหวตในชุมชน กดปุ่มโหวต ผลอัปเดตสด
          </li>
          <li>
            <b>🔔 YouTube Alerts</b> — แจ้งเตือนเมื่อ YouTube channel ที่ติดตามปล่อยคลิปใหม่หรือเริ่มไลฟ์
          </li>
          <li>
            <b>🔧 Owner DM</b> — บอท DM หา owner ตอนถูกเชิญเข้าเซิร์ฟใหม่ พร้อมลิงก์นี้
          </li>
        </ul>
        <p className="text-amber-sub">
          กดปุ่ม <Kbd>ตั้งค่า →</Kbd> ในแต่ละการ์ดเพื่อเข้าไปปรับรายละเอียด
        </p>
        <p className="text-amber-sub text-xs pt-2 border-t border-amber-border">
          <b>Tip:</b> ทุกฟีเจอร์แยกกันต่อเซิร์ฟ ปิดในเซิร์ฟหนึ่งไม่กระทบเซิร์ฟอื่น
        </p>
      </HowToUse>

      <FeatureToggles guildId={params.guildId} initial={features} />

      <h2 className="text-sm uppercase tracking-wide text-amber-sub mt-8 mb-2">
        บอทเสริม (self-hosted)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border border-amber-border bg-amber-surface shadow-sm flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🎵</span>
                <span className="font-medium text-amber-heading">Music bot</span>
              </div>
              <div className="text-xs text-amber-sub">
                เล่นเพลง YouTube/SoundCloud ในช่อง voice + คิว + loop
              </div>
            </div>
            <span className="text-[10px] uppercase tracking-wide text-amber-sub border border-amber-border rounded px-2 py-1 whitespace-nowrap">
              บอทแยก
            </span>
          </div>
          <Link
            href={`/servers/${params.guildId}/music`}
            className="text-xs text-amber-link hover:text-amber-primary self-start font-medium"
          >
            ดูคำสั่ง →
          </Link>
        </div>
      </div>
    </div>
  );
}

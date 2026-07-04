import { ensureDb } from '../../../../lib/db';
import { StreamSubscription } from '@discord-bot/shared';
import { SubscriptionsList } from './SubscriptionsList';
import { HowToUse, Step, Kbd } from '../../../../components/HowToUse';

export const dynamic = 'force-dynamic';

export default async function StreamAlertsPage({
  params,
}: {
  params: { guildId: string };
}) {
  await ensureDb();
  const subs = await StreamSubscription.find({ guildId: params.guildId })
    .sort({ creatorName: 1 })
    .lean();

  const initial = subs.map((s) => ({
    _id: String(s._id),
    creatorId: s.creatorId,
    creatorName: s.creatorName,
    discordChannelId: s.discordChannelId,
    pingType: (s.pingType ?? 'none') as 'none' | 'role' | 'everyone' | 'here',
    pingRoleId: s.pingRoleId ?? null,
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2 text-amber-heading">🔔 Stream Alerts</h1>
      <p className="text-sm text-amber-sub mb-6">
        แจ้งเตือนเมื่อ YouTube channel ที่ติดตามปล่อยคลิปใหม่หรือเริ่มไลฟ์
      </p>

      <HowToUse title="วิธีใช้" defaultOpen>
        <p>
          บอทจะเช็ค YouTube RSS ทุก 5 นาที ถ้ามีวิดีโอใหม่ (รวมไลฟ์ที่กำลังสตรีม) จะส่ง embed
          พร้อมลิงก์ในห้อง Discord ที่คุณเลือก
        </p>

        <div className="rounded bg-amber-primary/10 border border-amber-primary/40 p-3 text-xs text-amber-heading">
          <b>สำคัญ:</b> ต้องเปิด feature <b>Stream Alerts</b> ที่หน้า{' '}
          <a
            href={`/servers/${params.guildId}`}
            className="text-amber-link hover:text-amber-primary underline"
          >
            ภาพรวม
          </a>{' '}
          ก่อน ไม่งั้นบอทจะไม่ส่งการแจ้งเตือน
        </div>

        <div className="space-y-2">
          <Step n={1}>
            ใน Discord: <Kbd>/subscribe channel:URL notify_in:#ห้อง</Kbd>
          </Step>
          <Step n={2}>
            รับได้ 3 รูปแบบ:
            <ul className="list-disc pl-5 mt-1 text-xs space-y-0.5">
              <li>
                URL เต็ม: <Kbd>https://www.youtube.com/@MrBeast</Kbd>
              </li>
              <li>
                Channel ID: <Kbd>UCX6OQ3DkcsbYNE6H8uQQuVA</Kbd>
              </li>
              <li>
                Handle: <Kbd>@MrBeast</Kbd>
              </li>
            </ul>
          </Step>
          <Step n={3}>
            รอ 5 นาที (poll interval) — ถ้ามีคลิปใหม่ = embed ขึ้นในห้องที่เลือก
          </Step>
        </div>

        <div className="space-y-2 pt-2 border-t border-amber-border">
          <div className="font-medium text-amber-heading">🎮 คำสั่ง Discord</div>
          <ul className="list-disc pl-5 space-y-1 text-amber-sub text-xs">
            <li>
              <Kbd>/subscribe channel:URL notify_in:#ห้อง</Kbd> — เพิ่ม
            </li>
            <li>
              <Kbd>/unsubscribe channel:URL</Kbd> — ลบ
            </li>
            <li>
              <Kbd>/list-subscriptions</Kbd> — ดูทั้งหมด
            </li>
          </ul>
        </div>

        <p className="text-amber-sub text-xs pt-2 border-t border-amber-border">
          ✅ ไม่ต้องขอ API key — ใช้ YouTube RSS ฟรี ไม่มี rate limit
          <br />
          RSS แสดง 15 videos ล่าสุด รวมถึงไลฟ์ที่กำลังสตรีม (ยกเว้น waiting room / scheduled)
        </p>
      </HowToUse>

      <SubscriptionsList guildId={params.guildId} initial={initial} />
    </div>
  );
}

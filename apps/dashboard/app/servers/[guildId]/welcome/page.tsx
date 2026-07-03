import { ensureDb } from '../../../../lib/db';
import { getOrCreateGuildConfig } from '@discord-bot/shared';
import { WelcomeForm } from './WelcomeForm';
import { HowToUse, Step, Kbd } from '../../../../components/HowToUse';

export default async function WelcomePage({ params }: { params: { guildId: string } }) {
  await ensureDb();
  const cfg = await getOrCreateGuildConfig(params.guildId);
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6 text-amber-heading">👋 Welcome message</h1>

      <HowToUse>
        <p>
          บอทจะส่งข้อความต้อนรับในห้องที่คุณเลือก เมื่อมีสมาชิกใหม่เข้าเซิร์ฟ
        </p>
        <div className="space-y-2">
          <Step n={1}>
            <b>เปิดใช้งาน</b> — ติ๊ก "เปิดใช้งานข้อความต้อนรับ"
          </Step>
          <Step n={2}>
            <b>Channel ID</b> — ห้องที่จะส่งข้อความ
            <div className="text-xs text-amber-sub mt-1">
              เปิด <Kbd>User Settings → Advanced → Developer Mode</Kbd> ใน Discord →
              คลิกขวาห้อง → <Kbd>Copy Channel ID</Kbd>
            </div>
          </Step>
          <Step n={3}>
            <b>Template</b> — ข้อความ ใช้ตัวแปรได้:
            <ul className="list-disc pl-5 mt-1 text-xs text-amber-sub space-y-0.5">
              <li>
                <Kbd>{'{user}'}</Kbd> — mention สมาชิกใหม่ (ping ได้)
              </li>
              <li>
                <Kbd>{'{username}'}</Kbd> — ชื่อ (ไม่ ping)
              </li>
              <li>
                <Kbd>{'{server}'}</Kbd> — ชื่อเซิร์ฟเวอร์
              </li>
              <li>
                <Kbd>{'{memberCount}'}</Kbd> — จำนวนสมาชิกปัจจุบัน
              </li>
            </ul>
          </Step>
          <Step n={4}>
            <b>Preview</b> ด้านล่าง form → ดูตัวอย่างสด → กด <Kbd>บันทึก</Kbd>
          </Step>
        </div>
        <p className="text-amber-sub text-xs pt-2 border-t border-amber-border">
          <b>ทดสอบ:</b> ใน Discord พิมพ์ <Kbd>/welcome preview</Kbd> เพื่อดูตัวอย่างจริงจากบอท
        </p>
      </HowToUse>

      <WelcomeForm
        guildId={params.guildId}
        initial={{
          enabled: cfg.welcome?.enabled ?? false,
          channelId: cfg.welcome?.channelId ?? '',
          template: cfg.welcome?.template ?? '',
        }}
      />
    </div>
  );
}

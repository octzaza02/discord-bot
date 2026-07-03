import Link from 'next/link';
import { ensureDb, } from '../../../../lib/db';
import { RolePanel } from '@discord-bot/shared';
import { NewPanelButton } from './NewPanelButton';
import { HowToUse, Step, Kbd } from '../../../../components/HowToUse';

export default async function RolePanelsPage({ params }: { params: { guildId: string } }) {
  await ensureDb();
  const panels = await RolePanel.find({ guildId: params.guildId }).lean();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-amber-heading">🎯 Role panels</h1>
        <NewPanelButton guildId={params.guildId} />
      </div>

      <HowToUse>
        <p>
          สร้างข้อความที่มีปุ่ม → ผู้ใช้กดปุ่มเพื่อ <b>toggle</b> ยศเข้า/ออก (กด 2 ครั้งเพื่อถอด)
        </p>
        <div className="space-y-2">
          <Step n={1}>
            กด <Kbd>+ สร้างใหม่</Kbd> → ตั้งชื่อ panel
          </Step>
          <Step n={2}>
            <b>ตั้งค่า panel</b> — ใส่ Title, Description, และ Channel ID ที่จะโพสต์
          </Step>
          <Step n={3}>
            <b>เพิ่มปุ่มยศ</b> — กด <Kbd>+ เพิ่มปุ่ม</Kbd> → กรอก Role ID, Label, Emoji (optional),
            เลือกสี
            <div className="text-xs text-amber-sub mt-1">
              หา Role ID: เปิด Developer Mode ใน Discord → คลิกขวาที่ยศใน{' '}
              <Kbd>Server Settings → Roles</Kbd> → <Kbd>Copy Role ID</Kbd>
            </div>
          </Step>
          <Step n={4}>
            กด <Kbd>บันทึก</Kbd> แล้วกด <Kbd>โพสต์ลง Discord</Kbd> — ปุ่มจะขึ้นในห้อง
          </Step>
        </div>
        <div className="rounded bg-amber-primary/10 border border-amber-primary/40 p-3 text-xs text-amber-heading">
          <b>สำคัญ:</b> ยศบอทต้อง<b>อยู่สูงกว่า</b>ยศที่จะให้ผู้ใช้กดรับ ไม่งั้นบอทจะเพิ่มยศให้ไม่ได้
          (จัดการที่ <Kbd>Server Settings → Roles</Kbd> ใน Discord)
        </div>
        <p className="text-amber-sub text-xs pt-2 border-t border-amber-border">
          รองรับสูงสุด <b>25 ปุ่มต่อ panel</b> (5 rows × 5 buttons)
        </p>
      </HowToUse>

      {panels.length === 0 ? (
        <p className="text-amber-sub text-sm">ยังไม่มี panel — กด "สร้างใหม่" เพื่อเริ่ม</p>
      ) : (
        <ul className="space-y-2">
          {panels.map((p) => (
            <li key={String(p._id)}>
              <Link
                href={`/servers/${params.guildId}/rolepanels/${String(p._id)}`}
                className="block p-4 rounded-lg bg-amber-surface border border-amber-border hover:bg-amber-bg shadow-sm"
              >
                <div className="font-medium text-amber-heading">{p.title}</div>
                <div className="text-xs text-amber-sub mt-1">
                  {p.roles.length} ปุ่ม {p.messageId ? '· โพสต์แล้ว' : '· ยังไม่ได้โพสต์'}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

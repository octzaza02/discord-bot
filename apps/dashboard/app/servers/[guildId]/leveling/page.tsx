import { ensureDb } from '../../../../lib/db';
import { getOrCreateGuildConfig } from '@discord-bot/shared';
import { LevelingForm } from './LevelingForm';
import { UserAdmin } from './UserAdmin';
import { HowToUse, Step, Kbd } from '../../../../components/HowToUse';

export const dynamic = 'force-dynamic';

export default async function LevelingPage({ params }: { params: { guildId: string } }) {
  await ensureDb();
  const cfg = await getOrCreateGuildConfig(params.guildId);
  const lv = cfg.leveling;

  return (
    <div className="space-y-10 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold mb-2 text-amber-heading">⭐ Leveling</h1>
        <p className="text-sm text-amber-sub">
          ผู้ใช้ได้ XP จากการแชท → สะสมจนขึ้นเลเวล เปิด/ปิดฟีเจอร์ที่{' '}
          <a className="text-amber-link hover:text-amber-primary underline" href={`/servers/${params.guildId}`}>
            หน้าภาพรวม
          </a>
        </p>
      </div>

      <HowToUse>
        <p>
          สมาชิกได้ XP อัตโนมัติทุกครั้งที่พิมพ์ข้อความ → สะสมจนขึ้น <b>Level</b> →
          บอทประกาศ + assign ยศ reward (ถ้าตั้งไว้)
        </p>

        <div className="space-y-2">
          <div className="font-medium text-amber-heading">🎯 การตั้งค่า XP</div>
          <ul className="list-disc pl-5 space-y-1 text-amber-sub text-xs">
            <li>
              <b>XP ต่อข้อความ</b> — ค่ามาตรฐาน <Kbd>15</Kbd> (เหมือน MEE6/Arcane)
            </li>
            <li>
              <b>Cooldown</b> — กัน spam ค่ามาตรฐาน <Kbd>60</Kbd> วิ — user แชท 100 ข้อความใน 1 นาที
              จะได้ XP แค่ 1 ครั้ง
            </li>
            <li>
              <b>Min length</b> — ข้อความที่สั้นกว่านี้ไม่นับ (ป้องกัน "a", "555")
            </li>
            <li>
              <b>Ignored channels/roles</b> — คั่นด้วย <Kbd>,</Kbd> เช่น{' '}
              <Kbd>123456, 789012</Kbd> (ห้อง spam / role bot)
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <div className="font-medium text-amber-heading">📢 ประกาศ Level up</div>
          <ul className="list-disc pl-5 space-y-1 text-amber-sub text-xs">
            <li>
              <b>same</b> — ส่งในห้องที่ user เพิ่งพิมพ์ (default)
            </li>
            <li>
              <b>channel</b> — ส่งในห้องเฉพาะที่ตั้งไว้ (ต้องใส่ Channel ID)
            </li>
            <li>
              <b>dm</b> — ส่ง DM หาสมาชิก (ถ้าเขาปิด DM = เงียบ)
            </li>
            <li>
              <b>off</b> — ไม่ประกาศ (ยังนับ XP อยู่)
            </li>
            <li>
              Template ใช้ <Kbd>{'{user}'}</Kbd> <Kbd>{'{level}'}</Kbd> <Kbd>{'{xp}'}</Kbd>{' '}
              <Kbd>{'{username}'}</Kbd> <Kbd>{'{server}'}</Kbd>
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <div className="font-medium text-amber-heading">🏆 Level Rewards</div>
          <ul className="list-disc pl-5 space-y-1 text-amber-sub text-xs">
            <li>
              ตั้ง Level <Kbd>N</Kbd> → ให้ Role ID → บอท assign ให้อัตโนมัติเมื่อถึง
            </li>
            <li>
              <b>Stack ON</b> — สะสมยศทุก tier (Lv 5 = ยศ tier 5, Lv 10 = tier 5 + 10)
            </li>
            <li>
              <b>Stack OFF</b> — เฉพาะ tier สูงสุด (Lv 10 = ถอด tier 5, ให้ tier 10)
            </li>
            <li>
              <b>ยศบอทต้องอยู่สูงกว่า</b>ยศ reward ทุกอัน (ไม่งั้นให้ไม่ได้)
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <div className="font-medium text-amber-heading">🎮 คำสั่งใน Discord</div>
          <ul className="list-disc pl-5 space-y-1 text-amber-sub text-xs">
            <li>
              <Kbd>/rank</Kbd> — ดู Level, XP, progress ของตัวเอง
            </li>
            <li>
              <Kbd>/rank user:@ชื่อ</Kbd> — ดูของคนอื่น
            </li>
            <li>
              <Kbd>/leaderboard</Kbd> — อันดับ top 10 ในเซิร์ฟ
            </li>
            <li>
              <Kbd>/leaderboard page:2</Kbd> — หน้าถัดไป
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <div className="font-medium text-amber-heading">🛠️ จัดการผู้ใช้ (ด้านล่างสุด)</div>
          <ul className="list-disc pl-5 space-y-1 text-amber-sub text-xs">
            <li>
              <b>Edit</b> — ตั้ง Total XP ของ user เอง (Level จะคำนวณให้ใหม่)
            </li>
            <li>
              <b>Reset</b> — ลบ XP ของ user 1 คน
            </li>
            <li>
              <b>Reset All XP</b> — ลบทั้งเซิร์ฟ (ต้องพิมพ์ <Kbd>RESET</Kbd> ยืนยัน)
            </li>
          </ul>
        </div>

        <div className="rounded bg-amber-primary/10 border border-amber-primary/40 p-3 text-xs text-amber-heading">
          <b>ต้องเปิด feature ก่อน:</b> ไปที่หน้า <Kbd>ภาพรวม</Kbd> → toggle <b>Leveling ON</b> ก่อน
          ไม่งั้นบอทจะไม่นับ XP
        </div>
      </HowToUse>

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

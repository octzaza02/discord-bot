import { ensureDb } from '../../../../lib/db';
import { Poll, tallyVotes } from '@discord-bot/shared';
import { PollsList } from './PollsList';
import { HowToUse, Step, Kbd } from '../../../../components/HowToUse';

export const dynamic = 'force-dynamic';

export default async function PollsPage({ params }: { params: { guildId: string } }) {
  await ensureDb();
  const polls = await Poll.find({ guildId: params.guildId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const initial = polls.map((p) => ({
    _id: String(p._id),
    question: p.question,
    options: p.options,
    counts: tallyVotes(p),
    totalVotes: p.votes.length,
    allowMulti: p.allowMulti,
    closed: p.closed,
    endsAt: p.endsAt ? new Date(p.endsAt).toISOString() : null,
    channelId: p.channelId,
    messageId: p.messageId,
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6 text-amber-heading">📊 Polls</h1>

      <HowToUse>
        <p>
          สร้างโพลจาก Discord → สมาชิกกดปุ่มโหวต → ผลอัปเดตสด
        </p>
        <div className="space-y-2">
          <Step n={1}>
            ใน Discord: <Kbd>/poll create question:"คำถาม" options:"ก|ข|ค" duration_minutes:60</Kbd>
          </Step>
          <Step n={2}>
            ใส่ตัวเลือกคั่นด้วย <Kbd>|</Kbd> — สูงสุด 10 ข้อ
          </Step>
          <Step n={3}>
            <b>allow_multi:true</b> = เลือกได้หลายข้อ; <b>false</b> = 1 คน 1 เสียง (default)
          </Step>
          <Step n={4}>
            <b>duration_minutes</b> — เว้นว่าง = ไม่มีเวลาสิ้นสุด (ต้องปิดเอง)
          </Step>
        </div>
        <div className="space-y-2">
          <div className="font-medium text-amber-heading">🎮 คำสั่ง Discord</div>
          <ul className="list-disc pl-5 space-y-1 text-amber-sub text-xs">
            <li>
              <Kbd>/poll create</Kbd> — สร้างโพล
            </li>
            <li>
              <Kbd>/poll list</Kbd> — ดูโพลที่เปิดอยู่
            </li>
            <li>
              <Kbd>/poll close poll_id:xxx</Kbd> — ปิดโพล (ผู้สร้างหรือ admin)
            </li>
          </ul>
        </div>
        <p className="text-amber-sub text-xs pt-2 border-t border-amber-border">
          หน้านี้ใช้ดูสถานะโพลทั้งหมด + ปิด/ลบจาก dashboard ได้
        </p>
      </HowToUse>

      <PollsList guildId={params.guildId} initial={initial} />
    </div>
  );
}

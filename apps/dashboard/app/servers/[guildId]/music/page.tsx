import { HowToUse, Step, Kbd } from '../../../../components/HowToUse';

export const dynamic = 'force-dynamic';

const COMMANDS: Array<{ cmd: string; desc: string }> = [
  { cmd: '/play <query>', desc: 'ใส่เพลง (URL หรือชื่อเพลง) เข้าคิว — เล่นเลยถ้าคิวว่าง' },
  { cmd: '/queue', desc: 'ดูคิวปัจจุบัน + เพลงที่เล่นอยู่' },
  { cmd: '/skip', desc: 'ข้ามเพลงปัจจุบัน' },
  { cmd: '/pause', desc: 'หยุดชั่วคราว' },
  { cmd: '/resume', desc: 'เล่นต่อ' },
  { cmd: '/stop', desc: 'หยุด + ล้างคิว + ออกจาก voice channel' },
  { cmd: '/nowplaying', desc: 'เพลงที่เล่นอยู่ตอนนี้' },
  { cmd: '/loop', desc: 'สลับโหมด: off → single (เพลงเดียว) → queue (ทั้งคิว)' },
];

export default function MusicPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2 text-amber-heading">🎵 Music bot</h1>
      <p className="text-sm text-amber-sub mb-6">
        เล่นเพลงจาก YouTube/SoundCloud ในช่อง voice รองรับคิวและ loop
      </p>

      <div className="rounded-lg border border-amber-primary/40 bg-amber-primary/10 p-4 mb-6 text-sm text-amber-heading">
        <b>หมายเหตุ:</b> Music bot เป็นบอทแยกต่างหาก (Python + discord.py) รันเอง (self-hosted)
        ไม่ได้รวมกับบอทหลักตัวนี้ — จึงไม่มีปุ่มเปิด/ปิดที่ dashboard หน้านี้เป็นคู่มือคำสั่งเท่านั้น
      </div>

      <HowToUse title="วิธีใช้" defaultOpen>
        <p>
          เข้า voice channel ก่อน แล้วพิมพ์ <Kbd>/play</Kbd> ตามด้วยชื่อเพลงหรือ URL —
          บอทจะเข้ามาในช่องแล้วเริ่มเล่น ถ้ามีเพลงเล่นอยู่แล้วจะต่อคิวให้
        </p>
        <div className="space-y-2">
          <Step n={1}>เข้า voice channel ที่ต้องการฟัง</Step>
          <Step n={2}>
            <Kbd>/play channel:ชื่อเพลง หรือ URL</Kbd> — เช่น{' '}
            <Kbd>/play never gonna give you up</Kbd>
          </Step>
          <Step n={3}>
            ใช้ <Kbd>/queue</Kbd> ดูคิว, <Kbd>/skip</Kbd> ข้าม, <Kbd>/loop</Kbd> วนเพลง
          </Step>
        </div>

        <div className="space-y-2 pt-2 border-t border-amber-border">
          <div className="font-medium text-amber-heading">🎮 Loop modes</div>
          <ul className="list-disc pl-5 space-y-1 text-amber-sub text-xs">
            <li>
              <Kbd>off</Kbd> — เล่นตามคิวปกติ
            </li>
            <li>
              <Kbd>single</Kbd> — วนเพลงปัจจุบันซ้ำ
            </li>
            <li>
              <Kbd>queue</Kbd> — เพลงจบแล้วต่อท้ายคิว (วนทั้งคิว)
            </li>
          </ul>
        </div>
      </HowToUse>

      <section>
        <h2 className="text-sm uppercase tracking-wide text-amber-sub mb-2">
          🎮 คำสั่งทั้งหมด ({COMMANDS.length})
        </h2>
        <div className="rounded-lg border border-amber-border bg-amber-surface overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-amber-bg text-amber-sub">
              <tr>
                <th className="text-left px-3 py-2">คำสั่ง</th>
                <th className="text-left px-3 py-2">คำอธิบาย</th>
              </tr>
            </thead>
            <tbody>
              {COMMANDS.map((c) => (
                <tr key={c.cmd} className="border-t border-amber-border text-amber-heading">
                  <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{c.cmd}</td>
                  <td className="px-3 py-2 text-amber-sub">{c.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

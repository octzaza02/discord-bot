'use client';
import { useState } from 'react';

type Poll = {
  _id: string;
  question: string;
  options: string[];
  counts: number[];
  totalVotes: number;
  allowMulti: boolean;
  closed: boolean;
  endsAt: string | null;
  channelId: string;
  messageId: string | null;
};

export function PollsList({ guildId, initial }: { guildId: string; initial: Poll[] }) {
  const [polls, setPolls] = useState<Poll[]>(initial);

  async function close(id: string) {
    if (!confirm('ปิดโพลนี้?')) return;
    const res = await fetch(`/api/guilds/${guildId}/polls/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ closed: true }),
    });
    if (!res.ok) return alert('ปิดไม่สำเร็จ');
    setPolls(polls.map((p) => (p._id === id ? { ...p, closed: true } : p)));
  }

  async function del(id: string) {
    if (!confirm('ลบโพลนี้ถาวร?')) return;
    const res = await fetch(`/api/guilds/${guildId}/polls/${id}`, { method: 'DELETE' });
    if (!res.ok) return alert('ลบไม่สำเร็จ');
    setPolls(polls.filter((p) => p._id !== id));
  }

  if (polls.length === 0) {
    return (
      <p className="text-amber-sub text-sm">
        ยังไม่มีโพล — สร้างจาก Discord ด้วย <code>/poll create</code>
      </p>
    );
  }

  const active = polls.filter((p) => !p.closed);
  const closed = polls.filter((p) => p.closed);

  return (
    <div className="space-y-8">
      <Section title="เปิดอยู่" polls={active} onClose={close} onDelete={del} />
      <Section title="ปิดแล้ว" polls={closed} onClose={close} onDelete={del} />
    </div>
  );
}

function Section({
  title,
  polls,
  onClose,
  onDelete,
}: {
  title: string;
  polls: Poll[];
  onClose: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (polls.length === 0) return null;
  return (
    <section>
      <h2 className="text-sm uppercase tracking-wide text-amber-sub mb-3">{title}</h2>
      <div className="space-y-3">
        {polls.map((p) => (
          <PollCard key={p._id} poll={p} onClose={onClose} onDelete={onDelete} />
        ))}
      </div>
    </section>
  );
}

function PollCard({
  poll,
  onClose,
  onDelete,
}: {
  poll: Poll;
  onClose: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const max = Math.max(1, poll.totalVotes);
  return (
    <div className="p-4 rounded-lg border border-amber-border bg-amber-surface shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="font-medium text-amber-heading">{poll.question}</div>
          <div className="text-xs text-amber-sub mt-1">
            {poll.totalVotes} เสียง • {poll.allowMulti ? 'หลายข้อ' : '1 ข้อ'}
            {poll.endsAt && !poll.closed && (
              <> • ปิด {new Date(poll.endsAt).toLocaleString('th-TH')}</>
            )}
            {poll.closed && <> • 🔒 ปิดแล้ว</>}
          </div>
          <div className="text-xs text-amber-sub mt-0.5 font-mono">
            id: <code>{poll._id}</code>
          </div>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          {!poll.closed && (
            <button
              onClick={() => onClose(poll._id)}
              className="text-xs px-2 py-1 rounded bg-amber-gold text-white hover:bg-amber-primary"
            >
              ปิด
            </button>
          )}
          <button
            onClick={() => onDelete(poll._id)}
            className="text-xs px-2 py-1 rounded text-red-600 hover:bg-red-50 border border-red-200"
          >
            ลบ
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {poll.options.map((opt, i) => {
          const c = poll.counts[i] ?? 0;
          const pct = poll.totalVotes === 0 ? 0 : (c / max) * 100;
          return (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-amber-heading">{opt}</span>
                <span className="text-amber-sub">
                  {c} • {poll.totalVotes === 0 ? 0 : ((c / poll.totalVotes) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-amber-bg overflow-hidden">
                <div
                  className="h-full bg-amber-primary rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

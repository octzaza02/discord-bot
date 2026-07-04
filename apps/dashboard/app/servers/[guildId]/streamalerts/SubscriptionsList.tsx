'use client';
import { useState } from 'react';

type Sub = {
  _id: string;
  creatorId: string;
  creatorName: string;
  discordChannelId: string;
};

export function SubscriptionsList({
  guildId,
  initial,
}: {
  guildId: string;
  initial: Sub[];
}) {
  const [subs, setSubs] = useState<Sub[]>(initial);
  const [msg, setMsg] = useState<string | null>(null);

  async function del(id: string) {
    if (!confirm('ลบการติดตามนี้?')) return;
    const res = await fetch(`/api/guilds/${guildId}/streamalerts/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      setMsg('❌ ลบไม่สำเร็จ');
      return;
    }
    setSubs(subs.filter((s) => s._id !== id));
    setMsg('ลบแล้ว ✅');
  }

  if (subs.length === 0) {
    return (
      <p className="text-amber-sub text-sm">
        ยังไม่มีการติดตาม — ใช้ <code>/subscribe</code> ใน Discord เพื่อเริ่ม
      </p>
    );
  }

  return (
    <div>
      {msg && <div className="text-sm text-amber-heading mb-3">{msg}</div>}
      <section>
        <h2 className="text-sm uppercase tracking-wide text-amber-sub mb-2">
          📺 YouTube ({subs.length})
        </h2>
        <div className="rounded-lg border border-amber-border bg-amber-surface overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-amber-bg text-amber-sub">
              <tr>
                <th className="text-left px-3 py-2">Channel</th>
                <th className="text-left px-3 py-2">Channel ID</th>
                <th className="text-left px-3 py-2">Discord Channel</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s._id} className="border-t border-amber-border text-amber-heading">
                  <td className="px-3 py-2 font-medium">{s.creatorName || '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    <a
                      href={`https://youtube.com/channel/${s.creatorId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-link hover:text-amber-primary"
                    >
                      {s.creatorId}
                    </a>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{s.discordChannelId}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => del(s._id)}
                      className="text-red-600 hover:text-red-700 text-xs font-medium"
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

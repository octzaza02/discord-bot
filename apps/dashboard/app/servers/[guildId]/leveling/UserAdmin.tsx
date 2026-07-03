'use client';
import { useEffect, useState } from 'react';

type User = { userId: string; totalXp: number };

function levelFromXp(xp: number): number {
  if (xp <= 0) return 0;
  let level = 0;
  let cumulative = 0;
  while (true) {
    const next = 5 * (level + 1) * (level + 1) + 50 * (level + 1) + 100;
    if (cumulative + next > xp) return level;
    cumulative += next;
    level++;
    if (level > 1000) return level;
  }
}

export function UserAdmin({ guildId }: { guildId: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/leveling/users`);
      const j = await res.json();
      setUsers(j.users ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId]);

  async function editXp(userId: string, current: number) {
    const val = prompt(`ตั้งค่า Total XP ใหม่ของ user ${userId}:`, String(current));
    if (val == null) return;
    const n = Number(val);
    if (!Number.isFinite(n) || n < 0) {
      alert('ตัวเลขไม่ถูกต้อง');
      return;
    }
    const res = await fetch(`/api/guilds/${guildId}/leveling/users/${userId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ totalXp: n }),
    });
    if (!res.ok) return alert('บันทึกไม่สำเร็จ');
    setMsg('อัปเดตแล้ว ✅');
    load();
  }

  async function resetUser(userId: string) {
    if (!confirm(`Reset XP ของ user ${userId}?`)) return;
    const res = await fetch(`/api/guilds/${guildId}/leveling/users/${userId}`, {
      method: 'DELETE',
    });
    if (!res.ok) return alert('ลบไม่สำเร็จ');
    setMsg('รีเซ็ตแล้ว ✅');
    load();
  }

  async function resetAll() {
    const confirmText = prompt(
      `⚠️ จะรีเซ็ต XP ของทุกคนในเซิร์ฟนี้ พิมพ์ "RESET" เพื่อยืนยัน:`,
    );
    if (confirmText !== 'RESET') return;
    const res = await fetch(`/api/guilds/${guildId}/leveling/users`, { method: 'DELETE' });
    if (!res.ok) return alert('ลบไม่สำเร็จ');
    setMsg('รีเซ็ตทั้งหมดแล้ว ✅');
    load();
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-lg text-amber-heading">จัดการผู้ใช้ (Top 20)</h2>
        <div className="flex items-center gap-3">
          {msg && <span className="text-xs text-amber-sub">{msg}</span>}
          <button
            onClick={resetAll}
            className="text-sm px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white shadow-sm"
          >
            Reset All XP
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-amber-sub">โหลด...</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-amber-sub">ยังไม่มีใครมี XP</p>
      ) : (
        <div className="rounded-lg border border-amber-border bg-amber-surface overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-amber-bg text-amber-sub">
              <tr>
                <th className="text-left px-3 py-2">#</th>
                <th className="text-left px-3 py-2">User ID</th>
                <th className="text-right px-3 py-2">Level</th>
                <th className="text-right px-3 py-2">XP</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.userId} className="border-t border-amber-border text-amber-heading">
                  <td className="px-3 py-2 text-amber-sub">{i + 1}</td>
                  <td className="px-3 py-2 font-mono text-xs">{u.userId}</td>
                  <td className="px-3 py-2 text-right">{levelFromXp(u.totalXp)}</td>
                  <td className="px-3 py-2 text-right">{u.totalXp.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => editXp(u.userId, u.totalXp)}
                      className="text-amber-link hover:text-amber-primary text-xs mr-3 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => resetUser(u.userId)}
                      className="text-red-600 hover:text-red-700 text-xs font-medium"
                    >
                      Reset
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

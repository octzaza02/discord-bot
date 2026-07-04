'use client';
import { useState } from 'react';

type PingType = 'none' | 'role' | 'everyone' | 'here';

type Sub = {
  _id: string;
  creatorId: string;
  creatorName: string;
  discordChannelId: string;
  pingType: PingType;
  pingRoleId: string | null;
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
  const [editing, setEditing] = useState<string | null>(null);
  const [draftType, setDraftType] = useState<PingType>('none');
  const [draftRoleId, setDraftRoleId] = useState('');
  const [saving, setSaving] = useState(false);

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

  function startEdit(s: Sub) {
    setEditing(s._id);
    setDraftType(s.pingType);
    setDraftRoleId(s.pingRoleId ?? '');
    setMsg(null);
  }

  function cancelEdit() {
    setEditing(null);
    setDraftRoleId('');
  }

  async function saveEdit(id: string) {
    if (draftType === 'role' && !/^\d{15,25}$/.test(draftRoleId)) {
      setMsg('❌ Role ID ต้องเป็นตัวเลข 15-25 หลัก');
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/guilds/${guildId}/streamalerts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pingType: draftType,
        pingRoleId: draftType === 'role' ? draftRoleId : null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setMsg('❌ บันทึกไม่สำเร็จ');
      return;
    }
    const data = await res.json();
    setSubs(
      subs.map((s) =>
        s._id === id
          ? { ...s, pingType: data.pingType, pingRoleId: data.pingRoleId }
          : s,
      ),
    );
    setEditing(null);
    setMsg('บันทึกแล้ว ✅');
  }

  function renderPing(s: Sub) {
    if (s.pingType === 'role' && s.pingRoleId)
      return <span className="font-mono text-xs">&lt;@&amp;{s.pingRoleId}&gt;</span>;
    if (s.pingType === 'everyone')
      return <span className="text-xs">@everyone</span>;
    if (s.pingType === 'here') return <span className="text-xs">@here</span>;
    return <span className="text-amber-sub text-xs">—</span>;
  }

  if (subs.length === 0) {
    return (
      <p className="text-amber-sub text-sm">
        ยังไม่มีการติดตาม — ใช้ <code>/subscribe</code> ใน Discord เพื่อเริ่ม
      </p>
    );
  }

  const inputCls =
    'bg-amber-bg border border-amber-border rounded px-2 py-1 text-xs text-amber-heading';

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
                <th className="text-left px-3 py-2">Ping</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s._id} className="border-t border-amber-border text-amber-heading align-top">
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
                  <td className="px-3 py-2">
                    {editing === s._id ? (
                      <div className="flex flex-col gap-1">
                        <select
                          value={draftType}
                          onChange={(e) => setDraftType(e.target.value as PingType)}
                          className={inputCls}
                        >
                          <option value="none">ไม่แท็ก</option>
                          <option value="role">@role</option>
                          <option value="everyone">@everyone</option>
                          <option value="here">@here</option>
                        </select>
                        {draftType === 'role' && (
                          <input
                            value={draftRoleId}
                            onChange={(e) => setDraftRoleId(e.target.value)}
                            placeholder="Role ID"
                            className={`${inputCls} font-mono`}
                          />
                        )}
                      </div>
                    ) : (
                      renderPing(s)
                    )}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {editing === s._id ? (
                      <>
                        <button
                          onClick={() => saveEdit(s._id)}
                          disabled={saving}
                          className="text-amber-primary hover:text-amber-heading text-xs font-medium mr-2 disabled:opacity-50"
                        >
                          บันทึก
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-amber-sub hover:text-amber-heading text-xs font-medium mr-2"
                        >
                          ยกเลิก
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEdit(s)}
                        className="text-amber-link hover:text-amber-primary text-xs font-medium mr-2"
                      >
                        แก้ ping
                      </button>
                    )}
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

'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const STYLES = ['Primary', 'Secondary', 'Success', 'Danger'] as const;
type Style = (typeof STYLES)[number];

type RoleRow = { roleId: string; label: string; emoji: string; style: Style };
type Initial = {
  title: string;
  description: string;
  channelId: string;
  messageId: string;
  roles: RoleRow[];
};

export function PanelEditor({
  guildId,
  panelId,
  initial,
}: {
  guildId: string;
  panelId: string;
  initial: Initial;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [channelId, setChannelId] = useState(initial.channelId);
  const [roles, setRoles] = useState<RoleRow[]>(initial.roles);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function addRow() {
    if (roles.length >= 25) return;
    setRoles([...roles, { roleId: '', label: '', emoji: '', style: 'Secondary' }]);
  }
  function updateRow(i: number, patch: Partial<RoleRow>) {
    setRoles(roles.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function removeRow(i: number) {
    setRoles(roles.filter((_, idx) => idx !== i));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/guilds/${guildId}/rolepanels/${panelId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, description, channelId, roles }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'save failed');
      setMsg('บันทึกแล้ว ✅');
      router.refresh();
    } catch (e: any) {
      setMsg('❌ ' + (e?.message ?? 'error'));
    } finally {
      setBusy(false);
    }
  }

  async function post() {
    if (!channelId) {
      alert('ตั้ง Channel ID ก่อน');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/guilds/${guildId}/rolepanels/${panelId}/post`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ channelId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMsg(json.edited ? 'อัปเดตข้อความในห้องแล้ว ✅' : 'โพสต์ลงห้องแล้ว ✅');
      router.refresh();
    } catch (e: any) {
      setMsg('❌ ' + (e?.message ?? 'error'));
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!confirm('ลบ panel นี้?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/rolepanels/${panelId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error ?? 'delete failed');
      router.push(`/servers/${guildId}/rolepanels`);
    } catch (e: any) {
      setMsg('❌ ' + (e?.message ?? 'error'));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">แก้ไข Role panel</h1>
        <button onClick={del} disabled={busy} className="text-sm text-red-400 hover:text-red-300">
          ลบ panel
        </button>
      </div>

      <div>
        <label className="block text-sm mb-1 text-neutral-400">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-700"
        />
      </div>

      <div>
        <label className="block text-sm mb-1 text-neutral-400">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-700"
        />
      </div>

      <div>
        <label className="block text-sm mb-1 text-neutral-400">Channel ID (สำหรับโพสต์)</label>
        <input
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          placeholder="123456789012345678"
          className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-700 font-mono text-sm"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium">ปุ่มยศ ({roles.length}/25)</h2>
          <button
            onClick={addRow}
            disabled={roles.length >= 25}
            className="text-sm px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50"
          >
            + เพิ่มปุ่ม
          </button>
        </div>

        <div className="space-y-2">
          {roles.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_1fr_80px_120px_auto] gap-2 items-center p-2 rounded bg-neutral-900 border border-neutral-800"
            >
              <input
                value={r.roleId}
                onChange={(e) => updateRow(i, { roleId: e.target.value })}
                placeholder="Role ID"
                className="px-2 py-1 rounded bg-neutral-950 border border-neutral-700 font-mono text-xs"
              />
              <input
                value={r.label}
                onChange={(e) => updateRow(i, { label: e.target.value })}
                placeholder="Label"
                className="px-2 py-1 rounded bg-neutral-950 border border-neutral-700 text-sm"
              />
              <input
                value={r.emoji}
                onChange={(e) => updateRow(i, { emoji: e.target.value })}
                placeholder="🎯"
                className="px-2 py-1 rounded bg-neutral-950 border border-neutral-700 text-sm text-center"
              />
              <select
                value={r.style}
                onChange={(e) => updateRow(i, { style: e.target.value as Style })}
                className="px-2 py-1 rounded bg-neutral-950 border border-neutral-700 text-sm"
              >
                {STYLES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                onClick={() => removeRow(i)}
                className="text-red-400 hover:text-red-300 text-sm px-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-neutral-500 mt-2">
          หา Role ID: เปิด Developer Mode ใน Discord แล้วคลิกขวาที่ยศ → Copy Role ID
        </p>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-neutral-800">
        <button
          onClick={save}
          disabled={busy}
          className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
        >
          บันทึก
        </button>
        <button
          onClick={post}
          disabled={busy}
          className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
        >
          โพสต์ลง Discord
        </button>
        {msg && <span className="text-sm">{msg}</span>}
      </div>
    </div>
  );
}

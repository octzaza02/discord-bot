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

  const inputCls =
    'w-full px-3 py-2 rounded bg-amber-surface border border-amber-border text-amber-heading focus:outline-none focus:border-amber-primary';
  const smallInputCls =
    'px-2 py-1 rounded bg-amber-surface border border-amber-border text-amber-heading text-sm focus:outline-none focus:border-amber-primary';

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-amber-heading">แก้ไข Role panel</h1>
        <button onClick={del} disabled={busy} className="text-sm text-red-600 hover:text-red-700">
          ลบ panel
        </button>
      </div>

      <div>
        <label className="block text-sm mb-1 text-amber-sub">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-sm mb-1 text-amber-sub">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-sm mb-1 text-amber-sub">Channel ID (สำหรับโพสต์)</label>
        <input
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          placeholder="123456789012345678"
          className={`${inputCls} font-mono text-sm`}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium text-amber-heading">ปุ่มยศ ({roles.length}/25)</h2>
          <button
            onClick={addRow}
            disabled={roles.length >= 25}
            className="text-sm px-3 py-1 rounded bg-amber-surface hover:bg-amber-bg text-amber-heading border border-amber-border disabled:opacity-50"
          >
            + เพิ่มปุ่ม
          </button>
        </div>

        <div className="space-y-2">
          {roles.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_1fr_80px_120px_auto] gap-2 items-center p-2 rounded bg-amber-surface border border-amber-border"
            >
              <input
                value={r.roleId}
                onChange={(e) => updateRow(i, { roleId: e.target.value })}
                placeholder="Role ID"
                className={`${smallInputCls} font-mono text-xs`}
              />
              <input
                value={r.label}
                onChange={(e) => updateRow(i, { label: e.target.value })}
                placeholder="Label"
                className={smallInputCls}
              />
              <input
                value={r.emoji}
                onChange={(e) => updateRow(i, { emoji: e.target.value })}
                placeholder="🎯"
                className={`${smallInputCls} text-center`}
              />
              <select
                value={r.style}
                onChange={(e) => updateRow(i, { style: e.target.value as Style })}
                className={smallInputCls}
              >
                {STYLES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                onClick={() => removeRow(i)}
                className="text-red-600 hover:text-red-700 text-sm px-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-amber-sub mt-2">
          หา Role ID: เปิด Developer Mode ใน Discord แล้วคลิกขวาที่ยศ → Copy Role ID
        </p>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-amber-border">
        <button
          onClick={save}
          disabled={busy}
          className="px-4 py-2 rounded bg-amber-primary text-white hover:bg-amber-link disabled:opacity-50 font-medium shadow-sm"
        >
          บันทึก
        </button>
        <button
          onClick={post}
          disabled={busy}
          className="px-4 py-2 rounded bg-amber-gold text-white hover:bg-amber-primary disabled:opacity-50 font-medium shadow-sm"
        >
          โพสต์ลง Discord
        </button>
        {msg && <span className="text-sm text-amber-heading">{msg}</span>}
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';

type Initial = { enabled: boolean; channelId: string; template: string };

export function WelcomeForm({ guildId, initial }: { guildId: string; initial: Initial }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [channelId, setChannelId] = useState(initial.channelId);
  const [template, setTemplate] = useState(initial.template);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/guilds/${guildId}/welcome`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enabled, channelId, template }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'save failed');
      setMsg('บันทึกแล้ว ✅');
    } catch (e: any) {
      setMsg('❌ ' + (e?.message ?? 'error'));
    } finally {
      setSaving(false);
    }
  }

  const preview = template
    .replaceAll('{user}', '@คุณ')
    .replaceAll('{username}', 'คุณ')
    .replaceAll('{server}', 'เซิร์ฟเวอร์ของคุณ')
    .replaceAll('{memberCount}', '123');

  return (
    <div className="space-y-6 max-w-2xl">
      <label className="flex items-center gap-3 text-amber-heading">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-amber-primary" />
        <span>เปิดใช้งานข้อความต้อนรับ</span>
      </label>

      <div>
        <label className="block text-sm mb-1 text-amber-sub">Channel ID</label>
        <input
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          placeholder="123456789012345678"
          className="w-full px-3 py-2 rounded bg-amber-surface border border-amber-border text-amber-heading font-mono text-sm focus:outline-none focus:border-amber-primary"
        />
        <p className="text-xs text-amber-sub mt-1">
          เปิด Developer Mode ใน Discord แล้วคลิกขวาที่ห้อง → Copy Channel ID
        </p>
      </div>

      <div>
        <label className="block text-sm mb-1 text-amber-sub">Template</label>
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded bg-amber-surface border border-amber-border text-amber-heading focus:outline-none focus:border-amber-primary"
        />
        <p className="text-xs text-amber-sub mt-1">
          ตัวแปร: <code>{'{user}'}</code> <code>{'{username}'}</code> <code>{'{server}'}</code>{' '}
          <code>{'{memberCount}'}</code>
        </p>
      </div>

      <div className="p-4 rounded bg-amber-surface border border-amber-border shadow-sm">
        <div className="text-xs text-amber-sub mb-2">Preview</div>
        <div className="whitespace-pre-wrap text-amber-heading">
          {preview || <em className="text-amber-sub">(ว่าง)</em>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded bg-amber-primary text-white hover:bg-amber-link disabled:opacity-50 font-medium shadow-sm"
        >
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
        {msg && <span className="text-sm text-amber-heading">{msg}</span>}
      </div>
    </div>
  );
}

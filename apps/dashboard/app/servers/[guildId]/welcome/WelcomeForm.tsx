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
      <label className="flex items-center gap-3">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        <span>เปิดใช้งานข้อความต้อนรับ</span>
      </label>

      <div>
        <label className="block text-sm mb-1 text-neutral-400">Channel ID</label>
        <input
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          placeholder="123456789012345678"
          className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-700 font-mono text-sm"
        />
        <p className="text-xs text-neutral-500 mt-1">
          เปิด Developer Mode ใน Discord แล้วคลิกขวาที่ห้อง → Copy Channel ID
        </p>
      </div>

      <div>
        <label className="block text-sm mb-1 text-neutral-400">Template</label>
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-700"
        />
        <p className="text-xs text-neutral-500 mt-1">
          ตัวแปร: <code>{'{user}'}</code> <code>{'{username}'}</code> <code>{'{server}'}</code>{' '}
          <code>{'{memberCount}'}</code>
        </p>
      </div>

      <div className="p-4 rounded bg-neutral-900 border border-neutral-800">
        <div className="text-xs text-neutral-500 mb-2">Preview</div>
        <div className="whitespace-pre-wrap">{preview || <em className="text-neutral-600">(ว่าง)</em>}</div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
        {msg && <span className="text-sm">{msg}</span>}
      </div>
    </div>
  );
}

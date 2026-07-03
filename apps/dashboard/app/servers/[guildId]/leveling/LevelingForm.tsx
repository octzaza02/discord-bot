'use client';
import { useState } from 'react';

type Announce = { mode: 'same' | 'channel' | 'dm' | 'off'; channelId: string; template: string };
type Reward = { level: number; roleId: string };
type Initial = {
  xpPerMessage: number;
  cooldownSeconds: number;
  minMessageLength: number;
  ignoredChannels: string;
  ignoredRoles: string;
  stackRewards: boolean;
  announce: Announce;
  rewards: Reward[];
};

export function LevelingForm({ guildId, initial }: { guildId: string; initial: Initial }) {
  const [xp, setXp] = useState(initial.xpPerMessage);
  const [cd, setCd] = useState(initial.cooldownSeconds);
  const [minLen, setMinLen] = useState(initial.minMessageLength);
  const [ignoredChannels, setIgnoredChannels] = useState(initial.ignoredChannels);
  const [ignoredRoles, setIgnoredRoles] = useState(initial.ignoredRoles);
  const [stack, setStack] = useState(initial.stackRewards);
  const [announce, setAnnounce] = useState<Announce>(initial.announce);
  const [rewards, setRewards] = useState<Reward[]>(initial.rewards);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function addReward() {
    setRewards([...rewards, { level: 1, roleId: '' }]);
  }
  function updateReward(i: number, patch: Partial<Reward>) {
    setRewards(rewards.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function removeReward(i: number) {
    setRewards(rewards.filter((_, idx) => idx !== i));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const parseIds = (s: string) =>
        s.split(/[,\s]+/).map((x) => x.trim()).filter(Boolean);
      const res = await fetch(`/api/guilds/${guildId}/leveling`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          xpPerMessage: xp,
          cooldownSeconds: cd,
          minMessageLength: minLen,
          ignoredChannels: parseIds(ignoredChannels),
          ignoredRoles: parseIds(ignoredRoles),
          stackRewards: stack,
          announce,
          rewards: rewards.filter((r) => r.roleId && r.level >= 1),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'save failed');
      setMsg('บันทึกแล้ว ✅');
    } catch (e: any) {
      setMsg('❌ ' + (e?.message ?? 'error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="font-medium text-lg text-amber-heading">การตั้งค่า XP</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <NumField label="XP ต่อข้อความ" value={xp} setValue={setXp} min={1} max={1000} />
          <NumField label="Cooldown (วินาที)" value={cd} setValue={setCd} min={0} max={3600} />
          <NumField
            label="ความยาวข้อความขั้นต่ำ"
            value={minLen}
            setValue={setMinLen}
            min={0}
            max={500}
          />
        </div>
        <TextField
          label="Channel ID ที่ไม่นับ XP (คั่นด้วย comma)"
          value={ignoredChannels}
          setValue={setIgnoredChannels}
          placeholder="123..., 456..."
        />
        <TextField
          label="Role ID ที่ไม่ให้ XP (คั่นด้วย comma)"
          value={ignoredRoles}
          setValue={setIgnoredRoles}
          placeholder="789..., 012..."
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-lg text-amber-heading">ประกาศตอน Level up</h2>
        <div>
          <label className="block text-sm mb-1 text-amber-sub">โหมด</label>
          <select
            value={announce.mode}
            onChange={(e) => setAnnounce({ ...announce, mode: e.target.value as any })}
            className="px-3 py-2 rounded bg-amber-surface border border-amber-border text-amber-heading focus:outline-none focus:border-amber-primary"
          >
            <option value="same">ห้องที่พิมพ์ล่าสุด</option>
            <option value="channel">ห้อง dedicated</option>
            <option value="dm">DM หาสมาชิก</option>
            <option value="off">ปิดประกาศ</option>
          </select>
        </div>
        {announce.mode === 'channel' && (
          <TextField
            label="Channel ID"
            value={announce.channelId}
            setValue={(v) => setAnnounce({ ...announce, channelId: v })}
            placeholder="123456789012345678"
          />
        )}
        {announce.mode !== 'off' && (
          <div>
            <label className="block text-sm mb-1 text-amber-sub">Template</label>
            <textarea
              value={announce.template}
              onChange={(e) => setAnnounce({ ...announce, template: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded bg-amber-surface border border-amber-border text-amber-heading focus:outline-none focus:border-amber-primary"
            />
            <p className="text-xs text-amber-sub mt-1">
              ตัวแปร: <code>{'{user}'}</code> <code>{'{username}'}</code>{' '}
              <code>{'{level}'}</code> <code>{'{xp}'}</code> <code>{'{server}'}</code>
            </p>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-lg text-amber-heading">Level Rewards ({rewards.length})</h2>
          <button
            onClick={addReward}
            className="text-sm px-3 py-1 rounded bg-amber-surface hover:bg-amber-bg text-amber-heading border border-amber-border"
          >
            + เพิ่ม
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm text-amber-heading">
          <input
            type="checkbox"
            checked={stack}
            onChange={(e) => setStack(e.target.checked)}
            className="accent-amber-primary"
          />
          <span>สะสมยศ (Stack) — ได้ยศทุกอันที่ถึงเลเวล ถ้าปิด: ได้เฉพาะ tier สูงสุด</span>
        </label>

        <div className="space-y-2">
          {rewards.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-[100px_1fr_auto] gap-2 items-center p-2 rounded bg-neutral-900 border border-neutral-800"
            >
              <input
                type="number"
                min={1}
                value={r.level}
                onChange={(e) => updateReward(i, { level: Number(e.target.value) })}
                placeholder="Level"
                className="px-2 py-1 rounded bg-amber-bg border border-amber-border text-amber-heading focus:outline-none focus:border-amber-primary text-sm"
              />
              <input
                value={r.roleId}
                onChange={(e) => updateReward(i, { roleId: e.target.value })}
                placeholder="Role ID"
                className="px-2 py-1 rounded bg-amber-bg border border-amber-border text-amber-heading focus:outline-none focus:border-amber-primary font-mono text-xs"
              />
              <button
                onClick={() => removeReward(i)}
                className="text-red-600 hover:text-red-700 text-sm px-2"
              >
                ✕
              </button>
            </div>
          ))}
          {rewards.length === 0 && (
            <p className="text-xs text-amber-sub">ยังไม่มี reward — กด "+ เพิ่ม" เพื่อเริ่ม</p>
          )}
        </div>
      </section>

      <div className="flex items-center gap-3 pt-4 border-t border-amber-border">
        <button
          onClick={save}
          disabled={busy}
          className="px-4 py-2 rounded bg-amber-primary text-white hover:bg-amber-link disabled:opacity-50 font-medium shadow-sm"
        >
          {busy ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
        {msg && <span className="text-sm text-amber-heading">{msg}</span>}
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  setValue,
  min,
  max,
}: {
  label: string;
  value: number;
  setValue: (n: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div>
      <label className="block text-sm mb-1 text-amber-sub">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full px-3 py-2 rounded bg-amber-surface border border-amber-border text-amber-heading focus:outline-none focus:border-amber-primary"
      />
    </div>
  );
}

function TextField({
  label,
  value,
  setValue,
  placeholder,
}: {
  label: string;
  value: string;
  setValue: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm mb-1 text-amber-sub">{label}</label>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded bg-amber-surface border border-amber-border text-amber-heading focus:outline-none focus:border-amber-primary font-mono text-xs"
      />
    </div>
  );
}

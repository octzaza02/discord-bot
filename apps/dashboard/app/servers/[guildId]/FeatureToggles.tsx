'use client';
import Link from 'next/link';
import { useState } from 'react';

type Features = {
  welcome: boolean;
  rolebutton: boolean;
  leveling: boolean;
  poll: boolean;
  streamalert: boolean;
  music: boolean;
  dashboardDm: boolean;
};

const CARDS: Array<{
  key: keyof Features;
  icon: string;
  title: string;
  description: string;
  href: string | null;
}> = [
  {
    key: 'welcome',
    icon: '👋',
    title: 'Welcome message',
    description: 'ส่งข้อความต้อนรับสมาชิกใหม่',
    href: 'welcome',
  },
  {
    key: 'rolebutton',
    icon: '🎯',
    title: 'Role panels',
    description: 'ปุ่มให้ผู้ใช้กดรับยศเอง',
    href: 'rolepanels',
  },
  {
    key: 'leveling',
    icon: '⭐',
    title: 'Leveling',
    description: 'XP จากการแชท + level rewards',
    href: 'leveling',
  },
  {
    key: 'poll',
    icon: '📊',
    title: 'Polls',
    description: 'สร้างโพลโหวตด้วย /poll ในชุมชน',
    href: 'polls',
  },
  {
    key: 'streamalert',
    icon: '🔔',
    title: 'YouTube Alerts',
    description: 'แจ้งเตือนคลิป/ไลฟ์ใหม่จาก YouTube channel',
    href: 'streamalerts',
  },
  {
    key: 'music',
    icon: '🎵',
    title: 'Music',
    description: 'เล่นเพลง YouTube ในช่อง voice + คิว + loop',
    href: 'music',
  },
  {
    key: 'dashboardDm',
    icon: '🔧',
    title: 'Owner DM',
    description: 'DM หา owner ตอนบอทเข้าเซิร์ฟใหม่ พร้อมลิงก์ตั้งค่า',
    href: null,
  },
];

export function FeatureToggles({
  guildId,
  initial,
}: {
  guildId: string;
  initial: Features;
}) {
  const [features, setFeatures] = useState<Features>(initial);
  const [busy, setBusy] = useState<keyof Features | null>(null);

  async function toggle(key: keyof Features) {
    const next = !features[key];
    setFeatures({ ...features, [key]: next }); // optimistic
    setBusy(key);
    try {
      const res = await fetch(`/api/guilds/${guildId}/features`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ [key]: { enabled: next } }),
      });
      if (!res.ok) throw new Error('save failed');
    } catch (e) {
      setFeatures((f) => ({ ...f, [key]: !next })); // revert
      alert('❌ บันทึกไม่สำเร็จ');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {CARDS.map((c) => {
        const on = features[c.key];
        return (
          <div
            key={c.key}
            className="p-4 rounded-lg border border-amber-border bg-amber-surface shadow-sm flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{c.icon}</span>
                  <span className="font-medium text-amber-heading">{c.title}</span>
                </div>
                <div className="text-xs text-amber-sub">{c.description}</div>
              </div>
              <button
                onClick={() => toggle(c.key)}
                disabled={busy === c.key}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  on ? 'bg-amber-primary' : 'bg-amber-border'
                } disabled:opacity-50`}
                aria-pressed={on}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    on ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>
            {c.href && (
              <Link
                href={`/servers/${guildId}/${c.href}`}
                className="text-xs text-amber-link hover:text-amber-primary self-start font-medium"
              >
                ตั้งค่า →
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

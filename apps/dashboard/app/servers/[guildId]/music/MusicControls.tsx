'use client';
import { useCallback, useEffect, useState } from 'react';

type Song = {
  title: string;
  duration: number;
  webpage_url: string;
  requester: string;
};

type MusicState = {
  connected: boolean;
  playing: boolean;
  paused: boolean;
  channel: string | null;
  loop_mode: 'off' | 'single' | 'queue';
  current: Song | null;
  queue: Song[];
};

function fmt(sec: number): string {
  if (!sec) return '??:??';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h
    ? `${h}:${String(mm).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${mm}:${String(s).padStart(2, '0')}`;
}

const LOOP_LABEL: Record<string, string> = {
  off: '🔁 ปิด',
  single: '🔂 เพลงเดียว',
  queue: '🔁 ทั้งคิว',
};

export function MusicControls({ guildId }: { guildId: string }) {
  const [state, setState] = useState<MusicState | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'offline' | 'notconfigured'>(
    'loading',
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/music`, { cache: 'no-store' });
      if (res.status === 503) {
        setStatus('notconfigured');
        return;
      }
      if (!res.ok) {
        setStatus('offline');
        return;
      }
      setState(await res.json());
      setStatus('ok');
    } catch {
      setStatus('offline');
    }
  }, [guildId]);

  useEffect(() => {
    load();
    // poll สถานะทุก 4 วิ ให้คิว/เพลงที่เล่นอัปเดตใกล้เรียลไทม์
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  async function action(name: string, extra?: Record<string, unknown>) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/guilds/${guildId}/music/${name}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: extra ? JSON.stringify(extra) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(`❌ ${data.error ?? 'ทำรายการไม่สำเร็จ'}`);
      } else if (name === 'play' && data.title) {
        setMsg(`➕ เข้าคิว: ${data.title}`);
        setQuery('');
      }
      await load();
    } catch {
      setMsg('❌ ต่อ music bot ไม่ได้');
    } finally {
      setBusy(false);
    }
  }

  if (status === 'loading') {
    return <div className="text-sm text-amber-sub mb-6">กำลังโหลดสถานะ...</div>;
  }

  if (status === 'notconfigured') {
    return (
      <div className="rounded-lg border border-amber-border bg-amber-surface p-4 mb-6 text-sm text-amber-sub">
        ยังไม่ได้ตั้งค่าการเชื่อมต่อ music bot (ตั้ง <code>MUSIC_BOT_INTERNAL_URL</code> +{' '}
        <code>MUSIC_INTERNAL_SECRET</code> ที่ dashboard) — หน้านี้แสดงเฉพาะคู่มือคำสั่ง
      </div>
    );
  }

  if (status === 'offline') {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4 mb-6 text-sm text-red-700">
        ⚠️ ต่อ music bot ไม่ได้ — บอทอาจไม่ได้รันอยู่ ลองใหม่อีกครั้ง
        <button
          onClick={load}
          className="ml-2 underline hover:text-red-800"
        >
          รีเฟรช
        </button>
      </div>
    );
  }

  const s = state!;
  const btn =
    'px-3 py-1.5 rounded border border-amber-border bg-amber-surface hover:bg-amber-bg text-amber-heading text-sm disabled:opacity-50';

  return (
    <div className="rounded-lg border border-amber-border bg-amber-surface p-4 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-amber-heading">🎛️ ควบคุมสด</span>
        <span className="text-xs text-amber-sub">
          {s.connected ? `อยู่ในห้อง: ${s.channel}` : 'ไม่ได้อยู่ใน voice'}
        </span>
      </div>

      {msg && <div className="text-sm text-amber-heading mb-3">{msg}</div>}

      {s.current ? (
        <div className="mb-3 text-sm text-amber-heading">
          🎵{' '}
          {s.current.webpage_url ? (
            <a
              href={s.current.webpage_url}
              target="_blank"
              rel="noreferrer"
              className="text-amber-link hover:text-amber-primary font-medium"
            >
              {s.current.title}
            </a>
          ) : (
            <span className="font-medium">{s.current.title}</span>
          )}{' '}
          <span className="text-amber-sub text-xs">
            ({fmt(s.current.duration)}) · ขอโดย {s.current.requester}
            {s.paused ? ' · ⏸️ หยุดชั่วคราว' : ''}
          </span>
        </div>
      ) : (
        <div className="mb-3 text-sm text-amber-sub">ไม่มีเพลงเล่นอยู่</div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <button className={btn} disabled={busy} onClick={() => action('skip')}>
          ⏭️ ข้าม
        </button>
        <button className={btn} disabled={busy} onClick={() => action('pause')}>
          ⏸️ หยุด
        </button>
        <button className={btn} disabled={busy} onClick={() => action('resume')}>
          ▶️ เล่นต่อ
        </button>
        <button className={btn} disabled={busy} onClick={() => action('loop')}>
          {LOOP_LABEL[s.loop_mode]} loop
        </button>
        <button
          className={`${btn} border-red-300 text-red-600 hover:bg-red-50`}
          disabled={busy}
          onClick={() => action('stop')}
        >
          ⏹️ หยุด+ล้างคิว
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim()) action('play', { query: query.trim() });
          }}
          placeholder="ชื่อเพลง หรือ URL (ต้องมี bot อยู่ใน voice ก่อน)"
          className="flex-1 bg-amber-bg border border-amber-border rounded px-3 py-1.5 text-sm text-amber-heading"
        />
        <button
          className={btn}
          disabled={busy || !query.trim()}
          onClick={() => action('play', { query: query.trim() })}
        >
          ➕ ใส่คิว
        </button>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-amber-sub mb-1">
          คิวถัดไป ({s.queue.length})
        </div>
        {s.queue.length === 0 ? (
          <div className="text-sm text-amber-sub">— ว่าง —</div>
        ) : (
          <ol className="text-sm text-amber-heading space-y-0.5">
            {s.queue.slice(0, 15).map((q, i) => (
              <li key={i} className="font-mono text-xs">
                {i + 1}. {q.title}{' '}
                <span className="text-amber-sub">({fmt(q.duration)})</span>
              </li>
            ))}
            {s.queue.length > 15 && (
              <li className="text-amber-sub text-xs">
                ... และอีก {s.queue.length - 15} เพลง
              </li>
            )}
          </ol>
        )}
      </div>
    </div>
  );
}

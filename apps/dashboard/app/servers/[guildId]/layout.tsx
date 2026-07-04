import Link from 'next/link';
import { authorizeGuildDetailed, type AuthReason } from '../../../lib/authorize';

export const dynamic = 'force-dynamic';

const REASONS: Record<AuthReason, { title: string; help: string; retry?: string }> = {
  ok: { title: '', help: '' },
  no_session: {
    title: 'ยังไม่ได้ล็อกอิน',
    help: 'กรุณา login ด้วย Discord ก่อนใช้งาน dashboard',
    retry: 'Login with Discord',
  },
  discord_error: {
    title: 'ต่อ Discord API ไม่สำเร็จ',
    help: 'อาจเป็นเพราะ token หมดอายุ (Discord token อยู่ได้ ~7 วัน) หรือ Discord API ล่ม — ลองออกจากระบบแล้ว login ใหม่',
    retry: 'Login ใหม่',
  },
  not_in_guild: {
    title: 'ไม่พบเซิร์ฟเวอร์นี้ในบัญชีของคุณ',
    help: 'สาเหตุที่เป็นไปได้: (1) คุณไม่ได้อยู่ในเซิร์ฟเวอร์นี้แล้ว (2) Login ผิดบัญชี Discord (3) บอทยังไม่ได้เข้าเซิร์ฟ — ลอง login บัญชีที่ถูกต้อง หรือเช็ครายการที่หน้า "เซิร์ฟเวอร์ทั้งหมด"',
  },
  no_permission: {
    title: 'คุณไม่มีสิทธิ์จัดการเซิร์ฟเวอร์นี้',
    help: 'ต้องมี permission "Manage Server" ในเซิร์ฟเวอร์นี้ (ปกติเจ้าของหรือ admin) ถ้าคุณคือเจ้าของ ลองออกจากระบบแล้ว login ใหม่',
  },
};

export default async function GuildLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { guildId: string };
}) {
  const auth = await authorizeGuildDetailed(params.guildId);
  if (!auth.ok) {
    const r = REASONS[auth.reason];
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="inline-block p-8 rounded-lg border border-amber-border bg-amber-surface shadow-sm">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-semibold text-amber-heading mb-2">{r.title}</h1>
          <p className="text-sm text-amber-sub mb-6 max-w-md mx-auto">{r.help}</p>
          <div className="flex justify-center gap-3">
            <Link
              href="/servers"
              className="px-4 py-2 rounded border border-amber-border text-amber-heading hover:bg-amber-bg text-sm"
            >
              ← เซิร์ฟเวอร์ทั้งหมด
            </Link>
            {r.retry && (
              <Link
                href="/api/auth/signin/discord"
                className="px-4 py-2 rounded bg-amber-primary text-white hover:bg-amber-link text-sm font-medium shadow-sm"
              >
                {r.retry}
              </Link>
            )}
          </div>
          <p className="text-xs text-amber-sub mt-6 font-mono">
            code: {auth.reason} · guild: {params.guildId}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8">
      <aside className="space-y-1">
        <Link href="/servers" className="block text-sm text-amber-link hover:text-amber-primary mb-4">
          ← เซิร์ฟเวอร์ทั้งหมด
        </Link>
        <NavLink href={`/servers/${params.guildId}`}>📊 ภาพรวม</NavLink>
        <NavLink href={`/servers/${params.guildId}/welcome`}>👋 Welcome message</NavLink>
        <NavLink href={`/servers/${params.guildId}/rolepanels`}>🎯 Role panels</NavLink>
        <NavLink href={`/servers/${params.guildId}/leveling`}>⭐ Leveling</NavLink>
        <NavLink href={`/servers/${params.guildId}/polls`}>📊 Polls</NavLink>
        <NavLink href={`/servers/${params.guildId}/streamalerts`}>🔔 Stream Alerts</NavLink>
      </aside>
      <section>{children}</section>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-md text-sm text-amber-heading hover:bg-amber-surface hover:text-amber-primary transition-colors"
    >
      {children}
    </Link>
  );
}

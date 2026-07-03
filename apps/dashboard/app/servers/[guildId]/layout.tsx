import Link from 'next/link';
import { notFound } from 'next/navigation';
import { authorizeGuild } from '../../../lib/authorize';

export const dynamic = 'force-dynamic';

export default async function GuildLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { guildId: string };
}) {
  const ok = await authorizeGuild(params.guildId);
  if (!ok) notFound();

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

import Link from 'next/link';
import { ensureDb, } from '../../../../lib/db';
import { RolePanel } from '@discord-bot/shared';
import { NewPanelButton } from './NewPanelButton';

export default async function RolePanelsPage({ params }: { params: { guildId: string } }) {
  await ensureDb();
  const panels = await RolePanel.find({ guildId: params.guildId }).lean();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">🎯 Role panels</h1>
        <NewPanelButton guildId={params.guildId} />
      </div>

      {panels.length === 0 ? (
        <p className="text-neutral-500 text-sm">ยังไม่มี panel — กด "สร้างใหม่" เพื่อเริ่ม</p>
      ) : (
        <ul className="space-y-2">
          {panels.map((p) => (
            <li key={String(p._id)}>
              <Link
                href={`/servers/${params.guildId}/rolepanels/${String(p._id)}`}
                className="block p-4 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800"
              >
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-neutral-500 mt-1">
                  {p.roles.length} ปุ่ม {p.messageId ? '· โพสต์แล้ว' : '· ยังไม่ได้โพสต์'}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

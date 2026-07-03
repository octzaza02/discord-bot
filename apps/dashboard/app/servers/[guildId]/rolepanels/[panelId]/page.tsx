import { notFound } from 'next/navigation';
import { ensureDb } from '../../../../../lib/db';
import { RolePanel } from '@discord-bot/shared';
import { PanelEditor } from './PanelEditor';

export default async function PanelEditorPage({
  params,
}: {
  params: { guildId: string; panelId: string };
}) {
  await ensureDb();
  const panel = await RolePanel.findOne({ _id: params.panelId, guildId: params.guildId })
    .lean()
    .catch(() => null);
  if (!panel) notFound();

  return (
    <PanelEditor
      guildId={params.guildId}
      panelId={params.panelId}
      initial={{
        title: panel.title,
        description: panel.description ?? '',
        channelId: panel.channelId ?? '',
        messageId: panel.messageId ?? '',
        roles: panel.roles.map((r) => ({
          roleId: r.roleId,
          label: r.label,
          emoji: r.emoji ?? '',
          style: r.style,
        })),
      }}
    />
  );
}

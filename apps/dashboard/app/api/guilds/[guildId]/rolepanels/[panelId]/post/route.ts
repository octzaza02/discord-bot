import { NextResponse } from 'next/server';
import { authorizeGuild } from '../../../../../../../lib/authorize';
import { ensureDb } from '../../../../../../../lib/db';
import { RolePanel } from '@discord-bot/shared';
import { callBot } from '../../../../../../../lib/botClient';

export async function POST(
  req: Request,
  { params }: { params: { guildId: string; panelId: string } },
) {
  if (!(await authorizeGuild(params.guildId)))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  const body = await req.json().catch(() => ({}));
  const channelId: string | undefined = body.channelId;

  const panel = await RolePanel.findOne({ _id: params.panelId, guildId: params.guildId });
  if (!panel) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (channelId) {
    panel.channelId = channelId;
    await panel.save();
  }

  try {
    const result = await callBot(`/panels/${params.panelId}/post`, {
      method: 'POST',
      body: JSON.stringify({ channelId: channelId ?? panel.channelId }),
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'bot call failed' }, { status: 502 });
  }
}

import { NextResponse } from 'next/server';
import { authorizeGuild } from '../../../../../../lib/authorize';
import { ensureDb } from '../../../../../../lib/db';
import { RolePanel, BUTTON_STYLES } from '@discord-bot/shared';

export async function GET(
  _req: Request,
  { params }: { params: { guildId: string; panelId: string } },
) {
  if (!(await authorizeGuild(params.guildId)))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  const panel = await RolePanel.findOne({ _id: params.panelId, guildId: params.guildId }).lean();
  if (!panel) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ panel });
}

export async function PATCH(
  req: Request,
  { params }: { params: { guildId: string; panelId: string } },
) {
  if (!(await authorizeGuild(params.guildId)))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  const body = await req.json().catch(() => ({}));
  const panel = await RolePanel.findOne({ _id: params.panelId, guildId: params.guildId });
  if (!panel) return NextResponse.json({ error: 'not found' }, { status: 404 });

  if (typeof body.title === 'string') panel.title = body.title.slice(0, 256);
  if (typeof body.description === 'string') panel.description = body.description.slice(0, 4000);
  if (typeof body.channelId === 'string') panel.channelId = body.channelId || null;

  if (Array.isArray(body.roles)) {
    const cleaned = body.roles
      .slice(0, 25)
      .map((r: any) => ({
        roleId: String(r.roleId ?? '').trim(),
        label: String(r.label ?? '').slice(0, 80),
        emoji: r.emoji ? String(r.emoji).slice(0, 64) : null,
        style: BUTTON_STYLES.includes(r.style) ? r.style : 'Secondary',
      }))
      .filter((r: any) => r.roleId && r.label);
    panel.roles = cleaned as any;
  }

  await panel.save();
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { guildId: string; panelId: string } },
) {
  if (!(await authorizeGuild(params.guildId)))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  const res = await RolePanel.deleteOne({ _id: params.panelId, guildId: params.guildId });
  if (!res.deletedCount) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

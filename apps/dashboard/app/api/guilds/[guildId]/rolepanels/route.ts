import { NextResponse } from 'next/server';
import { authorizeGuild } from '../../../../../lib/authorize';
import { ensureDb } from '../../../../../lib/db';
import { RolePanel } from '@discord-bot/shared';

export async function GET(_req: Request, { params }: { params: { guildId: string } }) {
  if (!(await authorizeGuild(params.guildId)))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  const panels = await RolePanel.find({ guildId: params.guildId }).lean();
  return NextResponse.json({ panels });
}

export async function POST(req: Request, { params }: { params: { guildId: string } }) {
  if (!(await authorizeGuild(params.guildId)))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? '').slice(0, 256);
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });
  const panel = await RolePanel.create({
    guildId: params.guildId,
    title,
    description: String(body.description ?? '').slice(0, 4000),
    roles: [],
  });
  return NextResponse.json({ _id: String(panel._id) });
}

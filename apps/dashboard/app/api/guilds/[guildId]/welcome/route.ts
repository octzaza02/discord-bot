import { NextResponse } from 'next/server';
import { authorizeGuild } from '../../../../../lib/authorize';
import { ensureDb } from '../../../../../lib/db';
import { getOrCreateGuildConfig } from '@discord-bot/shared';

export async function GET(_req: Request, { params }: { params: { guildId: string } }) {
  if (!(await authorizeGuild(params.guildId)))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  const cfg = await getOrCreateGuildConfig(params.guildId);
  return NextResponse.json({ welcome: cfg.welcome });
}

export async function PATCH(req: Request, { params }: { params: { guildId: string } }) {
  if (!(await authorizeGuild(params.guildId)))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  const body = await req.json().catch(() => ({}));
  const cfg = await getOrCreateGuildConfig(params.guildId);
  if (typeof body.enabled === 'boolean') cfg.welcome.enabled = body.enabled;
  if (typeof body.channelId === 'string') cfg.welcome.channelId = body.channelId || null;
  if (typeof body.template === 'string') cfg.welcome.template = body.template.slice(0, 1500);
  await cfg.save();
  return NextResponse.json({ welcome: cfg.welcome });
}

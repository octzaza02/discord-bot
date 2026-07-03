import { NextResponse } from 'next/server';
import { authorizeGuild } from '../../../../../../lib/authorize';
import { ensureDb } from '../../../../../../lib/db';
import { Poll } from '@discord-bot/shared';

export async function PATCH(
  req: Request,
  { params }: { params: { guildId: string; pollId: string } },
) {
  if (!(await authorizeGuild(params.guildId)))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  const body = await req.json().catch(() => ({}));
  const poll = await Poll.findOne({ _id: params.pollId, guildId: params.guildId }).catch(
    () => null,
  );
  if (!poll) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (typeof body.closed === 'boolean') poll.closed = body.closed;
  await poll.save();
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { guildId: string; pollId: string } },
) {
  if (!(await authorizeGuild(params.guildId)))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  const res = await Poll.deleteOne({ _id: params.pollId, guildId: params.guildId });
  if (!res.deletedCount) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { authorizeGuild } from '../../../../../../lib/authorize';
import { ensureDb } from '../../../../../../lib/db';
import { StreamSubscription } from '@discord-bot/shared';

export async function DELETE(
  _req: Request,
  { params }: { params: { guildId: string; subId: string } },
) {
  if (!(await authorizeGuild(params.guildId)))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  const res = await StreamSubscription.deleteOne({
    _id: params.subId,
    guildId: params.guildId,
  }).catch(() => null);
  if (!res || !res.deletedCount)
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

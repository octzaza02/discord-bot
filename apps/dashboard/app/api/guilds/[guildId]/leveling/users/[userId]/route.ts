import { NextResponse } from 'next/server';
import { authorizeGuild } from '../../../../../../../lib/authorize';
import { ensureDb } from '../../../../../../../lib/db';
import { UserXp } from '@discord-bot/shared';

export async function PATCH(
  req: Request,
  { params }: { params: { guildId: string; userId: string } },
) {
  if (!(await authorizeGuild(params.guildId)))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  const body = await req.json().catch(() => ({}));
  if (typeof body.totalXp !== 'number' || body.totalXp < 0)
    return NextResponse.json({ error: 'invalid totalXp' }, { status: 400 });
  const row = await UserXp.findOneAndUpdate(
    { guildId: params.guildId, userId: params.userId },
    {
      $set: { totalXp: Math.floor(body.totalXp) },
      $setOnInsert: {
        guildId: params.guildId,
        userId: params.userId,
        lastMessageAt: new Date(0),
      },
    },
    { upsert: true, new: true },
  );
  return NextResponse.json({ user: row });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { guildId: string; userId: string } },
) {
  if (!(await authorizeGuild(params.guildId)))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  const res = await UserXp.deleteOne({ guildId: params.guildId, userId: params.userId });
  return NextResponse.json({ deleted: res.deletedCount });
}

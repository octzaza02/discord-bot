import { NextResponse } from 'next/server';
import { authorizeGuild } from '../../../../../../lib/authorize';
import { ensureDb } from '../../../../../../lib/db';
import { StreamSubscription, STREAM_PING_TYPES, type StreamPingType } from '@discord-bot/shared';

export async function PATCH(
  req: Request,
  { params }: { params: { guildId: string; subId: string } },
) {
  if (!(await authorizeGuild(params.guildId)))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object')
    return NextResponse.json({ error: 'bad request' }, { status: 400 });

  const update: { pingType?: StreamPingType; pingRoleId?: string | null } = {};

  if (body.pingType !== undefined) {
    if (!STREAM_PING_TYPES.includes(body.pingType))
      return NextResponse.json({ error: 'invalid pingType' }, { status: 400 });
    update.pingType = body.pingType;
  }

  if (body.pingRoleId !== undefined) {
    if (body.pingRoleId === null || body.pingRoleId === '') {
      update.pingRoleId = null;
    } else if (typeof body.pingRoleId === 'string' && /^\d{15,25}$/.test(body.pingRoleId)) {
      update.pingRoleId = body.pingRoleId;
    } else {
      return NextResponse.json({ error: 'invalid pingRoleId' }, { status: 400 });
    }
  }

  if (update.pingType && update.pingType !== 'role') update.pingRoleId = null;
  if (update.pingType === 'role' && !update.pingRoleId && body.pingRoleId === undefined) {
    return NextResponse.json({ error: 'pingRoleId required for role type' }, { status: 400 });
  }

  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: 'no changes' }, { status: 400 });

  await ensureDb();
  const res = await StreamSubscription.findOneAndUpdate(
    { _id: params.subId, guildId: params.guildId },
    { $set: update },
    { new: true },
  ).catch(() => null);
  if (!res) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({
    ok: true,
    pingType: res.pingType,
    pingRoleId: res.pingRoleId,
  });
}

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

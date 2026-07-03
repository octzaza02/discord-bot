import { NextResponse } from 'next/server';
import { authorizeGuild } from '../../../../../../lib/authorize';
import { ensureDb } from '../../../../../../lib/db';
import { UserXp } from '@discord-bot/shared';

export async function GET(req: Request, { params }: { params: { guildId: string } }) {
  if (!(await authorizeGuild(params.guildId)))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
  const perPage = 20;
  const [rows, total] = await Promise.all([
    UserXp.find({ guildId: params.guildId })
      .sort({ totalXp: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean(),
    UserXp.countDocuments({ guildId: params.guildId }),
  ]);
  return NextResponse.json({ users: rows, page, perPage, total });
}

export async function DELETE(_req: Request, { params }: { params: { guildId: string } }) {
  if (!(await authorizeGuild(params.guildId)))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  const res = await UserXp.deleteMany({ guildId: params.guildId });
  return NextResponse.json({ deleted: res.deletedCount });
}

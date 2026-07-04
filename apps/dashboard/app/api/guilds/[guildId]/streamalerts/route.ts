import { NextResponse } from 'next/server';
import { authorizeGuild } from '../../../../../lib/authorize';
import { ensureDb } from '../../../../../lib/db';
import { StreamSubscription } from '@discord-bot/shared';

export async function GET(_req: Request, { params }: { params: { guildId: string } }) {
  if (!(await authorizeGuild(params.guildId)))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  const subs = await StreamSubscription.find({ guildId: params.guildId })
    .sort({ platform: 1, creatorName: 1 })
    .lean();
  return NextResponse.json({
    subs: subs.map((s) => ({
      _id: String(s._id),
      platform: s.platform,
      creatorId: s.creatorId,
      creatorName: s.creatorName,
      discordChannelId: s.discordChannelId,
    })),
  });
}

import { NextResponse } from 'next/server';
import { authorizeGuild } from '../../../../../lib/authorize';
import { ensureDb } from '../../../../../lib/db';
import { Poll, tallyVotes } from '@discord-bot/shared';

export async function GET(_req: Request, { params }: { params: { guildId: string } }) {
  if (!(await authorizeGuild(params.guildId)))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  const polls = await Poll.find({ guildId: params.guildId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return NextResponse.json({
    polls: polls.map((p) => ({
      _id: String(p._id),
      question: p.question,
      options: p.options,
      counts: tallyVotes(p),
      totalVotes: p.votes.length,
      allowMulti: p.allowMulti,
      closed: p.closed,
      endsAt: p.endsAt,
      channelId: p.channelId,
      messageId: p.messageId,
      createdBy: p.createdBy,
      createdAt: (p as any).createdAt,
    })),
  });
}

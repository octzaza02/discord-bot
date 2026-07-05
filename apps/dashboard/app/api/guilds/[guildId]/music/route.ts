import { NextResponse } from 'next/server';
import { authorizeGuild } from '../../../../../lib/authorize';
import { callMusic, MusicBotNotConfigured } from '../../../../../lib/musicClient';

export async function GET(
  _req: Request,
  { params }: { params: { guildId: string } },
) {
  if (!(await authorizeGuild(params.guildId)))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    const data = await callMusic(`/guilds/${params.guildId}/music`);
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof MusicBotNotConfigured)
      return NextResponse.json({ error: 'not_configured' }, { status: 503 });
    return NextResponse.json({ error: 'unreachable' }, { status: 502 });
  }
}

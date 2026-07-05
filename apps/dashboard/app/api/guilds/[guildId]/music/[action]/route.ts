import { NextResponse } from 'next/server';
import { authorizeGuild } from '../../../../../../lib/authorize';
import { callMusic, MusicBotNotConfigured } from '../../../../../../lib/musicClient';

const ALLOWED = new Set(['skip', 'pause', 'resume', 'stop', 'loop', 'play']);

export async function POST(
  req: Request,
  { params }: { params: { guildId: string; action: string } },
) {
  if (!(await authorizeGuild(params.guildId)))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!ALLOWED.has(params.action))
    return NextResponse.json({ error: 'unknown action' }, { status: 400 });

  let body: string | undefined;
  if (params.action === 'play') {
    const parsed = await req.json().catch(() => ({}));
    body = JSON.stringify({ query: String(parsed?.query ?? '') });
  }

  try {
    const data = await callMusic(
      `/guilds/${params.guildId}/music/${params.action}`,
      { method: 'POST', body },
    );
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof MusicBotNotConfigured)
      return NextResponse.json({ error: 'not_configured' }, { status: 503 });
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'unreachable' },
      { status: 502 },
    );
  }
}

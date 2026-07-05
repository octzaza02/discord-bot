import { NextResponse } from 'next/server';
import { authorizeGuild } from '../../../../../lib/authorize';
import { callBot } from '../../../../../lib/botClient';

export async function GET(
  _req: Request,
  { params }: { params: { guildId: string } },
) {
  if (!(await authorizeGuild(params.guildId)))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    const data = await callBot(`/guilds/${params.guildId}/music`);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'unreachable' }, { status: 502 });
  }
}

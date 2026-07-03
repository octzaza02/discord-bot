import { NextResponse } from 'next/server';
import { authorizeGuild } from '../../../../../lib/authorize';
import { ensureDb } from '../../../../../lib/db';
import { getOrCreateGuildConfig } from '@discord-bot/shared';

const ANNOUNCE_MODES = ['same', 'channel', 'dm', 'off'] as const;

export async function GET(_req: Request, { params }: { params: { guildId: string } }) {
  if (!(await authorizeGuild(params.guildId)))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  const cfg = await getOrCreateGuildConfig(params.guildId);
  return NextResponse.json({ leveling: cfg.leveling });
}

export async function PATCH(req: Request, { params }: { params: { guildId: string } }) {
  if (!(await authorizeGuild(params.guildId)))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  const body = await req.json().catch(() => ({}));
  const cfg = await getOrCreateGuildConfig(params.guildId);
  const lv: any = cfg.leveling;

  if (typeof body.xpPerMessage === 'number')
    lv.xpPerMessage = Math.max(1, Math.min(1000, Math.floor(body.xpPerMessage)));
  if (typeof body.cooldownSeconds === 'number')
    lv.cooldownSeconds = Math.max(0, Math.min(3600, Math.floor(body.cooldownSeconds)));
  if (typeof body.minMessageLength === 'number')
    lv.minMessageLength = Math.max(0, Math.min(500, Math.floor(body.minMessageLength)));
  if (Array.isArray(body.ignoredChannels))
    lv.ignoredChannels = body.ignoredChannels.map(String).filter(Boolean).slice(0, 100);
  if (Array.isArray(body.ignoredRoles))
    lv.ignoredRoles = body.ignoredRoles.map(String).filter(Boolean).slice(0, 100);
  if (typeof body.stackRewards === 'boolean') lv.stackRewards = body.stackRewards;

  if (body.announce && typeof body.announce === 'object') {
    if (ANNOUNCE_MODES.includes(body.announce.mode)) lv.announce.mode = body.announce.mode;
    if (typeof body.announce.channelId === 'string')
      lv.announce.channelId = body.announce.channelId || null;
    if (typeof body.announce.template === 'string')
      lv.announce.template = body.announce.template.slice(0, 1500);
  }

  if (Array.isArray(body.rewards)) {
    const cleaned = body.rewards
      .slice(0, 50)
      .map((r: any) => ({
        level: Math.max(1, Math.floor(Number(r.level) || 0)),
        roleId: String(r.roleId ?? '').trim(),
      }))
      .filter((r: any) => r.level >= 1 && r.roleId);
    lv.rewards = cleaned;
  }

  cfg.markModified('leveling');
  await cfg.save();
  return NextResponse.json({ leveling: cfg.leveling });
}

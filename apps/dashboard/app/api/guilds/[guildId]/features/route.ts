import { NextResponse } from 'next/server';
import { authorizeGuild } from '../../../../../lib/authorize';
import { ensureDb } from '../../../../../lib/db';
import { getOrCreateGuildConfig } from '@discord-bot/shared';

const VALID_FEATURES = ['welcome', 'rolebutton', 'leveling', 'poll', 'dashboardDm'] as const;
type FeatureName = (typeof VALID_FEATURES)[number];

export async function GET(_req: Request, { params }: { params: { guildId: string } }) {
  if (!(await authorizeGuild(params.guildId)))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  const cfg = await getOrCreateGuildConfig(params.guildId);
  return NextResponse.json({ features: cfg.features });
}

export async function PATCH(req: Request, { params }: { params: { guildId: string } }) {
  if (!(await authorizeGuild(params.guildId)))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await ensureDb();
  const body = await req.json().catch(() => ({}));
  const cfg = await getOrCreateGuildConfig(params.guildId);

  for (const key of VALID_FEATURES) {
    const val = body?.[key];
    if (val && typeof val.enabled === 'boolean') {
      (cfg.features as any)[key] = { enabled: val.enabled };
    }
  }

  cfg.markModified('features');
  await cfg.save();
  return NextResponse.json({ features: cfg.features });
}

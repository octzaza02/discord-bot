import type { Client } from 'discord.js';
import {
  StreamState,
  StreamSubscription,
  isFeatureEnabled,
} from '@discord-bot/shared';
import { youtube } from './checkers/index.js';
import { sendStreamNotification } from './notify.js';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const FAIL_LIMIT = 5;
const FAIL_COOLDOWN_MS = 30 * 60 * 1000;

async function processCreator(
  client: Client,
  creatorId: string,
  subs: Array<{
    _id: any;
    guildId: string;
    discordChannelId: string;
    lastVideoId: string | null;
  }>,
) {
  const state = await StreamState.findOneAndUpdate(
    { platform: 'youtube', creatorId },
    { $setOnInsert: { platform: 'youtube', creatorId } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  if (state.cooldownUntil && state.cooldownUntil > new Date()) return;

  const prevVideoId = state.latestVideoId;

  let result;
  try {
    result = await youtube.check(creatorId, prevVideoId);
    state.failCount = 0;
    state.cooldownUntil = null;
  } catch (err) {
    state.failCount += 1;
    state.checkedAt = new Date();
    if (state.failCount >= FAIL_LIMIT) {
      state.cooldownUntil = new Date(Date.now() + FAIL_COOLDOWN_MS);
      console.warn(
        `[streamalert] youtube:${creatorId} failed ${state.failCount}x, cooldown 30m`,
        err instanceof Error ? err.message : err,
      );
    }
    await state.save();
    return;
  }

  state.checkedAt = new Date();
  if (result.latestVideoId) state.latestVideoId = result.latestVideoId;
  await state.save();

  const newEvents = result.events.filter((ev) => ev.id !== prevVideoId);
  if (newEvents.length === 0) return;

  for (const sub of subs) {
    for (const ev of newEvents) {
      if (sub.lastVideoId === ev.id) continue;
      const enabled = await isFeatureEnabled(sub.guildId, 'streamalert');
      if (!enabled) continue;
      await sendStreamNotification(
        client,
        sub.guildId,
        sub.discordChannelId,
        ev,
      ).catch((err) => console.error('[streamalert] notify failed', err));
      await StreamSubscription.updateOne(
        { _id: sub._id },
        { $set: { lastVideoId: ev.id } },
      );
    }
  }
}

async function tick(client: Client) {
  const subs = await StreamSubscription.find({}).lean();
  if (subs.length === 0) return;

  // Group by creatorId — one API call serves all guilds
  const groups = new Map<string, typeof subs>();
  for (const s of subs) {
    if (!groups.has(s.creatorId)) groups.set(s.creatorId, []);
    groups.get(s.creatorId)!.push(s);
  }

  for (const [creatorId, group] of groups) {
    try {
      await processCreator(client, creatorId, group as any);
    } catch (err) {
      console.error(`[streamalert] group youtube:${creatorId} failed`, err);
    }
  }
}

export function startStreamScheduler(client: Client) {
  console.log('[streamalert] scheduler started (5min interval, YouTube RSS)');
  tick(client).catch((err) => console.error('[streamalert] initial tick failed', err));
  setInterval(() => {
    tick(client).catch((err) => console.error('[streamalert] tick failed', err));
  }, CHECK_INTERVAL_MS);
}

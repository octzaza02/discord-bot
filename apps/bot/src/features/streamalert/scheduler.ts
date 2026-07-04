import type { Client } from 'discord.js';
import {
  StreamState,
  StreamSubscription,
  isFeatureEnabled,
  type StreamPlatform,
} from '@discord-bot/shared';
import { getChecker } from './checkers/index.js';
import { sendStreamNotification } from './notify.js';
import type { StreamEvent } from './types.js';

const CHECK_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const FAIL_LIMIT = 5;
const FAIL_COOLDOWN_MS = 30 * 60 * 1000; // 30 min

type Key = `${StreamPlatform}:${string}`;

async function processOne(
  client: Client,
  platform: StreamPlatform,
  creatorId: string,
  subs: Array<{ _id: any; guildId: string; discordChannelId: string; lastVideoId: string | null; lastLiveId: string | null }>,
) {
  const checker = getChecker(platform);
  if (!checker.isEnabled()) return;

  const state = await StreamState.findOneAndUpdate(
    { platform, creatorId },
    { $setOnInsert: { platform, creatorId } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  if (state.cooldownUntil && state.cooldownUntil > new Date()) return;

  let result;
  try {
    result = await checker.check(creatorId);
    state.failCount = 0;
    state.cooldownUntil = null;
  } catch (err) {
    state.failCount += 1;
    state.checkedAt = new Date();
    if (state.failCount >= FAIL_LIMIT) {
      state.cooldownUntil = new Date(Date.now() + FAIL_COOLDOWN_MS);
      console.warn(
        `[streamalert] ${platform}:${creatorId} failed ${state.failCount}x, cooldown 30m`,
        err instanceof Error ? err.message : err,
      );
    }
    await state.save();
    return;
  }

  state.checkedAt = new Date();
  const prevLiveId = state.liveId;
  const prevVideoId = state.latestVideoId;
  state.liveId = result.liveId;
  if (result.latestVideoId) state.latestVideoId = result.latestVideoId;
  await state.save();

  // Determine which events are actually new
  const newEvents: StreamEvent[] = [];
  for (const ev of result.events) {
    if (ev.kind === 'live') {
      if (prevLiveId !== ev.id) newEvents.push(ev);
    } else if (ev.kind === 'video') {
      if (prevVideoId !== ev.id) newEvents.push(ev);
    }
  }
  if (newEvents.length === 0) return;

  for (const sub of subs) {
    for (const ev of newEvents) {
      // Per-subscription dedupe: skip if this exact ID was already notified for this sub
      if (ev.kind === 'live' && sub.lastLiveId === ev.id) continue;
      if (ev.kind === 'video' && sub.lastVideoId === ev.id) continue;

      // Feature toggle check per guild
      const enabled = await isFeatureEnabled(sub.guildId, 'streamalert');
      if (!enabled) continue;

      await sendStreamNotification(
        client,
        sub.guildId,
        sub.discordChannelId,
        platform,
        ev,
      ).catch((err) => console.error('[streamalert] notify failed', err));

      // Mark as notified for this sub
      const update: any = {};
      if (ev.kind === 'live') update.lastLiveId = ev.id;
      if (ev.kind === 'video') update.lastVideoId = ev.id;
      await StreamSubscription.updateOne({ _id: sub._id }, { $set: update });
    }
  }
}

async function tick(client: Client) {
  const subs = await StreamSubscription.find({}).lean();
  if (subs.length === 0) return;

  // Group by (platform, creatorId) — one API call serves all guilds
  const groups = new Map<Key, typeof subs>();
  for (const s of subs) {
    const key = `${s.platform}:${s.creatorId}` as Key;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  for (const [key, group] of groups) {
    const [platform, creatorId] = key.split(':') as [StreamPlatform, string];
    try {
      await processOne(client, platform, creatorId.slice(0), group as any);
    } catch (err) {
      console.error(`[streamalert] group ${key} failed`, err);
    }
  }
}

export function startStreamScheduler(client: Client) {
  console.log('[streamalert] scheduler started (2min interval)');
  tick(client).catch((err) => console.error('[streamalert] initial tick failed', err));
  setInterval(() => {
    tick(client).catch((err) => console.error('[streamalert] tick failed', err));
  }, CHECK_INTERVAL_MS);
}

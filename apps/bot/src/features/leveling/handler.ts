import { Events, type Message } from 'discord.js';
import { GuildConfig, isFeatureEnabled } from '@discord-bot/shared';
import type { EventHandler } from '../../core/types.js';
import { grantXp } from './xp.js';
import { levelFromXp } from './level.js';
import { announceLevelUp } from './announce.js';
import { applyLevelRewards } from './rewards.js';

async function onMessage(_client: unknown, message: Message) {
  if (!message.inGuild()) return;
  if (message.author.bot || message.system) return;
  if (!message.guild) return;

  if (!(await isFeatureEnabled(message.guildId, 'leveling'))) return;

  const cfg = await GuildConfig.findOne({ guildId: message.guildId }).lean();
  const leveling = cfg?.leveling;
  if (!leveling) return;

  // Filters
  if ((leveling.ignoredChannels ?? []).includes(message.channelId)) return;
  const contentLen = message.content?.length ?? 0;
  if (contentLen < (leveling.minMessageLength ?? 1)) return;

  const member = message.member;
  if (!member) return;

  if ((leveling.ignoredRoles ?? []).some((rid) => member.roles.cache.has(rid))) return;

  const xpPerMsg = leveling.xpPerMessage ?? 15;
  const cooldown = leveling.cooldownSeconds ?? 60;

  let result;
  try {
    result = await grantXp(message.guildId, message.author.id, xpPerMsg, cooldown);
  } catch (err) {
    console.error('[leveling] grantXp failed', err);
    return;
  }
  if (!result.granted) return;

  const oldLevel = levelFromXp(result.oldXp);
  const newLevel = levelFromXp(result.totalXp);
  if (newLevel <= oldLevel) return;

  // Level up! Fire announcement and rewards independently (best-effort).
  Promise.all([
    announceLevelUp(member, message.channel as any, newLevel, result.totalXp, leveling.announce),
    applyLevelRewards(member, newLevel, leveling),
  ]).catch((err) => console.error('[leveling] level up side-effects failed', err));
}

export const levelingEvent: EventHandler<Events.MessageCreate> = {
  event: Events.MessageCreate,
  run: onMessage,
};

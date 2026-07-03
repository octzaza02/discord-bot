import { ChannelType, type Client } from 'discord.js';
import { Poll } from '@discord-bot/shared';
import { buildPollMessage } from './builder.js';

const CHECK_INTERVAL_MS = 30_000;

async function closeExpired(client: Client) {
  const now = new Date();
  const expired = await Poll.find({
    closed: false,
    endsAt: { $ne: null, $lte: now },
  }).limit(50);

  for (const poll of expired) {
    poll.closed = true;
    await poll.save();

    try {
      const guild = await client.guilds.fetch(poll.guildId).catch(() => null);
      if (!guild || !poll.messageId) continue;
      const ch = await guild.channels.fetch(poll.channelId).catch(() => null);
      if (
        !ch ||
        (ch.type !== ChannelType.GuildText && ch.type !== ChannelType.GuildAnnouncement)
      )
        continue;
      const msg = await ch.messages.fetch(poll.messageId).catch(() => null);
      if (!msg) continue;
      await msg.edit(buildPollMessage(poll));
    } catch (err) {
      console.error('[poll scheduler] update failed', err);
    }
  }
}

export function startPollScheduler(client: Client) {
  const tick = () => {
    closeExpired(client).catch((err) => console.error('[poll scheduler] tick failed', err));
  };
  tick();
  setInterval(tick, CHECK_INTERVAL_MS);
  console.log('[poll scheduler] started (30s interval)');
}

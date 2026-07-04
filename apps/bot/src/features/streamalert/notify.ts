import { ChannelType, EmbedBuilder, type Client } from 'discord.js';
import type { StreamPlatform } from '@discord-bot/shared';
import type { StreamEvent } from './types.js';

const PLATFORM_COLOR: Record<StreamPlatform, number> = {
  youtube: 0xff0000,
  twitch: 0x9146ff,
  tiktok: 0x000000,
  facebook: 0x1877f2,
};

const PLATFORM_LABEL: Record<StreamPlatform, string> = {
  youtube: 'YouTube',
  twitch: 'Twitch',
  tiktok: 'TikTok',
  facebook: 'Facebook',
};

export async function sendStreamNotification(
  client: Client,
  guildId: string,
  channelId: string,
  platform: StreamPlatform,
  ev: StreamEvent,
) {
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (
    !channel ||
    (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)
  )
    return;

  const isLive = ev.kind === 'live';
  const prefix = isLive ? '🔴 กำลังไลฟ์' : '🎬 คลิปใหม่';

  const embed = new EmbedBuilder()
    .setColor(PLATFORM_COLOR[platform])
    .setAuthor({ name: `${prefix} · ${PLATFORM_LABEL[platform]}` })
    .setTitle(ev.title.slice(0, 256))
    .setURL(ev.url)
    .setDescription(`**${ev.channelName}** ${isLive ? 'กำลังไลฟ์อยู่ตอนนี้' : 'ปล่อยคลิปใหม่'}`);

  if (ev.thumbnail) embed.setImage(ev.thumbnail);
  if (ev.publishedAt) embed.setTimestamp(ev.publishedAt);
  if (ev.channelUrl) {
    embed.addFields({ name: 'ช่อง', value: `[${ev.channelName}](${ev.channelUrl})`, inline: true });
  }

  await channel
    .send({ content: `${ev.url}`, embeds: [embed] })
    .catch((err) => console.error('[streamalert notify] send failed', err));
}

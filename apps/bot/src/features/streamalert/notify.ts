import { ChannelType, EmbedBuilder, type Client } from 'discord.js';
import type { StreamEvent } from './types.js';

export async function sendStreamNotification(
  client: Client,
  guildId: string,
  channelId: string,
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

  const embed = new EmbedBuilder()
    .setColor(0xff0000)
    .setAuthor({ name: '🎬 คลิป/ไลฟ์ใหม่ · YouTube' })
    .setTitle(ev.title.slice(0, 256))
    .setURL(ev.url)
    .setDescription(`**${ev.channelName}** ปล่อยคอนเทนต์ใหม่`);

  if (ev.thumbnail) embed.setImage(ev.thumbnail);
  if (ev.publishedAt) embed.setTimestamp(ev.publishedAt);
  if (ev.channelUrl) {
    embed.addFields({ name: 'ช่อง', value: `[${ev.channelName}](${ev.channelUrl})`, inline: true });
  }

  await channel
    .send({ content: ev.url, embeds: [embed] })
    .catch((err) => console.error('[streamalert notify] send failed', err));
}

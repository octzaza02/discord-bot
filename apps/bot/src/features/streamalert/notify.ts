import { ChannelType, EmbedBuilder, type Client, type MessageCreateOptions } from 'discord.js';
import type { StreamEvent } from './types.js';

export interface StreamPingConfig {
  pingType: 'none' | 'role' | 'everyone' | 'here';
  pingRoleId: string | null;
}

export async function sendStreamNotification(
  client: Client,
  guildId: string,
  channelId: string,
  ev: StreamEvent,
  ping?: StreamPingConfig,
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

  let prefix = '';
  const allowedMentions: MessageCreateOptions['allowedMentions'] = { parse: [] };
  if (ping) {
    if (ping.pingType === 'role' && ping.pingRoleId) {
      prefix = `<@&${ping.pingRoleId}> `;
      allowedMentions.roles = [ping.pingRoleId];
    } else if (ping.pingType === 'everyone') {
      prefix = '@everyone ';
      allowedMentions.parse = ['everyone'];
    } else if (ping.pingType === 'here') {
      prefix = '@here ';
      allowedMentions.parse = ['everyone'];
    }
  }

  await channel
    .send({ content: `${prefix}${ev.url}`, embeds: [embed], allowedMentions })
    .catch((err) => console.error('[streamalert notify] send failed', err));
}

import { ChannelType, type Client } from 'discord.js';
import { RolePanel } from '@discord-bot/shared';
import { buildPanelMessage } from './builder.js';

export async function postRolePanel(client: Client, panelId: string, overrideChannelId?: string) {
  const panel = await RolePanel.findById(panelId);
  if (!panel) throw new Error('panel not found');
  const channelId = overrideChannelId ?? panel.channelId;
  if (!channelId) throw new Error('no channel');
  const guild = await client.guilds.fetch(panel.guildId).catch(() => null);
  if (!guild) throw new Error('bot not in guild');
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)) {
    throw new Error('channel not text-based');
  }

  const msgOpts = buildPanelMessage(panel);

  // If already posted, try to edit; otherwise send new
  if (panel.messageId && panel.channelId === channelId) {
    const existing = await channel.messages.fetch(panel.messageId).catch(() => null);
    if (existing) {
      await existing.edit(msgOpts);
      return { messageId: existing.id, edited: true };
    }
  }
  const sent = await channel.send(msgOpts);
  panel.channelId = channelId;
  panel.messageId = sent.id;
  await panel.save();
  return { messageId: sent.id, edited: false };
}

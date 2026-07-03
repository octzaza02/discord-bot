import { ChannelType, Events, type GuildMember } from 'discord.js';
import { GuildConfig, isFeatureEnabled } from '@discord-bot/shared';
import type { EventHandler } from '../../core/types.js';
import { renderTemplate } from './template.js';

async function onMemberJoin(_client: unknown, member: GuildMember) {
  if (!(await isFeatureEnabled(member.guild.id, 'welcome'))) return;
  const cfg = await GuildConfig.findOne({ guildId: member.guild.id });
  if (!cfg?.welcome?.enabled || !cfg.welcome.channelId) return;
  const channel = await member.guild.channels.fetch(cfg.welcome.channelId).catch(() => null);
  if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)) return;
  const content = renderTemplate(cfg.welcome.template ?? '', member);
  await channel.send({ content, allowedMentions: { users: [member.id] } }).catch((err) => {
    console.error('[welcome] send failed', err);
  });
}

export const welcomeEvent: EventHandler<Events.GuildMemberAdd> = {
  event: Events.GuildMemberAdd,
  run: onMemberJoin,
};

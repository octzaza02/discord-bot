import type { GuildMember, Guild } from 'discord.js';

export function renderTemplate(
  template: string,
  member: GuildMember,
  guild: Guild = member.guild,
): string {
  return template
    .replaceAll('{user}', `<@${member.id}>`)
    .replaceAll('{username}', member.user.username)
    .replaceAll('{server}', guild.name)
    .replaceAll('{memberCount}', String(guild.memberCount));
}

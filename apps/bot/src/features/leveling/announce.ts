import { ChannelType, type GuildMember, type TextBasedChannel } from 'discord.js';
import type { GuildConfigDoc } from '@discord-bot/shared';

function render(template: string, member: GuildMember, level: number, xp: number): string {
  return template
    .replaceAll('{user}', `<@${member.id}>`)
    .replaceAll('{username}', member.user.username)
    .replaceAll('{server}', member.guild.name)
    .replaceAll('{level}', String(level))
    .replaceAll('{xp}', String(xp));
}

export async function announceLevelUp(
  member: GuildMember,
  fromChannel: TextBasedChannel | null,
  level: number,
  xp: number,
  announce: GuildConfigDoc['leveling']['announce'],
) {
  const mode = announce?.mode ?? 'same';
  if (mode === 'off') return;

  const content = render(
    announce?.template ?? '🎉 ยินดีด้วย {user} เลื่อนขึ้นเป็น **Level {level}**!',
    member,
    level,
    xp,
  );

  try {
    if (mode === 'dm') {
      await member.send({ content }).catch(() => {});
      return;
    }

    if (mode === 'channel') {
      if (!announce?.channelId) return;
      const ch = await member.guild.channels.fetch(announce.channelId).catch(() => null);
      if (
        ch &&
        (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement)
      ) {
        await ch.send({ content, allowedMentions: { users: [member.id] } });
      }
      return;
    }

    // mode === 'same'
    if (fromChannel && 'send' in fromChannel) {
      await fromChannel.send({ content, allowedMentions: { users: [member.id] } });
    }
  } catch (err) {
    console.error('[leveling announce] failed', err);
  }
}

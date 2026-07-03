import { Events, type Interaction, type GuildMember } from 'discord.js';
import type { EventHandler } from '../../core/types.js';

async function onInteraction(_client: unknown, interaction: Interaction) {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith('rolepanel:')) return;
  if (!interaction.inGuild() || !interaction.guild) return;

  const parts = interaction.customId.split(':');
  const roleId = parts[2];
  if (!roleId) return;

  const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
  if (!role) {
    await interaction.reply({ content: '❌ ยศนี้ถูกลบไปแล้ว', ephemeral: true }).catch(() => {});
    return;
  }

  const me = interaction.guild.members.me;
  if (!me || me.roles.highest.comparePositionTo(role) <= 0) {
    await interaction
      .reply({
        content: '❌ บอทไม่มีสิทธิ์จัดการยศนี้ (ยศบอทต้องอยู่สูงกว่ายศนี้)',
        ephemeral: true,
      })
      .catch(() => {});
    return;
  }

  const member = interaction.member as GuildMember;
  const has = member.roles.cache.has(roleId);
  try {
    if (has) {
      await member.roles.remove(roleId, 'rolepanel toggle');
      await interaction.reply({ content: `➖ ถอด <@&${roleId}> แล้ว`, ephemeral: true, allowedMentions: { parse: [] } });
    } else {
      await member.roles.add(roleId, 'rolepanel toggle');
      await interaction.reply({ content: `➕ ได้รับ <@&${roleId}> แล้ว`, ephemeral: true, allowedMentions: { parse: [] } });
    }
  } catch (err) {
    console.error('[rolebutton] toggle failed', err);
    await interaction.reply({ content: '❌ ไม่สามารถเปลี่ยนยศได้', ephemeral: true }).catch(() => {});
  }
}

export const roleButtonEvent: EventHandler<Events.InteractionCreate> = {
  event: Events.InteractionCreate,
  run: onInteraction,
};

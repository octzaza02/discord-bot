import { Events, type Interaction } from 'discord.js';
import { Poll, isFeatureEnabled } from '@discord-bot/shared';
import type { EventHandler } from '../../core/types.js';
import { buildPollMessage } from './builder.js';

async function onInteraction(_client: unknown, interaction: Interaction) {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith('poll:')) return;
  if (!interaction.inGuild() || !interaction.guildId) return;

  if (!(await isFeatureEnabled(interaction.guildId, 'poll'))) {
    await interaction
      .reply({ content: '⚠️ ระบบโพลถูกปิดในเซิร์ฟนี้', ephemeral: true })
      .catch(() => {});
    return;
  }

  const parts = interaction.customId.split(':');
  const pollId = parts[1];
  const optionIndex = Number(parts[2]);
  if (!pollId || !Number.isFinite(optionIndex)) return;

  const poll = await Poll.findById(pollId).catch(() => null);
  if (!poll) {
    await interaction
      .reply({ content: '❌ ไม่พบโพลนี้ อาจถูกลบไปแล้ว', ephemeral: true })
      .catch(() => {});
    return;
  }
  if (poll.closed) {
    await interaction.reply({ content: '🔒 โพลนี้ปิดแล้ว', ephemeral: true }).catch(() => {});
    return;
  }
  if (poll.endsAt && poll.endsAt.getTime() <= Date.now()) {
    await interaction.reply({ content: '⏰ โพลนี้หมดเวลาแล้ว', ephemeral: true }).catch(() => {});
    return;
  }
  if (optionIndex < 0 || optionIndex >= poll.options.length) return;

  const userId = interaction.user.id;
  const existing = poll.votes.filter((v) => v.userId === userId);

  let responseMsg: string;
  if (poll.allowMulti) {
    const already = existing.find((v) => v.optionIndex === optionIndex);
    if (already) {
      poll.votes = poll.votes.filter(
        (v) => !(v.userId === userId && v.optionIndex === optionIndex),
      );
      responseMsg = `➖ ถอนโหวต **${poll.options[optionIndex]}**`;
    } else {
      poll.votes.push({ userId, optionIndex, votedAt: new Date() });
      responseMsg = `✅ โหวต **${poll.options[optionIndex]}**`;
    }
  } else {
    const already = existing.find((v) => v.optionIndex === optionIndex);
    if (already) {
      poll.votes = poll.votes.filter((v) => v.userId !== userId);
      responseMsg = `➖ ถอนโหวต **${poll.options[optionIndex]}**`;
    } else {
      poll.votes = poll.votes.filter((v) => v.userId !== userId);
      poll.votes.push({ userId, optionIndex, votedAt: new Date() });
      responseMsg =
        existing.length > 0
          ? `🔄 เปลี่ยนโหวตเป็น **${poll.options[optionIndex]}**`
          : `✅ โหวต **${poll.options[optionIndex]}**`;
    }
  }

  await poll.save();

  // Update the message with new tally
  try {
    await interaction.update(buildPollMessage(poll));
    await interaction.followUp({ content: responseMsg, ephemeral: true }).catch(() => {});
  } catch (err) {
    console.error('[poll] update failed', err);
    await interaction
      .reply({ content: responseMsg, ephemeral: true })
      .catch(() => {});
  }
}

export const pollEvent: EventHandler<Events.InteractionCreate> = {
  event: Events.InteractionCreate,
  run: onInteraction,
};

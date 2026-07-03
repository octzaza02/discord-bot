import {
  EmbedBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { UserXp } from '@discord-bot/shared';
import type { SlashCommand } from '../../core/types.js';
import { levelFromXp, progress } from './level.js';

// ---------- /leaderboard ----------

const leaderboardData = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('อันดับ XP ในเซิร์ฟเวอร์นี้')
  .setDMPermission(false)
  .addIntegerOption((o) =>
    o.setName('page').setDescription('หน้า (เริ่มที่ 1)').setMinValue(1).setMaxValue(100),
  );

async function leaderboardExec(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild() || !interaction.guildId) {
    await interaction.reply({ content: 'ใช้ได้เฉพาะในเซิร์ฟเวอร์', ephemeral: true });
    return;
  }
  await interaction.deferReply();

  const page = Math.max(1, interaction.options.getInteger('page') ?? 1);
  const perPage = 10;
  const skip = (page - 1) * perPage;

  const [rows, total] = await Promise.all([
    UserXp.find({ guildId: interaction.guildId })
      .sort({ totalXp: -1 })
      .skip(skip)
      .limit(perPage)
      .lean(),
    UserXp.countDocuments({ guildId: interaction.guildId }),
  ]);

  if (rows.length === 0) {
    await interaction.editReply({
      content: page === 1 ? 'ยังไม่มีใครมี XP ในเซิร์ฟนี้เลย' : `หน้า ${page} ว่างเปล่า`,
    });
    return;
  }

  const lines = rows.map((r, i) => {
    const rank = skip + i + 1;
    const level = levelFromXp(r.totalXp);
    return `\`#${String(rank).padStart(2, ' ')}\` <@${r.userId}> — Lv **${level}** · ${r.totalXp.toLocaleString()} XP`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`🏆 Leaderboard — ${interaction.guild?.name ?? ''}`)
    .setDescription(lines.join('\n'))
    .setColor(0xf1c40f)
    .setFooter({ text: `หน้า ${page} / ${Math.max(1, Math.ceil(total / perPage))} · ทั้งหมด ${total} คน` });

  await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
}

export const leaderboardCommand: SlashCommand = {
  data: leaderboardData,
  execute: leaderboardExec,
};

// ---------- /rank ----------

const rankData = new SlashCommandBuilder()
  .setName('rank')
  .setDescription('ดู level และ XP ของตัวเองหรือคนอื่น')
  .setDMPermission(false)
  .addUserOption((o) => o.setName('user').setDescription('ผู้ใช้ที่ต้องการดู (ปล่อยว่าง = ตัวเอง)'));

function progressBar(current: number, total: number, size = 15): string {
  const filled = Math.round((current / total) * size);
  return '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, size - filled));
}

async function rankExec(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild() || !interaction.guildId) {
    await interaction.reply({ content: 'ใช้ได้เฉพาะในเซิร์ฟเวอร์', ephemeral: true });
    return;
  }
  await interaction.deferReply();

  const target = interaction.options.getUser('user') ?? interaction.user;
  const row = await UserXp.findOne({ guildId: interaction.guildId, userId: target.id }).lean();

  if (!row) {
    await interaction.editReply({
      content: target.id === interaction.user.id
        ? 'คุณยังไม่มี XP เลย ลองแชทดูสิ!'
        : `<@${target.id}> ยังไม่มี XP เลย`,
      allowedMentions: { parse: [] },
    });
    return;
  }

  const p = progress(row.totalXp);
  const rank = (await UserXp.countDocuments({
    guildId: interaction.guildId,
    totalXp: { $gt: row.totalXp },
  })) + 1;

  const bar = progressBar(p.currentLevelXp, p.neededForNext);
  const embed = new EmbedBuilder()
    .setTitle(`📊 Rank — ${target.username}`)
    .setThumbnail(target.displayAvatarURL())
    .addFields(
      { name: 'Level', value: String(p.level), inline: true },
      { name: 'Rank', value: `#${rank}`, inline: true },
      { name: 'Total XP', value: row.totalXp.toLocaleString(), inline: true },
      {
        name: `Progress → Lv ${p.level + 1}`,
        value: `\`${bar}\` ${p.currentLevelXp} / ${p.neededForNext}`,
      },
    )
    .setColor(0x5865f2);

  await interaction.editReply({ embeds: [embed] });
}

export const rankCommand: SlashCommand = { data: rankData, execute: rankExec };

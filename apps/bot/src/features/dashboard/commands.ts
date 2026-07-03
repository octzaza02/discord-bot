import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { config } from '../../config.js';
import type { SlashCommand } from '../../core/types.js';

const data = new SlashCommandBuilder()
  .setName('dashboard')
  .setDescription('รับลิงก์ไปหน้าตั้งค่าบอทสำหรับเซิร์ฟเวอร์นี้')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false);

async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild() || !interaction.guildId) {
    await interaction.reply({ content: 'ใช้ได้เฉพาะในเซิร์ฟเวอร์', ephemeral: true });
    return;
  }
  if (!config.dashboardUrl) {
    await interaction.reply({
      content: '⚠️ ยังไม่ได้ตั้งค่า DASHBOARD_URL ใน bot service',
      ephemeral: true,
    });
    return;
  }

  const base = config.dashboardUrl.replace(/\/$/, '');
  const link = `${base}/servers/${interaction.guildId}/welcome`;

  await interaction.reply({
    content:
      `🔧 **ตั้งค่าบอทของเซิร์ฟเวอร์นี้**\n${link}\n\n` +
      `ต้อง login ด้วย Discord และมีสิทธิ์ **Manage Server** ในเซิร์ฟเวอร์นี้`,
    ephemeral: true,
  });
}

export const dashboardCommand: SlashCommand = { data, execute };

import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { getOrCreateGuildConfig } from '@discord-bot/shared';
import type { SlashCommand } from '../../core/types.js';
import { renderTemplate } from './template.js';

const data = new SlashCommandBuilder()
  .setName('welcome')
  .setDescription('ตั้งค่าข้อความต้อนรับ')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addSubcommand((s) =>
    s
      .setName('channel')
      .setDescription('ตั้งห้องที่จะส่งข้อความต้อนรับ')
      .addChannelOption((o) =>
        o
          .setName('channel')
          .setDescription('ห้องข้อความ')
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setRequired(true),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName('message')
      .setDescription('ตั้ง template ข้อความ ใช้ตัวแปร {user} {username} {server} {memberCount}')
      .addStringOption((o) =>
        o.setName('template').setDescription('ข้อความ template').setRequired(true).setMaxLength(1500),
      ),
  )
  .addSubcommand((s) => s.setName('preview').setDescription('ดูตัวอย่างข้อความต้อนรับด้วยตัวคุณเอง'))
  .addSubcommand((s) => s.setName('enable').setDescription('เปิดข้อความต้อนรับ'))
  .addSubcommand((s) => s.setName('disable').setDescription('ปิดข้อความต้อนรับ'));

async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.reply({ content: 'ใช้ได้เฉพาะในเซิร์ฟเวอร์', ephemeral: true });
    return;
  }
  const sub = interaction.options.getSubcommand();
  const cfg = await getOrCreateGuildConfig(interaction.guildId!);

  if (sub === 'channel') {
    const ch = interaction.options.getChannel('channel', true);
    cfg.welcome.channelId = ch.id;
    cfg.welcome.enabled = true;
    await cfg.save();
    await interaction.reply({ content: `✅ ตั้งห้องต้อนรับเป็น <#${ch.id}> เรียบร้อย`, ephemeral: true });
    return;
  }

  if (sub === 'message') {
    const tpl = interaction.options.getString('template', true);
    cfg.welcome.template = tpl;
    await cfg.save();
    await interaction.reply({
      content: `✅ ตั้ง template แล้ว\n**ตัวอย่าง:**\n${tpl}`,
      ephemeral: true,
    });
    return;
  }

  if (sub === 'preview') {
    const member = interaction.member && 'user' in interaction.member
      ? await interaction.guild.members.fetch(interaction.user.id)
      : null;
    if (!member) {
      await interaction.reply({ content: 'ไม่พบข้อมูลสมาชิก', ephemeral: true });
      return;
    }
    const rendered = renderTemplate(cfg.welcome.template ?? '', member);
    await interaction.reply({ content: `**Preview:**\n${rendered}`, ephemeral: true });
    return;
  }

  if (sub === 'enable' || sub === 'disable') {
    cfg.welcome.enabled = sub === 'enable';
    await cfg.save();
    await interaction.reply({
      content: `✅ ข้อความต้อนรับถูก${sub === 'enable' ? 'เปิด' : 'ปิด'}แล้ว`,
      ephemeral: true,
    });
    return;
  }
}

export const welcomeCommand: SlashCommand = { data, execute };

import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { RolePanel, BUTTON_STYLES } from '@discord-bot/shared';
import type { SlashCommand } from '../../core/types.js';
import { postRolePanel } from './post.js';

const data = new SlashCommandBuilder()
  .setName('rolepanel')
  .setDescription('จัดการปุ่มรับยศ')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .setDMPermission(false)
  .addSubcommand((s) =>
    s
      .setName('create')
      .setDescription('สร้าง panel ใหม่')
      .addStringOption((o) => o.setName('title').setDescription('หัวข้อ').setRequired(true).setMaxLength(256))
      .addStringOption((o) => o.setName('description').setDescription('คำอธิบาย').setMaxLength(2000)),
  )
  .addSubcommand((s) =>
    s
      .setName('add-role')
      .setDescription('เพิ่มปุ่มยศเข้า panel')
      .addStringOption((o) => o.setName('panel_id').setDescription('panel id').setRequired(true))
      .addRoleOption((o) => o.setName('role').setDescription('ยศ').setRequired(true))
      .addStringOption((o) => o.setName('label').setDescription('ข้อความบนปุ่ม').setRequired(true).setMaxLength(80))
      .addStringOption((o) => o.setName('emoji').setDescription('emoji (optional)'))
      .addStringOption((o) =>
        o
          .setName('style')
          .setDescription('สีปุ่ม')
          .addChoices(...BUTTON_STYLES.map((v) => ({ name: v, value: v }))),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName('post')
      .setDescription('โพสต์ panel ลงห้อง')
      .addStringOption((o) => o.setName('panel_id').setDescription('panel id').setRequired(true))
      .addChannelOption((o) =>
        o
          .setName('channel')
          .setDescription('ห้องที่จะโพสต์')
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName('list')
      .setDescription('ดู panel ทั้งหมดในเซิร์ฟเวอร์นี้'),
  )
  .addSubcommand((s) =>
    s
      .setName('delete')
      .setDescription('ลบ panel')
      .addStringOption((o) => o.setName('panel_id').setDescription('panel id').setRequired(true)),
  );

async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.reply({ content: 'ใช้ได้เฉพาะในเซิร์ฟเวอร์', ephemeral: true });
    return;
  }
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId!;

  if (sub === 'create') {
    const title = interaction.options.getString('title', true);
    const description = interaction.options.getString('description') ?? '';
    const panel = await RolePanel.create({ guildId, title, description, roles: [] });
    await interaction.reply({
      content: `✅ สร้าง panel แล้ว\n**panel_id:** \`${panel._id}\`\nต่อไปใช้ \`/rolepanel add-role\` แล้ว \`/rolepanel post\``,
      ephemeral: true,
    });
    return;
  }

  if (sub === 'add-role') {
    const id = interaction.options.getString('panel_id', true);
    const panel = await RolePanel.findOne({ _id: id, guildId }).catch(() => null);
    if (!panel) {
      await interaction.reply({ content: '❌ ไม่พบ panel นี้ในเซิร์ฟเวอร์', ephemeral: true });
      return;
    }
    if (panel.roles.length >= 25) {
      await interaction.reply({ content: '❌ panel นี้มีปุ่มครบ 25 แล้ว', ephemeral: true });
      return;
    }
    const role = interaction.options.getRole('role', true);
    const label = interaction.options.getString('label', true);
    const emoji = interaction.options.getString('emoji') ?? undefined;
    const style = (interaction.options.getString('style') as any) ?? 'Secondary';

    // Prevent duplicate role
    if (panel.roles.some((r) => r.roleId === role.id)) {
      await interaction.reply({ content: '❌ ยศนี้อยู่ใน panel แล้ว', ephemeral: true });
      return;
    }
    panel.roles.push({ roleId: role.id, label, emoji: emoji ?? null, style });
    await panel.save();
    await interaction.reply({
      content: `✅ เพิ่ม <@&${role.id}> เข้า panel แล้ว (${panel.roles.length}/25)`,
      ephemeral: true,
      allowedMentions: { parse: [] },
    });
    return;
  }

  if (sub === 'post') {
    await interaction.deferReply({ ephemeral: true });
    const id = interaction.options.getString('panel_id', true);
    const channelOpt = interaction.options.getChannel('channel');
    const panel = await RolePanel.findOne({ _id: id, guildId }).catch(() => null);
    if (!panel) {
      await interaction.editReply({ content: '❌ ไม่พบ panel นี้' });
      return;
    }
    if (panel.roles.length === 0) {
      await interaction.editReply({ content: '❌ panel ยังไม่มีปุ่ม เพิ่มด้วย /rolepanel add-role ก่อน' });
      return;
    }
    try {
      const result = await postRolePanel(interaction.client, String(panel._id), channelOpt?.id);
      await interaction.editReply({
        content: `✅ ${result.edited ? 'อัปเดต' : 'โพสต์'} panel เรียบร้อย (message: ${result.messageId})`,
      });
    } catch (err: any) {
      await interaction.editReply({ content: `❌ ${err?.message ?? 'ไม่สามารถโพสต์ได้'}` });
    }
    return;
  }

  if (sub === 'list') {
    const panels = await RolePanel.find({ guildId }).limit(25);
    if (!panels.length) {
      await interaction.reply({ content: 'ยังไม่มี panel', ephemeral: true });
      return;
    }
    const lines = panels.map(
      (p) => `• \`${p._id}\` — **${p.title}** (${p.roles.length} ปุ่ม${p.messageId ? ', posted' : ''})`,
    );
    await interaction.reply({ content: lines.join('\n'), ephemeral: true });
    return;
  }

  if (sub === 'delete') {
    const id = interaction.options.getString('panel_id', true);
    const res = await RolePanel.deleteOne({ _id: id, guildId }).catch(() => null);
    if (!res?.deletedCount) {
      await interaction.reply({ content: '❌ ไม่พบ panel', ephemeral: true });
      return;
    }
    await interaction.reply({ content: '🗑️ ลบ panel แล้ว', ephemeral: true });
    return;
  }
}

export const rolePanelCommand: SlashCommand = { data, execute };

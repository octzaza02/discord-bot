import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { Poll, isFeatureEnabled } from '@discord-bot/shared';
import type { SlashCommand } from '../../core/types.js';
import { buildPollMessage } from './builder.js';

const data = new SlashCommandBuilder()
  .setName('poll')
  .setDescription('สร้างโพลโหวตในเซิร์ฟเวอร์')
  .setDMPermission(false)
  .addSubcommand((s) =>
    s
      .setName('create')
      .setDescription('สร้างโพลใหม่')
      .addStringOption((o) =>
        o.setName('question').setDescription('คำถาม').setRequired(true).setMaxLength(300),
      )
      .addStringOption((o) =>
        o
          .setName('options')
          .setDescription('ตัวเลือกคั่นด้วย | เช่น "แดง|น้ำเงิน|เขียว" (2-10 ข้อ)')
          .setRequired(true)
          .setMaxLength(1500),
      )
      .addIntegerOption((o) =>
        o
          .setName('duration_minutes')
          .setDescription('ระยะเวลาโหวต (นาที) — เว้นว่าง = ไม่มีเวลาสิ้นสุด')
          .setMinValue(1)
          .setMaxValue(10080),
      )
      .addBooleanOption((o) =>
        o.setName('allow_multi').setDescription('อนุญาตให้เลือกหลายข้อ (default: false)'),
      )
      .addChannelOption((o) =>
        o
          .setName('channel')
          .setDescription('ห้องที่จะโพสต์ (เว้นว่าง = ห้องปัจจุบัน)')
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName('close')
      .setDescription('ปิดโพล (ต้องมีสิทธิ์ Manage Messages หรือเป็นผู้สร้าง)')
      .addStringOption((o) => o.setName('poll_id').setDescription('poll id').setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName('list')
      .setDescription('ดูโพลที่ยังเปิดอยู่ในเซิร์ฟเวอร์นี้'),
  );

async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild() || !interaction.guild || !interaction.guildId) {
    await interaction.reply({ content: 'ใช้ได้เฉพาะในเซิร์ฟเวอร์', ephemeral: true });
    return;
  }

  if (!(await isFeatureEnabled(interaction.guildId, 'poll'))) {
    await interaction.reply({
      content: '⚠️ ระบบโพลถูกปิดในเซิร์ฟนี้ (ไปเปิดได้ที่ dashboard)',
      ephemeral: true,
    });
    return;
  }

  const sub = interaction.options.getSubcommand();

  if (sub === 'create') {
    const question = interaction.options.getString('question', true);
    const optsRaw = interaction.options.getString('options', true);
    const options = optsRaw
      .split('|')
      .map((o) => o.trim())
      .filter((o) => o.length > 0)
      .slice(0, 10);
    if (options.length < 2) {
      await interaction.reply({
        content: '❌ ต้องมีอย่างน้อย 2 ตัวเลือก (คั่นด้วย |)',
        ephemeral: true,
      });
      return;
    }
    const durationMin = interaction.options.getInteger('duration_minutes');
    const allowMulti = interaction.options.getBoolean('allow_multi') ?? false;
    const channelOpt = interaction.options.getChannel('channel');
    const channelId = channelOpt?.id ?? interaction.channelId;

    await interaction.deferReply({ ephemeral: true });

    const poll = await Poll.create({
      guildId: interaction.guildId,
      channelId,
      question,
      options,
      allowMulti,
      createdBy: interaction.user.id,
      endsAt: durationMin ? new Date(Date.now() + durationMin * 60_000) : null,
      closed: false,
      votes: [],
    });

    const guild = interaction.guild;
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (
      !channel ||
      (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)
    ) {
      await Poll.deleteOne({ _id: poll._id });
      await interaction.editReply({ content: '❌ ไม่พบห้องข้อความที่ระบุ' });
      return;
    }

    try {
      const sent = await channel.send(buildPollMessage(poll));
      poll.messageId = sent.id;
      await poll.save();
      await interaction.editReply({
        content: `✅ สร้างโพลแล้ว\n**Poll ID:** \`${poll._id}\``,
      });
    } catch (err: any) {
      await Poll.deleteOne({ _id: poll._id });
      await interaction.editReply({ content: `❌ โพสต์ไม่ได้: ${err?.message ?? 'error'}` });
    }
    return;
  }

  if (sub === 'close') {
    const id = interaction.options.getString('poll_id', true);
    const poll = await Poll.findOne({ _id: id, guildId: interaction.guildId }).catch(() => null);
    if (!poll) {
      await interaction.reply({ content: '❌ ไม่พบโพลนี้', ephemeral: true });
      return;
    }
    const canManage =
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages) ||
      poll.createdBy === interaction.user.id;
    if (!canManage) {
      await interaction.reply({
        content: '❌ ต้องเป็นผู้สร้างโพลหรือมีสิทธิ์ Manage Messages',
        ephemeral: true,
      });
      return;
    }
    if (poll.closed) {
      await interaction.reply({ content: 'โพลนี้ปิดแล้ว', ephemeral: true });
      return;
    }
    poll.closed = true;
    await poll.save();

    // Update the message
    try {
      const ch = await interaction.guild.channels.fetch(poll.channelId).catch(() => null);
      if (ch && 'messages' in ch && poll.messageId) {
        const msg = await ch.messages.fetch(poll.messageId).catch(() => null);
        if (msg) await msg.edit(buildPollMessage(poll));
      }
    } catch (err) {
      console.error('[poll close] edit message failed', err);
    }
    await interaction.reply({ content: '🔒 ปิดโพลแล้ว', ephemeral: true });
    return;
  }

  if (sub === 'list') {
    const polls = await Poll.find({ guildId: interaction.guildId, closed: false })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();
    if (polls.length === 0) {
      await interaction.reply({ content: 'ไม่มีโพลที่เปิดอยู่', ephemeral: true });
      return;
    }
    const lines = polls.map(
      (p) =>
        `• \`${p._id}\` — **${p.question.slice(0, 60)}** (${p.votes.length} เสียง${
          p.endsAt ? `, ปิด <t:${Math.floor(p.endsAt.getTime() / 1000)}:R>` : ''
        })`,
    );
    await interaction.reply({ content: lines.join('\n'), ephemeral: true });
    return;
  }
}

export const pollCommand: SlashCommand = { data, execute };

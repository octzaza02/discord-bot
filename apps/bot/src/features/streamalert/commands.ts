import {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import {
  StreamSubscription,
  isFeatureEnabled,
  STREAM_PLATFORMS,
  type StreamPlatform,
} from '@discord-bot/shared';
import type { SlashCommand } from '../../core/types.js';
import { getChecker } from './checkers/index.js';
import { normalizeInput } from './parser.js';

const platformChoices = STREAM_PLATFORMS.map((p) => ({ name: p, value: p }));

// ---------- /subscribe ----------
const subscribeData = new SlashCommandBuilder()
  .setName('subscribe')
  .setDescription('เพิ่มการติดตาม creator (YouTube, Twitch, TikTok, Facebook)')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addStringOption((o) =>
    o
      .setName('platform')
      .setDescription('แพลตฟอร์ม')
      .setRequired(true)
      .addChoices(...platformChoices),
  )
  .addStringOption((o) =>
    o
      .setName('creator')
      .setDescription('URL หรือชื่อ/ID ของ creator (Facebook ต้องใส่ pageId:token)')
      .setRequired(true)
      .setMaxLength(500),
  )
  .addChannelOption((o) =>
    o
      .setName('channel')
      .setDescription('ห้องที่จะแจ้งเตือน')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(true),
  );

async function subscribeExec(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild() || !interaction.guildId) {
    await interaction.reply({ content: 'ใช้ได้เฉพาะในเซิร์ฟเวอร์', ephemeral: true });
    return;
  }
  if (!(await isFeatureEnabled(interaction.guildId, 'streamalert'))) {
    await interaction.reply({
      content: '⚠️ ระบบ Stream Alert ถูกปิด — เปิดที่ dashboard ก่อน',
      ephemeral: true,
    });
    return;
  }

  const platform = interaction.options.getString('platform', true) as StreamPlatform;
  const creatorInput = interaction.options.getString('creator', true);
  const channel = interaction.options.getChannel('channel', true);

  const checker = getChecker(platform);
  if (!checker.isEnabled()) {
    await interaction.reply({
      content: `⚠️ **${platform}** ยังไม่พร้อมใช้งาน: ${checker.reason()}`,
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  // For Facebook, creator input is expected to be "pageId:token", pass raw.
  // For others, normalize.
  const normalized = platform === 'facebook' ? creatorInput.trim() : normalizeInput(platform, creatorInput);
  if (!normalized) {
    await interaction.editReply({ content: '❌ อ่านค่า creator ไม่ออก — ลอง paste URL แทน' });
    return;
  }

  const info = await checker.validate(normalized).catch((err) => {
    console.error('[streamalert validate]', err);
    return null;
  });
  if (!info) {
    await interaction.editReply({
      content: '❌ หา creator นี้ไม่เจอ — ตรวจ URL / ID / permission อีกครั้ง',
    });
    return;
  }

  try {
    await StreamSubscription.create({
      guildId: interaction.guildId,
      discordChannelId: channel.id,
      platform,
      creatorId: info.creatorId,
      creatorName: info.name,
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      await interaction.editReply({
        content: `⚠️ ติดตาม **${info.name}** อยู่แล้วในเซิร์ฟนี้`,
      });
      return;
    }
    console.error('[streamalert subscribe]', err);
    await interaction.editReply({ content: '❌ บันทึกไม่สำเร็จ' });
    return;
  }

  await interaction.editReply({
    content: `✅ ติดตาม **${info.name}** (${platform}) แจ้งเตือนที่ <#${channel.id}>`,
  });
}

export const subscribeCommand: SlashCommand = { data: subscribeData, execute: subscribeExec };

// ---------- /unsubscribe ----------
const unsubscribeData = new SlashCommandBuilder()
  .setName('unsubscribe')
  .setDescription('ลบการติดตาม creator')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addStringOption((o) =>
    o
      .setName('platform')
      .setDescription('แพลตฟอร์ม')
      .setRequired(true)
      .addChoices(...platformChoices),
  )
  .addStringOption((o) =>
    o.setName('creator').setDescription('URL หรือชื่อ/ID').setRequired(true).setMaxLength(500),
  );

async function unsubscribeExec(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild() || !interaction.guildId) {
    await interaction.reply({ content: 'ใช้ได้เฉพาะในเซิร์ฟเวอร์', ephemeral: true });
    return;
  }
  const platform = interaction.options.getString('platform', true) as StreamPlatform;
  const creatorInput = interaction.options.getString('creator', true);

  const normalized = platform === 'facebook' ? creatorInput.trim() : normalizeInput(platform, creatorInput);
  if (!normalized) {
    await interaction.reply({ content: '❌ อ่านค่า creator ไม่ออก', ephemeral: true });
    return;
  }

  // Try exact match on creatorId first; fall back to case-insensitive
  const res = await StreamSubscription.deleteOne({
    guildId: interaction.guildId,
    platform,
    creatorId: { $regex: `^${escapeRegex(normalized)}$`, $options: 'i' },
  });

  if (!res.deletedCount) {
    await interaction.reply({ content: '❌ ไม่พบการติดตามนี้', ephemeral: true });
    return;
  }
  await interaction.reply({ content: '🗑️ ลบการติดตามแล้ว', ephemeral: true });
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const unsubscribeCommand: SlashCommand = {
  data: unsubscribeData,
  execute: unsubscribeExec,
};

// ---------- /list-subscriptions ----------
const listData = new SlashCommandBuilder()
  .setName('list-subscriptions')
  .setDescription('ดูรายการ creator ที่ติดตามอยู่ในเซิร์ฟนี้')
  .setDMPermission(false);

async function listExec(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild() || !interaction.guildId) {
    await interaction.reply({ content: 'ใช้ได้เฉพาะในเซิร์ฟเวอร์', ephemeral: true });
    return;
  }
  const subs = await StreamSubscription.find({ guildId: interaction.guildId })
    .sort({ platform: 1, creatorName: 1 })
    .lean();
  if (subs.length === 0) {
    await interaction.reply({ content: 'ยังไม่มีการติดตามในเซิร์ฟนี้', ephemeral: true });
    return;
  }

  const byPlatform = new Map<StreamPlatform, typeof subs>();
  for (const s of subs) {
    if (!byPlatform.has(s.platform)) byPlatform.set(s.platform, []);
    byPlatform.get(s.platform)!.push(s);
  }

  const embed = new EmbedBuilder()
    .setTitle('🔔 Stream Subscriptions')
    .setColor(0xe07820);
  for (const [platform, list] of byPlatform) {
    embed.addFields({
      name: `${platform} (${list.length})`,
      value: list
        .map((s) => `• **${s.creatorName || s.creatorId}** → <#${s.discordChannelId}>`)
        .join('\n')
        .slice(0, 1024),
    });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

export const listSubsCommand: SlashCommand = { data: listData, execute: listExec };

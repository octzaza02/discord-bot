import {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { StreamSubscription, isFeatureEnabled } from '@discord-bot/shared';
import type { SlashCommand } from '../../core/types.js';
import { youtube } from './checkers/index.js';
import { parseYouTubeInput } from './parser.js';

// ---------- /subscribe ----------
const subscribeData = new SlashCommandBuilder()
  .setName('subscribe')
  .setDescription('เพิ่มการติดตาม YouTube channel')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addStringOption((o) =>
    o
      .setName('channel')
      .setDescription('URL หรือ Channel ID หรือ @handle ของ YouTube')
      .setRequired(true)
      .setMaxLength(500),
  )
  .addChannelOption((o) =>
    o
      .setName('notify_in')
      .setDescription('ห้อง Discord ที่จะแจ้งเตือน')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(true),
  )
  .addRoleOption((o) =>
    o
      .setName('ping_role')
      .setDescription('role ที่จะแท็กตอนแจ้งเตือน (optional)')
      .setRequired(false),
  )
  .addStringOption((o) =>
    o
      .setName('ping')
      .setDescription('แท็กพิเศษ (ถ้าเลือก ping_role จะถูก override)')
      .setRequired(false)
      .addChoices(
        { name: 'ไม่แท็ก', value: 'none' },
        { name: '@everyone', value: 'everyone' },
        { name: '@here', value: 'here' },
      ),
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

  const input = interaction.options.getString('channel', true);
  const notifyChannel = interaction.options.getChannel('notify_in', true);
  const pingRole = interaction.options.getRole('ping_role');
  const pingChoice = interaction.options.getString('ping');

  let pingType: 'none' | 'role' | 'everyone' | 'here' = 'none';
  let pingRoleId: string | null = null;
  if (pingRole) {
    pingType = 'role';
    pingRoleId = pingRole.id;
  } else if (pingChoice === 'everyone' || pingChoice === 'here') {
    pingType = pingChoice;
  }

  await interaction.deferReply({ ephemeral: true });

  const parsed = parseYouTubeInput(input);
  if (!parsed) {
    await interaction.editReply({
      content: '❌ อ่านค่า channel ไม่ออก — ลองใส่ URL หรือ Channel ID (UCxxx) หรือ @handle',
    });
    return;
  }

  const info = await youtube.validate(parsed.channelIdOrHandle).catch((err) => {
    console.error('[streamalert validate]', err);
    return null;
  });
  if (!info) {
    await interaction.editReply({
      content: '❌ หา YouTube channel นี้ไม่เจอ — ตรวจ URL/ID/handle อีกครั้ง',
    });
    return;
  }

  try {
    await StreamSubscription.create({
      guildId: interaction.guildId,
      discordChannelId: notifyChannel.id,
      platform: 'youtube',
      creatorId: info.creatorId,
      creatorName: info.name,
      pingType,
      pingRoleId,
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

  const pingSuffix =
    pingType === 'role' && pingRoleId
      ? ` · ping <@&${pingRoleId}>`
      : pingType === 'everyone'
        ? ' · ping @everyone'
        : pingType === 'here'
          ? ' · ping @here'
          : '';
  await interaction.editReply({
    content: `✅ ติดตาม **${info.name}** แจ้งเตือนที่ <#${notifyChannel.id}>${pingSuffix}`,
    allowedMentions: { parse: [] },
  });
}

export const subscribeCommand: SlashCommand = { data: subscribeData, execute: subscribeExec };

// ---------- /unsubscribe ----------
const unsubscribeData = new SlashCommandBuilder()
  .setName('unsubscribe')
  .setDescription('ลบการติดตาม YouTube channel')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addStringOption((o) =>
    o
      .setName('channel')
      .setDescription('URL หรือ Channel ID หรือ @handle')
      .setRequired(true)
      .setMaxLength(500),
  );

async function unsubscribeExec(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild() || !interaction.guildId) {
    await interaction.reply({ content: 'ใช้ได้เฉพาะในเซิร์ฟเวอร์', ephemeral: true });
    return;
  }
  const input = interaction.options.getString('channel', true);
  const parsed = parseYouTubeInput(input);
  if (!parsed) {
    await interaction.reply({ content: '❌ อ่านค่า channel ไม่ออก', ephemeral: true });
    return;
  }

  // Try to resolve to channel ID first for exact match
  let normalized = parsed.channelIdOrHandle;
  if (!/^UC[\w-]{22}$/.test(normalized)) {
    const info = await youtube.validate(normalized).catch(() => null);
    if (info) normalized = info.creatorId;
  }

  const res = await StreamSubscription.deleteOne({
    guildId: interaction.guildId,
    platform: 'youtube',
    creatorId: normalized,
  });

  if (!res.deletedCount) {
    await interaction.reply({ content: '❌ ไม่พบการติดตามนี้', ephemeral: true });
    return;
  }
  await interaction.reply({ content: '🗑️ ลบการติดตามแล้ว', ephemeral: true });
}

export const unsubscribeCommand: SlashCommand = {
  data: unsubscribeData,
  execute: unsubscribeExec,
};

// ---------- /list-subscriptions ----------
const listData = new SlashCommandBuilder()
  .setName('list-subscriptions')
  .setDescription('ดูรายการ YouTube channel ที่ติดตามอยู่ในเซิร์ฟนี้')
  .setDMPermission(false);

async function listExec(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild() || !interaction.guildId) {
    await interaction.reply({ content: 'ใช้ได้เฉพาะในเซิร์ฟเวอร์', ephemeral: true });
    return;
  }
  const subs = await StreamSubscription.find({ guildId: interaction.guildId })
    .sort({ creatorName: 1 })
    .lean();
  if (subs.length === 0) {
    await interaction.reply({ content: 'ยังไม่มีการติดตามในเซิร์ฟนี้', ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🔔 YouTube Subscriptions')
    .setColor(0xff0000)
    .setDescription(
      subs
        .map((s) => {
          const ping =
            s.pingType === 'role' && s.pingRoleId
              ? ` · <@&${s.pingRoleId}>`
              : s.pingType === 'everyone'
                ? ' · @everyone'
                : s.pingType === 'here'
                  ? ' · @here'
                  : '';
          return `• **${s.creatorName || s.creatorId}** → <#${s.discordChannelId}>${ping}`;
        })
        .join('\n')
        .slice(0, 4000),
    );

  await interaction.reply({ embeds: [embed], ephemeral: true, allowedMentions: { parse: [] } });
}

export const listSubsCommand: SlashCommand = { data: listData, execute: listExec };

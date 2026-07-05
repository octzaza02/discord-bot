import {
  EmbedBuilder,
  GuildMember,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type GuildTextBasedChannel,
} from 'discord.js';
import { isFeatureEnabled } from '@discord-bot/shared';
import type { SlashCommand } from '../../core/types.js';
import {
  connectToChannel,
  formatDuration,
  getState,
  peekState,
  playNext,
  resolveSong,
} from './state.js';
import {
  cycleLoop,
  pause,
  resume,
  skip,
  stop,
  MusicError,
} from './controller.js';

const LOOP_LABEL: Record<string, string> = {
  off: '🔁 ปิด loop',
  single: '🔂 loop เพลงเดียว',
  queue: '🔁 loop ทั้งคิว',
};

// ---------- /play ----------
const playData = new SlashCommandBuilder()
  .setName('play')
  .setDescription('ใส่เพลงเข้าคิว (URL หรือชื่อเพลง)')
  .setDMPermission(false)
  .addStringOption((o) =>
    o
      .setName('query')
      .setDescription('URL YouTube หรือชื่อเพลงที่จะค้นหา')
      .setRequired(true)
      .setMaxLength(500),
  );

async function playExec(interaction: ChatInputCommandInteraction) {
  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.reply({ content: '❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์', ephemeral: true });
    return;
  }
  if (!(await isFeatureEnabled(interaction.guildId, 'music'))) {
    await interaction.reply({
      content: '⚠️ ระบบ Music ถูกปิด — เปิดที่ dashboard ก่อน',
      ephemeral: true,
    });
    return;
  }

  const member = interaction.member as GuildMember;
  const userChannel = member.voice?.channel;
  if (!userChannel) {
    await interaction.reply({ content: '❌ คุณต้องอยู่ใน voice channel ก่อน', ephemeral: true });
    return;
  }

  const existing = peekState(interaction.guildId);
  if (
    existing?.connection &&
    existing.voiceChannelId &&
    existing.voiceChannelId !== userChannel.id
  ) {
    await interaction.reply({ content: '❌ Bot อยู่คนละ channel กับคุณ', ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const query = interaction.options.getString('query', true);
  let song;
  try {
    song = await resolveSong(query, member.displayName);
  } catch (err) {
    await interaction.editReply(`❌ โหลดเพลงไม่สำเร็จ: ${(err as Error).message}`);
    return;
  }

  try {
    await connectToChannel(interaction.guild, userChannel.id);
  } catch (err) {
    await interaction.editReply(`❌ ${(err as Error).message}`);
    return;
  }

  const state = getState(interaction.guildId);
  state.announceChannel = interaction.channel as GuildTextBasedChannel;
  state.queue.push(song);

  const idle = state.player.state.status === 'idle';
  if (idle && !state.current) {
    await interaction.editReply(`✅ เริ่มเล่น: **${song.title}**`);
    await playNext(interaction.guildId);
  } else {
    await interaction.editReply(
      `➕ เข้าคิว: **${song.title}** (คิวมี ${state.queue.length} เพลง)`,
    );
  }
}

// ---------- /queue ----------
const queueData = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('แสดงคิวปัจจุบัน + เพลงที่เล่นอยู่')
  .setDMPermission(false);

async function queueExec(interaction: ChatInputCommandInteraction) {
  const state = peekState(interaction.guildId!);
  if (!state || (!state.current && state.queue.length === 0)) {
    await interaction.reply({ content: 'คิวว่าง', ephemeral: true });
    return;
  }
  const lines: string[] = [];
  if (state.current) {
    lines.push(
      `🎵 **กำลังเล่น:** ${state.current.title} — ${formatDuration(state.current.duration)}`,
    );
  }
  if (state.queue.length) {
    lines.push('\n**คิวถัดไป:**');
    state.queue.slice(0, 15).forEach((s, i) => {
      lines.push(`\`${i + 1}.\` ${s.title} — ${formatDuration(s.duration)}`);
    });
    if (state.queue.length > 15) {
      lines.push(`... และอีก ${state.queue.length - 15} เพลง`);
    }
  }
  lines.push(`\nLoop mode: \`${state.loopMode}\``);
  await interaction.reply(lines.join('\n'));
}

// ---------- action commands ----------
function actionCommand(
  name: string,
  description: string,
  fn: (guildId: string) => void,
  successMsg: string,
): SlashCommand {
  const data = new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .setDMPermission(false);
  return {
    data,
    execute: async (interaction) => {
      try {
        fn(interaction.guildId!);
      } catch (err) {
        if (err instanceof MusicError) {
          await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          return;
        }
        throw err;
      }
      await interaction.reply(successMsg);
    },
  };
}

// ---------- /nowplaying ----------
const nowPlayingData = new SlashCommandBuilder()
  .setName('nowplaying')
  .setDescription('เพลงที่เล่นอยู่ตอนนี้')
  .setDMPermission(false);

async function nowPlayingExec(interaction: ChatInputCommandInteraction) {
  const state = peekState(interaction.guildId!);
  if (!state || !state.current) {
    await interaction.reply({ content: '❌ ไม่มีเพลงเล่นอยู่', ephemeral: true });
    return;
  }
  const s = state.current;
  const embed = new EmbedBuilder()
    .setTitle('🎵 กำลังเล่น')
    .setDescription(`[${s.title}](${s.url})`)
    .setColor(0xe07820)
    .addFields(
      { name: 'ระยะเวลา', value: formatDuration(s.duration), inline: true },
      { name: 'ขอโดย', value: s.requester, inline: true },
      { name: 'Loop', value: state.loopMode, inline: true },
    );
  await interaction.reply({ embeds: [embed] });
}

// ---------- /loop ----------
const loopData = new SlashCommandBuilder()
  .setName('loop')
  .setDescription('สลับโหมด loop: off → single → queue → off')
  .setDMPermission(false);

async function loopExec(interaction: ChatInputCommandInteraction) {
  const mode = cycleLoop(interaction.guildId!);
  await interaction.reply(LOOP_LABEL[mode]);
}

export const playCommand: SlashCommand = { data: playData, execute: playExec };
export const queueCommand: SlashCommand = { data: queueData, execute: queueExec };
export const skipCommand = actionCommand('skip', 'ข้ามเพลงปัจจุบัน', skip, '⏭️ ข้าม');
export const pauseCommand = actionCommand('pause', 'หยุดชั่วคราว', pause, '⏸️ หยุดชั่วคราว');
export const resumeCommand = actionCommand('resume', 'เล่นต่อ', resume, '▶️ เล่นต่อ');
export const stopCommand = actionCommand(
  'stop',
  'หยุด + ล้างคิว + ออกจาก voice channel',
  stop,
  '⏹️ หยุด + ล้างคิว + ออกจาก voice',
);
export const nowPlayingCommand: SlashCommand = {
  data: nowPlayingData,
  execute: nowPlayingExec,
};
export const loopCommand: SlashCommand = { data: loopData, execute: loopExec };

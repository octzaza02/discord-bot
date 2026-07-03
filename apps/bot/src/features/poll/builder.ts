import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type BaseMessageOptions,
} from 'discord.js';
import { tallyVotes, type PollDoc } from '@discord-bot/shared';

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

function bar(pct: number, width = 12): string {
  const filled = Math.round((pct / 100) * width);
  return '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, width - filled));
}

export function buildPollMessage(poll: PollDoc): BaseMessageOptions {
  const counts = tallyVotes(poll);
  const total = counts.reduce((a, b) => a + b, 0);
  const lines = poll.options.map((opt, i) => {
    const c = counts[i] ?? 0;
    const pct = total === 0 ? 0 : (c / total) * 100;
    return `${NUMBER_EMOJIS[i]} **${opt}**\n\`${bar(pct)}\` ${c} • ${pct.toFixed(0)}%`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${poll.question}`)
    .setDescription(lines.join('\n\n'))
    .setColor(poll.closed ? 0x808080 : 0xe07820)
    .setFooter({
      text: [
        `รวม ${total} เสียง`,
        poll.allowMulti ? 'เลือกได้หลายข้อ' : 'เลือกได้ 1 ข้อ',
        poll.closed
          ? '🔒 ปิดโหวตแล้ว'
          : poll.endsAt
            ? `จะปิดเวลา <t:${Math.floor(poll.endsAt.getTime() / 1000)}:R>`
            : 'ไม่มีเวลาสิ้นสุด',
      ].join(' • '),
    });

  const pollId = String(poll._id);
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < poll.options.length; i += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    poll.options.slice(i, i + 5).forEach((opt, j) => {
      const idx = i + j;
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`poll:${pollId}:${idx}`)
          .setLabel(opt.slice(0, 60))
          .setEmoji(NUMBER_EMOJIS[idx])
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(poll.closed),
      );
    });
    rows.push(row);
  }

  return { embeds: [embed], components: rows };
}

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type BaseMessageOptions,
} from 'discord.js';
import type { RolePanelDoc } from '@discord-bot/shared';

const STYLE_MAP: Record<string, ButtonStyle> = {
  Primary: ButtonStyle.Primary,
  Secondary: ButtonStyle.Secondary,
  Success: ButtonStyle.Success,
  Danger: ButtonStyle.Danger,
};

export function buildPanelMessage(panel: RolePanelDoc & { _id: unknown }): BaseMessageOptions {
  const embed = new EmbedBuilder().setTitle(panel.title);
  if (panel.description) embed.setDescription(panel.description);
  embed.setColor(0x5865f2);

  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  const panelId = String(panel._id);
  for (let i = 0; i < panel.roles.length; i += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (const r of panel.roles.slice(i, i + 5)) {
      const btn = new ButtonBuilder()
        .setCustomId(`rolepanel:${panelId}:${r.roleId}`)
        .setLabel(r.label)
        .setStyle(STYLE_MAP[r.style] ?? ButtonStyle.Secondary);
      if (r.emoji) {
        try { btn.setEmoji(r.emoji); } catch { /* invalid emoji, skip */ }
      }
      row.addComponents(btn);
    }
    rows.push(row);
  }
  return { embeds: [embed], components: rows };
}

import { Events, type Guild } from 'discord.js';
import { isFeatureEnabled } from '@discord-bot/shared';
import { config } from '../../config.js';
import type { EventHandler } from '../../core/types.js';

async function onGuildJoin(_client: unknown, guild: Guild) {
  if (!config.dashboardUrl) return;
  if (!(await isFeatureEnabled(guild.id, 'dashboardDm'))) return;
  const owner = await guild.fetchOwner().catch(() => null);
  if (!owner) return;

  const base = config.dashboardUrl.replace(/\/$/, '');
  const link = `${base}/servers/${guild.id}/welcome`;

  await owner
    .send({
      content:
        `👋 ขอบคุณที่เชิญบอทเข้า **${guild.name}**!\n\n` +
        `🔧 ตั้งค่าข้อความต้อนรับและปุ่มรับยศได้ที่:\n${link}\n\n` +
        `หรือใช้คำสั่ง \`/dashboard\` ในเซิร์ฟเวอร์เพื่อรับลิงก์นี้อีกครั้ง`,
    })
    .catch(() => {
      // owner DMs closed — silently ignore
    });
}

export const dashboardJoinEvent: EventHandler<Events.GuildCreate> = {
  event: Events.GuildCreate,
  run: onGuildJoin,
};

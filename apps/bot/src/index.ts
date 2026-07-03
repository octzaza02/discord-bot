import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Events } from 'discord.js';
import { connectMongo, BotGuild } from '@discord-bot/shared';
import { config } from './config.js';
import { createClient } from './bot.js';
import { loadFeatures, wireFeatures } from './core/loader.js';
import { startInternalApi } from './internal/server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const featuresDir = path.resolve(__dirname, './features');

async function main() {
  await connectMongo(config.mongoUri);
  console.log('[db] connected');

  const client = createClient();
  const features = await loadFeatures(featuresDir);
  const commands = wireFeatures(client, features);

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const cmd = commands.get(interaction.commandName);
    if (!cmd) return;
    try {
      await cmd.execute(interaction);
    } catch (err) {
      console.error(`[cmd ${interaction.commandName}]`, err);
      const msg = 'เกิดข้อผิดพลาดในการรันคำสั่ง';
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: msg, ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
      }
    }
  });

  // Track guild membership for the dashboard
  client.on(Events.GuildCreate, async (guild) => {
    await BotGuild.findOneAndUpdate(
      { guildId: guild.id },
      { $set: { name: guild.name, icon: guild.icon } },
      { upsert: true },
    );
  });
  client.on(Events.GuildDelete, async (guild) => {
    await BotGuild.deleteOne({ guildId: guild.id });
  });

  client.once(Events.ClientReady, async (c) => {
    console.log(`[bot] logged in as ${c.user.tag}`);
    // Sync current guild list on startup
    const guilds = c.guilds.cache.map((g) => ({
      updateOne: {
        filter: { guildId: g.id },
        update: { $set: { name: g.name, icon: g.icon } },
        upsert: true,
      },
    }));
    if (guilds.length) await BotGuild.bulkWrite(guilds);
  });

  startInternalApi(client);

  await client.login(config.token);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

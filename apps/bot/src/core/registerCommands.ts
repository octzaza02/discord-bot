import { REST, Routes } from 'discord.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { loadFeatures } from './loader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const featuresDir = path.resolve(__dirname, '../features');

async function main() {
  const features = await loadFeatures(featuresDir);
  const body = features.flatMap((f) => (f.commands ?? []).map((c) => c.data.toJSON()));
  const rest = new REST({ version: '10' }).setToken(config.token);
  console.log(`Registering ${body.length} global slash commands...`);
  await rest.put(Routes.applicationCommands(config.clientId), { body });
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

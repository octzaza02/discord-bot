import { readdir, stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import type { Feature, SlashCommand } from './types.js';
import type { Client } from 'discord.js';

export async function loadFeatures(featuresDir: string): Promise<Feature[]> {
  const entries = await readdir(featuresDir);
  const features: Feature[] = [];
  for (const entry of entries) {
    const dir = path.join(featuresDir, entry);
    const s = await stat(dir).catch(() => null);
    if (!s?.isDirectory()) continue;
    // try index.js (built) or index.ts (dev via tsx)
    const candidates = ['index.js', 'index.ts'];
    for (const file of candidates) {
      const full = path.join(dir, file);
      const st = await stat(full).catch(() => null);
      if (!st?.isFile()) continue;
      const mod = await import(pathToFileURL(full).href);
      const feature: Feature | undefined = mod.feature ?? mod.default;
      if (feature?.name) {
        features.push(feature);
        console.log(`[loader] loaded feature: ${feature.name}`);
      }
      break;
    }
  }
  return features;
}

export function wireFeatures(client: Client, features: Feature[]): Map<string, SlashCommand> {
  const commandMap = new Map<string, SlashCommand>();
  for (const f of features) {
    for (const cmd of f.commands ?? []) {
      commandMap.set(cmd.data.name, cmd);
    }
    for (const ev of f.events ?? []) {
      const handler = (...args: unknown[]) =>
        Promise.resolve((ev.run as (...a: unknown[]) => unknown)(client, ...args)).catch((err) =>
          console.error(`[event ${ev.event}]`, err),
        );
      if (ev.once) client.once(ev.event, handler);
      else client.on(ev.event, handler);
    }
  }
  return commandMap;
}

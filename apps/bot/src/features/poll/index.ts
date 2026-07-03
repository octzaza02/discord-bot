import { Events, type Client } from 'discord.js';
import type { Feature, EventHandler } from '../../core/types.js';
import { pollCommand } from './commands.js';
import { pollEvent } from './handler.js';
import { startPollScheduler } from './scheduler.js';

const schedulerBoot: EventHandler<Events.ClientReady> = {
  event: Events.ClientReady,
  once: true,
  run: async (_client: unknown, ready: Client<true>) => {
    startPollScheduler(ready);
  },
};

export const feature: Feature = {
  name: 'poll',
  commands: [pollCommand],
  events: [pollEvent, schedulerBoot],
};
export default feature;

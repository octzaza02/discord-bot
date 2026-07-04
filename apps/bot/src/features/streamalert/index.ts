import { Events, type Client } from 'discord.js';
import type { Feature, EventHandler } from '../../core/types.js';
import { listSubsCommand, subscribeCommand, unsubscribeCommand } from './commands.js';
import { startStreamScheduler } from './scheduler.js';

const boot: EventHandler<Events.ClientReady> = {
  event: Events.ClientReady,
  once: true,
  run: async (_client: unknown, ready: Client<true>) => {
    startStreamScheduler(ready);
  },
};

export const feature: Feature = {
  name: 'streamalert',
  commands: [subscribeCommand, unsubscribeCommand, listSubsCommand],
  events: [boot],
};
export default feature;

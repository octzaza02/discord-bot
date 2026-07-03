import type { Feature } from '../../core/types.js';
import { welcomeCommand } from './commands.js';
import { welcomeEvent } from './handler.js';

export const feature: Feature = {
  name: 'welcome',
  commands: [welcomeCommand],
  events: [welcomeEvent],
};
export default feature;

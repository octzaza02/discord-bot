import type { Feature } from '../../core/types.js';
import { leaderboardCommand, rankCommand } from './commands.js';
import { levelingEvent } from './handler.js';

export const feature: Feature = {
  name: 'leveling',
  commands: [leaderboardCommand, rankCommand],
  events: [levelingEvent],
};
export default feature;

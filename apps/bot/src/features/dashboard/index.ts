import type { Feature } from '../../core/types.js';
import { dashboardCommand } from './commands.js';
import { dashboardJoinEvent } from './handler.js';

export const feature: Feature = {
  name: 'dashboard',
  commands: [dashboardCommand],
  events: [dashboardJoinEvent],
};
export default feature;

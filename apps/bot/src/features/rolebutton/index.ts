import type { Feature } from '../../core/types.js';
import { rolePanelCommand } from './commands.js';
import { roleButtonEvent } from './handler.js';

export const feature: Feature = {
  name: 'rolebutton',
  commands: [rolePanelCommand],
  events: [roleButtonEvent],
};
export default feature;

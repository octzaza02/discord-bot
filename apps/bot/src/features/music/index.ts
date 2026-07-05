import type { Feature } from '../../core/types.js';
import {
  loopCommand,
  nowPlayingCommand,
  pauseCommand,
  playCommand,
  queueCommand,
  resumeCommand,
  skipCommand,
  stopCommand,
} from './commands.js';

export const feature: Feature = {
  name: 'music',
  commands: [
    playCommand,
    queueCommand,
    skipCommand,
    pauseCommand,
    resumeCommand,
    stopCommand,
    nowPlayingCommand,
    loopCommand,
  ],
};
export default feature;

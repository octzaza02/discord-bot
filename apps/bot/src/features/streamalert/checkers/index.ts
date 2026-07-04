import type { StreamPlatform } from '@discord-bot/shared';
import type { CreatorChecker } from '../types.js';
import { youtubeChecker } from './youtube.js';
import { twitchChecker } from './twitch.js';
import { tiktokChecker } from './tiktok.js';
import { facebookChecker } from './facebook.js';

const map: Record<StreamPlatform, CreatorChecker> = {
  youtube: youtubeChecker,
  twitch: twitchChecker,
  tiktok: tiktokChecker,
  facebook: facebookChecker,
};

export function getChecker(platform: StreamPlatform): CreatorChecker {
  return map[platform];
}

export function allCheckers(): CreatorChecker[] {
  return Object.values(map);
}

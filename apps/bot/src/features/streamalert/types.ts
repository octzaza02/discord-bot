import type { StreamPlatform } from '@discord-bot/shared';

export interface CreatorInfo {
  creatorId: string;
  name: string;
  avatarUrl?: string | null;
}

export type StreamEventKind = 'video' | 'live';

export interface StreamEvent {
  kind: StreamEventKind;
  id: string;
  title: string;
  url: string;
  thumbnail?: string | null;
  publishedAt?: Date | null;
  channelName: string;
  channelUrl?: string | null;
}

export interface CheckResult {
  events: StreamEvent[];
  liveId: string | null;
  latestVideoId: string | null;
}

export interface CreatorChecker {
  platform: StreamPlatform;
  isEnabled(): boolean;
  reason(): string; // human-readable reason when disabled
  validate(input: string): Promise<CreatorInfo | null>;
  check(creatorId: string): Promise<CheckResult>;
}

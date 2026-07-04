import type { StreamPlatform } from '@discord-bot/shared';

export interface CreatorInfo {
  creatorId: string;
  name: string;
  avatarUrl?: string | null;
}

export interface StreamEvent {
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
  latestVideoId: string | null;
}

export interface CreatorChecker {
  platform: StreamPlatform;
  validate(input: string): Promise<CreatorInfo | null>;
  check(creatorId: string, prevVideoId: string | null): Promise<CheckResult>;
}

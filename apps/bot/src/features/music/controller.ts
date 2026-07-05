import { AudioPlayerStatus } from '@discordjs/voice';
import type { Client } from 'discord.js';
import {
  formatDuration,
  getState,
  peekState,
  playNext,
  resolveSong,
  cleanup,
  type LoopMode,
  type Song,
} from './state.js';

export class MusicError extends Error {}

const LOOP_ORDER: Record<LoopMode, LoopMode> = {
  off: 'single',
  single: 'queue',
  queue: 'off',
};

function songJson(s: Song | null) {
  if (!s) return null;
  return {
    title: s.title,
    duration: s.duration,
    webpage_url: s.url,
    requester: s.requester,
  };
}

export function statusPayload(client: Client, guildId: string) {
  const state = peekState(guildId);
  if (!state || !state.connection) {
    return {
      connected: false,
      playing: false,
      paused: false,
      channel: null,
      loop_mode: state?.loopMode ?? 'off',
      current: null,
      queue: [],
    };
  }
  const status = state.player.state.status;
  const channel = state.voiceChannelId
    ? client.channels.cache.get(state.voiceChannelId)
    : null;
  const channelName =
    channel && 'name' in channel ? (channel as { name: string }).name : null;
  return {
    connected: true,
    playing: status === AudioPlayerStatus.Playing,
    paused:
      status === AudioPlayerStatus.Paused || status === AudioPlayerStatus.AutoPaused,
    channel: channelName,
    loop_mode: state.loopMode,
    current: songJson(state.current),
    queue: state.queue.map(songJson),
  };
}

export function skip(guildId: string): void {
  const state = peekState(guildId);
  if (!state || state.player.state.status !== AudioPlayerStatus.Playing) {
    throw new MusicError('ไม่มีเพลงเล่นอยู่');
  }
  state.player.stop(); // → Idle → playNext เพลงถัดไป
}

export function pause(guildId: string): void {
  const state = peekState(guildId);
  if (!state || state.player.state.status !== AudioPlayerStatus.Playing) {
    throw new MusicError('ไม่มีเพลงเล่นอยู่');
  }
  state.player.pause();
}

export function resume(guildId: string): void {
  const state = peekState(guildId);
  const status = state?.player.state.status;
  if (
    !state ||
    (status !== AudioPlayerStatus.Paused && status !== AudioPlayerStatus.AutoPaused)
  ) {
    throw new MusicError('ไม่ได้หยุดชั่วคราวอยู่');
  }
  state.player.unpause();
}

export function stop(guildId: string): void {
  cleanup(guildId);
}

export function cycleLoop(guildId: string): LoopMode {
  const state = getState(guildId);
  state.loopMode = LOOP_ORDER[state.loopMode];
  return state.loopMode;
}

// ใช้จาก dashboard — ใส่คิวได้เฉพาะตอน bot อยู่ใน voice แล้ว
export async function enqueueFromDashboard(
  guildId: string,
  query: string,
): Promise<{ title: string; queueLen: number }> {
  const state = peekState(guildId);
  if (!state || !state.connection) {
    throw new MusicError('บอทยังไม่อยู่ใน voice channel — ใช้ /play ใน Discord ก่อน');
  }
  const song = await resolveSong(query, 'dashboard');
  state.queue.push(song);
  const status = state.player.state.status;
  if (status === AudioPlayerStatus.Idle && !state.current) {
    await playNext(guildId);
  }
  return { title: song.title, queueLen: state.queue.length };
}

export { formatDuration };

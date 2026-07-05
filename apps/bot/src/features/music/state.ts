import { spawn, type ChildProcess } from 'node:child_process';
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  NoSubscriberBehavior,
  StreamType,
  VoiceConnectionStatus,
  type AudioPlayer,
  type VoiceConnection,
} from '@discordjs/voice';
import type { Guild, GuildTextBasedChannel } from 'discord.js';

// ใช้ yt-dlp ทำทั้ง metadata + stream — pure-JS libs (play-dl/ytdl-core/youtube-sr)
// พังกับ YouTube ปัจจุบัน โดยเฉพาะจาก datacenter IP (consent-wall/decipher)

// binary paths — Railway (Docker alpine) มี yt-dlp/ffmpeg บน PATH จาก apk
// local dev ตั้ง env override ได้
const YTDLP_PATH = process.env.YTDLP_PATH || 'yt-dlp';
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';

export type LoopMode = 'off' | 'single' | 'queue';

export interface Song {
  title: string;
  url: string;
  duration: number; // วินาที
  requester: string;
}

export interface GuildMusicState {
  queue: Song[];
  current: Song | null;
  loopMode: LoopMode;
  connection: VoiceConnection | null;
  player: AudioPlayer;
  voiceChannelId: string | null;
  announceChannel: GuildTextBasedChannel | null;
  procs: ChildProcess[]; // yt-dlp/ffmpeg ของเพลงที่เล่นอยู่ — ต้อง kill ตอนข้าม/หยุด
}

const states = new Map<string, GuildMusicState>();

export function getState(guildId: string): GuildMusicState {
  let state = states.get(guildId);
  if (!state) {
    const player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Play },
    });
    state = {
      queue: [],
      current: null,
      loopMode: 'off',
      connection: null,
      player,
      voiceChannelId: null,
      announceChannel: null,
      procs: [],
    };
    player.on(AudioPlayerStatus.Idle, () => {
      void playNext(guildId);
    });
    player.on('error', (err) => {
      console.error(`[music] player error guild=${guildId}:`, err.message);
      void playNext(guildId);
    });
    states.set(guildId, state);
  }
  return state;
}

export function peekState(guildId: string): GuildMusicState | undefined {
  return states.get(guildId);
}

function isYouTubeUrl(input: string): boolean {
  return /^https?:\/\/(www\.|music\.|m\.)?(youtube\.com|youtu\.be)\//.test(input);
}

interface YtdlpEntry {
  id?: string;
  title?: string;
  duration?: number; // วินาที
  webpage_url?: string;
  url?: string;
  entries?: YtdlpEntry[];
}

function runYtdlpJson(arg: string, extraArgs: string[]): Promise<YtdlpEntry> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      YTDLP_PATH,
      [arg, '--dump-single-json', '--flat-playlist', '--no-warnings', ...extraArgs],
      { stdio: ['ignore', 'pipe', 'ignore'] },
    );
    let out = '';
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('yt-dlp timeout'));
    }, 20_000);
    proc.stdout.on('data', (d) => (out += d));
    proc.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0 || !out.trim()) return reject(new Error('yt-dlp failed'));
      try {
        resolve(JSON.parse(out) as YtdlpEntry);
      } catch (e) {
        reject(e as Error);
      }
    });
  });
}

export async function resolveSong(query: string, requester: string): Promise<Song> {
  const input = query.trim();
  const isUrl = isYouTubeUrl(input);
  const arg = isUrl ? input : `ytsearch1:${input}`;
  const extra = isUrl ? ['--no-playlist'] : [];

  let json: YtdlpEntry;
  try {
    json = await runYtdlpJson(arg, extra);
  } catch (err) {
    console.error('[music] resolve failed:', (err as Error).message);
    throw new Error(isUrl ? 'เปิดวิดีโอนี้ไม่ได้' : 'ไม่พบเพลงจากคำค้นนี้');
  }

  const v = json.entries ? json.entries[0] : json;
  if (!v || !v.id) throw new Error('ไม่พบเพลงจากคำค้นนี้');
  return {
    title: v.title ?? 'Unknown',
    url: v.webpage_url ?? v.url ?? `https://www.youtube.com/watch?v=${v.id}`,
    duration: Math.floor(v.duration ?? 0),
    requester,
  };
}

export async function connectToChannel(
  guild: Guild,
  voiceChannelId: string,
): Promise<GuildMusicState> {
  const state = getState(guild.id);
  if (state.connection && state.voiceChannelId === voiceChannelId) return state;

  const connection = joinVoiceChannel({
    channelId: voiceChannelId,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
  });

  if (process.env.DEBUG_VOICE) {
    connection.on('stateChange', (o, n) =>
      console.log(`[voice] ${o.status} -> ${n.status}`),
    );
    connection.on('error', (e) => console.error('[voice] error:', e.message));
    connection.on('debug', (m) => console.log('[voice debug]', m));
  }

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
  } catch {
    connection.destroy();
    throw new Error('เข้า voice channel ไม่สำเร็จ (handshake timeout)');
  }

  connection.subscribe(state.player);
  connection.on(VoiceConnectionStatus.Disconnected, () => {
    cleanup(guild.id);
  });

  state.connection = connection;
  state.voiceChannelId = voiceChannelId;
  return state;
}

function killProcs(state: GuildMusicState): void {
  for (const p of state.procs.splice(0)) {
    try {
      p.kill('SIGKILL');
    } catch {
      // ignore
    }
  }
}

export async function playNext(guildId: string): Promise<void> {
  const state = states.get(guildId);
  if (!state || !state.connection) return;

  killProcs(state); // เคลียร์ yt-dlp/ffmpeg ของเพลงก่อนหน้า

  let song: Song;
  if (state.loopMode === 'single' && state.current) {
    song = state.current;
  } else {
    if (state.loopMode === 'queue' && state.current) {
      state.queue.push(state.current);
    }
    const next = state.queue.shift();
    if (!next) {
      state.current = null;
      return;
    }
    song = next;
    state.current = song;
  }

  // yt-dlp ดึง bestaudio → ffmpeg แปลงเป็น ogg/opus → discord เล่นตรง (ไม่ต้อง opus encoder)
  const ytdlp = spawn(
    YTDLP_PATH,
    ['-f', 'bestaudio/best', '-o', '-', '--quiet', '--no-warnings', song.url],
    { stdio: ['ignore', 'pipe', 'ignore'] },
  );
  const ffmpeg = spawn(
    FFMPEG_PATH,
    ['-i', 'pipe:0', '-vn', '-c:a', 'libopus', '-b:a', '128k', '-f', 'ogg', 'pipe:1'],
    { stdio: ['pipe', 'pipe', 'ignore'] },
  );
  state.procs.push(ytdlp, ffmpeg);
  ytdlp.on('error', (e) => console.error(`[music] yt-dlp spawn guild=${guildId}:`, e.message));
  ffmpeg.on('error', (e) => console.error(`[music] ffmpeg spawn guild=${guildId}:`, e.message));
  ytdlp.stdout.pipe(ffmpeg.stdin);
  // กัน EPIPE ตอน ffmpeg ปิดก่อน yt-dlp
  ytdlp.stdout.on('error', () => {});
  ffmpeg.stdin.on('error', () => {});

  const resource = createAudioResource(ffmpeg.stdout, { inputType: StreamType.OggOpus });
  state.player.play(resource);

  if (state.announceChannel) {
    state.announceChannel
      .send(`▶️ กำลังเล่น: **${song.title}** (${formatDuration(song.duration)})`)
      .catch(() => {});
  }
}

export function cleanup(guildId: string): void {
  const state = states.get(guildId);
  if (!state) return;
  state.queue = [];
  state.current = null;
  state.loopMode = 'off';
  state.voiceChannelId = null;
  killProcs(state);
  try {
    state.player.stop();
  } catch {
    // ignore
  }
  if (state.connection) {
    try {
      state.connection.destroy();
    } catch {
      // ignore
    }
    state.connection = null;
  }
}

export function formatDuration(seconds: number): string {
  if (!seconds) return '??:??';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

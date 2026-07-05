import asyncio
import os
from collections import deque
from dataclasses import dataclass, field
from typing import Optional

import discord
import yt_dlp
from discord import app_commands
from discord.ext import commands
from dotenv import load_dotenv

from internal_api import start_internal_api

load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")

# yt-dlp: noplaylist=True กัน user โยน URL playlist แล้ว bot โหลดยาว
# default_search=ytsearch ทำให้ใส่ "ชื่อเพลง" เฉยๆ ก็หาให้จาก YouTube
YTDL_OPTS = {
    "format": "bestaudio/best",
    "noplaylist": True,
    "quiet": True,
    "no_warnings": True,
    "default_search": "ytsearch",
    "source_address": "0.0.0.0",
    "extract_flat": False,
}

# reconnect flags กันสตรีมหลุดกลางคัน (YouTube CDN redirect บ่อย)
FFMPEG_OPTS = {
    "before_options": "-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5",
    "options": "-vn",
}

ytdl = yt_dlp.YoutubeDL(YTDL_OPTS)


@dataclass
class Song:
    title: str
    stream_url: str      # URL ที่ FFmpeg ต้องใช้ (ต่างจาก webpage_url)
    webpage_url: str
    duration: int
    requester: str


@dataclass
class GuildState:
    queue: deque = field(default_factory=deque)
    current: Optional[Song] = None
    loop_mode: str = "off"                          # off | single | queue
    voice: Optional[discord.VoiceClient] = None
    text_channel: Optional[discord.abc.Messageable] = None


# state แยกต่อ guild — key = guild.id
states: dict[int, GuildState] = {}


def get_state(guild_id: int) -> GuildState:
    if guild_id not in states:
        states[guild_id] = GuildState()
    return states[guild_id]


async def extract_song(query: str, requester: str) -> Song:
    # yt-dlp.extract_info เป็น blocking → ต้องรันใน executor
    # ไม่งั้น event loop ของ discord.py จะค้าง 3-10 วินาที
    loop = asyncio.get_running_loop()
    data = await loop.run_in_executor(
        None, lambda: ytdl.extract_info(query, download=False)
    )
    if "entries" in data:
        data = data["entries"][0]
    return Song(
        title=data.get("title", "Unknown"),
        stream_url=data["url"],
        webpage_url=data.get("webpage_url", ""),
        duration=data.get("duration") or 0,
        requester=requester,
    )


def format_duration(seconds: int) -> str:
    if not seconds:
        return "??:??"
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    return f"{h:d}:{m:02d}:{s:02d}" if h else f"{m:d}:{s:02d}"


class MusicBot(commands.Bot):
    async def setup_hook(self) -> None:
        # setup_hook รันครั้งเดียวก่อน login เสร็จ (ไม่เหมือน on_ready ที่ยิงซ้ำตอน reconnect)
        # เหมาะกับ start HTTP API ที่ต้อง bind port ครั้งเดียว
        await start_internal_api(
            self,
            get_state=get_state,
            extract_song=extract_song,
            play_next=play_next,
        )


intents = discord.Intents.default()
intents.voice_states = True
bot = MusicBot(command_prefix="!", intents=intents)


def _after_playback(guild_id: int, error: Optional[Exception]) -> None:
    # discord.py เรียก callback นี้ใน thread แยก → ต้อง run_coroutine_threadsafe
    # เพื่อกลับเข้า event loop หลักก่อนแตะ voice_client ต่อ
    if error:
        print(f"[player error] guild={guild_id}: {error}")
    asyncio.run_coroutine_threadsafe(play_next(guild_id), bot.loop)


async def play_next(guild_id: int) -> None:
    state = get_state(guild_id)
    if not state.voice or not state.voice.is_connected():
        return

    # single = เล่นเพลงเดิมซ้ำ, ไม่ต้อง pop จากคิว
    if state.loop_mode == "single" and state.current:
        song = state.current
    else:
        # queue = ต่อท้ายคิวก่อนหยิบเพลงถัดไป → วนทั้งคิว
        if state.loop_mode == "queue" and state.current:
            state.queue.append(state.current)
        if not state.queue:
            state.current = None
            return
        song = state.queue.popleft()
        state.current = song

    source = discord.FFmpegPCMAudio(song.stream_url, **FFMPEG_OPTS)
    state.voice.play(source, after=lambda e: _after_playback(guild_id, e))
    if state.text_channel:
        try:
            await state.text_channel.send(
                f"▶️ กำลังเล่น: **{song.title}** ({format_duration(song.duration)})"
            )
        except discord.HTTPException:
            pass


async def ensure_voice(interaction: discord.Interaction) -> Optional[discord.VoiceClient]:
    # ต้องเป็น Member (มี voice state) ไม่ใช่ User (DM/webhook)
    if (
        not isinstance(interaction.user, discord.Member)
        or not interaction.user.voice
        or not interaction.user.voice.channel
    ):
        await interaction.followup.send("❌ คุณต้องอยู่ใน voice channel ก่อน", ephemeral=True)
        return None

    user_channel = interaction.user.voice.channel
    state = get_state(interaction.guild_id)

    if state.voice and state.voice.is_connected():
        # bot join channel แล้ว — user ต้องอยู่ channel เดียวกัน
        if state.voice.channel.id != user_channel.id:
            await interaction.followup.send("❌ Bot อยู่คนละ channel กับคุณ", ephemeral=True)
            return None
        return state.voice

    voice = await user_channel.connect()
    state.voice = voice
    return voice


# ---------- /play ----------
@bot.tree.command(name="play", description="ใส่เพลงเข้าคิว (URL หรือชื่อเพลง)")
@app_commands.describe(query="URL YouTube/SoundCloud หรือชื่อเพลงที่จะค้นหา")
async def play_cmd(interaction: discord.Interaction, query: str):
    if not interaction.guild_id:
        await interaction.response.send_message("❌ ใช้ใน DM ไม่ได้", ephemeral=True)
        return

    # defer ก่อน — yt-dlp กินเวลา > 3 วินาที ทำให้ interaction timeout
    await interaction.response.defer()

    state = get_state(interaction.guild_id)
    state.text_channel = interaction.channel

    voice = await ensure_voice(interaction)
    if not voice:
        return

    try:
        song = await extract_song(query, interaction.user.display_name)
    except Exception as e:
        await interaction.followup.send(f"❌ โหลดเพลงไม่สำเร็จ: {e}", ephemeral=True)
        return

    state.queue.append(song)

    # ถ้าไม่มีอะไรกำลังเล่น → เริ่มเล่นเลย
    if not voice.is_playing() and not voice.is_paused() and state.current is None:
        await interaction.followup.send(f"✅ เริ่มเล่น: **{song.title}**")
        await play_next(interaction.guild_id)
    else:
        await interaction.followup.send(
            f"➕ เข้าคิว: **{song.title}** (คิวมี {len(state.queue)} เพลง)"
        )


# ---------- /queue ----------
@bot.tree.command(name="queue", description="แสดงคิวปัจจุบัน + เพลงที่เล่นอยู่")
async def queue_cmd(interaction: discord.Interaction):
    state = get_state(interaction.guild_id)
    if not state.current and not state.queue:
        await interaction.response.send_message("คิวว่าง", ephemeral=True)
        return

    lines: list[str] = []
    if state.current:
        lines.append(
            f"🎵 **กำลังเล่น:** {state.current.title} — {format_duration(state.current.duration)}"
        )
    if state.queue:
        lines.append("\n**คิวถัดไป:**")
        for i, s in enumerate(list(state.queue)[:15], 1):
            lines.append(f"`{i}.` {s.title} — {format_duration(s.duration)}")
        if len(state.queue) > 15:
            lines.append(f"... และอีก {len(state.queue) - 15} เพลง")
    lines.append(f"\nLoop mode: `{state.loop_mode}`")

    await interaction.response.send_message("\n".join(lines))


# ---------- /skip ----------
@bot.tree.command(name="skip", description="ข้ามเพลงปัจจุบัน")
async def skip_cmd(interaction: discord.Interaction):
    state = get_state(interaction.guild_id)
    if not state.voice or not state.voice.is_playing():
        await interaction.response.send_message("❌ ไม่มีเพลงเล่นอยู่", ephemeral=True)
        return
    # stop() จะ trigger after callback → play_next เพลงถัดไปเอง
    state.voice.stop()
    await interaction.response.send_message("⏭️ ข้าม")


# ---------- /pause ----------
@bot.tree.command(name="pause", description="หยุดชั่วคราว")
async def pause_cmd(interaction: discord.Interaction):
    state = get_state(interaction.guild_id)
    if not state.voice or not state.voice.is_playing():
        await interaction.response.send_message("❌ ไม่มีเพลงเล่นอยู่", ephemeral=True)
        return
    state.voice.pause()
    await interaction.response.send_message("⏸️ หยุดชั่วคราว")


# ---------- /resume ----------
@bot.tree.command(name="resume", description="เล่นต่อ")
async def resume_cmd(interaction: discord.Interaction):
    state = get_state(interaction.guild_id)
    if not state.voice or not state.voice.is_paused():
        await interaction.response.send_message("❌ ไม่ได้หยุดชั่วคราวอยู่", ephemeral=True)
        return
    state.voice.resume()
    await interaction.response.send_message("▶️ เล่นต่อ")


# ---------- /stop ----------
@bot.tree.command(name="stop", description="หยุด + ล้างคิว + ออกจาก voice channel")
async def stop_cmd(interaction: discord.Interaction):
    state = get_state(interaction.guild_id)
    state.queue.clear()
    state.current = None
    state.loop_mode = "off"
    if state.voice and state.voice.is_connected():
        # ต้อง stop ก่อน disconnect ไม่งั้น callback after จะยิงต่อ
        state.voice.stop()
        await state.voice.disconnect()
    state.voice = None
    await interaction.response.send_message("⏹️ หยุด + ล้างคิว + ออกจาก voice")


# ---------- /nowplaying ----------
@bot.tree.command(name="nowplaying", description="เพลงที่เล่นอยู่ตอนนี้")
async def nowplaying_cmd(interaction: discord.Interaction):
    state = get_state(interaction.guild_id)
    if not state.current:
        await interaction.response.send_message("❌ ไม่มีเพลงเล่นอยู่", ephemeral=True)
        return
    s = state.current
    embed = discord.Embed(
        title="🎵 กำลังเล่น",
        description=f"[{s.title}]({s.webpage_url})" if s.webpage_url else s.title,
        color=0xE07820,
    )
    embed.add_field(name="ระยะเวลา", value=format_duration(s.duration), inline=True)
    embed.add_field(name="ขอโดย", value=s.requester, inline=True)
    embed.add_field(name="Loop", value=state.loop_mode, inline=True)
    await interaction.response.send_message(embed=embed)


# ---------- /loop ----------
@bot.tree.command(name="loop", description="สลับโหมด loop: off → single → queue → off")
async def loop_cmd(interaction: discord.Interaction):
    state = get_state(interaction.guild_id)
    order = {"off": "single", "single": "queue", "queue": "off"}
    state.loop_mode = order[state.loop_mode]
    labels = {
        "off": "🔁 ปิด loop",
        "single": "🔂 loop เพลงเดียว",
        "queue": "🔁 loop ทั้งคิว",
    }
    await interaction.response.send_message(labels[state.loop_mode])


# ---------- events ----------
@bot.event
async def on_ready():
    print(f"Logged in as {bot.user} (id={bot.user.id})")
    # sync slash commands แบบ global — ครั้งแรก sync ใช้เวลา 1-60 นาทีถึงจะเห็นในทุก guild
    synced = await bot.tree.sync()
    print(f"Synced {len(synced)} slash commands (global)")


@bot.event
async def on_voice_state_update(
    member: discord.Member,
    before: discord.VoiceState,
    after: discord.VoiceState,
):
    # bot ถูก kick/move ออกจาก voice → เคลียร์ state กันค้าง
    if member.id == bot.user.id and before.channel and not after.channel:
        state = states.get(member.guild.id)
        if state:
            state.queue.clear()
            state.current = None
            state.voice = None


if __name__ == "__main__":
    if not TOKEN:
        raise RuntimeError("DISCORD_TOKEN ไม่ถูกตั้งใน .env")
    bot.run(TOKEN)

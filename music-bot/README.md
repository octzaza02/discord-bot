# Discord Music Bot (Python)

Discord bot เล่นเพลงจาก YouTube/SoundCloud ผ่าน slash commands รองรับคิวและ loop

## ฟีเจอร์

8 slash commands:
- `/play <query>` — ใส่เพลง (URL หรือชื่อ) เข้าคิว, เล่นเลยถ้าคิวว่าง
- `/queue` — ดูคิว + เพลงที่เล่นอยู่
- `/skip` — ข้ามเพลงปัจจุบัน
- `/pause` — หยุดชั่วคราว
- `/resume` — เล่นต่อ
- `/stop` — หยุด + ล้างคิว + ออกจาก voice channel
- `/nowplaying` — เพลงที่เล่นอยู่ตอนนี้
- `/loop` — สลับ off → single → queue → off

Loop modes:
- `off` — เล่นตามคิวปกติ
- `single` — วนเพลงปัจจุบันซ้ำ
- `queue` — เพลงจบแล้วเอาต่อท้ายคิว (loop ทั้งคิว)

## Requirements

- Python 3.10+
- FFmpeg ในระบบ (bot เรียก `ffmpeg` command)
- Discord bot token

## ติดตั้ง FFmpeg

### Windows
1. โหลด build จาก https://www.gyan.dev/ffmpeg/builds/ (essentials build)
2. แตกไฟล์ไปที่ `C:\ffmpeg`
3. เพิ่ม `C:\ffmpeg\bin` เข้า `PATH` (System Environment Variables)
4. เปิด terminal ใหม่ ตรวจสอบ: `ffmpeg -version`

หรือใช้ winget:
```powershell
winget install ffmpeg
```

### macOS
```bash
brew install ffmpeg
```

### Linux (Debian/Ubuntu)
```bash
sudo apt update && sudo apt install -y ffmpeg
```

## ติดตั้ง bot

```bash
cd music-bot
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

## ตั้งค่า `.env`

แก้ไฟล์ `.env`:
```
DISCORD_TOKEN=<ใส่ bot token จริง>
```

## Discord Bot setup

### สร้าง bot
1. ไปที่ https://discord.com/developers/applications → **New Application**
2. เข้า tab **Bot** → **Reset Token** → copy token ใส่ `.env`
3. ในหน้า **Bot** เปิด intents ต่อไปนี้:
   - `SERVER MEMBERS INTENT` — ไม่จำเป็น (bot ไม่ใช้)
   - `MESSAGE CONTENT INTENT` — ไม่จำเป็น (ใช้ slash เท่านั้น)
   - **Voice states** — เปิดโดย default อยู่แล้วใน default intents

### Invite bot เข้า server
1. Tab **OAuth2** → **URL Generator**
2. Scopes: เลือก `bot` + `applications.commands`
3. Bot Permissions ที่ต้องมี:
   - `View Channels`
   - `Send Messages`
   - `Embed Links`
   - `Connect` (voice)
   - `Speak` (voice)
   - `Use Voice Activity`
4. เปิด URL ที่ generate → เลือก server → Authorize

## รัน bot

```bash
python bot.py
```

Log ที่ควรเห็น:
```
Logged in as YourBot#1234 (id=...)
Synced 8 slash commands (global)
```

### Sync slash commands

`on_ready` เรียก `tree.sync()` แบบ global ให้อัตโนมัติ — Discord ใช้เวลา sync **1-60 นาที** ครั้งแรก
ครั้งถัดไป (แก้ description/option ไม่แก้ชื่อคำสั่ง) อัพเดตเกือบทันที

ถ้าอยากให้เห็นในเซิร์ฟเวอร์ทดสอบทันที ให้แก้ `on_ready` เป็น guild-specific sync:
```python
GUILD = discord.Object(id=YOUR_GUILD_ID)
bot.tree.copy_global_to(guild=GUILD)
await bot.tree.sync(guild=GUILD)
```

## Troubleshooting

- **`ffmpeg was not found`** — ยังไม่ได้ install FFmpeg หรือไม่ได้อยู่ใน PATH
- **`PyNaCl is required for voice`** — `pip install PyNaCl`
- **`4006 Session no longer valid`** — Discord ปิด voice session ให้รอ ~1 นาทีแล้ว `/play` ใหม่
- **Slash command ไม่ขึ้น** — รอ sync (สูงสุด 60 นาที) หรือ re-invite bot ด้วย scope `applications.commands`
- **เพลงกระตุก** — network เข้า YouTube CDN ช้า; ลอง server region อื่น

## Internal API (ควบคุมจาก dashboard)

bot เปิด HTTP API เล็ก ๆ (aiohttp) ใน event loop เดียวกัน ให้ dashboard สั่ง
skip/pause/resume/stop/loop/play + ดูคิวสดผ่าน Railway private networking

เปิดใช้งานโดยตั้ง env:
- `MUSIC_INTERNAL_SECRET` — shared secret (ต้องตรงกับที่ dashboard ตั้ง) ถ้าไม่ตั้ง API จะไม่เปิด
- `MUSIC_INTERNAL_PORT` — port ที่ bind (default `8080`)

Endpoints (ต้องมี header `Authorization: Bearer <secret>`):
- `GET  /guilds/{gid}/music` — สถานะ (connected/current/queue/loop_mode)
- `POST /guilds/{gid}/music/skip|pause|resume|stop|loop`
- `POST /guilds/{gid}/music/play` — body `{"query": "..."}` (ใช้ได้เฉพาะตอน bot อยู่ใน voice แล้ว)
- `GET  /health` — ไม่ต้อง auth

## Deploy บน Railway

Music bot รันเป็น service แยกใน Railway project เดียวกับ bot หลัก:

1. **New service** → Deploy from GitHub repo เดิม
2. **Settings → Root Directory** = `music-bot`
   (Nixpacks จะอ่าน `nixpacks.toml` ในโฟลเดอร์นี้ ลง ffmpeg + `python bot.py` ให้เอง)
3. **Variables** ที่ต้องตั้งบน service นี้:
   - `DISCORD_TOKEN` — token ของ music bot
   - `MUSIC_INTERNAL_SECRET` — สุ่ม string ยาว ๆ
   - `MUSIC_INTERNAL_PORT` = `8080` (optional)
4. **Variables ฝั่ง dashboard service** (เพิ่ม 2 ตัว):
   - `MUSIC_BOT_INTERNAL_URL` = `http://<ชื่อ-music-service>.railway.internal:8080`
   - `MUSIC_INTERNAL_SECRET` = **ค่าเดียวกับ** ที่ตั้งใน music bot
5. Deploy — dashboard หน้า Music bot จะแสดงปุ่มควบคุมสด (ถ้าไม่ตั้ง env จะขึ้นว่าเป็นคู่มืออย่างเดียว)

> **หมายเหตุ:** `/play` จาก dashboard ต้องมี bot อยู่ใน voice channel ก่อน (เริ่มด้วย `/play` ใน Discord)
> เพราะ dashboard ไม่รู้ว่า user อยู่ห้องไหน

## Security notes

- `.env` อยู่ใน `.gitignore` แล้ว — **อย่า commit token**
- ถ้า token หลุด รีบไป **Reset Token** ที่ Discord Developer Portal
- `yt-dlp` ตั้ง `noplaylist=True` กัน user โยน playlist URL ยาวๆ ให้ bot โหลด

## โครงสร้าง

```
music-bot/
├── bot.py            # main + slash commands ทั้ง 8
├── .env              # DISCORD_TOKEN (ห้าม commit)
├── .gitignore
├── requirements.txt
└── README.md
```

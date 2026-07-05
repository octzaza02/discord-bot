import os

from aiohttp import web


def _serialize_song(s):
    if not s:
        return None
    return {
        "title": s.title,
        "duration": s.duration,
        "webpage_url": s.webpage_url,
        "requester": s.requester,
    }


async def start_internal_api(bot, *, get_state, extract_song, play_next):
    """เปิด HTTP API เล็ก ๆ ใน event loop เดียวกับ bot เพื่อให้ dashboard
    ควบคุมได้สด (skip/pause/queue/...) ผ่าน Railway private networking

    ต้องรันใน setup_hook ของ bot — จะได้อยู่ loop เดียวกัน แตะ voice_client
    กับ states ได้ตรง ๆ โดยไม่ต้อง run_coroutine_threadsafe
    """
    secret = os.getenv("MUSIC_INTERNAL_SECRET", "")
    port = int(os.getenv("MUSIC_INTERNAL_PORT", "8080"))
    if not secret:
        print("[internal-api] MUSIC_INTERNAL_SECRET ไม่ถูกตั้ง — ปิด internal API")
        return

    @web.middleware
    async def auth_mw(request, handler):
        if request.path == "/health":
            return await handler(request)
        if request.headers.get("Authorization") != f"Bearer {secret}":
            return web.json_response({"error": "unauthorized"}, status=401)
        return await handler(request)

    def state_payload(state):
        connected = bool(state.voice and state.voice.is_connected())
        return {
            "connected": connected,
            "playing": bool(state.voice and state.voice.is_playing()),
            "paused": bool(state.voice and state.voice.is_paused()),
            "channel": state.voice.channel.name if connected else None,
            "loop_mode": state.loop_mode,
            "current": _serialize_song(state.current),
            "queue": [_serialize_song(s) for s in state.queue],
        }

    async def get_state_h(request):
        gid = int(request.match_info["gid"])
        return web.json_response(state_payload(get_state(gid)))

    async def skip_h(request):
        state = get_state(int(request.match_info["gid"]))
        if not state.voice or not state.voice.is_playing():
            return web.json_response({"error": "ไม่มีเพลงเล่นอยู่"}, status=409)
        state.voice.stop()  # trigger after callback → เล่นเพลงถัดไปเอง
        return web.json_response({"ok": True})

    async def pause_h(request):
        state = get_state(int(request.match_info["gid"]))
        if not state.voice or not state.voice.is_playing():
            return web.json_response({"error": "ไม่มีเพลงเล่นอยู่"}, status=409)
        state.voice.pause()
        return web.json_response({"ok": True})

    async def resume_h(request):
        state = get_state(int(request.match_info["gid"]))
        if not state.voice or not state.voice.is_paused():
            return web.json_response({"error": "ไม่ได้หยุดชั่วคราวอยู่"}, status=409)
        state.voice.resume()
        return web.json_response({"ok": True})

    async def stop_h(request):
        state = get_state(int(request.match_info["gid"]))
        state.queue.clear()
        state.current = None
        state.loop_mode = "off"
        if state.voice and state.voice.is_connected():
            state.voice.stop()
            await state.voice.disconnect()
        state.voice = None
        return web.json_response({"ok": True})

    async def loop_h(request):
        state = get_state(int(request.match_info["gid"]))
        order = {"off": "single", "single": "queue", "queue": "off"}
        state.loop_mode = order[state.loop_mode]
        return web.json_response({"ok": True, "loop_mode": state.loop_mode})

    async def play_h(request):
        state = get_state(int(request.match_info["gid"]))
        # เล่นจาก dashboard ได้เฉพาะตอน bot อยู่ใน voice แล้ว — เพราะ dashboard
        # ไม่รู้ว่า user อยู่ channel ไหน ต้องเริ่มด้วย /play ใน Discord ก่อน
        if not state.voice or not state.voice.is_connected():
            return web.json_response(
                {"error": "บอทยังไม่อยู่ใน voice channel — ใช้ /play ใน Discord ก่อน"},
                status=409,
            )
        body = await request.json()
        query = (body or {}).get("query", "").strip()
        if not query:
            return web.json_response({"error": "query ว่าง"}, status=400)
        try:
            song = await extract_song(query, "dashboard")
        except Exception as e:
            return web.json_response({"error": f"โหลดเพลงไม่สำเร็จ: {e}"}, status=400)
        state.queue.append(song)
        if (
            not state.voice.is_playing()
            and not state.voice.is_paused()
            and state.current is None
        ):
            await play_next(int(request.match_info["gid"]))
        return web.json_response(
            {"ok": True, "title": song.title, "queue_len": len(state.queue)}
        )

    app = web.Application(middlewares=[auth_mw])
    app.router.add_get("/health", lambda r: web.json_response({"ok": True}))
    # {gid:\d+} บังคับเป็นตัวเลข กัน 500 จาก int() ที่ค่าเพี้ยน
    app.router.add_get("/guilds/{gid:\\d+}/music", get_state_h)
    app.router.add_post("/guilds/{gid:\\d+}/music/skip", skip_h)
    app.router.add_post("/guilds/{gid:\\d+}/music/pause", pause_h)
    app.router.add_post("/guilds/{gid:\\d+}/music/resume", resume_h)
    app.router.add_post("/guilds/{gid:\\d+}/music/stop", stop_h)
    app.router.add_post("/guilds/{gid:\\d+}/music/loop", loop_h)
    app.router.add_post("/guilds/{gid:\\d+}/music/play", play_h)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, host="0.0.0.0", port=port)
    await site.start()
    print(f"[internal-api] listening on :{port}")

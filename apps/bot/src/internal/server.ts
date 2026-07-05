import Fastify from 'fastify';
import type { Client } from 'discord.js';
import { config } from '../config.js';
import { postRolePanel } from '../features/rolebutton/post.js';
import {
  cycleLoop,
  enqueueFromDashboard,
  pause,
  resume,
  skip,
  statusPayload,
  stop,
  MusicError,
} from '../features/music/controller.js';

export function startInternalApi(client: Client) {
  const app = Fastify({ logger: false });

  app.addHook('onRequest', async (req, reply) => {
    if (req.url === '/health') return; // ให้ Fly/health-check เรียกได้โดยไม่ต้อง auth
    const auth = req.headers['authorization'];
    if (!config.internalSecret || auth !== `Bearer ${config.internalSecret}`) {
      reply.code(401).send({ error: 'unauthorized' });
    }
  });

  app.get('/health', async () => ({ ok: true }));

  app.post<{ Params: { panelId: string }; Body: { channelId?: string } }>(
    '/panels/:panelId/post',
    async (req, reply) => {
      try {
        const result = await postRolePanel(client, req.params.panelId, req.body?.channelId);
        return result;
      } catch (err: any) {
        reply.code(400);
        return { error: err?.message ?? 'failed' };
      }
    },
  );

  // ---------- music (dashboard live control) ----------
  app.get<{ Params: { gid: string } }>('/guilds/:gid/music', async (req) => {
    return statusPayload(client, req.params.gid);
  });

  const musicActions: Record<string, (gid: string) => void> = {
    skip,
    pause,
    resume,
    stop,
    loop: () => undefined, // handled below (returns mode)
  };

  app.post<{ Params: { gid: string; action: string }; Body: { query?: string } }>(
    '/guilds/:gid/music/:action',
    async (req, reply) => {
      const { gid, action } = req.params;
      try {
        if (action === 'loop') {
          return { ok: true, loop_mode: cycleLoop(gid) };
        }
        if (action === 'play') {
          const result = await enqueueFromDashboard(gid, req.body?.query ?? '');
          return { ok: true, title: result.title, queue_len: result.queueLen };
        }
        const fn = musicActions[action];
        if (!fn) {
          reply.code(400);
          return { error: 'unknown action' };
        }
        fn(gid);
        return { ok: true };
      } catch (err: any) {
        reply.code(err instanceof MusicError ? 409 : 400);
        return { error: err?.message ?? 'failed' };
      }
    },
  );

  app.listen({ port: config.internalPort, host: '0.0.0.0' }).then(() => {
    console.log(`[internal] listening on :${config.internalPort}`);
  });
}

import Fastify from 'fastify';
import type { Client } from 'discord.js';
import { config } from '../config.js';
import { postRolePanel } from '../features/rolebutton/post.js';

export function startInternalApi(client: Client) {
  const app = Fastify({ logger: false });

  app.addHook('onRequest', async (req, reply) => {
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

  app.listen({ port: config.internalPort, host: '0.0.0.0' }).then(() => {
    console.log(`[internal] listening on :${config.internalPort}`);
  });
}

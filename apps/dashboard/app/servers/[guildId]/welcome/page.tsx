import { ensureDb } from '../../../../lib/db';
import { getOrCreateGuildConfig } from '@discord-bot/shared';
import { WelcomeForm } from './WelcomeForm';

export default async function WelcomePage({ params }: { params: { guildId: string } }) {
  await ensureDb();
  const cfg = await getOrCreateGuildConfig(params.guildId);
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">👋 Welcome message</h1>
      <WelcomeForm
        guildId={params.guildId}
        initial={{
          enabled: cfg.welcome?.enabled ?? false,
          channelId: cfg.welcome?.channelId ?? '',
          template: cfg.welcome?.template ?? '',
        }}
      />
    </div>
  );
}

import { ensureDb } from '../../../../lib/db';
import { StreamSubscription } from '@discord-bot/shared';
import { SubscriptionsList } from './SubscriptionsList';
import { HowToUse, Step, Kbd } from '../../../../components/HowToUse';

export const dynamic = 'force-dynamic';

// Provider status derived from env vars visible to dashboard's own process.
// Bot uses its OWN env vars — dashboard just reflects public status hints.
function providerStatus() {
  return {
    youtube: { ok: true, label: 'พร้อมใช้ (ผ่าน RSS ฟรี)' },
    twitch: {
      ok: !!process.env.TWITCH_CLIENT_ID && !!process.env.TWITCH_CLIENT_SECRET,
      label:
        !!process.env.TWITCH_CLIENT_ID && !!process.env.TWITCH_CLIENT_SECRET
          ? 'พร้อมใช้'
          : 'ต้องตั้ง TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET ใน Railway (bot service)',
    },
    tiktok: { ok: true, label: 'พร้อมใช้ (ผ่าน RSSHub)' },
    facebook: {
      ok: !!process.env.FACEBOOK_APP_ID,
      label: !!process.env.FACEBOOK_APP_ID
        ? 'พร้อมใช้ (ต้องมี Page Access Token ต่อเพจ)'
        : 'ต้องตั้ง FACEBOOK_APP_ID ใน Railway (bot service)',
    },
  };
}

export default async function StreamAlertsPage({
  params,
}: {
  params: { guildId: string };
}) {
  await ensureDb();
  const subs = await StreamSubscription.find({ guildId: params.guildId })
    .sort({ platform: 1, creatorName: 1 })
    .lean();

  const initial = subs.map((s) => ({
    _id: String(s._id),
    platform: s.platform,
    creatorId: s.creatorId,
    creatorName: s.creatorName,
    discordChannelId: s.discordChannelId,
  }));

  const status = providerStatus();

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2 text-amber-heading">🔔 Stream Alerts</h1>
      <p className="text-sm text-amber-sub mb-6">
        แจ้งเตือนเมื่อ creator ที่ติดตามปล่อยคลิปใหม่หรือกำลังไลฟ์
      </p>

      <HowToUse title="วิธีใช้ + วิธีขอ API keys" defaultOpen>
        <p>
          <b>เพิ่มการติดตามด้วยคำสั่ง Discord</b>:{' '}
          <Kbd>
            /subscribe platform:youtube creator:https://youtube.com/@name channel:#ห้อง
          </Kbd>
        </p>

        <div className="rounded bg-amber-primary/10 border border-amber-primary/40 p-3 text-xs text-amber-heading">
          <b>สำคัญ:</b> ต้องเปิด feature <b>Stream Alerts</b> ที่หน้า{' '}
          <a
            href={`/servers/${params.guildId}`}
            className="text-amber-link hover:text-amber-primary underline"
          >
            ภาพรวม
          </a>{' '}
          ก่อน ไม่งั้นบอทจะไม่ส่งการแจ้งเตือน
        </div>

        <div className="space-y-3 pt-2">
          <div>
            <div className="font-medium text-amber-heading mb-1">
              📺 YouTube {status.youtube.ok ? '🟢' : '🔴'}
            </div>
            <div className="text-xs text-amber-sub">
              {status.youtube.label} — ไม่ต้องขอ API key
              <br />
              ถ้าอยากให้ตรวจสถานะ "กำลังไลฟ์อยู่จริง" แม่นยำขึ้น → ขอ{' '}
              <Kbd>YOUTUBE_API_KEY</Kbd> จาก{' '}
              <a
                className="text-amber-link hover:underline"
                href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
                target="_blank"
              >
                Google Cloud Console
              </a>{' '}
              (Enable YouTube Data API v3 → Credentials → Create API Key) แล้วใส่ใน Railway
              (bot service)
            </div>
          </div>

          <div>
            <div className="font-medium text-amber-heading mb-1">
              🟣 Twitch {status.twitch.ok ? '🟢' : '🔴'}
            </div>
            <div className="text-xs text-amber-sub">{status.twitch.label}</div>
            {!status.twitch.ok && (
              <div className="text-xs text-amber-sub mt-1 space-y-1">
                <Step n={1}>
                  เปิด{' '}
                  <a
                    className="text-amber-link hover:underline"
                    href="https://dev.twitch.tv/console"
                    target="_blank"
                  >
                    dev.twitch.tv/console
                  </a>{' '}
                  → Applications → Register Your Application
                </Step>
                <Step n={2}>
                  Name: อะไรก็ได้ · OAuth Redirect URL: <Kbd>http://localhost</Kbd> ·
                  Category: Application Integration
                </Step>
                <Step n={3}>
                  Copy <b>Client ID</b> และ <b>New Secret</b> — ใส่ใน Railway (bot service){' '}
                  <Kbd>TWITCH_CLIENT_ID</Kbd> และ <Kbd>TWITCH_CLIENT_SECRET</Kbd>
                </Step>
              </div>
            )}
          </div>

          <div>
            <div className="font-medium text-amber-heading mb-1">
              ⚫ TikTok {status.tiktok.ok ? '🟢' : '🔴'}
            </div>
            <div className="text-xs text-amber-sub">
              {status.tiktok.label} — ไม่มี official API ใช้ RSSHub public instance
              (
              <a
                className="text-amber-link hover:underline"
                href="https://docs.rsshub.app/"
                target="_blank"
              >
                rsshub.app
              </a>
              ) เมื่อใช้เยอะและ instance ล่ม สามารถ self-host ด้วย Docker แล้วตั้ง{' '}
              <Kbd>RSSHUB_INSTANCES</Kbd> ใน Railway
              <br />
              <b>ข้อจำกัด:</b> เมื่อ TikTok เปลี่ยนโครงสร้าง อาจสะดุดชั่วคราวจนกว่า RSSHub อัปเดต
            </div>
          </div>

          <div>
            <div className="font-medium text-amber-heading mb-1">
              🔵 Facebook {status.facebook.ok ? '🟢' : '🔴'}
            </div>
            <div className="text-xs text-amber-sub">{status.facebook.label}</div>
            <div className="text-xs text-amber-sub mt-1 space-y-1">
              <Step n={1}>
                เปิด{' '}
                <a
                  className="text-amber-link hover:underline"
                  href="https://developers.facebook.com/apps"
                  target="_blank"
                >
                  developers.facebook.com
                </a>{' '}
                → Create App → Business
              </Step>
              <Step n={2}>
                คัดลอก App ID → ใส่ใน Railway (bot service) <Kbd>FACEBOOK_APP_ID</Kbd>
              </Step>
              <Step n={3}>
                เจ้าของเพจ Facebook ที่จะติดตาม → Meta Business Suite → Settings →{' '}
                Business Assets → Pages → เลือกเพจ → Generate Access Token
              </Step>
              <Step n={4}>
                ตอน <Kbd>/subscribe platform:facebook</Kbd> ใส่ creator เป็น{' '}
                <Kbd>pageIdOrName:accessToken</Kbd> (คั่นด้วย <b>:</b>)
              </Step>
              <div className="rounded bg-red-50 border border-red-200 p-2 text-red-700 mt-1">
                <b>ข้อจำกัด Meta:</b> Page Access Token ปกติจะหมดอายุ 60 วัน ต้องขอใหม่เอง
                (ผ่าน app review เท่านั้นถึงจะได้ long-lived) — ผู้ใช้ต้องเป็นแอดมินของเพจนั้น
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-amber-border">
          <div className="font-medium text-amber-heading">🎮 คำสั่ง Discord</div>
          <ul className="list-disc pl-5 space-y-1 text-amber-sub text-xs">
            <li>
              <Kbd>/subscribe platform:X creator:Y channel:#ห้อง</Kbd> — เพิ่มการติดตาม
            </li>
            <li>
              <Kbd>/unsubscribe platform:X creator:Y</Kbd> — ลบ
            </li>
            <li>
              <Kbd>/list-subscriptions</Kbd> — ดูรายการ
            </li>
          </ul>
        </div>

        <p className="text-amber-sub text-xs pt-2 border-t border-amber-border">
          Poll ทุก 2 นาที — delay สูงสุด 2 นาทีจากเวลาไลฟ์เริ่ม/คลิปโพส
        </p>
      </HowToUse>

      <SubscriptionsList guildId={params.guildId} initial={initial} />
    </div>
  );
}

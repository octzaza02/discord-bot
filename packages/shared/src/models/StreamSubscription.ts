import mongoose, { Schema, type Model } from 'mongoose';
const { model, models } = mongoose;

export const STREAM_PLATFORMS = ['youtube', 'twitch', 'tiktok', 'facebook'] as const;
export type StreamPlatform = (typeof STREAM_PLATFORMS)[number];

export interface StreamSubscriptionDoc {
  _id: mongoose.Types.ObjectId;
  guildId: string;
  discordChannelId: string;
  platform: StreamPlatform;
  creatorId: string; // normalized ID (YT channel ID / Twitch login / TikTok username / FB page ID)
  creatorName: string;
  lastVideoId: string | null;
  lastLiveId: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const StreamSubscriptionSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    discordChannelId: { type: String, required: true },
    platform: { type: String, enum: STREAM_PLATFORMS, required: true },
    creatorId: { type: String, required: true },
    creatorName: { type: String, default: '' },
    lastVideoId: { type: String, default: null },
    lastLiveId: { type: String, default: null },
  },
  { timestamps: true },
);

StreamSubscriptionSchema.index(
  { guildId: 1, platform: 1, creatorId: 1 },
  { unique: true },
);

export const StreamSubscription: Model<StreamSubscriptionDoc> =
  (models.StreamSubscription as Model<StreamSubscriptionDoc>) ||
  model<StreamSubscriptionDoc>('StreamSubscription', StreamSubscriptionSchema);

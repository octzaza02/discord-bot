import mongoose, { Schema, type Model } from 'mongoose';
const { model, models } = mongoose;
import { STREAM_PLATFORMS, type StreamPlatform } from './StreamSubscription.js';

// Shared cache per (platform, creatorId) — one entry serves all guilds
// tracking the same creator, so we hit the API once per cycle.

export interface StreamStateDoc {
  _id: mongoose.Types.ObjectId;
  platform: StreamPlatform;
  creatorId: string;
  latestVideoId: string | null;
  latestVideoAt: Date | null;
  checkedAt: Date;
  failCount: number;
  cooldownUntil: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const StreamStateSchema = new Schema(
  {
    platform: { type: String, enum: STREAM_PLATFORMS, required: true },
    creatorId: { type: String, required: true },
    latestVideoId: { type: String, default: null },
    latestVideoAt: { type: Date, default: null },
    checkedAt: { type: Date, default: () => new Date(0) },
    failCount: { type: Number, default: 0 },
    cooldownUntil: { type: Date, default: null },
  },
  { timestamps: true },
);

StreamStateSchema.index({ platform: 1, creatorId: 1 }, { unique: true });

export const StreamState: Model<StreamStateDoc> =
  (models.StreamState as Model<StreamStateDoc>) ||
  model<StreamStateDoc>('StreamState', StreamStateSchema);

import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
const { model, models } = mongoose;

const UserXpSchema = new Schema(
  {
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    totalXp: { type: Number, default: 0, min: 0 },
    lastMessageAt: { type: Date, default: () => new Date(0) },
  },
  { timestamps: true },
);

UserXpSchema.index({ guildId: 1, userId: 1 }, { unique: true });
UserXpSchema.index({ guildId: 1, totalXp: -1 });

export type UserXpDoc = InferSchemaType<typeof UserXpSchema>;

export const UserXp: Model<UserXpDoc> =
  (models.UserXp as Model<UserXpDoc>) || model<UserXpDoc>('UserXp', UserXpSchema);

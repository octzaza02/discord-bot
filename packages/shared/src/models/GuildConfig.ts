import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

const WelcomeSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    channelId: { type: String, default: null },
    template: {
      type: String,
      default: 'ยินดีต้อนรับ {user} สู่ {server}! 🎉',
    },
  },
  { _id: false },
);

const GuildConfigSchema = new Schema(
  {
    guildId: { type: String, required: true, unique: true, index: true },
    welcome: { type: WelcomeSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export type GuildConfigDoc = InferSchemaType<typeof GuildConfigSchema>;

export const GuildConfig: Model<GuildConfigDoc> =
  (models.GuildConfig as Model<GuildConfigDoc>) ||
  model<GuildConfigDoc>('GuildConfig', GuildConfigSchema);

export async function getOrCreateGuildConfig(guildId: string) {
  return GuildConfig.findOneAndUpdate(
    { guildId },
    { $setOnInsert: { guildId } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

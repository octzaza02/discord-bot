import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
const { model, models } = mongoose;

// Tracks which guilds the bot is currently a member of.
// Dashboard uses this to filter the user's guild list.
const BotGuildSchema = new Schema(
  {
    guildId: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: '' },
    icon: { type: String, default: null },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export type BotGuildDoc = InferSchemaType<typeof BotGuildSchema>;

export const BotGuild: Model<BotGuildDoc> =
  (models.BotGuild as Model<BotGuildDoc>) ||
  model<BotGuildDoc>('BotGuild', BotGuildSchema);

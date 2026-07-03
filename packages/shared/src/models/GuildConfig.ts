import mongoose, { Schema, type Model } from 'mongoose';
const { model, models } = mongoose;

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

const FeatureFlagSchema = new Schema(
  { enabled: { type: Boolean, default: true } },
  { _id: false },
);

const FeaturesSchema = new Schema(
  {
    welcome: { type: FeatureFlagSchema, default: () => ({ enabled: true }) },
    rolebutton: { type: FeatureFlagSchema, default: () => ({ enabled: true }) },
    leveling: { type: FeatureFlagSchema, default: () => ({ enabled: false }) },
    dashboardDm: { type: FeatureFlagSchema, default: () => ({ enabled: true }) },
  },
  { _id: false },
);

const LevelRewardSchema = new Schema(
  {
    level: { type: Number, required: true, min: 1 },
    roleId: { type: String, required: true },
  },
  { _id: false },
);

const LevelingAnnounceSchema = new Schema(
  {
    mode: {
      type: String,
      enum: ['same', 'channel', 'dm', 'off'],
      default: 'same',
    },
    channelId: { type: String, default: null },
    template: {
      type: String,
      default: '🎉 ยินดีด้วย {user} เลื่อนขึ้นเป็น **Level {level}**!',
    },
  },
  { _id: false },
);

const LevelingSchema = new Schema(
  {
    xpPerMessage: { type: Number, default: 15, min: 1, max: 1000 },
    cooldownSeconds: { type: Number, default: 60, min: 0, max: 3600 },
    minMessageLength: { type: Number, default: 1, min: 0, max: 500 },
    ignoredChannels: { type: [String], default: [] },
    ignoredRoles: { type: [String], default: [] },
    announce: { type: LevelingAnnounceSchema, default: () => ({}) },
    stackRewards: { type: Boolean, default: false },
    rewards: { type: [LevelRewardSchema], default: [] },
  },
  { _id: false },
);

const GuildConfigSchema = new Schema(
  {
    guildId: { type: String, required: true, unique: true, index: true },
    welcome: { type: WelcomeSchema, default: () => ({}) },
    leveling: { type: LevelingSchema, default: () => ({}) },
    features: { type: FeaturesSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export interface LevelReward {
  level: number;
  roleId: string;
}

export interface LevelingAnnounce {
  mode: 'same' | 'channel' | 'dm' | 'off';
  channelId: string | null;
  template: string;
}

export interface LevelingConfig {
  xpPerMessage: number;
  cooldownSeconds: number;
  minMessageLength: number;
  ignoredChannels: string[];
  ignoredRoles: string[];
  announce: LevelingAnnounce;
  stackRewards: boolean;
  rewards: LevelReward[];
}

export interface WelcomeConfig {
  enabled: boolean;
  channelId: string | null;
  template: string;
}

export interface FeaturesConfig {
  welcome: { enabled: boolean };
  rolebutton: { enabled: boolean };
  leveling: { enabled: boolean };
  dashboardDm: { enabled: boolean };
}

export interface GuildConfigDoc {
  guildId: string;
  welcome: WelcomeConfig;
  leveling: LevelingConfig;
  features: FeaturesConfig;
  createdAt?: Date;
  updatedAt?: Date;
}

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

export type FeatureName = 'welcome' | 'rolebutton' | 'leveling' | 'dashboardDm';

export async function isFeatureEnabled(guildId: string, feature: FeatureName): Promise<boolean> {
  const cfg = await GuildConfig.findOne({ guildId }, { features: 1 }).lean();
  if (!cfg) {
    // No config yet → use defaults (welcome/rolebutton/dashboardDm ON, leveling OFF)
    return feature !== 'leveling';
  }
  return cfg.features?.[feature]?.enabled ?? (feature !== 'leveling');
}

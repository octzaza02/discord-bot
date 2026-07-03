import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
const { model, models } = mongoose;

export const BUTTON_STYLES = ['Primary', 'Secondary', 'Success', 'Danger'] as const;
export type ButtonStyle = (typeof BUTTON_STYLES)[number];

const RoleButtonSchema = new Schema(
  {
    roleId: { type: String, required: true },
    label: { type: String, required: true, maxlength: 80 },
    emoji: { type: String, default: null },
    style: { type: String, enum: BUTTON_STYLES, default: 'Secondary' },
  },
  { _id: false },
);

const RolePanelSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, default: null },
    messageId: { type: String, default: null, index: true },
    title: { type: String, required: true, maxlength: 256 },
    description: { type: String, default: '', maxlength: 4000 },
    roles: { type: [RoleButtonSchema], default: [] },
  },
  { timestamps: true },
);

export type RolePanelDoc = InferSchemaType<typeof RolePanelSchema>;

export const RolePanel: Model<RolePanelDoc> =
  (models.RolePanel as Model<RolePanelDoc>) ||
  model<RolePanelDoc>('RolePanel', RolePanelSchema);

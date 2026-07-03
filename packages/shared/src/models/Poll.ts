import mongoose, { Schema, type Model } from 'mongoose';
const { model, models } = mongoose;

export interface PollVote {
  userId: string;
  optionIndex: number;
  votedAt: Date;
}

export interface PollDoc {
  _id: mongoose.Types.ObjectId;
  guildId: string;
  channelId: string;
  messageId: string | null;
  question: string;
  options: string[];
  allowMulti: boolean;
  createdBy: string;
  endsAt: Date | null;
  closed: boolean;
  votes: PollVote[];
  createdAt?: Date;
  updatedAt?: Date;
}

const PollVoteSchema = new Schema<PollVote>(
  {
    userId: { type: String, required: true },
    optionIndex: { type: Number, required: true, min: 0 },
    votedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const PollSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true },
    messageId: { type: String, default: null, index: true },
    question: { type: String, required: true, maxlength: 300 },
    options: {
      type: [String],
      validate: [(v: string[]) => v.length >= 2 && v.length <= 10, 'options 2-10'],
    },
    allowMulti: { type: Boolean, default: false },
    createdBy: { type: String, required: true },
    endsAt: { type: Date, default: null },
    closed: { type: Boolean, default: false, index: true },
    votes: { type: [PollVoteSchema], default: [] },
  },
  { timestamps: true },
);

PollSchema.index({ guildId: 1, closed: 1, endsAt: 1 });

export const Poll: Model<PollDoc> =
  (models.Poll as Model<PollDoc>) || model<PollDoc>('Poll', PollSchema);

export function tallyVotes(poll: Pick<PollDoc, 'options' | 'votes'>): number[] {
  const counts = new Array<number>(poll.options.length).fill(0);
  for (const v of poll.votes) {
    if (v.optionIndex >= 0 && v.optionIndex < counts.length) counts[v.optionIndex]++;
  }
  return counts;
}

import { UserXp } from '@discord-bot/shared';

export interface GrantResult {
  granted: boolean;      // true = XP added, false = still in cooldown
  totalXp: number;       // current total XP (after grant if granted, otherwise current value)
  oldXp: number;         // XP before this grant
}

/**
 * Atomically grant XP if cooldown has passed.
 * Uses conditional findOneAndUpdate — no race conditions.
 */
export async function grantXp(
  guildId: string,
  userId: string,
  xpAmount: number,
  cooldownSeconds: number,
): Promise<GrantResult> {
  const cutoff = new Date(Date.now() - cooldownSeconds * 1000);

  // Try conditional update: only bump if last message was before cutoff
  const updated = await UserXp.findOneAndUpdate(
    { guildId, userId, lastMessageAt: { $lte: cutoff } },
    { $inc: { totalXp: xpAmount }, $set: { lastMessageAt: new Date() } },
    { new: true },
  ).lean();

  if (updated) {
    return { granted: true, totalXp: updated.totalXp, oldXp: updated.totalXp - xpAmount };
  }

  // Either doc doesn't exist yet, or cooldown not passed. Try upsert (creates fresh doc).
  const existing = await UserXp.findOne({ guildId, userId }).lean();
  if (existing) {
    // Doc exists → still in cooldown
    return { granted: false, totalXp: existing.totalXp, oldXp: existing.totalXp };
  }

  // Create fresh doc with initial XP
  try {
    const created = await UserXp.create({
      guildId,
      userId,
      totalXp: xpAmount,
      lastMessageAt: new Date(),
    });
    return { granted: true, totalXp: created.totalXp, oldXp: 0 };
  } catch (err: any) {
    // Race: another handler created it first → retry as update
    if (err?.code === 11000) {
      const retry = await UserXp.findOneAndUpdate(
        { guildId, userId, lastMessageAt: { $lte: cutoff } },
        { $inc: { totalXp: xpAmount }, $set: { lastMessageAt: new Date() } },
        { new: true },
      ).lean();
      if (retry) {
        return { granted: true, totalXp: retry.totalXp, oldXp: retry.totalXp - xpAmount };
      }
      const cur = await UserXp.findOne({ guildId, userId }).lean();
      return { granted: false, totalXp: cur?.totalXp ?? 0, oldXp: cur?.totalXp ?? 0 };
    }
    throw err;
  }
}

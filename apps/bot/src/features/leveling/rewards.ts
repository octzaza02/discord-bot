import type { GuildMember } from 'discord.js';
import type { GuildConfigDoc } from '@discord-bot/shared';

/**
 * Apply level-role rewards.
 * - stackRewards=true: give all reward roles for levels <= currentLevel (no removals)
 * - stackRewards=false: give only the highest-level reward earned; remove other reward roles
 */
export async function applyLevelRewards(
  member: GuildMember,
  currentLevel: number,
  leveling: GuildConfigDoc['leveling'],
) {
  const rewards = leveling?.rewards ?? [];
  if (rewards.length === 0) return;

  const stack = !!leveling?.stackRewards;

  const earned = rewards.filter((r) => r.level <= currentLevel);
  if (earned.length === 0) return;

  const me = member.guild.members.me;
  if (!me) return;

  if (stack) {
    for (const r of earned) {
      const role = member.guild.roles.cache.get(r.roleId);
      if (!role) continue;
      if (me.roles.highest.comparePositionTo(role) <= 0) continue;
      if (member.roles.cache.has(role.id)) continue;
      await member.roles.add(role.id, 'level reward').catch((err) => {
        console.error('[leveling rewards] add role failed', err);
      });
    }
    return;
  }

  // Non-stack: only highest earned reward stays
  const sorted = [...earned].sort((a, b) => b.level - a.level);
  const target = sorted[0];
  const otherRewardRoleIds = new Set(
    rewards.filter((r) => r.roleId !== target.roleId).map((r) => r.roleId),
  );

  const targetRole = member.guild.roles.cache.get(target.roleId);
  if (targetRole && me.roles.highest.comparePositionTo(targetRole) > 0) {
    if (!member.roles.cache.has(targetRole.id)) {
      await member.roles.add(targetRole.id, 'level reward (highest)').catch((err) => {
        console.error('[leveling rewards] add target role failed', err);
      });
    }
  }

  for (const otherId of otherRewardRoleIds) {
    if (!member.roles.cache.has(otherId)) continue;
    const role = member.guild.roles.cache.get(otherId);
    if (!role) continue;
    if (me.roles.highest.comparePositionTo(role) <= 0) continue;
    await member.roles.remove(otherId, 'level reward downgrade').catch((err) => {
      console.error('[leveling rewards] remove role failed', err);
    });
  }
}

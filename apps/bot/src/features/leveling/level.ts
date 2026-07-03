// Pure level math — no side effects, easy to test.
// Formula: xpToReach(L) = 5*L^2 + 50*L + 100

export function xpToReach(level: number): number {
  return 5 * level * level + 50 * level + 100;
}

export function totalXpForLevel(level: number): number {
  let sum = 0;
  for (let i = 0; i < level; i++) sum += xpToReach(i + 1);
  return sum;
}

export function levelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 0;
  let level = 0;
  let cumulative = 0;
  while (true) {
    const next = xpToReach(level + 1);
    if (cumulative + next > totalXp) return level;
    cumulative += next;
    level++;
    if (level > 1000) return level; // safety
  }
}

export interface LevelProgress {
  level: number;
  currentLevelXp: number;   // XP earned within current level
  neededForNext: number;    // XP required to reach next level
}

export function progress(totalXp: number): LevelProgress {
  const level = levelFromXp(totalXp);
  const base = totalXpForLevel(level);
  return {
    level,
    currentLevelXp: totalXp - base,
    neededForNext: xpToReach(level + 1),
  };
}

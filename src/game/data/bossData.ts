import { isBossStage } from '../idle/StageProgression';
import type { EnemyId } from './enemyData';

export type BossId = 'boss_gatebreaker' | 'boss_plague_spitter' | 'boss_alpha_mutant';

export type BossDefinition = {
  id: BossId;
  enemyId: EnemyId;
  name: string;
  hpMultiplier: number;
  speedMultiplier: number;
  damageMultiplier: number;
  displayScale: number;
  tokenReward: number;
};

export const BOSSES: readonly BossDefinition[] = [
  {
    id: 'boss_gatebreaker',
    enemyId: 'zombie-armored',
    name: 'Gatebreaker',
    hpMultiplier: 5.2,
    speedMultiplier: 0.45,
    damageMultiplier: 2.3,
    displayScale: 1.2,
    tokenReward: 6,
  },
  {
    id: 'boss_plague_spitter',
    enemyId: 'zombie-toxic',
    name: 'Plague Spitter',
    hpMultiplier: 7,
    speedMultiplier: 0.5,
    damageMultiplier: 1.85,
    displayScale: 1.16,
    tokenReward: 7,
  },
  {
    id: 'boss_alpha_mutant',
    enemyId: 'zombie-mutant',
    name: 'Alpha Mutant',
    hpMultiplier: 6,
    speedMultiplier: 0.55,
    damageMultiplier: 2.35,
    displayScale: 1.12,
    tokenReward: 9,
  },
];

export const BOSS_ONLY_ENEMY_IDS = [] as readonly EnemyId[];

export function isBossOnlyEnemy(enemyId: EnemyId): boolean {
  return BOSS_ONLY_ENEMY_IDS.includes(enemyId);
}

export function getBossForStage(stage: number): BossDefinition | null {
  if (!isBossStage(stage)) return null;

  const bossIndex = Math.floor(stage / 10 - 1) % BOSSES.length;
  return BOSSES[bossIndex] ?? BOSSES[0];
}

import type { EnemyId } from './enemyData';

export const IDLE_GRID_CONFIG = {
  startCols: 6,
  startRows: 2,
  maxCols: 15,
  maxRows: 15,
  baseCellCost: 25,
  cellCostScale: 1.12,
} as const;

export const IDLE_STAGE_CONFIG = {
  checkpointInterval: 10,
} as const;

export const IDLE_REWARD_CONFIG = {
  baseKillReward: 3,
  stageRewardScale: 1.08,
  bossRewardMultiplier: 12,
  enemyTierMultipliers: {
    zombie: 1,
    'zombie-bruiser': 1.6,
    'zombie-toxic': 2.4,
    'zombie-tank': 3.6,
    'zombie-runner': 1.4,
    'zombie-berserker': 2.8,
    'zombie-armored': 4.5,
    'zombie-crawler': 0.9,
    'zombie-mutant': 6,
  } satisfies Record<EnemyId, number>,
} as const;

export const IDLE_ENEMY_SCALING_CONFIG = {
  baseHp: 28,
  stageHpScale: 1.12,
  bossHpMultiplier: 18,
  baseSpeed: 54,
  stageSpeedScale: 1.015,
  baseDamage: 8,
  stageDamageScale: 1.06,
  enemyHpMultipliers: {
    zombie: 1,
    'zombie-bruiser': 1.5,
    'zombie-toxic': 2,
    'zombie-tank': 3,
    'zombie-runner': 0.78,
    'zombie-berserker': 1.35,
    'zombie-armored': 4.25,
    'zombie-crawler': 0.58,
    'zombie-mutant': 5.4,
  } satisfies Record<EnemyId, number>,
  enemySpeedMultipliers: {
    zombie: 1,
    'zombie-bruiser': 0.92,
    'zombie-toxic': 1.12,
    'zombie-tank': 0.78,
    'zombie-runner': 1.7,
    'zombie-berserker': 1.25,
    'zombie-armored': 0.6,
    'zombie-crawler': 1.45,
    'zombie-mutant': 1.08,
  } satisfies Record<EnemyId, number>,
  enemyDamageMultipliers: {
    zombie: 1,
    'zombie-bruiser': 1.25,
    'zombie-toxic': 1.5,
    'zombie-tank': 2,
    'zombie-runner': 0.75,
    'zombie-berserker': 2.75,
    'zombie-armored': 1.75,
    'zombie-crawler': 0.625,
    'zombie-mutant': 3,
  } satisfies Record<EnemyId, number>,
} as const;

import type { EnemyId } from '../data/enemyData';
import { IDLE_ENEMY_SCALING_CONFIG } from '../data/idleContent';
import { assertValidStage } from './StageProgression';

export type EnemyScalingConfig = {
  baseHp: number;
  stageHpScale: number;
  bossHpMultiplier: number;
  baseSpeed: number;
  stageSpeedScale: number;
  baseDamage: number;
  stageDamageScale: number;
  enemyHpMultipliers: Record<EnemyId, number>;
  enemySpeedMultipliers: Record<EnemyId, number>;
  enemyDamageMultipliers: Record<EnemyId, number>;
};

export type EnemyStageStats = {
  enemyId: EnemyId;
  stage: number;
  hp: number;
  speed: number;
  damage: number;
};

export const DEFAULT_ENEMY_SCALING_CONFIG: EnemyScalingConfig = IDLE_ENEMY_SCALING_CONFIG;

export function getZombieHp(
  stage: number,
  enemyId: EnemyId = 'zombie',
  config: EnemyScalingConfig = DEFAULT_ENEMY_SCALING_CONFIG,
): number {
  assertValidStage(stage);
  return Math.ceil(config.baseHp * config.stageHpScale ** (stage - 1) * config.enemyHpMultipliers[enemyId]);
}

export function getBossHp(stage: number, config: EnemyScalingConfig = DEFAULT_ENEMY_SCALING_CONFIG): number {
  assertValidStage(stage);
  return Math.ceil(getZombieHp(stage, 'zombie-tank', config) * config.bossHpMultiplier);
}

export function getZombieSpeed(
  stage: number,
  enemyId: EnemyId = 'zombie',
  config: EnemyScalingConfig = DEFAULT_ENEMY_SCALING_CONFIG,
): number {
  assertValidStage(stage);
  return Math.ceil(config.baseSpeed * config.stageSpeedScale ** (stage - 1) * config.enemySpeedMultipliers[enemyId]);
}

export function getZombieDamage(
  stage: number,
  enemyId: EnemyId = 'zombie',
  config: EnemyScalingConfig = DEFAULT_ENEMY_SCALING_CONFIG,
): number {
  assertValidStage(stage);
  return Math.ceil(config.baseDamage * config.stageDamageScale ** (stage - 1) * config.enemyDamageMultipliers[enemyId]);
}

export function getEnemyStageStats(
  stage: number,
  enemyId: EnemyId,
  config: EnemyScalingConfig = DEFAULT_ENEMY_SCALING_CONFIG,
): EnemyStageStats {
  return {
    enemyId,
    stage,
    hp: getZombieHp(stage, enemyId, config),
    speed: getZombieSpeed(stage, enemyId, config),
    damage: getZombieDamage(stage, enemyId, config),
  };
}

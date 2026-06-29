import type { EnemyId } from './enemyData';
import { isBossOnlyEnemy } from './bossData';
import { IDLE_WAVE_CONFIG } from './idleContent';

export type StageEnemyGroup = {
  enemyId: EnemyId;
  count: number;
};

export type StageWaveDefinition = {
  stage: number;
  enemies: readonly StageEnemyGroup[];
  totalEnemies: number;
  maxActiveEnemies: number;
  initialSpawnDelayMs: number;
  spawnIntervalMs: number;
};

type StageEnemyCounts = Partial<Record<EnemyId, number>>;

const ENEMY_ORDER: readonly EnemyId[] = [
  'zombie',
  'zombie-bruiser',
  'zombie-toxic',
  'zombie-tank',
  'zombie-runner',
  'zombie-berserker',
  'zombie-armored',
  'zombie-crawler',
  'zombie-mutant',
];

const STAGE_WAVE_PATTERNS: readonly StageEnemyCounts[] = [
  { zombie: 8 },
  { zombie: 6, 'zombie-runner': 1, 'zombie-crawler': 3 },
  { zombie: 6, 'zombie-bruiser': 2, 'zombie-runner': 2, 'zombie-crawler': 2 },
  { zombie: 5, 'zombie-toxic': 2, 'zombie-runner': 2, 'zombie-berserker': 2 },
  { zombie: 5, 'zombie-berserker': 2, 'zombie-armored': 2, 'zombie-crawler': 3 },
  { zombie: 4, 'zombie-toxic': 3, 'zombie-tank': 2, 'zombie-armored': 2 },
  { zombie: 4, 'zombie-bruiser': 2, 'zombie-runner': 3, 'zombie-berserker': 2, 'zombie-crawler': 2 },
  { zombie: 3, 'zombie-toxic': 2, 'zombie-tank': 2, 'zombie-armored': 2, 'zombie-mutant': 1 },
  { zombie: 3, 'zombie-runner': 2, 'zombie-berserker': 2, 'zombie-armored': 2, 'zombie-crawler': 3, 'zombie-mutant': 1 },
  {
    zombie: 2,
    'zombie-bruiser': 2,
    'zombie-toxic': 2,
    'zombie-tank': 2,
    'zombie-runner': 2,
    'zombie-berserker': 2,
    'zombie-armored': 2,
    'zombie-crawler': 4,
    'zombie-mutant': 2,
  },
];

function getStageMaxActiveEnemies(stage: number): number {
  if (stage === 1) return 3;
  if (stage <= 3) return 6;
  if (stage <= 9) return 14;
  return IDLE_WAVE_CONFIG.maxActiveEnemies;
}

function getStageInitialSpawnDelayMs(stage: number): number {
  return stage === 1 ? 1000 : 250;
}

function getStageSpawnIntervalMs(stage: number): number {
  if (stage === 1) return 3600;
  if (stage <= 3) return 3100;
  return Math.max(1100, 2600 - stage * 90);
}

export function getStageWave(stage: number): StageWaveDefinition {
  if (!Number.isInteger(stage) || stage < 1) {
    throw new RangeError(`Stage must be a positive integer. Received: ${stage}`);
  }

  const patternIndex = (stage - 1) % STAGE_WAVE_PATTERNS.length;
  const block = Math.floor((stage - 1) / STAGE_WAVE_PATTERNS.length);
  const pattern = STAGE_WAVE_PATTERNS[patternIndex];

  const uncappedEnemies = ENEMY_ORDER.flatMap((enemyId): StageEnemyGroup[] => {
    if (isBossOnlyEnemy(enemyId)) return [];

    const baseCount = pattern[enemyId] ?? 0;
    if (baseCount === 0) return [];

    const reinforcement = enemyId === 'zombie' ? block * 4 : block * 2;
    return [{ enemyId, count: baseCount + reinforcement }];
  });
  const enemies = capEnemyGroups(uncappedEnemies, IDLE_WAVE_CONFIG.maxTotalEnemies);

  return {
    stage,
    enemies,
    totalEnemies: enemies.reduce((total, group) => total + group.count, 0),
    maxActiveEnemies: getStageMaxActiveEnemies(stage),
    initialSpawnDelayMs: getStageInitialSpawnDelayMs(stage),
    spawnIntervalMs: getStageSpawnIntervalMs(stage),
  };
}

export function expandStageWave(wave: StageWaveDefinition): EnemyId[] {
  return wave.enemies.flatMap(({ enemyId, count }) => Array.from({ length: count }, () => enemyId));
}

function capEnemyGroups(groups: readonly StageEnemyGroup[], maxTotalEnemies: number): StageEnemyGroup[] {
  const totalEnemies = groups.reduce((total, group) => total + group.count, 0);
  if (totalEnemies <= maxTotalEnemies) return [...groups];

  let capped = groups.map((group) => ({
    enemyId: group.enemyId,
    count: Math.max(1, Math.floor((group.count / totalEnemies) * maxTotalEnemies)),
  }));

  let cappedTotal = capped.reduce((total, group) => total + group.count, 0);
  for (let index = 0; cappedTotal < maxTotalEnemies; index = (index + 1) % capped.length) {
    capped[index].count += 1;
    cappedTotal += 1;
  }

  return capped;
}

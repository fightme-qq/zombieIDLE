import type { EnemyId } from './enemyData';

export type StageEnemyGroup = {
  enemyId: EnemyId;
  count: number;
};

export type StageWaveDefinition = {
  stage: number;
  enemies: readonly StageEnemyGroup[];
  totalEnemies: number;
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

export function getStageWave(stage: number): StageWaveDefinition {
  if (!Number.isInteger(stage) || stage < 1) {
    throw new RangeError(`Stage must be a positive integer. Received: ${stage}`);
  }

  const patternIndex = (stage - 1) % STAGE_WAVE_PATTERNS.length;
  const block = Math.floor((stage - 1) / STAGE_WAVE_PATTERNS.length);
  const pattern = STAGE_WAVE_PATTERNS[patternIndex];

  const enemies = ENEMY_ORDER.flatMap((enemyId): StageEnemyGroup[] => {
    const baseCount = pattern[enemyId] ?? 0;
    if (baseCount === 0) return [];

    const reinforcement = enemyId === 'zombie' ? block * 2 : block;
    return [{ enemyId, count: baseCount + reinforcement }];
  });

  return {
    stage,
    enemies,
    totalEnemies: enemies.reduce((total, group) => total + group.count, 0),
  };
}

export function expandStageWave(wave: StageWaveDefinition): EnemyId[] {
  return wave.enemies.flatMap(({ enemyId, count }) => Array.from({ length: count }, () => enemyId));
}

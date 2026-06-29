import { describe, expect, it } from 'vitest';
import { expandStageWave, getStageWave } from '../../src/game/data/stageWaveData';

describe('stage wave data', () => {
  it('defines a finite enemy composition for each stage', () => {
    expect(getStageWave(1)).toEqual({
      stage: 1,
      enemies: [{ enemyId: 'zombie', count: 8 }],
      totalEnemies: 8,
      maxActiveEnemies: 3,
      initialSpawnDelayMs: 1000,
      spawnIntervalMs: 3600,
    });

    const stageEight = getStageWave(8);
    expect(stageEight.enemies).toEqual([
      { enemyId: 'zombie', count: 3 },
      { enemyId: 'zombie-toxic', count: 2 },
      { enemyId: 'zombie-tank', count: 2 },
      { enemyId: 'zombie-armored', count: 2 },
      { enemyId: 'zombie-mutant', count: 1 },
    ]);
    expect(expandStageWave(stageEight)).toHaveLength(stageEight.totalEnemies);
  });

  it('adds reinforcements in later ten-stage blocks', () => {
    expect(getStageWave(11).enemies).toEqual([{ enemyId: 'zombie', count: 12 }]);
    expect(getStageWave(20).totalEnemies).toBeGreaterThan(getStageWave(10).totalEnemies);
  });

  it('grows later waves toward a capped total without exceeding active enemy limits', () => {
    expect(getStageWave(31).totalEnemies).toBeGreaterThan(getStageWave(1).totalEnemies);
    expect(getStageWave(100).totalEnemies).toBe(110);
    expect(getStageWave(100).maxActiveEnemies).toBe(28);
    expect(getStageWave(100).spawnIntervalMs).toBe(1100);
  });

  it('keeps all regular archetypes available in waves', () => {
    const firstBlockIds = new Set(Array.from({ length: 10 }, (_, index) => getStageWave(index + 1).enemies).flat().map((group) => group.enemyId));

    expect(firstBlockIds).toEqual(
      new Set([
        'zombie',
        'zombie-bruiser',
        'zombie-toxic',
        'zombie-tank',
        'zombie-runner',
        'zombie-berserker',
        'zombie-armored',
        'zombie-crawler',
        'zombie-mutant',
      ]),
    );
    expect(getStageWave(1).enemies.some((group) => group.enemyId === 'zombie-mutant')).toBe(false);
    expect(getStageWave(8).enemies.some((group) => group.enemyId === 'zombie-mutant')).toBe(true);
  });

  it('rejects invalid stage numbers', () => {
    expect(() => getStageWave(0)).toThrow(RangeError);
    expect(() => getStageWave(1.5)).toThrow(RangeError);
  });
});

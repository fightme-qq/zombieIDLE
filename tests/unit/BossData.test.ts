import { describe, expect, it } from 'vitest';
import { BOSS_ONLY_ENEMY_IDS, getBossForStage } from '../../src/game/data/bossData';
import { getStageWave } from '../../src/game/data/stageWaveData';

describe('BossData', () => {
  it('rotates a named boss every 10 stages', () => {
    expect(getBossForStage(9)).toBeNull();
    expect(getBossForStage(10)?.id).toBe('boss_gatebreaker');
    expect(getBossForStage(20)?.id).toBe('boss_plague_spitter');
    expect(getBossForStage(30)?.id).toBe('boss_alpha_mutant');
    expect(getBossForStage(40)?.id).toBe('boss_gatebreaker');
  });

  it('keeps boss-only source enemies out of regular wave data', () => {
    const wave = getStageWave(30);
    const enemyIds = wave.enemies.map((group) => group.enemyId);

    for (const bossOnlyEnemyId of BOSS_ONLY_ENEMY_IDS) {
      expect(enemyIds).not.toContain(bossOnlyEnemyId);
    }
  });
});


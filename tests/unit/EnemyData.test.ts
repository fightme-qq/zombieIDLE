import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/game/data/enemyData';

describe('enemy data', () => {
  it('defines nine enemies with unique combat roles', () => {
    expect(ENEMIES).toHaveLength(9);
    expect(new Set(ENEMIES.map((enemy) => enemy.id)).size).toBe(9);
    expect(new Set(ENEMIES.map((enemy) => enemy.role)).size).toBe(9);
  });

  it('gives role-defining stats to the five new enemies', () => {
    const byId = Object.fromEntries(ENEMIES.map((enemy) => [enemy.id, enemy]));

    expect(byId['zombie-runner'].speedBase).toBeGreaterThan(byId.zombie.speedBase);
    expect(byId['zombie-berserker'].damage).toBeGreaterThan(byId['zombie-bruiser'].damage);
    expect(byId['zombie-armored'].hpBase).toBeGreaterThan(byId['zombie-tank'].hpBase);
    expect(byId['zombie-crawler'].hpBase).toBeLessThan(byId.zombie.hpBase);
    expect(byId['zombie-mutant'].hpBase).toBeGreaterThan(byId['zombie-armored'].hpBase);
    expect(byId['zombie-runner'].walkFrameRate).toBe(12);
    expect(byId['zombie-crawler'].walkFrameRate).toBe(10);
    expect(byId['zombie-armored'].walkFrameRate).toBe(6);
  });
});

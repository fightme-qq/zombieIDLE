import { describe, expect, it } from 'vitest';
import {
  getBossHp,
  getEnemyStageStats,
  getZombieDamage,
  getZombieHp,
  getZombieSpeed,
} from '../../src/game/idle/EnemyScaling';

describe('EnemyScaling', () => {
  it('scales regular zombie HP by stage', () => {
    expect(getZombieHp(1, 'zombie')).toBe(28);
    expect(getZombieHp(2, 'zombie')).toBeGreaterThan(getZombieHp(1, 'zombie'));
    expect(getZombieHp(10, 'zombie')).toBeGreaterThan(getZombieHp(9, 'zombie'));
  });

  it('makes tougher zombie tiers meaningfully stronger', () => {
    expect(getZombieHp(1, 'zombie-bruiser')).toBeGreaterThan(getZombieHp(1, 'zombie'));
    expect(getZombieHp(1, 'zombie-toxic')).toBeGreaterThan(getZombieHp(1, 'zombie-bruiser'));
    expect(getZombieHp(1, 'zombie-tank')).toBeGreaterThan(getZombieHp(1, 'zombie-toxic'));
  });

  it('scales boss HP from the stage curve with a boss multiplier', () => {
    expect(getBossHp(10)).toBeGreaterThan(getZombieHp(10, 'zombie-tank'));
    expect(getBossHp(20)).toBeGreaterThan(getBossHp(10));
  });

  it('provides speed and damage pressure for battle systems', () => {
    expect(getZombieSpeed(10, 'zombie')).toBeGreaterThanOrEqual(getZombieSpeed(1, 'zombie'));
    expect(getZombieDamage(10, 'zombie')).toBeGreaterThan(getZombieDamage(1, 'zombie'));
  });

  it('applies distinct combat profiles to the new archetypes', () => {
    expect(getZombieSpeed(1, 'zombie-runner')).toBeGreaterThan(getZombieSpeed(1, 'zombie-crawler'));
    expect(getZombieHp(1, 'zombie-crawler')).toBeLessThan(getZombieHp(1, 'zombie'));
    expect(getZombieDamage(1, 'zombie-berserker')).toBeGreaterThan(getZombieDamage(1, 'zombie-tank'));
    expect(getZombieHp(1, 'zombie-armored')).toBeGreaterThan(getZombieHp(1, 'zombie-tank'));
    expect(getZombieHp(1, 'zombie-mutant')).toBeGreaterThan(getZombieHp(1, 'zombie-armored'));
  });

  it('creates a combined stage stat snapshot', () => {
    expect(getEnemyStageStats(1, 'zombie')).toEqual({
      enemyId: 'zombie',
      stage: 1,
      hp: 28,
      speed: 54,
      damage: 8,
    });
  });
});

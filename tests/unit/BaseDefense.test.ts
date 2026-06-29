import { describe, expect, it } from 'vitest';
import {
  BASE_DEFENSE_CONFIG,
  getArmorDamageReduction,
  getArmorRating,
  getEmergencyRepairHeal,
  getEmergencyRepairThreshold,
  getMitigatedBaseDamage,
} from '../../src/game/idle/BaseDefense';

describe('BaseDefense', () => {
  it('converts armor levels into armor rating', () => {
    expect(getArmorRating(0)).toBe(0);
    expect(getArmorRating(3)).toBe(24);
    expect(getArmorRating(8)).toBe(64);
  });

  it('uses stage pressure so the same armor is less dominant later', () => {
    const armorRating = getArmorRating(8);

    expect(getArmorDamageReduction(armorRating, 1)).toBeGreaterThan(getArmorDamageReduction(armorRating, 20));
  });

  it('caps damage reduction to prevent immortal bunker builds', () => {
    expect(getArmorDamageReduction(9999, 1)).toBe(BASE_DEFENSE_CONFIG.armorMaxReduction);
  });

  it('mitigates base damage with at least one incoming damage', () => {
    expect(getMitigatedBaseDamage(16, getArmorRating(0), 1)).toBe(16);
    expect(getMitigatedBaseDamage(16, getArmorRating(8), 1)).toBeLessThan(16);
    expect(getMitigatedBaseDamage(1, getArmorRating(20), 1)).toBe(1);
  });

  it('scales emergency repair by max bunker hp and level', () => {
    expect(getEmergencyRepairThreshold(100)).toBe(25);
    expect(getEmergencyRepairHeal(100, 0)).toBe(0);
    expect(getEmergencyRepairHeal(100, 1)).toBe(30);
    expect(getEmergencyRepairHeal(100, 3)).toBe(40);
    expect(getEmergencyRepairHeal(200, 1)).toBe(60);
  });
});

import { describe, expect, it } from 'vitest';
import {
  createWeaponProgress,
  getEquippedWeaponDps,
  getEquippedWeaponIds,
  getWeaponComputedStats,
  getWeaponDamage,
  getWeaponDps,
  getWeaponStatUpgradeCost,
} from '../../src/game/idle/WeaponStats';
import { RunState, STARTER_WEAPON_ID } from '../../src/game/state/RunState';

describe('WeaponStats', () => {
  it('derives equipped weapons from grid placements', () => {
    const state = new RunState();

    expect(getEquippedWeaponIds(state.placedWeapons)).toEqual([STARTER_WEAPON_ID]);
    expect(state.equippedWeaponIds).toEqual([STARTER_WEAPON_ID]);
  });

  it('reports non-zero DPS for the starter pistol', () => {
    const state = new RunState();

    expect(getWeaponDps(STARTER_WEAPON_ID)).toBeGreaterThan(0);
    expect(state.equippedDps).toBeGreaterThan(0);
  });

  it('changes DPS as weapons are added or removed from the grid', () => {
    const state = new RunState();
    const starterDps = state.equippedDps;

    expect(state.placeWeapon('pistol', 2, 0, 0)).toBe(true);
    expect(state.equippedDps).toBeGreaterThan(starterDps);

    const pistolPlacement = state.placedWeapons.find((weapon) => weapon.weaponId === 'pistol');
    expect(pistolPlacement).toBeDefined();
    state.removeWeaponById(pistolPlacement!.id);

    expect(state.equippedDps).toBe(starterDps);
    expect(getEquippedWeaponDps([])).toBe(0);
  });

  it('increases weapon damage and DPS by level', () => {
    const baseProgress = createWeaponProgress(true);
    const upgradedProgress = createWeaponProgress(true);
    upgradedProgress.stats.damage = 1;
    upgradedProgress.stats.fireRate = 1;
    upgradedProgress.stats.special = 1;

    expect(getWeaponStatUpgradeCost(STARTER_WEAPON_ID, 'damage', 0)).toBe(35);
    expect(getWeaponStatUpgradeCost(STARTER_WEAPON_ID, 'damage', 1)).toBeGreaterThan(getWeaponStatUpgradeCost(STARTER_WEAPON_ID, 'damage', 0)!);
    expect(getWeaponDamage(STARTER_WEAPON_ID, upgradedProgress)).toBeGreaterThan(getWeaponDamage(STARTER_WEAPON_ID, baseProgress));
    expect(getWeaponDps(STARTER_WEAPON_ID, upgradedProgress)).toBeGreaterThan(getWeaponDps(STARTER_WEAPON_ID, baseProgress));
  });

  it('does not turn pistols into spread weapons through special upgrades', () => {
    const progress = createWeaponProgress(true);
    progress.stats.special = 5;

    expect(getWeaponComputedStats('pistol', progress).spread).toBe(1);
    expect(getWeaponComputedStats('shotgun', progress).spread).toBeGreaterThan(getWeaponComputedStats('shotgun').spread);
  });
});

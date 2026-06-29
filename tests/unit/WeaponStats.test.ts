import { describe, expect, it } from 'vitest';
import { getEnemyStageStats } from '../../src/game/idle/EnemyScaling';
import {
  createWeaponProgress,
  getEquippedWeaponDps,
  getEquippedWeaponIds,
  getWeaponComputedStats,
  getWeaponDamage,
  getWeaponDps,
  getWeaponSpecialEffectLabel,
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

    expect(getWeaponStatUpgradeCost(STARTER_WEAPON_ID, 'damage', 0)).toBe(95);
    expect(getWeaponStatUpgradeCost(STARTER_WEAPON_ID, 'damage', 1)).toBeGreaterThan(getWeaponStatUpgradeCost(STARTER_WEAPON_ID, 'damage', 0)!);
    expect(getWeaponDamage(STARTER_WEAPON_ID, upgradedProgress)).toBeGreaterThan(getWeaponDamage(STARTER_WEAPON_ID, baseProgress));
    expect(getWeaponDps(STARTER_WEAPON_ID, upgradedProgress)).toBeGreaterThan(getWeaponDps(STARTER_WEAPON_ID, baseProgress));
  });

  it('turns pistol special into double tap instead of spread', () => {
    const progress = createWeaponProgress(true);
    progress.stats.special = 5;

    expect(getWeaponComputedStats('pistol', progress).spread).toBe(1);
    expect(getWeaponComputedStats('pistol', progress).doubleTapInterval).toBe(3);
    expect(getWeaponComputedStats('shotgun', progress).spread).toBeGreaterThan(getWeaponComputedStats('shotgun').spread);
  });

  it('keeps grenade shots single while special upgrades blast radius', () => {
    const progress = createWeaponProgress(true);
    progress.stats.special = 2;

    expect(getWeaponComputedStats('grenadeLauncher').spread).toBe(1);
    expect(getWeaponComputedStats('grenadeLauncher', progress).spread).toBe(1);
    expect(getWeaponComputedStats('grenadeLauncher', progress).grenadeRadius).toBeGreaterThan(getWeaponComputedStats('grenadeLauncher').grenadeRadius);
  });

  it('exposes per-weapon special combat parameters', () => {
    const progress = createWeaponProgress(true);
    progress.stats.special = 5;

    expect(getWeaponComputedStats('tesla', progress).teslaChainJumps).toBe(3);
    expect(getWeaponComputedStats('assaultRifle', progress).focusMaxStacks).toBe(14);
    expect(getWeaponComputedStats('sniperRifle', progress).pierceCount).toBe(3);
    expect(getWeaponSpecialEffectLabel('sniperRifle', 5)).toContain('pierces');
  });

  it('exposes magazine and reload stats for weapon rhythm', () => {
    expect(getWeaponComputedStats('pistol').magazineSize).toBe(10);
    expect(getWeaponComputedStats('pistol').reloadMs).toBe(1150);
    expect(getWeaponComputedStats('grenadeLauncher').magazineSize).toBe(1);
    expect(getWeaponComputedStats('tesla').magazineSize).toBe(0);
  });

  it('derives weapon range and increases it with range upgrades', () => {
    const baseStats = getWeaponComputedStats('pistol');
    const progress = createWeaponProgress(true);
    progress.stats.range = 2;

    expect(baseStats.rangePx).toBe(220);
    expect(getWeaponComputedStats('pistol', progress).rangePx).toBeGreaterThan(baseStats.rangePx);
    expect(getWeaponStatUpgradeCost('pistol', 'range', 0)).toBe(120);
  });

  it('scales weapon range toward class-specific caps', () => {
    const maxed = createWeaponProgress(true);
    maxed.stats.range = 8;

    expect(getWeaponComputedStats('pistol', maxed).rangePx).toBe(430);
    expect(getWeaponComputedStats('grenadeLauncher', maxed).rangePx).toBe(430);
    expect(getWeaponComputedStats('assaultRifle').rangePx).toBe(290);
    expect(getWeaponComputedStats('assaultRifle', maxed).rangePx).toBe(720);
    expect(getWeaponComputedStats('sniperRifle').rangePx).toBe(430);
    expect(getWeaponComputedStats('sniperRifle', maxed).rangePx).toBe(720);
  });

  it('keeps grenade launcher default and max range close like pistols', () => {
    const maxed = createWeaponProgress(true);
    maxed.stats.range = 8;

    expect(getWeaponComputedStats('grenadeLauncher').rangePx).toBe(getWeaponComputedStats('pistol').rangePx);
    expect(getWeaponComputedStats('grenadeLauncher', maxed).rangePx).toBe(getWeaponComputedStats('pistol', maxed).rangePx);
  });

  it('derives crit chance with a default 150% crit multiplier', () => {
    const progress = createWeaponProgress(true);
    progress.stats.critChance = 4;

    const stats = getWeaponComputedStats('pistol', progress);

    expect(stats.critChance).toBeCloseTo(0.12);
    expect(stats.critMultiplier).toBe(1.5);
    expect(getWeaponStatUpgradeCost('pistol', 'critChance', 0)).toBe(160);
  });

  it('lets a basic stage 1 zombie reach the base before one pistol can kill it', () => {
    const pistol = getWeaponComputedStats('pistol');
    const zombie = getEnemyStageStats(1, 'zombie');
    const mountY = 808;
    const bunkerLineY = 758;
    const shotsToKill = Math.ceil(zombie.hp / pistol.damage);
    const timeToLethalShotMs = (shotsToKill - 1) * pistol.cooldownMs;
    const timeFromRangeToBaseMs = ((bunkerLineY - (mountY - pistol.rangePx)) / zombie.speed) * 1000;

    expect(timeToLethalShotMs).toBeGreaterThan(timeFromRangeToBaseMs);
  });
});

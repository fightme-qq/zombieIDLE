import { describe, expect, it } from 'vitest';
import { WEAPON_POOL } from '../../src/game/data/weaponData';
import { getWeaponShape, RunState, STARTER_WEAPON_ID } from '../../src/game/state/RunState';

function sortCells(cells: Array<{ col: number; row: number }>): Array<{ col: number; row: number }> {
  return [...cells].sort((a, b) => a.row - b.row || a.col - b.col);
}

describe('RunState weapon rotation', () => {
  it('starts new runs with a starter pistol on the first active grid cell', () => {
    const state = new RunState();

    expect(state.gridCols).toBe(6);
    expect(state.gridRows).toBe(2);
    expect(state.activeCells).toBe(12);
    expect(state.placedWeapons).toEqual([
      {
        id: 1,
        weaponId: STARTER_WEAPON_ID,
        col: 0,
        row: 0,
        rotation: 0,
        level: 1,
      },
    ]);
    expect(state.placedWeaponIds).toEqual([STARTER_WEAPON_ID]);
    expect(state.occupiedCells).toEqual(new Set(['0:0', '1:0', '0:1']));
  });

  it('matches the starter pistol footprint to the regular pistol footprint', () => {
    expect(sortCells(getWeaponShape(STARTER_WEAPON_ID, 0))).toEqual(sortCells(getWeaponShape('pistol', 0)));
    expect(sortCells(getWeaponShape(STARTER_WEAPON_ID, 1))).toEqual(sortCells(getWeaponShape('pistol', 1)));
  });

  it('spends soft only when a bought weapon can be placed', () => {
    const state = new RunState({ includeStarterPistol: false });
    state.soft = 110;

    expect(state.buyAndPlaceWeapon('pistol', 5, 0, 0)).toBe(false);
    expect(state.soft).toBe(110);
    expect(state.placedWeapons).toEqual([]);

    expect(state.isWeaponUnlocked('pistol')).toBe(true);
    expect(state.buyAndPlaceWeapon('pistol', 0, 0, 0)).toBe(true);
    expect(state.soft).toBe(0);
    expect(state.placedWeaponIds).toEqual(['pistol']);
  });

  it('blocks weapon purchases when soft is too low', () => {
    const state = new RunState({ includeStarterPistol: false });
    state.soft = 109;

    expect(state.canAffordWeapon('pistol')).toBe(false);
    expect(state.buyAndPlaceWeapon('pistol', 0, 0, 0)).toBe(false);
    expect(state.soft).toBe(109);
  });

  it('unlocks early weapons with soft currency', () => {
    const state = new RunState({ includeStarterPistol: false });
    state.soft = 180;

    expect(state.unlockWeapon('shotgun')).toBe(true);
    expect(state.isWeaponUnlocked('shotgun')).toBe(true);
    expect(state.soft).toBe(0);
  });

  it('unlocks advanced weapons with boss tokens instead of soft currency', () => {
    const state = new RunState({ includeStarterPistol: false });
    state.soft = 1000;
    state.hard = 11;

    expect(state.canAffordUnlock('tesla')).toBe(false);
    expect(state.unlockWeapon('tesla')).toBe(false);
    expect(state.soft).toBe(1000);
    expect(state.hard).toBe(11);

    state.hard = 12;

    expect(state.canAffordUnlock('tesla')).toBe(true);
    expect(state.unlockWeapon('tesla')).toBe(true);
    expect(state.isWeaponUnlocked('tesla')).toBe(true);
    expect(state.soft).toBe(1000);
    expect(state.hard).toBe(0);
  });

  it('upgrades a placed weapon with soft', () => {
    const state = new RunState();
    state.soft = 95;
    const starter = state.placedWeapons[0];

    expect(state.getWeaponUpgradeCost(starter.id)).toBe(95);
    expect(state.upgradeWeapon(starter.id)).toBe(true);
    expect(state.getWeaponProgress(starter.weaponId).stats.damage).toBe(1);
    expect(state.soft).toBe(0);
  });

  it('blocks weapon upgrades when soft is too low', () => {
    const state = new RunState();
    state.soft = 94;
    const starter = state.placedWeapons[0];

    expect(state.upgradeWeapon(starter.id)).toBe(false);
    expect(state.getWeaponProgress(starter.weaponId).stats.damage).toBe(0);
    expect(state.soft).toBe(94);
  });

  it('buys grid cells one at a time with a growing price', () => {
    const state = new RunState();
    state.soft = 400;

    expect(state.getNextGridCellCost()).toBe(110);
    expect(state.buyGridCell()).toBe(true);
    expect(state.activeCells).toBe(13);
    expect(state.soft).toBe(290);
    expect(state.getNextGridCellCost()).toBe(124);

    expect(state.buyGridCell()).toBe(true);
    expect(state.activeCells).toBe(14);
    expect(state.soft).toBe(166);
    expect(state.getNextGridCellCost()).toBe(138);
  });

  it('buys bunker hp and armor with production prices', () => {
    const state = new RunState();
    state.soft = 225;

    expect(state.getBunkerHpCost()).toBe(100);
    expect(state.buyBunkerHp()).toBe(true);
    expect(state.maxBunkerHp).toBe(120);
    expect(state.soft).toBe(125);

    expect(state.getBaseArmorCost()).toBe(125);
    expect(state.buyBaseArmor()).toBe(true);
    expect(state.baseArmorLevel).toBe(1);
    expect(state.baseArmor).toBe(8);
    expect(state.soft).toBe(0);
  });

  it('buys emergency repair as a capped defensive upgrade', () => {
    const state = new RunState();
    state.soft = 180;

    expect(state.getEmergencyRepairCost()).toBe(180);
    expect(state.buyEmergencyRepair()).toBe(true);
    expect(state.emergencyRepairLevel).toBe(1);
    expect(state.soft).toBe(0);
    expect(state.getEmergencyRepairCost()).toBe(279);
  });

  it('tracks current and highest stage progress', () => {
    const state = new RunState();

    expect(state.currentStage).toBe(1);
    expect(state.highestStage).toBe(1);
    expect(state.advanceStage()).toBe(2);
    expect(state.currentStage).toBe(2);
    expect(state.highestStage).toBe(2);
    expect(state.advanceStage()).toBe(3);
    expect(state.highestStage).toBe(3);
  });

  it('tracks defeated zombies and bosses separately', () => {
    const state = new RunState();

    state.recordBattleKills(6, false);
    state.recordBattleKills(1, true);

    expect(state.zombieKills).toBe(6);
    expect(state.bossKills).toBe(1);
  });

  it('matches pistol footprint to the pistol sprite silhouette', () => {
    expect(sortCells(getWeaponShape('pistol', 0))).toEqual([
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 0, row: 1 },
    ]);

    expect(sortCells(getWeaponShape('pistol', 1))).toEqual([
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 1, row: 1 },
    ]);

    expect(sortCells(getWeaponShape('pistol', 2))).toEqual([
      { col: 1, row: 0 },
      { col: 0, row: 1 },
      { col: 1, row: 1 },
    ]);

    expect(sortCells(getWeaponShape('pistol', 3))).toEqual([
      { col: 0, row: 0 },
      { col: 0, row: 1 },
      { col: 1, row: 1 },
    ]);
  });

  it('rotates weapon shapes in grid cells', () => {
    expect(sortCells(getWeaponShape('shotgun', 0))).toEqual([
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
    ]);

    expect(sortCells(getWeaponShape('shotgun', 1))).toEqual([
      { col: 0, row: 0 },
      { col: 0, row: 1 },
      { col: 0, row: 2 },
    ]);
  });

  it('places rotated weapons with their rotated footprint', () => {
    const state = new RunState({ includeStarterPistol: false });

    expect(state.canPlaceWeapon('shotgun', 4, 0, 0)).toBe(false);
    expect(state.canPlaceWeapon('pistol', 0, 0, 1)).toBe(true);
    expect(state.placeWeapon('pistol', 0, 0, 1)).toBe(true);
    expect(state.occupiedCells).toEqual(new Set(['0:0', '1:0', '1:1']));
  });

  it('cheat equips one of every weapon for projectile testing', () => {
    const state = new RunState();

    expect(state.cheatEquipEveryWeapon()).toBe(WEAPON_POOL.length);
    expect(state.gridCols).toBe(state.maxGridCols);
    expect(state.gridRows).toBe(state.maxGridRows);
    expect(state.activeCells).toBe(state.maxGridCols * state.maxGridRows);
    expect(state.placedWeaponIds).toEqual(WEAPON_POOL);
    expect(WEAPON_POOL.every((weaponId) => state.isWeaponUnlocked(weaponId))).toBe(true);
  });
});

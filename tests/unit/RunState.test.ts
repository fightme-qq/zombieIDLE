import { describe, expect, it } from 'vitest';
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
    state.soft = 40;

    expect(state.buyAndPlaceWeapon('pistol', 5, 0, 0)).toBe(false);
    expect(state.soft).toBe(40);
    expect(state.placedWeapons).toEqual([]);

    expect(state.isWeaponUnlocked('pistol')).toBe(true);
    expect(state.buyAndPlaceWeapon('pistol', 0, 0, 0)).toBe(true);
    expect(state.soft).toBe(0);
    expect(state.placedWeaponIds).toEqual(['pistol']);
  });

  it('blocks weapon purchases when soft is too low', () => {
    const state = new RunState({ includeStarterPistol: false });
    state.soft = 39;

    expect(state.canAffordWeapon('pistol')).toBe(false);
    expect(state.buyAndPlaceWeapon('pistol', 0, 0, 0)).toBe(false);
    expect(state.soft).toBe(39);
  });

  it('upgrades a placed weapon with soft', () => {
    const state = new RunState();
    state.soft = 35;
    const starter = state.placedWeapons[0];

    expect(state.getWeaponUpgradeCost(starter.id)).toBe(35);
    expect(state.upgradeWeapon(starter.id)).toBe(true);
    expect(state.getWeaponProgress(starter.weaponId).stats.damage).toBe(1);
    expect(state.soft).toBe(0);
  });

  it('blocks weapon upgrades when soft is too low', () => {
    const state = new RunState();
    state.soft = 34;
    const starter = state.placedWeapons[0];

    expect(state.upgradeWeapon(starter.id)).toBe(false);
    expect(state.getWeaponProgress(starter.weaponId).stats.damage).toBe(0);
    expect(state.soft).toBe(34);
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
});

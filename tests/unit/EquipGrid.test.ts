import { describe, expect, it } from 'vitest';
import {
  canPlaceWeapon,
  getOccupiedCells,
  getWeaponShape,
  isCellActive,
  rotateWeaponRotation,
  weaponAtCell,
  type EquipGridState,
} from '../../src/game/idle/EquipGrid';

function testGrid(overrides: Partial<EquipGridState> = {}): EquipGridState {
  return {
    cols: 6,
    rows: 2,
    activeCells: 12,
    placedWeapons: [],
    ...overrides,
  };
}

function sortCells(cells: Array<{ col: number; row: number }>): Array<{ col: number; row: number }> {
  return [...cells].sort((a, b) => a.row - b.row || a.col - b.col);
}

describe('EquipGrid', () => {
  it('rotates weapon shapes without mutating the catalog shape', () => {
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
    expect(sortCells(getWeaponShape('pistol', 0))).toEqual([
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 0, row: 1 },
    ]);
  });

  it('cycles rotations in quarter turns', () => {
    expect(rotateWeaponRotation(0)).toBe(1);
    expect(rotateWeaponRotation(1)).toBe(2);
    expect(rotateWeaponRotation(2)).toBe(3);
    expect(rotateWeaponRotation(3)).toBe(0);
  });

  it('tracks active cells row-major inside visible bounds', () => {
    const grid = testGrid({ activeCells: 7 });

    expect(isCellActive(grid, 0, 0)).toBe(true);
    expect(isCellActive(grid, 5, 0)).toBe(true);
    expect(isCellActive(grid, 0, 1)).toBe(true);
    expect(isCellActive(grid, 1, 1)).toBe(false);
    expect(isCellActive(grid, -1, 0)).toBe(false);
    expect(isCellActive(grid, 6, 0)).toBe(false);
  });

  it('rejects placement outside active cells or on occupied cells', () => {
    const grid = testGrid({
      activeCells: 12,
      placedWeapons: [{ id: 1, weaponId: 'starter_pistol', col: 0, row: 0, rotation: 0, level: 1 }],
    });

    expect(canPlaceWeapon(grid, 'starter_pistol', 0, 0)).toBe(false);
    expect(canPlaceWeapon(grid, 'starter_pistol', 1, 0)).toBe(false);
    expect(canPlaceWeapon(grid, 'starter_pistol', 2, 0)).toBe(true);
    expect(canPlaceWeapon(grid, 'shotgun', 4, 0)).toBe(false);
  });

  it('finds occupied cells and placed weapons by any footprint cell', () => {
    const placedWeapons = [{ id: 7, weaponId: 'pistol' as const, col: 1, row: 0, rotation: 0 as const, level: 1 }];

    expect(getOccupiedCells(placedWeapons)).toEqual(new Set(['1:0', '2:0', '1:1']));
    expect(weaponAtCell(placedWeapons, 2, 0)?.id).toBe(7);
    expect(weaponAtCell(placedWeapons, 0, 0)).toBeUndefined();
  });
});

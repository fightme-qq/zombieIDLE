import { describe, expect, it } from 'vitest';
import { ROAD_BOUNDS } from '../../src/game/config/roadBounds';
import { getBunkerWeaponMount } from '../../src/game/idle/BunkerMounts';
import type { PlacedWeapon } from '../../src/game/idle/EquipGrid';

function weaponAt(col: number, row: number): PlacedWeapon {
  return { id: row * 100 + col, weaponId: 'pistol', col, row, rotation: 0, level: 1 };
}

describe('BunkerMounts', () => {
  it('maps grid columns to mount points inside road/bunker width', () => {
    const grid = { cols: 15, rows: 15 };
    const viewport = { width: 1600, height: 900 };
    const left = getBunkerWeaponMount(weaponAt(0, 0), grid, viewport);
    const right = getBunkerWeaponMount(weaponAt(14, 0), grid, viewport);

    expect(left.x).toBeGreaterThanOrEqual(ROAD_BOUNDS.left);
    expect(right.x).toBeLessThanOrEqual(ROAD_BOUNDS.right);
    expect(right.x).toBeGreaterThan(left.x);
  });

  it('uses row placement for a small vertical muzzle offset', () => {
    const grid = { cols: 15, rows: 15 };
    const viewport = { width: 1600, height: 900 };
    const top = getBunkerWeaponMount(weaponAt(5, 0), grid, viewport);
    const bottom = getBunkerWeaponMount(weaponAt(5, 14), grid, viewport);

    expect(bottom.y).toBeGreaterThan(top.y);
  });
});


import { ROAD_BOUNDS } from '../config/roadBounds';
import { getWeaponShape, type PlacedWeapon } from './EquipGrid';

export type BunkerMountGrid = {
  cols: number;
  rows: number;
};

export type BunkerMountViewport = {
  width: number;
  height: number;
};

export type BunkerWeaponMount = {
  x: number;
  y: number;
};

type MountableWeaponPlacement = Pick<PlacedWeapon, 'weaponId' | 'col' | 'row' | 'rotation'>;

const BUNKER_FIRE_MARGIN_X = 42;
const BUNKER_FIRE_Y = 108;
const BUNKER_FIRE_ROW_SPREAD = 34;

export function getBunkerWeaponMount(placement: MountableWeaponPlacement, grid: BunkerMountGrid, viewport: BunkerMountViewport): BunkerWeaponMount {
  const shape = getWeaponShape(placement.weaponId, placement.rotation);
  const maxCol = Math.max(...shape.map((cell) => cell.col));
  const maxRow = Math.max(...shape.map((cell) => cell.row));
  const centerCol = placement.col + (maxCol + 1) / 2;
  const centerRow = placement.row + (maxRow + 1) / 2;
  const colT = clamp(centerCol / Math.max(1, grid.cols), 0, 1);
  const rowT = clamp(centerRow / Math.max(1, grid.rows), 0, 1);
  const left = ROAD_BOUNDS.left + BUNKER_FIRE_MARGIN_X;
  const right = ROAD_BOUNDS.right - BUNKER_FIRE_MARGIN_X;

  return {
    x: left + (right - left) * colT,
    y: viewport.height - BUNKER_FIRE_Y + (rowT - 0.5) * BUNKER_FIRE_ROW_SPREAD,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

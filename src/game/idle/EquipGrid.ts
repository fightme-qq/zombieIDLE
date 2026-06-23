import { WEAPONS, type WeaponId } from '../data/weaponData';

export type WeaponRotation = 0 | 1 | 2 | 3;

export type WeaponCell = {
  col: number;
  row: number;
};

export type PlacedWeapon = {
  id: number;
  weaponId: WeaponId;
  col: number;
  row: number;
  rotation: WeaponRotation;
  level: number;
};

export type EquipGridState = {
  cols: number;
  rows: number;
  activeCells: number;
  placedWeapons: readonly PlacedWeapon[];
};

export function rotateWeaponRotation(rotation: WeaponRotation): WeaponRotation {
  return ((rotation + 1) % 4) as WeaponRotation;
}

export function getWeaponShape(weaponId: WeaponId, rotation: WeaponRotation = 0): WeaponCell[] {
  let shape = WEAPONS[weaponId].shape.map((cell) => ({ col: cell.col, row: cell.row }));

  for (let turn = 0; turn < rotation; turn += 1) {
    shape = shape.map((cell) => ({ col: -cell.row, row: cell.col }));
    const minCol = Math.min(...shape.map((cell) => cell.col));
    const minRow = Math.min(...shape.map((cell) => cell.row));
    shape = shape.map((cell) => ({ col: cell.col - minCol, row: cell.row - minRow }));
  }

  return shape;
}

export function getOccupiedCells(placedWeapons: readonly PlacedWeapon[]): Set<string> {
  const cells = new Set<string>();

  for (const placement of placedWeapons) {
    for (const cell of getWeaponShape(placement.weaponId, placement.rotation)) {
      cells.add(getCellKey(placement.col + cell.col, placement.row + cell.row));
    }
  }

  return cells;
}

export function isCellActive(grid: Pick<EquipGridState, 'cols' | 'rows' | 'activeCells'>, col: number, row: number): boolean {
  if (col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) return false;
  return row * grid.cols + col < grid.activeCells;
}

export function canPlaceWeapon(
  grid: EquipGridState,
  weaponId: WeaponId,
  col: number,
  row: number,
  rotation: WeaponRotation = 0,
): boolean {
  const occupied = getOccupiedCells(grid.placedWeapons);

  return getWeaponShape(weaponId, rotation).every((cell) => {
    const targetCol = col + cell.col;
    const targetRow = row + cell.row;
    return isCellActive(grid, targetCol, targetRow) && !occupied.has(getCellKey(targetCol, targetRow));
  });
}

export function weaponAtCell(placedWeapons: readonly PlacedWeapon[], col: number, row: number): PlacedWeapon | undefined {
  return placedWeapons.find((placement) =>
    getWeaponShape(placement.weaponId, placement.rotation).some((cell) => placement.col + cell.col === col && placement.row + cell.row === row),
  );
}

export function getCellKey(col: number, row: number): string {
  return `${col}:${row}`;
}

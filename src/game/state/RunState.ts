import { WEAPONS, WEAPON_POOL, type WeaponId, type WeaponUpgradeStatId } from '../data/weaponData';
import { IDLE_GRID_CONFIG } from '../data/idleContent';
import {
  canPlaceWeapon as canPlaceWeaponOnGrid,
  getOccupiedCells,
  getWeaponShape,
  rotateWeaponRotation,
  weaponAtCell,
  type PlacedWeapon,
  type WeaponCell,
  type WeaponRotation,
} from '../idle/EquipGrid';
import { getGridSizeForActiveCells, getNextCellPurchase } from '../idle/Economy';
import { getStageAfterFailure, getStageAfterWin } from '../idle/StageProgression';
import { createWeaponProgress, getEquippedWeaponDps, getEquippedWeaponIds, getWeaponStatUpgradeCost, type WeaponProgress } from '../idle/WeaponStats';

export { getWeaponShape, rotateWeaponRotation, type PlacedWeapon, type WeaponCell, type WeaponRotation };

export type RunStateOptions = {
  includeStarterPistol?: boolean;
};

export const STARTER_WEAPON_ID: WeaponId = 'pistol';

export class RunState {
  soft = 1000;
  hard = 25;
  currentStage = 1;
  highestStage = 1;
  maxBunkerHp = 100;
  gridCols: number = IDLE_GRID_CONFIG.startCols;
  gridRows: number = IDLE_GRID_CONFIG.startRows;
  activeCells: number = IDLE_GRID_CONFIG.startCols * IDLE_GRID_CONFIG.startRows;
  rareChanceLevel = 0;

  readonly maxGridCols = IDLE_GRID_CONFIG.maxCols;
  readonly maxGridRows = IDLE_GRID_CONFIG.maxRows;
  readonly placedWeapons: PlacedWeapon[] = [];
  readonly weaponProgress: Record<WeaponId, WeaponProgress>;
  private nextPlacementId = 1;

  constructor(options: RunStateOptions = {}) {
    this.weaponProgress = this.createInitialWeaponProgress();
    if (options.includeStarterPistol ?? true) {
      this.placeWeapon(STARTER_WEAPON_ID, 0, 0, 0);
    }
  }

  get gridSize(): number {
    return this.gridCols * this.gridRows;
  }

  get placedWeaponIds(): WeaponId[] {
    return this.equippedWeaponIds;
  }

  get equippedWeaponIds(): WeaponId[] {
    return getEquippedWeaponIds(this.placedWeapons);
  }

  get equippedDps(): number {
    return getEquippedWeaponDps(this.placedWeapons, (weaponId) => this.getWeaponProgress(weaponId));
  }

  get unlockedWeaponPool(): WeaponId[] {
    return WEAPON_POOL.filter((weaponId) => this.isWeaponUnlocked(weaponId));
  }

  advanceStage(): number {
    this.currentStage = getStageAfterWin(this.currentStage);
    this.highestStage = Math.max(this.highestStage, this.currentStage);
    return this.currentStage;
  }

  resetToCheckpoint(): number {
    this.currentStage = getStageAfterFailure(this.currentStage);
    return this.currentStage;
  }

  get occupiedCells(): Set<string> {
    return getOccupiedCells(this.placedWeapons);
  }

  placeWeapon(weaponId: WeaponId, col: number, row: number, rotation: WeaponRotation = 0): boolean {
    return this.placeWeaponWithLevel(weaponId, col, row, rotation, 1);
  }

  placeWeaponWithLevel(weaponId: WeaponId, col: number, row: number, rotation: WeaponRotation = 0, level = 1): boolean {
    if (!this.canPlaceWeapon(weaponId, col, row, rotation) || !Number.isInteger(level) || level < 1) return false;
    this.placedWeapons.push({ id: this.nextPlacementId, weaponId, col, row, rotation, level });
    this.nextPlacementId += 1;
    return true;
  }

  buyAndPlaceWeapon(weaponId: WeaponId, col: number, row: number, rotation: WeaponRotation = 0): boolean {
    const cost = WEAPONS[weaponId].softCost;
    if (!this.isWeaponUnlocked(weaponId) || this.soft < cost || !this.canPlaceWeapon(weaponId, col, row, rotation)) return false;
    this.soft -= cost;
    return this.placeWeapon(weaponId, col, row, rotation);
  }

  canAffordWeapon(weaponId: WeaponId): boolean {
    return this.isWeaponUnlocked(weaponId) && this.soft >= WEAPONS[weaponId].softCost;
  }

  spendSoft(cost: number): boolean {
    if (cost < 0 || this.soft < cost) return false;
    this.soft -= cost;
    return true;
  }

  getWeaponUpgradeCost(id: number): number | null {
    const weapon = this.placedWeapons.find((placement) => placement.id === id);
    return weapon ? this.getWeaponStatUpgradeCost(weapon.weaponId, 'damage') : null;
  }

  upgradeWeapon(id: number): boolean {
    const weapon = this.placedWeapons.find((placement) => placement.id === id);
    if (!weapon) return false;
    return this.upgradeWeaponStat(weapon.weaponId, 'damage');
  }

  isWeaponUnlocked(weaponId: WeaponId): boolean {
    return this.getWeaponProgress(weaponId).unlocked;
  }

  getWeaponProgress(weaponId: WeaponId): WeaponProgress {
    return this.weaponProgress[weaponId] ?? createWeaponProgress(false);
  }

  unlockWeapon(weaponId: WeaponId): boolean {
    const progress = this.getWeaponProgress(weaponId);
    if (progress.unlocked) return false;
    if (!this.spendSoft(WEAPONS[weaponId].unlockCost)) return false;
    progress.unlocked = true;
    return true;
  }

  getWeaponStatUpgradeCost(weaponId: WeaponId, statId: WeaponUpgradeStatId): number | null {
    const progress = this.getWeaponProgress(weaponId);
    if (!progress.unlocked) return null;
    return getWeaponStatUpgradeCost(weaponId, statId, progress.stats[statId]);
  }

  upgradeWeaponStat(weaponId: WeaponId, statId: WeaponUpgradeStatId): boolean {
    const progress = this.getWeaponProgress(weaponId);
    const cost = this.getWeaponStatUpgradeCost(weaponId, statId);
    if (!progress.unlocked || cost === null || !this.spendSoft(cost)) return false;
    progress.stats[statId] += 1;
    return true;
  }

  removeWeaponAt(col: number, row: number): boolean {
    const index = this.placedWeapons.findIndex((placement) =>
      getWeaponShape(placement.weaponId, placement.rotation).some((cell) => placement.col + cell.col === col && placement.row + cell.row === row),
    );
    if (index < 0) return false;
    this.placedWeapons.splice(index, 1);
    return true;
  }

  removeWeaponById(id: number): PlacedWeapon | null {
    const index = this.placedWeapons.findIndex((placement) => placement.id === id);
    if (index < 0) return null;
    return this.placedWeapons.splice(index, 1)[0];
  }

  weaponAt(col: number, row: number): PlacedWeapon | undefined {
    return weaponAtCell(this.placedWeapons, col, row);
  }

  canPlaceWeapon(weaponId: WeaponId, col: number, row: number, rotation: WeaponRotation = 0): boolean {
    return canPlaceWeaponOnGrid(this.toEquipGridState(), weaponId, col, row, rotation);
  }

  isCellActive(col: number, row: number): boolean {
    if (col < 0 || row < 0 || col >= this.gridCols || row >= this.gridRows) return false;
    return row * this.gridCols + col < this.activeCells;
  }

  buyBunkerHp(): boolean {
    if (this.soft < 25) return false;
    this.soft -= 25;
    this.maxBunkerHp += 20;
    return true;
  }

  buyGridCell(): boolean {
    const purchase = getNextCellPurchase(this.activeCells);
    if (!purchase.canBuy || purchase.cost === null || this.soft < purchase.cost) return false;
    this.soft -= purchase.cost;
    this.activeCells = purchase.nextActiveCells;
    const gridSize = getGridSizeForActiveCells(this.activeCells);
    this.gridCols = gridSize.cols;
    this.gridRows = gridSize.rows;

    return true;
  }

  getNextGridCellCost(): number | null {
    return getNextCellPurchase(this.activeCells).cost;
  }

  buyRareChance(): boolean {
    if (this.soft < 25 || this.rareChanceLevel >= 5) return false;
    this.soft -= 25;
    this.rareChanceLevel += 1;
    return true;
  }

  private cellKey(col: number, row: number): string {
    return `${col}:${row}`;
  }

  private toEquipGridState(): { cols: number; rows: number; activeCells: number; placedWeapons: readonly PlacedWeapon[] } {
    return {
      cols: this.gridCols,
      rows: this.gridRows,
      activeCells: this.activeCells,
      placedWeapons: this.placedWeapons,
    };
  }

  private createInitialWeaponProgress(): Record<WeaponId, WeaponProgress> {
    const progress = {} as Record<WeaponId, WeaponProgress>;
    (Object.keys(WEAPONS) as WeaponId[]).forEach((weaponId) => {
      progress[weaponId] = createWeaponProgress(weaponId === STARTER_WEAPON_ID);
    });
    return progress;
  }
}

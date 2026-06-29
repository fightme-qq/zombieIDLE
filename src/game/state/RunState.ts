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
import { getArmorRating } from '../idle/BaseDefense';
import { getStageAfterFailure, getStageAfterWin } from '../idle/StageProgression';
import { createWeaponProgress, getEquippedWeaponDps, getEquippedWeaponIds, getWeaponStatUpgradeCost, type WeaponProgress } from '../idle/WeaponStats';

export { getWeaponShape, rotateWeaponRotation, type PlacedWeapon, type WeaponCell, type WeaponRotation };

export type RunStateOptions = {
  includeStarterPistol?: boolean;
};

export type RunStateSnapshot = {
  version: 1;
  soft: number;
  hard: number;
  zombieKills: number;
  bossKills: number;
  currentStage: number;
  highestStage: number;
  maxBunkerHp: number;
  baseArmorLevel: number;
  emergencyRepairLevel: number;
  gridCols: number;
  gridRows: number;
  activeCells: number;
  rareChanceLevel: number;
  placedWeapons: PlacedWeapon[];
  weaponProgress: Record<WeaponId, WeaponProgress>;
};

export const STARTER_WEAPON_ID: WeaponId = 'pistol';

const BASE_HP_UPGRADE_COST = 100;
const BASE_ARMOR_UPGRADE_COST = 125;
const BASE_ARMOR_MAX_LEVEL = 20;
const EMERGENCY_REPAIR_BASE_COST = 180;
const EMERGENCY_REPAIR_COST_SCALE = 1.55;
const EMERGENCY_REPAIR_MAX_LEVEL = 5;
const RARE_CHANCE_COST = 140;

export class RunState {
  soft = 80;
  hard = 0;
  zombieKills = 0;
  bossKills = 0;
  currentStage = 1;
  highestStage = 1;
  maxBunkerHp = 100;
  baseArmorLevel = 0;
  emergencyRepairLevel = 0;
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

  recordBattleKills(kills: number, bossKilled: boolean): void {
    if (bossKilled) {
      this.bossKills += 1;
      return;
    }

    this.zombieKills += Math.max(0, Math.floor(kills));
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

  spendHard(cost: number): boolean {
    if (cost < 0 || this.hard < cost) return false;
    this.hard -= cost;
    return true;
  }

  canAffordUnlock(weaponId: WeaponId): boolean {
    const cost = WEAPONS[weaponId].unlockCost;
    return cost.currency === 'hard' ? this.hard >= cost.amount : this.soft >= cost.amount;
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
    const cost = WEAPONS[weaponId].unlockCost;
    if (progress.unlocked) return false;
    const spent = cost.currency === 'hard' ? this.spendHard(cost.amount) : this.spendSoft(cost.amount);
    if (!spent) return false;
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
    const cost = this.getBunkerHpCost();
    if (this.soft < cost) return false;
    this.soft -= cost;
    this.maxBunkerHp += 20;
    return true;
  }

  getBunkerHpCost(): number {
    return BASE_HP_UPGRADE_COST;
  }

  buyBaseArmor(): boolean {
    if (this.baseArmorLevel >= BASE_ARMOR_MAX_LEVEL || this.soft < BASE_ARMOR_UPGRADE_COST) return false;
    this.soft -= BASE_ARMOR_UPGRADE_COST;
    this.baseArmorLevel += 1;
    return true;
  }

  get baseArmor(): number {
    return getArmorRating(this.baseArmorLevel);
  }

  getBaseArmorCost(): number | null {
    return this.baseArmorLevel >= BASE_ARMOR_MAX_LEVEL ? null : BASE_ARMOR_UPGRADE_COST;
  }

  buyEmergencyRepair(): boolean {
    const cost = this.getEmergencyRepairCost();
    if (cost === null || this.soft < cost) return false;
    this.soft -= cost;
    this.emergencyRepairLevel += 1;
    return true;
  }

  getEmergencyRepairCost(): number | null {
    if (this.emergencyRepairLevel >= EMERGENCY_REPAIR_MAX_LEVEL) return null;
    return Math.ceil(EMERGENCY_REPAIR_BASE_COST * EMERGENCY_REPAIR_COST_SCALE ** this.emergencyRepairLevel);
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

  cheatAddGridCells(count: number): number {
    const maxCells = this.maxGridCols * this.maxGridRows;
    const before = this.activeCells;
    this.activeCells = Math.min(maxCells, this.activeCells + Math.max(0, count));
    const gridSize = getGridSizeForActiveCells(this.activeCells);
    this.gridCols = gridSize.cols;
    this.gridRows = gridSize.rows;

    return this.activeCells - before;
  }

  getNextGridCellCost(): number | null {
    return getNextCellPurchase(this.activeCells).cost;
  }

  buyRareChance(): boolean {
    const cost = this.getRareChanceCost();
    if (this.soft < cost || this.rareChanceLevel >= 5) return false;
    this.soft -= cost;
    this.rareChanceLevel += 1;
    return true;
  }

  getRareChanceCost(): number {
    return RARE_CHANCE_COST;
  }

  cheatEquipEveryWeapon(): number {
    this.gridCols = this.maxGridCols;
    this.gridRows = this.maxGridRows;
    this.activeCells = this.maxGridCols * this.maxGridRows;
    this.placedWeapons.length = 0;

    for (const weaponId of WEAPON_POOL) {
      this.getWeaponProgress(weaponId).unlocked = true;
      this.placeCheatWeapon(weaponId);
    }

    return this.placedWeapons.length;
  }

  private placeCheatWeapon(weaponId: WeaponId): boolean {
    const rotations: WeaponRotation[] = [0, 1, 2, 3];
    for (const rotation of rotations) {
      for (let row = 0; row < this.gridRows; row += 1) {
        for (let col = 0; col < this.gridCols; col += 1) {
          if (this.placeWeaponWithLevel(weaponId, col, row, rotation, 1)) return true;
        }
      }
    }

    return false;
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

  toSnapshot(): RunStateSnapshot {
    return {
      version: 1,
      soft: this.soft,
      hard: this.hard,
      zombieKills: this.zombieKills,
      bossKills: this.bossKills,
      currentStage: this.currentStage,
      highestStage: this.highestStage,
      maxBunkerHp: this.maxBunkerHp,
      baseArmorLevel: this.baseArmorLevel,
      emergencyRepairLevel: this.emergencyRepairLevel,
      gridCols: this.gridCols,
      gridRows: this.gridRows,
      activeCells: this.activeCells,
      rareChanceLevel: this.rareChanceLevel,
      placedWeapons: this.placedWeapons.map((placement) => ({ ...placement })),
      weaponProgress: Object.fromEntries(
        (Object.keys(WEAPONS) as WeaponId[]).map((weaponId) => [
          weaponId,
          {
            unlocked: this.getWeaponProgress(weaponId).unlocked,
            stats: { ...this.getWeaponProgress(weaponId).stats },
          },
        ]),
      ) as Record<WeaponId, WeaponProgress>,
    };
  }

  restore(snapshot: Partial<RunStateSnapshot> | null | undefined): void {
    const fresh = new RunState();
    this.soft = this.toNonNegativeInt(snapshot?.soft, fresh.soft);
    this.hard = this.toNonNegativeInt(snapshot?.hard, fresh.hard);
    this.zombieKills = this.toNonNegativeInt(snapshot?.zombieKills, fresh.zombieKills);
    this.bossKills = this.toNonNegativeInt(snapshot?.bossKills, fresh.bossKills);
    this.currentStage = Math.max(1, this.toNonNegativeInt(snapshot?.currentStage, fresh.currentStage));
    this.highestStage = Math.max(this.currentStage, this.toNonNegativeInt(snapshot?.highestStage, fresh.highestStage));
    this.maxBunkerHp = Math.max(1, this.toNonNegativeInt(snapshot?.maxBunkerHp, fresh.maxBunkerHp));
    this.baseArmorLevel = this.toNonNegativeInt(snapshot?.baseArmorLevel, fresh.baseArmorLevel);
    this.emergencyRepairLevel = this.toNonNegativeInt(snapshot?.emergencyRepairLevel, fresh.emergencyRepairLevel);
    this.activeCells = Math.min(Math.max(this.toNonNegativeInt(snapshot?.activeCells, fresh.activeCells), 1), this.maxGridCols * this.maxGridRows);
    const gridSize = getGridSizeForActiveCells(this.activeCells);
    this.gridCols = gridSize.cols;
    this.gridRows = gridSize.rows;
    this.rareChanceLevel = this.toNonNegativeInt(snapshot?.rareChanceLevel, fresh.rareChanceLevel);

    (Object.keys(WEAPONS) as WeaponId[]).forEach((weaponId) => {
      const saved = snapshot?.weaponProgress?.[weaponId];
      this.weaponProgress[weaponId] = {
        unlocked: saved?.unlocked ?? weaponId === STARTER_WEAPON_ID,
        stats: {
          ...createWeaponProgress().stats,
          ...saved?.stats,
        },
      };
    });

    this.placedWeapons.length = 0;
    this.nextPlacementId = 1;
    const placements = Array.isArray(snapshot?.placedWeapons) ? snapshot.placedWeapons : fresh.placedWeapons;
    placements.forEach((placement) => {
      if (!this.isKnownWeapon(placement.weaponId)) return;
      const rotation = this.toWeaponRotation(placement.rotation);
      if (!this.canPlaceWeapon(placement.weaponId, placement.col, placement.row, rotation)) return;
      const id = this.toPositiveInt(placement.id, this.nextPlacementId);
      this.placedWeapons.push({
        id,
        weaponId: placement.weaponId,
        col: this.toNonNegativeInt(placement.col, 0),
        row: this.toNonNegativeInt(placement.row, 0),
        rotation,
        level: Math.max(1, this.toNonNegativeInt(placement.level, 1)),
      });
      this.nextPlacementId = Math.max(this.nextPlacementId, id + 1);
    });

    if (this.placedWeapons.length === 0) {
      this.placeWeapon(STARTER_WEAPON_ID, 0, 0, 0);
    }
  }

  reset(): void {
    this.restore(new RunState().toSnapshot());
  }

  private toNonNegativeInt(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
  }

  private toPositiveInt(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(1, Math.floor(value)) : fallback;
  }

  private toWeaponRotation(value: unknown): WeaponRotation {
    return (((typeof value === 'number' ? Math.floor(value) : 0) % 4 + 4) % 4) as WeaponRotation;
  }

  private isKnownWeapon(weaponId: unknown): weaponId is WeaponId {
    return typeof weaponId === 'string' && weaponId in WEAPONS;
  }
}

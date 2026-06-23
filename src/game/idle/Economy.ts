import type { EnemyId } from '../data/enemyData';
import { IDLE_GRID_CONFIG, IDLE_REWARD_CONFIG } from '../data/idleContent';
import { assertValidStage } from './StageProgression';

export type GridGrowthConfig = {
  startCols: number;
  startRows: number;
  maxCols: number;
  maxRows: number;
  baseCellCost: number;
  cellCostScale: number;
};

export type RewardConfig = {
  baseKillReward: number;
  stageRewardScale: number;
  bossRewardMultiplier: number;
  enemyTierMultipliers: Record<EnemyId, number>;
};

export type GridSize = {
  cols: number;
  rows: number;
};

export type GridProgress = GridSize & {
  activeCells: number;
};

export const DEFAULT_GRID_GROWTH_CONFIG: GridGrowthConfig = IDLE_GRID_CONFIG;
export const DEFAULT_REWARD_CONFIG: RewardConfig = IDLE_REWARD_CONFIG;

export function getStartCellCount(config: GridGrowthConfig = DEFAULT_GRID_GROWTH_CONFIG): number {
  return config.startCols * config.startRows;
}

export function getMaxCellCount(config: GridGrowthConfig = DEFAULT_GRID_GROWTH_CONFIG): number {
  return config.maxCols * config.maxRows;
}

export function getPurchasedCellCount(activeCells: number, config: GridGrowthConfig = DEFAULT_GRID_GROWTH_CONFIG): number {
  assertValidActiveCells(activeCells, config);
  return activeCells - getStartCellCount(config);
}

export function getNextCellCost(purchasedCells: number, config: GridGrowthConfig = DEFAULT_GRID_GROWTH_CONFIG): number {
  if (!Number.isInteger(purchasedCells) || purchasedCells < 0) {
    throw new RangeError(`Purchased cells must be a non-negative integer. Received: ${purchasedCells}`);
  }

  return Math.ceil(config.baseCellCost * config.cellCostScale ** purchasedCells);
}

export function getNextCellPurchase(activeCells: number, config: GridGrowthConfig = DEFAULT_GRID_GROWTH_CONFIG): {
  canBuy: boolean;
  activeCells: number;
  nextActiveCells: number;
  purchasedCells: number;
  cost: number | null;
} {
  const purchasedCells = getPurchasedCellCount(activeCells, config);

  if (activeCells >= getMaxCellCount(config)) {
    return {
      canBuy: false,
      activeCells,
      nextActiveCells: activeCells,
      purchasedCells,
      cost: null,
    };
  }

  return {
    canBuy: true,
    activeCells,
    nextActiveCells: activeCells + 1,
    purchasedCells,
    cost: getNextCellCost(purchasedCells, config),
  };
}

export function getGridSizeForActiveCells(activeCells: number, config: GridGrowthConfig = DEFAULT_GRID_GROWTH_CONFIG): GridSize {
  assertValidActiveCells(activeCells, config);

  if (activeCells === getStartCellCount(config)) {
    return { cols: config.startCols, rows: config.startRows };
  }

  const targetAspect = 1.6;
  let cols = Math.ceil(Math.sqrt(activeCells * targetAspect));
  cols = PhaserMathClamp(cols, config.startCols, config.maxCols);
  let rows = Math.ceil(activeCells / cols);
  rows = PhaserMathClamp(rows, config.startRows, config.maxRows);

  while (cols * rows < activeCells && cols < config.maxCols) cols += 1;
  while (cols * rows < activeCells && rows < config.maxRows) rows += 1;

  return { cols, rows };
}

export function getKillReward(stage: number, enemyId: EnemyId, config: RewardConfig = DEFAULT_REWARD_CONFIG): number {
  assertValidStage(stage);

  return Math.ceil(config.baseKillReward * config.stageRewardScale ** (stage - 1) * config.enemyTierMultipliers[enemyId]);
}

export function getBossReward(stage: number, config: RewardConfig = DEFAULT_REWARD_CONFIG): number {
  return Math.ceil(getKillReward(stage, 'zombie-tank', config) * config.bossRewardMultiplier);
}

function assertValidActiveCells(activeCells: number, config: GridGrowthConfig): void {
  if (!Number.isInteger(activeCells) || activeCells < getStartCellCount(config) || activeCells > getMaxCellCount(config)) {
    throw new RangeError(`Active cells must be within configured bounds. Received: ${activeCells}`);
  }
}

function PhaserMathClamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

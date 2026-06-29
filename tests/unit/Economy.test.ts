import { describe, expect, it } from 'vitest';
import {
  getBossReward,
  getGridSizeForActiveCells,
  getKillReward,
  getMaxCellCount,
  getNextCellCost,
  getNextCellPurchase,
  getPurchasedCellCount,
  getStartCellCount,
} from '../../src/game/idle/Economy';

describe('Economy', () => {
  it('starts with 6x2 cells and caps at 15x15 cells', () => {
    expect(getStartCellCount()).toBe(12);
    expect(getMaxCellCount()).toBe(225);
  });

  it('buys one active cell at a time until the grid is full', () => {
    expect(getNextCellPurchase(12)).toEqual({
      canBuy: true,
      activeCells: 12,
      nextActiveCells: 13,
      purchasedCells: 0,
      cost: 110,
    });

    expect(getNextCellPurchase(225)).toEqual({
      canBuy: false,
      activeCells: 225,
      nextActiveCells: 225,
      purchasedCells: 213,
      cost: null,
    });
  });

  it('grows visible grid bounds as a compact armory footprint', () => {
    expect(getGridSizeForActiveCells(12)).toEqual({ cols: 6, rows: 2 });
    expect(getGridSizeForActiveCells(13)).toEqual({ cols: 6, rows: 3 });
    expect(getGridSizeForActiveCells(18)).toEqual({ cols: 6, rows: 3 });
    expect(getGridSizeForActiveCells(19)).toEqual({ cols: 6, rows: 4 });
    expect(getGridSizeForActiveCells(22)).toEqual({ cols: 6, rows: 4 });
    expect(getGridSizeForActiveCells(24)).toEqual({ cols: 6, rows: 4 });
    expect(getGridSizeForActiveCells(25)).toEqual({ cols: 7, rows: 4 });
    expect(getGridSizeForActiveCells(28)).toEqual({ cols: 7, rows: 4 });
    expect(getGridSizeForActiveCells(29)).toEqual({ cols: 7, rows: 5 });
    expect(getGridSizeForActiveCells(35)).toEqual({ cols: 7, rows: 5 });
    expect(getGridSizeForActiveCells(36)).toEqual({ cols: 8, rows: 5 });
    expect(getGridSizeForActiveCells(80)).toEqual({ cols: 11, rows: 8 });
    expect(getGridSizeForActiveCells(225)).toEqual({ cols: 15, rows: 15 });
  });

  it('uses exponential cell costs', () => {
    expect(getNextCellCost(0)).toBe(110);
    expect(getNextCellCost(1)).toBe(124);
    expect(getNextCellCost(2)).toBe(138);
    expect(getNextCellCost(10)).toBeGreaterThan(getNextCellCost(9));
  });

  it('counts purchased cells from the starting grid area', () => {
    expect(getPurchasedCellCount(12)).toBe(0);
    expect(getPurchasedCellCount(13)).toBe(1);
    expect(getPurchasedCellCount(225)).toBe(213);
  });

  it('rewards only combat kills and scales by stage and enemy tier', () => {
    expect(getKillReward(1, 'zombie')).toBe(4);
    expect(getKillReward(1, 'zombie-tank')).toBe(15);
    expect(getKillReward(10, 'zombie')).toBeGreaterThan(getKillReward(1, 'zombie'));
    expect(getBossReward(10)).toBeGreaterThan(getKillReward(10, 'zombie-tank'));
  });
});

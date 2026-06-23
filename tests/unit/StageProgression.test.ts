import { describe, expect, it } from 'vitest';
import {
  getCheckpointStage,
  getStageAfterFailure,
  getStageAfterWin,
  getStageSnapshot,
  isBossStage,
} from '../../src/game/idle/StageProgression';

describe('StageProgression', () => {
  it('marks every 10th stage as a boss stage', () => {
    expect(isBossStage(1)).toBe(false);
    expect(isBossStage(9)).toBe(false);
    expect(isBossStage(10)).toBe(true);
    expect(isBossStage(11)).toBe(false);
    expect(isBossStage(20)).toBe(true);
  });

  it('finds the start of each 10-stage checkpoint block', () => {
    expect(getCheckpointStage(1)).toBe(1);
    expect(getCheckpointStage(9)).toBe(1);
    expect(getCheckpointStage(10)).toBe(1);
    expect(getCheckpointStage(11)).toBe(11);
    expect(getCheckpointStage(17)).toBe(11);
    expect(getCheckpointStage(20)).toBe(11);
    expect(getCheckpointStage(21)).toBe(21);
  });

  it('advances on wins and falls back to the current checkpoint on failures', () => {
    expect(getStageAfterWin(17)).toBe(18);
    expect(getStageAfterWin(20)).toBe(21);
    expect(getStageAfterFailure(17)).toBe(11);
    expect(getStageAfterFailure(20)).toBe(11);
  });

  it('creates a stage snapshot for UI and systems', () => {
    expect(getStageSnapshot(20)).toEqual({
      stage: 20,
      checkpointStage: 11,
      blockEndStage: 20,
      isBoss: true,
    });
  });
});


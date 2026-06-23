import { IDLE_STAGE_CONFIG } from '../data/idleContent';

export type StageProgressionConfig = {
  checkpointInterval: number;
};

export type StageSnapshot = {
  stage: number;
  checkpointStage: number;
  blockEndStage: number;
  isBoss: boolean;
};

export const DEFAULT_STAGE_PROGRESSION_CONFIG: StageProgressionConfig = {
  checkpointInterval: IDLE_STAGE_CONFIG.checkpointInterval,
};

export function assertValidStage(stage: number): void {
  if (!Number.isInteger(stage) || stage < 1) {
    throw new RangeError(`Stage must be a positive integer. Received: ${stage}`);
  }
}

export function assertValidCheckpointInterval(interval: number): void {
  if (!Number.isInteger(interval) || interval < 1) {
    throw new RangeError(`Checkpoint interval must be a positive integer. Received: ${interval}`);
  }
}

export function getCheckpointStage(stage: number, config: StageProgressionConfig = DEFAULT_STAGE_PROGRESSION_CONFIG): number {
  assertValidStage(stage);
  assertValidCheckpointInterval(config.checkpointInterval);

  return Math.floor((stage - 1) / config.checkpointInterval) * config.checkpointInterval + 1;
}

export function getBlockEndStage(stage: number, config: StageProgressionConfig = DEFAULT_STAGE_PROGRESSION_CONFIG): number {
  return getCheckpointStage(stage, config) + config.checkpointInterval - 1;
}

export function isBossStage(stage: number, config: StageProgressionConfig = DEFAULT_STAGE_PROGRESSION_CONFIG): boolean {
  assertValidStage(stage);
  assertValidCheckpointInterval(config.checkpointInterval);

  return stage % config.checkpointInterval === 0;
}

export function getStageAfterWin(stage: number): number {
  assertValidStage(stage);
  return stage + 1;
}

export function getStageAfterFailure(stage: number, config: StageProgressionConfig = DEFAULT_STAGE_PROGRESSION_CONFIG): number {
  return getCheckpointStage(stage, config);
}

export function getStageSnapshot(stage: number, config: StageProgressionConfig = DEFAULT_STAGE_PROGRESSION_CONFIG): StageSnapshot {
  return {
    stage,
    checkpointStage: getCheckpointStage(stage, config),
    blockEndStage: getBlockEndStage(stage, config),
    isBoss: isBossStage(stage, config),
  };
}


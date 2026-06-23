export const ROAD_BOUNDS = {
  left: 478,
  right: 810,
};

export const ROAD_BOUNDS_LIMITS = {
  minLeft: 420,
  maxRight: 900,
  minWidth: 260,
  step: 1,
} as const;

export function moveRoadBound(side: 'left' | 'right', delta: number): boolean {
  if (side === 'left') {
    const nextLeft = ROAD_BOUNDS.left + delta;
    if (nextLeft < ROAD_BOUNDS_LIMITS.minLeft) return false;
    if (ROAD_BOUNDS.right - nextLeft < ROAD_BOUNDS_LIMITS.minWidth) return false;
    ROAD_BOUNDS.left = nextLeft;
    return true;
  }

  const nextRight = ROAD_BOUNDS.right + delta;
  if (nextRight > ROAD_BOUNDS_LIMITS.maxRight) return false;
  if (nextRight - ROAD_BOUNDS.left < ROAD_BOUNDS_LIMITS.minWidth) return false;
  ROAD_BOUNDS.right = nextRight;
  return true;
}

export function getRoadSpawnX(enemyDisplaySize: number): { min: number; max: number } {
  const padding = Math.ceil(enemyDisplaySize * 0.35);
  return {
    min: ROAD_BOUNDS.left + padding,
    max: ROAD_BOUNDS.right - padding,
  };
}

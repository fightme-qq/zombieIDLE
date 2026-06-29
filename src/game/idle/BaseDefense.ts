export const BASE_DEFENSE_CONFIG = {
  armorRatingPerLevel: 8,
  armorStagePressureBase: 18,
  armorStagePressureScale: 1.5,
  armorMaxReduction: 0.7,
  emergencyRepairThresholdRatio: 0.25,
  emergencyRepairBaseHealRatio: 0.3,
  emergencyRepairHealRatioPerLevel: 0.05,
  emergencyRepairMaxHealRatio: 0.55,
} as const;

export function getArmorRating(armorLevel: number): number {
  return Math.max(0, Math.floor(armorLevel)) * BASE_DEFENSE_CONFIG.armorRatingPerLevel;
}

export function getArmorDamageReduction(armorRating: number, stage: number): number {
  const safeRating = Math.max(0, armorRating);
  if (safeRating <= 0) return 0;

  const stagePressure =
    BASE_DEFENSE_CONFIG.armorStagePressureBase +
    Math.max(1, Math.floor(stage)) * BASE_DEFENSE_CONFIG.armorStagePressureScale;
  const reduction = safeRating / (safeRating + stagePressure);
  return Math.min(BASE_DEFENSE_CONFIG.armorMaxReduction, reduction);
}

export function getMitigatedBaseDamage(rawDamage: number, armorRating: number, stage: number): number {
  const safeDamage = Math.max(0, Math.ceil(rawDamage));
  if (safeDamage <= 0) return 0;

  const reduction = getArmorDamageReduction(armorRating, stage);
  return Math.max(1, Math.ceil(safeDamage * (1 - reduction)));
}

export function getEmergencyRepairThreshold(maxBunkerHp: number): number {
  return Math.ceil(Math.max(1, maxBunkerHp) * BASE_DEFENSE_CONFIG.emergencyRepairThresholdRatio);
}

export function getEmergencyRepairHeal(maxBunkerHp: number, repairLevel: number): number {
  const level = Math.max(0, Math.floor(repairLevel));
  if (level <= 0) return 0;

  const ratio = Math.min(
    BASE_DEFENSE_CONFIG.emergencyRepairMaxHealRatio,
    BASE_DEFENSE_CONFIG.emergencyRepairBaseHealRatio + (level - 1) * BASE_DEFENSE_CONFIG.emergencyRepairHealRatioPerLevel,
  );
  return Math.ceil(Math.max(1, maxBunkerHp) * ratio);
}

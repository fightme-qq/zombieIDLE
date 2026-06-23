import { WEAPONS, type WeaponId, type WeaponUpgradeStatId } from '../data/weaponData';
import type { PlacedWeapon } from './EquipGrid';

export type WeaponStatLevels = Record<WeaponUpgradeStatId, number>;

export type WeaponProgress = {
  unlocked: boolean;
  stats: WeaponStatLevels;
};

export type WeaponComputedStats = {
  damage: number;
  cooldownMs: number;
  projectileSpeed: number;
  spread: number;
};

export const EMPTY_WEAPON_STAT_LEVELS: WeaponStatLevels = {
  damage: 0,
  fireRate: 0,
  handling: 0,
  special: 0,
};

export function getEquippedWeaponIds(placedWeapons: readonly PlacedWeapon[]): WeaponId[] {
  return placedWeapons.map((weapon) => weapon.weaponId);
}

export function createWeaponProgress(unlocked = false): WeaponProgress {
  return {
    unlocked,
    stats: { ...EMPTY_WEAPON_STAT_LEVELS },
  };
}

export function getWeaponTotalLevel(progress: WeaponProgress): number {
  return Object.values(progress.stats).reduce((total, level) => total + level, 0);
}

export function getWeaponStatUpgradeCost(weaponId: WeaponId, statId: WeaponUpgradeStatId, currentLevel: number): number | null {
  assertValidStatLevel(currentLevel);
  const stat = WEAPONS[weaponId].upgradeStats.find((candidate) => candidate.id === statId);
  if (!stat || currentLevel >= stat.maxLevel) return null;

  return Math.ceil(stat.baseCost * stat.costScale ** currentLevel);
}

export function getWeaponComputedStats(weaponId: WeaponId, progress: WeaponProgress = createWeaponProgress(true)): WeaponComputedStats {
  const weapon = WEAPONS[weaponId];
  const damageMultiplier = 1 + progress.stats.damage * 0.16;
  const cooldownMultiplier = Math.max(0.52, 1 - progress.stats.fireRate * 0.055);
  const speedMultiplier = 1 + progress.stats.handling * 0.075;
  const bonusSpread = getSpecialSpreadBonus(weaponId, progress.stats.special);

  return {
    damage: Math.ceil(weapon.damage * damageMultiplier),
    cooldownMs: Math.max(240, Math.round(weapon.cooldownMs * 2 * cooldownMultiplier)),
    projectileSpeed: Math.round(weapon.projectileSpeed * speedMultiplier),
    spread: weapon.spread + bonusSpread,
  };
}

export function getWeaponDamage(weaponId: WeaponId, progress: WeaponProgress = createWeaponProgress(true)): number {
  return getWeaponComputedStats(weaponId, progress).damage;
}

export function getWeaponDps(weaponId: WeaponId, progress: WeaponProgress = createWeaponProgress(true)): number {
  const stats = getWeaponComputedStats(weaponId, progress);
  const shotsPerSecond = 1000 / stats.cooldownMs;
  return stats.damage * stats.spread * shotsPerSecond;
}

export function getEquippedWeaponDps(placedWeapons: readonly PlacedWeapon[], getProgress: (weaponId: WeaponId) => WeaponProgress = () => createWeaponProgress(true)): number {
  return placedWeapons.reduce((total, weapon) => total + getWeaponDps(weapon.weaponId, getProgress(weapon.weaponId)), 0);
}

function assertValidStatLevel(level: number): void {
  if (!Number.isInteger(level) || level < 0) {
    throw new RangeError(`Weapon stat level must be a non-negative integer. Received: ${level}`);
  }
}

function getSpecialSpreadBonus(weaponId: WeaponId, specialLevel: number): number {
  if (weaponId === 'shotgun' || weaponId === 'compactShotgun' || weaponId === 'grenadeLauncher') {
    return Math.floor((specialLevel + 1) / 2);
  }

  return 0;
}

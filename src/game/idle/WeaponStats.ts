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
  magazineSize: number;
  reloadMs: number;
  projectileSpeed: number;
  rangePx: number;
  critChance: number;
  critMultiplier: number;
  spread: number;
  doubleTapInterval: number | null;
  teslaChainJumps: number;
  teslaChainFalloff: number;
  focusDamagePerStack: number;
  focusMaxStacks: number;
  pierceCount: number;
  grenadeRadius: number;
  grenadeSplashDamageMultiplier: number;
};

export const EMPTY_WEAPON_STAT_LEVELS: WeaponStatLevels = {
  damage: 0,
  fireRate: 0,
  handling: 0,
  range: 0,
  critChance: 0,
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
  const critChance = Math.min(0.3, progress.stats.critChance * 0.03);
  const specialLevel = progress.stats.special;
  const special = getWeaponSpecialStats(weaponId, specialLevel);

  return {
    damage: Math.ceil(weapon.damage * damageMultiplier),
    cooldownMs: Math.max(240, Math.round(weapon.cooldownMs * 2 * cooldownMultiplier)),
    magazineSize: weapon.magazineSize,
    reloadMs: weapon.reloadMs,
    projectileSpeed: Math.round(weapon.projectileSpeed * speedMultiplier),
    rangePx: getWeaponRange(weaponId, progress),
    critChance,
    critMultiplier: 1.5,
    spread: weapon.spread + special.spreadBonus,
    doubleTapInterval: special.doubleTapInterval,
    teslaChainJumps: special.teslaChainJumps,
    teslaChainFalloff: special.teslaChainFalloff,
    focusDamagePerStack: special.focusDamagePerStack,
    focusMaxStacks: special.focusMaxStacks,
    pierceCount: special.pierceCount,
    grenadeRadius: special.grenadeRadius,
    grenadeSplashDamageMultiplier: special.grenadeSplashDamageMultiplier,
  };
}

export function getWeaponDamage(weaponId: WeaponId, progress: WeaponProgress = createWeaponProgress(true)): number {
  return getWeaponComputedStats(weaponId, progress).damage;
}

export function getWeaponDps(weaponId: WeaponId, progress: WeaponProgress = createWeaponProgress(true)): number {
  const stats = getWeaponComputedStats(weaponId, progress);
  const magazineSize = Math.max(1, stats.magazineSize);
  const cycleMs = stats.cooldownMs * magazineSize + stats.reloadMs;
  const shotsPerSecond = (magazineSize * 1000) / cycleMs;
  const doubleTapMultiplier = stats.doubleTapInterval ? 1 + 1 / stats.doubleTapInterval : 1;
  const focusMultiplier = stats.focusMaxStacks > 0 ? 1 + (stats.focusDamagePerStack * stats.focusMaxStacks) / 2 : 1;
  const chainMultiplier =
    stats.teslaChainJumps > 0
      ? 1 + Array.from({ length: stats.teslaChainJumps }, (_, index) => stats.teslaChainFalloff ** (index + 1)).reduce((total, value) => total + value, 0)
      : 1;
  return stats.damage * stats.spread * shotsPerSecond * doubleTapMultiplier * focusMultiplier * chainMultiplier;
}

export function getEquippedWeaponDps(placedWeapons: readonly PlacedWeapon[], getProgress: (weaponId: WeaponId) => WeaponProgress = () => createWeaponProgress(true)): number {
  return placedWeapons.reduce((total, weapon) => total + getWeaponDps(weapon.weaponId, getProgress(weapon.weaponId)), 0);
}

export function getWeaponSpecialEffectLabel(weaponId: WeaponId, level: number): string {
  if (level <= 0) return 'base trait';

  const stats = getWeaponSpecialStats(weaponId, level);
  if (weaponId === 'starter_pistol' || weaponId === 'pistol') return `double shot every ${stats.doubleTapInterval} attacks`;
  if (weaponId === 'shotgun' || weaponId === 'compactShotgun') return `+${stats.spreadBonus} pellets`;
  if (weaponId === 'tesla') return `${stats.teslaChainJumps} chain jumps`;
  if (weaponId === 'assaultRifle') return `${stats.focusMaxStacks} focus stacks`;
  if (weaponId === 'sniperRifle') return `pierces ${stats.pierceCount} enemies`;
  if (weaponId === 'grenadeLauncher') return `${stats.grenadeRadius}px blast`;

  return 'base trait';
}

function assertValidStatLevel(level: number): void {
  if (!Number.isInteger(level) || level < 0) {
    throw new RangeError(`Weapon stat level must be a non-negative integer. Received: ${level}`);
  }
}

type WeaponSpecialStats = {
  spreadBonus: number;
  doubleTapInterval: number | null;
  teslaChainJumps: number;
  teslaChainFalloff: number;
  focusDamagePerStack: number;
  focusMaxStacks: number;
  pierceCount: number;
  grenadeRadius: number;
  grenadeSplashDamageMultiplier: number;
};

function getWeaponSpecialStats(weaponId: WeaponId, specialLevel: number): WeaponSpecialStats {
  const level = Math.max(0, Math.floor(specialLevel));
  const base: WeaponSpecialStats = {
    spreadBonus: 0,
    doubleTapInterval: null,
    teslaChainJumps: 0,
    teslaChainFalloff: 0,
    focusDamagePerStack: 0,
    focusMaxStacks: 0,
    pierceCount: 0,
    grenadeRadius: 84,
    grenadeSplashDamageMultiplier: 0.65,
  };

  if (level <= 0) return base;

  if (weaponId === 'starter_pistol' || weaponId === 'pistol') {
    return { ...base, doubleTapInterval: Math.max(3, 8 - level) };
  }

  if (weaponId === 'shotgun' || weaponId === 'compactShotgun') {
    return { ...base, spreadBonus: Math.floor((level + 1) / 2) };
  }

  if (weaponId === 'tesla') {
    return {
      ...base,
      teslaChainJumps: Math.min(3, Math.ceil(level / 2)),
      teslaChainFalloff: Math.min(0.78, 0.52 + level * 0.05),
    };
  }

  if (weaponId === 'assaultRifle') {
    return {
      ...base,
      focusDamagePerStack: 0.04,
      focusMaxStacks: 4 + level * 2,
    };
  }

  if (weaponId === 'sniperRifle') {
    return { ...base, pierceCount: Math.min(3, Math.ceil(level / 2)) };
  }

  if (weaponId === 'grenadeLauncher') {
    return {
      ...base,
      grenadeRadius: 84 + level * 14,
      grenadeSplashDamageMultiplier: Math.min(0.9, 0.65 + level * 0.04),
    };
  }

  return base;
}

function getWeaponRange(weaponId: WeaponId, progress: WeaponProgress): number {
  const weapon = WEAPONS[weaponId];
  const rangeStat = weapon.upgradeStats.find((stat) => stat.id === 'range');
  const maxLevel = rangeStat?.maxLevel ?? 0;
  if (maxLevel <= 0) return weapon.rangePx;

  const rangeLevel = Math.min(progress.stats.range, maxLevel);
  const t = rangeLevel / maxLevel;
  return Math.round(weapon.rangePx + (weapon.maxRangePx - weapon.rangePx) * t);
}

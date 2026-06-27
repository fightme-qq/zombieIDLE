import type { WeaponId } from '../data/weaponData';

export type WeaponIconVisualTuning = {
  scaleBoost?: number;
  offsetX?: number;
  offsetY?: number;
};

export type WeaponIconRotation = 0 | 1 | 2 | 3;
export type WeaponGridIconTuning = Required<WeaponIconVisualTuning>;

export const DEFAULT_WEAPON_ICON_TUNING: WeaponGridIconTuning = {
  scaleBoost: 1,
  offsetX: 0,
  offsetY: 0,
};

export const DEFAULT_WEAPON_GRID_ICON_TUNING: Record<WeaponId, WeaponGridIconTuning> = {
  starter_pistol: {
    ...DEFAULT_WEAPON_ICON_TUNING,
    scaleBoost: 1.2,
  },
  pistol: {
    ...DEFAULT_WEAPON_ICON_TUNING,
    scaleBoost: 1.1,
  },
  shotgun: {
    ...DEFAULT_WEAPON_ICON_TUNING,
    scaleBoost: 1.25,
  },
  tesla: {
    ...DEFAULT_WEAPON_ICON_TUNING,
    scaleBoost: 1.1,
    offsetX: 1,
    offsetY: -2,
  },
  assaultRifle: {
    ...DEFAULT_WEAPON_ICON_TUNING,
    scaleBoost: 1.15,
    offsetX: 2,
    offsetY: -7,
  },
  compactShotgun: {
    ...DEFAULT_WEAPON_ICON_TUNING,
    scaleBoost: 1.4,
    offsetX: 1,
    offsetY: 3,
  },
  sniperRifle: {
    ...DEFAULT_WEAPON_ICON_TUNING,
    scaleBoost: 1.95,
  },
  grenadeLauncher: {
    ...DEFAULT_WEAPON_ICON_TUNING,
    scaleBoost: 1.1,
    offsetX: -2,
    offsetY: -6,
  },
};

export const WEAPON_GRID_ICON_TUNING: Record<WeaponId, WeaponGridIconTuning> = Object.fromEntries(
  Object.entries(DEFAULT_WEAPON_GRID_ICON_TUNING).map(([weaponId, tuning]) => [weaponId, { ...tuning }]),
) as Record<WeaponId, WeaponGridIconTuning>;

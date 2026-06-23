export type WeaponId =
  | 'starter_pistol'
  | 'pistol'
  | 'shotgun'
  | 'tesla'
  | 'assaultRifle'
  | 'compactShotgun'
  | 'sniperRifle'
  | 'grenadeLauncher';

export type WeaponCategoryId = 'pistols' | 'shotguns' | 'rifles' | 'energy' | 'heavy';
export type WeaponUpgradeStatId = 'damage' | 'fireRate' | 'handling' | 'special';

export type WeaponUpgradeStatDefinition = {
  id: WeaponUpgradeStatId;
  label: string;
  baseCost: number;
  costScale: number;
  maxLevel: number;
};

export type WeaponDefinition = {
  id: WeaponId;
  name: string;
  category: WeaponCategoryId;
  color: number;
  shape: readonly { col: number; row: number }[];
  damage: number;
  cooldownMs: number;
  projectileSpeed: number;
  spread: number;
  softCost: number;
  unlockCost: number;
  upgradeStats: readonly WeaponUpgradeStatDefinition[];
  description: string;
};

export const WEAPON_CATEGORIES: Array<{ id: WeaponCategoryId; label: string }> = [
  { id: 'pistols', label: 'Pistols' },
  { id: 'shotguns', label: 'Shotguns' },
  { id: 'rifles', label: 'Rifles' },
  { id: 'energy', label: 'Energy' },
  { id: 'heavy', label: 'Heavy' },
];

const COMMON_UPGRADES = {
  damage: { id: 'damage', label: 'Damage', baseCost: 35, costScale: 1.45, maxLevel: 10 },
  fireRate: { id: 'fireRate', label: 'Fire Rate', baseCost: 55, costScale: 1.5, maxLevel: 8 },
  handling: { id: 'handling', label: 'Handling', baseCost: 40, costScale: 1.42, maxLevel: 8 },
} as const satisfies Record<'damage' | 'fireRate' | 'handling', WeaponUpgradeStatDefinition>;

function upgradeSet(specialLabel: string, specialBaseCost: number): readonly WeaponUpgradeStatDefinition[] {
  return [
    COMMON_UPGRADES.damage,
    COMMON_UPGRADES.fireRate,
    COMMON_UPGRADES.handling,
    { id: 'special', label: specialLabel, baseCost: specialBaseCost, costScale: 1.62, maxLevel: 5 },
  ];
}

export const WEAPONS: Record<WeaponId, WeaponDefinition> = {
  starter_pistol: {
    id: 'starter_pistol',
    name: 'Starter Pistol',
    category: 'pistols',
    color: 0xd9dde8,
    shape: [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 0, row: 1 },
    ],
    damage: 10,
    cooldownMs: 680,
    projectileSpeed: 520,
    spread: 1,
    softCost: 0,
    unlockCost: 0,
    upgradeStats: upgradeSet('Double Tap', 90),
    description: 'Reliable starter weapon with a pistol footprint.',
  },
  pistol: {
    id: 'pistol',
    category: 'pistols',
    name: 'Пистолет',
    color: 0xd9dde8,
    shape: [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 0, row: 1 },
    ],
    damage: 16,
    cooldownMs: 560,
    projectileSpeed: 560,
    spread: 1,
    softCost: 40,
    unlockCost: 50,
    upgradeStats: upgradeSet('Double Tap', 95),
    description: 'Быстро стреляет по одной цели.',
  },
  shotgun: {
    id: 'shotgun',
    category: 'shotguns',
    name: 'Дробовик',
    color: 0xf0a25a,
    shape: [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
    ],
    damage: 10,
    cooldownMs: 980,
    projectileSpeed: 470,
    spread: 3,
    softCost: 75,
    unlockCost: 120,
    upgradeStats: upgradeSet('Extra Pellets', 140),
    description: 'Дает веер из трех выстрелов.',
  },
  tesla: {
    id: 'tesla',
    category: 'energy',
    name: 'Тесла',
    color: 0x78d8ff,
    shape: [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
      { col: 1, row: 1 },
    ],
    damage: 26,
    cooldownMs: 1300,
    projectileSpeed: 680,
    spread: 1,
    softCost: 120,
    unlockCost: 400,
    upgradeStats: upgradeSet('Chain Arc', 240),
    description: 'Медленнее, но больно бьет.',
  },
  assaultRifle: {
    id: 'assaultRifle',
    category: 'rifles',
    name: 'Автомат',
    color: 0x9ea8b8,
    shape: [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
      { col: 1, row: 1 },
    ],
    damage: 9,
    cooldownMs: 260,
    projectileSpeed: 640,
    spread: 1,
    softCost: 110,
    unlockCost: 260,
    upgradeStats: upgradeSet('Focus Fire', 170),
    description: 'Частая стрельба средним уроном.',
  },
  compactShotgun: {
    id: 'compactShotgun',
    category: 'shotguns',
    name: 'Обрез',
    color: 0xc78b61,
    shape: [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 0, row: 1 },
      { col: 1, row: 1 },
    ],
    damage: 8,
    cooldownMs: 760,
    projectileSpeed: 440,
    spread: 5,
    softCost: 95,
    unlockCost: 180,
    upgradeStats: upgradeSet('Wide Burst', 150),
    description: 'Короткий широкий веер.',
  },
  sniperRifle: {
    id: 'sniperRifle',
    category: 'rifles',
    name: 'Снайперка',
    color: 0xb8c2d6,
    shape: [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
      { col: 3, row: 0 },
    ],
    damage: 46,
    cooldownMs: 1700,
    projectileSpeed: 820,
    spread: 1,
    softCost: 160,
    unlockCost: 650,
    upgradeStats: upgradeSet('Critical Shot', 300),
    description: 'Редкий мощный дальний выстрел.',
  },
  grenadeLauncher: {
    id: 'grenadeLauncher',
    category: 'heavy',
    name: 'Гранатомет',
    color: 0x6b7080,
    shape: [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
      { col: 0, row: 1 },
      { col: 1, row: 1 },
    ],
    damage: 34,
    cooldownMs: 1450,
    projectileSpeed: 390,
    spread: 2,
    softCost: 180,
    unlockCost: 900,
    upgradeStats: upgradeSet('Blast Radius', 360),
    description: 'Тяжелый залп по плотной группе.',
  },
};

export const WEAPON_POOL: WeaponId[] = ['pistol', 'shotgun', 'tesla', 'assaultRifle', 'compactShotgun', 'sniperRifle', 'grenadeLauncher'];
export const OFFER_SLOT_COUNT = 3;
export const OFFERED_WEAPONS: WeaponId[] = WEAPON_POOL.slice(0, OFFER_SLOT_COUNT);
export const REROLL_SET_COST = 25;

export const WEAPON_UPGRADE_CONFIG = {
  baseCost: 35,
  costScale: 1.42,
  damageScalePerLevel: 0.18,
} as const;

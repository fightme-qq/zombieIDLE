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
export type WeaponUpgradeStatId = 'damage' | 'fireRate' | 'handling' | 'range' | 'critChance' | 'special';

export type WeaponUpgradeStatDefinition = {
  id: WeaponUpgradeStatId;
  label: string;
  baseCost: number;
  costScale: number;
  maxLevel: number;
};

export type CurrencyCost = {
  currency: 'soft' | 'hard';
  amount: number;
};

export type WeaponDefinition = {
  id: WeaponId;
  name: string;
  category: WeaponCategoryId;
  color: number;
  shape: readonly { col: number; row: number }[];
  damage: number;
  cooldownMs: number;
  magazineSize: number;
  reloadMs: number;
  projectileSpeed: number;
  rangePx: number;
  maxRangePx: number;
  spread: number;
  softCost: number;
  unlockCost: CurrencyCost;
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
  damage: { id: 'damage', label: 'Damage', baseCost: 95, costScale: 1.45, maxLevel: 10 },
  fireRate: { id: 'fireRate', label: 'Fire Rate', baseCost: 135, costScale: 1.5, maxLevel: 8 },
  handling: { id: 'handling', label: 'Handling', baseCost: 110, costScale: 1.42, maxLevel: 8 },
  range: { id: 'range', label: 'Range', baseCost: 120, costScale: 1.48, maxLevel: 8 },
  critChance: { id: 'critChance', label: 'Crit Chance', baseCost: 160, costScale: 1.5, maxLevel: 10 },
} as const satisfies Record<'damage' | 'fireRate' | 'handling' | 'range' | 'critChance', WeaponUpgradeStatDefinition>;

function upgradeSet(specialLabel: string, specialBaseCost: number): readonly WeaponUpgradeStatDefinition[] {
  return [
    COMMON_UPGRADES.damage,
    COMMON_UPGRADES.fireRate,
    COMMON_UPGRADES.handling,
    COMMON_UPGRADES.range,
    COMMON_UPGRADES.critChance,
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
    damage: 8,
    cooldownMs: 680,
    magazineSize: 8,
    reloadMs: 1200,
    projectileSpeed: 520,
    rangePx: 220,
    maxRangePx: 430,
    spread: 1,
    softCost: 0,
    unlockCost: { currency: 'soft', amount: 0 },
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
    damage: 8,
    cooldownMs: 560,
    magazineSize: 10,
    reloadMs: 1150,
    projectileSpeed: 560,
    rangePx: 220,
    maxRangePx: 430,
    spread: 1,
    softCost: 105,
    unlockCost: { currency: 'soft', amount: 50 },
    upgradeStats: upgradeSet('Double Tap', 220),
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
    magazineSize: 2,
    reloadMs: 1750,
    projectileSpeed: 470,
    rangePx: 220,
    maxRangePx: 430,
    spread: 3,
    softCost: 160,
    unlockCost: { currency: 'soft', amount: 180 },
    upgradeStats: upgradeSet('Extra Pellets', 300),
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
    magazineSize: 0,
    reloadMs: 1800,
    projectileSpeed: 680,
    rangePx: 360,
    maxRangePx: 650,
    spread: 1,
    softCost: 260,
    unlockCost: { currency: 'hard', amount: 12 },
    upgradeStats: upgradeSet('Chain Arc', 420),
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
    magazineSize: 24,
    reloadMs: 1500,
    projectileSpeed: 640,
    rangePx: 290,
    maxRangePx: 720,
    spread: 1,
    softCost: 240,
    unlockCost: { currency: 'soft', amount: 420 },
    upgradeStats: upgradeSet('Focus Fire', 360),
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
    magazineSize: 2,
    reloadMs: 1550,
    projectileSpeed: 440,
    rangePx: 220,
    maxRangePx: 430,
    spread: 5,
    softCost: 210,
    unlockCost: { currency: 'soft', amount: 310 },
    upgradeStats: upgradeSet('Wide Burst', 330),
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
    magazineSize: 5,
    reloadMs: 2300,
    projectileSpeed: 820,
    rangePx: 430,
    maxRangePx: 720,
    spread: 1,
    softCost: 330,
    unlockCost: { currency: 'hard', amount: 18 },
    upgradeStats: upgradeSet('Critical Shot', 520),
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
    magazineSize: 1,
    reloadMs: 2400,
    projectileSpeed: 390,
    rangePx: 220,
    maxRangePx: 430,
    spread: 1,
    softCost: 360,
    unlockCost: { currency: 'hard', amount: 24 },
    upgradeStats: upgradeSet('Blast Radius', 620),
    description: 'Тяжелый залп по плотной группе.',
  },
};

export const WEAPON_POOL: WeaponId[] = ['pistol', 'shotgun', 'tesla', 'assaultRifle', 'compactShotgun', 'sniperRifle', 'grenadeLauncher'];
export const OFFER_SLOT_COUNT = 3;
export const OFFERED_WEAPONS: WeaponId[] = WEAPON_POOL.slice(0, OFFER_SLOT_COUNT);
export const REROLL_SET_COST = 90;

export const WEAPON_UPGRADE_CONFIG = {
  baseCost: 35,
  costScale: 1.42,
  damageScalePerLevel: 0.18,
} as const;

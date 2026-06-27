import Phaser from 'phaser';
import type { EnemyId } from '../data/enemyData';

export const AssetKeys = {
  Backgrounds: {
    battlefield: 'background-battlefield',
  },
  Structures: {
    bunker: 'structure-bunker',
  },
  Currency: {
    caps: 'currency-caps',
    tokens: 'currency-tokens',
  },
  Weapons: {
    starter_pistol: 'weapon-pistol',
    pistol: 'weapon-pistol',
    shotgun: 'weapon-shotgun',
    tesla: 'weapon-tesla',
    assaultRifle: 'weapon-assault-rifle',
    compactShotgun: 'weapon-compact-shotgun',
    sniperRifle: 'weapon-sniper-rifle',
    grenadeLauncher: 'weapon-grenade-launcher',
  },
  Enemies: {
    zombieSouth: 'enemy-zombie-south',
    mutant: 'enemy-mutant',
  },
  Audio: {
    Weapons: {
      pistolShot: 'audio-weapon-pistol-shot',
      shotgunShot: 'audio-weapon-shotgun-shot',
      compactShotgunShot: 'audio-weapon-compact-shotgun-shot',
      assaultRifleShot: 'audio-weapon-assault-rifle-shot',
      sniperRifleShot: 'audio-weapon-sniper-rifle-shot',
      grenadeLauncherShot: 'audio-weapon-grenade-launcher-shot',
      teslaShot: 'audio-weapon-tesla-shot',
    },
    Effects: {
      grenadeExplosion: 'audio-effect-grenade-explosion',
    },
  },
} as const;

const createFrameKeys = (prefix: string, count: number): string[] =>
  Array.from({ length: count }, (_, index) => `${prefix}-${index}`);

export const ZombieFrameKeys = {
  walk: Array.from({ length: 9 }, (_, index) => `enemy-zombie-walk-${index}`),
  attack: Array.from({ length: 7 }, (_, index) => `enemy-zombie-attack-${index}`),
  death: Array.from({ length: 7 }, (_, index) => `enemy-zombie-death-${index}`),
} as const;

export const EnemyFrameKeys = {
  zombie: ZombieFrameKeys,
  'zombie-bruiser': {
    walk: createFrameKeys('enemy-zombie-bruiser-walk', 6),
    attack: createFrameKeys('enemy-zombie-bruiser-attack', 6),
    death: createFrameKeys('enemy-zombie-bruiser-death', 7),
  },
  'zombie-toxic': {
    walk: createFrameKeys('enemy-zombie-toxic-walk', 6),
    attack: createFrameKeys('enemy-zombie-toxic-attack', 6),
    death: createFrameKeys('enemy-zombie-toxic-death', 7),
  },
  'zombie-tank': {
    walk: createFrameKeys('enemy-zombie-tank-walk', 8),
    attack: createFrameKeys('enemy-zombie-tank-attack', 7),
    death: createFrameKeys('enemy-zombie-tank-death', 7),
  },
  'zombie-runner': {
    walk: createFrameKeys('enemy-zombie-runner-walk', 6),
    attack: createFrameKeys('enemy-zombie-runner-attack', 7),
    death: createFrameKeys('enemy-zombie-runner-death', 9),
  },
  'zombie-berserker': {
    walk: createFrameKeys('enemy-zombie-berserker-walk', 8),
    attack: createFrameKeys('enemy-zombie-berserker-attack', 7),
    death: createFrameKeys('enemy-zombie-berserker-death', 9),
  },
  'zombie-armored': {
    walk: createFrameKeys('enemy-zombie-armored-walk', 6),
    attack: createFrameKeys('enemy-zombie-armored-attack', 7),
    death: createFrameKeys('enemy-zombie-armored-death', 9),
  },
  'zombie-crawler': {
    walk: createFrameKeys('enemy-zombie-crawler-walk', 6),
    attack: createFrameKeys('enemy-zombie-crawler-attack', 7),
    death: createFrameKeys('enemy-zombie-crawler-death', 9),
  },
  'zombie-mutant': {
    walk: createFrameKeys('enemy-zombie-mutant-walk', 6),
    attack: createFrameKeys('enemy-zombie-mutant-attack', 7),
    death: createFrameKeys('enemy-zombie-mutant-death', 9),
  },
} as const;

type AnimatedEnemyId = Exclude<EnemyId, 'zombie'>;

function createEnemyFrameAssets(enemyId: AnimatedEnemyId): ImageAsset[] {
  const frames = EnemyFrameKeys[enemyId];
  const cacheVersion = NEW_ENEMY_IDS.has(enemyId) ? '?v=20260623-walkfix' : '';
  return (['walk', 'attack', 'death'] as const).flatMap((state) =>
    frames[state].map((key, index) => ({
      key,
      url: `assets/images/enemies/${enemyId}/${state}-${index}.png${cacheVersion}`,
    })),
  );
}

const NEW_ENEMY_IDS = new Set<AnimatedEnemyId>([
  'zombie-runner',
  'zombie-berserker',
  'zombie-armored',
  'zombie-crawler',
  'zombie-mutant',
]);

export type ImageAsset = {
  key: string;
  url: string;
};

export type SpritesheetAsset = {
  key: string;
  url: string;
  frameWidth: number;
  frameHeight: number;
  margin?: number;
  spacing?: number;
};

export type AudioAsset = {
  key: string;
  urls: string[];
};

export const imageAssets: ImageAsset[] = [
  { key: AssetKeys.Backgrounds.battlefield, url: 'assets/images/backgrounds/phone-1.png?v=20260615a' },
  { key: AssetKeys.Structures.bunker, url: 'assets/images/structures/bunker.png?v=20260624a' },
  { key: AssetKeys.Currency.caps, url: 'assets/images/ui/currency-caps.png?v=20260618c' },
  { key: AssetKeys.Currency.tokens, url: 'assets/images/ui/currency-tokens.png?v=20260618d' },
  { key: AssetKeys.Weapons.pistol, url: 'assets/images/weapons/pistol.png' },
  { key: AssetKeys.Weapons.shotgun, url: 'assets/images/weapons/shotgun.png?v=20260611d' },
  { key: AssetKeys.Weapons.tesla, url: 'assets/images/weapons/tesla.png' },
  { key: AssetKeys.Weapons.assaultRifle, url: 'assets/images/weapons/assault-rifle.png?v=20260611c' },
  { key: AssetKeys.Weapons.compactShotgun, url: 'assets/images/weapons/compact-shotgun.png?v=20260611b' },
  { key: AssetKeys.Weapons.sniperRifle, url: 'assets/images/weapons/sniper-rifle.png?v=20260611c' },
  { key: AssetKeys.Weapons.grenadeLauncher, url: 'assets/images/weapons/grenade-launcher.png?v=20260611b' },
  { key: AssetKeys.Enemies.zombieSouth, url: 'assets/images/enemies/zombie-south.png' },
  { key: AssetKeys.Enemies.mutant, url: 'assets/images/enemies/mutant.png' },
  ...ZombieFrameKeys.walk.map((key, index) => ({ key, url: `assets/images/enemies/zombie/walk-${index}.png` })),
  ...ZombieFrameKeys.attack.map((key, index) => ({ key, url: `assets/images/enemies/zombie/attack-${index}.png` })),
  ...ZombieFrameKeys.death.map((key, index) => ({ key, url: `assets/images/enemies/zombie/death-${index}.png` })),
  ...createEnemyFrameAssets('zombie-bruiser'),
  ...createEnemyFrameAssets('zombie-toxic'),
  ...createEnemyFrameAssets('zombie-tank'),
  ...createEnemyFrameAssets('zombie-runner'),
  ...createEnemyFrameAssets('zombie-berserker'),
  ...createEnemyFrameAssets('zombie-armored'),
  ...createEnemyFrameAssets('zombie-crawler'),
  ...createEnemyFrameAssets('zombie-mutant'),
];
export const spritesheetAssets: SpritesheetAsset[] = [];
export const audioAssets: AudioAsset[] = [
  { key: AssetKeys.Audio.Weapons.pistolShot, urls: ['assets/audio/weapon-pistol-shot.mp3'] },
  { key: AssetKeys.Audio.Weapons.shotgunShot, urls: ['assets/audio/weapon-shotgun-shot.mp3'] },
  { key: AssetKeys.Audio.Weapons.compactShotgunShot, urls: ['assets/audio/weapon-compact-shotgun-shot.mp3'] },
  { key: AssetKeys.Audio.Weapons.assaultRifleShot, urls: ['assets/audio/weapon-assault-rifle-shot.mp3'] },
  { key: AssetKeys.Audio.Weapons.sniperRifleShot, urls: ['assets/audio/weapon-sniper-rifle-shot.mp3'] },
  { key: AssetKeys.Audio.Weapons.grenadeLauncherShot, urls: ['assets/audio/weapon-grenade-launcher-shot.mp3'] },
  { key: AssetKeys.Audio.Weapons.teslaShot, urls: ['assets/audio/weapon-tesla-shot.mp3'] },
  { key: AssetKeys.Audio.Effects.grenadeExplosion, urls: ['assets/audio/effect-grenade-explosion.mp3'] },
];

export function loadAssetManifest(scene: Phaser.Scene): void {
  for (const asset of imageAssets) {
    scene.load.image(asset.key, asset.url);
  }

  for (const asset of spritesheetAssets) {
    scene.load.spritesheet(asset.key, asset.url, {
      frameWidth: asset.frameWidth,
      frameHeight: asset.frameHeight,
      margin: asset.margin,
      spacing: asset.spacing,
    });
  }

  for (const asset of audioAssets) {
    scene.load.audio(asset.key, asset.urls);
  }
}

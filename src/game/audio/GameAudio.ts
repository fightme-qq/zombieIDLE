import Phaser from 'phaser';
import { AssetKeys } from '../assets/assetManifest';
import type { WeaponId } from '../data/weaponData';
import { getSfxVolume } from '../save/GameSettings';

type WeaponFireSfxDefinition = {
  key: string;
  volume: number;
  throttleMs: number;
  seekSeconds?: number;
  detuneRange?: number;
};

const WEAPON_FIRE_SFX: Partial<Record<WeaponId, WeaponFireSfxDefinition>> = {
  starter_pistol: {
    key: AssetKeys.Audio.Weapons.pistolShot,
    volume: 0.34,
    throttleMs: 85,
    seekSeconds: 0.015,
    detuneRange: 35,
  },
  pistol: {
    key: AssetKeys.Audio.Weapons.pistolShot,
    volume: 0.34,
    throttleMs: 85,
    seekSeconds: 0.015,
    detuneRange: 35,
  },
  shotgun: {
    key: AssetKeys.Audio.Weapons.shotgunShot,
    volume: 0.28,
    throttleMs: 180,
    seekSeconds: 0.005,
    detuneRange: 18,
  },
  compactShotgun: {
    key: AssetKeys.Audio.Weapons.compactShotgunShot,
    volume: 0.28,
    throttleMs: 170,
    detuneRange: 18,
  },
  assaultRifle: {
    key: AssetKeys.Audio.Weapons.assaultRifleShot,
    volume: 0.22,
    throttleMs: 120,
    seekSeconds: 0.42,
    detuneRange: 22,
  },
  sniperRifle: {
    key: AssetKeys.Audio.Weapons.sniperRifleShot,
    volume: 0.32,
    throttleMs: 220,
    seekSeconds: 0.59,
    detuneRange: 12,
  },
  grenadeLauncher: {
    key: AssetKeys.Audio.Weapons.grenadeLauncherShot,
    volume: 0.3,
    throttleMs: 260,
    detuneRange: 10,
  },
  tesla: {
    key: AssetKeys.Audio.Weapons.teslaShot,
    volume: 0.24,
    throttleMs: 180,
    detuneRange: 16,
  },
};

const GRENADE_EXPLOSION_SFX: WeaponFireSfxDefinition = {
  key: AssetKeys.Audio.Effects.grenadeExplosion,
  volume: 0.34,
  throttleMs: 140,
  detuneRange: 12,
};

const lastPlayedByScene = new WeakMap<Phaser.Scene, Map<string, number>>();

export function playWeaponFireSfx(scene: Phaser.Scene, weaponId: WeaponId): void {
  const sfx = WEAPON_FIRE_SFX[weaponId];
  playSfx(scene, sfx);
}

export function playGrenadeExplosionSfx(scene: Phaser.Scene): void {
  playSfx(scene, GRENADE_EXPLOSION_SFX);
}

function playSfx(scene: Phaser.Scene, sfx: WeaponFireSfxDefinition | undefined): void {
  if (!sfx) return;
  if (scene.sound.locked) return;
  if (!scene.cache.audio.exists(sfx.key)) return;

  const now = scene.time.now;
  const scenePlayed = getScenePlayedMap(scene);
  const lastPlayedAt = scenePlayed.get(sfx.key) ?? -Infinity;
  if (now - lastPlayedAt < sfx.throttleMs) return;

  scenePlayed.set(sfx.key, now);
  scene.sound.play(sfx.key, {
    volume: sfx.volume * getSfxVolume(),
    seek: sfx.seekSeconds ?? 0,
    detune: sfx.detuneRange ? Phaser.Math.Between(-sfx.detuneRange, sfx.detuneRange) : 0,
  });
}

function getScenePlayedMap(scene: Phaser.Scene): Map<string, number> {
  let scenePlayed = lastPlayedByScene.get(scene);
  if (!scenePlayed) {
    scenePlayed = new Map<string, number>();
    lastPlayedByScene.set(scene, scenePlayed);
  }

  return scenePlayed;
}

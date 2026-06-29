import Phaser from 'phaser';
import { AssetKeys } from '../assets/assetManifest';
import type { WeaponId } from '../data/weaponData';
import { getMusicVolume, getSfxVolume } from '../save/GameSettings';

type WeaponFireSfxDefinition = {
  key: string;
  volume: number;
  throttleMs: number;
  seekSeconds?: number;
  detuneRange?: number;
  volumeJitter?: number;
  skipIfPlaying?: boolean;
};

type VolumeControlledSound = Phaser.Sound.BaseSound & {
  volume: number;
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

const ZOMBIE_AMBIENT_SFX: WeaponFireSfxDefinition = {
  key: AssetKeys.Audio.Enemies.zombieAmbient,
  volume: 0.16,
  throttleMs: 5200,
  detuneRange: 45,
  volumeJitter: 0.16,
  skipIfPlaying: true,
};

const ZOMBIE_DEATH_SFX: WeaponFireSfxDefinition = {
  key: AssetKeys.Audio.Enemies.zombieDeath,
  volume: 0.2,
  throttleMs: 360,
  detuneRange: 55,
  volumeJitter: 0.2,
};

const BACKGROUND_MUSIC_PLAYLIST = [
  { key: AssetKeys.Audio.Music.carnivalOfNightmares, volume: 0.42 },
  { key: AssetKeys.Audio.Music.dreadfulApparition, volume: 0.42 },
  { key: AssetKeys.Audio.Music.echoesOfTheAbyss, volume: 0.42 },
] as const;

const lastPlayedByScene = new WeakMap<Phaser.Scene, Map<string, number>>();
const nextZombieAmbientAt = new WeakMap<Phaser.Scene, number>();
let backgroundMusic: Phaser.Sound.BaseSound | null = null;
let backgroundMusicScene: Phaser.Scene | null = null;
let backgroundMusicTrackIndex = 0;
let backgroundMusicRequested = false;
let backgroundUnlockListenerRegistered = false;

export function playWeaponFireSfx(scene: Phaser.Scene, weaponId: WeaponId): void {
  const sfx = WEAPON_FIRE_SFX[weaponId];
  playSfx(scene, sfx);
}

export function playGrenadeExplosionSfx(scene: Phaser.Scene): void {
  playSfx(scene, GRENADE_EXPLOSION_SFX);
}

export function maybePlayZombieAmbientSfx(scene: Phaser.Scene, activeEnemyCount: number): void {
  if (activeEnemyCount <= 0) {
    nextZombieAmbientAt.delete(scene);
    return;
  }

  const now = scene.time.now;
  const nextAt = nextZombieAmbientAt.get(scene);
  if (nextAt === undefined) {
    nextZombieAmbientAt.set(scene, now + Phaser.Math.Between(2200, 6200));
    return;
  }
  if (now < nextAt) return;

  nextZombieAmbientAt.set(scene, now + Phaser.Math.Between(5600, 11800));
  const chance = Phaser.Math.Clamp(0.24 + activeEnemyCount * 0.045, 0.28, 0.86);
  if (Math.random() > chance) return;

  playSfx(scene, ZOMBIE_AMBIENT_SFX);
}

export function maybePlayZombieDeathSfx(scene: Phaser.Scene, isBoss = false): void {
  const chance = isBoss ? 0.72 : 0.16;
  if (Math.random() > chance) return;

  playSfx(scene, ZOMBIE_DEATH_SFX);
}

export function startBackgroundMusic(scene: Phaser.Scene): void {
  backgroundMusicRequested = true;
  backgroundMusicScene = scene;

  if (backgroundMusic?.isPlaying) {
    applyMusicVolume();
    return;
  }

  if (scene.sound.locked) {
    registerBackgroundMusicUnlock(scene);
    return;
  }

  playCurrentBackgroundMusicTrack(scene);
}

export function applyMusicVolume(): void {
  if (!backgroundMusic) return;

  const track = BACKGROUND_MUSIC_PLAYLIST[backgroundMusicTrackIndex];
  setSoundVolume(backgroundMusic, track.volume * getMusicVolume());
}

function playSfx(scene: Phaser.Scene, sfx: WeaponFireSfxDefinition | undefined): void {
  if (!sfx) return;
  if (scene.sound.locked) return;
  if (!scene.cache.audio.exists(sfx.key)) return;

  const now = scene.time.now;
  const scenePlayed = getScenePlayedMap(scene);
  const lastPlayedAt = scenePlayed.get(sfx.key) ?? -Infinity;
  if (now - lastPlayedAt < sfx.throttleMs) return;
  if (sfx.skipIfPlaying && scene.sound.get(sfx.key)?.isPlaying) return;

  scenePlayed.set(sfx.key, now);
  const volumeJitter = sfx.volumeJitter ? Phaser.Math.FloatBetween(1 - sfx.volumeJitter, 1 + sfx.volumeJitter) : 1;
  scene.sound.play(sfx.key, {
    volume: sfx.volume * getSfxVolume() * volumeJitter,
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

function registerBackgroundMusicUnlock(scene: Phaser.Scene): void {
  if (backgroundUnlockListenerRegistered) return;

  backgroundUnlockListenerRegistered = true;
  scene.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
    backgroundUnlockListenerRegistered = false;
    if (!backgroundMusicRequested) return;
    playCurrentBackgroundMusicTrack(backgroundMusicScene ?? scene);
  });
}

function playCurrentBackgroundMusicTrack(scene: Phaser.Scene): void {
  if (backgroundMusic?.isPlaying) return;

  const track = BACKGROUND_MUSIC_PLAYLIST[backgroundMusicTrackIndex];
  if (!scene.cache.audio.exists(track.key)) return;

  backgroundMusic?.destroy();
  backgroundMusic = scene.sound.add(track.key, {
    loop: false,
    volume: track.volume * getMusicVolume(),
  });

  backgroundMusic.once(Phaser.Sound.Events.COMPLETE, () => {
    backgroundMusic?.destroy();
    backgroundMusic = null;
    backgroundMusicTrackIndex = (backgroundMusicTrackIndex + 1) % BACKGROUND_MUSIC_PLAYLIST.length;
    if (backgroundMusicRequested) {
      playCurrentBackgroundMusicTrack(backgroundMusicScene ?? scene);
    }
  });

  backgroundMusic.play();
}

function setSoundVolume(sound: Phaser.Sound.BaseSound, volume: number): void {
  (sound as VolumeControlledSound).volume = volume;
}

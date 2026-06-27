import type { EnemyId } from '../data/enemyData';

export type GameSettings = {
  musicVolume: number;
  sfxVolume: number;
  enemyScale: number;
  enemyScales: Partial<Record<EnemyId, number>>;
};

const STORAGE_KEY = 'surv.settings';
const DEFAULT_ENEMY_SCALE = 1.55;
const DEFAULT_ENEMY_SCALES: Partial<Record<EnemyId, number>> = {
  'zombie-bruiser': 1.35,
  'zombie-toxic': 1.35,
  'zombie-tank': 1.35,
  'zombie-runner': 0.9,
  'zombie-berserker': 0.85,
  'zombie-armored': 1.15,
  'zombie-crawler': 1.35,
  'zombie-mutant': 1.35,
};

export const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.6,
  sfxVolume: 0.4,
  enemyScale: DEFAULT_ENEMY_SCALE,
  enemyScales: DEFAULT_ENEMY_SCALES,
};

export function loadGameSettings(): GameSettings {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaultSettings();
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return normalizeSettings(parsed);
  } catch {
    return cloneDefaultSettings();
  }
}

export function saveGameSettings(settings: GameSettings): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(normalizeSettings(settings)));
  } catch {
    // Storage can be unavailable in private/browser-restricted contexts.
  }
}

export function updateGameSettings(patch: Partial<GameSettings>): GameSettings {
  const settings = normalizeSettings({ ...loadGameSettings(), ...patch });
  saveGameSettings(settings);
  return settings;
}

export function getSfxVolume(): number {
  return loadGameSettings().sfxVolume;
}

export function getMusicVolume(): number {
  return loadGameSettings().musicVolume;
}

export function getEnemyScale(enemyId?: EnemyId): number {
  const settings = loadGameSettings();
  return enemyId ? settings.enemyScales[enemyId] ?? settings.enemyScale : settings.enemyScale;
}

export function getDefaultEnemyScale(enemyId?: EnemyId): number {
  return enemyId ? DEFAULT_ENEMY_SCALES[enemyId] ?? DEFAULT_ENEMY_SCALE : DEFAULT_ENEMY_SCALE;
}

function normalizeSettings(settings: Partial<GameSettings>): GameSettings {
  return {
    musicVolume: clampVolume(settings.musicVolume, DEFAULT_SETTINGS.musicVolume),
    sfxVolume: clampVolume(settings.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
    enemyScale: clampEnemyScale(settings.enemyScale, DEFAULT_ENEMY_SCALE),
    enemyScales: normalizeEnemyScales(settings.enemyScales),
  };
}

function cloneDefaultSettings(): GameSettings {
  return {
    ...DEFAULT_SETTINGS,
    enemyScales: { ...DEFAULT_ENEMY_SCALES },
  };
}

function clampVolume(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}

function clampEnemyScale(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0.45, Math.min(1.8, value)) : fallback;
}

function normalizeEnemyScales(scales: unknown): Partial<Record<EnemyId, number>> {
  if (!scales || typeof scales !== 'object') return { ...DEFAULT_ENEMY_SCALES };
  return {
    ...DEFAULT_ENEMY_SCALES,
    ...Object.fromEntries(
      Object.entries(scales as Record<string, unknown>).map(([enemyId, scale]) => [enemyId, clampEnemyScale(scale, getDefaultEnemyScale(enemyId as EnemyId))]),
    ),
  } as Partial<Record<EnemyId, number>>;
}

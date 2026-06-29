import { RunState, type RunStateSnapshot } from '../state/RunState';

export const RUN_PROGRESS_STORAGE_KEY = 'surv.progress.v1';

export function loadRunProgress(): RunStateSnapshot | null {
  try {
    const raw = globalThis.localStorage?.getItem(RUN_PROGRESS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RunStateSnapshot>;
    return parsed.version === 1 ? (parsed as RunStateSnapshot) : null;
  } catch {
    return null;
  }
}

export function saveRunProgress(state: RunState): void {
  try {
    globalThis.localStorage?.setItem(RUN_PROGRESS_STORAGE_KEY, JSON.stringify(state.toSnapshot()));
  } catch {
    // Progress persistence is optional in storage-restricted browser contexts.
  }
}

export function clearAllSurvStorage(): void {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return;
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((key): key is string => Boolean(key));
    keys.forEach((key) => {
      if (key === RUN_PROGRESS_STORAGE_KEY || key.startsWith('surv.') || key.startsWith('surv:')) {
        storage.removeItem(key);
      }
    });
  } catch {
    // Reset should still refresh runtime state even if storage is unavailable.
  }
}

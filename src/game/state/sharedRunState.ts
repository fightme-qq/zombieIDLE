import { RunState } from './RunState';
import { loadRunProgress } from '../save/RunProgress';

export const sharedRunState = new RunState();
sharedRunState.restore(loadRunProgress());

export function resetSharedRunState(): void {
  sharedRunState.reset();
}

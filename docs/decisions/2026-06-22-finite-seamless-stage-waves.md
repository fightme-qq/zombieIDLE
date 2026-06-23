# Decision: Finite seamless stage waves

Date: 2026-06-22

## Context

The battle previously spawned random enemies indefinitely until 25 kills, then destroyed and recreated the battle system. Stages need a fixed enemy composition and must advance only after the whole wave is defeated without interrupting active gameplay.

## Decision

Define deterministic stage-wave compositions in `src/game/data/stageWaveData.ts`. The battle system consumes a finite shuffled queue and marks the stage complete only after every queued enemy is killed. On victory, the existing battle system receives the next wave while preserving bunker health, projectiles, rewards, scenes, and animation cleanup.

## Consequences

Stage composition is explicit and testable. Stage victory no longer resets combat. Failure still rebuilds the battle at the current checkpoint with restored bunker health.

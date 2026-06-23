# Decision: first playable scene flow

Date: 2026-05-25

## Context

The generated template opened an onboarding prompt scene before gameplay. The project now has a concrete first playable loop for a desktop Yandex Games browser game.

## Decision

After preload, the game starts `GameScene` directly. `GameScene` owns the preparation, battle, and result phases for the first playable while battle behavior is delegated to `BattleSystem`.

## Consequences

The player reaches the playable loop immediately. A dedicated menu scene can be added later if the game needs settings, localization, or a richer start flow.

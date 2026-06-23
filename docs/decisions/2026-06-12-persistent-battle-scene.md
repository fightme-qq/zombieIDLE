# Decision: persistent battle scene

Date: 2026-06-12

## Context

The idle zombie game must keep combat running while the player browses Equip, Upgrades, Shop, or other overlays.

## Decision

`BattleScene` now launches as a persistent scene after preload and owns the live `BattleSystem`. `GameScene` launches above it as the tab/equip overlay and reads/writes the shared `RunState`.

## Consequences

Switching tabs no longer destroys battle display objects or stops combat simulation. Future UI work should avoid moving battle logic back into overlay scenes.

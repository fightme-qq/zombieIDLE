# Decision: overlay management panels

Date: 2026-06-12

## Context

The idle zombie game should keep the live battle visible while the player manages equipment, upgrades, and shop actions.

## Decision

Tabs no longer behave like full-screen scene replacements. `GameScene` draws management panels over the persistent `BattleScene`: Fight stays mostly transparent, Equip uses left/right panels, and Upgrades/Shop use side panels.

## Consequences

The player can keep watching combat while changing the arsenal. Future UI work should fit into panels or drawers instead of covering the full battlefield unless a true modal is required.

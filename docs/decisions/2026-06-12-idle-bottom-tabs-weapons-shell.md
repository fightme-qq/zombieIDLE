# Decision: Bottom Tabs For Idle Shell

Date: 2026-06-12

## Context

The old prep screen bundled the weapon grid, reroll, upgrades, and battle entry into one view. The idle design needs separate navigation for fight management and loadout management.

## Decision

The gameplay scene now renders a fixed bottom tab row with `Fight`, `Weapons`, `Upgrades`, and `Shop`. The weapon grid and reroll action live under `Weapons`; the battle entry lives under `Fight`.

## Consequences

The layout matches the intended idle shell, the loadout screen is easier to scan, and later tabs can grow without reworking the core battle flow again.

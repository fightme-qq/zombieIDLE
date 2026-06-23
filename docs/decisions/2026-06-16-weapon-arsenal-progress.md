# Decision: weapon arsenal progress

Date: 2026-06-16

## Context

Weapon power used to live on individual placed weapons. The upgrade screen needed a dedicated arsenal where each weapon can be unlocked and upgraded independently with soft.

## Decision

Weapon unlocks and stat upgrades now live on per-weapon progress in run state. Placed weapons still define grid loadout, while weapon type progress defines damage, fire rate, handling, and each weapon's special upgrade.

## Consequences

The player can invest in a weapon type once and have every copy of that weapon benefit. Shop rolls can be filtered by unlocked weapons, and the upgrade UI can show locked weapons, stat costs, and DPS changes without depending on grid placement.

# Idle Zombie Arsenal Rework Plan

Working implementation plan for turning the current weapon-roll prototype into an idle zombie auto-battle game with a tetris-like Equip grid.

## Product Target

The game should feel like an idle arsenal defense:

- the player starts with one equipped starter pistol;
- zombies fight the survivor base automatically;
- equipped weapons fire automatically;
- zombie kills are the only source of `soft`;
- the player spends `soft` on weapon rolls, weapon placement, weapon upgrades, grid growth, and global upgrades;
- every 10th stage is a boss gate;
- failure returns the player to the current checkpoint block without wiping money, weapons, grid, or upgrades.

## First Playable Contract

The first playable is complete when:

1. A new run starts at stage 1 with `starter_pistol` already placed on the Equip grid.
2. The Fight tab runs an automatic zombie battle.
3. The starter pistol shoots automatically in Fight.
4. Zombie kills grant `soft`.
5. The Equip tab shows the tetris-like weapon grid, including the starter pistol.
6. The player can buy or roll one additional weapon and place it on the grid.
7. Weapons placed on the grid immediately affect the Fight tab.
8. The game can be validated with build/tests and a short manual phone-sized smoke pass.

## Core Gameplay

### Fight

Fight is the default tab and the live result screen for the player's arsenal.

Visible information:

- `soft`;
- current stage;
- best/highest stage;
- current checkpoint;
- base HP;
- kill progress;
- boss HP on boss stages;
- DPS or total equipped power.

Behavior:

- zombies spawn automatically;
- equipped weapons fire automatically;
- kills grant `soft`;
- clearing a stage advances to the next stage;
- every 10th stage is a boss;
- losing base HP to zero returns the player to the checkpoint start for the current 10-stage block.

### Equip

Equip is the main build screen. It replaces the idea of a simple list of weapon slots with a tetris-like weapon grid.

Rules:

- the starting grid is `6 x 2`;
- the maximum grid is `15 x 15`;
- the first active cell starts with `starter_pistol`;
- weapons have shapes, not just slot counts;
- only weapons placed on active cells are equipped;
- inactive cells are visible or hinted only when useful for grid growth;
- placement previews show valid and invalid cells;
- grid expansion adds one active cell at a time inside a compact armory footprint;
- the visible footprint grows only when the current footprint cannot contain the next active cell;
- growth should prefer a readable compact rectangle over a long strip.

Example weapon shapes:

```text
Pistol:          1x1
Shotgun:         2x1
Rifle:           3x1
SMG:             2x1
Turret:          2x2
GrenadeLauncher: 2x1 or L-shape
Flamethrower:    3x1
```

### Upgrades

Upgrades are global modifiers, separate from grid placement.

First upgrade set:

- weapon damage;
- attack speed;
- base HP;
- crit chance;
- boss damage;
- rare roll chance;
- reroll discount;
- grid cell discount.

### Shop

Shop is optional for the first playable. It can later contain:

- reroll tickets;
- temporary boosts;
- rare weapon offers;
- boss crates;
- rewarded ad offers for Yandex builds.

## State And Data Model

Keep idle rules outside Phaser scenes.

Suggested modules:

- `src/game/idle/StageProgression.ts`: stages, checkpoints, boss checks, failure target.
- `src/game/idle/Economy.ts`: kill rewards, boss rewards, reroll costs, grid cell costs.
- `src/game/idle/EnemyScaling.ts`: zombie HP, boss HP, base damage pressure.
- `src/game/idle/EquipGrid.ts`: active cells, shapes, rotation, placement, removal.
- `src/game/idle/WeaponCatalog.ts`: weapon definitions and shape data, or use `src/game/data/idleContent.ts`.
- `src/game/data/idleContent.ts`: tunable constants, upgrade catalog, weapon roll pools.
- `src/game/state/RunState.ts`: current stage, highest stage, `soft`, base HP, weapons, placed weapons, upgrades.

Scenes should render state, route input, and call systems. They should not own formulas.

## Rework Slices

### ID-01: Idle Stage And Economy Core

Goal: introduce stage/checkpoint/soft rules without touching UI heavily.

Status: done.

Implementation:

- add stage progression helpers;
- add economy helpers;
- add enemy scaling helpers;
- add tests for checkpoint and boss rules.

Validation:

- `isBossStage(10)` is true;
- `checkpointStage(17)` returns `11`;
- failure on stage 20 returns `11`;
- kill rewards scale from stage.
- enemy HP, speed, damage, and boss HP scale from stage.

### ID-02: Starter Pistol Contract

Goal: every new run starts with one working weapon.

Status: done.

Implementation:

- define `starter_pistol`;
- give it `1x1` shape;
- create default run state with the pistol placed in the first active grid cell;
- prevent a new game from starting with an empty arsenal.

Validation:

- new run has exactly one placed weapon;
- the placed weapon is `starter_pistol`;
- the Fight tab can derive non-zero DPS from the grid.

### ID-03: Equip Grid Model

Goal: make tetris-like placement a pure, testable system.

Status: done.

Implementation:

- add grid dimensions;
- add active cell tracking;
- add weapon shape definitions;
- add `canPlaceWeapon`;
- add `placeWeapon`;
- add `removeWeapon`;
- add optional rotation support if the current UI needs it.

Validation:

- 1x1 pistol fits in the first cell;
- 3x1 rifle fails when it crosses inactive/out-of-bounds cells;
- overlapping weapons are rejected;
- removing a weapon frees its occupied cells.

### ID-04: Fight Reads Equipped Weapons

Goal: the battle uses the Equip grid as the source of truth.

Status: done.

Implementation:

- derive active weapon stats from placed grid weapons;
- convert weapon stats into auto-fire behavior;
- grant `soft` on zombie kills;
- update stage progress after kills.

Validation:

- removing a weapon lowers DPS;
- adding a weapon increases DPS;
- kills grant `soft`;
- stage advances after the required kills.

### ID-05: Equip Tab UI

Goal: expose the current weapon grid to the player.

Status: done.

Implementation:

- create or adapt the Equip/Weapons tab;
- render the active grid;
- render inactive/locked cells only if useful for growth;
- show the starter pistol on the grid;
- show selected weapon placement preview;
- show valid placement in green and invalid placement in red.

Validation:

- phone viewport remains readable;
- tapping or dragging a weapon clearly targets cells;
- equipped weapons match the state model;
- Fight and Equip agree on what is active.

### ID-06: Weapon Roll Set

Goal: let the player acquire new weapons for the grid.

Status: done.

Implementation:

- show 3 roll offers under the grid;
- each offer has icon/name/shape/cost/rarity;
- buying a weapon requires `soft`;
- after buying, the weapon can be placed on the grid;
- reroll spends `soft` and refreshes offers.

Validation:

- unaffordable offers are disabled;
- buying subtracts `soft`;
- new weapon appears in placement flow;
- reroll changes the offer set.

### ID-07: Weapon Upgrade And Merge

Goal: make weapons improve differently from global upgrades.

Status: done for direct placed-weapon upgrades. Merge is intentionally delayed.

Implementation options:

- direct weapon level upgrades with `soft`;
- merge two identical same-level weapons into one higher-level weapon;
- later: rarity evolution or weapon family bonuses.

Recommended first version:

- support direct upgrade for placed weapons;
- delay full merge until placement and roll flow are stable.

Validation:

- upgrading a pistol increases its damage or attack speed;
- upgraded weapon updates Fight DPS;
- upgrade cost and next effect are visible.

### ID-08: Grid Growth

Goal: let the player expand the arsenal space.

Status: done with compact armory growth.

Implementation:

- start with `6 x 2`;
- buy `+1 cell` with `soft`;
- unlock active cells in row-major order inside the current footprint;
- grow the visible footprint only when the next active cell no longer fits;
- prefer compact rectangular growth instead of alternating down/right every purchase;
- eventually support up to `15 x 15`;
- make cell cost exponential.

Validation:

- buying a cell increases active cell count by one;
- new cell can hold weapons;
- cost increases after each purchase;
- grid remains readable on mobile.

### ID-09: Boss Gates

Goal: add stage pressure and a clear reason to improve the arsenal.

Implementation:

- stage `10, 20, 30...` becomes a boss;
- boss has HP multiplier;
- boss has visible HP bar;
- boss victory grants a burst reward;
- boss failure returns to checkpoint start.

Validation:

- stage 10 spawns a boss;
- boss HP UI appears;
- victory advances to stage 11;
- failure returns to stage 1 for stage 10, stage 11 for stage 20.

### ID-10: Save And Resume

Goal: preserve idle progression.

Implementation:

- save `soft`;
- save current/highest stage;
- save active grid cells;
- save weapon inventory and placed weapons;
- save upgrades;
- add save version for future migrations.

Validation:

- refresh preserves the starter pistol and any bought weapons;
- refresh preserves `soft`;
- corrupted save falls back to a valid default run.

## Initial Weapon Catalog

First implementation should stay small.

| ID | Name | Shape | Role |
| --- | --- | --- | --- |
| `starter_pistol` | Starter Pistol | `1x1` | baseline single-target weapon |
| `pistol` | Pistol | `1x1` | cheap filler |
| `shotgun` | Shotgun | `2x1` | close-range burst |
| `smg` | SMG | `2x1` | fast low damage |
| `rifle` | Rifle | `3x1` | long-range single target |
| `grenade_launcher` | Grenade Launcher | `2x1` or `L` | splash damage |
| `turret` | Turret | `2x2` | high value, expensive footprint |

## Visual Direction

Use the reference as density guidance, not as a direct copy.

Direction:

- pixel-art zombie survival;
- dark brown/black UI panels;
- rusty metal grid cells;
- green for affordable/valid;
- red for damage/invalid;
- yellow for progress and important values;
- clear bottom tabs: `Fight`, `Equip`, `Upgrades`, `Shop`.

Priority order:

1. Stage, base HP, and `soft` must read first.
2. Active weapon placement must be obvious.
3. Affordable actions must be obvious.
4. Animation polish comes after the first playable loop is stable.

## First Implementation Target

Start with this smallest useful slice:

1. ID-01: pure stage/economy helpers.
2. ID-02: starter pistol default state.
3. ID-03: pure Equip grid model.
4. ID-04: Fight reads equipped weapon stats.
5. ID-05: basic Equip tab view.

Do not start with prestige, pets/crew, ads, offline simulation, large weapon pools, or complex merge rules.

## Verification Plan

After each slice, run the most relevant checks:

- `npm run test` for pure idle/grid logic;
- `npm run build` for TypeScript and Vite integration;
- `npm run test:smoke` after scene/UI changes if Playwright is available;
- manual phone viewport pass for Fight and Equip readability.

Before calling the first playable done:

- new run starts with a placed pistol;
- Fight begins without extra player action;
- kills grant `soft`;
- Equip shows the same pistol that Fight uses;
- one bought weapon can be placed and affects combat;
- stage/checkpoint rules are visible and testable.

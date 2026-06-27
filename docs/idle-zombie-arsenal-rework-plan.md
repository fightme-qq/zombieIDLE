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

## Next Major Rework Plan: Combat Depth, Range, Upgrades, Bosses

Date: 2026-06-25

This section tracks the next larger combat/economy pass. The goal is to make weapon identity, zombie pressure, base upgrades, boss gates, and long-run scaling feel intentional instead of just "more DPS kills everything before it arrives."

### Design Goals

- Weapons should feel different by range, projectile behavior, upgrade identity, and unlock path.
- The base should matter: zombies must sometimes reach it, hit it, and force defensive investment.
- Boss stages should be clear checkpoint gates every 10 stages.
- Performance should remain safe as wave counts grow.
- Combat tuning should live in data and pure helpers, not scattered through scenes.

### Current Findings

#### Current `special` Upgrade Behavior

Current code path:

- `src/game/data/weaponData.ts` defines each weapon's `special` label and cost.
- `src/game/idle/WeaponStats.ts` computes stats.
- `getSpecialSpreadBonus()` currently returns bonus spread only for:
  - `shotgun`;
  - `compactShotgun`;
  - `grenadeLauncher`.
- Formula:

```ts
bonusSpread = Math.floor((specialLevel + 1) / 2)
```

Practical result:

- shotguns and grenade launcher gain extra shots/projectiles every other-ish special level;
- pistol, assault rifle, sniper rifle, and tesla currently get no real gameplay effect from `special`;
- UI text says `+shots`, but this is misleading for weapons whose special does nothing.

Decision needed:

- Either keep `special` as a per-weapon unique upgrade and implement unique effects per weapon, or remove it in favor of universal stats.
- Recommended: keep `special`, but make it truly weapon-specific and show weapon-specific effect text.

Example future specials:

| Weapon | Special concept |
| --- | --- |
| Pistol | double-tap chance or faster first shot |
| Shotgun | more pellets / wider cone |
| Tesla | chain targets or burn duration |
| Assault rifle | burst length or focus fire ramp |
| Compact shotgun | wider burst / close-range bonus |
| Sniper rifle | pierce or crit multiplier |
| Grenade launcher | explosion radius / shrapnel count |

### Rework Slices

#### NR-01: Projectile Readability Cleanup

Goal: make current projectile visuals readable without changing combat math.

Status: implemented.

Tasks:

- Reduce pistol projectile visual size by 50%.
- Keep rifle/sniper/grenade visuals as currently readable enough unless playtest says otherwise.
- Keep hit detection unchanged unless projectile gameplay is intentionally changed later.

Target files:

- `src/game/systems/BattleSystem.ts`

Validation:

- pistol bullet is visually smaller than rifle/sniper bullets;
- pistol still hits enemies correctly;
- `npm run build`;
- `npm run test:smoke`.

#### NR-02: Grenade Explosion Effect And Area Damage

Goal: grenade launcher should not feel like just another bullet. It should explode at the end/hit point.

Status: implemented first pass.

First implementation:

- grenade projectile flies normally;
- on enemy hit, spawn a short programmatic explosion:
  - outer orange smoke ring;
  - bright core flash;
  - 3-6 small debris/spark marks;
  - tween alpha/scale down over about 180-240 ms;
- damage all enemies within radius.

Performance note:

- A simple Phaser `Graphics` explosion per grenade hit is probably fine at current and near-future counts if:
  - lifetime is short;
  - no per-frame allocation after creation;
  - effects destroy themselves;
  - radius checks happen only on grenade hit, not every frame.
- If grenade fire rate or zombie counts become high, move explosions to a small object pool or generated texture sprite effect.
- Avoid particle emitters for the first pass; they are easy to overuse on mobile.

Initial tuning:

- explosion radius: `70-95 px`;
- primary target receives full damage;
- nearby enemies receive `50-75%` splash damage;
- explosion visual depth should be below bunker foreground but above road/enemies enough to read.

Target files:

- `src/game/systems/BattleSystem.ts`;
- maybe `src/game/data/weaponData.ts` for `splashRadius`.

Validation:

- grenade hit produces visible explosion;
- nearby zombies take damage;
- many explosions do not tank smoke test or manual FPS.

#### NR-03: Add Crit Chance Upgrade

Goal: add a universal offensive stat that is easy to understand.

Status: implemented first pass.

Rules:

- Add `critChance` as a weapon upgrade stat.
- Default crit damage multiplier: `150%`.
- Crit chance starts at `0%`.
- Suggested per-level gain: `+2.5%` or `+3%`.
- Suggested max level: `10`, for `25-30%` final crit chance.
- Crit roll happens per projectile/beam damage event.

Data changes:

- Extend `WeaponUpgradeStatId` with `critChance`.
- Add crit config to each weapon's upgrade set.
- Extend `WeaponProgress.stats`.
- Extend computed stats with:

```ts
critChance: number;
critMultiplier: number; // default 1.5
```

Implementation detail:

- Keep randomness in battle system, not pure stat calculation.
- For tests, pure helpers should expose deterministic expected stat values.

Target files:

- `src/game/data/weaponData.ts`;
- `src/game/idle/WeaponStats.ts`;
- `src/game/state/RunState.ts`;
- `src/game/scenes/GameScene.ts`;
- tests under `tests/unit/`.

Validation:

- crit stat appears in upgrade UI;
- crit chance increases after upgrade;
- crit damage can be observed with debug/test values;
- old saves need a migration/default fallback if save exists later.

#### NR-04: Add Weapon Range As A Core Stat

Goal: zombies should not all die at spawn. Range becomes the main lever for "when does this weapon start shooting?"

Status: implemented first pass.

Rules:

- Every weapon gets a base `rangePx`.
- Range is upgradable.
- Weapon target selection ignores enemies outside range.
- Range is measured from weapon mount position to enemy center.
- Pistol default range should be around one third of the road/combat height.
- Default pistol should allow basic zombies to reach the base and land a couple hits before dying, unless upgraded or combined with other weapons.

Initial range tuning concept:

| Weapon | Base range intent |
| --- | --- |
| Pistol | short/medium, about 33% screen height |
| Shotgun | short, high close pressure |
| Compact shotgun | very short, stronger close burst |
| Assault rifle | medium |
| Tesla | medium, beam utility |
| Sniper rifle | long |
| Grenade launcher | medium-long but slow |

Implementation changes:

- Add `rangePx` to `WeaponDefinition`.
- Add `range` upgrade stat.
- `BattleSystem.findTarget()` should become weapon-specific:
  - each weapon asks for best target inside its range;
  - the current priority is the lowest enemy on the road, meaning closest to the base.
- Consider target priority:
  - nearest to base first;
  - boss priority on boss stages;
  - later: weapon-specific priority.

Balance consequence:

- HP/speed/damage curves must be retuned after range lands.
- Pistol stage 1 should not fully prevent contact.
- More weapons and range upgrades should clearly push contact point upward.

Target files:

- `src/game/data/weaponData.ts`;
- `src/game/idle/WeaponStats.ts`;
- `src/game/systems/BattleSystem.ts`;
- `src/game/scenes/GameScene.ts`;
- tests for stat calculation/targeting where possible.

Validation:

- pistol does not shoot enemies at top spawn;
- pistol starts shooting around lower/middle road;
- base takes occasional hits with only default pistol;
- range upgrade visibly starts firing earlier.

#### NR-05: Split Upgrades Into Weapon And Base Tabs

Status: implemented first pass. Upgrades now has Weapons/Base sub-tabs, base HP/armor are separate, armor reduces incoming bunker damage, and weapon upgrade rows are clipped with mouse-wheel scrolling so long stat lists no longer overflow the panel.

Goal: Upgrades should not be one mixed pile. Base survival should have its own identity.

UI plan:

- Keep bottom navigation `Upgrades`.
- Inside Upgrades, add sub-tabs:
  - `Weapons`;
  - `Base`.

Base upgrade ideas:

| Upgrade | Effect |
| --- | --- |
| Max HP | increases bunker/base HP |
| Armor | flat or percent reduction to zombie hit damage |
| Repair | small heal after each stage or slow in-combat regen |
| Barricade | slows zombies near base |
| Emergency plating | one-time shield each stage |
| Token vault | optional later: improves boss token retention/rewards |

Recommended first base upgrades:

1. Max HP.
2. Armor.
3. Repair after stage clear.

Avoid first:

- complex active abilities;
- many currencies;
- base weapons/turrets before core weapon range is tuned.

Target files:

- `src/game/scenes/GameScene.ts`;
- `src/game/state/RunState.ts`;
- `src/game/data/idleContent.ts`;
- `src/game/systems/BattleSystem.ts` for armor/repair effects.

Validation:

- base sub-tab is readable on phone;
- HP upgrade affects battle HP;
- armor reduces incoming damage;
- repair is applied at stage transition only if included.

#### NR-06: Boss Fight System

Status: implemented first pass. Stages 10/20/30 rotate named bosses, boss-only source enemies are filtered out of regular waves, the battle HUD switches the stage bar to boss HP, and boss kills award hard tokens.

Goal: every 10 stages becomes a named boss gate with clear HP UI and token rewards.

Rules:

- Boss stages: `10, 20, 30, ...`.
- Choose 3 zombie types to become bosses.
- These boss types do not appear in ordinary waves.
- Boss has a visible top progress/HP bar.
- Boss kill grants hard currency/tokens.
- Boss failure returns to checkpoint start as already planned.

Recommended boss candidates:

| Boss ID | Based on | Name concept | Role |
| --- | --- | --- | --- |
| `boss_bruiser` | `zombie-bruiser` | Gatebreaker | slow, heavy base hits |
| `boss_toxic` | `zombie-toxic` | Plague Spitter | medium speed, damage-over-time later |
| `boss_mutant` | `zombie-mutant` | Alpha Mutant | elite all-rounder checkpoint boss |

Data structure:

- Add `bossData.ts` or extend enemy data with boss definitions.
- Boss definitions should include:
  - id;
  - display name;
  - source sprite/enemy frame set;
  - HP multiplier;
  - damage multiplier;
  - speed multiplier;
  - token reward;
  - stage rotation rules.

Wave rules:

- Remove boss enemy ids from regular stage wave patterns if they become boss-only.
- On boss stage, spawn boss instead of normal wave or after a tiny intro delay.
- Progress UI switches from kill count to boss HP.

Target files:

- `src/game/data/enemyData.ts`;
- `src/game/data/bossData.ts` or `stageWaveData.ts`;
- `src/game/idle/StageProgression.ts`;
- `src/game/idle/Economy.ts`;
- `src/game/systems/BattleSystem.ts`;
- `src/game/scenes/BattleScene.ts`;
- tests under `tests/unit/`.

Validation:

- stage 10 spawns a named boss;
- boss HP bar appears;
- normal stages do not spawn boss-only enemies;
- boss kill grants tokens;
- stage advances after boss death.

#### NR-07: Token-Gated Weapon Unlocks

Status: implemented first pass. Weapon unlock costs now carry a currency, Tesla/sniper/grenade launcher are token-gated, unlock UI shows the correct currency, and state tests cover soft vs hard unlock spending.

Goal: boss tokens should matter and unlock stronger/rarer weapons.

Rules:

- Some weapons unlock with `hard`/tokens instead of `soft`.
- Early weapons remain soft-unlocked or free:
  - pistol;
  - shotgun;
  - maybe assault rifle.
- Higher identity weapons can be token-gated:
  - tesla;
  - sniper rifle;
  - grenade launcher.

Data changes:

- Replace single `unlockCost: number` with:

```ts
unlockCost: { currency: 'soft' | 'hard'; amount: number }
```

or add `unlockCurrency`.

UI changes:

- Unlock button must show the correct currency art.
- Insufficient token messaging should be distinct from insufficient soft.

Target files:

- `src/game/data/weaponData.ts`;
- `src/game/state/RunState.ts`;
- `src/game/scenes/GameScene.ts`;
- `src/game/ui/currencyUi.ts` maybe no change if already supports hard;
- tests.

Validation:

- token-locked weapon cannot unlock with soft;
- boss reward provides tokens;
- unlock spends tokens and persists in state.

#### NR-08: Wave Count Growth Toward Performance Cap

Status: implemented first pass. Regular waves now scale faster toward a capped total enemy count, each wave exposes a max active enemy limit, and the battle spawner pauses when the active enemy cap is reached.

Goal: later waves should contain more zombies, but not unbounded object spam.

Current behavior:

- `stageWaveData.ts` uses 10 repeating patterns.
- Later blocks add reinforcement:
  - zombies get `block * 2`;
  - other present enemies get `block`.

Desired behavior:

- total zombies increase over time;
- enemy mix evolves;
- waves eventually approach a performance-safe cap;
- no boss-only enemies in regular waves.

Performance approach:

- Define a soft cap for active enemies, e.g. `maxActiveEnemies`.
- Stage wave may contain many total enemies, but spawner only keeps active count under cap.
- This is safer than spawning huge waves all at once.

Initial caps:

| Target | Suggested first cap |
| --- | --- |
| Mobile active enemies | 24-35 |
| Desktop active enemies | 40-60 |
| Total enemies per non-boss wave | grow from 8 to maybe 80-120 |

Implementation:

- Add `maxActiveEnemies` to battle config/data.
- Spawner waits if active walking/attacking enemies are at cap.
- Wave total count can grow higher without freezing the screen.
- Consider object pooling later if active counts get high.

Target files:

- `src/game/data/stageWaveData.ts`;
- `src/game/data/idleContent.ts`;
- `src/game/systems/BattleSystem.ts`;
- `src/game/idle/EnemyScaling.ts`;
- smoke/manual performance checks.

Validation:

- stage 1 remains small;
- stage 30+ has noticeably more total zombies;
- active enemies do not exceed cap;
- mobile smoke still renders.

### Recommended Implementation Order

Do not implement all of this in one pass.

1. NR-01 projectile readability cleanup.
2. NR-02 grenade explosion visual + splash.
3. NR-04 weapon range stat and target filtering.
4. Retune stage 1 pistol/base pressure. (implemented first pass)
5. NR-03 crit chance stat.
6. NR-05 base upgrade sub-tab with HP + armor first.
7. NR-06 boss data and boss stage loop.
8. NR-07 token-gated unlocks.
9. NR-08 wave growth and active enemy cap.
10. Revisit unique `special` effects once range/crit/bosses are stable.

Reasoning:

- Range must land before serious wave/boss balance, otherwise DPS numbers lie.
- Boss tokens should come after bosses exist.
- Token-gated unlocks should come after tokens have a source.
- Wave growth should come after active enemy caps and base defenses exist.

### Open Questions

- Should crit chance be per-weapon upgrade only, global upgrade only, or both?
- Should `special` remain a fourth/fifth weapon stat, or become a separate milestone upgrade?
- Should boss tokens be rare and only from bosses, or also from achievements/shop?
- Should base armor be flat damage reduction or percentage reduction?
- Should grenade splash damage hurt every enemy equally or fall off with distance?
- Should range be displayed as pixels, screen fraction, or a simple label like Short/Medium/Long?

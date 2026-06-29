# Production Balance Plan

Date: 2026-06-28

## Goal

Turn the current generous test economy into a production-ready idle arsenal defense balance where the player always has a near-term goal, understands what they can buy next, and reaches major purchases on planned playtime milestones.

This plan is for discussion before implementation. Numbers below are draft targets, not final tuning.

## Original Diagnosis

The pre-balance state was dev-friendly:

- the run starts with `1000 soft` and `25 hard`;
- stage 1 pays about `24 soft`;
- most soft weapon unlocks and purchases are cheap enough to buy immediately;
- hard weapons can be unlocked before the player earns hard currency from bosses;
- enemy HP grows faster than kill rewards, so later stages may become grindy once the starting bankroll is removed.

The product problem is not only "prices are wrong". The missing piece is a time model: we need to decide when the player should afford each important thing.

## Product Balance Pillars

1. Early game must teach one decision at a time.
2. Every 30-90 seconds the player should be close to a meaningful action.
3. Every 3-5 minutes the player should unlock or place something that changes combat visibly.
4. Bosses should be clear gates, not just bigger enemies.
5. Hard currency should enter from play, not from the starting wallet.
6. Premium weapons must feel premium through role, burst, control, splash, range, boss damage, or scaling.
7. Tuning must be data-driven and testable with a simulation script before manual feel passes.

## Target Session Shape

First real session target: 30 minutes.

| Time | Player State | Intended Feeling |
| --- | --- | --- |
| 0:00 | Starter pistol, tiny bankroll, stage 1 | I can survive, but I need upgrades. |
| 1:00 | First cheap upgrade or first grid cell | I made a small useful improvement. |
| 3:00 | First new weapon purchase | My build changed visibly. |
| 5:00 | Second weapon or weapon stat upgrade | I have a direction. |
| 8:00 | Preparing for stage 10 boss | I need one more power spike. |
| 10:00-12:00 | First boss clear | Big checkpoint reward. |
| 13:00-18:00 | First hard-currency decision begins | I am saving for a rare weapon. |
| 20:00-25:00 | Stage 20 boss and first premium weapon path | The run has opened up. |
| 30:00 | Multiple viable build paths | I want to optimize, not just wait. |

## Draft Economy Targets

These are design targets for the first tuning pass.

| Item | Current | Draft Direction |
| --- | ---: | --- |
| Starting soft | 80 | implemented target range 80-120 |
| Starting hard | 0 | implemented |
| Stage 1 total reward | ~32 soft | implemented target range 30-45 |
| First cell cost | 110 | implemented as early capacity sink |
| First weapon purchase | 110 soft | affordable after surviving the first wave |
| First soft weapon unlock | 180-420 soft | affordable around 3-5 minutes for first new weapon |
| First hard weapon unlock | 12 hard | only after the second boss path |
| First boss reward | 348 soft + 6 hard | enough to create desire, not instant premium |

## Purchase Timing Targets

The balance pass should tune toward this affordance schedule:

| Milestone | Target Time | Example Purchase |
| --- | ---: | --- |
| First spend | 45-90 sec | Base HP, damage stat, or one grid cell |
| First extra weapon | 2-3 min | Pistol/shotgun-style basic weapon |
| First meaningful upgrade stack | 4-6 min | Damage or fire rate level 2-3 |
| Stage 10 boss readiness | 8-10 min | 2-3 weapons plus a few upgrades |
| First boss clear | 10-12 min | Hard currency introduced |
| First premium unlock | 20-25 min | Tesla/sniper/grenade after the second boss path |
| First build identity | 20-30 min | shotgun swarm, rifle DPS, boss-killer, splash build |

## Combat Timing Targets

Stage time should stay readable. A stage that ends instantly makes upgrades feel pointless; a stage that drags makes idle feel dead.

| Stage Band | Target Clear Time |
| --- | ---: |
| 1-3 | 25-45 sec |
| 4-9 | 35-60 sec |
| 10 boss | 60-100 sec |
| 11-19 | 45-75 sec |
| 20 boss | 75-120 sec |

If a player is underpowered, the stage can take longer or fail, but the game should point toward the next useful purchase.

## Enemy Density And Boss Targets

Zombie count should grow over time because the game needs visible escalation, but active enemies must be capped for performance and readability.

Current technical baseline after Slice 3:

- `maxActiveEnemies`: 28 globally, with stage 1 capped lower for onboarding readability;
- `maxTotalEnemies`: 110;
- wave patterns already add reinforcements each 10-stage block.

Production target:

| Limit | Target |
| --- | ---: |
| Mobile safe active enemies | 24-28 |
| Desktop active enemy cap | 28 |
| Total enemies per regular stage cap | 90-110 |
| Boss stage active enemies | mostly boss-only, optional small adds later |

Design rule:

- total wave size may grow with stage;
- active enemies on screen should stay capped;
- extra enemies wait in spawn queue instead of spawning all at once;
- performance validation must include mobile viewport with peak active enemies;
- if performance suffers, reduce active cap before reducing total wave fantasy.

### Draft Wave Density Curve

| Stage Band | Target Total Enemies | Target Active Cap |
| --- | ---: | ---: |
| 1-3 | 8-14 | 3-6 during onboarding, then 8-12 after comfort tuning |
| 4-9 | 14-24 | 14-20 |
| 11-19 | 24-45 | 20-28 |
| 21-29 | 45-70 | 24-28 |
| 31+ | 70-110 | 28 |

The simulator should report total enemies, peak active enemies, and estimated stage duration for each stage band.

### Boss Direction

Bosses should be slow, high-HP pressure tests:

- low movement speed so the player has time to watch the boss approach;
- very high HP so weapon DPS, focus fire, crits, and premium weapons matter;
- strong contact/base damage if the boss reaches the bunker;
- simple readable behavior first, not complex patterns;
- clear reward preview before fighting the boss.

Bosses should not feel like ordinary zombies with a larger sprite. They should be checkpoint gates.

Draft boss roster:

| Boss | Base Enemy | Role | Movement | HP Target | Notes |
| --- | --- | --- | --- | --- | --- |
| Gatebreaker | Armored style | first wall boss | very slow | very high | implemented as stage 10 HP wall |
| Plague Spitter | Toxic style | pressure boss | slow | high | implemented as slow stage 20 pressure boss |
| Alpha Mutant | Mutant style | elite boss | slow-medium | extremely high | implemented as later high-HP threat |

Implementation direction:

- use boss-specific `speedMultiplier` below current values, likely `0.35-0.6`;
- raise boss HP multipliers enough that boss clear time hits the combat timing targets;
- keep token rewards tied to boss difficulty and premium unlock timing.

## Progression Decisions

These decisions are locked for the first production-balance pass:

- Target first session length is 30 minutes.
- Premium weapons should become available after the second boss path, not immediately after boss 10.
- Failure keeps earned `soft`; the setback is time and checkpoint rollback, not currency loss.
- Grid cells are primarily capacity for weapons, but capacity is still a major power lever because more placed weapons means more combat output.
- Weapon upgrades stay per-weapon. Each weapon owns its own stat path and identity.
- Base upgrades should become a real defensive progression path, not just a tiny HP button.

Open follow-up:

- Decide exact base upgrade list and price curve after the combat simulator shows incoming damage per stage band.

## Base Upgrade Direction

The base should be a second major progression axis beside weapons:

- weapons answer "how fast can I clear the wave";
- base upgrades answer "how much pressure can I survive while my build ramps up";
- grid answers "how many weapons can my build support".

Base upgrades should not outscale weapons. A defensive build should survive longer and stabilize boss attempts, but it should still need enough weapon power to clear stages in target time.

### Draft Base Upgrade Catalog

| Upgrade | Role | Draft Behavior |
| --- | --- | --- |
| Bunker HP | basic survival | increases max base HP by a flat or gently scaling amount |
| Armor Plating | damage mitigation | reduces incoming damage by a percentage curve, not flat subtraction |
| Emergency Repair | safety net | once per stage, heals when base drops below a threshold |
| Repair Crew | deferred sustain | restores a small amount after each stage or every few kills |
| Reinforced Gate | deferred boss defense | reduces boss/contact burst damage more than regular chip damage |
| Field Repairs | deferred checkpoint recovery | increases HP restored after failure or checkpoint restart |

First implementation should start with three upgrades:

1. Bunker HP.
2. Armor Plating.
3. Emergency Repair.

`Repair Crew`, `Reinforced Gate`, and `Field Repairs` are deferred until the first defensive path feels useful.

### Armor Formula

Replace the current flat formula:

```ts
damageTaken = Math.max(1, rawDamage - armor)
```

with rating-based mitigation:

```ts
armorRating = baseArmorLevel * armorRatingPerLevel
stagePressure = 18 + stage * 1.5
damageReduction = armorRating / (armorRating + stagePressure)
damageReduction = Math.min(damageReduction, 0.7)
damageTaken = Math.max(1, Math.ceil(rawDamage * (1 - damageReduction)))
```

Why this is better:

- early armor is noticeable without making small enemies deal only `1`;
- higher stages naturally push back against old armor levels;
- the cap prevents immortal-base builds;
- tuning can happen through `armorRatingPerLevel`, `stagePressure`, and `maxReduction`.

Draft tuning target:

| Armor Level | Stage 1 Feel | Stage 10 Feel | Stage 20 Feel |
| ---: | --- | --- | --- |
| 0 | full damage | full damage | full damage |
| 3 | small but visible reduction | minor help | almost outdated |
| 8 | strong early defense | useful boss prep | minor help |
| 15 | very strong early defense | strong stage 10 defense | useful stage 20 defense |

Armor should buy time, not replace DPS.

## Weapon Role Targets

Current raw DPS makes some cheap weapons outperform premium weapons. Production balance should define roles first, then tune costs.

| Weapon | Intended Role | Balance Need |
| --- | --- | --- |
| Pistol | starter/generalist | cheap, reliable, never exciting |
| Shotgun | close burst / crowd clear | strong early, range-limited |
| Compact Shotgun | cheap crowd burst | should not dominate all soft weapons |
| Assault Rifle | stable DPS | best early sustained soft weapon |
| Tesla | chain/control premium | value must be chain behavior, not raw DPS only |
| Sniper | boss killer / elite killer | needs high single-target value |
| Grenade Launcher | dense-wave splash | weak single target, strong vs crowds |

### Weapon Upgrade Audit

Current shared weapon stat upgrades:

| Upgrade | Current Behavior |
| --- | --- |
| Damage | `+16%` weapon damage per level, max 10 |
| Fire Rate | reduces cooldown by `5.5%` per level, capped at `52%` cooldown multiplier, max 8 |
| Handling | `+7.5%` projectile speed per level, max 8 |
| Range | interpolates from base range to max range over 8 levels |
| Crit Chance | `+3%` crit chance per level, capped at `30%`, crit multiplier is `1.5x` |
| Special | currently only adds spread/projectile count for shotgun, compact shotgun, and grenade launcher |

Current `special` problem:

- every weapon has a unique `special` label;
- the UI describes every `special` as extra shots;
- the runtime only applies `special` to `shotgun`, `compactShotgun`, and `grenadeLauncher`;
- `Double Tap`, `Chain Arc`, `Focus Fire`, and `Critical Shot` are currently dead or misleading because they do not change combat.

Status after Slice 4:

- every weapon `special` now maps to a real combat parameter or behavior;
- UI rows use weapon-specific `special` effect labels;
- the simulator no longer reports dead `special` upgrades;
- compact shotgun still needs value tuning because it remains high on simple DPS per soft.

Required production rule:

- every weapon `special` must map to a real per-weapon behavior;
- UI text must describe that specific behavior, not a generic `+shots` label;
- the simulator should include special-level impact.

Target `special` design:

| Weapon | Special | Production Behavior |
| --- | --- | --- |
| Pistol / Starter Pistol | Double Tap | fires an extra free bullet every N attacks; higher levels trigger it more often or make the bonus shot stronger |
| Shotgun | Extra Pellets | adds more pellets to the burst; keeps the shotgun as close-range crowd clear |
| Compact Shotgun | Wide Burst | also adds more pellets; stays a compact close-range burst weapon rather than a control/knockback weapon |
| Tesla | Chain Arc | chains to additional nearby enemies; higher levels add jumps or reduce chain damage falloff |
| Assault Rifle | Focus Fire | repeated hits on the same target build bonus damage stacks; stacks reset when changing target |
| Sniper Rifle | Piercing Shot | shots pierce through additional enemies in a line; higher levels increase pierce count or retained damage |
| Grenade Launcher | Blast Radius | increases explosion radius and/or improves splash falloff; should not be implemented as extra grenades |

Implementation note:

- `special` should move from `getSpecialSpreadBonus()` into per-weapon special behavior helpers.
- Generic stat rows can stay shared, but `special` effect text must be weapon-specific.
- The simulator should report DPS and role value at special levels 0, 1, 3, and 5.

## Formula Questions

The implementation should answer these with a simulator before manual tuning:

- How much soft does a player earn per minute at stages 1-10 with only starter pistol?
- How many seconds until the first extra weapon?
- How much DPS is required to clear stage 10 in 10-12 minutes?
- How much hard currency should the player have after bosses 10 and 20?
- Does any weapon have better DPS per soft than all alternatives with no tradeoff?
- Does buying grid cells compete with weapon upgrades, or is one always correct?

Status after Slice 5:

- boss kills now grant burst `soft` through `getBossReward(stage)` instead of a single normal kill reward;
- boss 10 gives `6 hard`, not enough for premium;
- boss 20 brings cumulative hard to `13`, enough for Tesla at `12 hard`;
- boss 30 brings cumulative hard to `22`, enough for Sniper at `18 hard`;
- boss 40 brings cumulative hard to `28`, enough for Grenade Launcher at `24 hard`;
- the simulator prints a premium currency pacing table.

## Proposed Implementation Slices

### Slice 1: Balance Simulator

Goal: make balance measurable before changing live values.

Target files:

- `scripts/balance-sim.mjs`
- `src/game/data/idleContent.ts`
- `src/game/data/weaponData.ts`
- `src/game/idle/Economy.ts`
- `src/game/idle/EnemyScaling.ts`
- `src/game/idle/WeaponStats.ts`

Output:

- stage reward table;
- enemy HP table;
- weapon DPS and DPS-per-cost table;
- estimated time to first purchases;
- warnings for dominant weapons or unreachable milestones.

Validation:

- `node scripts/balance-sim.mjs`
- `npm run build`

### Slice 2: Starting Wallet And Early Prices

Goal: remove sandbox bankroll and create a real first 5 minutes.

Status: implemented.

Changes:

- lowered starting `soft` from `1000` to `80`;
- set starting `hard` from `25` to `0`;
- retuned first weapon, first cell, reroll, base, and first upgrade prices;
- keep starter weapon free and already placed.

Validation:

- simulator shows first spend in 45-90 seconds;
- first extra weapon in 2-3 minutes;
- no hard weapon unlock before boss rewards.

### Slice 3: Stage 1-10 Curve

Goal: make the first boss arrive around 10-12 minutes for a normal player.

Status: implemented for first tuning pass.

Changes:

- raised base kill reward so stage 1 pays about `32 soft`;
- restored all regular enemy archetypes to regular waves instead of removing boss source enemies;
- reduced active enemy cap to `28` for mobile-safe production density;
- added a stage 1 onboarding density cap and slower first-wave spawn interval so zombies do not arrive as one early pack;
- lowered the repeat pistol purchase to `110 soft`, letting a clean first wave create the first visible weapon purchase;
- changed Gatebreaker to an armored-style slow HP wall with about `1716 HP` at stage 10;
- slowed boss movement into the target direction.

Validation:

- simulator reports stage 1 in reward target range;
- simulator reports Gatebreaker as slow high-HP stage 10 gate;
- unit tests cover wave composition, active cap, rewards, and boss rotation.

### Slice 4: Weapon Role Pass

Goal: every weapon has a reason to exist.

Status: implemented for first behavior pass.

Changes:

- rebalance base DPS, cooldown, spread, range, and unlock costs;
- make premium weapons valuable through unique roles;
- prevent compact shotgun/assault rifle from being always-correct.
- replace dead or generic `special` upgrades with real per-weapon behavior.
- implemented Double Tap, Extra Pellets, Wide Burst, Chain Arc, Focus Fire, Piercing Shot, and Blast Radius behavior hooks.

Validation:

- simulator flags no single dominant weapon;
- manual fight pass confirms visible role differences.
- every `special` upgrade changes an actual combat stat or behavior for that weapon.
- unit tests cover special parameters for pistol, shotgun, tesla, assault rifle, sniper rifle, and grenade launcher.

### Slice 5: Stage 11-30 Progression

Goal: support a satisfying 20-30 minute first session.

Status: implemented for first tuning pass.

Changes:

- added boss soft burst rewards;
- added premium hard-currency pacing to the simulator;
- set the first premium unlock path to land after boss 20;
- kept stage 20 boss as the second major gate.

Validation:

- first premium unlock lands after boss 20, matching the 20-25 minute target path;
- stage 20 boss is reachable with smart purchases;
- grind time does not exceed target windows.
- simulator confirms cumulative hard totals at bosses 10, 20, 30, and 40.

### Slice 6: Base Upgrade Pass

Goal: make base progression a real defensive build path with a sane armor formula.

Status: implemented for first defensive tuning pass.

Changes:

- added base upgrade data for HP, armor, and Emergency Repair;
- replaced flat armor subtraction with rating-based percentage mitigation;
- added once-per-stage Emergency Repair that auto-heals below the danger threshold;
- made the Upgrades UI show armor rating, current mitigation, and repair value;
- added simulator base defense samples for hits-to-destroy checks.

Validation:

- armor level 0 does not feel broken;
- early armor levels are noticeable but do not trivialize stages 1-10;
- stage 20 still requires weapon investment;
- simulator reports estimated hits-to-destroy-base across stage bands.

### Slice 7: UI Feedback For Next Goal

Goal: make balance understandable to the player.

Changes:

- show next affordable upgrade/weapon hint;
- show shortfall like "need 18 more caps";
- show boss reward before the fight;
- avoid hiding important prices inside separate tabs.

Validation:

- player always knows one useful next spend;
- mobile layout remains readable.

## Decisions Needed

1. Should premium weapons require only hard currency, or hard currency plus a stage gate?
2. Should grid expansion prices be tuned as a steady long-term sink or as short early bursts before weapon prices dominate?
3. Should base sustain be passive repair over time, repair after kills, or one emergency heal per stage?

## First Recommendation

Start with Slice 1 and Slice 2.

Do not tune enemies first. The current biggest distortion is the starting wallet and purchase pacing. Once early money is real, we can measure whether enemies are too weak or too strong.

# Idle Zombie Arsenal GDD

Working design document for turning the current weapon-roll prototype into an idle auto-battle zombie game.

## High Concept

The player manages an armed survivor base fighting endless zombie stages. Combat runs automatically in the center of the screen. The player earns `soft` from zombie kills, spends it on grid growth, weapon rolls, weapons, and upgrades, then pushes deeper through stages and bosses.

## Core Direction

- The main screen is an automatic zombie battle.
- The current weapon grid and roll system becomes the `Weapons` tab.
- The game uses bottom navigation tabs: `Fight`, `Weapons`, `Upgrades`, `Shop`.
- Progress is stage-based and endless.
- Every 10th stage is a boss stage and a checkpoint boundary.
- There is no passive income.
- Only zombie kills generate `soft`.

## Core Loop

1. Zombies spawn and fight automatically.
2. Weapons fire automatically.
3. Killed zombies give `soft`.
4. The player spends `soft` on grid cells, rerolls, weapons, and upgrades.
5. Stronger builds clear higher stages.
6. Bosses gate each 10-stage block.
7. Failure sends the player back to the current checkpoint block.

## Screen Structure

### Fight

The default tab. Shows the live auto-battle, current stage, checkpoint, `soft`, base HP, kill progress, and boss HP when relevant.

### Weapons

Contains the current weapon grid and roll offer. The current prototype's grid placement and weapon reroll flow should move here.

### Upgrades

Contains permanent or run upgrades such as durability, damage, attack speed, rare roll chance, and grid expansion.

### Shop

Contains optional purchases such as rerolls, weapon offers, temporary boosts, or later meta systems.

## Stage And Checkpoint Rules

- Stages are endless.
- Boss stages happen at `10, 20, 30, ...`.
- Checkpoint blocks are `1-10`, `11-20`, `21-30`, and so on.
- Stage 17 failure returns to stage 11.
- Stage 20 boss failure returns to stage 11.
- Stage 21 starts the next checkpoint block.

Example:

```ts
isBossStage(stage) = stage % 10 === 0
checkpointStage(stage) = Math.floor((stage - 1) / 10) * 10 + 1
```

## Economy

### Currency

`soft` is the run currency.

Sources:

- zombie kills only;
- boss kills can give a larger kill reward or stage reward, but it is still combat-earned.

No passive income:

- no coins per second;
- no offline income;
- no base income;
- no income from time alone.

### Spending

`soft` is spent on:

- `+1 cell`;
- weapon rerolls;
- weapon purchases or swaps;
- combat upgrades;
- shop items.

## Grid Growth

- Starting grid: `6 x 2`.
- Maximum grid: `15 x 15`.
- The `+1 cell` button expands the field one cell at a time.
- Expansion should not alternate directions one cell at a time.
- Cell purchases unlock active cells inside a compact armory footprint.
- Active cells fill the visible footprint in row-major order.
- The visible footprint grows only when the current footprint cannot contain the next active cell.
- Growth should prefer a readable compact rectangle over a long strip.
- Cell purchases increase active cells from `12` to `225`.
- The visible grid bounds grow as needed to contain the active cells.
- The cell price grows exponentially.

Example formula:

```ts
nextCellCost = Math.ceil(baseCellCost * cellCostScale ** cellsPurchased)
```

Initial tuning target:

- `baseCellCost`: TBD
- `cellCostScale`: TBD

## Enemy Scaling

Regular zombie HP should grow by stage.

Example formula:

```ts
zombieHp(stage) = Math.ceil(baseHp * stageHpScale ** (stage - 1))
```

Boss HP is based on the stage curve with a boss multiplier:

```ts
bossHp(stage) = Math.ceil(zombieHp(stage) * bossHpMultiplier)
```

Initial tuning target:

- `stageHpScale`: TBD
- `bossHpMultiplier`: TBD

## Rewards

Every zombie kill gives `soft`.

Example formula:

```ts
killReward(stage, enemyTier) = Math.ceil(baseKillReward * stageRewardScale ** (stage - 1) * enemyTierMultiplier)
```

Bosses should give a meaningful burst reward because they are checkpoint gates.

```ts
bossReward(stage) = Math.ceil(killReward(stage, bossTier) * bossRewardMultiplier)
```

Initial tuning target:

- `baseKillReward`: TBD
- `stageRewardScale`: TBD
- `enemyTierMultiplier`: TBD
- `bossRewardMultiplier`: TBD

## Failure

Failure is a local setback, not prestige.

On failure:

- reset current stage to the checkpoint start for the current block;
- keep earned `soft`;
- keep grid and purchased upgrades;
- automatically continue fighting from the checkpoint stage;
- show a short message instead of a full game-over screen.

## Prestige

Prestige is not required for the first implementation slice.

If added later:

- it should be voluntary;
- it should reset stage and run state;
- it should not duplicate ordinary failure;
- it should award a separate meta currency;
- it should unlock permanent power, rare chances, or quality-of-life automation.

## Architecture Plan

Keep economy and progression out of Phaser scene code.

Suggested modules:

- `src/game/idle/StageProgression.ts`: stage, checkpoint, boss checks.
- `src/game/idle/Economy.ts`: kill rewards, boss rewards, costs.
- `src/game/idle/EnemyScaling.ts`: HP, speed, damage curves.
- `src/game/data/idleContent.ts`: tunable constants and upgrade catalog.
- `src/game/state/RunState.ts`: current stage, highest stage, `soft`, grid, upgrades.

Scenes should render state and route input. They should not own the formulas.

## Implementation Slices

1. Add pure stage/checkpoint/economy modules with unit tests.
2. Replace `round/maxRounds` with `currentStage/highestStage`.
3. Update battle config from `round` to `stage`.
4. Add kill rewards and top `soft` display.
5. Convert result modal into auto-continue behavior. (done)
6. Move weapon grid into the `Weapons` tab. (done)
7. Add bottom tabs. (done)
8. Add boss stages and boss HP UI.

## Open Questions

- exact starting `soft`;
- exact `+1 cell` base cost and scale;
- exact zombie HP growth;
- exact kill reward growth;
- whether grid expansion is permanent across prestige later;
- whether boss kills give only `soft` or also unlock new shop tiers.

const ENEMY_ORDER = [
  'zombie',
  'zombie-bruiser',
  'zombie-toxic',
  'zombie-tank',
  'zombie-runner',
  'zombie-berserker',
  'zombie-armored',
  'zombie-crawler',
  'zombie-mutant',
];

const WAVE_CONFIG = {
  maxActiveEnemies: 28,
  maxTotalEnemies: 110,
};

const GRID_CONFIG = {
  startCols: 6,
  startRows: 2,
  maxCols: 15,
  maxRows: 15,
  baseCellCost: 110,
  cellCostScale: 1.12,
};

const REWARD_CONFIG = {
  baseKillReward: 4,
  stageRewardScale: 1.08,
  bossRewardMultiplier: 12,
  enemyTierMultipliers: {
    zombie: 1,
    'zombie-bruiser': 1.6,
    'zombie-toxic': 2.4,
    'zombie-tank': 3.6,
    'zombie-runner': 1.4,
    'zombie-berserker': 2.8,
    'zombie-armored': 4.5,
    'zombie-crawler': 0.9,
    'zombie-mutant': 6,
  },
};

const ENEMY_SCALING = {
  baseHp: 28,
  stageHpScale: 1.12,
  baseSpeed: 54,
  stageSpeedScale: 1.015,
  baseDamage: 8,
  stageDamageScale: 1.06,
  enemyHpMultipliers: {
    zombie: 1,
    'zombie-bruiser': 1.5,
    'zombie-toxic': 2,
    'zombie-tank': 3,
    'zombie-runner': 0.78,
    'zombie-berserker': 1.35,
    'zombie-armored': 4.25,
    'zombie-crawler': 0.58,
    'zombie-mutant': 5.4,
  },
  enemySpeedMultipliers: {
    zombie: 1,
    'zombie-bruiser': 0.92,
    'zombie-toxic': 1.12,
    'zombie-tank': 0.78,
    'zombie-runner': 1.7,
    'zombie-berserker': 1.25,
    'zombie-armored': 0.6,
    'zombie-crawler': 1.45,
    'zombie-mutant': 1.08,
  },
  enemyDamageMultipliers: {
    zombie: 1,
    'zombie-bruiser': 1.25,
    'zombie-toxic': 1.5,
    'zombie-tank': 2,
    'zombie-runner': 0.75,
    'zombie-berserker': 2.75,
    'zombie-armored': 1.75,
    'zombie-crawler': 0.625,
    'zombie-mutant': 3,
  },
};

const BOSS_CONFIG = [
  {
    id: 'boss_gatebreaker',
    enemyId: 'zombie-armored',
    name: 'Gatebreaker',
    hpMultiplier: 5.2,
    speedMultiplier: 0.45,
    damageMultiplier: 2.3,
    tokenReward: 6,
  },
  {
    id: 'boss_plague_spitter',
    enemyId: 'zombie-toxic',
    name: 'Plague Spitter',
    hpMultiplier: 7,
    speedMultiplier: 0.5,
    damageMultiplier: 1.85,
    tokenReward: 7,
  },
  {
    id: 'boss_alpha_mutant',
    enemyId: 'zombie-mutant',
    name: 'Alpha Mutant',
    hpMultiplier: 6,
    speedMultiplier: 0.55,
    damageMultiplier: 2.35,
    tokenReward: 9,
  },
];

const BOSS_ONLY_ENEMY_IDS = new Set();

const STAGE_WAVE_PATTERNS = [
  { zombie: 8 },
  { zombie: 6, 'zombie-runner': 1, 'zombie-crawler': 3 },
  { zombie: 6, 'zombie-bruiser': 2, 'zombie-runner': 2, 'zombie-crawler': 2 },
  { zombie: 5, 'zombie-toxic': 2, 'zombie-runner': 2, 'zombie-berserker': 2 },
  { zombie: 5, 'zombie-berserker': 2, 'zombie-armored': 2, 'zombie-crawler': 3 },
  { zombie: 4, 'zombie-toxic': 3, 'zombie-tank': 2, 'zombie-armored': 2 },
  { zombie: 4, 'zombie-bruiser': 2, 'zombie-runner': 3, 'zombie-berserker': 2, 'zombie-crawler': 2 },
  { zombie: 3, 'zombie-toxic': 2, 'zombie-tank': 2, 'zombie-armored': 2, 'zombie-mutant': 1 },
  { zombie: 3, 'zombie-runner': 2, 'zombie-berserker': 2, 'zombie-armored': 2, 'zombie-crawler': 3, 'zombie-mutant': 1 },
  {
    zombie: 2,
    'zombie-bruiser': 2,
    'zombie-toxic': 2,
    'zombie-tank': 2,
    'zombie-runner': 2,
    'zombie-berserker': 2,
    'zombie-armored': 2,
    'zombie-crawler': 4,
    'zombie-mutant': 2,
  },
];

const COMMON_UPGRADES = {
  damage: { baseCost: 95, costScale: 1.45, maxLevel: 10 },
  fireRate: { baseCost: 135, costScale: 1.5, maxLevel: 8 },
  handling: { baseCost: 110, costScale: 1.42, maxLevel: 8 },
  range: { baseCost: 120, costScale: 1.48, maxLevel: 8 },
  critChance: { baseCost: 160, costScale: 1.5, maxLevel: 10 },
};

const WEAPONS = {
  starter_pistol: {
    name: 'Starter Pistol',
    damage: 8,
    cooldownMs: 680,
    magazineSize: 8,
    reloadMs: 1200,
    projectileSpeed: 520,
    rangePx: 220,
    maxRangePx: 430,
    spread: 1,
    softCost: 0,
    unlockCost: '0 soft',
    special: { label: 'Double Tap', baseCost: 90 },
  },
  pistol: {
    name: 'Pistol',
    damage: 8,
    cooldownMs: 560,
    magazineSize: 10,
    reloadMs: 1150,
    projectileSpeed: 560,
    rangePx: 220,
    maxRangePx: 430,
    spread: 1,
    softCost: 110,
    unlockCost: '50 soft',
    special: { label: 'Double Tap', baseCost: 220 },
  },
  shotgun: {
    name: 'Shotgun',
    damage: 10,
    cooldownMs: 980,
    magazineSize: 2,
    reloadMs: 1750,
    projectileSpeed: 470,
    rangePx: 220,
    maxRangePx: 430,
    spread: 3,
    softCost: 160,
    unlockCost: '180 soft',
    special: { label: 'Extra Pellets', baseCost: 300 },
  },
  tesla: {
    name: 'Tesla',
    damage: 26,
    cooldownMs: 1300,
    magazineSize: 0,
    reloadMs: 1800,
    projectileSpeed: 680,
    rangePx: 360,
    maxRangePx: 650,
    spread: 1,
    softCost: 260,
    unlockCost: '12 hard',
    special: { label: 'Chain Arc', baseCost: 420 },
  },
  assaultRifle: {
    name: 'Assault Rifle',
    damage: 9,
    cooldownMs: 260,
    magazineSize: 24,
    reloadMs: 1500,
    projectileSpeed: 640,
    rangePx: 290,
    maxRangePx: 720,
    spread: 1,
    softCost: 240,
    unlockCost: '420 soft',
    special: { label: 'Focus Fire', baseCost: 360 },
  },
  compactShotgun: {
    name: 'Compact Shotgun',
    damage: 8,
    cooldownMs: 760,
    magazineSize: 2,
    reloadMs: 1550,
    projectileSpeed: 440,
    rangePx: 220,
    maxRangePx: 430,
    spread: 5,
    softCost: 210,
    unlockCost: '310 soft',
    special: { label: 'Wide Burst', baseCost: 330 },
  },
  sniperRifle: {
    name: 'Sniper Rifle',
    damage: 46,
    cooldownMs: 1700,
    magazineSize: 5,
    reloadMs: 2300,
    projectileSpeed: 820,
    rangePx: 430,
    maxRangePx: 720,
    spread: 1,
    softCost: 330,
    unlockCost: '18 hard',
    special: { label: 'Critical Shot', baseCost: 520 },
  },
  grenadeLauncher: {
    name: 'Grenade Launcher',
    damage: 34,
    cooldownMs: 1450,
    magazineSize: 1,
    reloadMs: 2400,
    projectileSpeed: 390,
    rangePx: 220,
    maxRangePx: 430,
    spread: 1,
    softCost: 360,
    unlockCost: '24 hard',
    special: { label: 'Blast Radius', baseCost: 620 },
  },
};

const STARTING_WALLET = {
  soft: 80,
  hard: 0,
};

const BASE_DEFENSE = {
  baseHp: 100,
  armorRatingPerLevel: 8,
  armorStagePressureBase: 18,
  armorStagePressureScale: 1.5,
  armorMaxReduction: 0.7,
  emergencyRepairThresholdRatio: 0.25,
  emergencyRepairBaseHealRatio: 0.3,
  emergencyRepairHealRatioPerLevel: 0.05,
  emergencyRepairMaxHealRatio: 0.55,
};

const TARGETS = {
  startingSoftMax: 120,
  startingHard: 0,
  mobileActiveEnemyCap: 28,
  firstPremiumUnlockBossStage: 20,
};

function main() {
  printTitle('Surv Balance Simulator');
  console.log('Model: current checked-in constants mirrored for fast balance iteration.');
  console.log('Goal: expose pacing problems before production-balance tuning.\n');

  printWalletSummary();
  printStageTable([1, 2, 3, 5, 10, 11, 15, 20, 21, 30]);
  printBossTable([10, 20, 30]);
  printPremiumPacingTable([10, 20, 30, 40]);
  printBaseDefenseTable();
  printWeaponTable();
  printUpgradeCostTable();
  printGridCostTable();
  printWarnings();
}

function printBaseDefenseTable() {
  printTitle('Base Defense Samples');
  console.table(
    [1, 10, 20].flatMap((stage) =>
      [0, 3, 8, 15].map((armorLevel) => {
        const incomingDamage = getEnemyStats(stage, stage % 10 === 0 ? getBossForStage(stage).enemyId : 'zombie').damage;
        const armorRating = getArmorRating(armorLevel);
        const mitigatedDamage = getMitigatedBaseDamage(incomingDamage, armorRating, stage);
        const effectiveHp = Math.floor(BASE_DEFENSE.baseHp / mitigatedDamage);
        return {
          stage,
          armorLevel,
          armorRating,
          reduction: `${Math.round(getArmorDamageReduction(armorRating, stage) * 100)}%`,
          incomingDamage,
          mitigatedDamage,
          hitsToBreak100Hp: effectiveHp,
          emergencyRepairLv1: getEmergencyRepairHeal(BASE_DEFENSE.baseHp, 1),
        };
      }),
    ),
  );
}

function printWalletSummary() {
  printTitle('Starting Wallet');
  console.table([
    {
      soft: STARTING_WALLET.soft,
      hard: STARTING_WALLET.hard,
      targetSoft: '80-120',
      targetHard: TARGETS.startingHard,
    },
  ]);
}

function printStageTable(stages) {
  printTitle('Stage Rewards, HP, And Density');
  console.table(
    stages.map((stage) => {
      const boss = getBossForStage(stage);
      if (boss) {
        return {
          stage,
          mode: 'boss',
          totalEnemies: 1,
          activeCap: 1,
          softReward: getBossReward(stage),
          zombieHp: getEnemyHp(stage, 'zombie'),
          tankHp: getEnemyHp(stage, 'zombie-tank'),
          mutantHp: getEnemyHp(stage, 'zombie-mutant'),
          groups: `boss:${boss.name}`,
        };
      }

      const wave = getStageWave(stage);
      return {
        stage,
        mode: 'wave',
        totalEnemies: wave.totalEnemies,
        activeCap: wave.maxActiveEnemies,
        softReward: getWaveSoftReward(wave),
        zombieHp: getEnemyHp(stage, 'zombie'),
        tankHp: getEnemyHp(stage, 'zombie-tank'),
        mutantHp: getEnemyHp(stage, 'zombie-mutant'),
        groups: formatGroups(wave.enemies),
      };
    }),
  );
}

function printBossTable(stages) {
  printTitle('Boss Snapshot');
  console.table(
    stages.map((stage) => {
      const boss = getBossForStage(stage);
      const baseStats = getEnemyStats(stage, boss.enemyId);
      return {
        stage,
        boss: boss.name,
        enemyId: boss.enemyId,
        hp: Math.ceil(baseStats.hp * boss.hpMultiplier),
        speed: Math.ceil(baseStats.speed * boss.speedMultiplier),
        damage: Math.ceil(baseStats.damage * boss.damageMultiplier),
        softReward: getBossReward(stage),
        hardReward: boss.tokenReward,
        targetSpeedMultiplier: '0.35-0.6',
      };
    }),
  );
}

function printPremiumPacingTable(stages) {
  printTitle('Premium Currency Pacing');
  let hardTotal = 0;
  console.table(
    stages.map((stage) => {
      const boss = getBossForStage(stage);
      hardTotal += boss.tokenReward;
      return {
        stage,
        boss: boss.name,
        hardReward: boss.tokenReward,
        hardTotal,
        canUnlockTesla: hardTotal >= 12,
        canUnlockSniper: hardTotal >= 18,
        canUnlockGrenade: hardTotal >= 24,
      };
    }),
  );
}

function printWeaponTable() {
  printTitle('Weapon DPS And Special Audit');
  console.table(
    Object.entries(WEAPONS).map(([id, weapon]) => {
      const dps = getWeaponDps(id, createProgress());
      const totalSoftGate = getTotalSoftGate(weapon);
      return {
        id,
        name: weapon.name,
        dps: round(dps, 2),
        softCost: weapon.softCost,
        unlockCost: weapon.unlockCost,
        softGate: totalSoftGate ?? '-',
        dpsPer100Soft: totalSoftGate ? round((dps / totalSoftGate) * 100, 2) : '-',
        special: weapon.special.label,
        specialWorksNow: doesCurrentSpecialWork(id) ? 'yes' : 'no',
      };
    }),
  );
}

function printUpgradeCostTable() {
  printTitle('Shared Upgrade Cost Samples');
  console.table(
    Object.entries(COMMON_UPGRADES).map(([stat, config]) => ({
      stat,
      level1: getUpgradeCost(config, 0),
      level2: getUpgradeCost(config, 1),
      level3: getUpgradeCost(config, 2),
      level5: getUpgradeCost(config, 4),
      maxLevel: config.maxLevel,
    })),
  );
}

function printGridCostTable() {
  printTitle('Grid Cell Cost Samples');
  const startCells = GRID_CONFIG.startCols * GRID_CONFIG.startRows;
  console.table(
    [0, 1, 2, 5, 10, 20, 40, 80, 120, 180].map((purchasedCells) => ({
      activeCells: startCells + purchasedCells,
      purchasedCells,
      nextCellCost: getNextCellCost(purchasedCells),
    })),
  );
}

function printWarnings() {
  printTitle('Warnings');
  const warnings = [];
  const stage1Reward = getWaveSoftReward(getStageWave(1));

  if (STARTING_WALLET.soft > TARGETS.startingSoftMax) {
    warnings.push(`Starting soft ${STARTING_WALLET.soft} is far above production target 80-120.`);
  }

  if (STARTING_WALLET.hard !== TARGETS.startingHard) {
    warnings.push(`Starting hard ${STARTING_WALLET.hard} lets players skip boss-earned premium pacing.`);
  }

  if (STARTING_WALLET.soft / stage1Reward > 10) {
    warnings.push(`Starting soft equals ${round(STARTING_WALLET.soft / stage1Reward, 1)} stage-1 clears.`);
  }

  if (WAVE_CONFIG.maxActiveEnemies > TARGETS.mobileActiveEnemyCap) {
    warnings.push(`maxActiveEnemies ${WAVE_CONFIG.maxActiveEnemies} is above mobile-safe target ${TARGETS.mobileActiveEnemyCap}.`);
  }

  const deadSpecials = Object.entries(WEAPONS)
    .filter(([id]) => !doesCurrentSpecialWork(id))
    .map(([, weapon]) => weapon.special.label);
  if (deadSpecials.length > 0) {
    warnings.push(`Dead/misleading special upgrades now: ${[...new Set(deadSpecials)].join(', ')}.`);
  }

  const bestValue = Object.entries(WEAPONS)
    .filter(([, weapon]) => getTotalSoftGate(weapon))
    .map(([id, weapon]) => ({
      id,
      value: getWeaponDps(id, createProgress()) / getTotalSoftGate(weapon),
    }))
    .sort((a, b) => b.value - a.value)[0];
  warnings.push(`Best simple DPS per soft gate is ${bestValue.id}; verify it is not always-correct.`);

  warnings.forEach((warning) => console.log(`- ${warning}`));
}

function getStageWave(stage) {
  const patternIndex = (stage - 1) % STAGE_WAVE_PATTERNS.length;
  const block = Math.floor((stage - 1) / STAGE_WAVE_PATTERNS.length);
  const pattern = STAGE_WAVE_PATTERNS[patternIndex];
  const uncapped = [];

  for (const enemyId of ENEMY_ORDER) {
    if (BOSS_ONLY_ENEMY_IDS.has(enemyId)) continue;
    const baseCount = pattern[enemyId] ?? 0;
    if (baseCount === 0) continue;
    const reinforcement = enemyId === 'zombie' ? block * 4 : block * 2;
    uncapped.push({ enemyId, count: baseCount + reinforcement });
  }

  const enemies = capEnemyGroups(uncapped, WAVE_CONFIG.maxTotalEnemies);
  return {
    stage,
    enemies,
    totalEnemies: enemies.reduce((total, group) => total + group.count, 0),
    maxActiveEnemies: getStageMaxActiveEnemies(stage),
    initialSpawnDelayMs: getStageInitialSpawnDelayMs(stage),
    spawnIntervalMs: getStageSpawnIntervalMs(stage),
  };
}

function getStageMaxActiveEnemies(stage) {
  if (stage === 1) return 3;
  if (stage <= 3) return 6;
  if (stage <= 9) return 14;
  return WAVE_CONFIG.maxActiveEnemies;
}

function getStageInitialSpawnDelayMs(stage) {
  return stage === 1 ? 1000 : 250;
}

function getStageSpawnIntervalMs(stage) {
  if (stage === 1) return 3600;
  if (stage <= 3) return 3100;
  return Math.max(1100, 2600 - stage * 90);
}

function capEnemyGroups(groups, maxTotalEnemies) {
  const totalEnemies = groups.reduce((total, group) => total + group.count, 0);
  if (totalEnemies <= maxTotalEnemies) return [...groups];

  const capped = groups.map((group) => ({
    enemyId: group.enemyId,
    count: Math.max(1, Math.floor((group.count / totalEnemies) * maxTotalEnemies)),
  }));

  let cappedTotal = capped.reduce((total, group) => total + group.count, 0);
  for (let index = 0; cappedTotal < maxTotalEnemies; index = (index + 1) % capped.length) {
    capped[index].count += 1;
    cappedTotal += 1;
  }

  return capped;
}

function getBossForStage(stage) {
  if (stage % 10 !== 0) return null;

  const bossIndex = Math.floor(stage / 10 - 1) % BOSS_CONFIG.length;
  return BOSS_CONFIG[bossIndex] ?? BOSS_CONFIG[0];
}

function getWaveSoftReward(wave) {
  return wave.enemies.reduce((total, group) => total + group.count * getKillReward(wave.stage, group.enemyId), 0);
}

function getKillReward(stage, enemyId) {
  return Math.ceil(REWARD_CONFIG.baseKillReward * REWARD_CONFIG.stageRewardScale ** (stage - 1) * REWARD_CONFIG.enemyTierMultipliers[enemyId]);
}

function getBossReward(stage) {
  return Math.ceil(getKillReward(stage, 'zombie-tank') * REWARD_CONFIG.bossRewardMultiplier);
}

function getEnemyStats(stage, enemyId) {
  return {
    hp: getEnemyHp(stage, enemyId),
    speed: Math.ceil(ENEMY_SCALING.baseSpeed * ENEMY_SCALING.stageSpeedScale ** (stage - 1) * ENEMY_SCALING.enemySpeedMultipliers[enemyId]),
    damage: Math.ceil(ENEMY_SCALING.baseDamage * ENEMY_SCALING.stageDamageScale ** (stage - 1) * ENEMY_SCALING.enemyDamageMultipliers[enemyId]),
  };
}

function getEnemyHp(stage, enemyId) {
  return Math.ceil(ENEMY_SCALING.baseHp * ENEMY_SCALING.stageHpScale ** (stage - 1) * ENEMY_SCALING.enemyHpMultipliers[enemyId]);
}

function getArmorRating(armorLevel) {
  return Math.max(0, Math.floor(armorLevel)) * BASE_DEFENSE.armorRatingPerLevel;
}

function getArmorDamageReduction(armorRating, stage) {
  const safeRating = Math.max(0, armorRating);
  if (safeRating <= 0) return 0;

  const stagePressure = BASE_DEFENSE.armorStagePressureBase + Math.max(1, Math.floor(stage)) * BASE_DEFENSE.armorStagePressureScale;
  return Math.min(BASE_DEFENSE.armorMaxReduction, safeRating / (safeRating + stagePressure));
}

function getMitigatedBaseDamage(rawDamage, armorRating, stage) {
  const safeDamage = Math.max(0, Math.ceil(rawDamage));
  if (safeDamage <= 0) return 0;
  return Math.max(1, Math.ceil(safeDamage * (1 - getArmorDamageReduction(armorRating, stage))));
}

function getEmergencyRepairHeal(maxBunkerHp, repairLevel) {
  const level = Math.max(0, Math.floor(repairLevel));
  if (level <= 0) return 0;

  const ratio = Math.min(
    BASE_DEFENSE.emergencyRepairMaxHealRatio,
    BASE_DEFENSE.emergencyRepairBaseHealRatio + (level - 1) * BASE_DEFENSE.emergencyRepairHealRatioPerLevel,
  );
  return Math.ceil(Math.max(1, maxBunkerHp) * ratio);
}

function getWeaponDps(weaponId, progress) {
  const stats = getWeaponComputedStats(weaponId, progress);
  const magazineSize = Math.max(1, stats.magazineSize);
  const cycleMs = stats.cooldownMs * magazineSize + stats.reloadMs;
  const shotsPerSecond = (magazineSize * 1000) / cycleMs;
  const doubleTapMultiplier = stats.doubleTapInterval ? 1 + 1 / stats.doubleTapInterval : 1;
  const focusMultiplier = stats.focusMaxStacks > 0 ? 1 + (stats.focusDamagePerStack * stats.focusMaxStacks) / 2 : 1;
  const chainMultiplier =
    stats.teslaChainJumps > 0
      ? 1 + Array.from({ length: stats.teslaChainJumps }, (_, index) => stats.teslaChainFalloff ** (index + 1)).reduce((total, value) => total + value, 0)
      : 1;
  return stats.damage * stats.spread * shotsPerSecond * doubleTapMultiplier * focusMultiplier * chainMultiplier;
}

function getWeaponComputedStats(weaponId, progress) {
  const weapon = WEAPONS[weaponId];
  const damageMultiplier = 1 + progress.damage * 0.16;
  const cooldownMultiplier = Math.max(0.52, 1 - progress.fireRate * 0.055);
  const speedMultiplier = 1 + progress.handling * 0.075;
  const critChance = Math.min(0.3, progress.critChance * 0.03);
  const special = getWeaponSpecialStats(weaponId, progress.special);

  return {
    damage: Math.ceil(weapon.damage * damageMultiplier),
    cooldownMs: Math.max(240, Math.round(weapon.cooldownMs * 2 * cooldownMultiplier)),
    magazineSize: weapon.magazineSize,
    reloadMs: weapon.reloadMs,
    projectileSpeed: Math.round(weapon.projectileSpeed * speedMultiplier),
    rangePx: getWeaponRange(weapon, progress.range),
    critChance,
    critMultiplier: 1.5,
    spread: weapon.spread + special.spreadBonus,
    doubleTapInterval: special.doubleTapInterval,
    teslaChainJumps: special.teslaChainJumps,
    teslaChainFalloff: special.teslaChainFalloff,
    focusDamagePerStack: special.focusDamagePerStack,
    focusMaxStacks: special.focusMaxStacks,
    pierceCount: special.pierceCount,
    grenadeRadius: special.grenadeRadius,
    grenadeSplashDamageMultiplier: special.grenadeSplashDamageMultiplier,
  };
}

function createProgress(level = 0) {
  return {
    damage: level,
    fireRate: level,
    handling: level,
    range: level,
    critChance: level,
    special: level,
  };
}

function getWeaponSpecialStats(weaponId, specialLevel) {
  const level = Math.max(0, Math.floor(specialLevel));
  const base = {
    spreadBonus: 0,
    doubleTapInterval: null,
    teslaChainJumps: 0,
    teslaChainFalloff: 0,
    focusDamagePerStack: 0,
    focusMaxStacks: 0,
    pierceCount: 0,
    grenadeRadius: 84,
    grenadeSplashDamageMultiplier: 0.65,
  };

  if (level <= 0) return base;
  if (weaponId === 'starter_pistol' || weaponId === 'pistol') return { ...base, doubleTapInterval: Math.max(3, 8 - level) };
  if (weaponId === 'shotgun' || weaponId === 'compactShotgun') return { ...base, spreadBonus: Math.floor((level + 1) / 2) };
  if (weaponId === 'tesla') {
    return {
      ...base,
      teslaChainJumps: Math.min(3, Math.ceil(level / 2)),
      teslaChainFalloff: Math.min(0.78, 0.52 + level * 0.05),
    };
  }
  if (weaponId === 'assaultRifle') {
    return {
      ...base,
      focusDamagePerStack: 0.04,
      focusMaxStacks: 4 + level * 2,
    };
  }
  if (weaponId === 'sniperRifle') return { ...base, pierceCount: Math.min(3, Math.ceil(level / 2)) };
  if (weaponId === 'grenadeLauncher') {
    return {
      ...base,
      grenadeRadius: 84 + level * 14,
      grenadeSplashDamageMultiplier: Math.min(0.9, 0.65 + level * 0.04),
    };
  }
  return base;
}

function doesCurrentSpecialWork(weaponId) {
  const base = getWeaponComputedStats(weaponId, createProgress(0));
  const upgraded = getWeaponComputedStats(weaponId, createProgress(1));
  return (
    upgraded.spread > base.spread ||
    upgraded.doubleTapInterval !== base.doubleTapInterval ||
    upgraded.teslaChainJumps > base.teslaChainJumps ||
    upgraded.focusMaxStacks > base.focusMaxStacks ||
    upgraded.pierceCount > base.pierceCount ||
    upgraded.grenadeRadius > base.grenadeRadius
  );
}

function getWeaponRange(weapon, rangeLevel) {
  const t = Math.min(rangeLevel, COMMON_UPGRADES.range.maxLevel) / COMMON_UPGRADES.range.maxLevel;
  return Math.round(weapon.rangePx + (weapon.maxRangePx - weapon.rangePx) * t);
}

function getUpgradeCost(config, currentLevel) {
  return Math.ceil(config.baseCost * config.costScale ** currentLevel);
}

function getNextCellCost(purchasedCells) {
  return Math.ceil(GRID_CONFIG.baseCellCost * GRID_CONFIG.cellCostScale ** purchasedCells);
}

function getTotalSoftGate(weapon) {
  const match = /^(\d+) soft$/.exec(weapon.unlockCost);
  if (!match) return null;
  return Number(match[1]) + weapon.softCost;
}

function formatGroups(groups) {
  return groups.map((group) => `${group.enemyId}:${group.count}`).join(' ');
}

function printTitle(title) {
  console.log(`\n=== ${title} ===`);
}

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

main();

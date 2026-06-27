import Phaser from 'phaser';
import { EnemyFrameKeys } from '../assets/assetManifest';
import type { BossDefinition } from '../data/bossData';
import { ENEMIES, getEnemyDefinition, type EnemyDefinition, type EnemyId } from '../data/enemyData';
import { expandStageWave, type StageWaveDefinition } from '../data/stageWaveData';
import { getKillReward } from '../idle/Economy';
import { getEnemyStageStats } from '../idle/EnemyScaling';
import type { WeaponId } from '../data/weaponData';
import { playGrenadeExplosionSfx, playWeaponFireSfx } from '../audio/GameAudio';
import { getEnemyScale } from '../save/GameSettings';
import { getWeaponComputedStats, type WeaponProgress } from '../idle/WeaponStats';
import { getRoadSpawnX } from '../config/roadBounds';
import { getBunkerWeaponMount, type BunkerMountGrid } from '../idle/BunkerMounts';
import type { WeaponRotation } from '../idle/EquipGrid';

export const BATTLE_WORLD_DEPTHS = {
  background: 0,
  enemiesBase: 100,
  projectiles: 900,
  beam: 880,
  bunker: 1400,
  debug: 2500,
  hud: 3000,
} as const;

type Enemy = {
  enemyId: EnemyId;
  body: Phaser.GameObjects.Sprite;
  state: 'walking' | 'attacking' | 'dying';
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackCooldownMs: number;
  attackDelayMs: number;
  baseDisplaySize: number;
  bossDisplayScale: number;
  appliedScale: number;
  boss: BossDefinition | null;
};

type Projectile = {
  weaponId: BallisticWeaponId;
  body: Phaser.GameObjects.Image;
  damage: number;
  critChance: number;
  critMultiplier: number;
  velocityX: number;
  velocityY: number;
  maxRangePx: number;
  traveledPx: number;
};

type ProjectileArtDefinition = {
  textureKey: string;
  width: number;
  height: number;
  depth?: number;
};

type WeaponRuntimeState = {
  shotCooldownMs: number;
  reloadMs: number;
  ammo: number;
  heat: number;
  overheatMs: number;
};

type BallisticWeaponId = Exclude<WeaponId, 'tesla'>;

const PROJECTILE_TEXTURES: Record<BallisticWeaponId, string> = {
  starter_pistol: 'projectile-pistol-round',
  pistol: 'projectile-pistol-round',
  shotgun: 'projectile-shotgun-pellet',
  compactShotgun: 'projectile-shotgun-pellet',
  assaultRifle: 'projectile-rifle-round',
  sniperRifle: 'projectile-sniper-round',
  grenadeLauncher: 'projectile-grenade',
};

const PROJECTILE_ART: Record<BallisticWeaponId, ProjectileArtDefinition> = {
  starter_pistol: { textureKey: PROJECTILE_TEXTURES.starter_pistol, width: 7, height: 14 },
  pistol: { textureKey: PROJECTILE_TEXTURES.pistol, width: 7, height: 14 },
  shotgun: { textureKey: PROJECTILE_TEXTURES.shotgun, width: 13, height: 17 },
  compactShotgun: { textureKey: PROJECTILE_TEXTURES.compactShotgun, width: 11, height: 15 },
  assaultRifle: { textureKey: PROJECTILE_TEXTURES.assaultRifle, width: 11, height: 34 },
  sniperRifle: { textureKey: PROJECTILE_TEXTURES.sniperRifle, width: 9, height: 42 },
  grenadeLauncher: { textureKey: PROJECTILE_TEXTURES.grenadeLauncher, width: 22, height: 30 },
};

const GRENADE_EXPLOSION = {
  radius: 84,
  splashDamageMultiplier: 0.65,
  durationMs: 220,
} as const;

export type BattleResult = 'running' | 'won' | 'lost';

export type MountedBattleWeapon = {
  id: number;
  weaponId: WeaponId;
  col: number;
  row: number;
  rotation: WeaponRotation;
  progress: WeaponProgress;
};

export type BattleSnapshot = {
  bunkerHp: number;
  bunkerMaxHp: number;
  kills: number;
  targetKills: number;
  stage: number;
  softEarned: number;
  hardEarned: number;
  result: BattleResult;
  boss: {
    name: string;
    hp: number;
    maxHp: number;
    tokenReward: number;
  } | null;
  weapons: BattleWeaponRuntimeSnapshot[];
};

export type BattleWeaponRuntimeSnapshot = {
  id: number;
  weaponId: WeaponId;
  shotCooldownMs: number;
  cooldownMs: number;
  reloadMs: number;
  reloadDurationMs: number;
  ammo: number;
  magazineSize: number;
  heat: number;
  overheatMs: number;
};

type BattleConfig = {
  bunkerHp: number;
  bunkerArmor: number;
  stage: number;
  wave: StageWaveDefinition;
  boss: BossDefinition | null;
  grid: BunkerMountGrid;
  weapons: MountedBattleWeapon[];
};

export class BattleSystem {
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private spawnQueue: EnemyId[];
  private weaponStates: WeaponRuntimeState[] = [];
  private spawnCooldownMs = 0;
  private bunkerHp: number;
  private kills = 0;
  private softEarned = 0;
  private hardEarned = 0;
  private bonusTargetKills = 0;
  private bossSpawned = false;
  private result: BattleResult = 'running';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly config: BattleConfig,
  ) {
    this.bunkerHp = config.bunkerHp;
    this.spawnQueue = config.boss ? [] : this.createSpawnQueue(config.wave);
    this.weaponStates = config.weapons.map((weapon, index) => this.createWeaponRuntimeState(weapon, index * 180));
    this.createEnemyAnimations();
    this.createProjectileTextures();
  }

  get snapshot(): BattleSnapshot {
    return {
      bunkerHp: this.bunkerHp,
      bunkerMaxHp: this.config.bunkerHp,
      kills: this.kills,
      targetKills: this.getTargetKills(),
      stage: this.config.stage,
      softEarned: this.softEarned,
      hardEarned: this.hardEarned,
      result: this.result,
      boss: this.getBossSnapshot(),
      weapons: this.getWeaponSnapshots(),
    };
  }

  update(deltaMs: number): BattleSnapshot {
    if (this.result !== 'running') {
      return this.snapshot;
    }

    this.spawnEnemies(deltaMs);
    this.fireWeapons(deltaMs);
    this.updateEnemies(deltaMs);
    this.updateProjectiles(deltaMs);
    this.resolveHits();
    this.clearInactive();
    this.updateResult();

    return this.snapshot;
  }

  destroy(): void {
    for (const enemy of this.enemies) enemy.body.destroy();
    for (const projectile of this.projectiles) projectile.body.destroy();
    this.enemies = [];
    this.projectiles = [];
  }

  setWeapons(weapons: MountedBattleWeapon[], grid: BunkerMountGrid = this.config.grid): void {
    this.config.weapons = weapons;
    this.config.grid = grid;
    while (this.weaponStates.length < weapons.length) {
      this.weaponStates.push(this.createWeaponRuntimeState(weapons[this.weaponStates.length], this.weaponStates.length * 180));
    }
    if (this.weaponStates.length > weapons.length) {
      this.weaponStates.length = weapons.length;
    }
  }

  setBaseDefense(maxBunkerHp: number, bunkerArmor: number): void {
    const previousMaxHp = this.config.bunkerHp;
    this.config.bunkerHp = maxBunkerHp;
    this.config.bunkerArmor = bunkerArmor;
    if (maxBunkerHp > previousMaxHp) {
      this.bunkerHp += maxBunkerHp - previousMaxHp;
    }
    this.bunkerHp = Phaser.Math.Clamp(this.bunkerHp, 0, maxBunkerHp);
  }

  spawnOneOfEachEnemyType(): number {
    if (this.result !== 'running') return 0;

    this.bonusTargetKills += ENEMIES.length;
    ENEMIES.forEach((enemy, index) => {
      this.spawnEnemy(enemy.id, (index + 0.5) / ENEMIES.length);
    });
    return ENEMIES.length;
  }

  startStage(stage: number, wave: StageWaveDefinition, boss: BossDefinition | null): void {
    if (wave.stage !== stage) {
      throw new Error(`Wave stage ${wave.stage} does not match battle stage ${stage}`);
    }

    this.config.stage = stage;
    this.config.wave = wave;
    this.config.boss = boss;
    this.kills = 0;
    this.softEarned = 0;
    this.hardEarned = 0;
    this.bonusTargetKills = 0;
    this.bossSpawned = false;
    this.spawnQueue = boss ? [] : this.createSpawnQueue(wave);
    this.spawnCooldownMs = 250;
    this.result = 'running';
  }

  private spawnEnemies(deltaMs: number): void {
    this.spawnCooldownMs -= deltaMs;
    if (this.spawnCooldownMs > 0) return;

    if (this.config.boss && !this.bossSpawned) {
      this.spawnEnemy(this.config.boss.enemyId, 0.5, this.config.boss);
      this.bossSpawned = true;
      return;
    }
    if (this.config.boss) return;

    if (this.spawnQueue.length === 0) return;
    if (this.getActiveEnemyCount() >= this.config.wave.maxActiveEnemies) {
      this.spawnCooldownMs = 160;
      return;
    }

    const enemyId = this.spawnQueue.shift();
    if (!enemyId) return;
    this.spawnEnemy(enemyId);
    this.spawnCooldownMs = Math.max(1100, 2600 - this.config.stage * 90);
  }

  private spawnEnemy(enemyId: EnemyId, lanePosition?: number, boss: BossDefinition | null = null): void {
    const definition = getEnemyDefinition(enemyId);
    const visualScale = getEnemyScale(definition.id);
    const baseDisplaySize = definition.displaySize;
    const bossDisplayScale = boss?.displayScale ?? 1;
    const displaySize = Math.round(baseDisplaySize * bossDisplayScale * visualScale);
    const roadSpawn = getRoadSpawnX(displaySize);
    const x = lanePosition === undefined ? Phaser.Math.Between(roadSpawn.min, roadSpawn.max) : Phaser.Math.Linear(roadSpawn.min, roadSpawn.max, lanePosition);
    const enemy = this.scene.add.sprite(x, -32, EnemyFrameKeys[definition.id].walk[0]);
    enemy.setDisplaySize(displaySize, displaySize);
    enemy.setOrigin(0.5, 0.5);
    enemy.setDepth(this.getEnemyDepth(enemy.y));
    enemy.play(this.getEnemyAnimationKey(definition.id, 'walk'));
    const stageStats = getEnemyStageStats(this.config.stage, definition.id);
    const hp = Math.ceil(stageStats.hp * (boss?.hpMultiplier ?? 1));
    this.enemies.push({
      enemyId: definition.id,
      body: enemy,
      state: 'walking',
      hp,
      maxHp: hp,
      speed: Math.ceil(stageStats.speed * (boss?.speedMultiplier ?? 1)),
      damage: Math.ceil(stageStats.damage * (boss?.damageMultiplier ?? 1)),
      attackCooldownMs: 0,
      attackDelayMs: definition.attackCooldownMs,
      baseDisplaySize,
      bossDisplayScale,
      appliedScale: visualScale,
      boss,
    });
  }

  private fireWeapons(deltaMs: number): void {
    for (let index = 0; index < this.config.weapons.length; index += 1) {
      const mountedWeapon = this.config.weapons[index];
      const stats = getWeaponComputedStats(mountedWeapon.weaponId, mountedWeapon.progress);
      const weaponState = this.weaponStates[index] ?? this.createWeaponRuntimeState(mountedWeapon);
      this.weaponStates[index] = weaponState;
      this.updateWeaponRuntimeState(weaponState, mountedWeapon.weaponId, deltaMs);
      if (!this.canWeaponFire(weaponState)) continue;

      const mount = this.getBunkerWeaponMount(mountedWeapon);
      const mountX = mount.x;
      const mountY = mount.y;
      const target = this.findTargetInRange(mountX, mountY, stats.rangePx);
      if (!target) continue;
      const angle = Phaser.Math.Angle.Between(mountX, mountY, target.body.x, target.body.y);

      if (mountedWeapon.weaponId === 'tesla') {
        this.fireTeslaBeam(mountX, mountY, target, stats.damage, stats.critChance, stats.critMultiplier);
        playWeaponFireSfx(this.scene, mountedWeapon.weaponId);
        this.consumeTeslaHeat(weaponState, stats.cooldownMs);
        continue;
      }

      for (let shot = 0; shot < stats.spread; shot += 1) {
        const spreadOffset = (shot - (stats.spread - 1) / 2) * this.getProjectileSpreadStep(mountedWeapon.weaponId);
        this.spawnProjectile(mountX, mountY, angle + spreadOffset, stats.projectileSpeed, stats.damage, stats.critChance, stats.critMultiplier, mountedWeapon.weaponId, stats.rangePx);
      }

      playWeaponFireSfx(this.scene, mountedWeapon.weaponId);
      this.consumeAmmo(weaponState, stats.magazineSize, stats.reloadMs, stats.cooldownMs);
    }
  }

  private createWeaponRuntimeState(weapon: MountedBattleWeapon, initialCooldownMs = 0): WeaponRuntimeState {
    const stats = getWeaponComputedStats(weapon.weaponId, weapon.progress);
    return {
      shotCooldownMs: initialCooldownMs,
      reloadMs: 0,
      ammo: Math.max(1, stats.magazineSize),
      heat: 0,
      overheatMs: 0,
    };
  }

  private updateWeaponRuntimeState(state: WeaponRuntimeState, weaponId: WeaponId, deltaMs: number): void {
    const reloadWasActive = state.reloadMs > 0;
    state.shotCooldownMs = Math.max(0, state.shotCooldownMs - deltaMs);
    state.reloadMs = Math.max(0, state.reloadMs - deltaMs);

    if (reloadWasActive && state.reloadMs <= 0 && weaponId !== 'tesla') {
      const stats = getWeaponComputedStats(weaponId);
      state.ammo = Math.max(1, stats.magazineSize);
    }

    if (weaponId !== 'tesla') return;

    state.overheatMs = Math.max(0, state.overheatMs - deltaMs);
    if (state.overheatMs > 0) return;
    state.heat = Math.max(0, state.heat - deltaMs / 4200);
  }

  private canWeaponFire(state: WeaponRuntimeState): boolean {
    return state.shotCooldownMs <= 0 && state.reloadMs <= 0 && state.overheatMs <= 0;
  }

  private consumeAmmo(state: WeaponRuntimeState, magazineSize: number, reloadMs: number, cooldownMs: number): void {
    state.ammo -= 1;
    state.shotCooldownMs = cooldownMs;
    if (state.ammo > 0) return;
    state.reloadMs = reloadMs;
    state.ammo = 0;
  }

  private consumeTeslaHeat(state: WeaponRuntimeState, cooldownMs: number): void {
    state.heat = Math.min(1, state.heat + 0.28);
    state.shotCooldownMs = cooldownMs;
    if (state.heat < 1) return;
    state.overheatMs = 2200;
    state.heat = 1;
  }

  private getWeaponSnapshots(): BattleWeaponRuntimeSnapshot[] {
    return this.config.weapons.map((weapon, index) => {
      const stats = getWeaponComputedStats(weapon.weaponId, weapon.progress);
      const state = this.weaponStates[index] ?? this.createWeaponRuntimeState(weapon);
      return {
        id: weapon.id,
        weaponId: weapon.weaponId,
        shotCooldownMs: state.shotCooldownMs,
        cooldownMs: stats.cooldownMs,
        reloadMs: state.reloadMs,
        reloadDurationMs: stats.reloadMs,
        ammo: state.ammo,
        magazineSize: stats.magazineSize,
        heat: state.heat,
        overheatMs: state.overheatMs,
      };
    });
  }

  private spawnProjectile(
    x: number,
    y: number,
    angle: number,
    speed: number,
    damage: number,
    critChance: number,
    critMultiplier: number,
    weaponId: BallisticWeaponId,
    maxRangePx: number,
  ): void {
    const art = PROJECTILE_ART[weaponId];
    const projectile = this.scene.add.image(x, y, art.textureKey);
    projectile.setDisplaySize(art.width, art.height);
    projectile.setRotation(angle + Math.PI / 2);
    projectile.setDepth(art.depth ?? BATTLE_WORLD_DEPTHS.projectiles);
    this.projectiles.push({
      weaponId,
      body: projectile,
      damage,
      critChance,
      critMultiplier,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      maxRangePx,
      traveledPx: 0,
    });
  }

  private getProjectileSpreadStep(weaponId: BallisticWeaponId): number {
    if (weaponId === 'shotgun' || weaponId === 'compactShotgun') return 0.1;
    return 0.16;
  }

  private fireTeslaBeam(mountX: number, mountY: number, target: Enemy, damage: number, critChance: number, critMultiplier: number): void {
    const startY = mountY;
    const beam = this.scene.add.graphics().setDepth(BATTLE_WORLD_DEPTHS.beam);
    const points = this.createBeamPoints(mountX, startY, target.body.x, target.body.y);

    beam.lineStyle(10, 0x123d55, 0.42);
    beam.beginPath();
    beam.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => beam.lineTo(point.x, point.y));
    beam.strokePath();

    beam.lineStyle(5, 0x3dd8ff, 0.88);
    beam.beginPath();
    beam.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => beam.lineTo(point.x, point.y));
    beam.strokePath();

    beam.lineStyle(2, 0xf2ffff, 1);
    beam.beginPath();
    beam.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => beam.lineTo(point.x, point.y));
    beam.strokePath();

    this.scene.tweens.add({
      targets: beam,
      alpha: 0,
      duration: 130,
      ease: 'Sine.easeOut',
      onComplete: () => beam.destroy(),
    });

    this.damageEnemy(target, damage, critChance, critMultiplier);
  }

  private createBeamPoints(startX: number, startY: number, endX: number, endY: number): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
    const segments = 5;

    for (let index = 1; index < segments; index += 1) {
      const t = index / segments;
      const x = Phaser.Math.Linear(startX, endX, t) + Phaser.Math.Between(-14, 14);
      const y = Phaser.Math.Linear(startY, endY, t) + Phaser.Math.Between(-10, 10);
      points.push({ x, y });
    }

    points.push({ x: endX, y: endY });
    return points;
  }

  private getBunkerWeaponMount(weapon: MountedBattleWeapon): { x: number; y: number } {
    return getBunkerWeaponMount(weapon, this.config.grid, { width: this.scene.scale.width, height: this.scene.scale.height });
  }

  private updateEnemies(deltaMs: number): void {
    this.applyEnemyVisualScale();
    const delta = deltaMs / 1000;
    const bunkerLine = this.scene.scale.height - 142;

    for (const enemy of this.enemies) {
      if (enemy.state === 'dying') continue;

      if (enemy.body.y < bunkerLine) {
        enemy.body.y += enemy.speed * delta;
        enemy.body.setDepth(this.getEnemyDepth(enemy.body.y));
        continue;
      }

      enemy.body.setDepth(this.getEnemyDepth(enemy.body.y));
      enemy.attackCooldownMs -= deltaMs;
      if (enemy.attackCooldownMs <= 0) {
        this.playEnemyAttack(enemy);
        this.bunkerHp = Math.max(0, this.bunkerHp - this.getIncomingBaseDamage(enemy.damage));
        enemy.attackCooldownMs = enemy.attackDelayMs;
        this.scene.cameras.main.shake(90, 0.004);
      }
    }
  }

  private applyEnemyVisualScale(): void {
    for (const enemy of this.enemies) {
      const visualScale = getEnemyScale(enemy.enemyId);
      if (enemy.appliedScale === visualScale) continue;
      const displaySize = Math.round(enemy.baseDisplaySize * enemy.bossDisplayScale * visualScale);
      enemy.body.setDisplaySize(displaySize, displaySize);
      enemy.appliedScale = visualScale;
    }
  }

  private updateProjectiles(deltaMs: number): void {
    const delta = deltaMs / 1000;
    for (const projectile of this.projectiles) {
      if (!projectile.body.active) continue;

      const moveX = projectile.velocityX * delta;
      const moveY = projectile.velocityY * delta;
      projectile.traveledPx += Math.hypot(moveX, moveY);
      projectile.body.x += moveX;
      projectile.body.y += moveY;

      if (projectile.traveledPx < projectile.maxRangePx) continue;

      if (projectile.weaponId === 'grenadeLauncher') {
        this.detonateGrenade(projectile.body.x, projectile.body.y, null, projectile.damage, projectile.critChance, projectile.critMultiplier);
      }
      projectile.body.setActive(false).setVisible(false);
    }
  }

  private resolveHits(): void {
    for (const projectile of this.projectiles) {
      if (!projectile.body.active) continue;

      for (const enemy of this.enemies) {
        if (!enemy.body.active || enemy.state === 'dying') continue;
        const distance = Phaser.Math.Distance.Between(projectile.body.x, projectile.body.y, enemy.body.x, enemy.body.y);
        if (distance > 24) continue;

        projectile.body.setActive(false).setVisible(false);
        if (projectile.weaponId === 'grenadeLauncher') {
          this.detonateGrenade(projectile.body.x, projectile.body.y, enemy, projectile.damage, projectile.critChance, projectile.critMultiplier);
        } else {
          this.damageEnemy(enemy, projectile.damage, projectile.critChance, projectile.critMultiplier);
        }
        break;
      }
    }
  }

  private detonateGrenade(x: number, y: number, primaryTarget: Enemy | null, damage: number, critChance: number, critMultiplier: number): void {
    this.spawnGrenadeExplosion(x, y);
    playGrenadeExplosionSfx(this.scene);
    if (primaryTarget) {
      this.damageEnemy(primaryTarget, damage, critChance, critMultiplier);
    }

    const splashDamage = Math.max(1, Math.round(damage * GRENADE_EXPLOSION.splashDamageMultiplier));
    for (const enemy of this.enemies) {
      if (enemy === primaryTarget || !enemy.body.active || enemy.state === 'dying') continue;

      const distance = Phaser.Math.Distance.Between(x, y, enemy.body.x, enemy.body.y);
      if (distance > GRENADE_EXPLOSION.radius) continue;
      this.damageEnemy(enemy, splashDamage, critChance, critMultiplier);
    }
  }

  private spawnGrenadeExplosion(x: number, y: number): void {
    const explosion = this.scene.add.graphics({ x, y }).setDepth(BATTLE_WORLD_DEPTHS.projectiles + 1);
    explosion.fillStyle(0x2a1208, 0.32);
    explosion.fillCircle(0, 0, GRENADE_EXPLOSION.radius);
    explosion.lineStyle(5, 0xff8a2a, 0.72);
    explosion.strokeCircle(0, 0, GRENADE_EXPLOSION.radius * 0.62);
    explosion.fillStyle(0xffd36a, 0.9);
    explosion.fillCircle(0, 0, GRENADE_EXPLOSION.radius * 0.22);
    explosion.fillStyle(0xf3ead2, 0.86);
    explosion.fillCircle(-6, -6, GRENADE_EXPLOSION.radius * 0.09);

    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6 + Phaser.Math.FloatBetween(-0.18, 0.18);
      const inner = GRENADE_EXPLOSION.radius * 0.2;
      const outer = GRENADE_EXPLOSION.radius * Phaser.Math.FloatBetween(0.42, 0.74);
      explosion.lineStyle(2, 0xffc46a, 0.72);
      explosion.lineBetween(Math.cos(angle) * inner, Math.sin(angle) * inner, Math.cos(angle) * outer, Math.sin(angle) * outer);
    }

    this.scene.tweens.add({
      targets: explosion,
      alpha: 0,
      scale: 1.18,
      duration: GRENADE_EXPLOSION.durationMs,
      ease: 'Sine.easeOut',
      onComplete: () => explosion.destroy(),
    });
  }

  private damageEnemy(enemy: Enemy, damage: number, critChance = 0, critMultiplier = 1.5): void {
    const isCrit = critChance > 0 && Phaser.Math.FloatBetween(0, 1) < critChance;
    enemy.hp -= isCrit ? Math.ceil(damage * critMultiplier) : damage;
    this.scene.tweens.add({
      targets: enemy.body,
      alpha: { from: isCrit ? 0.35 : 0.65, to: 1 },
      duration: isCrit ? 145 : 110,
      ease: 'Sine.easeOut',
    });

    if (enemy.hp <= 0) {
      this.kills += 1;
      this.softEarned += getKillReward(this.config.stage, enemy.enemyId);
      if (enemy.boss) {
        this.hardEarned += enemy.boss.tokenReward;
      }
      this.playEnemyDeath(enemy);
    }
  }

  private clearInactive(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    this.projectiles = this.projectiles.filter((projectile) => {
      const active =
        projectile.body.active &&
        projectile.body.x > -40 &&
        projectile.body.x < width + 40 &&
        projectile.body.y > -60 &&
        projectile.body.y < height + 60;
      if (!active) projectile.body.destroy();
      return active;
    });

    this.enemies = this.enemies.filter((enemy) => {
      if (!enemy.body.active) {
        enemy.body.destroy();
        return false;
      }
      return true;
    });
  }

  private updateResult(): void {
    if (this.bunkerHp <= 0) {
      this.result = 'lost';
      return;
    }

    if (this.kills >= this.getTargetKills() && this.spawnQueue.length === 0 && (!this.config.boss || this.bossSpawned)) {
      this.result = 'won';
    }
  }

  private getActiveEnemyCount(): number {
    return this.enemies.filter((enemy) => enemy.body.active && enemy.state !== 'dying').length;
  }

  private getTargetKills(): number {
    return (this.config.boss ? 1 : this.config.wave.totalEnemies) + this.bonusTargetKills;
  }

  private getBossSnapshot(): BattleSnapshot['boss'] {
    const boss = this.config.boss;
    if (!boss) return null;

    const activeBoss = this.enemies.find((enemy) => enemy.boss?.id === boss.id && enemy.state !== 'dying');
    const fallbackMaxHp = activeBoss?.maxHp ?? 1;
    return {
      name: boss.name,
      hp: Math.max(0, Math.ceil(activeBoss?.hp ?? 0)),
      maxHp: fallbackMaxHp,
      tokenReward: boss.tokenReward,
    };
  }

  private createSpawnQueue(wave: StageWaveDefinition): EnemyId[] {
    return Phaser.Utils.Array.Shuffle(expandStageWave(wave));
  }

  private findTargetInRange(x: number, y: number, rangePx: number): Enemy | undefined {
    return this.enemies
      .filter((enemy) => {
        if (!enemy.body.active || enemy.state === 'dying' || enemy.body.y <= -10) return false;
        return Phaser.Math.Distance.Between(x, y, enemy.body.x, enemy.body.y) <= rangePx;
      })
      .sort((a, b) => b.body.y - a.body.y)[0];
  }

  private createEnemyAnimations(): void {
    for (const enemy of ENEMIES) {
      this.createEnemyAnimation(enemy, 'walk', enemy.walkFrameRate, -1);
      this.createEnemyAnimation(enemy, 'attack', 12, 0);
      this.createEnemyAnimation(enemy, 'death', 10, 0);
    }
  }

  private createProjectileTextures(): void {
    const textures = this.scene.textures;
    if (textures.exists(PROJECTILE_TEXTURES.pistol)) return;

    const graphics = this.scene.add.graphics();

    graphics.clear();
    graphics.fillStyle(0x1b1309, 0.45);
    graphics.fillRoundedRect(19, 11, 10, 27, 5);
    graphics.fillStyle(0xe0aa46, 1);
    graphics.fillRoundedRect(20, 14, 8, 22, 4);
    graphics.fillStyle(0xf6d47a, 1);
    graphics.fillTriangle(20, 15, 28, 15, 24, 7);
    graphics.fillStyle(0x7f5126, 1);
    graphics.fillRoundedRect(21, 32, 6, 5, 2);
    graphics.lineStyle(1, 0xffefb8, 0.8);
    graphics.lineBetween(22, 16, 22, 31);
    graphics.generateTexture(PROJECTILE_TEXTURES.pistol, 48, 48);

    graphics.clear();
    graphics.lineStyle(2, 0x1b1b1b, 0.85);
    graphics.fillStyle(0xb8b8aa, 1);
    graphics.fillCircle(20, 18, 4);
    graphics.strokeCircle(20, 18, 4);
    graphics.fillCircle(28, 18, 4);
    graphics.strokeCircle(28, 18, 4);
    graphics.fillCircle(24, 27, 4);
    graphics.strokeCircle(24, 27, 4);
    graphics.lineStyle(1, 0xf3ead2, 0.65);
    graphics.lineBetween(21, 16, 22, 15);
    graphics.lineBetween(29, 16, 30, 15);
    graphics.generateTexture(PROJECTILE_TEXTURES.shotgun, 48, 48);

    graphics.clear();
    graphics.fillStyle(0x150f0a, 0.42);
    graphics.fillRoundedRect(20, 8, 8, 34, 4);
    graphics.fillStyle(0xc98135, 1);
    graphics.fillRoundedRect(21, 15, 6, 24, 3);
    graphics.fillStyle(0xf1c76b, 1);
    graphics.fillTriangle(21, 16, 27, 16, 24, 6);
    graphics.fillStyle(0x7b4a24, 1);
    graphics.fillRoundedRect(21, 36, 6, 4, 2);
    graphics.lineStyle(1, 0xffe3a3, 0.75);
    graphics.lineBetween(23, 16, 23, 34);
    graphics.generateTexture(PROJECTILE_TEXTURES.assaultRifle, 48, 48);

    graphics.clear();
    graphics.fillStyle(0x0e0b09, 0.5);
    graphics.fillRoundedRect(21, 5, 6, 39, 3);
    graphics.fillStyle(0xd29b4a, 1);
    graphics.fillRoundedRect(22, 17, 4, 24, 2);
    graphics.fillStyle(0xe9d6ad, 1);
    graphics.fillTriangle(22, 18, 26, 18, 24, 4);
    graphics.fillStyle(0x795331, 1);
    graphics.fillRect(21, 39, 6, 4);
    graphics.lineStyle(1, 0xfff0c9, 0.9);
    graphics.lineBetween(23, 17, 23, 36);
    graphics.generateTexture(PROJECTILE_TEXTURES.sniperRifle, 48, 48);

    graphics.clear();
    graphics.fillStyle(0x0a0d08, 0.48);
    graphics.fillEllipse(24, 24, 18, 28);
    graphics.fillStyle(0x43513a, 1);
    graphics.fillEllipse(24, 22, 16, 24);
    graphics.fillStyle(0x67785b, 1);
    graphics.fillEllipse(24, 17, 12, 13);
    graphics.fillStyle(0x20291c, 1);
    graphics.fillRect(21, 32, 6, 7);
    graphics.fillStyle(0x8b6d38, 1);
    graphics.fillRect(19, 37, 10, 3);
    graphics.lineStyle(2, 0xc9b56a, 0.8);
    graphics.strokeEllipse(24, 22, 16, 24);
    graphics.generateTexture(PROJECTILE_TEXTURES.grenadeLauncher, 48, 48);

    graphics.destroy();
  }

  private playEnemyAttack(enemy: Enemy): void {
    if (enemy.state === 'dying') return;
    enemy.state = 'attacking';
    enemy.body.play(this.getEnemyAnimationKey(enemy.enemyId, 'attack'), true);
    enemy.body.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (!enemy.body.active || enemy.state === 'dying') return;
      enemy.state = 'walking';
      enemy.body.play(this.getEnemyAnimationKey(enemy.enemyId, 'walk'), true);
    });
  }

  private getEnemyDepth(y: number): number {
    return BATTLE_WORLD_DEPTHS.enemiesBase + y;
  }

  private getIncomingBaseDamage(rawDamage: number): number {
    return Math.max(1, rawDamage - this.config.bunkerArmor);
  }

  private playEnemyDeath(enemy: Enemy): void {
    if (enemy.state === 'dying') return;
    enemy.state = 'dying';

    if (EnemyFrameKeys[enemy.enemyId].death.length === 1) {
      const collapsedScaleY = enemy.body.scaleY * 0.28;
      this.scene.tweens.add({
        targets: enemy.body,
        alpha: 0,
        scaleY: collapsedScaleY,
        y: enemy.body.y + 8,
        duration: 240,
        ease: 'Quad.easeIn',
        onComplete: () => enemy.body.setActive(false).setVisible(false),
      });
      return;
    }

    enemy.body.play(this.getEnemyAnimationKey(enemy.enemyId, 'death'), true);
    enemy.body.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      enemy.body.setActive(false).setVisible(false);
    });
  }

  private createEnemyAnimation(enemy: EnemyDefinition, state: 'walk' | 'attack' | 'death', frameRate: number, repeat: number): void {
    const key = this.getEnemyAnimationKey(enemy.id, state);
    if (this.scene.anims.exists(key)) return;

    this.scene.anims.create({
      key,
      frames: EnemyFrameKeys[enemy.id][state].map((frameKey) => ({ key: frameKey })),
      frameRate,
      repeat,
    });
  }

  private getEnemyAnimationKey(enemyId: EnemyId, state: 'walk' | 'attack' | 'death'): string {
    return `${enemyId}-${state}`;
  }
}

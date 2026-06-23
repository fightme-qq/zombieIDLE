import Phaser from 'phaser';
import { EnemyFrameKeys } from '../assets/assetManifest';
import { ENEMIES, getEnemyDefinition, type EnemyDefinition, type EnemyId } from '../data/enemyData';
import { expandStageWave, type StageWaveDefinition } from '../data/stageWaveData';
import { getKillReward } from '../idle/Economy';
import { getEnemyStageStats } from '../idle/EnemyScaling';
import { WEAPONS, type WeaponId } from '../data/weaponData';
import { getWeaponComputedStats, type WeaponProgress } from '../idle/WeaponStats';
import { getRoadSpawnX } from '../config/roadBounds';

type Enemy = {
  enemyId: EnemyId;
  body: Phaser.GameObjects.Sprite;
  state: 'walking' | 'attacking' | 'dying';
  hp: number;
  speed: number;
  damage: number;
  attackCooldownMs: number;
  attackDelayMs: number;
};

type Projectile = {
  body: Phaser.GameObjects.Rectangle;
  damage: number;
  velocityX: number;
  velocityY: number;
};

export type BattleResult = 'running' | 'won' | 'lost';

export type MountedBattleWeapon = {
  weaponId: WeaponId;
  progress: WeaponProgress;
};

export type BattleSnapshot = {
  bunkerHp: number;
  bunkerMaxHp: number;
  kills: number;
  targetKills: number;
  stage: number;
  softEarned: number;
  result: BattleResult;
};

type BattleConfig = {
  bunkerHp: number;
  stage: number;
  wave: StageWaveDefinition;
  weapons: MountedBattleWeapon[];
};

export class BattleSystem {
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private spawnQueue: EnemyId[];
  private weaponCooldowns: number[] = [];
  private spawnCooldownMs = 0;
  private bunkerHp: number;
  private kills = 0;
  private softEarned = 0;
  private result: BattleResult = 'running';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly config: BattleConfig,
  ) {
    this.bunkerHp = config.bunkerHp;
    this.spawnQueue = this.createSpawnQueue(config.wave);
    this.weaponCooldowns = config.weapons.map((_, index) => index * 180);
    this.createEnemyAnimations();
  }

  get snapshot(): BattleSnapshot {
    return {
      bunkerHp: this.bunkerHp,
      bunkerMaxHp: this.config.bunkerHp,
      kills: this.kills,
      targetKills: this.config.wave.totalEnemies,
      stage: this.config.stage,
      softEarned: this.softEarned,
      result: this.result,
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

  setWeapons(weapons: MountedBattleWeapon[]): void {
    this.config.weapons = weapons;
    while (this.weaponCooldowns.length < weapons.length) {
      this.weaponCooldowns.push(this.weaponCooldowns.length * 180);
    }
    if (this.weaponCooldowns.length > weapons.length) {
      this.weaponCooldowns.length = weapons.length;
    }
  }

  startStage(stage: number, wave: StageWaveDefinition): void {
    if (wave.stage !== stage) {
      throw new Error(`Wave stage ${wave.stage} does not match battle stage ${stage}`);
    }

    this.config.stage = stage;
    this.config.wave = wave;
    this.kills = 0;
    this.spawnQueue = this.createSpawnQueue(wave);
    this.spawnCooldownMs = 250;
    this.result = 'running';
  }

  private spawnEnemies(deltaMs: number): void {
    this.spawnCooldownMs -= deltaMs;
    if (this.spawnCooldownMs > 0) return;
    if (this.spawnQueue.length === 0) return;

    const enemyId = this.spawnQueue.shift();
    if (!enemyId) return;
    const definition = getEnemyDefinition(enemyId);
    const roadSpawn = getRoadSpawnX(definition.displaySize);
    const x = Phaser.Math.Between(roadSpawn.min, roadSpawn.max);
    const enemy = this.scene.add.sprite(x, -32, EnemyFrameKeys[definition.id].walk[0]);
    enemy.setDisplaySize(definition.displaySize, definition.displaySize);
    enemy.setOrigin(0.5, 0.5);
    enemy.setDepth(12);
    enemy.play(this.getEnemyAnimationKey(definition.id, 'walk'));
    const stageStats = getEnemyStageStats(this.config.stage, definition.id);
    this.enemies.push({
      enemyId: definition.id,
      body: enemy,
      state: 'walking',
      hp: stageStats.hp,
      speed: stageStats.speed,
      damage: stageStats.damage,
      attackCooldownMs: 0,
      attackDelayMs: definition.attackCooldownMs,
    });

    this.spawnCooldownMs = Math.max(1100, 2600 - this.config.stage * 90);
  }

  private fireWeapons(deltaMs: number): void {
    const target = this.findTarget();
    if (!target) return;

    for (let index = 0; index < this.config.weapons.length; index += 1) {
      this.weaponCooldowns[index] -= deltaMs;
      if (this.weaponCooldowns[index] > 0) continue;

      const mountedWeapon = this.config.weapons[index];
      const weapon = WEAPONS[mountedWeapon.weaponId];
      const stats = getWeaponComputedStats(mountedWeapon.weaponId, mountedWeapon.progress);
      const mountX = this.getBunkerWeaponX(index);
      const mountY = this.scene.scale.height - 92;
      const angle = Phaser.Math.Angle.Between(mountX, mountY, target.body.x, target.body.y);

      for (let shot = 0; shot < stats.spread; shot += 1) {
        const spreadOffset = (shot - (stats.spread - 1) / 2) * 0.16;
        this.spawnProjectile(mountX, mountY, angle + spreadOffset, stats.projectileSpeed, stats.damage, weapon.color);
      }

      this.weaponCooldowns[index] = stats.cooldownMs;
    }
  }

  private spawnProjectile(x: number, y: number, angle: number, speed: number, damage: number, color: number): void {
    const projectile = this.scene.add.rectangle(x, y, 8, 20, color, 1);
    projectile.setRotation(angle + Math.PI / 2);
    projectile.setDepth(14);
    this.projectiles.push({
      body: projectile,
      damage,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
    });
  }

  private getBunkerWeaponX(index: number): number {
    const spacing = 72;
    const offset = (index - (this.config.weapons.length - 1) / 2) * spacing;
    return this.scene.scale.width / 2 + offset;
  }

  private updateEnemies(deltaMs: number): void {
    const delta = deltaMs / 1000;
    const bunkerLine = this.scene.scale.height - 112;

    for (const enemy of this.enemies) {
      if (enemy.state === 'dying') continue;

      if (enemy.body.y < bunkerLine) {
        enemy.body.y += enemy.speed * delta;
        continue;
      }

      enemy.attackCooldownMs -= deltaMs;
      if (enemy.attackCooldownMs <= 0) {
        this.playEnemyAttack(enemy);
        this.bunkerHp = Math.max(0, this.bunkerHp - enemy.damage);
        enemy.attackCooldownMs = enemy.attackDelayMs;
        this.scene.cameras.main.shake(90, 0.004);
      }
    }
  }

  private updateProjectiles(deltaMs: number): void {
    const delta = deltaMs / 1000;
    for (const projectile of this.projectiles) {
      projectile.body.x += projectile.velocityX * delta;
      projectile.body.y += projectile.velocityY * delta;
    }
  }

  private resolveHits(): void {
    for (const projectile of this.projectiles) {
      if (!projectile.body.active) continue;

      for (const enemy of this.enemies) {
        if (!enemy.body.active || enemy.state === 'dying') continue;
        const distance = Phaser.Math.Distance.Between(projectile.body.x, projectile.body.y, enemy.body.x, enemy.body.y);
        if (distance > 24) continue;

        enemy.hp -= projectile.damage;
        projectile.body.setActive(false).setVisible(false);
        this.scene.tweens.add({
          targets: enemy.body,
          alpha: { from: 0.65, to: 1 },
          duration: 110,
          ease: 'Sine.easeOut',
        });

        if (enemy.hp <= 0) {
          this.kills += 1;
          this.softEarned += getKillReward(this.config.stage, enemy.enemyId);
          this.playEnemyDeath(enemy);
        }
        break;
      }
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

    if (this.kills >= this.config.wave.totalEnemies && this.spawnQueue.length === 0) {
      this.result = 'won';
    }
  }

  private createSpawnQueue(wave: StageWaveDefinition): EnemyId[] {
    return Phaser.Utils.Array.Shuffle(expandStageWave(wave));
  }

  private findTarget(): Enemy | undefined {
    return this.enemies
      .filter((enemy) => enemy.body.active && enemy.state !== 'dying' && enemy.body.y > -10)
      .sort((a, b) => b.body.y - a.body.y)[0];
  }

  private createEnemyAnimations(): void {
    for (const enemy of ENEMIES) {
      this.createEnemyAnimation(enemy, 'walk', enemy.walkFrameRate, -1);
      this.createEnemyAnimation(enemy, 'attack', 12, 0);
      this.createEnemyAnimation(enemy, 'death', 10, 0);
    }
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

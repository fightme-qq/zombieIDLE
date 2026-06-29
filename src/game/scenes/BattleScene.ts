import Phaser from 'phaser';
import { startBackgroundMusic } from '../audio/GameAudio';
import { AssetKeys } from '../assets/assetManifest';
import { DEBUG_FLAGS } from '../config/debugFlags';
import { ROAD_BOUNDS } from '../config/roadBounds';
import { SceneKeys } from '../config/sceneKeys';
import { getBossForStage } from '../data/bossData';
import { getStageWave } from '../data/stageWaveData';
import { saveRunProgress } from '../save/RunProgress';
import { sharedRunState } from '../state/sharedRunState';
import { BATTLE_WORLD_DEPTHS, BattleSystem, type BattleSnapshot } from '../systems/BattleSystem';
import { createCurrencyValue, type CurrencyKind, type CurrencyValueView } from '../ui/currencyUi';
import { UI_TEXT } from '../ui/uiText';

const BATTLE_UI = {
  panel: 0x0b100d,
  stroke: 0x586c4a,
  strokeDim: 0x303a2b,
  accent: 0xd6b85a,
  hpGood: 0x8fbf63,
  hpDanger: 0xc44531,
  hpWarn: 0xd6b85a,
  hard: 0x6fb7ff,
} as const;

const BATTLE_HUD_DEPTH = BATTLE_WORLD_DEPTHS.hud;
export const BATTLE_SNAPSHOT_REGISTRY_KEY = 'battleSnapshot';

type CurrencyHudPill = {
  view: CurrencyValueView;
  bg: Phaser.GameObjects.Rectangle;
  leftX: number;
  y: number;
  minWidth: number;
  maxWidth: number;
};

export class BattleScene extends Phaser.Scene {
  private battle: BattleSystem | null = null;
  private battleSoftCollected = 0;
  private battleHardCollected = 0;
  private hpBar: Phaser.GameObjects.Rectangle | null = null;
  private stageProgressBar: Phaser.GameObjects.Rectangle | null = null;
  private baseText: Phaser.GameObjects.Text | null = null;
  private stageText: Phaser.GameObjects.Text | null = null;
  private softCurrency: CurrencyHudPill | null = null;
  private hardCurrency: CurrencyHudPill | null = null;
  private roadBoundsOverlay: Phaser.GameObjects.Container | null = null;
  private roadBoundsSignature = '';
  private weaponSignature = '';

  constructor() {
    super(SceneKeys.Battle);
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
    this.drawBattlefield();
    startBackgroundMusic(this);
    this.startBattle();
  }

  update(_time: number, delta: number): void {
    if (!this.battle) return;

    this.battle.setBaseDefense(sharedRunState.maxBunkerHp, sharedRunState.baseArmor, sharedRunState.emergencyRepairLevel);
    this.syncWeaponsFromState();
    const snapshot = this.battle.update(delta);
    this.registry.set(BATTLE_SNAPSHOT_REGISTRY_KEY, snapshot);
    this.updateBattleHud(snapshot);
    this.updateRoadBoundsOverlay();

    if (snapshot.result !== 'running') {
      this.finishBattle(snapshot);
    }
  }

  spawnOneOfEachEnemyType(): number {
    return this.battle?.spawnOneOfEachEnemyType() ?? 0;
  }

  private shutdown(): void {
    this.battle?.destroy();
    this.battle = null;
  }

  private startBattle(): void {
    this.battle?.destroy();
    this.battleSoftCollected = 0;
    this.battleHardCollected = 0;

    this.battle = new BattleSystem(this, {
      bunkerHp: sharedRunState.maxBunkerHp,
      bunkerArmor: sharedRunState.baseArmor,
      emergencyRepairLevel: sharedRunState.emergencyRepairLevel,
      stage: sharedRunState.currentStage,
      wave: getStageWave(sharedRunState.currentStage),
      boss: getBossForStage(sharedRunState.currentStage),
      grid: { cols: sharedRunState.gridCols, rows: sharedRunState.gridRows },
      weapons: this.getMountedBattleWeapons(),
    });
    this.registry.set(BATTLE_SNAPSHOT_REGISTRY_KEY, this.battle.snapshot);
    this.weaponSignature = this.getWeaponSignature();
  }

  private finishBattle(snapshot: BattleSnapshot): void {
    this.collectBattleSoft(snapshot);
    this.recordBattleKills(snapshot);

    if (snapshot.result === 'won') {
      const nextStage = sharedRunState.advanceStage();
      saveRunProgress(sharedRunState);
      this.battleSoftCollected = 0;
      this.battleHardCollected = 0;
      this.battle?.startStage(nextStage, getStageWave(nextStage), getBossForStage(nextStage));
      return;
    }

    this.battle?.destroy();
    this.battle = null;
    sharedRunState.resetToCheckpoint();
    saveRunProgress(sharedRunState);
    this.startBattle();
  }

  private recordBattleKills(snapshot: BattleSnapshot): void {
    sharedRunState.recordBattleKills(snapshot.kills, snapshot.result === 'won' && Boolean(snapshot.boss));
  }

  private updateBattleHud(snapshot: BattleSnapshot): void {
    this.collectBattleSoft(snapshot);
    this.collectBattleHard(snapshot);
    const hpRatio = Phaser.Math.Clamp(snapshot.bunkerHp / snapshot.bunkerMaxHp, 0, 1);
    const stageRatio = snapshot.boss
      ? Phaser.Math.Clamp(1 - snapshot.boss.hp / Math.max(1, snapshot.boss.maxHp), 0, 1)
      : Phaser.Math.Clamp(snapshot.kills / snapshot.targetKills, 0, 1);
    this.hpBar?.setDisplaySize(360 * hpRatio, 14);
    this.stageProgressBar?.setDisplaySize(256 * stageRatio, 8);
    this.hpBar?.setFillStyle(hpRatio > 0.5 ? BATTLE_UI.hpGood : hpRatio > 0.25 ? BATTLE_UI.hpWarn : BATTLE_UI.hpDanger);
    this.baseText?.setText(`${UI_TEXT.stats.base} ${snapshot.bunkerHp}/${snapshot.bunkerMaxHp}`);
    if (snapshot.boss) {
      this.stageText?.setText(`${snapshot.boss.name}   HP ${snapshot.boss.hp}/${snapshot.boss.maxHp}   +${snapshot.boss.tokenReward}`);
    } else {
      this.stageText?.setText(
        `${UI_TEXT.stats.stage} ${sharedRunState.currentStage}   ${UI_TEXT.stats.best} ${sharedRunState.highestStage}   ${UI_TEXT.stats.kills} ${snapshot.kills}/${snapshot.targetKills}`,
      );
    }
    this.softCurrency?.view.setValue(this.formatNumber(sharedRunState.soft));
    this.hardCurrency?.view.setValue(this.formatNumber(sharedRunState.hard));
    this.layoutCurrencyHud();
  }

  private collectBattleSoft(snapshot: BattleSnapshot): void {
    if (snapshot.softEarned <= this.battleSoftCollected) return;

    sharedRunState.soft += snapshot.softEarned - this.battleSoftCollected;
    this.battleSoftCollected = snapshot.softEarned;
    saveRunProgress(sharedRunState);
  }

  private collectBattleHard(snapshot: BattleSnapshot): void {
    if (snapshot.hardEarned <= this.battleHardCollected) return;

    sharedRunState.hard += snapshot.hardEarned - this.battleHardCollected;
    this.battleHardCollected = snapshot.hardEarned;
    saveRunProgress(sharedRunState);
  }

  private syncWeaponsFromState(): void {
    const signature = this.getWeaponSignature();
    if (signature === this.weaponSignature) return;

    this.battle?.setWeapons(this.getMountedBattleWeapons(), { cols: sharedRunState.gridCols, rows: sharedRunState.gridRows });
    this.weaponSignature = signature;
  }

  private getWeaponSignature(): string {
    return sharedRunState.placedWeapons
      .map((weapon) => {
        const progress = sharedRunState.getWeaponProgress(weapon.weaponId);
        return `${weapon.id}:${weapon.weaponId}:${weapon.col}:${weapon.row}:${weapon.rotation}:${Object.values(progress.stats).join(',')}`;
      })
      .join('|') + `#${sharedRunState.gridCols}:${sharedRunState.gridRows}`;
  }

  private getMountedBattleWeapons() {
    return sharedRunState.placedWeapons.map((weapon) => ({
      id: weapon.id,
      weaponId: weapon.weaponId,
      col: weapon.col,
      row: weapon.row,
      rotation: weapon.rotation,
      progress: sharedRunState.getWeaponProgress(weapon.weaponId),
    }));
  }

  private drawBattlefield(): void {
    const { width, height } = this.scale;
    const background = this.add.image(width / 2, height / 2, AssetKeys.Backgrounds.battlefield);
    background.setScale(Math.max(width / background.width, height / background.height));
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.12);

    const bunker = this.add.image(width / 2, height - 70 + 100, AssetKeys.Structures.bunker).setDepth(BATTLE_WORLD_DEPTHS.bunker);
    bunker.setDisplaySize(560, (560 * bunker.height) / bunker.width);
    this.drawRoadBounds();

    this.drawCurrencyHud();
    this.drawBaseHpHud();
    this.drawStageHud();
    this.drawSettingsButton();
  }

  private drawCurrencyHud(): void {
    this.softCurrency = this.drawCurrencyPill(18, 24, 122, 192, 'soft', this.formatNumber(sharedRunState.soft));
    this.hardCurrency = this.drawCurrencyPill(18, 24, 98, 154, 'hard', this.formatNumber(sharedRunState.hard));
    this.layoutCurrencyHud();
  }

  private drawCurrencyPill(
    leftX: number,
    y: number,
    minWidth: number,
    maxWidth: number,
    kind: CurrencyKind,
    value: string,
  ): CurrencyHudPill {
    const view = createCurrencyValue(this, leftX + 14, y, value, kind, {
      maxWidth: maxWidth - 28,
      fontSize: 27,
      iconSize: 39,
      gap: 8,
      originX: 0,
      depth: BATTLE_HUD_DEPTH + 2,
    });
    const bg = this.add.rectangle(leftX + minWidth / 2, y, minWidth, 45, BATTLE_UI.panel, 0.86).setDepth(BATTLE_HUD_DEPTH).setStrokeStyle(2, BATTLE_UI.strokeDim, 0.9);

    return { view, bg, leftX, y, minWidth, maxWidth };
  }

  private layoutCurrencyHud(): void {
    if (!this.softCurrency || !this.hardCurrency) return;

    const gap = 12;
    const softWidth = Phaser.Math.Clamp(this.softCurrency.view.container.width + 28, this.softCurrency.minWidth, this.softCurrency.maxWidth);
    this.softCurrency.bg.setPosition(this.softCurrency.leftX + softWidth / 2, this.softCurrency.y).setDisplaySize(softWidth, 45);
    this.softCurrency.view.container.setPosition(this.softCurrency.leftX + 14, this.softCurrency.y);

    const hardLeftX = this.softCurrency.leftX + softWidth + gap;
    const hardWidth = Phaser.Math.Clamp(this.hardCurrency.view.container.width + 28, this.hardCurrency.minWidth, this.hardCurrency.maxWidth);
    this.hardCurrency.bg.setPosition(hardLeftX + hardWidth / 2, this.hardCurrency.y).setDisplaySize(hardWidth, 45);
    this.hardCurrency.view.container.setPosition(hardLeftX + 14, this.hardCurrency.y);
    this.hardCurrency.leftX = hardLeftX;
  }

  private drawBaseHpHud(): void {
    const centerX = this.scale.width / 2;
    this.add.rectangle(centerX, 20, 390, 24, 0x0b100d, 0.76).setDepth(BATTLE_HUD_DEPTH).setStrokeStyle(1, BATTLE_UI.strokeDim, 0.9);
    this.hpBar = this.add.rectangle(centerX - 180, 20, 360, 14, BATTLE_UI.hpGood, 1).setDepth(BATTLE_HUD_DEPTH + 1).setOrigin(0, 0.5);
    this.baseText = this.add.text(centerX, 42, '', this.getHudTextStyle(16)).setDepth(BATTLE_HUD_DEPTH + 2).setOrigin(0.5);
  }

  private drawStageHud(): void {
    const rightX = this.scale.width - 382;
    this.stageText = this.add.text(rightX, 18, '', this.getHudTextStyle(15)).setDepth(BATTLE_HUD_DEPTH + 2).setOrigin(0, 0.5);
    this.add.rectangle(rightX, 39, 262, 14, 0x0b100d, 0.78).setDepth(BATTLE_HUD_DEPTH).setOrigin(0, 0.5).setStrokeStyle(1, BATTLE_UI.strokeDim, 0.9);
    this.stageProgressBar = this.add.rectangle(rightX + 3, 39, 1, 8, BATTLE_UI.accent, 1).setDepth(BATTLE_HUD_DEPTH + 1).setOrigin(0, 0.5);
  }

  private drawSettingsButton(): void {
    const x = this.scale.width - 32;
    const y = 24;
    const button = this.add.rectangle(x, y, 42, 42, BATTLE_UI.panel, 0.88).setDepth(BATTLE_HUD_DEPTH).setStrokeStyle(1, BATTLE_UI.stroke, 0.95).setInteractive({ useHandCursor: true });
    this.add.circle(x, y, 10, 0x20291c, 1).setDepth(BATTLE_HUD_DEPTH + 1).setStrokeStyle(2, BATTLE_UI.accent, 1);
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      this.add.rectangle(x + Math.cos(angle) * 13, y + Math.sin(angle) * 13, 3, 8, BATTLE_UI.accent, 1).setDepth(BATTLE_HUD_DEPTH + 2).setRotation(angle);
    }
    button.on('pointerdown', () => this.openSettingsPanel());
    button.on('pointerover', () => button.setStrokeStyle(2, BATTLE_UI.accent, 1));
    button.on('pointerout', () => button.setStrokeStyle(1, BATTLE_UI.stroke, 0.95));
  }

  private openSettingsPanel(): void {
    const gameScene = this.scene.get(SceneKeys.Game) as Phaser.Scene & { toggleSettingsPanel?: () => void };
    gameScene.toggleSettingsPanel?.();
  }

  private getHudTextStyle(fontSize: number): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'Trebuchet MS, Arial, sans-serif',
      fontSize: `${fontSize}px`,
      color: '#f3ead2',
      stroke: '#050805',
      strokeThickness: 2,
    };
  }

  private formatNumber(value: number): string {
    if (value <= 10000) return `${Math.floor(value)}`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return `${value}`;
  }

  private drawRoadBounds(): void {
    const { height } = this.scale;
    this.roadBoundsOverlay?.destroy(true);
    const overlay = this.add.container(0, 0).setDepth(BATTLE_WORLD_DEPTHS.debug).setVisible(DEBUG_FLAGS.showRoadBounds);
    const graphics = this.add.graphics();
    graphics.lineStyle(4, 0x28f0ff, 0.86);
    graphics.lineBetween(ROAD_BOUNDS.left, 0, ROAD_BOUNDS.left, height);
    graphics.lineBetween(ROAD_BOUNDS.right, 0, ROAD_BOUNDS.right, height);
    graphics.fillStyle(0x28f0ff, 0.1);
    graphics.fillRect(ROAD_BOUNDS.left, 0, ROAD_BOUNDS.right - ROAD_BOUNDS.left, height);

    const label = `road left ${ROAD_BOUNDS.left}   right ${ROAD_BOUNDS.right}   width ${ROAD_BOUNDS.right - ROAD_BOUNDS.left}`;
    const text = this.add
      .text((ROAD_BOUNDS.left + ROAD_BOUNDS.right) / 2, 106, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#bdfcff',
        backgroundColor: '#06171bcc',
        padding: { left: 10, right: 10, top: 4, bottom: 4 },
      })
      .setOrigin(0.5);

    overlay.add([graphics, text]);
    this.roadBoundsOverlay = overlay;
    this.roadBoundsSignature = this.getRoadBoundsSignature();
  }

  private updateRoadBoundsOverlay(): void {
    if (this.roadBoundsSignature !== this.getRoadBoundsSignature()) {
      this.drawRoadBounds();
    }

    this.roadBoundsOverlay?.setVisible(DEBUG_FLAGS.showRoadBounds);
  }

  private getRoadBoundsSignature(): string {
    return `${ROAD_BOUNDS.left}:${ROAD_BOUNDS.right}`;
  }
}

import Phaser from 'phaser';
import { AssetKeys } from '../assets/assetManifest';
import { DEBUG_FLAGS } from '../config/debugFlags';
import { ROAD_BOUNDS } from '../config/roadBounds';
import { SceneKeys } from '../config/sceneKeys';
import { getStageWave } from '../data/stageWaveData';
import { sharedRunState } from '../state/sharedRunState';
import { BattleSystem, type BattleSnapshot } from '../systems/BattleSystem';
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

const BATTLE_HUD_DEPTH = 80;
export class BattleScene extends Phaser.Scene {
  private battle: BattleSystem | null = null;
  private battleSoftCollected = 0;
  private hpBar: Phaser.GameObjects.Rectangle | null = null;
  private stageProgressBar: Phaser.GameObjects.Rectangle | null = null;
  private baseText: Phaser.GameObjects.Text | null = null;
  private stageText: Phaser.GameObjects.Text | null = null;
  private softCurrency: CurrencyValueView | null = null;
  private hardCurrency: CurrencyValueView | null = null;
  private roadBoundsOverlay: Phaser.GameObjects.Container | null = null;
  private roadBoundsSignature = '';
  private weaponSignature = '';

  constructor() {
    super(SceneKeys.Battle);
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
    this.drawBattlefield();
    this.startBattle();
  }

  update(_time: number, delta: number): void {
    if (!this.battle) return;

    this.syncWeaponsFromState();
    const snapshot = this.battle.update(delta);
    this.updateBattleHud(snapshot);
    this.updateRoadBoundsOverlay();

    if (snapshot.result !== 'running') {
      this.finishBattle(snapshot);
    }
  }

  private shutdown(): void {
    this.battle?.destroy();
    this.battle = null;
  }

  private startBattle(): void {
    this.battle?.destroy();
    this.battleSoftCollected = 0;

    this.battle = new BattleSystem(this, {
      bunkerHp: sharedRunState.maxBunkerHp,
      stage: sharedRunState.currentStage,
      wave: getStageWave(sharedRunState.currentStage),
      weapons: sharedRunState.placedWeapons.map((weapon) => ({ weaponId: weapon.weaponId, progress: sharedRunState.getWeaponProgress(weapon.weaponId) })),
    });
    this.weaponSignature = this.getWeaponSignature();
  }

  private finishBattle(snapshot: BattleSnapshot): void {
    this.collectBattleSoft(snapshot);

    if (snapshot.result === 'won') {
      const nextStage = sharedRunState.advanceStage();
      this.battle?.startStage(nextStage, getStageWave(nextStage));
      return;
    }

    this.battle?.destroy();
    this.battle = null;
    sharedRunState.resetToCheckpoint();
    this.startBattle();
  }

  private updateBattleHud(snapshot: BattleSnapshot): void {
    this.collectBattleSoft(snapshot);
    const hpRatio = Phaser.Math.Clamp(snapshot.bunkerHp / snapshot.bunkerMaxHp, 0, 1);
    const stageRatio = Phaser.Math.Clamp(snapshot.kills / snapshot.targetKills, 0, 1);
    this.hpBar?.setDisplaySize(360 * hpRatio, 14);
    this.stageProgressBar?.setDisplaySize(256 * stageRatio, 8);
    this.hpBar?.setFillStyle(hpRatio > 0.5 ? BATTLE_UI.hpGood : hpRatio > 0.25 ? BATTLE_UI.hpWarn : BATTLE_UI.hpDanger);
    this.baseText?.setText(`${UI_TEXT.stats.base} ${snapshot.bunkerHp}/${snapshot.bunkerMaxHp}`);
    this.stageText?.setText(
      `${UI_TEXT.stats.stage} ${sharedRunState.currentStage}   ${UI_TEXT.stats.best} ${sharedRunState.highestStage}   ${UI_TEXT.stats.kills} ${snapshot.kills}/${snapshot.targetKills}`,
    );
    this.softCurrency?.setValue(this.formatNumber(sharedRunState.soft));
    this.hardCurrency?.setValue(this.formatNumber(sharedRunState.hard));
  }

  private collectBattleSoft(snapshot: BattleSnapshot): void {
    if (snapshot.softEarned <= this.battleSoftCollected) return;

    sharedRunState.soft += snapshot.softEarned - this.battleSoftCollected;
    this.battleSoftCollected = snapshot.softEarned;
  }

  private syncWeaponsFromState(): void {
    const signature = this.getWeaponSignature();
    if (signature === this.weaponSignature) return;

    this.battle?.setWeapons(sharedRunState.placedWeapons.map((weapon) => ({ weaponId: weapon.weaponId, progress: sharedRunState.getWeaponProgress(weapon.weaponId) })));
    this.weaponSignature = signature;
  }

  private getWeaponSignature(): string {
    return sharedRunState.placedWeapons
      .map((weapon) => {
        const progress = sharedRunState.getWeaponProgress(weapon.weaponId);
        return `${weapon.id}:${weapon.weaponId}:${Object.values(progress.stats).join(',')}`;
      })
      .join('|');
  }

  private drawBattlefield(): void {
    const { width, height } = this.scale;
    const background = this.add.image(width / 2, height / 2, AssetKeys.Backgrounds.battlefield);
    background.setScale(Math.max(width / background.width, height / background.height));
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.12);

    this.add.rectangle(width / 2, height - 54, 560, 108, 0x8f8b80, 0.96).setStrokeStyle(5, 0x262721);
    this.add.rectangle(width / 2, height - 60, 494, 72, 0x6f6a5f, 0.96).setStrokeStyle(4, 0x1c201a);
    this.add.rectangle(width / 2, height - 32, 420, 24, 0x3b3f39, 0.9);
    this.add.rectangle(width / 2, height - 18, 360, 10, 0xd7cfb0, 0.42);
    this.drawRoadBounds();

    this.drawCurrencyHud();
    this.drawBaseHpHud();
    this.drawStageHud();
    this.drawSettingsButton();
  }

  private drawCurrencyHud(): void {
    this.softCurrency = this.drawCurrencyPill(18, 24, 166, 'soft');
    this.hardCurrency = this.drawCurrencyPill(196, 24, 137, 'hard');
  }

  private drawCurrencyPill(x: number, y: number, width: number, kind: CurrencyKind): CurrencyValueView {
    this.add.rectangle(x + width / 2, y, width, 45, BATTLE_UI.panel, 0.86).setDepth(BATTLE_HUD_DEPTH).setStrokeStyle(2, BATTLE_UI.strokeDim, 0.9);
    return createCurrencyValue(this, x + 14, y, 0, kind, {
      maxWidth: width - 28,
      fontSize: 27,
      iconSize: 39,
      gap: 8,
      originX: 0,
      depth: BATTLE_HUD_DEPTH + 2,
    });
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
    this.add.rectangle(x, y, 42, 42, BATTLE_UI.panel, 0.88).setDepth(BATTLE_HUD_DEPTH).setStrokeStyle(1, BATTLE_UI.stroke, 0.95);
    this.add.circle(x, y, 10, 0x20291c, 1).setDepth(BATTLE_HUD_DEPTH + 1).setStrokeStyle(2, BATTLE_UI.accent, 1);
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      this.add.rectangle(x + Math.cos(angle) * 13, y + Math.sin(angle) * 13, 3, 8, BATTLE_UI.accent, 1).setDepth(BATTLE_HUD_DEPTH + 2).setRotation(angle);
    }
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
    const overlay = this.add.container(0, 0).setDepth(40).setVisible(DEBUG_FLAGS.showRoadBounds);
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

import Phaser from 'phaser';
import { applyMusicVolume } from '../audio/GameAudio';
import { AssetKeys, EnemyFrameKeys } from '../assets/assetManifest';
import { DEBUG_FLAGS } from '../config/debugFlags';
import { moveRoadBound, ROAD_BOUNDS, ROAD_BOUNDS_LIMITS } from '../config/roadBounds';
import { SceneKeys } from '../config/sceneKeys';
import { DEFAULT_WEAPON_GRID_ICON_TUNING, WEAPON_GRID_ICON_TUNING, type WeaponIconRotation, type WeaponIconVisualTuning } from '../config/weaponIconTuning';
import { ENEMIES, type EnemyId } from '../data/enemyData';
import {
  WEAPON_CATEGORIES,
  WEAPONS,
  type WeaponCategoryId,
  type WeaponId,
  type WeaponUpgradeStatId,
} from '../data/weaponData';
import { IDLE_GRID_CONFIG } from '../data/idleContent';
import { getWeaponComputedStats, getWeaponDps, getWeaponSpecialEffectLabel, getWeaponTotalLevel } from '../idle/WeaponStats';
import { getBunkerWeaponMount } from '../idle/BunkerMounts';
import { getArmorDamageReduction, getEmergencyRepairHeal } from '../idle/BaseDefense';
import { gameplayStart, gameplayStop } from '../platform/yandexGames';
import { clearAllSurvStorage, saveRunProgress } from '../save/RunProgress';
import { getDefaultEnemyScale, loadGameSettings, updateGameSettings, type GameSettings } from '../save/GameSettings';
import { BATTLE_SNAPSHOT_REGISTRY_KEY } from './BattleScene';
import type { BattleSnapshot, BattleWeaponRuntimeSnapshot } from '../systems/BattleSystem';
import { getWeaponShape, rotateWeaponRotation, type PlacedWeapon, type WeaponRotation } from '../state/RunState';
import { resetSharedRunState, sharedRunState } from '../state/sharedRunState';
import { createCurrencyValue, type CurrencyKind } from '../ui/currencyUi';
import { toggleLocale, UI_TEXT } from '../ui/uiText';

type PrepTab = 'fight' | 'equip' | 'upgrades' | 'shop';
type UpgradesSubTab = 'weapons' | 'base';
type DragState = {
  weaponId: WeaponId;
  fromPlacement: PlacedWeapon | null;
  fromOfferIndex: number | null;
  grabOffset: { col: number; row: number };
  rotation: WeaponRotation;
  preview: Phaser.GameObjects.Container;
  highlights: Phaser.GameObjects.Rectangle[];
};

type PendingDragState = {
  weaponId: WeaponId;
  fromPlacement: PlacedWeapon | null;
  fromOfferIndex: number | null;
  grabOffset: { col: number; row: number };
  rotation: WeaponRotation;
  pointerId: number;
  startX: number;
  startY: number;
};

type SellDropZone = {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  title: Phaser.GameObjects.Text;
  bounds: Phaser.Geom.Rectangle;
};

type GridMetrics = {
  slotSize: number;
  slotWidth: number;
  slotHeight: number;
  gap: number;
  pitch: number;
  pitchX: number;
  pitchY: number;
  cols: number;
  rows: number;
  startX: number;
  startY: number;
};

type WeaponOfferView = {
  weaponId: WeaponId | null;
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  bounds: Phaser.Geom.Rectangle;
};

type PanelBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PanelContentBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
};

type SidePanelSide = 'left' | 'right';
type VolumeSettingId = 'musicVolume' | 'sfxVolume';
type WeaponIconTuningKey = keyof WeaponIconVisualTuning;
type TutorialStepId = 'buy-weapon' | 'upgrade-weapon' | 'buy-cell';
type TutorialTarget = {
  step: TutorialStepId;
  message: string;
  target: Phaser.Math.Vector2;
  source?: Phaser.Math.Vector2;
  focus: Phaser.Geom.Rectangle;
};
type TutorialOverlayState = {
  hand: Phaser.GameObjects.Image;
  key: string;
  loopTimer: Phaser.Time.TimerEvent | null;
};

const PREP_TABS: PrepTab[] = ['fight', 'equip', 'upgrades', 'shop'];
const TUTORIAL_STORAGE_KEY = 'surv:tutorial:v1';
const TUTORIAL_STEPS: TutorialStepId[] = ['buy-weapon', 'upgrade-weapon', 'buy-cell'];
const SIDE_PANEL_WIDTH = 430;
const SIDE_PANEL_HEIGHT = 500;
const SIDE_PANEL_Y = 342;
const SIDE_PANEL_ROAD_GAP = 18;
const SIDE_PANEL_PAD_X = 28;
const SIDE_PANEL_PAD_TOP = 28;
const SIDE_PANEL_PAD_BOTTOM = 34;
const TERMINAL_UI = {
  panel: 0x101712,
  panelAlt: 0x171a12,
  panelStrong: 0x0b100d,
  stroke: 0x586c4a,
  strokeDim: 0x303a2b,
  accent: 0xd6b85a,
  accentDark: 0x8d7428,
  text: 0xf3ead2,
  muted: 0xaeb89b,
  success: 0x88c56b,
  danger: 0xc44531,
  slot: 0xd5bb91,
  slotLocked: 0x263226,
} as const;

export class GameScene extends Phaser.Scene {
  private state = sharedRunState;
  private activeTab: PrepTab = 'fight';
  private offer: Array<WeaponId | null> = this.state.unlockedWeaponPool;
  private selectedWeapon: WeaponId | null = this.state.unlockedWeaponPool[0] ?? null;
  private selectedArsenalCategory: WeaponCategoryId = 'pistols';
  private selectedArsenalWeapon: WeaponId = 'pistol';
  private activeUpgradesSubTab: UpgradesSubTab = 'weapons';
  private gridMetrics: GridMetrics | null = null;
  private dragState: DragState | null = null;
  private pendingDrag: PendingDragState | null = null;
  private weaponOfferViews: WeaponOfferView[] = [];
  private selectedRotation: WeaponRotation = 0;
  private selectedPlacementId: number | null = null;
  private cheatsOpen = false;
  private selectedCheatEnemyIndex = 0;
  private selectedCheatWeaponIndex = 0;
  private selectedCheatWeaponRotation: WeaponIconRotation = 0;
  private settingsOpen = false;
  private settingsPanel: Phaser.GameObjects.Container | null = null;
  private sellDropZone: SellDropZone | null = null;
  private readonly interactiveObjects = new Set<Phaser.GameObjects.GameObject>();
  private readonly dragStartDistance = 12;
  private weaponUpgradeScrollY = 0;
  private weaponUpgradeScrollMax = 0;
  private weaponUpgradeScrollBounds: Phaser.Geom.Rectangle | null = null;
  private fightPanelRefreshMs = 0;
  private tutorialCompleted = new Set<TutorialStepId>();
  private tutorialOverlay: TutorialOverlayState | null = null;

  constructor() {
    super(SceneKeys.Game);
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('wheel', this.handleWheel, this);
    this.tutorialCompleted = this.loadTutorialCompletion();
    gameplayStart();
    this.showPrep();
  }

  update(_time: number, delta: number): void {
    if (this.activeTab !== 'fight' || this.settingsOpen) return;
    if (this.getTutorialTarget()) return;

    this.fightPanelRefreshMs -= delta;
    if (this.fightPanelRefreshMs > 0) return;

    this.fightPanelRefreshMs = 140;
    this.showPrep();
  }

  shutdown(): void {
    this.input.off('pointerdown', this.handlePointerDown, this);
    this.input.off('wheel', this.handleWheel, this);
    gameplayStop();
  }

  private getScreenTitle(): string {
    return UI_TEXT.screens[this.activeTab];
  }

  private getScreenTitleX(): number {
    if (this.activeTab === 'upgrades' || this.activeTab === 'shop') return this.getSidePanel('right').x;
    return this.getSidePanel('left').x;
  }

  private getSidePanel(side: SidePanelSide): PanelBounds {
    if (side === 'left') {
      const rightEdge = ROAD_BOUNDS.left - SIDE_PANEL_ROAD_GAP;
      return { x: rightEdge - SIDE_PANEL_WIDTH / 2, y: SIDE_PANEL_Y, width: SIDE_PANEL_WIDTH, height: SIDE_PANEL_HEIGHT };
    }

    const leftEdge = ROAD_BOUNDS.right + SIDE_PANEL_ROAD_GAP;
    return { x: leftEdge + SIDE_PANEL_WIDTH / 2, y: SIDE_PANEL_Y, width: SIDE_PANEL_WIDTH, height: SIDE_PANEL_HEIGHT };
  }

  private getLeftPanel(): PanelBounds {
    return this.getSidePanel('left');
  }

  private getRightPanel(): PanelBounds {
    return this.getSidePanel('right');
  }

  private getSupplyPanel(): PanelBounds {
    return this.getSidePanel('right');
  }

  private getPanelContentBounds(panel: PanelBounds): PanelContentBounds {
    const left = panel.x - panel.width / 2 + SIDE_PANEL_PAD_X;
    const right = panel.x + panel.width / 2 - SIDE_PANEL_PAD_X;
    const top = panel.y - panel.height / 2 + SIDE_PANEL_PAD_TOP;
    const bottom = panel.y + panel.height / 2 - SIDE_PANEL_PAD_BOTTOM;

    return {
      left,
      right,
      top,
      bottom,
      width: right - left,
      height: bottom - top,
      centerX: panel.x,
    };
  }

  private showPrep(): void {
    this.clearDragState(false);
    this.destroySettingsPanel();
    this.clearInteractiveObjects();
    this.clearTutorialOverlay(false);
    this.children.removeAll(true);
    this.gridMetrics = null;
    this.weaponOfferViews = [];

    this.drawOverlayPanels();
    this.add
      .text(this.getScreenTitleX(), 78, this.getScreenTitle(), {
        fontFamily: 'Trebuchet MS, Arial, sans-serif',
        fontSize: '27px',
        color: '#f3ead2',
        stroke: '#050805',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    if (this.activeTab === 'fight') {
      this.drawFightTab();
    } else if (this.activeTab === 'equip') {
      this.drawEquipTab();
    } else if (this.activeTab === 'upgrades') {
      this.drawUpgradesTab();
    } else {
      this.drawShopTab();
    }

    this.drawBottomTabs();
    if (this.settingsOpen) {
      this.drawSettingsPanel();
    }
    this.drawTutorialOverlay();
  }

  toggleSettingsPanel(): void {
    this.settingsOpen = !this.settingsOpen;
    if (!this.settingsOpen) {
      this.destroySettingsPanel();
    }
    this.showPrep();
  }

  private drawFightTab(): void {
    this.drawFightStatsPanel();
    this.drawFightWeaponStatusPanel();
  }

  private drawFightStatsPanel(): void {
    const panel = this.getLeftPanel();
    const content = this.getPanelContentBounds(panel);
    const rows: Array<{ label: string; value: string; color: string; currency?: CurrencyKind }> = [
      { label: UI_TEXT.fight.autoRunning, value: '', color: '#d8d3b4' },
      { label: UI_TEXT.stats.kills, value: `${this.state.zombieKills}`, color: '#d6b85a' },
      { label: UI_TEXT.stats.bossKills, value: `${this.state.bossKills}`, color: '#6fb7ff' },
      { label: UI_TEXT.stats.best, value: `${this.state.highestStage}`, color: '#f3ead2' },
      { label: UI_TEXT.stats.cells, value: `${this.state.activeCells}`, color: '#f3ead2' },
      { label: UI_TEXT.stats.mounted, value: `${this.state.equippedWeaponIds.length}`, color: '#f3ead2' },
      { label: UI_TEXT.stats.dps, value: `${Math.round(this.state.equippedDps)}`, color: '#d6b85a' },
    ];

    rows.forEach(({ label, value, color, currency }, index) => {
      const y = content.top + 8 + index * 42;
      this.add.rectangle(content.centerX, y, content.width, 32, index === 0 ? 0x152015 : 0x0b100d, 0.82).setStrokeStyle(1, TERMINAL_UI.strokeDim, 0.72);
      if (value === '') {
        this.createFittedText(content.centerX, y, label, content.width - 28, 16, color);
        return;
      }

      if (currency) {
        createCurrencyValue(this, content.left + 18, y, '', currency, { maxWidth: 90, fontSize: 16, iconSize: 22, originX: 0 });
      } else {
        this.createFittedText(content.left + 18, y, label, 160, 15, '#aeb89b', 0);
      }
      this.createFittedText(content.right - 18, y, value, 120, 18, color, 1);
    });
  }

  private drawFightWeaponStatusPanel(): void {
    const panel = this.getRightPanel();
    const content = this.getPanelContentBounds(panel);
    const placements = this.state.placedWeapons;

    this.createFittedText(content.left, content.top, 'Оружие на бункере', content.width, 22, '#f3ead2', 0);
    this.add.rectangle(content.centerX, content.top + 24, content.width, 1, TERMINAL_UI.accent, 0.44);

    const bunkerTop = content.top + 48;
    const bunkerHeight = 142;
    this.drawFightStatusBunker(content, bunkerTop, bunkerHeight, placements);

    if (placements.length === 0) {
      this.createFittedText(content.centerX, bunkerTop + bunkerHeight + 52, 'Поставь оружие на сетку', content.width - 40, 18, '#aeb89b');
      return;
    }

    const columns = placements.length === 1 ? 1 : 2;
    const gap = 8;
    const cardsTop = bunkerTop + bunkerHeight + 14;
    const cardWidth = Math.floor((content.width - gap * (columns - 1)) / columns);
    const rows = Math.ceil(placements.length / columns);
    const availableHeight = content.bottom - cardsTop;
    const cardHeight = Phaser.Math.Clamp(Math.floor((availableHeight - gap * (rows - 1)) / rows), 56, placements.length <= 2 ? 112 : 92);

    placements.forEach((placement, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = content.left + cardWidth / 2 + col * (cardWidth + gap);
      const y = cardsTop + cardHeight / 2 + row * (cardHeight + gap);
      this.drawFightStatusWeaponCard(x, y, cardWidth, cardHeight, placement);
    });
  }

  private drawFightStatusBunker(content: PanelContentBounds, top: number, height: number, placements: readonly PlacedWeapon[]): void {
    const x = content.centerX;
    const y = top + height / 2;
    const width = content.width;

    this.add.rectangle(x, y, width, height, 0x0b100d, 0.78).setStrokeStyle(2, TERMINAL_UI.strokeDim, 0.76);
    this.add.rectangle(x, top + 44, width - 72, 74, 0x263037, 0.32).setStrokeStyle(1, TERMINAL_UI.strokeDim, 0.56);

    for (let index = 1; index < this.state.gridCols; index += 1) {
      const lineX = content.left + 36 + ((width - 72) * index) / this.state.gridCols;
      this.add.line(0, 0, lineX, top + 9, lineX, top + 79, 0xd8d3b4, 0.1).setOrigin(0).setLineWidth(1);
    }

    const bunkerY = top + height - 34;
    this.add.rectangle(x, bunkerY + 13, width - 42, 28, 0x33403b, 0.94).setStrokeStyle(1, TERMINAL_UI.stroke, 0.78);
    this.add.rectangle(x, bunkerY - 2, width - 82, 26, 0x53625a, 0.32).setStrokeStyle(1, TERMINAL_UI.strokeDim, 0.52);
    this.add.rectangle(x - 86, bunkerY + 4, 58, 24, 0x5f5948, 0.46);
    this.add.rectangle(x + 84, bunkerY + 4, 58, 24, 0x5f5948, 0.46);
    this.add.rectangle(x, bunkerY + 3, 54, 32, 0x20251f, 0.72).setStrokeStyle(1, TERMINAL_UI.accent, 0.32);

    placements.forEach((placement) => this.drawFightStatusBunkerWeapon(content, top, height, placement));
  }

  private drawFightStatusBunkerWeapon(content: PanelContentBounds, top: number, height: number, placement: PlacedWeapon): void {
    const mount = getBunkerWeaponMount(placement, { cols: this.state.gridCols, rows: this.state.gridRows }, { width: this.scale.width, height: this.scale.height });
    const bunkerLeft = ROAD_BOUNDS.left + 42;
    const bunkerRight = ROAD_BOUNDS.right - 42;
    const mountT = Phaser.Math.Clamp((mount.x - bunkerLeft) / Math.max(1, bunkerRight - bunkerLeft), 0, 1);
    const shape = getWeaponShape(placement.weaponId, placement.rotation);
    const maxRow = Math.max(...shape.map((cell) => cell.row));
    const centerRow = placement.row + (maxRow + 1) / 2;
    const rowT = Phaser.Math.Clamp(centerRow / Math.max(1, this.state.gridRows), 0, 1);
    const x = content.left + 36 + (content.width - 72) * mountT;
    const y = top + height - 54 - rowT * 38;

    this.add.line(0, 0, x, y + 12, x, top + height - 22, TERMINAL_UI.accent, 0.28).setOrigin(0).setLineWidth(2);
    this.drawWeaponIcon(x, y, placement.weaponId, 58, 42, placement.rotation, { scaleBoost: 1.16 }).setDepth(4);
  }

  private drawFightStatusWeaponCard(x: number, y: number, width: number, height: number, placement: PlacedWeapon): void {
    const progress = this.state.getWeaponProgress(placement.weaponId);
    const stats = getWeaponComputedStats(placement.weaponId, progress);
    const runtime = this.getBattleWeaponRuntime(placement.id);
    const top = y - height / 2;
    const left = x - width / 2;
    const right = x + width / 2;

    this.add.rectangle(x, y, width, height, 0x10120f, 0.82).setStrokeStyle(1, TERMINAL_UI.strokeDim, 0.76);
    this.add.rectangle(x, top + 7, width - 12, 2, TERMINAL_UI.accent, 0.24);

    const iconMaxWidth = Math.min(92, width * 0.42);
    const iconMaxHeight = Math.max(42, height - 30);
    this.drawWeaponIcon(left + iconMaxWidth / 2 + 10, y - 2, placement.weaponId, iconMaxWidth, iconMaxHeight, placement.rotation, { scaleBoost: 1.26 });

    const statusLeft = left + iconMaxWidth + 20;
    const statusWidth = Math.max(54, right - statusLeft - 12);
    const primaryY = top + height * 0.42;
    const secondaryY = top + height - 18;

    if (placement.weaponId === 'tesla') {
      const overheatMs = runtime?.overheatMs ?? 0;
      this.drawFightTeslaHeatMeter(statusLeft, primaryY, statusWidth, runtime);
      this.drawFightCooldownMeter(statusLeft, secondaryY, statusWidth, overheatMs > 0 ? overheatMs : runtime?.shotCooldownMs ?? 0, overheatMs > 0 ? 2200 : stats.cooldownMs, overheatMs > 0 ? 0xc44531 : TERMINAL_UI.accent);
      return;
    }

    const ammo = runtime?.ammo ?? stats.magazineSize;
    const magazineSize = runtime?.magazineSize ?? stats.magazineSize;
    const reloadMs = runtime?.reloadMs ?? 0;
    this.drawFightMagazineMeter(statusLeft, primaryY, statusWidth, ammo, magazineSize, reloadMs > 0);
    this.drawFightCooldownMeter(statusLeft, secondaryY, statusWidth, reloadMs > 0 ? reloadMs : runtime?.shotCooldownMs ?? 0, reloadMs > 0 ? runtime?.reloadDurationMs ?? stats.reloadMs : stats.cooldownMs, reloadMs > 0 ? 0x8fbf63 : TERMINAL_UI.accent);
  }

  private drawFightMagazineMeter(left: number, y: number, width: number, ammo: number, magazineSize: number, reloading: boolean): void {
    const segments = Math.min(14, Math.max(1, magazineSize));
    const gap = 2;
    const segmentWidth = Math.max(3, Math.floor((width - gap * (segments - 1)) / segments));
    const shownAmmo = Math.round((Phaser.Math.Clamp(ammo, 0, magazineSize) / Math.max(1, magazineSize)) * segments);

    for (let index = 0; index < segments; index += 1) {
      const filled = index < shownAmmo;
      const color = reloading ? 0x53625a : filled ? TERMINAL_UI.accent : 0x050805;
      const alpha = reloading ? 0.7 : filled ? 0.95 : 0.72;
      this.add.rectangle(left + index * (segmentWidth + gap), y, segmentWidth, 9, color, alpha).setOrigin(0, 0.5).setStrokeStyle(1, filled ? 0xf1d37a : TERMINAL_UI.strokeDim, 0.38);
    }
  }

  private drawFightCooldownMeter(left: number, y: number, width: number, remainingMs: number, totalMs: number, color: number): void {
    const progress = totalMs <= 0 ? 1 : 1 - Phaser.Math.Clamp(remainingMs / totalMs, 0, 1);
    this.add.rectangle(left, y, width, 9, 0x050805, 0.86).setOrigin(0, 0.5).setStrokeStyle(1, TERMINAL_UI.strokeDim, 0.72);
    this.add.rectangle(left, y, Math.max(2, width * progress), 9, color, 0.94).setOrigin(0, 0.5);
  }

  private drawFightTeslaHeatMeter(left: number, y: number, width: number, runtime: BattleWeaponRuntimeSnapshot | null): void {
    const heat = runtime?.heat ?? 0;
    const overheat = (runtime?.overheatMs ?? 0) > 0;
    const color = overheat ? 0xc44531 : heat > 0.72 ? 0xd6b85a : 0x3dd8ff;
    this.add.rectangle(left, y, width, 10, 0x06171b, 0.92).setOrigin(0, 0.5).setStrokeStyle(1, color, 0.62);
    this.add.rectangle(left, y, Math.max(2, width * Phaser.Math.Clamp(heat, 0, 1)), 10, color, 0.86).setOrigin(0, 0.5);
    this.add.rectangle(left + width - 7, y, 8, 10, 0xc44531, 0.72).setOrigin(0, 0.5);
  }

  private getBattleWeaponRuntime(placementId: number): BattleWeaponRuntimeSnapshot | null {
    const snapshot = this.registry.get(BATTLE_SNAPSHOT_REGISTRY_KEY) as BattleSnapshot | undefined;
    return snapshot?.weapons.find((weapon) => weapon.id === placementId) ?? null;
  }

  private drawFightWeaponCardsPanel(): void {
    const panel = this.getRightPanel();
    const content = this.getPanelContentBounds(panel);
    const placements = this.state.placedWeapons;

    this.createFittedText(content.left, content.top, 'Оружие на бункере', content.width, 22, '#f3ead2', 0);
    this.add.rectangle(content.centerX, content.top + 24, content.width, 1, TERMINAL_UI.accent, 0.44);

    if (placements.length === 0) {
      this.createFittedText(content.centerX, content.top + 172, 'Поставь оружие на сетку', content.width - 40, 18, '#aeb89b');
      return;
    }

    const columns = 2;
    const gap = 10;
    const gridTop = content.top + 48;
    const cardWidth = Math.floor((content.width - gap) / columns);
    const rows = Math.ceil(placements.length / columns);
    const availableHeight = content.bottom - gridTop - 4;
    const cardHeight = Phaser.Math.Clamp(Math.floor((availableHeight - gap * (rows - 1)) / rows), 74, 118);

    placements.forEach((placement, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = content.left + cardWidth / 2 + col * (cardWidth + gap);
      const y = gridTop + cardHeight / 2 + row * (cardHeight + gap);
      this.drawFightWeaponCard(x, y, cardWidth, cardHeight, placement);
    });
  }

  private drawFightWeaponCard(x: number, y: number, width: number, height: number, placement: PlacedWeapon): void {
    const progress = this.state.getWeaponProgress(placement.weaponId);
    const stats = getWeaponComputedStats(placement.weaponId, progress);
    const top = y - height / 2;
    const left = x - width / 2;

    this.add.rectangle(x, y, width, height, 0x10120f, 0.82).setStrokeStyle(1, TERMINAL_UI.strokeDim, 0.76);
    const bunkerY = top + Math.max(44, height * 0.55);
    const bunkerWidth = width - 24;
    this.add.rectangle(x, bunkerY + 13, bunkerWidth, 18, 0x33403b, 0.92).setStrokeStyle(1, TERMINAL_UI.stroke, 0.68);
    this.add.rectangle(x, bunkerY - 10, bunkerWidth, 28, 0x29343a, 0.34).setStrokeStyle(1, TERMINAL_UI.strokeDim, 0.5);

    const mount = getBunkerWeaponMount(placement, { cols: this.state.gridCols, rows: this.state.gridRows }, { width: this.scale.width, height: this.scale.height });
    const bunkerLeft = ROAD_BOUNDS.left + 42;
    const bunkerRight = ROAD_BOUNDS.right - 42;
    const mountT = Phaser.Math.Clamp((mount.x - bunkerLeft) / Math.max(1, bunkerRight - bunkerLeft), 0, 1);
    const muzzleX = left + 14 + (width - 28) * mountT;
    this.add.line(0, 0, muzzleX, bunkerY - 18, muzzleX, bunkerY + 2, TERMINAL_UI.accent, 0.35).setOrigin(0).setLineWidth(1);
    this.drawWeaponIcon(muzzleX, bunkerY - 1, placement.weaponId, 40, 26, placement.rotation);

    const barY = top + height - 12;
    const barWidth = width - 24;
    if (placement.weaponId === 'tesla') {
      this.drawTeslaHeatPreview(x, barY, barWidth);
      return;
    }

    this.drawMagazinePreview(x, barY, barWidth, stats.magazineSize);
    return;
    const cooldownSeconds = 0;
    this.createFittedText(left + 10, barY - 14, `КД ${cooldownSeconds.toFixed(1)}с`, 84, 11, '#aeb89b', 0);
  }

  private drawMagazinePreview(x: number, y: number, width: number, magazineSize: number): void {
    const segments = Math.min(12, Math.max(1, magazineSize));
    const gap = 2;
    const segmentWidth = Math.max(3, Math.floor((width - gap * (segments - 1)) / segments));
    const totalWidth = segments * segmentWidth + (segments - 1) * gap;
    const startX = x - totalWidth / 2 + segmentWidth / 2;

    for (let index = 0; index < segments; index += 1) {
      this.add.rectangle(startX + index * (segmentWidth + gap), y, segmentWidth, 8, TERMINAL_UI.accent, 0.92).setStrokeStyle(1, 0xf1d37a, 0.38);
    }
  }

  private drawTeslaHeatPreview(x: number, y: number, width: number): void {
    this.add.rectangle(x, y, width, 8, 0x06171b, 0.92).setStrokeStyle(1, 0x3dd8ff, 0.6);
    this.add.rectangle(x - width / 2, y, width * 0.42, 8, 0x3dd8ff, 0.86).setOrigin(0, 0.5);
    this.add.rectangle(x + width / 2 - 6, y, 10, 8, 0xc44531, 0.78);
  }

  private drawFightLoadoutPanel(): void {
    const panel = this.getRightPanel();
    const content = this.getPanelContentBounds(panel);
    const placements = this.state.placedWeapons;

    this.createFittedText(content.left, content.top, 'Оружейная схема', content.width, 22, '#f3ead2', 0);
    this.add.rectangle(content.centerX, content.top + 24, content.width, 1, TERMINAL_UI.accent, 0.44);

    const mapTop = content.top + 48;
    const mapHeight = 122;
    this.add.rectangle(content.centerX, mapTop + mapHeight / 2, content.width, mapHeight, 0x0b100d, 0.74).setStrokeStyle(2, TERMINAL_UI.strokeDim, 0.72);
    this.add.rectangle(content.centerX, mapTop + mapHeight - 24, content.width - 32, 28, 0x33403b, 0.9).setStrokeStyle(1, TERMINAL_UI.stroke, 0.7);
    this.add.rectangle(content.centerX, mapTop + 34, content.width - 74, 92, 0x29343a, 0.42).setStrokeStyle(1, TERMINAL_UI.strokeDim, 0.6);
    this.add.rectangle(content.centerX, mapTop + 34, 2, 92, 0xd8d3b4, 0.22);
    this.add.rectangle(content.centerX - 54, mapTop + 34, 2, 92, 0xd8d3b4, 0.14);
    this.add.rectangle(content.centerX + 54, mapTop + 34, 2, 92, 0xd8d3b4, 0.14);
    this.createFittedText(content.left + 18, mapTop + mapHeight - 24, 'Бункер / точки вылета', content.width - 36, 13, '#aeb89b', 0);

    placements.forEach((placement) => this.drawFightWeaponMount(content, mapTop, mapHeight, placement));

    this.createFittedText(content.left, mapTop + mapHeight + 44, 'КД оружия', content.width, 18, '#d8d3b4', 0);
    this.add.rectangle(content.centerX, mapTop + mapHeight + 64, content.width, 1, TERMINAL_UI.strokeDim, 0.72);
    placements.slice(0, 5).forEach((placement, index) => this.drawFightWeaponCooldownRow(content, mapTop + mapHeight + 96 + index * 44, placement));
  }

  private drawFightWeaponMount(content: PanelContentBounds, mapTop: number, mapHeight: number, placement: PlacedWeapon): void {
    const mount = getBunkerWeaponMount(placement, { cols: this.state.gridCols, rows: this.state.gridRows }, { width: this.scale.width, height: this.scale.height });
    const bunkerLeft = ROAD_BOUNDS.left + 42;
    const bunkerRight = ROAD_BOUNDS.right - 42;
    const t = Phaser.Math.Clamp((mount.x - bunkerLeft) / Math.max(1, bunkerRight - bunkerLeft), 0, 1);
    const shape = getWeaponShape(placement.weaponId, placement.rotation);
    const maxRow = Math.max(...shape.map((cell) => cell.row));
    const centerRow = placement.row + (maxRow + 1) / 2;
    const rowT = Phaser.Math.Clamp(centerRow / Math.max(1, this.state.gridRows), 0, 1);
    const x = content.left + 34 + (content.width - 68) * t;
    const y = mapTop + mapHeight - 42 + (rowT - 0.5) * 28;

    this.add.circle(x, y, 17, 0x0b100d, 0.88).setStrokeStyle(1, TERMINAL_UI.accent, 0.82);
    const icon = this.drawWeaponIcon(x, y, placement.weaponId, 42, 32, placement.rotation);
    icon.setDepth(3);
    this.add.line(0, 0, x, y - 18, x, mapTop + 36, TERMINAL_UI.accent, 0.34).setOrigin(0).setLineWidth(2);
  }

  private drawFightWeaponCooldownRow(content: PanelContentBounds, y: number, placement: PlacedWeapon): void {
    const weapon = WEAPONS[placement.weaponId];
    const progress = this.state.getWeaponProgress(placement.weaponId);
    const stats = getWeaponComputedStats(placement.weaponId, progress);
    const dps = getWeaponDps(placement.weaponId, progress);
    const cooldownSeconds = stats.cooldownMs / 1000;
    const cooldownT = Phaser.Math.Clamp((cooldownSeconds - 0.45) / 3.2, 0.08, 1);
    const barWidth = 86;

    this.add.rectangle(content.centerX, y, content.width, 34, 0x10120f, 0.76).setStrokeStyle(1, TERMINAL_UI.strokeDim, 0.62);
    this.drawWeaponIcon(content.left + 24, y, placement.weaponId, 34, 24, placement.rotation);
    this.createFittedText(content.left + 52, y - 7, weapon.name, 146, 13, '#f3ead2', 0);
    this.createFittedText(content.left + 52, y + 9, `КД ${cooldownSeconds.toFixed(1)}с`, 94, 12, '#aeb89b', 0);
    this.add.rectangle(content.right - 116, y + 8, barWidth, 7, 0x050805, 0.8).setStrokeStyle(1, TERMINAL_UI.strokeDim, 0.7);
    this.add.rectangle(content.right - 116 - barWidth / 2, y + 8, barWidth * cooldownT, 7, TERMINAL_UI.accent, 0.92).setOrigin(0, 0.5);
    this.createFittedText(content.right - 18, y - 5, `${UI_TEXT.stats.dps} ${Math.round(dps)}`, 92, 12, '#d6b85a', 1);
  }

  private drawEquipTab(): void {
    this.drawEquipSummary();
    this.drawLoadoutGrid();
    this.drawGridCellPurchaseButton();
    this.drawWeaponOffer();
  }

  private drawEquipSummary(): void {
    const panel = this.getLeftPanel();
    const content = this.getPanelContentBounds(panel);
    const activeCells = `${this.state.activeCells}/${this.state.maxGridCols * this.state.maxGridRows}`;

    this.add
      .text(content.centerX, content.top - 8, `${UI_TEXT.stats.mounted} ${this.state.equippedWeaponIds.length}   ${UI_TEXT.stats.dps} ${Math.round(this.state.equippedDps)}   ${UI_TEXT.stats.cells} ${activeCells}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        color: '#d8d3b4',
        backgroundColor: '#0b100dcc',
        padding: { left: 8, right: 8, top: 3, bottom: 3 },
      })
      .setOrigin(0.5);
  }

  private drawUpgradesTab(): void {
    this.drawUpgradesSubTabs();
    if (this.activeUpgradesSubTab === 'base') {
      this.drawBaseUpgradesTab();
      return;
    }

    this.drawArsenalList();
    this.drawSelectedArsenalWeapon();
  }

  private drawUpgradesSubTabs(): void {
    const panel = this.getLeftPanel();
    const y = panel.y - panel.height / 2 + 20;
    const tabWidth = 128;
    const gap = 8;
    const tabs: Array<{ id: UpgradesSubTab; label: string }> = [
      { id: 'weapons', label: UI_TEXT.upgrades.weaponsTitle },
      { id: 'base', label: UI_TEXT.upgrades.baseTitle },
    ];

    tabs.forEach((tab, index) => {
      const x = panel.x - tabWidth / 2 - gap / 2 + index * (tabWidth + gap);
      this.createSegmentTab(x, y, tabWidth, tab.label, this.activeUpgradesSubTab === tab.id, () => {
        this.activeUpgradesSubTab = tab.id;
        this.showPrep();
      });
    });
  }

  private drawBaseUpgradesTab(): void {
    const left = this.getPanelContentBounds(this.getLeftPanel());
    const right = this.getPanelContentBounds(this.getRightPanel());

    this.createFittedText(left.left, left.top + 42, UI_TEXT.upgrades.baseTitle, left.width, 24, '#f3ead2', 0);
    this.add.rectangle(left.centerX, left.top + 72, left.width, 1, TERMINAL_UI.accent, 0.44);
    this.createFittedText(left.left + 18, left.top + 118, `${UI_TEXT.upgrades.durability}: ${this.state.maxBunkerHp}`, left.width - 36, 20, '#88c56b', 0);
    this.createFittedText(
      left.left + 18,
      left.top + 154,
      `${UI_TEXT.upgrades.armor}: ${this.state.baseArmor} (${Math.round(getArmorDamageReduction(this.state.baseArmor, this.state.currentStage) * 100)}%)`,
      left.width - 36,
      20,
      '#d6b85a',
      0,
    );
    this.createFittedText(
      left.left + 18,
      left.top + 190,
      `${UI_TEXT.upgrades.emergencyRepair}: ${this.state.emergencyRepairLevel}/5 (+${getEmergencyRepairHeal(this.state.maxBunkerHp, this.state.emergencyRepairLevel)} HP)`,
      left.width - 36,
      20,
      '#6fb7ff',
      0,
    );
    this.createFittedText(
      left.left + 18,
      left.top + 238,
      'Base upgrades help zombies reach the bunker without making early fights instantly fatal.',
      left.width - 36,
      15,
      '#aeb89b',
      0,
    ).setWordWrapWidth(left.width - 36);

    this.createFittedText(right.left, right.top + 42, UI_TEXT.upgrades.baseTitle, right.width, 24, '#f3ead2', 0);
    this.add.rectangle(right.centerX, right.top + 72, right.width, 1, TERMINAL_UI.accent, 0.44);
    this.drawBaseUpgradeRow(
      right.centerX,
      right.top + 126,
      right.width,
      UI_TEXT.upgrades.durability,
      '+20 HP',
      `HP ${this.state.maxBunkerHp}`,
      this.state.getBunkerHpCost(),
      () => this.buyBaseUpgrade('hp'),
    );
    this.drawBaseUpgradeRow(
      right.centerX,
      right.top + 186,
      right.width,
      UI_TEXT.upgrades.armor,
      UI_TEXT.upgrades.armorEffect(this.state.baseArmorLevel + 1),
      `${UI_TEXT.upgrades.level} ${this.state.baseArmorLevel}/20`,
      this.state.getBaseArmorCost(),
      () => this.buyBaseUpgrade('armor'),
    );
    this.drawBaseUpgradeRow(
      right.centerX,
      right.top + 246,
      right.width,
      UI_TEXT.upgrades.emergencyRepair,
      UI_TEXT.upgrades.emergencyRepairEffect(this.state.emergencyRepairLevel + 1),
      `${UI_TEXT.upgrades.level} ${this.state.emergencyRepairLevel}/5`,
      this.state.getEmergencyRepairCost(),
      () => this.buyBaseUpgrade('emergency'),
    );
  }

  private drawBaseUpgradeRow(
    x: number,
    y: number,
    width: number,
    label: string,
    effect: string,
    level: string,
    cost: number | null,
    onClick: () => void,
  ): void {
    const maxed = cost === null;
    const affordable = cost !== null && this.state.soft >= cost;
    this.drawWeaponUpgradeRow(x, y, width, label, effect, level, maxed ? UI_TEXT.upgrades.max : `${cost}`, affordable, maxed, onClick);
  }

  private buyBaseUpgrade(kind: 'hp' | 'armor' | 'emergency'): void {
    const bought =
      kind === 'hp'
        ? this.state.buyBunkerHp()
        : kind === 'armor'
          ? this.state.buyBaseArmor()
          : this.state.buyEmergencyRepair();
    if (bought) saveRunProgress(this.state);
    this.showPrep();
    this.flashHint(bought ? UI_TEXT.messages.upgradeBought : UI_TEXT.messages.upgradeUnavailable);
  }

  private drawGlobalUpgradeStrip(): void {
    const panel = this.getLeftPanel();

    this.createFittedText(panel.x - panel.width / 2 + 26, 112, UI_TEXT.upgrades.baseTitle, 180, 18, '#f3ead2', 0);
    this.add.rectangle(panel.x + 76, 112, panel.width - 210, 1, TERMINAL_UI.accent, 0.44);

    this.createBaseUpgradeChip(panel.x - 140, 154, UI_TEXT.upgrades.durability, this.state.getBunkerHpCost(), () => this.tryUpgrade('hp'));
    this.createBaseUpgradeChip(panel.x, 154, UI_TEXT.upgrades.cell, this.state.getNextGridCellCost(), () => this.tryUpgrade('cell'));
    this.createBaseUpgradeChip(panel.x + 140, 154, UI_TEXT.upgrades.rareRoll, this.state.getRareChanceCost(), () => this.tryUpgrade('rare'));
  }

  private drawArsenalList(): void {
    const panel = this.getLeftPanel();
    const content = this.getPanelContentBounds(panel);
    const tabY = content.top + 26;
    const tabGap = 4;
    const tabWidth = Math.floor((content.width - tabGap * (WEAPON_CATEGORIES.length - 1)) / WEAPON_CATEGORIES.length);

    WEAPON_CATEGORIES.forEach((category, index) => {
      const x = content.left + tabWidth / 2 + index * (tabWidth + tabGap);
      const active = this.selectedArsenalCategory === category.id;
      this.createSegmentTab(x, tabY, tabWidth, UI_TEXT.weaponCategories[category.id], active, () => {
        this.selectedArsenalCategory = category.id;
        this.selectedArsenalWeapon = this.getFirstWeaponInCategory(category.id);
        this.weaponUpgradeScrollY = 0;
        this.showPrep();
      });
    });

    const weapons = this.getWeaponsInCategory(this.selectedArsenalCategory);
    weapons.forEach((weaponId, index) => {
      const weapon = WEAPONS[weaponId];
      const progress = this.state.getWeaponProgress(weaponId);
      const selected = this.selectedArsenalWeapon === weaponId;
      const y = content.top + 88 + index * 70;
      const fill = selected ? 0x26331f : progress.unlocked ? 0x111811 : 0x0b0f0c;
      const stroke = selected ? TERMINAL_UI.accent : progress.unlocked ? TERMINAL_UI.stroke : 0x5b3530;

      this.add.rectangle(content.centerX, y, content.width, 60, fill, 0.98).setStrokeStyle(selected ? 3 : 2, stroke);
      this.drawArsenalWeaponIcon(content.left + 70, y, weaponId, 104, 38);
      this.createFittedText(content.left + 136, y - 11, weapon.name, content.width - 168, 16, progress.unlocked ? '#f3ead2' : '#9f8176', 0);
      if (progress.unlocked) {
        this.createFittedText(
          content.left + 136,
          y + 13,
          `${UI_TEXT.upgrades.level} ${getWeaponTotalLevel(progress)}   ${UI_TEXT.stats.dps} ${Math.round(getWeaponDps(weaponId, progress))}`,
          content.width - 168,
          13,
          '#aeb89b',
          0,
        );
      } else {
        this.createCurrencyLine(content.left + 136, y + 13, UI_TEXT.upgrades.unlock, weapon.unlockCost.amount, weapon.unlockCost.currency, content.width - 168, 13, '#d58c7e');
      }

      this.registerInteractive(this.add
        .zone(content.centerX, y, content.width, 60)
        .setInteractive({ useHandCursor: true }))
        .on('pointerdown', () => {
          if (this.selectedArsenalWeapon !== weaponId) {
            this.weaponUpgradeScrollY = 0;
          }
          this.selectedArsenalWeapon = weaponId;
          this.showPrep();
        });
    });
  }

  private drawSelectedArsenalWeapon(): void {
    const panel = this.getRightPanel();
    const content = this.getPanelContentBounds(panel);
    const weaponId = this.selectedArsenalWeapon;
    const weapon = WEAPONS[weaponId];
    const progress = this.state.getWeaponProgress(weaponId);
    const stats = getWeaponComputedStats(weaponId, progress);
    const dps = getWeaponDps(weaponId, progress);

    this.createFittedText(content.left, content.top, weapon.name, content.width, 25, '#f3ead2', 0);
    this.add.rectangle(content.centerX, content.top + 24, content.width, 1, TERMINAL_UI.accent, 0.44);

    this.add.rectangle(content.left + 66, content.top + 82, 132, 92, 0x050805, 0.26).setStrokeStyle(1, TERMINAL_UI.strokeDim, 0.8);
    this.drawArsenalWeaponIcon(content.left + 66, content.top + 82, weaponId, 112, 64);
    this.createFittedText(content.left + 160, content.top + 54, progress.unlocked ? UI_TEXT.upgrades.owned : UI_TEXT.upgrades.locked, 160, 15, progress.unlocked ? '#88c56b' : '#d58c7e', 0);
    this.createFittedText(content.left + 160, content.top + 79, `${UI_TEXT.upgrades.totalLevel} ${getWeaponTotalLevel(progress)}`, 160, 18, '#f3ead2', 0);
    this.createFittedText(content.left + 160, content.top + 104, `${UI_TEXT.stats.dps} ${dps.toFixed(1)}`, 160, 16, '#d6b85a', 0);

    this.drawWeaponStatPill(content.left + 42, content.top + 154, `${UI_TEXT.stats.damageShort} ${stats.damage}`);
    this.drawWeaponStatPill(content.left + 136, content.top + 154, `${UI_TEXT.stats.rateShort} ${(1000 / stats.cooldownMs).toFixed(1)}/s`);
    this.drawWeaponStatPill(content.left + 242, content.top + 154, `${UI_TEXT.stats.shotsShort} ${stats.spread}`);
    this.drawWeaponStatPill(content.right - 42, content.top + 154, `${UI_TEXT.stats.rangeShort} ${stats.rangePx}`);

    if (!progress.unlocked) {
      const affordable = this.state.canAffordUnlock(weaponId);
      this.createCurrencyButton(content.centerX, content.top + 240, 230, 46, UI_TEXT.upgrades.unlock, weapon.unlockCost.amount, weapon.unlockCost.currency, affordable ? 0x4a743c : 0x4d302c, () => {
        if (!this.state.unlockWeapon(weaponId)) {
        this.flashHint(weapon.unlockCost.currency === 'hard' ? UI_TEXT.messages.notEnoughHard : UI_TEXT.messages.notEnoughSoft);
        return;
        }
        this.selectFirstAvailableOffer();
        saveRunProgress(this.state);
        this.showPrep();
        this.flashHint(`${weapon.name}: ${UI_TEXT.upgrades.owned}`);
      });
      return;
    }

    const listTop = content.top + 194;
    const viewportHeight = Math.max(94, content.bottom - listTop - 4);
    const rowSpacing = 50;
    const rowHeight = 42;
    const contentHeight = weapon.upgradeStats.length === 0 ? 0 : rowHeight + (weapon.upgradeStats.length - 1) * rowSpacing;
    this.weaponUpgradeScrollMax = Math.max(0, contentHeight - viewportHeight);
    this.weaponUpgradeScrollY = Phaser.Math.Clamp(this.weaponUpgradeScrollY, 0, this.weaponUpgradeScrollMax);
    this.weaponUpgradeScrollBounds = new Phaser.Geom.Rectangle(content.left, listTop, content.width, viewportHeight);

    const listMaskShape = this.add.graphics();
    listMaskShape.fillStyle(0xffffff, 1);
    listMaskShape.fillRect(content.left, listTop - 2, content.width, viewportHeight + 4);
    listMaskShape.setVisible(false);

    const listContainer = this.add.container(0, listTop - this.weaponUpgradeScrollY);
    listContainer.setMask(listMaskShape.createGeometryMask());

    weapon.upgradeStats.forEach((stat, index) => {
      const y = 21 + index * rowSpacing;
      const level = progress.stats[stat.id];
      const cost = this.state.getWeaponStatUpgradeCost(weaponId, stat.id);
      const maxed = cost === null;
      const affordable = cost !== null && this.state.soft >= cost;

      this.drawWeaponUpgradeRow(
        panel.x,
        y,
        content.width,
        this.getWeaponStatLabel(stat.id),
        this.getWeaponStatEffectLabel(weaponId, stat.id, level),
        `${UI_TEXT.upgrades.level} ${level}/${stat.maxLevel}`,
        maxed ? UI_TEXT.upgrades.max : `${cost}`,
        affordable,
        maxed,
        () => {
          if (!this.state.upgradeWeaponStat(weaponId, stat.id)) {
            this.flashHint(UI_TEXT.messages.upgradeUnavailable);
            return;
          }
          this.completeTutorialStep('upgrade-weapon');
          saveRunProgress(this.state);
          this.showPrep();
          this.flashHint(`${this.getWeaponStatLabel(stat.id)} ${UI_TEXT.upgrades.upgraded}`);
        },
        listContainer,
      );
    });

    this.drawWeaponUpgradeScrollbar(content.right - 4, listTop, viewportHeight);
  }

  private getWeaponsInCategory(categoryId: WeaponCategoryId): WeaponId[] {
    return (Object.keys(WEAPONS) as WeaponId[]).filter((weaponId) => weaponId !== 'starter_pistol' && WEAPONS[weaponId].category === categoryId);
  }

  private getFirstWeaponInCategory(categoryId: WeaponCategoryId): WeaponId {
    return this.getWeaponsInCategory(categoryId)[0] ?? 'pistol';
  }

  private getWeaponStatEffectLabel(weaponId: WeaponId, statId: WeaponUpgradeStatId, level: number): string {
    if (statId === 'special') return getWeaponSpecialEffectLabel(weaponId, level);
    return UI_TEXT.upgrades.statEffects[statId](level);
  }

  private getWeaponStatLabel(statId: WeaponUpgradeStatId): string {
    return UI_TEXT.weaponStats[statId];
  }

  private getArsenalIconRotation(weaponId: WeaponId): WeaponRotation {
    return 0;
  }

  private drawArsenalWeaponIcon(x: number, y: number, weaponId: WeaponId, maxWidth: number, maxHeight: number): Phaser.GameObjects.Container {
    const boundsBoost = weaponId === 'tesla' ? 1.28 : 1;
    return this.drawWeaponIcon(x, y, weaponId, maxWidth * boundsBoost, maxHeight * boundsBoost, this.getArsenalIconRotation(weaponId));
  }

  private drawShopTab(): void {
    const panel = this.getRightPanel();
    const content = this.getPanelContentBounds(panel);

    this.add
      .text(content.centerX, content.top + 134, UI_TEXT.screens.shop, {
        fontFamily: 'Trebuchet MS, Arial, sans-serif',
        fontSize: '30px',
        color: '#f3ead2',
        stroke: '#050805',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.add
      .text(content.centerX, content.top + 214, UI_TEXT.shop.comingSoon, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#d8d3b4',
        align: 'center',
        wordWrap: { width: content.width },
      })
      .setOrigin(0.5);
  }

  private drawLoadoutGrid(): void {
    const panel = this.getLeftPanel();
    const content = this.getPanelContentBounds(panel);
    const gap = 6;
    const cols = this.state.gridCols;
    const rows = this.state.gridRows;
    const startY = content.top + 34;
    const availableWidth = content.width;
    const availableHeight = content.bottom - startY - 74;
    const gridBoxSize = Math.floor(Math.min(availableWidth, availableHeight));
    const slotSize = Math.max(16, Math.floor(Math.min((gridBoxSize - gap * (cols - 1)) / cols, (gridBoxSize - gap * (rows - 1)) / rows)));
    const slotWidth = slotSize;
    const slotHeight = slotSize;
    const pitch = slotSize + gap;
    const pitchX = pitch;
    const pitchY = pitch;
    const gridWidth = pitchX * cols - gap;
    const gridHeight = pitchY * rows - gap;
    const startX = panel.x - gridWidth / 2;
    const gridCenterY = startY + gridBoxSize / 2;
    const gridStartY = gridCenterY - gridHeight / 2;
    const panelWidth = gridWidth + 18;
    const panelHeight = gridHeight + 18;
    const occupied = this.state.occupiedCells;

    this.gridMetrics = { slotSize, slotWidth, slotHeight, gap, pitch, pitchX, pitchY, cols, rows, startX, startY: gridStartY };

    this.add
      .rectangle(startX + gridWidth / 2, gridStartY + gridHeight / 2, panelWidth, panelHeight, 0x182216, 1)
      .setStrokeStyle(3, TERMINAL_UI.stroke, 0.95);

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = startX + col * pitchX;
        const y = gridStartY + row * pitchY;
        const active = this.state.isCellActive(col, row);
        const filled = occupied.has(`${col}:${row}`);
        const fill = !active ? TERMINAL_UI.slotLocked : filled ? 0x3c5c35 : TERMINAL_UI.slot;
        const alpha = active ? 1 : 0.48;

        const rect = this.add
          .rectangle(x + slotWidth / 2, y + slotHeight / 2, slotWidth, slotHeight, fill, alpha)
          .setStrokeStyle(2, active ? 0x4f6445 : 0x263226, active ? 1 : 0.55)
          .setInteractive({ useHandCursor: true });
        this.registerInteractive(rect);

        rect.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          if (pointer.rightButtonDown()) return;

          const existing = this.state.weaponAt(col, row);
          if (existing) {
            this.beginPendingWeaponDrag(
              pointer,
              existing.weaponId,
              existing,
              this.getPlacementGrabOffset(pointer.x, pointer.y, existing),
              null,
              existing.rotation,
            );
            return;
          }
        });
      }
    }

    for (const placement of this.state.placedWeapons) {
      const shape = getWeaponShape(placement.weaponId, placement.rotation);
      const maxCol = Math.max(...shape.map((cell) => cell.col));
      const maxRow = Math.max(...shape.map((cell) => cell.row));
      const x = startX + (placement.col + (maxCol + 1) / 2) * pitchX - gap / 2;
      const y = gridStartY + (placement.row + (maxRow + 1) / 2) * pitchY - gap / 2;
      const iconBounds = this.getGridIconBounds(placement.weaponId, placement.rotation);
      const icon = this.drawWeaponIcon(
        x,
        y,
        placement.weaponId,
        iconBounds.width,
        iconBounds.height,
        placement.rotation,
        this.getGridWeaponIconTuning(placement.weaponId),
      );
      const hitWidth = (maxCol + 1) * pitchX;
      const hitHeight = (maxRow + 1) * pitchY;
      if (placement.id === this.selectedPlacementId) {
        this.add.rectangle(x, y, hitWidth, hitHeight, 0x000000, 0).setStrokeStyle(3, TERMINAL_UI.accent, 0.95).setDepth(13);
      }
      icon.setSize(hitWidth, hitHeight);
      this.registerInteractive(icon.setInteractive(new Phaser.Geom.Rectangle(-hitWidth / 2, -hitHeight / 2, hitWidth, hitHeight), Phaser.Geom.Rectangle.Contains));
      if (icon.input) icon.input.cursor = 'pointer';
      icon.on('pointerdown', (pointer: Phaser.Input.Pointer) =>
        this.beginPendingWeaponDrag(
          pointer,
          placement.weaponId,
          placement,
          this.getPlacementGrabOffset(pointer.x, pointer.y, placement),
          null,
          placement.rotation,
        ),
      );
    }
  }

  private drawWeaponOffer(): void {
    const panel = this.getSupplyPanel();
    const content = this.getPanelContentBounds(panel);
    const catalog = this.state.unlockedWeaponPool;
    const categoryGroups = WEAPON_CATEGORIES.map((category) => ({
      category,
      weapons: catalog.filter((weaponId) => WEAPONS[weaponId].category === category.id),
    })).filter((group) => group.weapons.length > 0);
    const rowsTop = content.top + 34;
    const rowsBottom = content.bottom - 42;
    const rowStep = Math.min(68, Math.floor((rowsBottom - rowsTop) / Math.max(1, categoryGroups.length)));
    const rowHeight = Math.max(54, rowStep - 6);
    const categoryWidth = Math.min(92, Math.max(76, Math.floor(content.width * 0.24)));
    const cardGapX = 6;
    const weaponAreaLeft = content.left + categoryWidth + 8;
    const weaponAreaWidth = content.right - weaponAreaLeft;
    this.weaponOfferViews = [];
    this.offer = catalog;

    this.createFittedText(content.left, content.top, UI_TEXT.equip.armoryStock, content.width, 18, '#f3ead2', 0);
    this.add.rectangle(content.centerX, content.top + 20, content.width, 1, TERMINAL_UI.accent, 0.42);

    categoryGroups.forEach((group, rowIndex) => {
      const y = rowsTop + rowStep / 2 + rowIndex * rowStep;
      const cardWidth = Math.floor((weaponAreaWidth - cardGapX * (group.weapons.length - 1)) / group.weapons.length);

      this.add.rectangle(content.centerX, y, content.width, rowHeight, 0x0b100d, 0.5).setStrokeStyle(1, TERMINAL_UI.strokeDim, 0.72);
      this.createFittedText(content.left + categoryWidth / 2, y, UI_TEXT.weaponCategories[group.category.id], categoryWidth - 14, 14, '#aeb89b');
      this.add.rectangle(content.left + categoryWidth + 3, y, 1, rowHeight - 12, TERMINAL_UI.strokeDim, 0.78);

      group.weapons.forEach((weaponId, weaponIndex) => {
        const cardX = weaponAreaLeft + cardWidth / 2 + weaponIndex * (cardWidth + cardGapX);
        const cardHeight = rowHeight - 8;
        const selected = this.selectedWeapon === weaponId;
        const affordable = this.state.canAffordWeapon(weaponId);
        const iconX = -cardWidth / 2 + 27;
        const infoLeft = -cardWidth / 2 + 53;
        const infoWidth = Math.max(42, cardWidth - 59);
        const infoCenterX = infoLeft + infoWidth / 2;

        const card = this.add.container(cardX, y);
        const bg = this.add
          .rectangle(0, 0, cardWidth, cardHeight, selected ? 0x27301f : affordable ? 0x141b15 : 0x10120f, 0.98)
          .setStrokeStyle(selected ? 3 : 2, selected ? TERMINAL_UI.accent : affordable ? TERMINAL_UI.stroke : 0x5b3530);
        const iconBay = this.add.rectangle(iconX, 0, 46, cardHeight - 8, 0x050805, 0.28).setStrokeStyle(1, TERMINAL_UI.strokeDim, 0.7);
        const label = this.createFittedText(infoCenterX, -11, WEAPONS[weaponId].name, infoWidth, 14, selected ? '#f3ead2' : affordable ? '#d8d3b4' : '#9f8176');
        const price = createCurrencyValue(this, infoCenterX, 13, WEAPONS[weaponId].softCost, 'soft', {
          maxWidth: infoWidth - 8,
          fontSize: 12,
          iconSize: 16,
          gap: 3,
          color: affordable ? '#9fd077' : '#d58c7e',
        });
        const priceBgWidth = Math.min(infoWidth, price.container.width + 12);
        const priceBg = this.add.rectangle(infoCenterX, 13, priceBgWidth, 21, affordable ? 0x263f23 : 0x402522, 1).setStrokeStyle(1, affordable ? TERMINAL_UI.success : TERMINAL_UI.danger, 0.88);

        card.add([bg, iconBay, label, priceBg, price.container]);
        this.weaponOfferViews.push({
          weaponId,
          bg,
          label,
          bounds: new Phaser.Geom.Rectangle(cardX - cardWidth / 2, y - cardHeight / 2, cardWidth, cardHeight),
        });
        this.drawWeaponIcon(cardX + iconX, y, weaponId, 40, 32, 0);
        card.setSize(cardWidth, cardHeight);
        this.createWeaponOfferHitArea(cardX, y, weaponId, cardWidth, cardHeight);
      });
    });

    const hint = this.createFittedText(content.centerX, content.bottom - 18, UI_TEXT.equip.dragHint, content.width, 16, '#d8d3b4');
    hint.setAlpha(0.58);
  }

  private drawGridCellPurchaseButton(): void {
    const content = this.getPanelContentBounds(this.getLeftPanel());
    const cost = this.state.getNextGridCellCost();
    const width = 194;
    const height = 44;
    const x = content.left + width / 2;
    const y = content.bottom - height / 2;
    const hintGap = 14;
    const hintWidth = content.width - width - hintGap;
    const hintX = content.right - hintWidth / 2;

    this.createFittedText(hintX, y, UI_TEXT.equip.rotateHint, hintWidth, 13, '#aeb89b').setLineSpacing(1);

    if (cost === null) {
      this.add.rectangle(x, y, width, height, 0x293027, 1).setStrokeStyle(2, TERMINAL_UI.strokeDim, 0.8);
      this.createFittedText(x, y, `${UI_TEXT.buttons.addGridCell} · ${UI_TEXT.upgrades.max}`, width - 20, 18, '#8d9684');
      return;
    }

    const affordable = this.state.soft >= cost;
    this.createCurrencyButton(x, y, width, height, UI_TEXT.buttons.addGridCell, cost, 'soft', affordable ? 0x4a743c : 0x4d302c, () => {
      if (!this.state.buyGridCell()) {
        this.flashHint(UI_TEXT.messages.upgradeUnavailable);
        return;
      }

      this.completeTutorialStep('buy-cell');
      saveRunProgress(this.state);
      this.showPrep();
      this.flashHint(UI_TEXT.messages.upgradeBought);
    });
  }

  private drawUpgradePanel(): void {
    const x = this.scale.width - 250;
    const y = 138;

    this.add.rectangle(x + 116, y + 122, 272, 258, 0x243a76, 0.95).setStrokeStyle(4, 0xe9f0ff);
    this.add
      .text(x + 116, y - 4, 'Вечные улучшения', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
        stroke: '#172359',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.createUpgradeButton(x, y + 38, '+20 прочность', '25', () => this.tryUpgrade('hp'));
    this.createUpgradeButton(x, y + 112, '+1 ячейка', '25', () => this.tryUpgrade('cell'));
    this.createUpgradeButton(x, y + 186, '+редкий ролл', '25', () => this.tryUpgrade('rare'));
  }

  private drawWeaponActions(): void {
    // Equip uses a permanent catalog now; kept for old call sites during iteration.
  }

  private drawSelectedWeaponUpgrade(): void {
    const placement = this.state.placedWeapons.find((weapon) => weapon.id === this.selectedPlacementId);
    if (!placement) return;

    const weapon = WEAPONS[placement.weaponId];
    const cost = this.state.getWeaponUpgradeCost(placement.id);
    if (cost === null) return;

    const panel = this.getSupplyPanel();
    const x = panel.x;
    const y = 456;
    const affordable = this.state.soft >= cost;

    this.add.rectangle(x, y, 250, 52, TERMINAL_UI.panelStrong, 0.94).setStrokeStyle(2, TERMINAL_UI.accent);
    this.createFittedText(x - 44, y, `${weapon.name} ${UI_TEXT.upgrades.level} ${placement.level}`, 144, 16, '#f3ead2');

    this.createCurrencyButton(x + 80, y, 92, 34, 'UP', cost, 'soft', affordable ? 0x4a743c : 0x4d302c, () => {
      if (!this.state.upgradeWeapon(placement.id)) {
        this.flashHint(UI_TEXT.messages.notEnoughSoft);
        return;
      }
      saveRunProgress(this.state);
      this.showPrep();
      this.flashHint(`${weapon.name} ${UI_TEXT.upgrades.upgraded}`);
    });
  }

  private drawBottomTabs(): void {
    const { width, height } = this.scale;
    const y = height - 38;

    const tabButtons: Array<{ id: PrepTab; x: number; width: number; height: number }> = [
      { id: 'shop', x: width / 2 - 360, width: 144, height: 52 },
      { id: 'equip', x: width / 2 - 190, width: 144, height: 52 },
      { id: 'fight', x: width / 2, width: 190, height: 60 },
      { id: 'upgrades', x: width / 2 + 230, width: 154, height: 52 },
    ];

    tabButtons.forEach((button) => {
      const label = PREP_TABS.includes(button.id) ? UI_TEXT.tabs[button.id] : button.id;
      const active = this.activeTab === button.id;
      this.createButton(button.x, y, button.width, button.height, label, active ? TERMINAL_UI.accentDark : TERMINAL_UI.panel, () => {
        this.activeTab = button.id;
        this.showPrep();
      });
    });

    this.createButton(width - 92, y, 148, 52, UI_TEXT.cheats.button, this.cheatsOpen ? 0x6b4f86 : TERMINAL_UI.panel, () => {
      this.cheatsOpen = !this.cheatsOpen;
      this.showPrep();
    });

    if (this.cheatsOpen) {
      this.drawCheatsPanel();
      this.drawWeaponCheatsPanel();
    }
  }

  private drawCheatsPanel(): void {
    const panelWidth = Math.min(350, this.scale.width - 28);
    const panelHeight = Math.min(640, this.scale.height - 94);
    const x = Phaser.Math.Clamp(this.scale.width - panelWidth / 2 - 18, panelWidth / 2 + 14, this.scale.width - panelWidth / 2 - 14);
    const y = 66 + panelHeight / 2;
    const left = x - panelWidth / 2;
    const right = x + panelWidth / 2;
    const top = y - panelHeight / 2;
    const settings = loadGameSettings();
    const selectedEnemyId = this.getSelectedCheatEnemyId();
    const selectedEnemyScale = selectedEnemyId ? settings.enemyScales[selectedEnemyId] ?? settings.enemyScale : settings.enemyScale;
    const selectedEnemyLabel = selectedEnemyId ? this.getEnemyCheatLabel(selectedEnemyId) : UI_TEXT.cheats.allEnemies;
    const previewEnemy = (selectedEnemyId ? ENEMIES.find((enemy) => enemy.id === selectedEnemyId) : ENEMIES[0]) ?? ENEMIES[0];
    const displaySize = Math.round(previewEnemy.displaySize * selectedEnemyScale);
    const onlyWhenCheatsOpen = (action: () => void): (() => void) => {
      return () => {
        if (!this.cheatsOpen) return;
        action();
      };
    };
    const sectionLine = (lineY: number): void => {
      this.add.rectangle(x, lineY, panelWidth - 36, 1, TERMINAL_UI.accent, 0.28).setDepth(81);
    };

    this.add.rectangle(x, y, panelWidth, panelHeight, TERMINAL_UI.panelStrong, 0.97).setDepth(80).setStrokeStyle(2, 0x6b4f86, 0.95);
    this.add.rectangle(x, top + 8, panelWidth - 20, 2, TERMINAL_UI.accent, 0.42).setDepth(81);
    this.add
      .text(left + 20, top + 30, UI_TEXT.cheats.title, {
        fontFamily: 'Trebuchet MS, Arial, sans-serif',
        fontSize: '20px',
        color: '#f3ead2',
        stroke: '#050805',
        strokeThickness: 3,
      })
      .setDepth(81)
      .setOrigin(0, 0.5);

    this.createButton(right - 27, top + 28, 34, 34, 'X', 0x20291c, onlyWhenCheatsOpen(() => {
      this.cheatsOpen = false;
      this.showPrep();
    }), 81);

    const languageY = top + 64;
    this.createFittedText(left + 22, languageY, UI_TEXT.settings.language, 82, 15, '#aeb89b', 0).setDepth(82);
    this.createButton(right - 78, languageY, 136, 36, UI_TEXT.settings.switchLanguage, 0x4c5f87, onlyWhenCheatsOpen(() => {
      toggleLocale();
      this.showPrep();
    }), 81);

    sectionLine(top + 92);

    const roadTop = top + 114;
    this.createFittedText(left + 22, roadTop, UI_TEXT.cheats.roadBounds, 130, 15, '#d8d3b4', 0).setDepth(82);
    this.createButton(right - 78, roadTop, 136, 32, DEBUG_FLAGS.showRoadBounds ? UI_TEXT.cheats.hideBounds : UI_TEXT.cheats.showBounds, 0x2f6062, onlyWhenCheatsOpen(() => {
      DEBUG_FLAGS.showRoadBounds = !DEBUG_FLAGS.showRoadBounds;
      this.showPrep();
    }), 81);

    this.createFittedText(
      x,
      roadTop + 28,
      `${UI_TEXT.cheats.leftShort} ${ROAD_BOUNDS.left}   ${UI_TEXT.cheats.rightShort} ${ROAD_BOUNDS.right}   ${ROAD_BOUNDS.right - ROAD_BOUNDS.left}`,
      panelWidth - 54,
      14,
      '#bdfcff',
    ).setDepth(82);

    this.createFittedText(left + 22, roadTop + 58, UI_TEXT.cheats.boundLeft, 76, 14, '#aeb89b', 0).setDepth(82);
    this.createButton(left + 132, roadTop + 58, 72, 30, '-1', 0x2f6062, onlyWhenCheatsOpen(() => this.adjustRoadBound('left', -ROAD_BOUNDS_LIMITS.step)), 81);
    this.createButton(left + 216, roadTop + 58, 72, 30, '+1', 0x2f6062, onlyWhenCheatsOpen(() => this.adjustRoadBound('left', ROAD_BOUNDS_LIMITS.step)), 81);

    this.createFittedText(left + 22, roadTop + 92, UI_TEXT.cheats.boundRight, 76, 14, '#aeb89b', 0).setDepth(82);
    this.createButton(left + 132, roadTop + 92, 72, 30, '-1', 0x2f6062, onlyWhenCheatsOpen(() => this.adjustRoadBound('right', -ROAD_BOUNDS_LIMITS.step)), 81);
    this.createButton(left + 216, roadTop + 92, 72, 30, '+1', 0x2f6062, onlyWhenCheatsOpen(() => this.adjustRoadBound('right', ROAD_BOUNDS_LIMITS.step)), 81);

    sectionLine(roadTop + 116);

    const enemyTop = roadTop + 132;
    this.createFittedText(left + 22, enemyTop, UI_TEXT.cheats.enemyType, 96, 14, '#aeb89b', 0).setDepth(82);
    this.createButton(left + 118, enemyTop, 40, 30, '<', 0x2f6062, onlyWhenCheatsOpen(() => this.selectCheatEnemy(-1)), 81);
    this.createFittedText(x + 26, enemyTop, selectedEnemyLabel, 120, 13, '#f3ead2').setDepth(82);
    this.createButton(right - 38, enemyTop, 40, 30, '>', 0x2f6062, onlyWhenCheatsOpen(() => this.selectCheatEnemy(1)), 81);

    this.add.rectangle(x, enemyTop + 63, panelWidth - 54, 100, 0x10170f, 0.62).setDepth(81).setStrokeStyle(1, TERMINAL_UI.stroke, 0.6);
    this.drawCheatEnemyPreview(previewEnemy.id, x, enemyTop + 58, displaySize);
    this.createFittedText(x, enemyTop + 114, `${displaySize}px   ${Math.round(selectedEnemyScale * 100)}%`, panelWidth - 70, 14, '#d8d3b4').setDepth(82);

    const scaleY = enemyTop + 146;
    this.createFittedText(left + 22, scaleY, UI_TEXT.cheats.enemyScale, 92, 14, '#aeb89b', 0).setDepth(82);
    this.createButton(left + 120, scaleY, 58, 30, '-5%', 0x2f6062, onlyWhenCheatsOpen(() => this.adjustEnemyScale(-0.05)), 81);
    this.createButton(right - 42, scaleY, 58, 30, '+5%', 0x2f6062, onlyWhenCheatsOpen(() => this.adjustEnemyScale(0.05)), 81);
    this.createButton(x, scaleY + 32, panelWidth - 78, 28, UI_TEXT.cheats.enemyScaleReset, 0x4c5f87, onlyWhenCheatsOpen(() => this.resetEnemyScale()), 81);

    sectionLine(scaleY + 54);

    const actionTop = scaleY + 76;
    this.createButton(x, actionTop, panelWidth - 78, 30, UI_TEXT.cheats.spawnEachType, 0x6b4f36, onlyWhenCheatsOpen(() => this.spawnCheatEnemies()), 81);
    this.createButton(x, actionTop + 34, panelWidth - 78, 30, UI_TEXT.cheats.equipEveryWeapon, 0x6b4f36, onlyWhenCheatsOpen(() => this.equipEveryWeaponCheat()), 81);
    this.createCurrencyButton(x - 68, actionTop + 68, 130, 30, '+', 1000, 'soft', 0x4a743c, onlyWhenCheatsOpen(() => this.applyCheat('soft')), 81);
    this.createButton(x + 68, actionTop + 68, 130, 30, '+1M S+H', 0x4a743c, onlyWhenCheatsOpen(() => this.applyCheat('million')), 81);
    this.createButton(x - 68, actionTop + 102, 130, 30, UI_TEXT.cheats.stage, 0x4c5f87, onlyWhenCheatsOpen(() => this.applyCheat('stage')), 81);
    this.createButton(x + 68, actionTop + 102, 130, 30, '+10 cells', 0x4c5f87, onlyWhenCheatsOpen(() => this.applyCheat('cells10')), 81);
    this.createButton(x - 68, actionTop + 136, 130, 30, UI_TEXT.cheats.base, 0x4a743c, onlyWhenCheatsOpen(() => this.applyCheat('base')), 81);
    this.createButton(x + 68, actionTop + 136, 130, 30, 'Reset progress', 0x7d2f2a, onlyWhenCheatsOpen(() => this.resetAllProgress()), 81);
  }

  private drawWeaponCheatsPanel(): void {
    const panelWidth = Math.min(354, this.scale.width - 28);
    const panelHeight = 350;
    const cheatPanelWidth = Math.min(350, this.scale.width - 28);
    const targetRight = this.scale.width - cheatPanelWidth - 28;
    const x = Phaser.Math.Clamp(targetRight - panelWidth / 2 - 10, panelWidth / 2 + 14, this.scale.width - panelWidth / 2 - 14);
    const y = 104 + panelHeight / 2;
    const left = x - panelWidth / 2;
    const right = x + panelWidth / 2;
    const top = y - panelHeight / 2;
    const weaponId = this.getSelectedCheatWeaponId();
    const rotation = this.selectedCheatWeaponRotation;
    const tuning = this.getWeaponIconTuning(weaponId);
    const weaponLabel = WEAPONS[weaponId].name || weaponId;
    const onlyWhenCheatsOpen = (action: () => void): (() => void) => {
      return () => {
        if (!this.cheatsOpen) return;
        action();
      };
    };

    this.add.rectangle(x, y, panelWidth, panelHeight, TERMINAL_UI.panelStrong, 0.97).setDepth(80).setStrokeStyle(2, 0x6b4f86, 0.95);
    this.add.rectangle(x, top + 8, panelWidth - 20, 2, TERMINAL_UI.accent, 0.42).setDepth(81);
    this.createFittedText(left + 20, top + 30, 'Weapon Icon', 130, 18, '#f3ead2', 0).setDepth(82);

    const selectY = top + 66;
    this.createFittedText(left + 20, selectY, 'Weapon', 68, 14, '#aeb89b', 0).setDepth(82);
    this.createButton(left + 102, selectY, 40, 30, '<', 0x2f6062, onlyWhenCheatsOpen(() => this.selectCheatWeapon(-1)), 81);
    this.createFittedText(x + 16, selectY, weaponLabel, 132, 13, '#f3ead2').setDepth(82);
    this.createButton(right - 34, selectY, 40, 30, '>', 0x2f6062, onlyWhenCheatsOpen(() => this.selectCheatWeapon(1)), 81);

    const rotationY = top + 98;
    this.createFittedText(left + 20, rotationY, 'Rotation', 68, 14, '#aeb89b', 0).setDepth(82);
    this.createButton(left + 102, rotationY, 40, 30, '<', 0x2f6062, onlyWhenCheatsOpen(() => this.selectCheatWeaponRotation(-1)), 81);
    this.createFittedText(x + 16, rotationY, `${rotation * 90}deg`, 132, 13, '#f3ead2').setDepth(82);
    this.createButton(right - 34, rotationY, 40, 30, '>', 0x2f6062, onlyWhenCheatsOpen(() => this.selectCheatWeaponRotation(1)), 81);

    this.add.rectangle(x, top + 134, panelWidth - 54, 94, 0x10170f, 0.62).setDepth(81).setStrokeStyle(1, TERMINAL_UI.stroke, 0.6);
    this.drawCheatWeaponPreview(weaponId, rotation, x, top + 134);
    this.createFittedText(
      x,
      top + 190,
      `size ${Math.round(tuning.scaleBoost * 100)}%   x ${tuning.offsetX}   y ${tuning.offsetY}`,
      panelWidth - 58,
      14,
      '#d8d3b4',
    ).setDepth(82);

    const controlsTop = top + 220;
    this.drawWeaponTuningControl(left, right, controlsTop, 'Size', 'scaleBoost', '-5%', '+5%', 0.05, onlyWhenCheatsOpen);
    this.drawWeaponTuningControl(left, right, controlsTop + 32, 'X', 'offsetX', '-1', '+1', 1, onlyWhenCheatsOpen);
    this.drawWeaponTuningControl(left, right, controlsTop + 64, 'Y', 'offsetY', '-1', '+1', 1, onlyWhenCheatsOpen);
    this.createButton(x, controlsTop + 104, panelWidth - 78, 30, 'Reset weapon icon', 0x4c5f87, onlyWhenCheatsOpen(() => this.resetSelectedWeaponIconTuning()), 81);

    this.exposeWeaponIconTuningForDevTools();
  }

  private drawSettingsPanel(): void {
    const settings = loadGameSettings();
    const panelWidth = Math.min(400, this.scale.width - 28);
    const panelHeight = 268;
    const x = Phaser.Math.Clamp(this.scale.width - panelWidth / 2 - 18, panelWidth / 2 + 14, this.scale.width - panelWidth / 2 - 14);
    const y = 164;
    const panel = this.add.container(x, y).setDepth(1100);
    const bg = this.add.rectangle(0, 0, panelWidth, panelHeight, TERMINAL_UI.panelStrong, 0.98).setStrokeStyle(2, TERMINAL_UI.accent, 0.95);
    const shine = this.add.rectangle(0, -panelHeight / 2 + 8, panelWidth - 18, 2, TERMINAL_UI.accent, 0.48);
    const title = this.add
      .text(-panelWidth / 2 + 18, -panelHeight / 2 + 30, UI_TEXT.settings.title, {
        fontFamily: 'Trebuchet MS, Arial, sans-serif',
        fontSize: '21px',
        color: '#f3ead2',
        stroke: '#050805',
        strokeThickness: 3,
      })
      .setOrigin(0, 0.5);
    const close = this.createSettingsAction(panelWidth / 2 - 25, -panelHeight / 2 + 28, 34, 34, 'X', () => this.toggleSettingsPanel());

    panel.add([bg, shine, title, close]);
    this.drawSettingsLanguageRow(panel, panelWidth, -74);
    this.drawSettingsVolumeRow(panel, panelWidth, -14, UI_TEXT.settings.sfxVolume, 'sfxVolume', settings);
    this.drawSettingsVolumeRow(panel, panelWidth, 58, UI_TEXT.settings.musicVolume, 'musicVolume', settings);
    this.settingsPanel = panel;
  }

  private drawSettingsLanguageRow(panel: Phaser.GameObjects.Container, panelWidth: number, y: number): void {
    const left = -panelWidth / 2 + 24;
    const labelWidth = 122;
    const buttonLeft = left + labelWidth + 12;
    const buttonRight = panelWidth / 2 - 62;
    const buttonWidth = Math.max(118, buttonRight - buttonLeft);
    const label = this.add.text(left, y, UI_TEXT.settings.language, this.getSettingsTextStyle(15)).setOrigin(0, 0.5);
    const button = this.createSettingsAction(buttonLeft + buttonWidth / 2, y, buttonWidth, 40, UI_TEXT.settings.switchLanguage, () => {
      toggleLocale();
      this.showPrep();
    });
    panel.add([label, button]);
  }

  private drawSettingsVolumeRow(
    panel: Phaser.GameObjects.Container,
    panelWidth: number,
    y: number,
    labelText: string,
    setting: VolumeSettingId,
    settings: GameSettings,
  ): void {
    const value = settings[setting];
    const left = -panelWidth / 2 + 24;
    const labelWidth = 122;
    const minusX = left + labelWidth + 18;
    const plusX = panelWidth / 2 - 44;
    const barLeft = minusX + 32;
    const barRight = plusX - 32;
    const barWidth = Math.max(96, barRight - barLeft);
    const barX = barLeft + barWidth / 2;
    const label = this.add.text(left, y, labelText, this.getSettingsTextStyle(15)).setOrigin(0, 0.5);
    const minus = this.createSettingsAction(minusX, y, 38, 38, '-', () => this.adjustVolumeSetting(setting, -0.1));
    const plus = this.createSettingsAction(plusX, y, 38, 38, '+', () => this.adjustVolumeSetting(setting, 0.1));
    const barBg = this.add.rectangle(barX, y, barWidth, 12, 0x050805, 0.88).setStrokeStyle(1, TERMINAL_UI.strokeDim, 0.9);
    const barFill = this.add.rectangle(barX - barWidth / 2, y, Math.max(2, barWidth * value), 12, TERMINAL_UI.accent, 0.95).setOrigin(0, 0.5);
    const valueText = this.add.text(barX, y + 22, `${Math.round(value * 100)}%`, this.getSettingsTextStyle(13)).setOrigin(0.5);
    const barZone = this.registerInteractive(this.add.zone(barX, y, barWidth + 12, 34).setInteractive({ useHandCursor: true }));

    barZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.settingsOpen) return;

      const left = panel.x + barX - barWidth / 2;
      this.setVolumeSetting(setting, (pointer.x - left) / barWidth);
    });

    panel.add([label, minus, barBg, barFill, valueText, barZone, plus]);
  }

  private createSettingsAction(x: number, y: number, width: number, height: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
    const action = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, width, height, 0x20291c, 1).setStrokeStyle(2, TERMINAL_UI.stroke, 0.95);
    const text = this.add.text(0, 0, label, this.getSettingsTextStyle(Math.min(16, Math.floor(height * 0.45)))).setOrigin(0.5);
    action.add([bg, text]);
    this.registerInteractive(action.setSize(width, height).setInteractive({ useHandCursor: true }));
    action.on('pointerdown', () => {
      if (!this.settingsOpen) return;
      onClick();
    });
    action.on('pointerover', () => bg.setStrokeStyle(2, TERMINAL_UI.accent, 1));
    action.on('pointerout', () => bg.setStrokeStyle(2, TERMINAL_UI.stroke, 0.95));
    return action;
  }

  private destroySettingsPanel(): void {
    this.settingsPanel?.destroy(true);
    this.settingsPanel = null;
  }

  private registerInteractive<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.interactiveObjects.add(object);
    object.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.interactiveObjects.delete(object);
    });
    return object;
  }

  private clearInteractiveObjects(): void {
    for (const object of this.interactiveObjects) {
      object.removeAllListeners();
      if ('disableInteractive' in object) {
        (object as Phaser.GameObjects.GameObject & { disableInteractive: () => void }).disableInteractive();
      }
    }
    this.interactiveObjects.clear();
  }

  private adjustVolumeSetting(setting: VolumeSettingId, delta: number): void {
    this.setVolumeSetting(setting, loadGameSettings()[setting] + delta);
  }

  private setVolumeSetting(setting: VolumeSettingId, value: number): void {
    updateGameSettings({ [setting]: Math.round(Phaser.Math.Clamp(value, 0, 1) * 10) / 10 });
    if (setting === 'musicVolume') {
      applyMusicVolume();
    }
    this.showPrep();
  }

  private getSettingsTextStyle(fontSize: number): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'Trebuchet MS, Arial, sans-serif',
      fontSize: `${fontSize}px`,
      color: '#f3ead2',
      stroke: '#050805',
      strokeThickness: 2,
    };
  }

  private drawOverlayPanels(): void {
    const left = this.getLeftPanel();
    const right = this.getRightPanel();

    this.drawPanel(left, TERMINAL_UI.panel, TERMINAL_UI.stroke);
    this.drawPanel(right, TERMINAL_UI.panelAlt, TERMINAL_UI.stroke);
  }

  private drawPanel(panel: PanelBounds, color: number, stroke: number, alpha = 0.9): void {
    this.add.rectangle(panel.x, panel.y, panel.width, panel.height, color, alpha).setStrokeStyle(2, stroke, 0.95);
    this.add.rectangle(panel.x, panel.y - panel.height / 2 + 18, panel.width - 22, 2, TERMINAL_UI.accent, 0.46);
    this.add.rectangle(panel.x, panel.y + panel.height / 2 - 18, panel.width - 22, 2, TERMINAL_UI.strokeDim, 0.72);
  }

  private createBaseUpgradeChip(x: number, y: number, label: string, cost: number | null, onClick: () => void): void {
    const width = 124;
    const height = 46;
    const bg = this.registerInteractive(
      this.add.rectangle(x, y, width, height, 0x1a2318, 0.98).setStrokeStyle(2, TERMINAL_UI.stroke, 0.94).setInteractive({ useHandCursor: true }),
    );
    this.add.rectangle(x, y - height / 2 + 5, width - 12, 2, TERMINAL_UI.accent, 0.36);
    this.createFittedText(x - width / 2 + 10, y - 7, label, 76, 13, '#d8d3b4', 0);
    if (cost === null) {
      this.createFittedText(x - width / 2 + 10, y + 10, '-', 76, 18, '#f3ead2', 0);
    } else {
      createCurrencyValue(this, x - width / 2 + 10, y + 10, cost, 'soft', { maxWidth: 76, fontSize: 17, iconSize: 20, originX: 0 });
    }
    this.add.rectangle(x + width / 2 - 18, y, 24, 26, TERMINAL_UI.accentDark, 1).setStrokeStyle(1, TERMINAL_UI.accent, 0.88);
    this.createFittedText(x + width / 2 - 18, y, '+', 18, 18, '#f3ead2');
    bg.on('pointerdown', onClick);
    bg.on('pointerover', () => bg.setStrokeStyle(2, TERMINAL_UI.accent, 1).setFillStyle(0x202b1c, 1));
    bg.on('pointerout', () => bg.setStrokeStyle(2, TERMINAL_UI.stroke, 0.94).setFillStyle(0x1a2318, 0.98));
  }

  private createSegmentTab(x: number, y: number, width: number, label: string, active: boolean, onClick: () => void): void {
    const bg = this.registerInteractive(this.add
      .rectangle(x, y, width, 32, active ? TERMINAL_UI.accentDark : 0x0c120e, active ? 1 : 0.92)
      .setStrokeStyle(2, active ? TERMINAL_UI.accent : TERMINAL_UI.stroke, active ? 1 : 0.8)
      .setInteractive({ useHandCursor: true }));
    this.createFittedText(x, y, label, width - 10, 14, active ? '#f3ead2' : '#d8d3b4');
    bg.on('pointerdown', onClick);
    bg.on('pointerover', () => bg.setStrokeStyle(2, TERMINAL_UI.accent, 1));
    bg.on('pointerout', () => bg.setStrokeStyle(2, active ? TERMINAL_UI.accent : TERMINAL_UI.stroke, active ? 1 : 0.8));
  }

  private drawWeaponStatPill(x: number, y: number, label: string): void {
    this.add.rectangle(x, y, 84, 26, 0x0b100d, 0.9).setStrokeStyle(1, TERMINAL_UI.strokeDim, 0.9);
    this.createFittedText(x, y, label, 74, 12, '#d8d3b4');
  }

  private drawWeaponUpgradeScrollbar(x: number, top: number, height: number): void {
    if (this.weaponUpgradeScrollMax <= 0) return;

    const thumbHeight = Math.max(36, height * (height / (height + this.weaponUpgradeScrollMax)));
    const travel = Math.max(1, height - thumbHeight);
    const progress = this.weaponUpgradeScrollY / this.weaponUpgradeScrollMax;
    const thumbY = top + thumbHeight / 2 + travel * progress;

    this.add.rectangle(x, top + height / 2, 4, height, 0x050805, 0.58).setStrokeStyle(1, TERMINAL_UI.strokeDim, 0.7);
    this.add.rectangle(x, thumbY, 8, thumbHeight, TERMINAL_UI.accent, 0.92).setStrokeStyle(1, 0xf1d37a, 0.82);
  }

  private drawWeaponUpgradeRow(
    x: number,
    y: number,
    width: number,
    label: string,
    effect: string,
    level: string,
    cost: string,
    affordable: boolean,
    maxed: boolean,
    onClick: () => void,
    parent?: Phaser.GameObjects.Container,
  ): void {
    const created: Phaser.GameObjects.GameObject[] = [];
    const track = <T extends Phaser.GameObjects.GameObject>(object: T): T => {
      created.push(object);
      return object;
    };

    const row = track(this.registerInteractive(
      this.add
      .rectangle(x, y, width, 42, 0x0b100d, 0.94)
      .setStrokeStyle(2, maxed ? TERMINAL_UI.strokeDim : affordable ? TERMINAL_UI.stroke : 0x5b3530, maxed ? 0.72 : 0.95)
      .setInteractive({ useHandCursor: !maxed }),
    ));
    track(this.add.rectangle(x - width / 2 + 3, y, 4, 30, maxed ? TERMINAL_UI.strokeDim : affordable ? TERMINAL_UI.success : TERMINAL_UI.danger, maxed ? 0.65 : 0.95));
    track(this.createFittedText(x - width / 2 + 16, y - 8, label, 130, 15, '#f3ead2', 0));
    track(this.createFittedText(x - width / 2 + 16, y + 10, effect, 146, 12, '#aeb89b', 0));
    track(this.createFittedText(x + 44, y, level, 86, 14, maxed ? '#88c56b' : '#d8d3b4'));

    const chipX = x + width / 2 - 44;
    const chipColor = maxed ? 0x303a2b : affordable ? 0x4a743c : 0x4d302c;
    let priceContainer: Phaser.GameObjects.Container | null = null;
    if (maxed) {
      track(this.add.rectangle(chipX, y, 72, 30, chipColor, 1).setStrokeStyle(1, TERMINAL_UI.strokeDim, 0.9));
      track(this.createFittedText(chipX, y, cost, 58, 15, '#f3ead2'));
    } else {
      const price = createCurrencyValue(this, chipX, y, cost, 'soft', { maxWidth: 82, fontSize: 15, iconSize: 22, gap: 5 });
      const chipWidth = price.container.width + 20;
      priceContainer = price.container;
      track(this.add.rectangle(chipX, y, chipWidth, 30, chipColor, 1).setStrokeStyle(1, affordable ? TERMINAL_UI.success : TERMINAL_UI.danger, 0.9));
      track(price.container);
    }

    if (!maxed) {
      row.on('pointerdown', onClick);
      row.on('pointerover', () => row.setStrokeStyle(2, TERMINAL_UI.accent, 1));
      row.on('pointerout', () => row.setStrokeStyle(2, affordable ? TERMINAL_UI.stroke : 0x5b3530, 0.95));
    }

    if (parent) {
      parent.add(created);
      if (priceContainer) parent.bringToTop(priceContainer);
      return;
    }

    if (priceContainer) this.children.bringToTop(priceContainer);
  }

  private drawArmoryBackground(width: number, height: number): void {
    this.add.rectangle(width / 2, height / 2, width, height, 0x29343a, 1);

    const graphics = this.add.graphics();
    graphics.lineStyle(2, 0x1f282e, 0.8);
    for (let x = -40; x < width + 80; x += 86) graphics.lineBetween(x, 0, x + 60, height);
    for (let y = 96; y < height; y += 70) graphics.lineBetween(0, y, width, y - 24);

    this.add.rectangle(150, 380, 230, 360, 0x586851, 1).setStrokeStyle(5, 0x18251f);
    this.add.rectangle(width - 240, 336, 360, 250, 0x61745b, 1).setStrokeStyle(5, 0x18251f);
    this.add.rectangle(width / 2, height - 184, 450, 90, 0x9a6235, 1).setStrokeStyle(5, 0x4e2f1e);
    this.add.circle(width / 2, 92, 42, 0xffdf80, 0.9);
  }

  private drawMountedWeapons(): void {
    this.state.placedWeapons.forEach((placement) => {
      const mount = getBunkerWeaponMount(placement, { cols: this.state.gridCols, rows: this.state.gridRows }, { width: this.scale.width, height: this.scale.height });
      const x = mount.x;
      const y = mount.y;
      this.drawWeaponIcon(x, y, placement.weaponId, 52, 52, placement.rotation).setDepth(12);
      this.add
        .text(x + 18, y + 20, `${getWeaponTotalLevel(this.state.getWeaponProgress(placement.weaponId))}`, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          color: '#fff4cf',
          stroke: '#111111',
          strokeThickness: 3,
        })
        .setDepth(13)
        .setOrigin(0.5);
    });
  }

  private drawWeaponIcon(
    x: number,
    y: number,
    weaponId: WeaponId,
    maxWidth: number,
    maxHeight: number,
    rotation: WeaponRotation = 0,
    tuning: WeaponIconVisualTuning = {},
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const rotationRadians = rotation * (Math.PI / 2);
    const offset = this.rotateWeaponIconOffset(tuning.offsetX ?? 0, tuning.offsetY ?? 0, rotation);
    const image = this.add.image(offset.x, offset.y, AssetKeys.Weapons[weaponId]);
    const rotated = rotation % 2 === 1;
    const width = rotated ? image.height : image.width;
    const height = rotated ? image.width : image.height;
    const uiScaleBoost = (weaponId === 'tesla' ? 1.2 : 1) * (tuning.scaleBoost ?? 1);
    image.setFlipX(this.shouldFlipWeaponIconRight(weaponId));
    image.setScale(Math.min(1, maxWidth / width, maxHeight / height) * uiScaleBoost).setRotation(rotationRadians);
    container.add(image);
    return container;
  }

  private shouldFlipWeaponIconRight(weaponId: WeaponId): boolean {
    return weaponId === 'sniperRifle' || weaponId === 'tesla';
  }

  private getGridWeaponIconTuning(weaponId: WeaponId): WeaponIconVisualTuning {
    return WEAPON_GRID_ICON_TUNING[weaponId];
  }

  private rotateWeaponIconOffset(offsetX: number, offsetY: number, rotation: WeaponRotation): { x: number; y: number } {
    const normalized = this.toWeaponIconRotation(rotation);
    if (normalized === 1) return { x: -offsetY, y: offsetX };
    if (normalized === 2) return { x: -offsetX, y: -offsetY };
    if (normalized === 3) return { x: offsetY, y: -offsetX };
    return { x: offsetX, y: offsetY };
  }

  private getGridIconBounds(weaponId: WeaponId, rotation: WeaponRotation): { width: number; height: number } {
    const shape = getWeaponShape(weaponId, rotation);
    const cols = Math.max(...shape.map((cell) => cell.col)) + 1;
    const rows = Math.max(...shape.map((cell) => cell.row)) + 1;
    const slotWidth = this.gridMetrics?.slotWidth ?? 58;
    const slotHeight = this.gridMetrics?.slotHeight ?? 58;
    const gap = this.gridMetrics?.gap ?? 6;
    const paddingX = Math.max(2, Math.round(slotWidth * 0.14));
    const paddingY = Math.max(2, Math.round(slotHeight * 0.14));

    return {
      width: cols * slotWidth + (cols - 1) * gap - paddingX * 2,
      height: rows * slotHeight + (rows - 1) * gap - paddingY * 2,
    };
  }

  private beginWeaponDrag(
    weaponId: WeaponId,
    x: number,
    y: number,
    fromPlacement: PlacedWeapon | null,
    grabOffset = this.getDefaultGrabOffset(weaponId),
    fromOfferIndex: number | null = null,
    rotation: WeaponRotation = this.selectedRotation,
  ): void {
    this.clearDragState(false);
    this.clearPendingDrag();
    this.selectedWeapon = weaponId;
    this.selectedRotation = rotation;

    const removed = fromPlacement ? this.state.removeWeaponById(fromPlacement.id) : null;
    const iconBounds = this.getGridIconBounds(weaponId, rotation);
    const preview = this.drawWeaponIcon(x, y, weaponId, iconBounds.width, iconBounds.height, rotation, this.getGridWeaponIconTuning(weaponId));
    preview.setDepth(1000).setAlpha(0.86);

    const highlights = getWeaponShape(weaponId, rotation).map(() =>
      this.add.rectangle(0, 0, this.gridMetrics?.slotWidth ?? 58, this.gridMetrics?.slotHeight ?? 58, 0x39e75f, 0.5).setDepth(900),
    );

    this.dragState = { weaponId, fromPlacement: removed, fromOfferIndex, grabOffset, rotation, preview, highlights };
    if (removed) this.showSellDropZone(removed);
    this.updateDragPreview(x, y);
    this.updateDragHighlight(x, y);
    this.input.on('pointermove', this.handleDragMove, this);
    this.input.on('pointerup', this.handleDragEnd, this);
  }

  private beginPendingWeaponDrag(
    pointer: Phaser.Input.Pointer,
    weaponId: WeaponId,
    fromPlacement: PlacedWeapon | null,
    grabOffset = this.getDefaultGrabOffset(weaponId),
    fromOfferIndex: number | null = null,
    rotation: WeaponRotation = this.selectedRotation,
  ): void {
    if (pointer.rightButtonDown()) return;

    this.clearDragState(true);
    this.clearPendingDrag();
    this.selectedWeapon = weaponId;
    this.selectedRotation = rotation;
    this.pendingDrag = {
      weaponId,
      fromPlacement,
      fromOfferIndex,
      grabOffset,
      rotation,
      pointerId: pointer.id,
      startX: pointer.x,
      startY: pointer.y,
    };
    this.input.on('pointermove', this.handlePendingDragMove, this);
    this.input.once('pointerup', this.handlePendingDragEnd, this);
  }

  private handlePendingDragMove(pointer: Phaser.Input.Pointer): void {
    const pending = this.pendingDrag;
    if (!pending || pointer.id !== pending.pointerId) return;

    const distance = Phaser.Math.Distance.Between(pending.startX, pending.startY, pointer.x, pointer.y);
    if (distance < this.dragStartDistance) return;

    this.clearPendingDrag();
    this.beginWeaponDrag(
      pending.weaponId,
      pointer.x,
      pointer.y,
      pending.fromPlacement,
      pending.grabOffset,
      pending.fromOfferIndex,
      pending.rotation,
    );
    this.handleDragMove(pointer);
  }

  private handlePendingDragEnd(pointer: Phaser.Input.Pointer): void {
    const pending = this.pendingDrag;
    if (!pending || pointer.id !== pending.pointerId) return;

    this.clearPendingDrag();
    if (pending.fromPlacement) {
      this.selectedPlacementId = pending.fromPlacement.id;
      this.showPrep();
      return;
    }
    this.updateWeaponOfferSelection();
  }

  private handleDragMove(pointer: Phaser.Input.Pointer): void {
    if (!this.dragState) return;
    this.updateDragPreview(pointer.x, pointer.y);
    this.updateDragHighlight(pointer.x, pointer.y);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.activeTab !== 'equip' || !pointer.rightButtonDown()) return;

    if (this.dragState) {
      this.rotateDraggedWeapon(pointer.x, pointer.y);
      return;
    }

    if (!this.selectedWeapon) return;
    this.selectedRotation = rotateWeaponRotation(this.selectedRotation);
    this.showPrep();
  }

  private handleWheel(pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number): void {
    if (this.activeTab !== 'upgrades' || this.activeUpgradesSubTab !== 'weapons') return;
    if (this.weaponUpgradeScrollMax <= 0 || !this.weaponUpgradeScrollBounds) return;
    if (!Phaser.Geom.Rectangle.Contains(this.weaponUpgradeScrollBounds, pointer.x, pointer.y)) return;

    const nextScrollY = Phaser.Math.Clamp(this.weaponUpgradeScrollY + deltaY * 0.45, 0, this.weaponUpgradeScrollMax);
    if (Math.abs(nextScrollY - this.weaponUpgradeScrollY) < 0.5) return;
    this.weaponUpgradeScrollY = nextScrollY;
    this.showPrep();
  }

  private rotateDraggedWeapon(pointerX: number, pointerY: number): void {
    if (!this.dragState) return;

    const drag = this.dragState;
    drag.rotation = rotateWeaponRotation(drag.rotation);
    drag.grabOffset = this.getDefaultGrabOffset(drag.weaponId, drag.rotation);
    this.selectedRotation = drag.rotation;

    drag.preview.destroy();
    for (const highlight of drag.highlights) highlight.destroy();

    const iconBounds = this.getGridIconBounds(drag.weaponId, drag.rotation);
    drag.preview = this.drawWeaponIcon(
      pointerX,
      pointerY,
      drag.weaponId,
      iconBounds.width,
      iconBounds.height,
      drag.rotation,
      this.getGridWeaponIconTuning(drag.weaponId),
    );
    drag.preview.setDepth(1000).setAlpha(0.86);
    drag.highlights = getWeaponShape(drag.weaponId, drag.rotation).map(() =>
      this.add.rectangle(0, 0, this.gridMetrics?.slotWidth ?? 58, this.gridMetrics?.slotHeight ?? 58, 0x39e75f, 0.5).setDepth(900),
    );

    this.updateDragPreview(pointerX, pointerY);
    this.updateDragHighlight(pointerX, pointerY);
  }

  private handleDragEnd(pointer: Phaser.Input.Pointer): void {
    if (!this.dragState) return;
    if (pointer.rightButtonReleased()) return;

    const drag = this.dragState;

    if (drag.fromPlacement && this.isPointerOverSellDropZone(pointer.x, pointer.y)) {
      const refund = this.getWeaponSellValue(drag.fromPlacement.weaponId);
      this.state.soft += refund;
      this.selectedPlacementId = null;
      saveRunProgress(this.state);
      this.clearDragState(false);
      this.showPrep();
      this.flashHint(`Продано +${refund}`);
      return;
    }

    const cell = this.pointerToPlacementCell(pointer.x, pointer.y);
    const placed = cell
      ? drag.fromOfferIndex !== null
        ? this.state.buyAndPlaceWeapon(drag.weaponId, cell.col, cell.row, drag.rotation)
        : this.state.placeWeaponWithLevel(drag.weaponId, cell.col, cell.row, drag.rotation, drag.fromPlacement?.level ?? 1)
      : false;

    if (placed && drag.fromPlacement) {
      this.selectedPlacementId = null;
    }

    if (placed && drag.fromOfferIndex !== null) {
      if (drag.fromOfferIndex >= 0) {
        this.offer[drag.fromOfferIndex] = null;
      }
      this.selectedArsenalWeapon = drag.weaponId;
      this.selectedArsenalCategory = WEAPONS[drag.weaponId].category;
      this.completeTutorialStep('buy-weapon');
      saveRunProgress(this.state);
      this.selectFirstAvailableOffer();
    } else if (placed && drag.fromPlacement) {
      saveRunProgress(this.state);
    }

    if (!placed && drag.fromPlacement) {
      this.state.placeWeaponWithLevel(
        drag.fromPlacement.weaponId,
        drag.fromPlacement.col,
        drag.fromPlacement.row,
        drag.fromPlacement.rotation,
        drag.fromPlacement.level,
      );
    }

    this.clearDragState(false);
    this.showPrep();
    if (!placed) {
      this.flashHint(drag.fromOfferIndex !== null && !this.state.canAffordWeapon(drag.weaponId) ? UI_TEXT.messages.notEnoughSoft : UI_TEXT.messages.weaponNoFit);
    }
  }

  private updateDragHighlight(pointerX: number, pointerY: number): void {
    if (!this.dragState || !this.gridMetrics) return;

    this.updateSellDropZone(pointerX, pointerY);
    if (this.dragState.fromPlacement && this.isPointerOverSellDropZone(pointerX, pointerY)) {
      for (const highlight of this.dragState.highlights) highlight.setVisible(false);
      return;
    }

    const cell = this.pointerToPlacementCell(pointerX, pointerY);
    const shape = getWeaponShape(this.dragState.weaponId, this.dragState.rotation);
    const valid = cell ? this.state.canPlaceWeapon(this.dragState.weaponId, cell.col, cell.row, this.dragState.rotation) : false;
    const color = valid ? 0x39e75f : 0xff3b2f;

    shape.forEach((shapeCell, index) => {
      const highlight = this.dragState?.highlights[index];
      if (!highlight || !cell) {
        highlight?.setVisible(false);
        return;
      }

      const col = cell.col + shapeCell.col;
      const row = cell.row + shapeCell.row;
      const x = this.gridMetrics!.startX + col * this.gridMetrics!.pitchX + this.gridMetrics!.slotWidth / 2;
      const y = this.gridMetrics!.startY + row * this.gridMetrics!.pitchY + this.gridMetrics!.slotHeight / 2;

      highlight.setVisible(true).setPosition(x, y).setFillStyle(color, this.state.isCellActive(col, row) ? 0.58 : 0.35);
      highlight.setStrokeStyle(3, color, 0.95);
    });
  }

  private pointerToGridCell(pointerX: number, pointerY: number): { col: number; row: number } | null {
    if (!this.gridMetrics) return null;
    const col = Math.floor((pointerX - this.gridMetrics.startX) / this.gridMetrics.pitchX);
    const row = Math.floor((pointerY - this.gridMetrics.startY) / this.gridMetrics.pitchY);
    if (col < 0 || row < 0 || col >= this.gridMetrics.cols || row >= this.gridMetrics.rows) return null;
    return { col, row };
  }

  private pointerToPlacementCell(pointerX: number, pointerY: number): { col: number; row: number } | null {
    if (!this.dragState) return null;
    const pointerCell = this.pointerToGridCell(pointerX, pointerY);
    if (!pointerCell) return null;

    return {
      col: pointerCell.col - this.dragState.grabOffset.col,
      row: pointerCell.row - this.dragState.grabOffset.row,
    };
  }

  private pointerToOfferIndex(pointerX: number, pointerY: number): number | null {
    const panel = this.getSupplyPanel();
    const content = this.getPanelContentBounds(panel);
    const x = panel.x;
    const startY = content.top + 56;
    const cardWidth = 226;
    const cardHeight = 98;
    const cardStepY = 108;

    for (let index = 0; index < this.offer.length; index += 1) {
      const y = startY + index * cardStepY;
      if (Math.abs(pointerX - x) <= cardWidth / 2 && Math.abs(pointerY - y) <= cardHeight / 2) return index;
    }

    return null;
  }

  private selectFirstAvailableOffer(): void {
    this.offer = this.state.unlockedWeaponPool;
    this.selectedWeapon = this.offer.find((weaponId): weaponId is WeaponId => weaponId !== null) ?? null;
    this.selectedRotation = 0;
  }

  private selectWeaponFromOffer(weaponId: WeaponId): void {
    this.clearPendingDrag();
    this.selectedPlacementId = null;
    this.selectedWeapon = weaponId;
    this.selectedRotation = 0;
    this.updateWeaponOfferSelection();
  }

  private createWeaponOfferHitArea(x: number, y: number, weaponId: WeaponId, width = 150, height = 106): void {
    const hitArea = this.registerInteractive(this.add.zone(x, y, width, height).setInteractive({ useHandCursor: true }).setDepth(25));
    hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) return;

      this.selectWeaponFromOffer(weaponId);
      if (!this.state.canAffordWeapon(weaponId)) {
        this.flashHint(UI_TEXT.messages.notEnoughSoft);
        return;
      }
      this.beginPendingWeaponDrag(
        pointer,
        weaponId,
        null,
        this.getDefaultGrabOffset(weaponId, this.selectedRotation),
        -1,
        this.selectedRotation,
      );
    });
  }

  private updateWeaponOfferSelection(): void {
    for (const view of this.weaponOfferViews) {
      const selected = view.weaponId !== null && this.selectedWeapon === view.weaponId;
      const affordable = view.weaponId !== null && this.state.canAffordWeapon(view.weaponId);
      view.bg.setFillStyle(selected ? 0x27301f : affordable ? 0x141b15 : 0x10120f, affordable ? 0.98 : 0.72);
      view.bg.setStrokeStyle(selected ? 3 : 2, selected ? TERMINAL_UI.accent : affordable ? TERMINAL_UI.stroke : 0x5b3530);
      view.label.setColor(selected ? '#f3ead2' : affordable ? '#d8d3b4' : '#9f8176');
    }
  }

  private getDefaultGrabOffset(weaponId: WeaponId, rotation: WeaponRotation = this.selectedRotation): { col: number; row: number } {
    const shape = getWeaponShape(weaponId, rotation);
    const maxCol = Math.max(...shape.map((cell) => cell.col));
    const maxRow = Math.max(...shape.map((cell) => cell.row));

    return [...shape].sort((a, b) => {
      const distanceA = Math.abs(a.col - maxCol / 2) + Math.abs(a.row - maxRow / 2);
      const distanceB = Math.abs(b.col - maxCol / 2) + Math.abs(b.row - maxRow / 2);
      return distanceA - distanceB || a.row - b.row || a.col - b.col;
    })[0];
  }

  private getPlacementGrabOffset(pointerX: number, pointerY: number, placement: PlacedWeapon): { col: number; row: number } {
    const pointerCell = this.pointerToGridCell(pointerX, pointerY);
    if (!pointerCell) return this.getDefaultGrabOffset(placement.weaponId, placement.rotation);

    const offset = {
      col: pointerCell.col - placement.col,
      row: pointerCell.row - placement.row,
    };

    return getWeaponShape(placement.weaponId, placement.rotation).some((cell) => cell.col === offset.col && cell.row === offset.row)
      ? offset
      : this.getDefaultGrabOffset(placement.weaponId, placement.rotation);
  }

  private updateDragPreview(pointerX: number, pointerY: number): void {
    if (!this.dragState || !this.gridMetrics) return;
    const shape = getWeaponShape(this.dragState.weaponId, this.dragState.rotation);
    const maxCol = Math.max(...shape.map((cell) => cell.col));
    const maxRow = Math.max(...shape.map((cell) => cell.row));

    this.dragState.preview.setPosition(
      pointerX + (maxCol / 2 - this.dragState.grabOffset.col) * this.gridMetrics.pitchX,
      pointerY + (maxRow / 2 - this.dragState.grabOffset.row) * this.gridMetrics.pitchY,
    );
  }

  private showSellDropZone(placement: PlacedWeapon): void {
    this.destroySellDropZone();

    const content = this.getPanelContentBounds(this.getLeftPanel());
    const width = 194;
    const height = 54;
    const x = content.left + width / 2;
    const y = content.bottom - height / 2;
    const refund = this.getWeaponSellValue(placement.weaponId);
    const bounds = new Phaser.Geom.Rectangle(x - width / 2, y - height / 2, width, height);

    const container = this.add.container(x, y).setDepth(950);
    const bg = this.add.rectangle(0, 0, width, height, 0x4d302c, 1).setStrokeStyle(3, 0xc44531, 0.95);
    const title = this.add
      .text(-width / 2 + 48, -8, 'Продать', {
        fontFamily: 'Trebuchet MS, Arial, sans-serif',
        fontSize: '19px',
        color: '#f3ead2',
        stroke: '#050805',
        strokeThickness: 3,
      })
      .setOrigin(0, 0.5);
    const icon = this.add.rectangle(-width / 2 + 24, 0, 24, 28, 0x1a0d0b, 1).setStrokeStyle(2, 0xd58c7e, 0.92);
    const shine = this.add.rectangle(0, -height / 2 + 5, width - 12, 2, 0xf1d37a, 0.3);
    const refundView = createCurrencyValue(this, width / 2 - 84, 13, refund, 'soft', {
      maxWidth: 72,
      fontSize: 15,
      iconSize: 19,
      gap: 4,
      color: '#f3ead2',
      originX: 0,
      depth: 951,
    });

    container.add([bg, shine, icon, title, refundView.container]);
    this.sellDropZone = { container, bg, title, bounds };
  }

  private updateSellDropZone(pointerX: number, pointerY: number): void {
    if (!this.sellDropZone) return;

    const active = this.isPointerOverSellDropZone(pointerX, pointerY);
    this.sellDropZone.bg
      .setFillStyle(active ? 0x6b322b : 0x4d302c, 1)
      .setStrokeStyle(active ? 4 : 3, active ? 0xf1d37a : 0xc44531, active ? 1 : 0.95);
    this.sellDropZone.title.setColor(active ? '#fff0a8' : '#f3ead2');
    this.sellDropZone.container.setScale(active ? 1.04 : 1);
  }

  private isPointerOverSellDropZone(pointerX: number, pointerY: number): boolean {
    return this.sellDropZone ? Phaser.Geom.Rectangle.Contains(this.sellDropZone.bounds, pointerX, pointerY) : false;
  }

  private destroySellDropZone(): void {
    this.sellDropZone?.container.destroy(true);
    this.sellDropZone = null;
  }

  private getWeaponSellValue(weaponId: WeaponId): number {
    return Math.floor(WEAPONS[weaponId].softCost * 0.5);
  }

  private clearDragState(removeListeners: boolean): void {
    this.clearPendingDrag();
    if (removeListeners) {
      this.input.off('pointermove', this.handleDragMove, this);
      this.input.off('pointerup', this.handleDragEnd, this);
    }

    if (!this.dragState) return;
    this.dragState.preview.destroy();
    for (const highlight of this.dragState.highlights) highlight.destroy();
    this.destroySellDropZone();
    this.dragState = null;
    this.input.off('pointermove', this.handleDragMove, this);
    this.input.off('pointerup', this.handleDragEnd, this);
  }

  private clearPendingDrag(): void {
    if (!this.pendingDrag) return;
    this.pendingDrag = null;
    this.input.off('pointermove', this.handlePendingDragMove, this);
    this.input.off('pointerup', this.handlePendingDragEnd, this);
  }

  private createUpgradeButton(x: number, y: number, label: string, cost: string, onClick: () => void): void {
    const container = this.add.container(x + 116, y);
    const bg = this.add.rectangle(0, 0, 228, 58, TERMINAL_UI.accentDark, 1).setStrokeStyle(2, TERMINAL_UI.accent);
    const text = this.createFittedText(-82, 0, label, 132, 17, '#f3ead2', 0);
    const price = this.add
      .text(84, 0, cost, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#f3ead2',
        stroke: '#050805',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    container.add([bg, text, price]);
    this.registerInteractive(container
      .setSize(228, 58)
      .setInteractive({ useHandCursor: true }))
      .on('pointerover', () => bg.setStrokeStyle(2, 0xf1d37a))
      .on('pointerout', () => bg.setStrokeStyle(2, TERMINAL_UI.accent))
      .on('pointerdown', onClick);
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    color: number,
    onClick: () => void,
    depth = 0,
  ): void {
    const button = this.registerInteractive(
      this.add.rectangle(x, y, width, height, color, 1).setDepth(depth).setStrokeStyle(2, TERMINAL_UI.stroke, 0.95).setInteractive({ useHandCursor: true }),
    );
    const shine = this.add.rectangle(x, y - height / 2 + 4, width - 12, 2, 0xf1d37a, 0.34).setDepth(depth + 1);
    const text = this.createFittedText(x, y, label, width - 18, Math.min(23, Math.floor(height * 0.52)), '#f3ead2').setDepth(depth + 2);
    button.on('pointerdown', onClick);
    button.on('pointerover', () => {
      button.setStrokeStyle(2, TERMINAL_UI.accent, 1);
      shine.setAlpha(0.62);
    });
    button.on('pointerout', () => {
      button.setStrokeStyle(2, TERMINAL_UI.stroke, 0.95);
      shine.setAlpha(0.34);
    });
  }

  private createCurrencyLine(
    x: number,
    y: number,
    label: string,
    amount: string | number,
    kind: CurrencyKind,
    maxWidth: number,
    fontSize: number,
    color: string,
  ): void {
    const price = createCurrencyValue(this, 0, 0, amount, kind, {
      maxWidth: Math.min(104, Math.floor(maxWidth * 0.46)),
      fontSize,
      iconSize: Math.round(fontSize * 1.45),
      color,
      originX: 0,
    });
    const gap = 6;
    const labelText = this.createFittedText(x, y, label, Math.max(36, maxWidth - price.container.width - gap), fontSize, color, 0);
    price.container.setPosition(x + labelText.width + gap, y);
  }

  private createCurrencyButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    amount: string | number,
    kind: CurrencyKind,
    color: number,
    onClick: () => void,
    depth = 0,
  ): void {
    const button = this.registerInteractive(
      this.add.rectangle(x, y, width, height, color, 1).setDepth(depth).setStrokeStyle(2, TERMINAL_UI.stroke, 0.95).setInteractive({ useHandCursor: true }),
    );
    const shine = this.add.rectangle(x, y - height / 2 + 4, width - 12, 2, 0xf1d37a, 0.34).setDepth(depth + 1);
    const fontSize = Math.min(23, Math.floor(height * 0.52));
    const iconSize = Math.max(16, Math.min(25, Math.floor(height * 0.55)));
    const price = createCurrencyValue(this, 0, 0, amount, kind, {
      maxWidth: Math.floor(width * 0.43),
      fontSize,
      iconSize,
      originX: 0,
      depth: depth + 2,
    });
    const gap = 8;
    const labelText = this.createFittedText(0, y, label, Math.max(28, width - price.container.width - gap - 22), fontSize, '#f3ead2', 0).setDepth(depth + 2);
    const contentWidth = labelText.width + gap + price.container.width;
    const contentLeft = x - contentWidth / 2;
    labelText.setX(contentLeft);
    price.container.setPosition(contentLeft + labelText.width + gap, y);

    button.on('pointerdown', onClick);
    button.on('pointerover', () => {
      button.setStrokeStyle(2, TERMINAL_UI.accent, 1);
      shine.setAlpha(0.62);
    });
    button.on('pointerout', () => {
      button.setStrokeStyle(2, TERMINAL_UI.stroke, 0.95);
      shine.setAlpha(0.34);
    });
  }

  private createFittedText(
    x: number,
    y: number,
    value: string,
    maxWidth: number,
    fontSize: number,
    color: string,
    originX = 0.5,
  ): Phaser.GameObjects.Text {
    const text = this.add
      .text(x, y, value, {
        fontFamily: 'Trebuchet MS, Arial, sans-serif',
        fontSize: `${fontSize}px`,
        color,
        stroke: '#050805',
        strokeThickness: 2,
        align: 'center',
      })
      .setOrigin(originX, 0.5);

    let nextSize = fontSize;
    while (text.width > maxWidth && nextSize > 11) {
      nextSize -= 1;
      text.setFontSize(nextSize);
    }

    if (text.width > maxWidth) {
      text.setWordWrapWidth(maxWidth, true);
    }

    return text;
  }

  private tryUpgrade(kind: 'hp' | 'cell' | 'rare'): void {
    const bought = kind === 'hp' ? this.state.buyBunkerHp() : kind === 'cell' ? this.state.buyGridCell() : this.state.buyRareChance();
    if (bought) saveRunProgress(this.state);
    this.showPrep();
    this.flashHint(bought ? UI_TEXT.messages.upgradeBought : UI_TEXT.messages.upgradeUnavailable);
  }

  private applyCheat(kind: 'soft' | 'million' | 'cells10' | 'stage' | 'base'): void {
    if (kind === 'soft') {
      this.state.soft += 1000;
      saveRunProgress(this.state);
      this.showPrep();
      this.flashHint(UI_TEXT.cheats.soft);
      return;
    }

    if (kind === 'million') {
      this.state.soft += 1_000_000;
      this.state.hard += 1_000_000;
      saveRunProgress(this.state);
      this.showPrep();
      this.flashHint('+1M soft + hard');
      return;
    }

    if (kind === 'cells10') {
      const added = this.state.cheatAddGridCells(10);
      saveRunProgress(this.state);
      this.showPrep();
      this.flashHint(`+${added} cells`);
      return;
    }

    if (kind === 'stage') {
      this.state.currentStage += 5;
      this.state.highestStage = Math.max(this.state.highestStage, this.state.currentStage);
      saveRunProgress(this.state);
      this.showPrep();
      this.flashHint(UI_TEXT.cheats.stage);
      return;
    }

    this.state.maxBunkerHp += 100;
    saveRunProgress(this.state);
    this.showPrep();
    this.flashHint(UI_TEXT.cheats.base);
  }

  private spawnCheatEnemies(): void {
    const battleScene = this.scene.get(SceneKeys.Battle) as Phaser.Scene & { spawnOneOfEachEnemyType: () => number };
    if (battleScene.spawnOneOfEachEnemyType() === 0) return;
    this.flashHint(UI_TEXT.cheats.spawnedEachType);
  }

  private equipEveryWeaponCheat(): void {
    const placedCount = this.state.cheatEquipEveryWeapon();
    this.selectedPlacementId = null;
    this.selectedWeapon = this.state.unlockedWeaponPool[0] ?? null;
    this.selectedRotation = 0;
    saveRunProgress(this.state);
    this.showPrep();
    this.flashHint(`${UI_TEXT.cheats.equippedEveryWeapon}: ${placedCount}`);
  }

  private resetAllProgress(): void {
    clearAllSurvStorage();
    resetSharedRunState();
    this.tutorialCompleted.clear();
    this.activeTab = 'fight';
    this.activeUpgradesSubTab = 'weapons';
    this.selectedPlacementId = null;
    this.selectedWeapon = this.state.unlockedWeaponPool[0] ?? null;
    this.selectedArsenalCategory = 'pistols';
    this.selectedArsenalWeapon = 'pistol';
    this.weaponUpgradeScrollY = 0;
    this.cheatsOpen = false;
    this.showPrep();
    this.flashHint('Progress reset');
  }

  private adjustRoadBound(side: 'left' | 'right', delta: number): void {
    moveRoadBound(side, delta);
    DEBUG_FLAGS.showRoadBounds = true;
    this.showPrep();
  }

  private selectCheatEnemy(direction: number): void {
    const optionCount = ENEMIES.length + 1;
    this.selectedCheatEnemyIndex = (this.selectedCheatEnemyIndex + direction + optionCount) % optionCount;
    this.showPrep();
  }

  private getSelectedCheatEnemyId(): EnemyId | null {
    return this.selectedCheatEnemyIndex === 0 ? null : ENEMIES[this.selectedCheatEnemyIndex - 1]?.id ?? null;
  }

  private getEnemyCheatLabel(enemyId: EnemyId): string {
    return ENEMIES.find((enemy) => enemy.id === enemyId)?.name ?? enemyId;
  }

  private drawCheatEnemyPreview(enemyId: EnemyId, x: number, y: number, displaySize: number): void {
    const frameKey = EnemyFrameKeys[enemyId].walk[0];
    const previewSize = Math.min(displaySize, 92);
    this.add.sprite(x, y, frameKey).setDepth(82).setOrigin(0.5).setDisplaySize(previewSize, previewSize);
  }

  private adjustEnemyScale(delta: number): void {
    const enemyId = this.getSelectedCheatEnemyId();
    const settings = loadGameSettings();
    const currentScale = enemyId ? settings.enemyScales[enemyId] ?? settings.enemyScale : settings.enemyScale;
    const nextSettings = this.updateSelectedEnemyScale(currentScale + delta);
    const nextScale = enemyId ? nextSettings.enemyScales[enemyId] ?? nextSettings.enemyScale : nextSettings.enemyScale;
    this.showPrep();
    this.flashHint(`${this.getSelectedEnemyScaleLabel()}: ${Math.round(nextScale * 100)}%`);
  }

  private resetEnemyScale(): void {
    const defaultScale = getDefaultEnemyScale(this.getSelectedCheatEnemyId() ?? undefined);
    this.updateSelectedEnemyScale(defaultScale);
    this.showPrep();
    this.flashHint(`${this.getSelectedEnemyScaleLabel()}: ${Math.round(defaultScale * 100)}%`);
  }

  private selectCheatWeapon(direction: number): void {
    const weaponIds = this.getCheatWeaponIds();
    this.selectedCheatWeaponIndex = (this.selectedCheatWeaponIndex + direction + weaponIds.length) % weaponIds.length;
    this.showPrep();
  }

  private selectCheatWeaponRotation(direction: number): void {
    this.selectedCheatWeaponRotation = this.toWeaponIconRotation(this.selectedCheatWeaponRotation + direction);
    this.showPrep();
  }

  private getSelectedCheatWeaponId(): WeaponId {
    return this.getCheatWeaponIds()[this.selectedCheatWeaponIndex] ?? 'pistol';
  }

  private drawCheatWeaponPreview(weaponId: WeaponId, rotation: WeaponIconRotation, x: number, y: number): void {
    const shape = getWeaponShape(weaponId, rotation);
    const cols = Math.max(...shape.map((cell) => cell.col)) + 1;
    const rows = Math.max(...shape.map((cell) => cell.row)) + 1;
    const slot = 24;
    const gap = 4;
    const width = cols * slot + (cols - 1) * gap;
    const height = rows * slot + (rows - 1) * gap;
    const startX = x - width / 2;
    const startY = y - height / 2;

    for (const cell of shape) {
      this.add
        .rectangle(startX + cell.col * (slot + gap) + slot / 2, startY + cell.row * (slot + gap) + slot / 2, slot, slot, TERMINAL_UI.slot, 0.92)
        .setDepth(82)
        .setStrokeStyle(1, TERMINAL_UI.stroke, 0.72);
    }

    this.drawWeaponIcon(x, y, weaponId, width, height, rotation, this.getGridWeaponIconTuning(weaponId)).setDepth(83);
  }

  private drawWeaponTuningControl(
    left: number,
    right: number,
    y: number,
    label: string,
    key: WeaponIconTuningKey,
    minusLabel: string,
    plusLabel: string,
    step: number,
    guard: (action: () => void) => () => void,
  ): void {
    const weaponId = this.getSelectedCheatWeaponId();
    const value = this.getWeaponIconTuning(weaponId)[key];
    const shownValue = key === 'scaleBoost' ? `${Math.round(value * 100)}%` : `${value}px`;

    this.createFittedText(left + 20, y, label, 54, 13, '#aeb89b', 0).setDepth(82);
    this.createButton(left + 98, y, 58, 28, minusLabel, 0x2f6062, guard(() => this.adjustSelectedWeaponIconTuning(key, -step)), 81);
    this.createFittedText((left + right) / 2 + 12, y, shownValue, 78, 13, '#f3ead2').setDepth(82);
    this.createButton(right - 42, y, 58, 28, plusLabel, 0x2f6062, guard(() => this.adjustSelectedWeaponIconTuning(key, step)), 81);
  }

  private adjustSelectedWeaponIconTuning(key: WeaponIconTuningKey, delta: number): void {
    const weaponId = this.getSelectedCheatWeaponId();
    const tuning = this.getWeaponIconTuning(weaponId);
    const nextValue = key === 'scaleBoost' ? Phaser.Math.Clamp(tuning[key] + delta, 0.2, 3) : Phaser.Math.Clamp(tuning[key] + delta, -80, 80);
    tuning[key] = key === 'scaleBoost' ? Math.round(nextValue * 100) / 100 : Math.round(nextValue);
    this.showPrep();
    this.flashHint(`${weaponId}: size ${Math.round(tuning.scaleBoost * 100)}% x ${tuning.offsetX} y ${tuning.offsetY}`);
  }

  private resetSelectedWeaponIconTuning(): void {
    const weaponId = this.getSelectedCheatWeaponId();
    WEAPON_GRID_ICON_TUNING[weaponId] = { ...DEFAULT_WEAPON_GRID_ICON_TUNING[weaponId] };
    this.showPrep();
    this.flashHint(`${weaponId}: reset icon`);
  }

  private getWeaponIconTuning(weaponId: WeaponId): Required<WeaponIconVisualTuning> {
    return WEAPON_GRID_ICON_TUNING[weaponId];
  }

  private drawTutorialOverlay(): void {
    const target = this.getTutorialTarget();
    if (!target) {
      this.clearTutorialOverlay(true);
      return;
    }

    const depth = 1700;
    const handWidth = 154;
    const handHeight = 84;
    const originX = 0.24;
    const originY = 0.72;
    const targetPoint = this.clampTutorialHandPoint(target.target, handWidth, handHeight, originX, originY);
    const sourcePoint = this.clampTutorialHandPoint(target.source ?? new Phaser.Math.Vector2(target.target.x + 24, target.target.y - 22), handWidth, handHeight, originX, originY);
    const key = this.getTutorialOverlayKey(target, sourcePoint, targetPoint);
    if (this.tutorialOverlay?.key === key && this.tutorialOverlay.hand.active) return;

    this.clearTutorialOverlay(false);

    const hand = this.add.image(sourcePoint.x, sourcePoint.y, AssetKeys.UI.tutorialHand);
    hand.setDepth(depth).setOrigin(originX, originY).setDisplaySize(handWidth, handHeight).setAlpha(0);
    this.tutorialOverlay = { hand, key, loopTimer: null };

    const play = (): void => {
      if (!hand.scene || !hand.active) return;
      this.tweens.killTweensOf(hand);
      hand.setPosition(sourcePoint.x, sourcePoint.y).setAlpha(0);
      this.tweens.add({
        targets: hand,
        alpha: 0.96,
        duration: 260,
        ease: 'Sine.easeOut',
        onComplete: () => {
          if (!hand.scene || !hand.active) return;
          this.tweens.add({
            targets: hand,
            x: targetPoint.x,
            y: targetPoint.y,
            duration: target.source ? 760 : 420,
            ease: 'Sine.easeInOut',
            hold: 420,
            onComplete: () => {
              if (!hand.scene || !hand.active) return;
              this.tweens.add({
                targets: hand,
                alpha: 0,
                duration: 300,
                ease: 'Sine.easeIn',
                onComplete: () => {
                  if (!this.tutorialOverlay || this.tutorialOverlay.hand !== hand) return;
                  this.tutorialOverlay.loopTimer = this.time.delayedCall(620, play);
                },
              });
            },
          });
        },
      });
    };

    play();
  }

  private clearTutorialOverlay(destroyHand: boolean): void {
    if (!this.tutorialOverlay) return;
    if (this.tutorialOverlay.loopTimer) {
      this.tutorialOverlay.loopTimer.remove(false);
    }
    this.tweens.killTweensOf(this.tutorialOverlay.hand);
    if (destroyHand && this.tutorialOverlay.hand.active) {
      this.tutorialOverlay.hand.destroy();
    }
    this.tutorialOverlay = null;
  }

  private getTutorialOverlayKey(target: TutorialTarget, source: Phaser.Math.Vector2, destination: Phaser.Math.Vector2): string {
    return [
      target.step,
      Math.round(source.x),
      Math.round(source.y),
      Math.round(destination.x),
      Math.round(destination.y),
    ].join(':');
  }

  private clampTutorialHandPoint(point: Phaser.Math.Vector2, width: number, height: number, originX: number, originY: number): Phaser.Math.Vector2 {
    const margin = 6;
    return new Phaser.Math.Vector2(
      Phaser.Math.Clamp(point.x, width * originX + margin, this.scale.width - width * (1 - originX) - margin),
      Phaser.Math.Clamp(point.y, height * originY + margin, this.scale.height - height * (1 - originY) - margin),
    );
  }

  private getTutorialTarget(): TutorialTarget | null {
    this.syncTutorialAutoCompletion();
    if (this.settingsOpen || this.cheatsOpen || this.dragState || this.pendingDrag) return null;

    const step = TUTORIAL_STEPS.find((candidate) => !this.tutorialCompleted.has(candidate));
    if (!step) return null;
    return step === 'buy-weapon'
      ? this.getBuyWeaponTutorialTarget()
      : step === 'upgrade-weapon'
        ? this.getUpgradeWeaponTutorialTarget()
        : this.getBuyCellTutorialTarget();
  }

  private getBuyWeaponTutorialTarget(): TutorialTarget | null {
    const candidate = this.findTutorialWeaponPlacementCandidate();
    if (!candidate) return null;

    if (this.activeTab !== 'equip') {
      return this.createTabTutorialTarget('buy-weapon', 'equip', 'Открой склад оружия');
    }

    const offerView = this.weaponOfferViews.find((view) => view.weaponId === candidate.weaponId);
    const gridPoint = this.getGridCellCenter(candidate.col, candidate.row);
    if (!offerView || !gridPoint) return null;

    return {
      step: 'buy-weapon',
      message: 'Перетащи оружие в свободные ячейки',
      source: new Phaser.Math.Vector2(offerView.bounds.centerX, offerView.bounds.centerY),
      target: gridPoint,
      focus: this.createCenteredRect(gridPoint.x, gridPoint.y, this.gridMetrics?.slotWidth ?? 58, this.gridMetrics?.slotHeight ?? 58),
    };
  }

  private getUpgradeWeaponTutorialTarget(): TutorialTarget | null {
    const candidate = this.findTutorialWeaponUpgradeCandidate();
    if (!candidate) return null;

    if (this.activeTab !== 'upgrades') {
      return this.createTabTutorialTarget('upgrade-weapon', 'upgrades', 'Открой улучшения');
    }

    if (this.activeUpgradesSubTab !== 'weapons') {
      const subTab = this.getUpgradeSubTabBounds('weapons');
      return {
        step: 'upgrade-weapon',
        message: 'Выбери оружие',
        target: new Phaser.Math.Vector2(subTab.centerX, subTab.centerY),
        focus: subTab,
      };
    }

    if (this.selectedArsenalWeapon !== candidate.weaponId) {
      return this.getArsenalWeaponCardTutorialTarget(candidate.weaponId);
    }

    return this.getWeaponUpgradeRowTutorialTarget(candidate.statId);
  }

  private getBuyCellTutorialTarget(): TutorialTarget | null {
    const cost = this.state.getNextGridCellCost();
    if (cost === null || this.state.soft < cost) return null;

    if (this.activeTab !== 'equip') {
      return this.createTabTutorialTarget('buy-cell', 'equip', 'Вернись к сетке');
    }

    const button = this.getGridCellPurchaseButtonBounds();
    return {
      step: 'buy-cell',
      message: 'Купи ячейку для большого оружия',
      target: new Phaser.Math.Vector2(button.centerX, button.centerY),
      focus: button,
    };
  }

  private createTabTutorialTarget(step: TutorialStepId, tab: PrepTab, message: string): TutorialTarget {
    const bounds = this.getPrepTabBounds(tab);
    return {
      step,
      message,
      target: new Phaser.Math.Vector2(bounds.centerX, bounds.centerY),
      focus: bounds,
    };
  }

  private findTutorialWeaponPlacementCandidate(): { weaponId: WeaponId; col: number; row: number } | null {
    for (const weaponId of this.state.unlockedWeaponPool) {
      if (!this.state.canAffordWeapon(weaponId)) continue;
      const cell = this.findFirstValidPlacementCell(weaponId);
      if (cell) return { weaponId, col: cell.col, row: cell.row };
    }

    return null;
  }

  private findFirstValidPlacementCell(weaponId: WeaponId): { col: number; row: number } | null {
    for (let row = 0; row < this.state.gridRows; row += 1) {
      for (let col = 0; col < this.state.gridCols; col += 1) {
        if (this.state.canPlaceWeapon(weaponId, col, row, 0)) return { col, row };
      }
    }

    return null;
  }

  private findTutorialWeaponUpgradeCandidate(): { weaponId: WeaponId; statId: WeaponUpgradeStatId } | null {
    for (const placement of this.state.placedWeapons) {
      const progress = this.state.getWeaponProgress(placement.weaponId);
      for (const stat of WEAPONS[placement.weaponId].upgradeStats) {
        const cost = this.state.getWeaponStatUpgradeCost(placement.weaponId, stat.id);
        if (progress.unlocked && cost !== null && this.state.soft >= cost) return { weaponId: placement.weaponId, statId: stat.id };
      }
    }

    for (const weaponId of this.state.unlockedWeaponPool) {
      const progress = this.state.getWeaponProgress(weaponId);
      for (const stat of WEAPONS[weaponId].upgradeStats) {
        const cost = this.state.getWeaponStatUpgradeCost(weaponId, stat.id);
        if (progress.unlocked && cost !== null && this.state.soft >= cost) return { weaponId, statId: stat.id };
      }
    }

    return null;
  }

  private getWeaponUpgradeRowTutorialTarget(statId: WeaponUpgradeStatId): TutorialTarget | null {
    const panel = this.getRightPanel();
    const content = this.getPanelContentBounds(panel);
    const weapon = WEAPONS[this.selectedArsenalWeapon];
    const index = weapon.upgradeStats.findIndex((stat) => stat.id === statId);
    if (index < 0) return null;

    const listTop = content.top + 194;
    const rowSpacing = 50;
    const y = listTop - this.weaponUpgradeScrollY + 21 + index * rowSpacing;
    if (y < listTop || y > content.bottom) return null;

    const bounds = this.createCenteredRect(panel.x, y, content.width, 42);
    return {
      step: 'upgrade-weapon',
      message: 'Улучши оружие',
      target: new Phaser.Math.Vector2(bounds.centerX, bounds.centerY),
      focus: bounds,
    };
  }

  private getArsenalWeaponCardTutorialTarget(weaponId: WeaponId): TutorialTarget | null {
    if (WEAPONS[weaponId].category !== this.selectedArsenalCategory) {
      const categoryIndex = WEAPON_CATEGORIES.findIndex((category) => category.id === WEAPONS[weaponId].category);
      if (categoryIndex < 0) return null;

      const content = this.getPanelContentBounds(this.getLeftPanel());
      const tabGap = 4;
      const tabWidth = Math.floor((content.width - tabGap * (WEAPON_CATEGORIES.length - 1)) / WEAPON_CATEGORIES.length);
      const x = content.left + tabWidth / 2 + categoryIndex * (tabWidth + tabGap);
      const bounds = this.createCenteredRect(x, content.top + 26, tabWidth, 30);
      return {
        step: 'upgrade-weapon',
        message: 'Выбери тип оружия',
        target: new Phaser.Math.Vector2(bounds.centerX, bounds.centerY),
        focus: bounds,
      };
    }

    const content = this.getPanelContentBounds(this.getLeftPanel());
    const index = this.getWeaponsInCategory(this.selectedArsenalCategory).indexOf(weaponId);
    if (index < 0) return null;

    const bounds = this.createCenteredRect(content.centerX, content.top + 88 + index * 70, content.width, 60);
    return {
      step: 'upgrade-weapon',
      message: 'Выбери это оружие',
      target: new Phaser.Math.Vector2(bounds.centerX, bounds.centerY),
      focus: bounds,
    };
  }

  private getPrepTabBounds(tab: PrepTab): Phaser.Geom.Rectangle {
    const { width, height } = this.scale;
    const y = height - 38;
    const tabButtons: Record<PrepTab, { x: number; width: number; height: number }> = {
      shop: { x: width / 2 - 360, width: 144, height: 52 },
      equip: { x: width / 2 - 190, width: 144, height: 52 },
      fight: { x: width / 2, width: 190, height: 60 },
      upgrades: { x: width / 2 + 230, width: 154, height: 52 },
    };
    const button = tabButtons[tab];
    return this.createCenteredRect(button.x, y, button.width, button.height);
  }

  private getUpgradeSubTabBounds(tab: UpgradesSubTab): Phaser.Geom.Rectangle {
    const panel = this.getLeftPanel();
    const y = panel.y - panel.height / 2 + 20;
    const tabWidth = 128;
    const gap = 8;
    const index = tab === 'weapons' ? 0 : 1;
    const x = panel.x - tabWidth / 2 - gap / 2 + index * (tabWidth + gap);
    return this.createCenteredRect(x, y, tabWidth, 30);
  }

  private getGridCellPurchaseButtonBounds(): Phaser.Geom.Rectangle {
    const content = this.getPanelContentBounds(this.getLeftPanel());
    const width = 194;
    const height = 44;
    return this.createCenteredRect(content.left + width / 2, content.bottom - height / 2, width, height);
  }

  private getGridCellCenter(col: number, row: number): Phaser.Math.Vector2 | null {
    if (!this.gridMetrics) return null;
    return new Phaser.Math.Vector2(
      this.gridMetrics.startX + col * this.gridMetrics.pitchX + this.gridMetrics.slotWidth / 2,
      this.gridMetrics.startY + row * this.gridMetrics.pitchY + this.gridMetrics.slotHeight / 2,
    );
  }

  private createCenteredRect(x: number, y: number, width: number, height: number): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(x - width / 2, y - height / 2, width, height);
  }

  private syncTutorialAutoCompletion(): void {
    if (this.state.placedWeapons.length > 1) this.completeTutorialStep('buy-weapon', false);
    if (this.state.activeCells > IDLE_GRID_CONFIG.startCols * IDLE_GRID_CONFIG.startRows) this.completeTutorialStep('buy-cell', false);
    if (this.hasAnyWeaponUpgrade()) this.completeTutorialStep('upgrade-weapon', false);
  }

  private hasAnyWeaponUpgrade(): boolean {
    return (Object.keys(WEAPONS) as WeaponId[]).some((weaponId) => {
      const progress = this.state.getWeaponProgress(weaponId);
      return Object.values(progress.stats).some((level) => level > 0);
    });
  }

  private completeTutorialStep(step: TutorialStepId, persist = true): void {
    if (this.tutorialCompleted.has(step)) return;
    this.tutorialCompleted.add(step);
    if (persist) this.saveTutorialCompletion();
  }

  private loadTutorialCompletion(): Set<TutorialStepId> {
    try {
      const raw = globalThis.localStorage?.getItem(TUTORIAL_STORAGE_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set();
      return new Set(parsed.filter((step): step is TutorialStepId => TUTORIAL_STEPS.includes(step as TutorialStepId)));
    } catch {
      return new Set();
    }
  }

  private saveTutorialCompletion(): void {
    try {
      globalThis.localStorage?.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify([...this.tutorialCompleted]));
    } catch {
      // Tutorial persistence is optional; gameplay should keep working without storage.
    }
  }

  private getCheatWeaponIds(): WeaponId[] {
    return Object.keys(WEAPONS) as WeaponId[];
  }

  private exposeWeaponIconTuningForDevTools(): void {
    const snapshot = Object.fromEntries(
      this.getCheatWeaponIds().map((weaponId) => [
        weaponId,
        {
          ...this.getWeaponIconTuning(weaponId),
        },
      ]),
    );
    (globalThis as typeof globalThis & { __survWeaponIconTuning?: typeof snapshot }).__survWeaponIconTuning = snapshot;
  }

  private toWeaponIconRotation(rotation: number): WeaponIconRotation {
    return (((rotation % 4) + 4) % 4) as WeaponIconRotation;
  }

  private updateSelectedEnemyScale(value: number): GameSettings {
    const enemyId = this.getSelectedCheatEnemyId();
    const settings = loadGameSettings();
    if (!enemyId) {
      return updateGameSettings({ enemyScale: value });
    }

    return updateGameSettings({
      enemyScales: {
        ...settings.enemyScales,
        [enemyId]: value,
      },
    });
  }

  private getSelectedEnemyScaleLabel(): string {
    const enemyId = this.getSelectedCheatEnemyId();
    return enemyId ? this.getEnemyCheatLabel(enemyId) : UI_TEXT.cheats.allEnemies;
  }

  private flashHint(message: string): void {
    const hint = this.add
      .text(this.scale.width / 2, this.scale.height - 34, message, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#f3ead2',
        backgroundColor: '#0b100dcc',
        padding: { left: 12, right: 12, top: 6, bottom: 6 },
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0, y: hint.y - 20, duration: 900, delay: 350, onComplete: () => hint.destroy() });
  }
}

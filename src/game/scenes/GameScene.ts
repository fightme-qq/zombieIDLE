import Phaser from 'phaser';
import { AssetKeys } from '../assets/assetManifest';
import { DEBUG_FLAGS } from '../config/debugFlags';
import { moveRoadBound, ROAD_BOUNDS, ROAD_BOUNDS_LIMITS } from '../config/roadBounds';
import { SceneKeys } from '../config/sceneKeys';
import { getStageWave } from '../data/stageWaveData';
import {
  WEAPON_CATEGORIES,
  WEAPONS,
  type WeaponCategoryId,
  type WeaponId,
  type WeaponUpgradeStatId,
} from '../data/weaponData';
import { getWeaponComputedStats, getWeaponDps, getWeaponTotalLevel } from '../idle/WeaponStats';
import { gameplayStart, gameplayStop } from '../platform/yandexGames';
import { getWeaponShape, rotateWeaponRotation, type PlacedWeapon, type WeaponRotation } from '../state/RunState';
import { sharedRunState } from '../state/sharedRunState';
import { createCurrencyValue, type CurrencyKind } from '../ui/currencyUi';
import { toggleLocale, UI_TEXT } from '../ui/uiText';

type PrepTab = 'fight' | 'equip' | 'upgrades' | 'shop';
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

type GridMetrics = {
  slotSize: number;
  gap: number;
  pitch: number;
  cols: number;
  rows: number;
  startX: number;
  startY: number;
};

type WeaponOfferView = {
  weaponId: WeaponId | null;
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
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

const PREP_TABS: PrepTab[] = ['fight', 'equip', 'upgrades', 'shop'];
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
  private gridMetrics: GridMetrics | null = null;
  private dragState: DragState | null = null;
  private pendingDrag: PendingDragState | null = null;
  private weaponOfferViews: WeaponOfferView[] = [];
  private selectedRotation: WeaponRotation = 0;
  private selectedPlacementId: number | null = null;
  private settingsOpen = false;
  private readonly dragStartDistance = 12;

  constructor() {
    super(SceneKeys.Game);
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', this.handlePointerDown, this);
    gameplayStart();
    this.showPrep();
  }

  update(_time: number, _delta: number): void {}

  shutdown(): void {
    this.input.off('pointerdown', this.handlePointerDown, this);
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
  }

  private drawFightTab(): void {
    this.drawFightStatsPanel();
    this.drawFightLoadoutPanel();
  }

  private drawFightStatsPanel(): void {
    const panel = this.getLeftPanel();
    const content = this.getPanelContentBounds(panel);
    const activeCells = `${this.state.activeCells}/${this.state.maxGridCols * this.state.maxGridRows}`;
    const rows: Array<[string, string, string]> = [
      [UI_TEXT.fight.autoRunning, '', '#d8d3b4'],
      [UI_TEXT.stats.mounted, `${this.state.equippedWeaponIds.length}`, '#f3ead2'],
      [UI_TEXT.stats.dps, `${Math.round(this.state.equippedDps)}`, '#d6b85a'],
      [UI_TEXT.stats.cells, activeCells, '#f3ead2'],
      [UI_TEXT.stats.stage, `${this.state.currentStage}`, '#f3ead2'],
      [UI_TEXT.stats.best, `${this.state.highestStage}`, '#f3ead2'],
      [UI_TEXT.stats.base, `${this.state.maxBunkerHp}`, '#88c56b'],
    ];

    rows.forEach(([label, value, color], index) => {
      const y = content.top + 8 + index * 42;
      this.add.rectangle(content.centerX, y, content.width, 32, index === 0 ? 0x152015 : 0x0b100d, 0.82).setStrokeStyle(1, TERMINAL_UI.strokeDim, 0.72);
      if (value === '') {
        this.createFittedText(content.centerX, y, label, content.width - 28, 16, color);
        return;
      }

      this.createFittedText(content.left + 18, y, label, 160, 15, '#aeb89b', 0);
      this.createFittedText(content.right - 18, y, value, 120, 18, color, 1);
    });
  }

  private drawFightLoadoutPanel(): void {
    const panel = this.getRightPanel();
    const content = this.getPanelContentBounds(panel);
    const placements = this.state.placedWeapons.slice(0, 5);

    this.createFittedText(content.left, content.top, UI_TEXT.tabs.equip, content.width, 22, '#f3ead2', 0);
    this.add.rectangle(content.centerX, content.top + 24, content.width, 1, TERMINAL_UI.accent, 0.44);

    const summaryRows: Array<{ label: string; value: string; color: string; currency?: CurrencyKind }> = [
      { label: UI_TEXT.stats.kills, value: `${getStageWave(this.state.currentStage).totalEnemies}`, color: '#d6b85a' },
      { label: '', value: '+', color: '#f3ead2', currency: 'soft' },
      { label: UI_TEXT.stats.base, value: `${this.state.maxBunkerHp}`, color: '#88c56b' },
    ];

    summaryRows.forEach(({ label, value, color, currency }, index) => {
      const y = content.top + 58 + index * 38;
      this.add.rectangle(content.centerX, y, content.width, 30, 0x0b100d, 0.78).setStrokeStyle(1, TERMINAL_UI.strokeDim, 0.68);
      if (currency) {
        createCurrencyValue(this, content.left + 18, y, '', currency, { maxWidth: 90, fontSize: 16, iconSize: 22, originX: 0 });
      } else {
        this.createFittedText(content.left + 18, y, label, 180, 14, '#aeb89b', 0);
      }
      this.createFittedText(content.right - 18, y, value, 120, 17, color, 1);
    });

    this.createFittedText(content.left, content.top + 186, UI_TEXT.stats.mounted, content.width, 18, '#d8d3b4', 0);
    this.add.rectangle(content.centerX, content.top + 208, content.width, 1, TERMINAL_UI.strokeDim, 0.72);

    placements.forEach((placement, index) => {
      const weapon = WEAPONS[placement.weaponId];
      const dps = getWeaponDps(placement.weaponId, this.state.getWeaponProgress(placement.weaponId));
      const y = content.top + 240 + index * 42;
      this.add.rectangle(content.centerX, y, content.width, 32, 0x10120f, 0.76).setStrokeStyle(1, TERMINAL_UI.strokeDim, 0.62);
      this.createFittedText(content.left + 18, y, weapon.name, 210, 15, '#f3ead2', 0);
      this.createFittedText(content.right - 18, y, `${UI_TEXT.stats.dps} ${Math.round(dps)}`, 130, 15, '#d6b85a', 1);
    });
  }

  private drawEquipTab(): void {
    this.drawEquipSummary();
    this.drawLoadoutGrid();
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
    this.drawArsenalList();
    this.drawSelectedArsenalWeapon();
  }

  private drawGlobalUpgradeStrip(): void {
    const panel = this.getLeftPanel();

    this.createFittedText(panel.x - panel.width / 2 + 26, 112, UI_TEXT.upgrades.baseTitle, 180, 18, '#f3ead2', 0);
    this.add.rectangle(panel.x + 76, 112, panel.width - 210, 1, TERMINAL_UI.accent, 0.44);

    this.createBaseUpgradeChip(panel.x - 140, 154, UI_TEXT.upgrades.durability, 25, () => this.tryUpgrade('hp'));
    this.createBaseUpgradeChip(panel.x, 154, UI_TEXT.upgrades.cell, this.state.getNextGridCellCost(), () => this.tryUpgrade('cell'));
    this.createBaseUpgradeChip(panel.x + 140, 154, UI_TEXT.upgrades.rareRoll, 25, () => this.tryUpgrade('rare'));
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
        this.createCurrencyLine(content.left + 136, y + 13, UI_TEXT.upgrades.unlock, weapon.unlockCost, 'soft', content.width - 168, 13, '#d58c7e');
      }

      this.add
        .zone(content.centerX, y, content.width, 60)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
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
    this.drawWeaponStatPill(content.right - 42, content.top + 154, `${UI_TEXT.stats.speedShort} ${stats.projectileSpeed}`);

    if (!progress.unlocked) {
      this.createCurrencyButton(content.centerX, content.top + 240, 230, 46, UI_TEXT.upgrades.unlock, weapon.unlockCost, 'soft', this.state.soft >= weapon.unlockCost ? 0x4a743c : 0x4d302c, () => {
        if (!this.state.unlockWeapon(weaponId)) {
        this.flashHint(UI_TEXT.messages.notEnoughSoft);
        return;
      }
      this.selectFirstAvailableOffer();
      this.showPrep();
      this.flashHint(`${weapon.name}: ${UI_TEXT.upgrades.owned}`);
      });
      return;
    }

    weapon.upgradeStats.forEach((stat, index) => {
      const y = content.top + 214 + index * 50;
      const level = progress.stats[stat.id];
      const cost = this.state.getWeaponStatUpgradeCost(weaponId, stat.id);
      const maxed = cost === null;
      const affordable = cost !== null && this.state.soft >= cost;

      this.drawWeaponUpgradeRow(
        panel.x,
        y,
        content.width,
        this.getWeaponStatLabel(stat.id),
        this.getWeaponStatEffectLabel(stat.id, level),
        `${UI_TEXT.upgrades.level} ${level}/${stat.maxLevel}`,
        maxed ? UI_TEXT.upgrades.max : `${cost}`,
        affordable,
        maxed,
        () => {
        if (!this.state.upgradeWeaponStat(weaponId, stat.id)) {
          this.flashHint(UI_TEXT.messages.upgradeUnavailable);
          return;
        }
        this.showPrep();
        this.flashHint(`${this.getWeaponStatLabel(stat.id)} ${UI_TEXT.upgrades.upgraded}`);
        },
      );
    });
  }

  private getWeaponsInCategory(categoryId: WeaponCategoryId): WeaponId[] {
    return (Object.keys(WEAPONS) as WeaponId[]).filter((weaponId) => weaponId !== 'starter_pistol' && WEAPONS[weaponId].category === categoryId);
  }

  private getFirstWeaponInCategory(categoryId: WeaponCategoryId): WeaponId {
    return this.getWeaponsInCategory(categoryId)[0] ?? 'pistol';
  }

  private getWeaponStatEffectLabel(statId: WeaponUpgradeStatId, level: number): string {
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
    const icon = this.drawWeaponIcon(x, y, weaponId, maxWidth * boundsBoost, maxHeight * boundsBoost, this.getArsenalIconRotation(weaponId));
    if (weaponId === 'sniperRifle' || weaponId === 'tesla') {
      icon.setScale(-1, 1);
    }
    return icon;
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
    const availableHeight = content.bottom - startY - 12;
    const slotSize = Math.max(22, Math.floor(Math.min(58, (availableWidth - gap * (cols - 1)) / cols, (availableHeight - gap * (rows - 1)) / rows)));
    const pitch = slotSize + gap;
    const startX = panel.x - (pitch * cols - gap) / 2;
    const panelWidth = pitch * cols + 18;
    const panelHeight = pitch * rows + 18;
    const occupied = this.state.occupiedCells;

    this.gridMetrics = { slotSize, gap, pitch, cols, rows, startX, startY };

    this.add
      .rectangle(startX + (pitch * cols - gap) / 2, startY + (pitch * rows - gap) / 2, panelWidth, panelHeight, 0x182216, 1)
      .setStrokeStyle(3, TERMINAL_UI.stroke, 0.95);

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = startX + col * pitch;
        const y = startY + row * pitch;
        const active = this.state.isCellActive(col, row);
        const filled = occupied.has(`${col}:${row}`);
        const fill = !active ? TERMINAL_UI.slotLocked : filled ? 0x3c5c35 : TERMINAL_UI.slot;
        const alpha = active ? 1 : 0.48;

        const rect = this.add
          .rectangle(x + slotSize / 2, y + slotSize / 2, slotSize, slotSize, fill, alpha)
          .setStrokeStyle(2, active ? 0x4f6445 : 0x263226, active ? 1 : 0.55)
          .setInteractive({ useHandCursor: true });

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

          if (!this.selectedWeapon) return;
          if (!this.canBuySelectedOffer()) {
            this.flashHint(UI_TEXT.messages.notEnoughSoft);
            return;
          }
          if (!this.state.buyAndPlaceWeapon(this.selectedWeapon, col, row, this.selectedRotation)) {
            this.showPrep();
            this.flashHint(UI_TEXT.messages.weaponNoFit);
            return;
          }

          this.consumeSelectedOffer();
          this.showPrep();
        });
      }
    }

    for (const placement of this.state.placedWeapons) {
      const shape = getWeaponShape(placement.weaponId, placement.rotation);
      const maxCol = Math.max(...shape.map((cell) => cell.col));
      const maxRow = Math.max(...shape.map((cell) => cell.row));
      const x = startX + (placement.col + (maxCol + 1) / 2) * pitch - gap / 2;
      const y = startY + (placement.row + (maxRow + 1) / 2) * pitch - gap / 2;
      const iconBounds = this.getGridIconBounds(placement.weaponId, placement.rotation);
      const icon = this.drawWeaponIcon(x, y, placement.weaponId, iconBounds.width, iconBounds.height, placement.rotation);
      const hitWidth = (maxCol + 1) * pitch;
      const hitHeight = (maxRow + 1) * pitch;
      if (placement.id === this.selectedPlacementId) {
        this.add.rectangle(x, y, hitWidth, hitHeight, 0x000000, 0).setStrokeStyle(3, TERMINAL_UI.accent, 0.95).setDepth(13);
      }
      icon.setSize(hitWidth, hitHeight);
      icon.setInteractive(new Phaser.Geom.Rectangle(-hitWidth / 2, -hitHeight / 2, hitWidth, hitHeight), Phaser.Geom.Rectangle.Contains);
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
        this.weaponOfferViews.push({ weaponId, bg, label });
        this.drawWeaponIcon(cardX + iconX, y, weaponId, 40, 32, 0);
        card.setSize(cardWidth, cardHeight);
        this.createWeaponOfferHitArea(cardX, y, weaponId, cardWidth, cardHeight);
      });
    });

    const hint = this.createFittedText(content.centerX, content.bottom - 18, UI_TEXT.equip.dragHint, content.width, 16, '#d8d3b4');
    hint.setAlpha(0.58);
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

    this.createButton(width - 92, y, 148, 52, UI_TEXT.buttons.settings, this.settingsOpen ? 0x6b4f86 : TERMINAL_UI.panel, () => {
      this.settingsOpen = !this.settingsOpen;
      this.showPrep();
    });

    if (this.settingsOpen) {
      this.drawSettingsPanel();
    }
  }

  private drawSettingsPanel(): void {
    const x = this.scale.width - 156;
    const y = this.scale.height - 330;

    this.add.rectangle(x, y, 280, 500, TERMINAL_UI.panelStrong, 0.96).setDepth(80).setStrokeStyle(2, 0x6b4f86, 0.95);
    this.add
      .text(x, y - 176, UI_TEXT.settings.title, {
        fontFamily: 'Trebuchet MS, Arial, sans-serif',
        fontSize: '20px',
        color: '#f3ead2',
        stroke: '#050805',
        strokeThickness: 3,
      })
      .setDepth(81)
      .setOrigin(0.5);

    this.createFittedText(x - 104, y - 142, UI_TEXT.settings.language, 100, 15, '#aeb89b', 0).setDepth(82);
    this.createButton(x + 48, y - 142, 132, 36, UI_TEXT.settings.switchLanguage, 0x4c5f87, () => {
      toggleLocale();
      this.showPrep();
    }, 81);

    this.createFittedText(x, y - 102, UI_TEXT.settings.devTools, 220, 16, '#d8d3b4').setDepth(82);

    this.createButton(x, y - 68, 218, 36, DEBUG_FLAGS.showRoadBounds ? UI_TEXT.cheats.hideBounds : UI_TEXT.cheats.showBounds, 0x2f6062, () => {
      DEBUG_FLAGS.showRoadBounds = !DEBUG_FLAGS.showRoadBounds;
      this.showPrep();
    }, 81);

    this.createFittedText(x, y - 24, UI_TEXT.cheats.roadBounds, 220, 16, '#d8d3b4').setDepth(82);
    this.createFittedText(
      x,
      y,
      `${UI_TEXT.cheats.leftShort} ${ROAD_BOUNDS.left}   ${UI_TEXT.cheats.rightShort} ${ROAD_BOUNDS.right}   ${ROAD_BOUNDS.right - ROAD_BOUNDS.left}`,
      220,
      14,
      '#bdfcff',
    ).setDepth(82);

    this.createFittedText(x - 104, y + 36, UI_TEXT.cheats.boundLeft, 84, 14, '#aeb89b', 0).setDepth(82);
    this.createButton(x - 4, y + 36, 72, 30, '-1', 0x2f6062, () => this.adjustRoadBound('left', -ROAD_BOUNDS_LIMITS.step), 81);
    this.createButton(x + 78, y + 36, 72, 30, '+1', 0x2f6062, () => this.adjustRoadBound('left', ROAD_BOUNDS_LIMITS.step), 81);

    this.createFittedText(x - 104, y + 74, UI_TEXT.cheats.boundRight, 84, 14, '#aeb89b', 0).setDepth(82);
    this.createButton(x - 4, y + 74, 72, 30, '-1', 0x2f6062, () => this.adjustRoadBound('right', -ROAD_BOUNDS_LIMITS.step), 81);
    this.createButton(x + 78, y + 74, 72, 30, '+1', 0x2f6062, () => this.adjustRoadBound('right', ROAD_BOUNDS_LIMITS.step), 81);

    this.createCurrencyButton(x, y + 124, 218, 36, '+', 1000, 'soft', 0x4a743c, () => this.applyCheat('soft'), 81);
    this.createButton(x, y + 170, 218, 36, UI_TEXT.cheats.stage, 0x4c5f87, () => this.applyCheat('stage'), 81);
    this.createButton(x, y + 216, 218, 36, UI_TEXT.cheats.base, 0x4a743c, () => this.applyCheat('base'), 81);
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
    const bg = this.add.rectangle(x, y, width, height, 0x1a2318, 0.98).setStrokeStyle(2, TERMINAL_UI.stroke, 0.94).setInteractive({ useHandCursor: true });
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
    const bg = this.add
      .rectangle(x, y, width, 32, active ? TERMINAL_UI.accentDark : 0x0c120e, active ? 1 : 0.92)
      .setStrokeStyle(2, active ? TERMINAL_UI.accent : TERMINAL_UI.stroke, active ? 1 : 0.8)
      .setInteractive({ useHandCursor: true });
    this.createFittedText(x, y, label, width - 10, 14, active ? '#f3ead2' : '#d8d3b4');
    bg.on('pointerdown', onClick);
    bg.on('pointerover', () => bg.setStrokeStyle(2, TERMINAL_UI.accent, 1));
    bg.on('pointerout', () => bg.setStrokeStyle(2, active ? TERMINAL_UI.accent : TERMINAL_UI.stroke, active ? 1 : 0.8));
  }

  private drawWeaponStatPill(x: number, y: number, label: string): void {
    this.add.rectangle(x, y, 84, 26, 0x0b100d, 0.9).setStrokeStyle(1, TERMINAL_UI.strokeDim, 0.9);
    this.createFittedText(x, y, label, 74, 12, '#d8d3b4');
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
  ): void {
    const row = this.add
      .rectangle(x, y, width, 42, 0x0b100d, 0.94)
      .setStrokeStyle(2, maxed ? TERMINAL_UI.strokeDim : affordable ? TERMINAL_UI.stroke : 0x5b3530, maxed ? 0.72 : 0.95)
      .setInteractive({ useHandCursor: !maxed });
    this.add.rectangle(x - width / 2 + 3, y, 4, 30, maxed ? TERMINAL_UI.strokeDim : affordable ? TERMINAL_UI.success : TERMINAL_UI.danger, maxed ? 0.65 : 0.95);
    this.createFittedText(x - width / 2 + 16, y - 8, label, 130, 15, '#f3ead2', 0);
    this.createFittedText(x - width / 2 + 16, y + 10, effect, 146, 12, '#aeb89b', 0);
    this.createFittedText(x + 44, y, level, 86, 14, maxed ? '#88c56b' : '#d8d3b4');

    const chipX = x + width / 2 - 44;
    const chipColor = maxed ? 0x303a2b : affordable ? 0x4a743c : 0x4d302c;
    if (maxed) {
      this.add.rectangle(chipX, y, 72, 30, chipColor, 1).setStrokeStyle(1, TERMINAL_UI.strokeDim, 0.9);
      this.createFittedText(chipX, y, cost, 58, 15, '#f3ead2');
    } else {
      const price = createCurrencyValue(this, chipX, y, cost, 'soft', { maxWidth: 82, fontSize: 15, iconSize: 22, gap: 5 });
      const chipWidth = price.container.width + 20;
      this.add.rectangle(chipX, y, chipWidth, 30, chipColor, 1).setStrokeStyle(1, affordable ? TERMINAL_UI.success : TERMINAL_UI.danger, 0.9);
      this.children.bringToTop(price.container);
    }

    if (!maxed) {
      row.on('pointerdown', onClick);
      row.on('pointerover', () => row.setStrokeStyle(2, TERMINAL_UI.accent, 1));
      row.on('pointerout', () => row.setStrokeStyle(2, affordable ? TERMINAL_UI.stroke : 0x5b3530, 0.95));
    }
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
    this.state.placedWeapons.forEach((placement, index) => {
      const spacing = 72;
      const x = this.scale.width / 2 + (index - (this.state.equippedWeaponIds.length - 1) / 2) * spacing;
      this.drawWeaponIcon(x, this.scale.height - 92, placement.weaponId, 52, 52, placement.rotation).setDepth(12);
      this.add
        .text(x + 18, this.scale.height - 72, `${getWeaponTotalLevel(this.state.getWeaponProgress(placement.weaponId))}`, {
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
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const image = this.add.image(0, 0, AssetKeys.Weapons[weaponId]);
    const rotationRadians = rotation * (Math.PI / 2);
    const rotated = rotation % 2 === 1;
    const width = rotated ? image.height : image.width;
    const height = rotated ? image.width : image.height;
    const uiScaleBoost = weaponId === 'tesla' ? 1.2 : 1;
    image.setScale(Math.min(1, maxWidth / width, maxHeight / height) * uiScaleBoost).setRotation(rotationRadians);
    container.add(image);
    return container;
  }

  private getGridIconBounds(weaponId: WeaponId, rotation: WeaponRotation): { width: number; height: number } {
    const shape = getWeaponShape(weaponId, rotation);
    const cols = Math.max(...shape.map((cell) => cell.col)) + 1;
    const rows = Math.max(...shape.map((cell) => cell.row)) + 1;
    const slotSize = this.gridMetrics?.slotSize ?? 58;
    const gap = this.gridMetrics?.gap ?? 6;
    const padding = 8;

    return {
      width: cols * slotSize + (cols - 1) * gap - padding * 2,
      height: rows * slotSize + (rows - 1) * gap - padding * 2,
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
    const preview = this.drawWeaponIcon(x, y, weaponId, iconBounds.width, iconBounds.height, rotation);
    preview.setDepth(1000).setAlpha(0.86);

    const highlights = getWeaponShape(weaponId, rotation).map(() =>
      this.add.rectangle(0, 0, this.gridMetrics?.slotSize ?? 58, this.gridMetrics?.slotSize ?? 58, 0x39e75f, 0.5).setDepth(900),
    );

    this.dragState = { weaponId, fromPlacement: removed, fromOfferIndex, grabOffset, rotation, preview, highlights };
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

  private rotateDraggedWeapon(pointerX: number, pointerY: number): void {
    if (!this.dragState) return;

    const drag = this.dragState;
    drag.rotation = rotateWeaponRotation(drag.rotation);
    drag.grabOffset = this.getDefaultGrabOffset(drag.weaponId, drag.rotation);
    this.selectedRotation = drag.rotation;

    drag.preview.destroy();
    for (const highlight of drag.highlights) highlight.destroy();

    const iconBounds = this.getGridIconBounds(drag.weaponId, drag.rotation);
    drag.preview = this.drawWeaponIcon(pointerX, pointerY, drag.weaponId, iconBounds.width, iconBounds.height, drag.rotation);
    drag.preview.setDepth(1000).setAlpha(0.86);
    drag.highlights = getWeaponShape(drag.weaponId, drag.rotation).map(() =>
      this.add.rectangle(0, 0, this.gridMetrics?.slotSize ?? 58, this.gridMetrics?.slotSize ?? 58, 0x39e75f, 0.5).setDepth(900),
    );

    this.updateDragPreview(pointerX, pointerY);
    this.updateDragHighlight(pointerX, pointerY);
  }

  private handleDragEnd(pointer: Phaser.Input.Pointer): void {
    if (!this.dragState) return;
    if (pointer.rightButtonReleased()) return;

    const drag = this.dragState;

    const cell = this.pointerToPlacementCell(pointer.x, pointer.y);
    const placed = cell
      ? drag.fromOfferIndex !== null
        ? this.state.buyAndPlaceWeapon(drag.weaponId, cell.col, cell.row, drag.rotation)
        : this.state.placeWeaponWithLevel(drag.weaponId, cell.col, cell.row, drag.rotation, drag.fromPlacement?.level ?? 1)
      : false;

    if (placed && drag.fromPlacement) {
      this.selectedPlacementId = null;
    }

    if (placed && drag.fromOfferIndex !== null && drag.fromOfferIndex >= 0) {
      this.offer[drag.fromOfferIndex] = null;
      this.selectFirstAvailableOffer();
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
      const x = this.gridMetrics!.startX + col * this.gridMetrics!.pitch + this.gridMetrics!.slotSize / 2;
      const y = this.gridMetrics!.startY + row * this.gridMetrics!.pitch + this.gridMetrics!.slotSize / 2;

      highlight.setVisible(true).setPosition(x, y).setFillStyle(color, this.state.isCellActive(col, row) ? 0.58 : 0.35);
      highlight.setStrokeStyle(3, color, 0.95);
    });
  }

  private pointerToGridCell(pointerX: number, pointerY: number): { col: number; row: number } | null {
    if (!this.gridMetrics) return null;
    const col = Math.floor((pointerX - this.gridMetrics.startX) / this.gridMetrics.pitch);
    const row = Math.floor((pointerY - this.gridMetrics.startY) / this.gridMetrics.pitch);
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

  private consumeSelectedOffer(): void {
    this.offer = this.state.unlockedWeaponPool;
  }

  private canBuySelectedOffer(): boolean {
    return this.selectedWeapon !== null && this.state.unlockedWeaponPool.includes(this.selectedWeapon) && this.state.canAffordWeapon(this.selectedWeapon);
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
    const hitArea = this.add.zone(x, y, width, height).setInteractive({ useHandCursor: true }).setDepth(25);
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
      pointerX + (maxCol / 2 - this.dragState.grabOffset.col) * this.gridMetrics.pitch,
      pointerY + (maxRow / 2 - this.dragState.grabOffset.row) * this.gridMetrics.pitch,
    );
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
    container
      .setSize(228, 58)
      .setInteractive({ useHandCursor: true })
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
    const button = this.add.rectangle(x, y, width, height, color, 1).setDepth(depth).setStrokeStyle(2, TERMINAL_UI.stroke, 0.95).setInteractive({ useHandCursor: true });
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
    text.setInteractive({ useHandCursor: true }).on('pointerdown', onClick);
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
    const button = this.add.rectangle(x, y, width, height, color, 1).setDepth(depth).setStrokeStyle(2, TERMINAL_UI.stroke, 0.95).setInteractive({ useHandCursor: true });
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
    this.showPrep();
    this.flashHint(bought ? UI_TEXT.messages.upgradeBought : UI_TEXT.messages.upgradeUnavailable);
  }

  private applyCheat(kind: 'soft' | 'stage' | 'base'): void {
    if (kind === 'soft') {
      this.state.soft += 1000;
      this.showPrep();
      this.flashHint(UI_TEXT.cheats.soft);
      return;
    }

    if (kind === 'stage') {
      this.state.currentStage += 5;
      this.state.highestStage = Math.max(this.state.highestStage, this.state.currentStage);
      this.showPrep();
      this.flashHint(UI_TEXT.cheats.stage);
      return;
    }

    this.state.maxBunkerHp += 100;
    this.showPrep();
    this.flashHint(UI_TEXT.cheats.base);
  }

  private adjustRoadBound(side: 'left' | 'right', delta: number): void {
    moveRoadBound(side, delta);
    DEBUG_FLAGS.showRoadBounds = true;
    this.showPrep();
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




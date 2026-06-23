import Phaser from 'phaser';
import { AssetKeys } from '../assets/assetManifest';

export type CurrencyKind = 'soft' | 'hard';

export type CurrencyValueView = {
  container: Phaser.GameObjects.Container;
  text: Phaser.GameObjects.Text;
  icon: Phaser.GameObjects.Image;
  setValue: (value: string | number) => void;
};

type CurrencyValueOptions = {
  maxWidth: number;
  fontSize?: number;
  minFontSize?: number;
  iconSize?: number;
  gap?: number;
  color?: string;
  stroke?: string;
  strokeThickness?: number;
  originX?: number;
  depth?: number;
};

export function getCurrencyTextureKey(kind: CurrencyKind): string {
  return kind === 'soft' ? AssetKeys.Currency.caps : AssetKeys.Currency.tokens;
}

export function createCurrencyValue(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string | number,
  kind: CurrencyKind,
  options: CurrencyValueOptions,
): CurrencyValueView {
  const baseFontSize = options.fontSize ?? 16;
  const minFontSize = options.minFontSize ?? 10;
  const iconSize = options.iconSize ?? Math.round(baseFontSize * 1.35);
  const gap = options.gap ?? 5;
  const originX = options.originX ?? 0.5;
  const container = scene.add.container(x, y).setDepth(options.depth ?? 0);
  const text = scene.add
    .text(0, 0, '', {
      fontFamily: 'Trebuchet MS, Arial, sans-serif',
      fontSize: `${baseFontSize}px`,
      color: options.color ?? '#f3ead2',
      stroke: options.stroke ?? '#050805',
      strokeThickness: options.strokeThickness ?? 2,
    })
    .setOrigin(0, 0.5);
  const icon = scene.add.image(0, 0, getCurrencyTextureKey(kind)).setDisplaySize(iconSize, iconSize);

  const layout = (nextValue: string | number): void => {
    text.setText(`${nextValue}`).setFontSize(baseFontSize);
    let nextFontSize = baseFontSize;
    while (text.width + gap + iconSize > options.maxWidth && nextFontSize > minFontSize) {
      nextFontSize -= 1;
      text.setFontSize(nextFontSize);
    }

    const totalWidth = Math.min(options.maxWidth, text.width + gap + iconSize);
    const left = -totalWidth * originX;
    text.setX(left);
    icon.setX(left + text.width + gap + iconSize / 2);
    container.setSize(totalWidth, Math.max(iconSize, text.height));
  };

  container.add([text, icon]);
  layout(value);

  return { container, text, icon, setValue: layout };
}

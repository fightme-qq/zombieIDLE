import Phaser from 'phaser';
import { loadAssetManifest } from '../assets/assetManifest';
import { SceneKeys } from '../config/sceneKeys';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Preload);
  }

  preload(): void {
    loadAssetManifest(this);
  }

  create(): void {
    this.scene.launch(SceneKeys.Battle);
    this.scene.launch(SceneKeys.Game);
    this.scene.stop();
  }
}

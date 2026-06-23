import Phaser from 'phaser';
import './style.css';
import { gameConfig } from './game/config/gameConfig';
import { initYandexGames, registerPhaserGame } from './game/platform/yandexGames';

declare global {
  interface Window {
    __phaserGame?: Phaser.Game;
  }
}

void initYandexGames();
const game = new Phaser.Game(gameConfig);
window.__phaserGame = game;
registerPhaserGame(game);

import Phaser from 'phaser';
import { Panel } from './Panel';
import { GAME_HEIGHT } from '../config/game-config';

const TOOLBAR_HEIGHT = 48;

export class SidePanel {
  private panel: Panel;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const height = GAME_HEIGHT - TOOLBAR_HEIGHT - y - 12;
    this.panel = new Panel(scene, x, y, 200, height, 0.5);
  }

  destroy(): void {
    this.panel.destroy();
  }
}

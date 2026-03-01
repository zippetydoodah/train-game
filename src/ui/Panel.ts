import Phaser from 'phaser';
import { UI } from '../config/palette';

export class Panel {
  private bg: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    width: number, height: number,
    alpha: number = 0.85,
    borderColor: number = UI.PANEL_BORDER
  ) {
    this.bg = scene.add.graphics();
    this.bg.fillStyle(UI.PANEL_BG, alpha);
    this.bg.fillRect(x, y, width, height);
    this.bg.lineStyle(1, borderColor, alpha);
    this.bg.strokeRect(x, y, width, height);
  }

  destroy(): void {
    this.bg.destroy();
  }
}

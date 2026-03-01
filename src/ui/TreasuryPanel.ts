import Phaser from 'phaser';
import { Panel } from './Panel';
import { TEXT } from '../config/palette';

export class TreasuryPanel {
  private panel: Panel;
  private text: Phaser.GameObjects.BitmapText;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.panel = new Panel(scene, x, y, 140, 36);
    this.text = scene.add.bitmapText(x + 8, y + 10, 'press-start', '\u00A30', 8);
    this.text.setScale(1.25);
    this.text.setTint(TEXT.ACCENT);
  }

  destroy(): void {
    this.panel.destroy();
    this.text.destroy();
  }
}

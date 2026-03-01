import Phaser from 'phaser';
import { UI, TEXT } from '../config/palette';

export class CostTooltip {
  private bg: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.BitmapText;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.bg = scene.add.graphics();
    this.text = scene.add.bitmapText(0, 0, 'press-start', '', 8);
    this.text.setScale(0.75);
    this.text.setTint(TEXT.PRIMARY);
    this.bg.setDepth(100);
    this.text.setDepth(101);
    this.hide();
  }

  show(screenX: number, screenY: number, label: string, affordable: boolean): void {
    const tooltipX = screenX + 12;
    const tooltipY = screenY - 20;
    this.text.setText(label);
    const textWidth = this.text.width * this.text.scaleX;
    const padding = 8;
    const bgWidth = textWidth + padding * 2;
    const bgHeight = 16;

    this.bg.clear();
    this.bg.fillStyle(UI.PANEL_BG, 0.95);
    this.bg.fillRect(tooltipX, tooltipY, bgWidth, bgHeight);
    this.bg.lineStyle(1, UI.PANEL_BORDER, 0.95);
    this.bg.strokeRect(tooltipX, tooltipY, bgWidth, bgHeight);
    this.bg.setVisible(true);

    this.text.setPosition(tooltipX + padding, tooltipY + 2);
    this.text.setTint(affordable ? TEXT.PRIMARY : TEXT.DANGER);
    this.text.setVisible(true);
  }

  hide(): void {
    this.bg.setVisible(false);
    this.text.setVisible(false);
  }

  destroy(): void {
    this.bg.destroy();
    this.text.destroy();
  }
}

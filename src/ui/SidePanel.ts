import Phaser from 'phaser';
import { UI, TEXT } from '../config/palette';
import { GAME_HEIGHT } from '../config/game-config';
import { TerrainType } from '../types/terrain';

const TOOLBAR_HEIGHT = 48;

export class SidePanel {
  private bg: Phaser.GameObjects.Graphics;
  private contentTexts: Phaser.GameObjects.BitmapText[] = [];
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private width: number = 200;
  private height: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.height = GAME_HEIGHT - TOOLBAR_HEIGHT - y - 12;

    this.bg = scene.add.graphics();
    this.drawPanel();
  }

  showRouteBreakdown(data: { totalCost: number; perTile: { x: number; y: number; cost: number; terrain: TerrainType }[] }): void {
    this.clearContent();

    // Group by terrain type
    const groups = new Map<TerrainType, { count: number; cost: number }>();
    for (const t of data.perTile) {
      if (t.cost <= 0) continue;
      const existing = groups.get(t.terrain) ?? { count: 0, cost: 0 };
      existing.count++;
      existing.cost += t.cost;
      groups.set(t.terrain, existing);
    }

    const terrainNames = ['Deep Water', 'Shallow Water', 'Sand', 'Grassland', 'Forest', 'Hills', 'Mountains'];
    let textY = this.y + 8;

    // Title
    const title = this.scene.add.bitmapText(this.x + 8, textY, 'press-start', 'Route Cost', 8);
    title.setScale(0.75);
    title.setTint(TEXT.ACCENT);
    this.contentTexts.push(title);
    textY += 14;

    // Per-terrain lines
    for (const [terrain, info] of groups) {
      const name = terrainNames[terrain] ?? 'Unknown';
      const line = `${name} x${info.count}: \u00A3${info.cost.toLocaleString('en-GB')}`;
      const text = this.scene.add.bitmapText(this.x + 8, textY, 'press-start', line, 8);
      text.setScale(0.75);
      text.setTint(TEXT.SECONDARY);
      this.contentTexts.push(text);
      textY += 12;
    }

    // Total
    textY += 4;
    const totalLine = `Total: \u00A3${data.totalCost.toLocaleString('en-GB')}`;
    const totalText = this.scene.add.bitmapText(this.x + 8, textY, 'press-start', totalLine, 8);
    totalText.setScale(0.75);
    totalText.setTint(TEXT.PRIMARY);
    this.contentTexts.push(totalText);
  }

  showDemolishInfo(refund: number, buildCost: number): void {
    this.clearContent();

    let textY = this.y + 8;
    const title = this.scene.add.bitmapText(this.x + 8, textY, 'press-start', 'Demolish', 8);
    title.setScale(0.75);
    title.setTint(TEXT.ACCENT);
    this.contentTexts.push(title);
    textY += 14;

    const costLine = `Built for: \u00A3${buildCost.toLocaleString('en-GB')}`;
    const costText = this.scene.add.bitmapText(this.x + 8, textY, 'press-start', costLine, 8);
    costText.setScale(0.75);
    costText.setTint(TEXT.SECONDARY);
    this.contentTexts.push(costText);
    textY += 12;

    const refundLine = `Refund: \u00A3${refund.toLocaleString('en-GB')}`;
    const refundText = this.scene.add.bitmapText(this.x + 8, textY, 'press-start', refundLine, 8);
    refundText.setScale(0.75);
    refundText.setTint(TEXT.SUCCESS);
    this.contentTexts.push(refundText);
  }

  clearContent(): void {
    for (const t of this.contentTexts) t.destroy();
    this.contentTexts = [];
  }

  private drawPanel(): void {
    this.bg.clear();
    this.bg.fillStyle(UI.PANEL_BG, 0.5);
    this.bg.fillRect(this.x, this.y, this.width, this.height);
    this.bg.lineStyle(1, UI.PANEL_BORDER, 0.5);
    this.bg.strokeRect(this.x, this.y, this.width, this.height);
  }

  destroy(): void {
    this.clearContent();
    this.bg.destroy();
  }
}

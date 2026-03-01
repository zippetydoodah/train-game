import Phaser from 'phaser';
import { Button } from './Button';
import { STATION_TIERS, StationTierConfig } from '../types/infrastructure';
import { ButtonState } from '../types/ui';
import { TEXT, UI } from '../config/palette';
import { GAME_HEIGHT } from '../config/game-config';

const TOOLBAR_HEIGHT = 48;
const SUBMENU_HEIGHT = 48;
const SUBMENU_Y = GAME_HEIGHT - TOOLBAR_HEIGHT - SUBMENU_HEIGHT;

export class StationSubMenu {
  private bg: Phaser.GameObjects.Graphics;
  private buttons: Button[] = [];
  private costTexts: Phaser.GameObjects.BitmapText[] = [];
  private visible: boolean = false;

  constructor(
    private scene: Phaser.Scene,
    private onTierSelected: (tier: StationTierConfig) => void,
  ) {
    this.bg = scene.add.graphics();
    this.drawBackground();

    let btnX = 16;
    const btnY = SUBMENU_Y + 4;
    for (const tier of STATION_TIERS) {
      const btn = new Button(scene, {
        x: btnX,
        y: btnY,
        width: 80,
        height: 24,
        label: tier.label,
        state: ButtonState.Normal,
        onClick: () => this.onTierSelected(tier),
      });
      this.buttons.push(btn);

      const costText = scene.add.bitmapText(
        btnX + 40, btnY + 28, 'press-start',
        `\u00A3${tier.cost.toLocaleString('en-GB')}`, 8,
      );
      costText.setOrigin(0.5, 0);
      costText.setScale(0.75);
      costText.setTint(TEXT.SECONDARY);
      this.costTexts.push(costText);

      btnX += 88;
    }

    this.hide();
  }

  show(): void {
    this.visible = true;
    this.bg.setVisible(true);
    for (const btn of this.buttons) btn.setVisible(true);
    for (const t of this.costTexts) t.setVisible(true);
  }

  hide(): void {
    this.visible = false;
    this.bg.setVisible(false);
    for (const btn of this.buttons) btn.setVisible(false);
    for (const t of this.costTexts) t.setVisible(false);
  }

  isVisible(): boolean { return this.visible; }

  private drawBackground(): void {
    this.bg.fillStyle(UI.TOOLBAR_BG, 0.9);
    this.bg.fillRect(0, SUBMENU_Y, 288, SUBMENU_HEIGHT);
    this.bg.lineStyle(1, UI.PANEL_BORDER, 0.9);
    this.bg.lineBetween(0, SUBMENU_Y, 288, SUBMENU_Y);
  }

  destroy(): void {
    this.bg.destroy();
    for (const btn of this.buttons) btn.destroy();
    for (const t of this.costTexts) t.destroy();
  }
}

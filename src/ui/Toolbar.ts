import Phaser from 'phaser';
import { Button } from './Button';
import { UI } from '../config/palette';
import { ButtonState } from '../types/ui';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game-config';

const TOOLBAR_HEIGHT = 48;
const TOOLBAR_Y = GAME_HEIGHT - TOOLBAR_HEIGHT;

const TOOL_BUTTONS = [
  { label: 'Rail', width: 72 },
  { label: 'Station', width: 72 },
  { label: 'Bridge', width: 72 },
  { label: 'Elev.Rail', width: 72 },
  { label: 'Demolish', width: 72 },
];

export class Toolbar {
  private bg: Phaser.GameObjects.Graphics;
  private buttons: Button[] = [];

  constructor(scene: Phaser.Scene) {
    // Background
    this.bg = scene.add.graphics();
    this.bg.fillStyle(UI.TOOLBAR_BG, 0.9);
    this.bg.fillRect(0, TOOLBAR_Y, GAME_WIDTH, TOOLBAR_HEIGHT);
    this.bg.lineStyle(1, UI.PANEL_BORDER, 0.9);
    this.bg.lineBetween(0, TOOLBAR_Y, GAME_WIDTH, TOOLBAR_Y);

    // Tool buttons (disabled, left-aligned)
    let btnX = 8;
    const btnY = TOOLBAR_Y + (TOOLBAR_HEIGHT - 28) / 2;
    for (const def of TOOL_BUTTONS) {
      const btn = new Button(scene, {
        x: btnX,
        y: btnY,
        width: def.width,
        height: 28,
        label: def.label,
        state: ButtonState.Disabled,
        disabledTooltip: 'Available in a future update',
      });
      this.buttons.push(btn);
      btnX += def.width + 8;
    }

    // Menu button (right-aligned, next to Save)
    const menuWidth = 56;
    const menuX = GAME_WIDTH - 12 - 56 - 8 - menuWidth;
    const menuBtn = new Button(scene, {
      x: menuX,
      y: btnY,
      width: menuWidth,
      height: 28,
      label: 'Menu',
      state: ButtonState.Normal,
      onClick: () => {
        scene.events.emit('return-to-menu');
      },
    });
    this.buttons.push(menuBtn);

    // Save button (right-aligned)
    const saveWidth = 56;
    const saveX = GAME_WIDTH - 12 - saveWidth;
    const saveBtn = new Button(scene, {
      x: saveX,
      y: btnY,
      width: saveWidth,
      height: 28,
      label: 'Save',
      state: ButtonState.Normal,
      onClick: () => {
        scene.events.emit('open-save-menu');
      },
    });
    this.buttons.push(saveBtn);
  }

  destroy(): void {
    this.bg.destroy();
    for (const btn of this.buttons) {
      btn.destroy();
    }
  }
}

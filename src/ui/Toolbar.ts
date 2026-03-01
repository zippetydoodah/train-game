import Phaser from 'phaser';
import { Button } from './Button';
import { UI } from '../config/palette';
import { ButtonState } from '../types/ui';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game-config';
import { ToolType } from '../types/tools';

const TOOLBAR_HEIGHT = 48;
const TOOLBAR_Y = GAME_HEIGHT - TOOLBAR_HEIGHT;

const TOOL_BUTTONS = [
  { label: 'Rail', width: 72 },
  { label: 'Station', width: 72 },
  { label: 'Bridge', width: 72 },
  { label: 'Elev.Rail', width: 72 },
  { label: 'Demolish', width: 72 },
];

const BUTTON_LABEL_TO_TOOL_LOCAL: ReadonlyMap<string, ToolType> = new Map([
  ['Rail',      ToolType.Rail],
  ['Station',   ToolType.Station],
  ['Bridge',    ToolType.Bridge],
  ['Elev.Rail', ToolType.ElevatedRail],
  ['Demolish',  ToolType.Demolish],
]);

export class Toolbar {
  private bg: Phaser.GameObjects.Graphics;
  private toolButtons: Map<ToolType, Button> = new Map();
  private actionButtons: Button[] = [];

  constructor(scene: Phaser.Scene) {
    this.bg = scene.add.graphics();
    this.bg.fillStyle(UI.TOOLBAR_BG, 0.9);
    this.bg.fillRect(0, TOOLBAR_Y, GAME_WIDTH, TOOLBAR_HEIGHT);
    this.bg.lineStyle(1, UI.PANEL_BORDER, 0.9);
    this.bg.lineBetween(0, TOOLBAR_Y, GAME_WIDTH, TOOLBAR_Y);

    // Tool buttons (NOW ENABLED with click handlers)
    let btnX = 8;
    const btnY = TOOLBAR_Y + (TOOLBAR_HEIGHT - 28) / 2;
    for (const def of TOOL_BUTTONS) {
      const toolType = BUTTON_LABEL_TO_TOOL_LOCAL.get(def.label)!;
      const btn = new Button(scene, {
        x: btnX,
        y: btnY,
        width: def.width,
        height: 28,
        label: def.label,
        state: ButtonState.Normal,
        isDanger: toolType === ToolType.Demolish,
        onClick: () => {
          scene.events.emit('tool-selected', toolType);
        },
      });
      this.toolButtons.set(toolType, btn);
      btnX += def.width + 8;
    }

    // Menu button
    const menuWidth = 56;
    const menuX = GAME_WIDTH - 12 - 56 - 8 - menuWidth;
    const menuBtn = new Button(scene, {
      x: menuX, y: btnY, width: menuWidth, height: 28,
      label: 'Menu', state: ButtonState.Normal,
      onClick: () => { scene.events.emit('return-to-menu'); },
    });
    this.actionButtons.push(menuBtn);

    // Save button
    const saveWidth = 56;
    const saveX = GAME_WIDTH - 12 - saveWidth;
    const saveBtn = new Button(scene, {
      x: saveX, y: btnY, width: saveWidth, height: 28,
      label: 'Save', state: ButtonState.Normal,
      onClick: () => { scene.events.emit('open-save-menu'); },
    });
    this.actionButtons.push(saveBtn);
  }

  setActiveTool(tool: ToolType): void {
    for (const [t, btn] of this.toolButtons) {
      btn.setActive(t === tool);
    }
  }

  destroy(): void {
    this.bg.destroy();
    for (const btn of this.toolButtons.values()) btn.destroy();
    for (const btn of this.actionButtons) btn.destroy();
  }
}

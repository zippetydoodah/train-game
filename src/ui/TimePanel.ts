import Phaser from 'phaser';
import { Panel } from './Panel';
import { UI, TEXT } from '../config/palette';
import { TimeSystem } from '../systems/TimeSystem';
import { GameScene } from '../scenes/GameScene';
import { SpeedSetting } from '../types/time';

interface SpeedButtonDef {
  label: string;
  speed: SpeedSetting;
}

const SPEED_BUTTONS: SpeedButtonDef[] = [
  { label: '||', speed: SpeedSetting.Paused },
  { label: '1x', speed: SpeedSetting.Normal },
  { label: '2x', speed: SpeedSetting.Fast },
  { label: '4x', speed: SpeedSetting.Fastest },
];

export class TimePanel {
  private panel: Panel;
  private timeText: Phaser.GameObjects.BitmapText;
  private speedButtons: {
    bg: Phaser.GameObjects.Rectangle;
    border: Phaser.GameObjects.Rectangle;
    text: Phaser.GameObjects.BitmapText;
    speed: SpeedSetting;
  }[] = [];
  private timeSystem: TimeSystem;

  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    timeSystem: TimeSystem,
    gameScene: GameScene
  ) {
    this.timeSystem = timeSystem;

    this.panel = new Panel(scene, x, y, 220, 56);

    // Row 1: time display, right-aligned
    this.timeText = scene.add.bitmapText(x + 212, y + 8, 'press-start', '', 8);
    this.timeText.setScale(1.25);
    this.timeText.setTint(TEXT.PRIMARY);
    this.timeText.setOrigin(1, 0);

    // Row 2: speed buttons
    const btnY = y + 30;
    const btnWidth = 40;
    const btnHeight = 22;

    SPEED_BUTTONS.forEach((def, i) => {
      const btnX = x + 8 + i * 44;
      const cx = btnX + btnWidth / 2;
      const cy = btnY + btnHeight / 2;

      const bg = scene.add.rectangle(cx, cy, btnWidth, btnHeight);
      bg.setOrigin(0.5, 0.5);
      bg.setFillStyle(UI.BUTTON_DEFAULT);

      const border = scene.add.rectangle(cx, cy, btnWidth, btnHeight);
      border.setOrigin(0.5, 0.5);
      border.setFillStyle();
      border.setStrokeStyle(1, UI.PANEL_BORDER);

      const text = scene.add.bitmapText(cx, cy, 'press-start', def.label, 8);
      text.setOrigin(0.5, 0.5);
      text.setTint(TEXT.PRIMARY);

      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerup', () => {
        gameScene.timeSystem.setSpeed(def.speed);
      });

      this.speedButtons.push({ bg, border, text, speed: def.speed });
    });
  }

  refresh(): void {
    this.timeText.setText(this.timeSystem.getDisplayString());

    const currentSpeed = this.timeSystem.getSpeed();
    for (const btn of this.speedButtons) {
      if (btn.speed === currentSpeed) {
        btn.bg.setFillStyle(UI.ACTIVE_BUTTON_BG);
        btn.border.setStrokeStyle(1, UI.ACTIVE_BUTTON_BORDER);
      } else {
        btn.bg.setFillStyle(UI.BUTTON_DEFAULT);
        btn.border.setStrokeStyle(1, UI.PANEL_BORDER);
      }
    }
  }

  destroy(): void {
    this.panel.destroy();
    this.timeText.destroy();
    for (const btn of this.speedButtons) {
      btn.bg.destroy();
      btn.border.destroy();
      btn.text.destroy();
    }
  }
}

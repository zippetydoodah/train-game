import Phaser from 'phaser';
import { Panel } from './Panel';
import { Button } from './Button';
import { UI, TEXT } from '../config/palette';
import { ButtonState } from '../types/ui';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game-config';

interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export class ConfirmDialog {
  private scrim: Phaser.GameObjects.Rectangle;
  private panel: Panel;
  private titleText: Phaser.GameObjects.BitmapText;
  private messageText: Phaser.GameObjects.BitmapText;
  private confirmBtn: Button;
  private cancelBtn: Button;

  constructor(scene: Phaser.Scene, config: ConfirmDialogConfig) {
    const dialogWidth = 340;
    const dialogHeight = 140;
    const dx = (GAME_WIDTH - dialogWidth) / 2;
    const dy = (GAME_HEIGHT - dialogHeight) / 2;

    // Full-screen scrim
    this.scrim = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, UI.OVERLAY_SCRIM, 0.6);
    this.scrim.setInteractive();

    // Dialog panel
    this.panel = new Panel(scene, dx, dy, dialogWidth, dialogHeight);

    // Title
    this.titleText = scene.add.bitmapText(dx + 20, dy + 16, 'press-start', config.title, 8);
    this.titleText.setScale(1.25);
    this.titleText.setTint(TEXT.PRIMARY);

    // Message
    this.messageText = scene.add.bitmapText(dx + 20, dy + 48, 'press-start', config.message, 8);
    this.messageText.setTint(TEXT.SECONDARY);

    // Buttons
    const btnY = dy + dialogHeight - 44;
    const btnWidth = 100;
    const btnHeight = 28;

    this.cancelBtn = new Button(scene, {
      x: dx + 40,
      y: btnY,
      width: btnWidth,
      height: btnHeight,
      label: config.cancelLabel ?? 'Cancel',
      state: ButtonState.Normal,
      onClick: () => {
        config.onCancel();
        this.destroy();
      },
    });

    this.confirmBtn = new Button(scene, {
      x: dx + dialogWidth - 40 - btnWidth,
      y: btnY,
      width: btnWidth,
      height: btnHeight,
      label: config.confirmLabel ?? 'Confirm',
      state: ButtonState.Normal,
      isDanger: config.isDanger,
      onClick: () => {
        config.onConfirm();
        this.destroy();
      },
    });
  }

  destroy(): void {
    this.scrim.destroy();
    this.panel.destroy();
    this.titleText.destroy();
    this.messageText.destroy();
    this.confirmBtn.destroy();
    this.cancelBtn.destroy();
  }
}

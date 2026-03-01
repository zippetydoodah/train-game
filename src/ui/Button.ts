import Phaser from 'phaser';
import { UI, TEXT } from '../config/palette';
import { ButtonState } from '../types/ui';

interface ButtonConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  state: ButtonState;
  onClick?: () => void;
  isDanger?: boolean;
  disabledTooltip?: string;
}

export class Button {
  private bg: Phaser.GameObjects.Rectangle;
  private border: Phaser.GameObjects.Rectangle;
  private text: Phaser.GameObjects.BitmapText;
  private state: ButtonState;
  private onClick?: () => void;
  private isDanger: boolean;
  private isToolActive: boolean = false;
  private tooltip: Phaser.GameObjects.BitmapText | null = null;
  private tooltipBg: Phaser.GameObjects.Graphics | null = null;
  private hoverTimer: Phaser.Time.TimerEvent | null = null;
  private scene: Phaser.Scene;
  private disabledTooltip: string;

  constructor(scene: Phaser.Scene, config: ButtonConfig) {
    this.scene = scene;
    this.state = config.state;
    this.onClick = config.onClick;
    this.isDanger = config.isDanger ?? false;
    this.disabledTooltip = config.disabledTooltip ?? 'Available in a future update';

    const cx = config.x + config.width / 2;
    const cy = config.y + config.height / 2;

    // Background rectangle
    this.bg = scene.add.rectangle(cx, cy, config.width, config.height);
    this.bg.setOrigin(0.5, 0.5);

    // Border rectangle (stroke only)
    this.border = scene.add.rectangle(cx, cy, config.width, config.height);
    this.border.setOrigin(0.5, 0.5);
    this.border.setFillStyle();
    this.border.setStrokeStyle(1);

    // Label text
    this.text = scene.add.bitmapText(cx, cy, 'press-start', config.label, 8);
    this.text.setOrigin(0.5, 0.5);

    this.applyStyle();

    // Interactivity
    this.bg.setInteractive({ useHandCursor: this.state !== ButtonState.Disabled });

    this.bg.on('pointerover', () => {
      if (this.isToolActive) return;
      if (this.state === ButtonState.Disabled) {
        this.startHoverTimer();
        return;
      }
      this.state = ButtonState.Hover;
      this.applyStyle();
    });

    this.bg.on('pointerout', () => {
      if (this.isToolActive) return;
      if (this.state === ButtonState.Disabled) {
        this.clearHoverTimer();
        this.hideTooltip();
        return;
      }
      this.state = ButtonState.Normal;
      this.applyStyle();
    });

    this.bg.on('pointerdown', () => {
      if (this.state === ButtonState.Disabled) return;
      this.state = ButtonState.Active;
      this.applyStyle();
    });

    this.bg.on('pointerup', () => {
      if (this.state === ButtonState.Disabled) return;
      this.state = ButtonState.Hover;
      this.applyStyle();
      if (this.onClick) this.onClick();
    });
  }

  private applyStyle(): void {
    if (this.isDanger && this.state !== ButtonState.Disabled) {
      this.applyDangerStyle();
      return;
    }

    switch (this.state) {
      case ButtonState.Normal:
        this.bg.setFillStyle(UI.BUTTON_DEFAULT);
        this.border.setStrokeStyle(1, UI.PANEL_BORDER);
        this.text.setTint(TEXT.PRIMARY);
        break;
      case ButtonState.Hover:
        this.bg.setFillStyle(UI.BUTTON_HOVER);
        this.border.setStrokeStyle(1, UI.PANEL_BORDER_ACCENT);
        this.text.setTint(TEXT.PRIMARY);
        break;
      case ButtonState.Active:
        this.bg.setFillStyle(UI.BUTTON_ACTIVE);
        this.border.setStrokeStyle(1, UI.PANEL_BORDER_ACCENT);
        this.text.setTint(TEXT.PRIMARY);
        break;
      case ButtonState.Disabled:
        this.bg.setFillStyle(UI.BUTTON_DISABLED);
        this.border.setStrokeStyle(1, UI.BUTTON_DISABLED_BORDER);
        this.text.setTint(TEXT.DISABLED);
        break;
    }
  }

  private applyDangerStyle(): void {
    switch (this.state) {
      case ButtonState.Hover:
      case ButtonState.Active:
        this.bg.setFillStyle(UI.DANGER_HOVER_BG);
        this.border.setStrokeStyle(1, UI.DANGER_BORDER);
        this.text.setTint(TEXT.DANGER_HOVER);
        break;
      default:
        this.bg.setFillStyle(UI.DANGER_BG);
        this.border.setStrokeStyle(1, UI.DANGER_BORDER);
        this.text.setTint(TEXT.DANGER);
        break;
    }
  }

  private startHoverTimer(): void {
    this.clearHoverTimer();
    this.hoverTimer = this.scene.time.delayedCall(800, () => {
      this.showTooltip();
    });
  }

  private clearHoverTimer(): void {
    if (this.hoverTimer) {
      this.hoverTimer.destroy();
      this.hoverTimer = null;
    }
  }

  private showTooltip(): void {
    if (this.tooltip) return;

    const tipX = this.bg.x;
    const tipY = this.bg.y - this.bg.height / 2 - 18;

    this.tooltipBg = this.scene.add.graphics();
    const textWidth = this.disabledTooltip.length * 6 + 12;
    this.tooltipBg.fillStyle(UI.PANEL_BG, 0.95);
    this.tooltipBg.fillRect(tipX - textWidth / 2, tipY - 4, textWidth, 16);
    this.tooltipBg.lineStyle(1, UI.PANEL_BORDER, 0.95);
    this.tooltipBg.strokeRect(tipX - textWidth / 2, tipY - 4, textWidth, 16);

    this.tooltip = this.scene.add.bitmapText(tipX, tipY, 'press-start', this.disabledTooltip, 8);
    this.tooltip.setOrigin(0.5, 0);
    this.tooltip.setScale(0.75);
    this.tooltip.setTint(TEXT.SECONDARY);
  }

  private hideTooltip(): void {
    if (this.tooltip) {
      this.tooltip.destroy();
      this.tooltip = null;
    }
    if (this.tooltipBg) {
      this.tooltipBg.destroy();
      this.tooltipBg = null;
    }
  }

  setActive(active: boolean): void {
    if (active) {
      this.isToolActive = true;
      if (this.isDanger) {
        this.bg.setFillStyle(UI.DANGER_BG);
        this.border.setStrokeStyle(1, UI.DANGER_BORDER);
        this.text.setTint(TEXT.DANGER);
      } else {
        this.bg.setFillStyle(UI.ACTIVE_BUTTON_BG);
        this.border.setStrokeStyle(1, UI.ACTIVE_BUTTON_BORDER);
        this.text.setTint(TEXT.PRIMARY);
      }
    } else {
      this.isToolActive = false;
      this.state = ButtonState.Normal;
      this.applyStyle();
    }
  }

  setEnabled(enabled: boolean): void {
    if (enabled) {
      this.state = ButtonState.Normal;
      this.bg.setInteractive({ useHandCursor: true });
    } else {
      this.state = ButtonState.Disabled;
      this.bg.setInteractive({ useHandCursor: false });
    }
    this.applyStyle();
  }

  setVisible(visible: boolean): void {
    this.bg.setVisible(visible);
    this.border.setVisible(visible);
    this.text.setVisible(visible);
  }

  destroy(): void {
    this.clearHoverTimer();
    this.hideTooltip();
    this.bg.destroy();
    this.border.destroy();
    this.text.destroy();
  }
}

import Phaser from 'phaser';
import { UI, TEXT } from '../config/palette';
import { TreasuryManager } from '../systems/TreasuryManager';

export class TreasuryPanel {
  private bg: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.BitmapText;
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private currentWidth: number = 140;
  private treasuryManager: TreasuryManager;
  private debtPulseEvent: Phaser.Time.TimerEvent | null = null;
  private debtPulseState: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, treasuryManager: TreasuryManager) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.treasuryManager = treasuryManager;

    this.bg = scene.add.graphics();
    this.drawPanel(140);

    this.text = scene.add.bitmapText(x + 8, y + 10, 'press-start',
      TreasuryManager.formatBalance(treasuryManager.getBalance()), 8);
    this.text.setScale(1.25);
    this.text.setTint(TEXT.ACCENT);
  }

  refresh(): void {
    const balance = this.treasuryManager.getBalance();
    this.text.setText(TreasuryManager.formatBalance(balance));

    const textWidth = this.text.width * this.text.scaleX;
    const newWidth = Math.min(200, Math.max(140, textWidth + 24));
    if (newWidth !== this.currentWidth) {
      this.drawPanel(newWidth);
      this.currentWidth = newWidth;
    }

    if (balance < 0) {
      this.text.setTint(TEXT.DANGER);
      if (!this.debtPulseEvent) this.startDebtPulse();
    } else {
      this.text.setTint(TEXT.ACCENT);
      if (this.debtPulseEvent) this.stopDebtPulse();
    }
  }

  flashDeduction(): void {
    this.text.setTint(0xFFFFFF);
    this.scene.time.delayedCall(100, () => {
      const balance = this.treasuryManager.getBalance();
      this.text.setTint(balance < 0 ? TEXT.DANGER : TEXT.ACCENT);
    });
  }

  flashRefund(): void {
    this.text.setTint(TEXT.SUCCESS);
    this.scene.time.delayedCall(100, () => {
      const balance = this.treasuryManager.getBalance();
      this.text.setTint(balance < 0 ? TEXT.DANGER : TEXT.ACCENT);
    });
  }

  /** Amber flash warning before entering debt (FR-TREASURY-4): 3 pulses over 600ms. */
  flashDebtWarning(): void {
    let pulses = 0;
    const flashTimer = this.scene.time.addEvent({
      delay: 200,
      repeat: 5, // 6 callbacks: 3 on, 3 off
      callback: () => {
        pulses++;
        if (pulses % 2 === 1) {
          this.bg.clear();
          this.bg.fillStyle(UI.PANEL_BG, 0.85);
          this.bg.fillRect(this.x, this.y, this.currentWidth, 36);
          this.bg.lineStyle(2, TEXT.WARNING, 1);
          this.bg.strokeRect(this.x, this.y, this.currentWidth, 36);
        } else {
          this.drawPanel(this.currentWidth);
        }
      },
    });
    // Ensure cleanup after all pulses
    this.scene.time.delayedCall(1200, () => {
      flashTimer.destroy();
      this.drawPanel(this.currentWidth);
    });
  }

  private drawPanel(width: number): void {
    this.bg.clear();
    this.bg.fillStyle(UI.PANEL_BG, 0.85);
    this.bg.fillRect(this.x, this.y, width, 36);
    this.bg.lineStyle(1, UI.PANEL_BORDER, 0.85);
    this.bg.strokeRect(this.x, this.y, width, 36);
  }

  private startDebtPulse(): void {
    this.debtPulseEvent = this.scene.time.addEvent({
      delay: 800,
      loop: true,
      callback: () => {
        this.debtPulseState = !this.debtPulseState;
        this.bg.clear();
        this.bg.fillStyle(UI.PANEL_BG, 0.85);
        this.bg.fillRect(this.x, this.y, this.currentWidth, 36);
        const borderColor = this.debtPulseState ? TEXT.WARNING : UI.PANEL_BORDER;
        this.bg.lineStyle(1, borderColor, 0.85);
        this.bg.strokeRect(this.x, this.y, this.currentWidth, 36);
      },
    });
  }

  private stopDebtPulse(): void {
    if (this.debtPulseEvent) {
      this.debtPulseEvent.destroy();
      this.debtPulseEvent = null;
    }
    this.debtPulseState = false;
    this.drawPanel(this.currentWidth);
  }

  destroy(): void {
    this.stopDebtPulse();
    this.bg.destroy();
    this.text.destroy();
  }
}

import Phaser from 'phaser';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { SaveManager } from '../systems/SaveManager';
import { TimeSystem } from '../systems/TimeSystem';
import { UI, TEXT } from '../config/palette';
import { ButtonState } from '../types/ui';
import { SlotIndex, MAX_SAVE_SLOTS, SaveSlotData } from '../types/save';
import { GAME_WIDTH } from '../config/game-config';

export class MainMenuScene extends Phaser.Scene {
  private buttons: Button[] = [];
  private panels: Panel[] = [];
  private texts: Phaser.GameObjects.BitmapText[] = [];
  private graphics: Phaser.GameObjects.Graphics[] = [];
  private confirmDialog: ConfirmDialog | null = null;

  constructor() {
    super({ key: 'main-menu' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x0A0A1A);

    // Cleanup from previous run
    this.clearAll();

    // Title
    const title = this.add.bitmapText(GAME_WIDTH / 2, 180, 'press-start', 'RAIL TYCOON', 8);
    title.setScale(4);
    title.setOrigin(0.5, 0.5);
    title.setTint(TEXT.TITLE);
    this.texts.push(title);

    // Subtitle
    const subtitle = this.add.bitmapText(GAME_WIDTH / 2, 230, 'press-start', 'World Foundation - Phase 1', 8);
    subtitle.setOrigin(0.5, 0.5);
    subtitle.setTint(TEXT.SECONDARY);
    this.texts.push(subtitle);

    // New Game button
    const btnWidth = 380;
    const newGameX = (GAME_WIDTH - btnWidth) / 2;
    const newGameY = 270;
    const newGameBtn = new Button(this, {
      x: newGameX,
      y: newGameY,
      width: btnWidth,
      height: 48,
      label: 'NEW GAME',
      state: ButtonState.Normal,
      onClick: () => {
        const seed = Date.now();
        this.scene.start('game', { seed, isNewGame: true });
      },
    });
    this.buttons.push(newGameBtn);

    // Save slots
    const slots = SaveManager.getAllSlots();
    const slotStartY = 340;
    const slotHeight = 56;
    const slotSpacing = 8;

    for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
      const slotY = slotStartY + i * (slotHeight + slotSpacing);
      const slotData = slots[i];

      // Slot background
      const slotBg = this.add.graphics();
      slotBg.fillStyle(UI.PANEL_BG_ALT, 0.8);
      slotBg.fillRect(newGameX, slotY, btnWidth, slotHeight);
      slotBg.lineStyle(1, UI.PANEL_BORDER, 0.8);
      slotBg.strokeRect(newGameX, slotY, btnWidth, slotHeight);
      this.graphics.push(slotBg);

      if (slotData) {
        this.renderOccupiedSlot(newGameX, slotY, btnWidth, slotHeight, slotData, i);
      } else {
        this.renderEmptySlot(newGameX, slotY, btnWidth, slotHeight);
      }
    }
  }

  private renderOccupiedSlot(
    x: number, y: number,
    width: number, height: number,
    slotData: SaveSlotData, index: number
  ): void {
    // Name
    const nameText = this.add.bitmapText(x + 12, y + 10, 'press-start', slotData.name, 8);
    nameText.setScale(1.1);
    nameText.setTint(TEXT.PRIMARY);
    this.texts.push(nameText);

    // Date from saved game time
    const dateStr = this.getGameDateString(slotData);
    const dateText = this.add.bitmapText(x + 12, y + 32, 'press-start', dateStr, 8);
    dateText.setTint(TEXT.SECONDARY);
    this.texts.push(dateText);

    // Continue button
    const continueBtn = new Button(this, {
      x: x + width - 124,
      y: y + (height - 28) / 2,
      width: 80,
      height: 28,
      label: 'Continue',
      state: ButtonState.Normal,
      onClick: () => {
        this.scene.start('game', {
          seed: slotData.seed,
          isNewGame: false,
          saveData: slotData,
        });
      },
    });
    this.buttons.push(continueBtn);

    // Delete button
    const deleteBtn = new Button(this, {
      x: x + width - 36,
      y: y + (height - 28) / 2,
      width: 28,
      height: 28,
      label: 'X',
      state: ButtonState.Normal,
      isDanger: true,
      onClick: () => {
        this.confirmDialog = new ConfirmDialog(this, {
          title: 'Delete Save?',
          message: `Delete "${slotData.name}"?`,
          confirmLabel: 'Delete',
          isDanger: true,
          onConfirm: () => {
            SaveManager.delete(index as SlotIndex);
            this.confirmDialog = null;
            this.scene.restart();
          },
          onCancel: () => {
            this.confirmDialog = null;
          },
        });
      },
    });
    this.buttons.push(deleteBtn);
  }

  private renderEmptySlot(
    x: number, y: number,
    width: number, height: number
  ): void {
    const emptyText = this.add.bitmapText(
      x + width / 2, y + height / 2,
      'press-start', 'Empty', 8
    );
    emptyText.setOrigin(0.5, 0.5);
    emptyText.setTint(TEXT.DISABLED);
    this.texts.push(emptyText);
  }

  private getGameDateString(slotData: SaveSlotData): string {
    const ts = new TimeSystem();
    ts.setElapsedMinutes(slotData.gameTimeMinutes);
    const fullStr = ts.getDisplayString();
    // Extract date portion (after the time + spacing): "HH:MM  Mon DD, YYYY"
    // We want the date part: "Mon DD, YYYY"
    const parts = fullStr.split('  ');
    return parts.length > 1 ? parts[1] : fullStr;
  }

  private clearAll(): void {
    for (const btn of this.buttons) btn.destroy();
    for (const panel of this.panels) panel.destroy();
    for (const text of this.texts) text.destroy();
    for (const gfx of this.graphics) gfx.destroy();
    if (this.confirmDialog) {
      this.confirmDialog.destroy();
      this.confirmDialog = null;
    }
    this.buttons = [];
    this.panels = [];
    this.texts = [];
    this.graphics = [];
  }
}

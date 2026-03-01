import Phaser from 'phaser';
import { Panel } from './Panel';
import { Button } from './Button';
import { TextInput } from './TextInput';
import { ConfirmDialog } from './ConfirmDialog';
import { SaveManager } from '../systems/SaveManager';
import { GameScene } from '../scenes/GameScene';
import { UI, TEXT } from '../config/palette';
import { ButtonState } from '../types/ui';
import { SlotIndex, MAX_SAVE_SLOTS } from '../types/save';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game-config';

export class SaveMenu {
  private scrim: Phaser.GameObjects.Rectangle;
  private panel: Panel;
  private titleText: Phaser.GameObjects.BitmapText;
  private closeBtn: Button;
  private slotElements: Phaser.GameObjects.GameObject[] = [];
  private slotButtons: Button[] = [];
  private textInput: TextInput | null = null;
  private confirmDialog: ConfirmDialog | null = null;
  private savedFlash: Phaser.GameObjects.BitmapText | null = null;
  private scene: Phaser.Scene;
  private gameScene: GameScene;
  private onClose: () => void;
  private activeSlotIndex: number = -1;

  constructor(scene: Phaser.Scene, gameScene: GameScene, onClose: () => void) {
    this.scene = scene;
    this.gameScene = gameScene;
    this.onClose = onClose;

    const dialogWidth = 420;
    const dialogHeight = 400;
    const dx = (GAME_WIDTH - dialogWidth) / 2;
    const dy = (GAME_HEIGHT - dialogHeight) / 2;

    // Full-screen scrim
    this.scrim = scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      UI.OVERLAY_SCRIM, 0.6
    );
    this.scrim.setInteractive();

    // Dialog panel
    this.panel = new Panel(scene, dx, dy, dialogWidth, dialogHeight);

    // Title
    this.titleText = scene.add.bitmapText(dx + 20, dy + 16, 'press-start', 'Save Game', 8);
    this.titleText.setScale(1.5);
    this.titleText.setTint(TEXT.PRIMARY);

    // Close button
    this.closeBtn = new Button(scene, {
      x: dx + dialogWidth - 44,
      y: dy + 12,
      width: 28,
      height: 28,
      label: 'X',
      state: ButtonState.Normal,
      onClick: () => this.close(),
    });

    this.renderSlots(dx, dy, dialogWidth);
  }

  private renderSlots(dx: number, dy: number, dialogWidth: number): void {
    // Clear old slot elements
    for (const el of this.slotElements) el.destroy();
    for (const btn of this.slotButtons) btn.destroy();
    this.slotElements = [];
    this.slotButtons = [];
    if (this.textInput) {
      this.textInput.destroy();
      this.textInput = null;
    }

    const slots = SaveManager.getAllSlots();
    const slotHeight = 52;
    const slotStartY = dy + 56;

    for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
      const slotY = slotStartY + i * (slotHeight + 8);
      const slotData = slots[i];

      // Slot background
      const slotBg = this.scene.add.graphics();
      slotBg.fillStyle(UI.PANEL_BG_ALT, 0.8);
      slotBg.fillRect(dx + 16, slotY, dialogWidth - 32, slotHeight);
      slotBg.lineStyle(1, UI.PANEL_BORDER, 0.8);
      slotBg.strokeRect(dx + 16, slotY, dialogWidth - 32, slotHeight);
      this.slotElements.push(slotBg);

      if (this.activeSlotIndex === i) {
        // Show text input for naming
        const input = new TextInput(this.scene, dx + 24, slotY + 8, 240, 24, 'Enter save name...');
        this.textInput = input;

        const saveBtn = new Button(this.scene, {
          x: dx + dialogWidth - 120,
          y: slotY + 8,
          width: 80,
          height: 28,
          label: 'Save',
          state: ButtonState.Normal,
          onClick: () => {
            const name = input.getValue().trim() || `Save ${i + 1}`;
            const saveData = this.gameScene.collectSaveData(name);
            SaveManager.save(i as SlotIndex, saveData);
            this.activeSlotIndex = -1;
            this.renderSlots(dx, (GAME_HEIGHT - 400) / 2, dialogWidth);
            this.showSavedFlash();
          },
        });
        this.slotButtons.push(saveBtn);

        // Auto-focus the input
        this.scene.time.delayedCall(50, () => input.focus());
      } else if (slotData) {
        // Occupied slot: show name + date
        const nameText = this.scene.add.bitmapText(
          dx + 24, slotY + 10,
          'press-start', slotData.name, 8
        );
        nameText.setScale(1.1);
        nameText.setTint(TEXT.PRIMARY);
        this.slotElements.push(nameText);

        const dateStr = this.formatSaveDate(slotData.savedAt);
        const dateText = this.scene.add.bitmapText(
          dx + 24, slotY + 30,
          'press-start', dateStr, 8
        );
        dateText.setTint(TEXT.SECONDARY);
        this.slotElements.push(dateText);

        // Overwrite button
        const overwriteBtn = new Button(this.scene, {
          x: dx + dialogWidth - 140,
          y: slotY + 12,
          width: 96,
          height: 28,
          label: 'Overwrite',
          state: ButtonState.Normal,
          onClick: () => {
            this.confirmDialog = new ConfirmDialog(this.scene, {
              title: 'Overwrite Save?',
              message: `Replace "${slotData.name}"?`,
              confirmLabel: 'Overwrite',
              isDanger: true,
              onConfirm: () => {
                const saveDataNew = this.gameScene.collectSaveData(slotData.name);
                SaveManager.save(i as SlotIndex, saveDataNew);
                this.confirmDialog = null;
                this.renderSlots(dx, (GAME_HEIGHT - 400) / 2, dialogWidth);
                this.showSavedFlash();
              },
              onCancel: () => {
                this.confirmDialog = null;
              },
            });
          },
        });
        this.slotButtons.push(overwriteBtn);
      } else {
        // Empty slot
        const emptyText = this.scene.add.bitmapText(
          dx + 16 + (dialogWidth - 32) / 2, slotY + slotHeight / 2,
          'press-start', 'Empty', 8
        );
        emptyText.setOrigin(0.5, 0.5);
        emptyText.setTint(TEXT.DISABLED);
        this.slotElements.push(emptyText);

        // Click to save
        const hitArea = this.scene.add.rectangle(
          dx + 16 + (dialogWidth - 32) / 2,
          slotY + slotHeight / 2,
          dialogWidth - 32, slotHeight
        );
        hitArea.setOrigin(0.5, 0.5);
        hitArea.setFillStyle(0x000000, 0);
        hitArea.setInteractive({ useHandCursor: true });
        hitArea.on('pointerup', () => {
          this.activeSlotIndex = i;
          this.renderSlots(dx, (GAME_HEIGHT - 400) / 2, dialogWidth);
        });
        this.slotElements.push(hitArea);
      }
    }
  }

  private formatSaveDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private showSavedFlash(): void {
    if (this.savedFlash) this.savedFlash.destroy();

    this.savedFlash = this.scene.add.bitmapText(
      GAME_WIDTH / 2, GAME_HEIGHT / 2 + 180,
      'press-start', 'Saved!', 8
    );
    this.savedFlash.setOrigin(0.5, 0.5);
    this.savedFlash.setScale(1.5);
    this.savedFlash.setTint(TEXT.SUCCESS);

    this.scene.time.delayedCall(1500, () => {
      if (this.savedFlash) {
        this.savedFlash.destroy();
        this.savedFlash = null;
      }
    });
  }

  close(): void {
    if (this.confirmDialog) {
      this.confirmDialog.destroy();
      this.confirmDialog = null;
    }
    if (this.textInput) {
      this.textInput.destroy();
      this.textInput = null;
    }
    if (this.savedFlash) {
      this.savedFlash.destroy();
      this.savedFlash = null;
    }
    for (const el of this.slotElements) el.destroy();
    for (const btn of this.slotButtons) btn.destroy();
    this.scrim.destroy();
    this.panel.destroy();
    this.titleText.destroy();
    this.closeBtn.destroy();
    this.onClose();
  }
}

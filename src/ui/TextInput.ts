import Phaser from 'phaser';
import { UI, TEXT } from '../config/palette';
import { MAX_SAVE_NAME_LENGTH } from '../types/save';

export class TextInput {
  private bg: Phaser.GameObjects.Graphics;
  private displayText: Phaser.GameObjects.BitmapText;
  private hiddenInput: HTMLInputElement;
  private hitArea: Phaser.GameObjects.Rectangle;
  private scene: Phaser.Scene;
  private focused: boolean = false;
  private x: number;
  private y: number;
  private width: number;
  private height: number;

  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    width: number, height: number,
    placeholder: string = ''
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    // Visual input box
    this.bg = scene.add.graphics();
    this.drawBorder(false);

    // Display text mirrored from hidden input
    this.displayText = scene.add.bitmapText(x + 8, y + (height - 8) / 2, 'press-start', placeholder, 8);
    this.displayText.setTint(TEXT.SECONDARY);

    // Hidden HTML input element
    this.hiddenInput = document.createElement('input');
    this.hiddenInput.type = 'text';
    this.hiddenInput.maxLength = MAX_SAVE_NAME_LENGTH;
    this.hiddenInput.style.position = 'absolute';
    this.hiddenInput.style.left = '-9999px';
    this.hiddenInput.style.top = '-9999px';
    this.hiddenInput.style.opacity = '0';
    document.body.appendChild(this.hiddenInput);

    this.hiddenInput.addEventListener('input', () => {
      this.displayText.setText(this.hiddenInput.value);
      this.displayText.setTint(TEXT.PRIMARY);
    });

    this.hiddenInput.addEventListener('focus', () => {
      this.focused = true;
      this.drawBorder(true);
    });

    this.hiddenInput.addEventListener('blur', () => {
      this.focused = false;
      this.drawBorder(false);
    });

    // Click on visual box focuses the hidden input
    this.hitArea = scene.add.rectangle(
      x + width / 2, y + height / 2, width, height
    );
    this.hitArea.setOrigin(0.5, 0.5);
    this.hitArea.setFillStyle(0x000000, 0);
    this.hitArea.setInteractive({ useHandCursor: true });
    this.hitArea.on('pointerdown', () => {
      this.focus();
    });

    // Safety: remove HTML element if scene shuts down without explicit destroy
    scene.events.once('shutdown', () => {
      this.removeHiddenInput();
    });
  }

  private drawBorder(focused: boolean): void {
    this.bg.clear();
    this.bg.fillStyle(UI.INPUT_BG, 1);
    this.bg.fillRect(this.x, this.y, this.width, this.height);
    const borderColor = focused ? UI.INPUT_FOCUS_BORDER : UI.INPUT_BORDER;
    this.bg.lineStyle(1, borderColor, 1);
    this.bg.strokeRect(this.x, this.y, this.width, this.height);
  }

  private removeHiddenInput(): void {
    if (this.hiddenInput.parentNode) {
      this.hiddenInput.parentNode.removeChild(this.hiddenInput);
    }
  }

  getValue(): string {
    return this.hiddenInput.value;
  }

  focus(): void {
    this.hiddenInput.focus();
  }

  destroy(): void {
    this.bg.destroy();
    this.displayText.destroy();
    this.hitArea.destroy();
    this.removeHiddenInput();
  }
}

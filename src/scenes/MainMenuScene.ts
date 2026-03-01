import Phaser from 'phaser';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'main-menu' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x0A0A1A);
    const title = this.add.bitmapText(640, 200, 'press-start', 'RAIL TYCOON', 8);
    title.setScale(4);
    title.setOrigin(0.5, 0.5);
    title.setTint(0xF0E6D0);

    const subtitle = this.add.bitmapText(640, 260, 'press-start', 'World Foundation - Phase 1', 8);
    subtitle.setOrigin(0.5, 0.5);
    subtitle.setTint(0xA89880);
  }
}

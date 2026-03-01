import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game-config';
import { TilesetGenerator } from '../systems/TilesetGenerator';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'boot' });
  }

  preload(): void {
    // Loading bar
    const bar = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 0, 20, 0xE2B755);
    this.load.on('progress', (value: number) => {
      bar.width = 400 * value;
    });
  }

  create(): void {
    // Generate bitmap font from canvas
    this.generateBitmapFont();

    // Generate terrain tileset texture
    TilesetGenerator.generate(this);

    // Transition to main menu
    this.scene.start('main-menu');
  }

  private generateBitmapFont(): void {
    const fontSize = 8;
    // TEXT_SET1 plus £ sign (U+00A3) for British Pounds Sterling
    const chars = Phaser.GameObjects.RetroFont.TEXT_SET1 + '\u00A3';
    const charWidth = fontSize;
    const charHeight = fontSize;
    const cols = chars.length;

    const canvas = document.createElement('canvas');
    canvas.width = cols * charWidth;
    canvas.height = charHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to get 2D canvas context for font generation');
      return;
    }

    // White text on transparent background
    ctx.fillStyle = '#ffffff';
    ctx.font = `${fontSize}px monospace`;
    ctx.textBaseline = 'top';

    for (let i = 0; i < chars.length; i++) {
      ctx.fillText(chars[i], i * charWidth, 0);
    }

    // Add as Phaser texture
    this.textures.addCanvas('press-start-texture', canvas);

    // Use RetroFont.Parse to build bitmap font data
    const fontData = Phaser.GameObjects.RetroFont.Parse(this, {
      image: 'press-start-texture',
      width: charWidth,
      height: charHeight,
      chars: chars,
      charsPerRow: cols,
      'offset.x': 0,
      'offset.y': 0,
      'spacing.x': 0,
      'spacing.y': 0,
      lineSpacing: 0,
    });

    // Register the bitmap font in the cache
    this.cache.bitmapFont.add('press-start', fontData);
  }
}

import Phaser from 'phaser';
import { INFRASTRUCTURE } from '../config/palette';
import { TILE_SIZE } from '../config/game-config';

/** Depth layer for ghost preview rectangles. */
const GHOST_DEPTH = 10;

/** Alpha for valid ghost tiles. */
const VALID_ALPHA = 0.5;

/** Alpha for invalid ghost tiles. */
const INVALID_ALPHA = 0.4;

export class GhostPreviewManager {
  private scene: Phaser.Scene;
  /** Pool of reusable rectangles. */
  private pool: Phaser.GameObjects.Rectangle[] = [];
  /** Currently active (visible) rectangles. */
  private active: Phaser.GameObjects.Rectangle[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Get a rectangle from the pool or create a new one. */
  private acquire(): Phaser.GameObjects.Rectangle {
    let rect: Phaser.GameObjects.Rectangle | undefined;
    // Try to reuse from pool, skipping any externally destroyed objects
    while (this.pool.length > 0) {
      const candidate = this.pool.pop()!;
      if (candidate.scene) {
        candidate.setVisible(true);
        rect = candidate;
        break;
      }
    }
    if (!rect) {
      rect = this.scene.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE);
      rect.setOrigin(0, 0);
      rect.setDepth(GHOST_DEPTH);
    }
    this.active.push(rect);
    return rect;
  }

  /** Return all active rectangles to the pool. */
  clearAll(): void {
    for (const rect of this.active) {
      rect.setVisible(false);
      this.pool.push(rect);
    }
    this.active.length = 0;
  }

  /** Show a single-tile ghost preview. */
  showSingle(x: number, y: number, valid: boolean): void {
    this.clearAll();
    const rect = this.acquire();
    rect.setPosition(x * TILE_SIZE, y * TILE_SIZE);
    rect.setFillStyle(
      valid ? INFRASTRUCTURE.GHOST_VALID : INFRASTRUCTURE.GHOST_INVALID,
      valid ? VALID_ALPHA : INVALID_ALPHA,
    );
  }

  /** Show a multi-tile route preview with per-tile validity. */
  showRoute(tiles: { x: number; y: number; valid: boolean }[]): void {
    this.clearAll();
    for (const tile of tiles) {
      const rect = this.acquire();
      rect.setPosition(tile.x * TILE_SIZE, tile.y * TILE_SIZE);
      rect.setFillStyle(
        tile.valid ? INFRASTRUCTURE.GHOST_VALID : INFRASTRUCTURE.GHOST_INVALID,
        tile.valid ? VALID_ALPHA : INVALID_ALPHA,
      );
    }
  }

  /** Show a multi-tile station preview. All tiles share the same validity. */
  showMultiTile(tiles: { x: number; y: number }[], valid: boolean): void {
    this.clearAll();
    for (const tile of tiles) {
      const rect = this.acquire();
      rect.setPosition(tile.x * TILE_SIZE, tile.y * TILE_SIZE);
      rect.setFillStyle(
        valid ? INFRASTRUCTURE.GHOST_VALID : INFRASTRUCTURE.GHOST_INVALID,
        valid ? VALID_ALPHA : INVALID_ALPHA,
      );
    }
  }

  /** Show a bridge preview with per-tile validity. */
  showBridge(tiles: { x: number; y: number; valid: boolean }[]): void {
    this.clearAll();
    for (const tile of tiles) {
      const rect = this.acquire();
      rect.setPosition(tile.x * TILE_SIZE, tile.y * TILE_SIZE);
      rect.setFillStyle(
        tile.valid ? INFRASTRUCTURE.GHOST_VALID : INFRASTRUCTURE.GHOST_INVALID,
        tile.valid ? VALID_ALPHA : INVALID_ALPHA,
      );
    }
  }

  /** Destroy all rectangles and clean up. */
  destroy(): void {
    for (const rect of this.active) {
      rect.destroy();
    }
    for (const rect of this.pool) {
      rect.destroy();
    }
    this.active.length = 0;
    this.pool.length = 0;
  }
}

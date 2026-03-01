import Phaser from 'phaser';
import { INFRASTRUCTURE } from '../config/palette';
import { TILE_SIZE } from '../config/game-config';

/**
 * Total tile count in the infrastructure tileset:
 * 0-8:   Rail (9 variants)
 * 9-17:  Elevated rail (9 variants)
 * 18-19: Bridge (horizontal, vertical)
 * 20-22: Station (Halt, Town, City)
 */
const TOTAL_TILES = 23;

/** Half tile size for center calculations. */
const HALF = TILE_SIZE / 2;

/** Convert a 0xRRGGBB hex number to an rgb() CSS string. */
function hexToRgba(hex: number): string {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return `rgb(${r},${g},${b})`;
}

/**
 * Generates the 'infra-tileset' texture containing all infrastructure sprites.
 * Should be called once during boot, after terrain tileset generation.
 */
export class InfrastructureTilesetGenerator {
  static generate(scene: Phaser.Scene): void {
    const canvasWidth = TOTAL_TILES * TILE_SIZE;
    const canvasHeight = TILE_SIZE;
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D canvas context for infrastructure tileset generation');
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // --- Rail variants (indices 0-8) ---
    const railColor = hexToRgba(INFRASTRUCTURE.RAIL);
    InfrastructureTilesetGenerator.drawRailVariants(ctx, 0, railColor);

    // --- Elevated rail variants (indices 9-17) ---
    const elevColor = hexToRgba(INFRASTRUCTURE.RAIL_ELEVATED);
    const shadowColor = hexToRgba(INFRASTRUCTURE.RAIL_SHADOW);
    InfrastructureTilesetGenerator.drawElevatedRailVariants(ctx, 9, elevColor, shadowColor);

    // --- Bridge variants (indices 18-19) ---
    InfrastructureTilesetGenerator.drawBridgeVariants(ctx, 18);

    // --- Station variants (indices 20-22) ---
    InfrastructureTilesetGenerator.drawStationVariants(ctx, 20);

    // Add texture to Phaser
    scene.textures.addCanvas('infra-tileset', canvas);

    // Add frame definitions so individual tiles can be referenced by index
    const texture = scene.textures.get('infra-tileset');
    for (let i = 0; i < TOTAL_TILES; i++) {
      texture.add(i, 0, i * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
    }
  }

  /**
   * Draw 9 rail variants at the given starting tile index.
   * 0: N-S, 1: NE-SW, 2: E-W, 3: SE-NW,
   * 4: N-E curve, 5: E-S curve, 6: S-W curve, 7: W-N curve, 8: crossing
   */
  private static drawRailVariants(
    ctx: CanvasRenderingContext2D,
    startIndex: number,
    color: string,
  ): void {
    const lineWidth = 2;

    // Index 0: N-S (vertical line through center)
    InfrastructureTilesetGenerator.drawLine(
      ctx, startIndex, color, lineWidth,
      HALF, 0, HALF, TILE_SIZE,
    );

    // Index 1: NE-SW (diagonal)
    InfrastructureTilesetGenerator.drawLine(
      ctx, startIndex + 1, color, lineWidth,
      TILE_SIZE, 0, 0, TILE_SIZE,
    );

    // Index 2: E-W (horizontal line through center)
    InfrastructureTilesetGenerator.drawLine(
      ctx, startIndex + 2, color, lineWidth,
      0, HALF, TILE_SIZE, HALF,
    );

    // Index 3: SE-NW (diagonal)
    InfrastructureTilesetGenerator.drawLine(
      ctx, startIndex + 3, color, lineWidth,
      0, 0, TILE_SIZE, TILE_SIZE,
    );

    // Index 4: N-E curve
    InfrastructureTilesetGenerator.drawCurve(
      ctx, startIndex + 4, color, lineWidth,
      HALF, 0, TILE_SIZE, HALF,
    );

    // Index 5: E-S curve
    InfrastructureTilesetGenerator.drawCurve(
      ctx, startIndex + 5, color, lineWidth,
      TILE_SIZE, HALF, HALF, TILE_SIZE,
    );

    // Index 6: S-W curve
    InfrastructureTilesetGenerator.drawCurve(
      ctx, startIndex + 6, color, lineWidth,
      HALF, TILE_SIZE, 0, HALF,
    );

    // Index 7: W-N curve
    InfrastructureTilesetGenerator.drawCurve(
      ctx, startIndex + 7, color, lineWidth,
      0, HALF, HALF, 0,
    );

    // Index 8: Crossing (N-S + E-W)
    const ox = (startIndex + 8) * TILE_SIZE;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(ox + HALF, 0);
    ctx.lineTo(ox + HALF, TILE_SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox, HALF);
    ctx.lineTo(ox + TILE_SIZE, HALF);
    ctx.stroke();
  }

  /**
   * Draw 9 elevated rail variants. Same patterns as rail but with
   * darker color and a shadow line 2px below.
   */
  private static drawElevatedRailVariants(
    ctx: CanvasRenderingContext2D,
    startIndex: number,
    color: string,
    shadowColor: string,
  ): void {
    const lineWidth = 2;
    const shadowOffset = 2;

    // For each of the 9 variants, draw shadow first, then main line
    const variants: Array<() => void> = [
      // 0: N-S
      () => {
        InfrastructureTilesetGenerator.drawLine(ctx, startIndex, shadowColor, lineWidth, HALF, shadowOffset, HALF, TILE_SIZE + shadowOffset);
        InfrastructureTilesetGenerator.drawLine(ctx, startIndex, color, lineWidth, HALF, 0, HALF, TILE_SIZE);
      },
      // 1: NE-SW
      () => {
        InfrastructureTilesetGenerator.drawLine(ctx, startIndex + 1, shadowColor, lineWidth, TILE_SIZE, shadowOffset, 0, TILE_SIZE + shadowOffset);
        InfrastructureTilesetGenerator.drawLine(ctx, startIndex + 1, color, lineWidth, TILE_SIZE, 0, 0, TILE_SIZE);
      },
      // 2: E-W
      () => {
        InfrastructureTilesetGenerator.drawLine(ctx, startIndex + 2, shadowColor, lineWidth, 0, HALF + shadowOffset, TILE_SIZE, HALF + shadowOffset);
        InfrastructureTilesetGenerator.drawLine(ctx, startIndex + 2, color, lineWidth, 0, HALF, TILE_SIZE, HALF);
      },
      // 3: SE-NW
      () => {
        InfrastructureTilesetGenerator.drawLine(ctx, startIndex + 3, shadowColor, lineWidth, 0, shadowOffset, TILE_SIZE, TILE_SIZE + shadowOffset);
        InfrastructureTilesetGenerator.drawLine(ctx, startIndex + 3, color, lineWidth, 0, 0, TILE_SIZE, TILE_SIZE);
      },
      // 4: N-E curve
      () => {
        InfrastructureTilesetGenerator.drawCurve(ctx, startIndex + 4, shadowColor, lineWidth, HALF, shadowOffset, TILE_SIZE, HALF + shadowOffset);
        InfrastructureTilesetGenerator.drawCurve(ctx, startIndex + 4, color, lineWidth, HALF, 0, TILE_SIZE, HALF);
      },
      // 5: E-S curve
      () => {
        InfrastructureTilesetGenerator.drawCurve(ctx, startIndex + 5, shadowColor, lineWidth, TILE_SIZE, HALF + shadowOffset, HALF, TILE_SIZE + shadowOffset);
        InfrastructureTilesetGenerator.drawCurve(ctx, startIndex + 5, color, lineWidth, TILE_SIZE, HALF, HALF, TILE_SIZE);
      },
      // 6: S-W curve
      () => {
        InfrastructureTilesetGenerator.drawCurve(ctx, startIndex + 6, shadowColor, lineWidth, HALF, TILE_SIZE + shadowOffset, 0, HALF + shadowOffset);
        InfrastructureTilesetGenerator.drawCurve(ctx, startIndex + 6, color, lineWidth, HALF, TILE_SIZE, 0, HALF);
      },
      // 7: W-N curve
      () => {
        InfrastructureTilesetGenerator.drawCurve(ctx, startIndex + 7, shadowColor, lineWidth, 0, HALF + shadowOffset, HALF, shadowOffset);
        InfrastructureTilesetGenerator.drawCurve(ctx, startIndex + 7, color, lineWidth, 0, HALF, HALF, 0);
      },
      // 8: Crossing
      () => {
        const ox = (startIndex + 8) * TILE_SIZE;
        // Shadow
        ctx.strokeStyle = shadowColor;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(ox + HALF, shadowOffset);
        ctx.lineTo(ox + HALF, TILE_SIZE + shadowOffset);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ox, HALF + shadowOffset);
        ctx.lineTo(ox + TILE_SIZE, HALF + shadowOffset);
        ctx.stroke();
        // Main
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(ox + HALF, 0);
        ctx.lineTo(ox + HALF, TILE_SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ox, HALF);
        ctx.lineTo(ox + TILE_SIZE, HALF);
        ctx.stroke();
      },
    ];

    for (const draw of variants) {
      draw();
    }
  }

  /**
   * Draw bridge variants.
   * Index 18: Horizontal bridge
   * Index 19: Vertical bridge
   */
  private static drawBridgeVariants(ctx: CanvasRenderingContext2D, startIndex: number): void {
    const woodColor = hexToRgba(INFRASTRUCTURE.BRIDGE_WOOD);
    const stoneColor = hexToRgba(INFRASTRUCTURE.BRIDGE_STONE);
    const lineWidth = 2;

    // Horizontal bridge (index 18)
    {
      const ox = startIndex * TILE_SIZE;
      // Draw stone supports (vertical bars at edges)
      ctx.fillStyle = stoneColor;
      ctx.fillRect(ox, HALF - 4, 2, 8);
      ctx.fillRect(ox + TILE_SIZE - 2, HALF - 4, 2, 8);
      // Draw wood planks (horizontal line)
      ctx.strokeStyle = woodColor;
      ctx.lineWidth = lineWidth + 2;
      ctx.beginPath();
      ctx.moveTo(ox, HALF);
      ctx.lineTo(ox + TILE_SIZE, HALF);
      ctx.stroke();
      // Rail line on top
      ctx.strokeStyle = hexToRgba(INFRASTRUCTURE.RAIL);
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(ox, HALF);
      ctx.lineTo(ox + TILE_SIZE, HALF);
      ctx.stroke();
    }

    // Vertical bridge (index 19)
    {
      const ox = (startIndex + 1) * TILE_SIZE;
      // Draw stone supports (horizontal bars at edges)
      ctx.fillStyle = stoneColor;
      ctx.fillRect(ox + HALF - 4, 0, 8, 2);
      ctx.fillRect(ox + HALF - 4, TILE_SIZE - 2, 8, 2);
      // Draw wood planks (vertical line)
      ctx.strokeStyle = woodColor;
      ctx.lineWidth = lineWidth + 2;
      ctx.beginPath();
      ctx.moveTo(ox + HALF, 0);
      ctx.lineTo(ox + HALF, TILE_SIZE);
      ctx.stroke();
      // Rail line on top
      ctx.strokeStyle = hexToRgba(INFRASTRUCTURE.RAIL);
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(ox + HALF, 0);
      ctx.lineTo(ox + HALF, TILE_SIZE);
      ctx.stroke();
    }
  }

  /**
   * Draw station variants.
   * Index 20: Halt (1x1)
   * Index 21: Town (shown as one tile of a 2x1)
   * Index 22: City (shown as one tile of a 3x2)
   */
  private static drawStationVariants(ctx: CanvasRenderingContext2D, startIndex: number): void {
    // Halt (index 20) - small square platform
    {
      const ox = startIndex * TILE_SIZE;
      ctx.fillStyle = hexToRgba(INFRASTRUCTURE.STATION_HALT);
      ctx.fillRect(ox + 2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
      // Border
      ctx.strokeStyle = hexToRgba(INFRASTRUCTURE.RAIL);
      ctx.lineWidth = 1;
      ctx.strokeRect(ox + 2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
    }

    // Town (index 21) - medium platform tile
    {
      const ox = (startIndex + 1) * TILE_SIZE;
      ctx.fillStyle = hexToRgba(INFRASTRUCTURE.STATION_TOWN);
      ctx.fillRect(ox + 1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
      // Border
      ctx.strokeStyle = hexToRgba(INFRASTRUCTURE.RAIL);
      ctx.lineWidth = 1;
      ctx.strokeRect(ox + 1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
      // Roof accent line
      ctx.fillStyle = hexToRgba(INFRASTRUCTURE.RAIL_ELEVATED);
      ctx.fillRect(ox + 3, 3, TILE_SIZE - 6, 2);
    }

    // City (index 22) - large platform tile
    {
      const ox = (startIndex + 2) * TILE_SIZE;
      ctx.fillStyle = hexToRgba(INFRASTRUCTURE.STATION_CITY);
      ctx.fillRect(ox, 0, TILE_SIZE, TILE_SIZE);
      // Inner platform
      ctx.fillStyle = hexToRgba(INFRASTRUCTURE.STATION_TOWN);
      ctx.fillRect(ox + 2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
      // Border
      ctx.strokeStyle = hexToRgba(INFRASTRUCTURE.RAIL);
      ctx.lineWidth = 1;
      ctx.strokeRect(ox, 0, TILE_SIZE, TILE_SIZE);
    }
  }

  /** Helper: draw a straight line within a tile. */
  private static drawLine(
    ctx: CanvasRenderingContext2D,
    tileIndex: number,
    color: string,
    lineWidth: number,
    x1: number, y1: number,
    x2: number, y2: number,
  ): void {
    const ox = tileIndex * TILE_SIZE;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(ox + x1, y1);
    ctx.lineTo(ox + x2, y2);
    ctx.stroke();
  }

  /** Helper: draw a curved line (quarter arc) between two edge midpoints within a tile. */
  private static drawCurve(
    ctx: CanvasRenderingContext2D,
    tileIndex: number,
    color: string,
    lineWidth: number,
    x1: number, y1: number,
    x2: number, y2: number,
  ): void {
    const ox = tileIndex * TILE_SIZE;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(ox + x1, y1);
    // Use quadratic curve with control point at the intersection of the two lines
    const cx = (x1 === HALF || x2 === HALF)
      ? (x1 === HALF ? x2 : x1)
      : HALF;
    const cy = (y1 === HALF || y2 === HALF)
      ? (y1 === HALF ? y2 : y1)
      : HALF;
    // Simple approach: control point at the corner where the two edges meet
    const ctrlX = (x1 === HALF && x2 === HALF) ? HALF : (x1 !== HALF ? x1 : x2);
    const ctrlY = (y1 === HALF && y2 === HALF) ? HALF : (y1 !== HALF ? y1 : y2);
    // For curves between edge midpoints, use the tile corner as control point
    let cornerX: number;
    let cornerY: number;

    // N-E: from (HALF, 0) to (TILE_SIZE, HALF) -> corner at (TILE_SIZE, 0)
    // E-S: from (TILE_SIZE, HALF) to (HALF, TILE_SIZE) -> corner at (TILE_SIZE, TILE_SIZE)
    // S-W: from (HALF, TILE_SIZE) to (0, HALF) -> corner at (0, TILE_SIZE)
    // W-N: from (0, HALF) to (HALF, 0) -> corner at (0, 0)
    if (x1 <= HALF && y2 <= HALF) {
      // W-N
      cornerX = 0; cornerY = 0;
    } else if (x1 >= HALF && y1 <= HALF) {
      // N-E or from top
      cornerX = TILE_SIZE; cornerY = 0;
    } else if (y1 >= HALF && x2 <= HALF) {
      // S-W
      cornerX = 0; cornerY = TILE_SIZE;
    } else {
      // E-S
      cornerX = TILE_SIZE; cornerY = TILE_SIZE;
    }

    // Suppress unused variable warnings
    void cx; void cy; void ctrlX; void ctrlY;

    ctx.quadraticCurveTo(ox + cornerX, cornerY, ox + x2, y2);
    ctx.stroke();
  }
}

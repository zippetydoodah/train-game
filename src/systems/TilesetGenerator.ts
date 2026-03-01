import Phaser from 'phaser';
import { TerrainType, TERRAIN_TYPE_COUNT } from '../types/terrain';
import { TERRAIN_COLORS } from '../config/palette';
import { TILE_SIZE } from '../config/game-config';

/** Number of terrain pairs that have transition tiles. */
const TRANSITION_PAIRS = 6;
/** Number of cardinal bitmask variants per pair. */
const VARIANTS_PER_PAIR = 16;
/** Total base tiles (one per TerrainType). */
const BASE_TILE_COUNT = TERRAIN_TYPE_COUNT;
/** Total transition tiles. */
const TRANSITION_TILE_COUNT = TRANSITION_PAIRS * VARIANTS_PER_PAIR;
/** Total tiles in the tileset. */
const TOTAL_TILES = BASE_TILE_COUNT + TRANSITION_TILE_COUNT;

/** Simple seeded PRNG for deterministic pixel patterns. */
function seededRandom(x: number, y: number, seed: number): number {
  let h = seed | 0;
  h = Math.imul(h ^ x, 2654435761);
  h = Math.imul(h ^ y, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  h = (h ^ (h >>> 16)) >>> 0;
  return (h & 0xffff) / 0xffff;
}

/** Extract r, g, b components from a 0xRRGGBB number. */
function hexToRgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

/** Blend two colours by factor t (0 = a, 1 = b). */
function lerpColor(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
  t: number,
): [number, number, number] {
  return [
    Math.round(r1 + (r2 - r1) * t),
    Math.round(g1 + (g2 - g1) * t),
    Math.round(b1 + (b2 - b1) * t),
  ];
}

/** Clamp a value to [0, 255]. */
function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

export class TilesetGenerator {
  /**
   * Generate the 'terrain-tileset' texture and add it to the scene's texture
   * manager.  Should be called once during boot.
   */
  static generate(scene: Phaser.Scene): void {
    const canvasWidth = TOTAL_TILES * TILE_SIZE;
    const canvasHeight = TILE_SIZE;
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D canvas context for tileset generation');
    }

    // --- 1. Draw 7 base tiles ------------------------------------------
    for (let t = 0; t < TERRAIN_TYPE_COUNT; t++) {
      const offsetX = t * TILE_SIZE;
      TilesetGenerator.drawBaseTile(ctx, offsetX, 0, t as TerrainType);
    }

    // --- 2. Draw 96 transition tiles -----------------------------------
    for (let pair = 0; pair < TRANSITION_PAIRS; pair++) {
      for (let mask = 0; mask < VARIANTS_PER_PAIR; mask++) {
        const tileIndex = BASE_TILE_COUNT + pair * VARIANTS_PER_PAIR + mask;
        const offsetX = tileIndex * TILE_SIZE;
        TilesetGenerator.drawTransitionTile(ctx, offsetX, 0, pair, mask);
      }
    }

    // --- 3. Apply elevation shading to all tiles -----------------------
    TilesetGenerator.applyElevationShading(ctx);

    // --- 4. Add texture to Phaser --------------------------------------
    scene.textures.addCanvas('terrain-tileset', canvas);
  }

  // -------------------------------------------------------------------
  // Base tile drawing with per-terrain pixel patterns
  // -------------------------------------------------------------------

  private static drawBaseTile(
    ctx: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    terrain: TerrainType,
  ): void {
    const [br, bg, bb] = hexToRgb(TERRAIN_COLORS[terrain]);

    // Fill base colour
    const imageData = ctx.createImageData(TILE_SIZE, TILE_SIZE);
    const data = imageData.data;

    for (let py = 0; py < TILE_SIZE; py++) {
      for (let px = 0; px < TILE_SIZE; px++) {
        const idx = (py * TILE_SIZE + px) * 4;
        let r = br, g = bg, b = bb;

        // Per-terrain patterns
        switch (terrain) {
          case TerrainType.DeepWater:
            r = br; g = bg; b = bb;
            // Subtle darker horizontal wave lines every 4th row
            if (py % 4 === 0) {
              const shift = ((py / 4) % 2 === 0) ? 1 : -1;
              const sx = px + shift;
              if (sx >= 0 && sx < TILE_SIZE) {
                r = clamp255(br - 18);
                g = clamp255(bg - 18);
                b = clamp255(bb - 12);
              }
            }
            break;

          case TerrainType.ShallowWater:
            // Lighter ripple dots scattered via seeded random
            if (seededRandom(px, py, 101) > 0.85) {
              r = clamp255(br + 25);
              g = clamp255(bg + 25);
              b = clamp255(bb + 20);
            }
            break;

          case TerrainType.Sand:
            // Scattered darker speckle dots
            if (seededRandom(px, py, 202) > 0.82) {
              r = clamp255(br - 22);
              g = clamp255(bg - 18);
              b = clamp255(bb - 14);
            }
            break;

          case TerrainType.Grassland:
            // Small lighter green pixel clusters
            if (seededRandom(px, py, 303) > 0.78) {
              r = clamp255(br + 18);
              g = clamp255(bg + 24);
              b = clamp255(bb + 10);
            }
            break;

          case TerrainType.Forest: {
            // Lighter canopy cluster dots in 2-3 small groups
            const gx = Math.floor(px / 5);
            const gy = Math.floor(py / 5);
            const inCluster = seededRandom(gx, gy, 404) > 0.5;
            if (inCluster && seededRandom(px, py, 405) > 0.6) {
              r = clamp255(br + 20);
              g = clamp255(bg + 28);
              b = clamp255(bb + 12);
            }
            break;
          }

          case TerrainType.Hills:
            // Subtle contour lines - gentle curved patterns
            if (((px + py * 2) % 7 === 0) || ((px * 2 + py) % 9 === 0)) {
              r = clamp255(br - 14);
              g = clamp255(bg - 10);
              b = clamp255(bb - 10);
            }
            break;

          case TerrainType.Mountains:
            // Darker crevice pixels
            if (seededRandom(px, py, 606) > 0.8) {
              r = clamp255(br - 25);
              g = clamp255(bg - 22);
              b = clamp255(bb - 20);
            }
            // Lighter snow cap pixels in top rows (rows 0-3)
            if (py < 4 && seededRandom(px, py, 607) > 0.45) {
              r = clamp255(br + 40);
              g = clamp255(bg + 38);
              b = clamp255(bb + 42);
            }
            break;
        }

        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, ox, oy);
  }

  // -------------------------------------------------------------------
  // Transition tile drawing
  // -------------------------------------------------------------------

  private static drawTransitionTile(
    ctx: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    pairIndex: number,
    mask: number,
  ): void {
    // Determine the two terrain types for this pair.
    // pairIndex = lower terrain index (0-5); neighbor = lower + 1
    const lowerTerrain = pairIndex as TerrainType;
    const upperTerrain = (pairIndex + 1) as TerrainType;

    // Start with the centre terrain (use lower terrain as the base)
    // and blend edges toward the upper terrain where the bitmask says so.
    const [br, bg, bb] = hexToRgb(TERRAIN_COLORS[lowerTerrain]);
    const [nr, ng, nb] = hexToRgb(TERRAIN_COLORS[upperTerrain]);

    const imageData = ctx.createImageData(TILE_SIZE, TILE_SIZE);
    const data = imageData.data;

    // Blend depth in pixels from the edge
    const blendDepth = 4;

    for (let py = 0; py < TILE_SIZE; py++) {
      for (let px = 0; px < TILE_SIZE; px++) {
        const idx = (py * TILE_SIZE + px) * 4;

        // Start with base colour
        let r = br, g = bg, b = bb;

        // Calculate maximum blend factor from all active edge bits
        let maxBlend = 0;

        // Bit 0 = North: blend top rows
        if (mask & 1) {
          if (py < blendDepth) {
            const t = 1 - py / blendDepth;
            if (t > maxBlend) maxBlend = t;
          }
        }

        // Bit 1 = East: blend right columns
        if (mask & 2) {
          const distFromRight = TILE_SIZE - 1 - px;
          if (distFromRight < blendDepth) {
            const t = 1 - distFromRight / blendDepth;
            if (t > maxBlend) maxBlend = t;
          }
        }

        // Bit 2 = South: blend bottom rows
        if (mask & 4) {
          const distFromBottom = TILE_SIZE - 1 - py;
          if (distFromBottom < blendDepth) {
            const t = 1 - distFromBottom / blendDepth;
            if (t > maxBlend) maxBlend = t;
          }
        }

        // Bit 3 = West: blend left columns
        if (mask & 8) {
          if (px < blendDepth) {
            const t = 1 - px / blendDepth;
            if (t > maxBlend) maxBlend = t;
          }
        }

        // Add dither noise for natural look
        if (maxBlend > 0) {
          const dither = (seededRandom(px, py, pairIndex * 100 + mask) - 0.5) * 0.15;
          maxBlend = Math.max(0, Math.min(1, maxBlend + dither));
          [r, g, b] = lerpColor(br, bg, bb, nr, ng, nb, maxBlend);
        }

        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, ox, oy);
  }

  // -------------------------------------------------------------------
  // Elevation shading applied across the whole tileset
  // -------------------------------------------------------------------

  private static applyElevationShading(ctx: CanvasRenderingContext2D): void {
    const imageData = ctx.getImageData(0, 0, TOTAL_TILES * TILE_SIZE, TILE_SIZE);
    const data = imageData.data;

    for (let tileIdx = 0; tileIdx < TOTAL_TILES; tileIdx++) {
      // Determine the terrain type for shading intensity
      let terrain: TerrainType;
      if (tileIdx < BASE_TILE_COUNT) {
        terrain = tileIdx as TerrainType;
      } else {
        // Transition tile — use the lower terrain of the pair
        const pairIndex = Math.floor((tileIdx - BASE_TILE_COUNT) / VARIANTS_PER_PAIR);
        terrain = pairIndex as TerrainType;
      }

      // Shading amount scales with "elevation"
      const shadingStrength = 0.06 + terrain * 0.02;

      const tileOx = tileIdx * TILE_SIZE;

      for (let py = 0; py < TILE_SIZE; py++) {
        for (let px = 0; px < TILE_SIZE; px++) {
          const globalX = tileOx + px;
          const idx = (py * (TOTAL_TILES * TILE_SIZE) + globalX) * 4;

          // Lighten top-left, darken bottom-right
          const topLeftFactor = ((TILE_SIZE - 1 - px) + (TILE_SIZE - 1 - py)) / (2 * (TILE_SIZE - 1));
          const adjustment = (topLeftFactor - 0.5) * 2 * shadingStrength;

          data[idx] = clamp255(data[idx] + adjustment * 255);
          data[idx + 1] = clamp255(data[idx + 1] + adjustment * 255);
          data[idx + 2] = clamp255(data[idx + 2] + adjustment * 255);
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }
}

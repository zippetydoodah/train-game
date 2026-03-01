import { createNoise2D } from 'simplex-noise';
import { TerrainType } from '../types/terrain';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  NOISE_FREQUENCY,
  NOISE_OCTAVES,
  NOISE_LACUNARITY,
  NOISE_PERSISTENCE,
  ELEVATION_BANDS,
} from '../config/game-config';

// Seeded PRNG (Mulberry32)
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fbm(
  noise2D: (x: number, y: number) => number,
  x: number,
  y: number,
  octaves: number,
  frequency: number,
  lacunarity: number,
  persistence: number,
): number {
  let value = 0;
  let amplitude = 1;
  let freq = frequency;
  let maxAmplitude = 0;
  for (let i = 0; i < octaves; i++) {
    value += noise2D(x * freq, y * freq) * amplitude;
    maxAmplitude += amplitude;
    amplitude *= persistence;
    freq *= lacunarity;
  }
  return (value / maxAmplitude + 1) / 2;
}

function elevationToTerrain(elevation: number): TerrainType {
  for (const band of ELEVATION_BANDS) {
    if (elevation < band.max) {
      return band.terrain;
    }
  }
  return TerrainType.Mountains;
}

export class WorldGenerator {
  static generate(seed: number): { terrain: TerrainType[][]; elevation: number[][] } {
    const prng = mulberry32(seed);
    const noise2D = createNoise2D(prng);
    const terrain: TerrainType[][] = [];
    const elevation: number[][] = [];

    for (let y = 0; y < MAP_HEIGHT; y++) {
      terrain[y] = [];
      elevation[y] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        const elev = fbm(
          noise2D,
          x,
          y,
          NOISE_OCTAVES,
          NOISE_FREQUENCY,
          NOISE_LACUNARITY,
          NOISE_PERSISTENCE,
        );
        elevation[y][x] = elev;
        terrain[y][x] = elevationToTerrain(elev);
      }
    }
    return { terrain, elevation };
  }
}

import { TerrainType } from '../types/terrain';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const TILE_SIZE = 16;
export const MAP_WIDTH = 200;
export const MAP_HEIGHT = 200;
export const WORLD_PIXEL_WIDTH = MAP_WIDTH * TILE_SIZE;
export const WORLD_PIXEL_HEIGHT = MAP_HEIGHT * TILE_SIZE;
export const ZOOM_LEVELS = [0.25, 0.5, 1.0, 2.0, 3.0, 4.0] as const;
export const DEFAULT_ZOOM_INDEX = 2;
export const NOISE_FREQUENCY = 0.02;
export const NOISE_OCTAVES = 4;
export const NOISE_LACUNARITY = 2.0;
export const NOISE_PERSISTENCE = 0.5;
export const ELEVATION_BANDS = [
  { max: 0.25, terrain: TerrainType.DeepWater },
  { max: 0.35, terrain: TerrainType.ShallowWater },
  { max: 0.40, terrain: TerrainType.Sand },
  { max: 0.58, terrain: TerrainType.Grassland },
  { max: 0.70, terrain: TerrainType.Forest },
  { max: 0.82, terrain: TerrainType.Hills },
  { max: 1.01, terrain: TerrainType.Mountains },
] as const;

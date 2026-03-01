/** Terrain types ordered by elevation band, lowest to highest. */
export enum TerrainType {
  DeepWater = 0,
  ShallowWater = 1,
  Sand = 2,
  Grassland = 3,
  Forest = 4,
  Hills = 5,
  Mountains = 6,
}

export const TERRAIN_TYPE_COUNT = 7;

export interface ElevationBand {
  readonly max: number;
  readonly terrain: TerrainType;
}

export type WorldData = TerrainType[][];

export interface TileInfo {
  terrain: TerrainType;
  elevation: number;
  autotileIndex: number;
}

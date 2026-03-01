/** Types of infrastructure that can be placed on the map. */
export enum InfrastructureType {
  Rail = 'rail',
  ElevatedRail = 'elevated_rail',
  Bridge = 'bridge',
  StationHalt = 'station_halt',
  StationTown = 'station_town',
  StationCity = 'station_city',
}

/**
 * 8 cardinal/intercardinal directions for rail connections.
 * Values are bit flags so a single number can encode multiple connections.
 */
export enum Direction {
  N  = 0b00000001,
  NE = 0b00000010,
  E  = 0b00000100,
  SE = 0b00001000,
  S  = 0b00010000,
  SW = 0b00100000,
  W  = 0b01000000,
  NW = 0b10000000,
}

/** Directional deltas for each Direction flag. */
export const DIRECTION_DELTAS: ReadonlyMap<Direction, { dx: number; dy: number }> = new Map([
  [Direction.N,  { dx:  0, dy: -1 }],
  [Direction.NE, { dx:  1, dy: -1 }],
  [Direction.E,  { dx:  1, dy:  0 }],
  [Direction.SE, { dx:  1, dy:  1 }],
  [Direction.S,  { dx:  0, dy:  1 }],
  [Direction.SW, { dx: -1, dy:  1 }],
  [Direction.W,  { dx: -1, dy:  0 }],
  [Direction.NW, { dx: -1, dy: -1 }],
]);

/** The opposite direction for each Direction. */
export const OPPOSITE_DIRECTION: ReadonlyMap<Direction, Direction> = new Map([
  [Direction.N,  Direction.S ],
  [Direction.NE, Direction.SW],
  [Direction.E,  Direction.W ],
  [Direction.SE, Direction.NW],
  [Direction.S,  Direction.N ],
  [Direction.SW, Direction.NE],
  [Direction.W,  Direction.E ],
  [Direction.NW, Direction.SE],
]);

/**
 * A single piece of infrastructure placed on the map.
 * Every infrastructure tile occupies exactly one (x, y) grid cell.
 * Multi-tile structures (StationTown, StationCity) store one InfrastructureTile
 * per occupied cell, all sharing the same `groupId`.
 */
export interface InfrastructureTile {
  type: InfrastructureType;
  /** Tile X coordinate (0-199). */
  x: number;
  /** Tile Y coordinate (0-199). */
  y: number;
  /**
   * Bitmask of Direction flags indicating which directions this tile connects to.
   * For rail: exactly 2 bits set (entry + exit).
   * For crossings: 4 bits set (two perpendicular pairs).
   * For stations: 0 (stations don't encode direction via this field).
   * For bridges: 2 bits set (entry + exit, only N/S or E/W).
   */
  connections: number;
  /** Cost paid to build this tile, in pounds. Integer only. */
  buildCost: number;
  /** Game-time minute (from TimeSystem.getElapsedMinutes()) when this tile was built. */
  buildTime: number;
  /**
   * For multi-tile stations: a shared identifier so all tiles in the
   * station can be found and demolished together. Undefined for non-station tiles.
   */
  groupId?: string;
  /**
   * The tile index within the infrastructure tileset texture,
   * used for rendering. Set by InfrastructureManager when placing or
   * when connections change (rail auto-connect).
   */
  spriteIndex: number;
}

/** Bridge orientation. Bridges are straight-line only. */
export enum BridgeOrientation {
  Horizontal = 'horizontal',
  Vertical = 'vertical',
}

/** Station tier metadata. */
export interface StationTierConfig {
  type: InfrastructureType;
  label: string;
  /** Width in tiles. */
  width: number;
  /** Height in tiles. */
  height: number;
  /** Base cost in pounds (no terrain multiplier for stations). */
  cost: number;
}

export const STATION_TIERS: readonly StationTierConfig[] = [
  { type: InfrastructureType.StationHalt, label: 'Halt',  width: 1, height: 1, cost:   500 },
  { type: InfrastructureType.StationTown, label: 'Town',  width: 2, height: 1, cost:  1500 },
  { type: InfrastructureType.StationCity, label: 'City',  width: 3, height: 2, cost:  5000 },
] as const;

/** All InfrastructureType values in index order (for compact serialization). */
const INFRA_TYPE_VALUES = Object.values(InfrastructureType);

/** Convert InfrastructureType to numeric index for compact serialization. */
export function typeToIndex(type: InfrastructureType): number {
  return INFRA_TYPE_VALUES.indexOf(type);
}

/** Convert numeric index back to InfrastructureType. */
export function indexToType(index: number): InfrastructureType {
  return INFRA_TYPE_VALUES[index];
}

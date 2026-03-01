import { TerrainType } from '../types/terrain';
import {
  InfrastructureType,
  Direction,
  DIRECTION_DELTAS,
  OPPOSITE_DIRECTION,
  InfrastructureTile,
  typeToIndex,
  indexToType,
} from '../types/infrastructure';
import { MAP_WIDTH, MAP_HEIGHT } from '../config/game-config';
import { InfrastructureTileCompact } from '../types/save';

/** Create a string key from tile coordinates. */
function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Connection pattern to sprite index mapping.
 * Each pattern is a connections bitmask that maps to a specific sprite variant.
 */
const CONNECTION_PATTERNS: ReadonlyMap<number, number> = new Map([
  // N-S straight (index 0)
  [Direction.N | Direction.S, 0],
  // NE-SW diagonal (index 1)
  [Direction.NE | Direction.SW, 1],
  // E-W straight (index 2)
  [Direction.E | Direction.W, 2],
  // SE-NW diagonal (index 3)
  [Direction.SE | Direction.NW, 3],
  // N-E curve (index 4)
  [Direction.N | Direction.E, 4],
  // E-S curve (index 5)
  [Direction.E | Direction.S, 5],
  // S-W curve (index 6)
  [Direction.S | Direction.W, 6],
  // W-N curve (index 7)
  [Direction.W | Direction.N, 7],
]);

/** Terrain types that allow regular rail. */
const RAIL_TERRAINS: ReadonlySet<TerrainType> = new Set([
  TerrainType.Grassland,
  TerrainType.Sand,
  TerrainType.Forest,
  TerrainType.Hills,
]);

/** Terrain types that allow elevated rail. */
const ELEVATED_RAIL_TERRAINS: ReadonlySet<TerrainType> = new Set([
  TerrainType.Grassland,
  TerrainType.Sand,
  TerrainType.Forest,
  TerrainType.Hills,
  TerrainType.ShallowWater,
  TerrainType.Mountains,
]);

/** Terrain types that allow stations. */
const STATION_TERRAINS: ReadonlySet<TerrainType> = new Set([
  TerrainType.Grassland,
  TerrainType.Sand,
]);

/** All direction values for iteration. */
const ALL_DIRECTIONS: readonly Direction[] = [
  Direction.N, Direction.NE, Direction.E, Direction.SE,
  Direction.S, Direction.SW, Direction.W, Direction.NW,
];

/** Cardinal directions only (for station adjacency checks). */
const CARDINAL_DIRECTIONS: readonly Direction[] = [
  Direction.N, Direction.E, Direction.S, Direction.W,
];

export class InfrastructureManager {
  private tiles: Map<string, InfrastructureTile> = new Map();

  get size(): number {
    return this.tiles.size;
  }

  /** Place an infrastructure tile. Overwrites any existing tile at (x, y). */
  place(tile: InfrastructureTile): void {
    this.tiles.set(tileKey(tile.x, tile.y), tile);
  }

  /** Remove the tile at (x, y). Returns the removed tile or undefined. */
  remove(x: number, y: number): InfrastructureTile | undefined {
    const key = tileKey(x, y);
    const tile = this.tiles.get(key);
    if (tile) {
      this.tiles.delete(key);
    }
    return tile;
  }

  /** Get the tile at (x, y) or undefined. */
  getAt(x: number, y: number): InfrastructureTile | undefined {
    return this.tiles.get(tileKey(x, y));
  }

  /** Check if there is infrastructure at (x, y). */
  hasAt(x: number, y: number): boolean {
    return this.tiles.has(tileKey(x, y));
  }

  /** Get all placed tiles. */
  getAll(): InfrastructureTile[] {
    return Array.from(this.tiles.values());
  }

  /** Clear all infrastructure. */
  clear(): void {
    this.tiles.clear();
  }

  /**
   * Get all tiles belonging to a station group.
   */
  getStationGroup(groupId: string): InfrastructureTile[] {
    const result: InfrastructureTile[] = [];
    for (const tile of this.tiles.values()) {
      if (tile.groupId === groupId) {
        result.push(tile);
      }
    }
    return result;
  }

  /**
   * Check if infrastructure of the given type can be placed at (x, y).
   * For stations, pass all cells that the station would occupy.
   * Returns { valid: boolean, reason?: string }.
   */
  canPlace(
    type: InfrastructureType,
    x: number,
    y: number,
    terrain: TerrainType[][],
    stationCells?: { x: number; y: number }[],
  ): { valid: boolean; reason?: string } {
    // Bounds check
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) {
      return { valid: false, reason: 'Out of bounds' };
    }

    const terrainAt = terrain[y][x];

    // Station placement
    if (type === InfrastructureType.StationHalt ||
        type === InfrastructureType.StationTown ||
        type === InfrastructureType.StationCity) {
      const cells = stationCells ?? [{ x, y }];

      // All cells must be valid terrain and not occupied
      for (const cell of cells) {
        if (cell.x < 0 || cell.x >= MAP_WIDTH || cell.y < 0 || cell.y >= MAP_HEIGHT) {
          return { valid: false, reason: 'Station extends out of bounds' };
        }
        const cellTerrain = terrain[cell.y][cell.x];
        if (!STATION_TERRAINS.has(cellTerrain)) {
          return { valid: false, reason: 'Station requires Grassland or Sand terrain' };
        }
        if (this.hasAt(cell.x, cell.y)) {
          return { valid: false, reason: 'Tile already occupied' };
        }
      }

      // At least one cell must be adjacent (4-connected) to existing rail
      let adjacentToRail = false;
      for (const cell of cells) {
        for (const dir of CARDINAL_DIRECTIONS) {
          const delta = DIRECTION_DELTAS.get(dir)!;
          const nx = cell.x + delta.dx;
          const ny = cell.y + delta.dy;
          const neighbor = this.getAt(nx, ny);
          if (neighbor && (
            neighbor.type === InfrastructureType.Rail ||
            neighbor.type === InfrastructureType.ElevatedRail
          )) {
            adjacentToRail = true;
            break;
          }
        }
        if (adjacentToRail) break;
      }
      if (!adjacentToRail) {
        return { valid: false, reason: 'Station must be adjacent to rail' };
      }

      return { valid: true };
    }

    // Rail placement
    if (type === InfrastructureType.Rail) {
      if (!RAIL_TERRAINS.has(terrainAt)) {
        return { valid: false, reason: 'Cannot build rail on this terrain' };
      }
      const existing = this.getAt(x, y);
      if (existing) {
        // Allow perpendicular crossing only
        if (existing.type === InfrastructureType.Rail) {
          // Could allow crossing — check handled at build time
          return { valid: true };
        }
        return { valid: false, reason: 'Tile already occupied' };
      }
      return { valid: true };
    }

    // Elevated rail placement
    if (type === InfrastructureType.ElevatedRail) {
      if (!ELEVATED_RAIL_TERRAINS.has(terrainAt)) {
        return { valid: false, reason: 'Cannot build elevated rail on this terrain' };
      }
      if (this.hasAt(x, y)) {
        return { valid: false, reason: 'Tile already occupied' };
      }
      return { valid: true };
    }

    // Bridge placement
    if (type === InfrastructureType.Bridge) {
      // Bridges can be placed on DeepWater and ShallowWater
      if (terrainAt !== TerrainType.DeepWater && terrainAt !== TerrainType.ShallowWater) {
        return { valid: false, reason: 'Bridges can only span water' };
      }
      if (this.hasAt(x, y)) {
        return { valid: false, reason: 'Tile already occupied' };
      }
      return { valid: true };
    }

    return { valid: false, reason: 'Unknown infrastructure type' };
  }

  /**
   * Auto-connect rail at (x, y) to compatible neighbors.
   * Updates connection bitmasks on both this tile and neighbors.
   * Recalculates spriteIndex for affected tiles.
   */
  autoConnect(x: number, y: number): void {
    const tile = this.getAt(x, y);
    if (!tile) return;

    // Only rail and elevated rail auto-connect
    if (tile.type !== InfrastructureType.Rail &&
        tile.type !== InfrastructureType.ElevatedRail) return;

    let connections = 0;

    for (const dir of ALL_DIRECTIONS) {
      const delta = DIRECTION_DELTAS.get(dir)!;
      const nx = x + delta.dx;
      const ny = y + delta.dy;
      const neighbor = this.getAt(nx, ny);

      if (!neighbor) continue;

      // Compatible: same type rail, or bridge connects to rail
      const compatible =
        neighbor.type === tile.type ||
        (tile.type === InfrastructureType.Rail && neighbor.type === InfrastructureType.Bridge);

      if (!compatible) continue;

      connections |= dir;

      // Update the neighbor's connections to include the opposite direction
      const opposite = OPPOSITE_DIRECTION.get(dir)!;
      neighbor.connections |= opposite;
      neighbor.spriteIndex = InfrastructureManager.getSpriteIndex(neighbor.type, neighbor.connections);
    }

    // Clamp: if more than 2 connections and not a valid crossing (4 cardinal bits),
    // keep only the first 2 bits found. T-junctions are not supported in Phase 2.
    const bitCount = InfrastructureManager.popcount(connections);
    if (bitCount === 3) {
      // Remove the lowest set bit to reduce to 2 connections
      connections &= connections - 1;
    }

    tile.connections = connections;
    tile.spriteIndex = InfrastructureManager.getSpriteIndex(tile.type, tile.connections);
  }

  /**
   * Map connection pattern to sprite index.
   * 0-8 for rail, 9-17 for elevated rail.
   * N-S=0, NE-SW=1, E-W=2, SE-NW=3, N-E curve=4, E-S curve=5, S-W curve=6, W-N curve=7, crossing=8
   */
  static getSpriteIndex(type: InfrastructureType, connections: number): number {
    const offset = type === InfrastructureType.ElevatedRail ? 9 : 0;

    // Check for crossing (4 bits set — two perpendicular pairs)
    const bitCount = InfrastructureManager.popcount(connections);
    if (bitCount >= 4) {
      return 8 + offset; // crossing
    }

    // Look up the pattern
    const patternIndex = CONNECTION_PATTERNS.get(connections);
    if (patternIndex !== undefined) {
      return patternIndex + offset;
    }

    // Default: N-S straight for unknown patterns
    return 0 + offset;
  }

  /** Count set bits in a number. */
  private static popcount(n: number): number {
    let count = 0;
    let v = n;
    while (v) {
      count += v & 1;
      v >>= 1;
    }
    return count;
  }

  /**
   * Serialize all tiles to compact format for save data.
   */
  toCompact(): InfrastructureTileCompact[] {
    const result: InfrastructureTileCompact[] = [];
    for (const tile of this.tiles.values()) {
      const compact: InfrastructureTileCompact = [
        typeToIndex(tile.type),
        tile.x,
        tile.y,
        tile.connections,
        tile.buildCost,
        tile.buildTime,
        tile.spriteIndex,
      ];
      if (tile.groupId) {
        compact.push(tile.groupId);
      }
      result.push(compact);
    }
    return result;
  }

  /**
   * Load tiles from compact format (save data).
   * Clears existing tiles before loading.
   */
  fromCompact(data: InfrastructureTileCompact[]): void {
    this.clear();
    for (const compact of data) {
      if (compact.length < 7) {
        console.warn('Skipping malformed infrastructure tile data:', compact);
        continue;
      }
      const tile: InfrastructureTile = {
        type: indexToType(compact[0]),
        x: compact[1],
        y: compact[2],
        connections: compact[3],
        buildCost: compact[4],
        buildTime: compact[5],
        spriteIndex: compact[6],
      };
      if (compact[7] !== undefined) {
        tile.groupId = compact[7];
      }
      this.place(tile);
    }
  }
}

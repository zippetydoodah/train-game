import { TerrainType } from '../types/terrain';
import { MAP_WIDTH, MAP_HEIGHT } from '../config/game-config';

export class AutoTiler {
  static getTileIndex(terrain: TerrainType[][], x: number, y: number): number {
    const t = terrain[y][x];
    const north = y > 0 ? terrain[y - 1][x] : t;
    const east = x < MAP_WIDTH - 1 ? terrain[y][x + 1] : t;
    const south = y < MAP_HEIGHT - 1 ? terrain[y + 1][x] : t;
    const west = x > 0 ? terrain[y][x - 1] : t;

    // If all cardinal neighbours match, use the base tile
    if (north === t && east === t && south === t && west === t) {
      return t; // Base tile index = TerrainType enum value (0-6)
    }

    const diffNeighbor = AutoTiler.getPrimaryTransitionTarget(t, north, east, south, west);
    if (diffNeighbor === null) return t;

    // Only generate transitions for adjacent terrain pairs (elevation diff of 1).
    // Non-adjacent pairs have no transition tiles; fall back to the base tile.
    const diff = Math.abs(t - diffNeighbor);
    if (diff !== 1) return t;

    // Build the 4-bit cardinal bitmask for the chosen neighbour
    let mask = 0;
    if (north === diffNeighbor) mask |= 1;
    if (east === diffNeighbor) mask |= 2;
    if (south === diffNeighbor) mask |= 4;
    if (west === diffNeighbor) mask |= 8;

    // pairIndex is the lower of the two terrain values (0-5)
    const pairIndex = Math.min(t, diffNeighbor);
    return 7 + pairIndex * 16 + mask;
  }

  private static getPrimaryTransitionTarget(
    center: TerrainType,
    north: TerrainType,
    east: TerrainType,
    south: TerrainType,
    west: TerrainType,
  ): TerrainType | null {
    const neighbors = [north, east, south, west];
    const counts = new Map<TerrainType, number>();

    for (const n of neighbors) {
      if (n !== center) {
        counts.set(n, (counts.get(n) || 0) + 1);
      }
    }

    if (counts.size === 0) return null;

    // Pick the neighbour with highest count; on tie, pick closest in elevation
    let best: TerrainType | null = null;
    let bestCount = 0;
    let bestDist = Infinity;

    for (const [terrain, count] of counts) {
      const dist = Math.abs(terrain - center);
      if (count > bestCount || (count === bestCount && dist < bestDist)) {
        best = terrain;
        bestCount = count;
        bestDist = dist;
      }
    }

    return best;
  }
}

import { TerrainType } from '../types/terrain';
import { InfrastructureType, InfrastructureTile, STATION_TIERS } from '../types/infrastructure';
import { TERRAIN_COST_MULTIPLIERS, BASE_COSTS, DEMOLISH_REFUND_TIERS } from '../types/costs';

export class CostCalculator {
  /**
   * Calculate the cost to build one tile of the given type on the given terrain.
   * Returns integer pounds. Returns -1 if cannot build on that terrain.
   * Stations use their fixed cost from STATION_TIERS (no terrain multiplier).
   */
  static tileCost(type: InfrastructureType, terrain: TerrainType): number {
    const stationTier = STATION_TIERS.find(t => t.type === type);
    if (stationTier) return stationTier.cost;

    // Bridge: flat cost per tile, no terrain multiplier (FR-COST-3)
    if (type === InfrastructureType.Bridge) {
      return BASE_COSTS.get(type) ?? 200;
    }

    const baseCost = BASE_COSTS.get(type);
    if (baseCost === undefined) return 0;

    const multiplier = TERRAIN_COST_MULTIPLIERS.get(terrain);
    if (multiplier === undefined || multiplier === 0) return -1;

    return Math.floor((baseCost * multiplier) / 10);
  }

  /**
   * Calculate total cost for a route (array of {x, y} positions).
   * Returns { totalCost: number, perTile: { x, y, cost, terrain }[] }.
   */
  static routeCost(
    type: InfrastructureType,
    positions: { x: number; y: number }[],
    terrain: TerrainType[][],
  ): { totalCost: number; perTile: { x: number; y: number; cost: number; terrain: TerrainType }[] } {
    const perTile = positions.map(pos => ({
      x: pos.x, y: pos.y,
      cost: CostCalculator.tileCost(type, terrain[pos.y][pos.x]),
      terrain: terrain[pos.y][pos.x],
    }));
    const totalCost = perTile.reduce((sum, t) => sum + (t.cost > 0 ? t.cost : 0), 0);
    return { totalCost, perTile };
  }

  /**
   * Calculate demolish refund for a tile.
   * age = currentElapsedMinutes - tile.buildTime
   */
  static demolishRefund(tile: InfrastructureTile, currentElapsedMinutes: number): number {
    const age = currentElapsedMinutes - tile.buildTime;
    for (const tier of DEMOLISH_REFUND_TIERS) {
      if (age < tier.maxAgeMinutes) {
        return Math.floor((tile.buildCost * tier.refundPercent) / 100);
      }
    }
    return Math.floor((tile.buildCost * 25) / 100);
  }
}

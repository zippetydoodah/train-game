import { TerrainType } from './terrain';
import { InfrastructureType } from './infrastructure';

/** Terrain cost multipliers — integer arithmetic only (multiply then divide by 10). */
export const TERRAIN_COST_MULTIPLIERS: ReadonlyMap<TerrainType, number> = new Map([
  [TerrainType.DeepWater,    0],    // Cannot build (except bridges)
  [TerrainType.ShallowWater, 25],   // 2.5x — stored as x10 to avoid floats
  [TerrainType.Sand,         12],   // 1.2x
  [TerrainType.Grassland,    10],   // 1.0x
  [TerrainType.Forest,       15],   // 1.5x
  [TerrainType.Hills,        20],   // 2.0x
  [TerrainType.Mountains,    35],   // 3.5x
]);

/** Base costs per infrastructure type (in pounds, before terrain multiplier). */
export const BASE_COSTS: ReadonlyMap<InfrastructureType, number> = new Map([
  [InfrastructureType.Rail,         50],
  [InfrastructureType.ElevatedRail, 100],
  [InfrastructureType.Bridge,       200],  // Per span tile
  // Station costs are in STATION_TIERS, not here
]);

/** Starting treasury balance. */
export const STARTING_TREASURY = 50_000;

/**
 * Age-based demolish refund tiers.
 * Checked in order — first match wins.
 * Age is in game-time minutes; 1 game year = 525,600 minutes.
 */
export const DEMOLISH_REFUND_TIERS = [
  { maxAgeMinutes: 525_600,         refundPercent: 75 },  // < 1 year
  { maxAgeMinutes: 525_600 * 5,     refundPercent: 50 },  // 1-5 years
  { maxAgeMinutes: Infinity,        refundPercent: 25 },  // > 5 years
] as const;

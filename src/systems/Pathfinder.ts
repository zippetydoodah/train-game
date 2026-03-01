import { TerrainType } from '../types/terrain';
import { InfrastructureType, Direction, DIRECTION_DELTAS } from '../types/infrastructure';
import { CostCalculator } from './CostCalculator';
import { InfrastructureManager } from './InfrastructureManager';
import { MAP_WIDTH, MAP_HEIGHT } from '../config/game-config';

interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
  direction: Direction | null;
}

// Simple binary min-heap
class MinHeap {
  private data: PathNode[] = [];

  push(node: PathNode): void {
    this.data.push(node);
    this.siftUp(this.data.length - 1);
  }

  pop(): PathNode | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  get size(): number { return this.data.length; }

  private siftUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.data[i].f >= this.data[parent].f) break;
      [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
      i = parent;
    }
  }

  private siftDown(i: number): void {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.data[left].f < this.data[smallest].f) smallest = left;
      if (right < n && this.data[right].f < this.data[smallest].f) smallest = right;
      if (smallest === i) break;
      [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
      i = smallest;
    }
  }
}

const ALL_DIRECTIONS: Direction[] = [
  Direction.N, Direction.NE, Direction.E, Direction.SE,
  Direction.S, Direction.SW, Direction.W, Direction.NW,
];

export class Pathfinder {
  static findPath(
    sx: number, sy: number,
    ex: number, ey: number,
    type: InfrastructureType,
    terrain: TerrainType[][],
    existingInfra: InfrastructureManager,
  ): { x: number; y: number; direction: Direction }[] | null {
    if (sx === ex && sy === ey) return null;

    const open = new MinHeap();
    const closed = new Set<string>();
    const MAX_OPEN = 10000;
    const MAX_PATH = 200;
    const minCost = 50; // minimum possible tile cost (Rail on Grassland)

    // Start with all 8 directions
    for (const dir of ALL_DIRECTIONS) {
      const delta = DIRECTION_DELTAS.get(dir)!;
      const nx = sx + delta.dx;
      const ny = sy + delta.dy;
      if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) continue;
      const cost = CostCalculator.tileCost(type, terrain[ny][nx]);
      if (cost < 0) continue;
      if (existingInfra.hasAt(nx, ny)) continue;

      const h = Pathfinder.heuristic(nx, ny, ex, ey) * minCost;
      open.push({ x: nx, y: ny, g: cost, h, f: cost + h, parent: { x: sx, y: sy, g: 0, h: 0, f: 0, parent: null, direction: null }, direction: dir });
    }

    while (open.size > 0) {
      if (open.size > MAX_OPEN) return null;

      const current = open.pop()!;
      const stateKey = `${current.x},${current.y},${current.direction}`;
      if (closed.has(stateKey)) continue;
      closed.add(stateKey);

      // Check if reached goal
      if (current.x === ex && current.y === ey) {
        return Pathfinder.reconstructPath(current);
      }

      // Check path length
      let pathLen = 0;
      let node: PathNode | null = current;
      while (node) { pathLen++; node = node.parent; }
      if (pathLen > MAX_PATH) continue;

      // Expand neighbors (only valid directions based on 45-degree rule)
      const validDirs = Pathfinder.getValidDirections(current.direction);
      for (const dir of validDirs) {
        const delta = DIRECTION_DELTAS.get(dir)!;
        const nx = current.x + delta.dx;
        const ny = current.y + delta.dy;
        if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) continue;

        const nextKey = `${nx},${ny},${dir}`;
        if (closed.has(nextKey)) continue;

        const cost = CostCalculator.tileCost(type, terrain[ny][nx]);
        if (cost < 0) continue;

        // Skip occupied tiles (goal tile is okay)
        if (!(nx === ex && ny === ey) && existingInfra.hasAt(nx, ny)) continue;

        const g = current.g + cost;
        const h = Pathfinder.heuristic(nx, ny, ex, ey) * minCost;
        open.push({ x: nx, y: ny, g, h, f: g + h, parent: current, direction: dir });
      }
    }

    return null; // No path found
  }

  private static heuristic(x1: number, y1: number, x2: number, y2: number): number {
    return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  }

  private static getValidDirections(parentDirection: Direction | null): Direction[] {
    if (parentDirection === null) return ALL_DIRECTIONS;

    const idx = ALL_DIRECTIONS.indexOf(parentDirection);
    return [
      ALL_DIRECTIONS[(idx + ALL_DIRECTIONS.length - 1) % ALL_DIRECTIONS.length], // -45 degrees
      ALL_DIRECTIONS[idx], // same direction
      ALL_DIRECTIONS[(idx + 1) % ALL_DIRECTIONS.length], // +45 degrees
    ];
  }

  private static reconstructPath(endNode: PathNode): { x: number; y: number; direction: Direction }[] {
    const path: { x: number; y: number; direction: Direction }[] = [];
    let node: PathNode | null = endNode;
    while (node && node.direction !== null) {
      path.unshift({ x: node.x, y: node.y, direction: node.direction });
      node = node.parent;
    }
    return path;
  }
}

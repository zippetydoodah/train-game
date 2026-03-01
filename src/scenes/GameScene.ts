import Phaser from 'phaser';
import { WorldGenerator } from '../systems/WorldGenerator';
import { AutoTiler } from '../systems/AutoTiler';
import { TimeSystem } from '../systems/TimeSystem';
import { TerrainType } from '../types/terrain';
import { SpeedSetting } from '../types/time';
import { SaveSlotData, MAX_SAVE_NAME_LENGTH } from '../types/save';
import { InfrastructureType, InfrastructureTile, Direction, DIRECTION_DELTAS } from '../types/infrastructure';
import { ToolType } from '../types/tools';
import { InfrastructureManager } from '../systems/InfrastructureManager';
import { TreasuryManager } from '../systems/TreasuryManager';
import { CostCalculator } from '../systems/CostCalculator';
import { BuildToolStateMachine, BuildPhase } from '../systems/BuildToolStateMachine';
import { GhostPreviewManager } from '../systems/GhostPreviewManager';
import { Pathfinder } from '../systems/Pathfinder';
import { STARTING_TREASURY } from '../types/costs';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  TILE_SIZE,
  WORLD_PIXEL_WIDTH,
  WORLD_PIXEL_HEIGHT,
  ZOOM_LEVELS,
  DEFAULT_ZOOM_INDEX,
} from '../config/game-config';

/** Zoom threshold at or below which the simplified LOD layer is shown. */
const LOD_ZOOM_THRESHOLD = 0.5;

interface GameSceneData {
  seed: number;
  isNewGame: boolean;
  saveData?: SaveSlotData;
}

export class GameScene extends Phaser.Scene {
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private cameraStartX = 0;
  private cameraStartY = 0;
  private currentZoomIndex = DEFAULT_ZOOM_INDEX;
  private prePauseSpeed: SpeedSetting = SpeedSetting.Normal;
  private detailLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  private simpleLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  private zoomTween: Phaser.Tweens.Tween | null = null;
  public timeSystem!: TimeSystem;
  public currentSeed!: number;
  public terrain!: TerrainType[][];
  public elevation!: number[][];
  public infrastructureManager!: InfrastructureManager;
  public treasuryManager!: TreasuryManager;
  public buildTool!: BuildToolStateMachine;
  private ghostPreview!: GhostPreviewManager;
  private infraBlitter!: Phaser.GameObjects.Blitter | null;
  private infraBobs: Map<string, Phaser.GameObjects.Bob> = new Map();

  constructor() {
    super({ key: 'game' });
  }

  create(data: GameSceneData): void {
    this.currentSeed = data.seed;
    this.currentZoomIndex = DEFAULT_ZOOM_INDEX;
    this.isDragging = false;
    this.prePauseSpeed = SpeedSetting.Normal;

    // Clear stale listeners from previous create() calls
    this.input.removeAllListeners();
    if (this.input.keyboard) {
      this.input.keyboard.removeAllListeners();
    }

    // Generate world
    const worldData = WorldGenerator.generate(data.seed);
    this.terrain = worldData.terrain;
    this.elevation = worldData.elevation;

    // Build tile index arrays — detailed (autotiled) and simple (base tiles only)
    const tileIndexData: number[][] = [];
    const simpleTileData: number[][] = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      tileIndexData[y] = [];
      simpleTileData[y] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        tileIndexData[y][x] = AutoTiler.getTileIndex(worldData.terrain, x, y);
        simpleTileData[y][x] = worldData.terrain[y][x]; // Base tile index only
      }
    }

    // Create detailed tilemap
    const detailMap = this.make.tilemap({
      data: tileIndexData,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const detailTileset = detailMap.addTilesetImage('terrain', 'terrain-tileset', TILE_SIZE, TILE_SIZE);
    if (!detailTileset) {
      console.error('Failed to add detail tileset image. Ensure BootScene ran successfully.');
      return;
    }
    this.detailLayer = detailMap.createLayer(0, detailTileset, 0, 0);

    // Create simplified LOD tilemap (base tiles only, no transitions)
    const simpleMap = this.make.tilemap({
      data: simpleTileData,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const simpleTileset = simpleMap.addTilesetImage('terrain', 'terrain-tileset', TILE_SIZE, TILE_SIZE);
    if (!simpleTileset) {
      console.error('Failed to add simple tileset image.');
      return;
    }
    this.simpleLayer = simpleMap.createLayer(0, simpleTileset, 0, 0);

    // Camera setup
    const camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD_PIXEL_WIDTH, WORLD_PIXEL_HEIGHT);

    if (data.isNewGame) {
      const startPos = this.findStartPosition(worldData.terrain);
      camera.centerOn(startPos.x, startPos.y);
      camera.setZoom(ZOOM_LEVELS[this.currentZoomIndex]);
    } else if (data.saveData) {
      camera.scrollX = data.saveData.cameraX;
      camera.scrollY = data.saveData.cameraY;
      // Find closest zoom index
      this.currentZoomIndex = (ZOOM_LEVELS as readonly number[]).indexOf(data.saveData.cameraZoom);
      if (this.currentZoomIndex === -1) this.currentZoomIndex = DEFAULT_ZOOM_INDEX;
      camera.setZoom(ZOOM_LEVELS[this.currentZoomIndex]);
    }

    // Set initial LOD layer visibility
    this.updateLODVisibility(ZOOM_LEVELS[this.currentZoomIndex]);

    // Initialize time system
    this.timeSystem = new TimeSystem();
    if (!data.isNewGame && data.saveData) {
      this.timeSystem.setElapsedMinutes(data.saveData.gameTimeMinutes);
      this.timeSystem.setSpeed(data.saveData.speed);
    }

    // Clean up previous infrastructure state (re-create from save load)
    if (this.infraBlitter) {
      this.infraBlitter.destroy();
      this.infraBlitter = null;
    }
    this.infraBobs.clear();
    if (this.ghostPreview) {
      this.ghostPreview.destroy();
    }

    // Initialize infrastructure systems
    this.infrastructureManager = new InfrastructureManager();
    this.treasuryManager = new TreasuryManager(STARTING_TREASURY);
    this.buildTool = new BuildToolStateMachine();
    this.ghostPreview = new GhostPreviewManager(this);
    this.infraBlitter = this.add.blitter(0, 0, 'infra-tileset');
    this.infraBlitter.setDepth(5);
    this.infraBobs = new Map();

    // Disable context menu for right-click panning
    this.input.mouse?.disableContextMenu();

    // If loading a save, restore treasury and infrastructure
    if (!data.isNewGame && data.saveData) {
      if (data.saveData.treasuryBalance !== undefined) {
        this.treasuryManager.setBalance(data.saveData.treasuryBalance);
      }
      if (data.saveData.infrastructure) {
        this.infrastructureManager.fromCompact(data.saveData.infrastructure);
        this.renderAllInfrastructure();
      }
    }

    // Click-drag panning & build tool interaction
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const toolActive = this.buildTool.activeTool !== ToolType.None;

      if (toolActive) {
        if (pointer.leftButtonDown()) {
          const tile = this.pointerToTile(pointer);
          if (!tile) return;
          const tool = this.buildTool.activeTool;
          // For rail/elevated rail, start drag for auto-route
          if (tool === ToolType.Rail || tool === ToolType.ElevatedRail) {
            this.buildTool.startDrag(tile.x, tile.y);
            // Also place a single tile immediately
            this.handleRailClick(tile, tool);
          } else {
            this.handleBuildClick(pointer);
          }
          return;
        }
        if (pointer.middleButtonDown() || pointer.rightButtonDown()) {
          this.isDragging = true;
          this.dragStartX = pointer.x;
          this.dragStartY = pointer.y;
          this.cameraStartX = camera.scrollX;
          this.cameraStartY = camera.scrollY;
        }
      } else {
        if (pointer.leftButtonDown()) {
          this.isDragging = true;
          this.dragStartX = pointer.x;
          this.dragStartY = pointer.y;
          this.cameraStartX = camera.scrollX;
          this.cameraStartY = camera.scrollY;
        }
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        const zoom = camera.zoom;
        const dx = (this.dragStartX - pointer.x) / zoom;
        const dy = (this.dragStartY - pointer.y) / zoom;
        camera.scrollX = this.cameraStartX + dx;
        camera.scrollY = this.cameraStartY + dy;
        return;
      }

      if (this.buildTool.activeTool !== ToolType.None) {
        this.updateGhostPreview(pointer);
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.buildTool.phase === BuildPhase.Dragging && pointer.leftButtonReleased()) {
        const endTile = this.pointerToTile(pointer);
        const startTile = this.buildTool.dragStartTile;
        if (endTile && startTile && (endTile.x !== startTile.x || endTile.y !== startTile.y)) {
          this.executeAutoRoute(startTile, endTile);
        }
        this.buildTool.endDrag();
        this.ghostPreview.clearAll();
        this.events.emit('cost-tooltip', null);
        this.events.emit('route-preview', null);
      }
      this.isDragging = false;
    });

    // Mouse wheel zoom
    this.input.on(
      'wheel',
      (
        _pointer: Phaser.Input.Pointer,
        _gameObjects: Phaser.GameObjects.GameObject[],
        _deltaX: number,
        deltaY: number,
      ) => {
        if (deltaY < 0) {
          this.zoomIn(this.input.activePointer);
        } else if (deltaY > 0) {
          this.zoomOut(this.input.activePointer);
        }
      },
    );

    // Keyboard shortcuts (guard against null keyboard plugin)
    this.setupKeyboardShortcuts();

    // Launch HUD (stop first in case it's still running from a previous session)
    if (this.scene.isActive('hud')) {
      this.scene.stop('hud');
    }
    this.scene.launch('hud', { timeSystem: this.timeSystem, gameScene: this });
  }

  update(_time: number, delta: number): void {
    this.timeSystem.update(delta);
  }

  private setupKeyboardShortcuts(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return; // Keyboard not available; skip keyboard bindings

    keyboard.on('keydown-PLUS', () => this.zoomIn(this.input.activePointer));
    keyboard.on('keydown-MINUS', () => this.zoomOut(this.input.activePointer));
    // Also = key (same physical key as + on US keyboard)
    keyboard.on('keydown-EQUAL', () => this.zoomIn(this.input.activePointer));

    // Speed shortcuts
    keyboard.on('keydown-SPACE', () => this.togglePause());
    keyboard.on('keydown-ONE', () => this.setSpeed(SpeedSetting.Normal));
    keyboard.on('keydown-TWO', () => this.setSpeed(SpeedSetting.Fast));
    keyboard.on('keydown-THREE', () => this.setSpeed(SpeedSetting.Fastest));

    // F5 for save
    keyboard.on('keydown-F5', (event: KeyboardEvent) => {
      event.preventDefault();
      this.events.emit('save-requested');
    });

    // Escape
    keyboard.on('keydown-ESC', () => this.handleEscape());

    // Tool hotkeys
    keyboard.on('keydown-R', () => this.events.emit('tool-hotkey', ToolType.Rail));
    keyboard.on('keydown-T', () => this.events.emit('tool-hotkey', ToolType.Station));
    keyboard.on('keydown-B', () => this.events.emit('tool-hotkey', ToolType.Bridge));
    keyboard.on('keydown-E', () => this.events.emit('tool-hotkey', ToolType.ElevatedRail));
    keyboard.on('keydown-X', () => this.events.emit('tool-hotkey', ToolType.Demolish));
  }

  private findStartPosition(terrain: TerrainType[][]): { x: number; y: number } {
    const cx = Math.floor(MAP_WIDTH / 2);
    const cy = Math.floor(MAP_HEIGHT / 2);

    for (let radius = 0; radius < Math.max(MAP_WIDTH, MAP_HEIGHT) / 2; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const tx = cx + dx;
          const ty = cy + dy;
          if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT) {
            if (terrain[ty][tx] === TerrainType.Grassland) {
              return {
                x: tx * TILE_SIZE + TILE_SIZE / 2,
                y: ty * TILE_SIZE + TILE_SIZE / 2,
              };
            }
          }
        }
      }
    }
    return { x: WORLD_PIXEL_WIDTH / 2, y: WORLD_PIXEL_HEIGHT / 2 };
  }

  private zoomIn(pointer: Phaser.Input.Pointer): void {
    if (this.currentZoomIndex >= ZOOM_LEVELS.length - 1) return;
    this.currentZoomIndex++;
    this.applyZoom(pointer);
  }

  private zoomOut(pointer: Phaser.Input.Pointer): void {
    if (this.currentZoomIndex <= 0) return;
    this.currentZoomIndex--;
    this.applyZoom(pointer);
  }

  private applyZoom(pointer: Phaser.Input.Pointer): void {
    const camera = this.cameras.main;
    const oldZoom = camera.zoom;
    const newZoom = ZOOM_LEVELS[this.currentZoomIndex];
    const worldX = camera.scrollX + pointer.x / oldZoom;
    const worldY = camera.scrollY + pointer.y / oldZoom;

    // Cancel any in-progress zoom tween to prevent stacking
    if (this.zoomTween) {
      this.zoomTween.stop();
      this.zoomTween = null;
    }

    // Smooth zoom tween
    this.zoomTween = this.tweens.add({
      targets: camera,
      zoom: newZoom,
      duration: 150,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        // Keep the world point under the pointer stable during the tween
        camera.scrollX = worldX - pointer.x / camera.zoom;
        camera.scrollY = worldY - pointer.y / camera.zoom;
        this.updateLODVisibility(camera.zoom);
      },
      onComplete: () => {
        this.updateLODVisibility(newZoom);
        this.zoomTween = null;
      },
    });
  }

  /** Toggle between detailed and simplified tile layers based on zoom level. */
  private updateLODVisibility(zoom: number): void {
    if (this.detailLayer && this.simpleLayer) {
      if (zoom <= LOD_ZOOM_THRESHOLD) {
        this.detailLayer.setVisible(false);
        this.simpleLayer.setVisible(true);
      } else {
        this.detailLayer.setVisible(true);
        this.simpleLayer.setVisible(false);
      }
    }
  }

  private togglePause(): void {
    const current = this.timeSystem.getSpeed();
    if (current === SpeedSetting.Paused) {
      this.timeSystem.setSpeed(this.prePauseSpeed);
    } else {
      this.prePauseSpeed = current;
      this.timeSystem.setSpeed(SpeedSetting.Paused);
    }
  }

  private setSpeed(speed: SpeedSetting): void {
    this.timeSystem.setSpeed(speed);
  }

  private handleEscape(): void {
    if (this.buildTool.activeTool !== ToolType.None) {
      this.buildTool.deselectTool();
      this.ghostPreview.clearAll();
      this.events.emit('tool-deselected');
      return;
    }
    this.events.emit('escape-pressed');
  }

  collectSaveData(name: string): SaveSlotData {
    const camera = this.cameras.main;
    return {
      name: name.slice(0, MAX_SAVE_NAME_LENGTH),
      seed: this.currentSeed,
      cameraX: camera.scrollX,
      cameraY: camera.scrollY,
      cameraZoom: camera.zoom,
      gameTimeMinutes: this.timeSystem.getElapsedMinutes(),
      speed: this.timeSystem.getSpeed(),
      savedAt: new Date().toISOString(),
      treasuryBalance: this.treasuryManager.getBalance(),
      infrastructure: this.infrastructureManager.toCompact(),
    };
  }

  private pointerToTile(pointer: Phaser.Input.Pointer): { x: number; y: number } | null {
    const camera = this.cameras.main;
    const worldX = camera.scrollX + pointer.x / camera.zoom;
    const worldY = camera.scrollY + pointer.y / camera.zoom;
    const tileX = Math.floor(worldX / TILE_SIZE);
    const tileY = Math.floor(worldY / TILE_SIZE);
    if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) return null;
    return { x: tileX, y: tileY };
  }

  private handleBuildClick(pointer: Phaser.Input.Pointer): void {
    const tile = this.pointerToTile(pointer);
    if (!tile) return;
    const tool = this.buildTool.activeTool;
    switch (tool) {
      case ToolType.Rail:
      case ToolType.ElevatedRail:
        this.handleRailClick(tile, tool);
        break;
      case ToolType.Bridge:
        this.handleBridgeClick(tile);
        break;
      case ToolType.Station:
        this.handleStationClick(tile);
        break;
      case ToolType.Demolish:
        this.handleDemolishClick(tile);
        break;
    }
  }

  private handleRailClick(tile: { x: number; y: number }, tool: ToolType): void {
    const infraType = tool === ToolType.Rail ? InfrastructureType.Rail : InfrastructureType.ElevatedRail;
    const validation = this.infrastructureManager.canPlace(infraType, tile.x, tile.y, this.terrain);
    if (!validation.valid) return;
    const cost = CostCalculator.tileCost(infraType, this.terrain[tile.y][tile.x]);
    if (cost < 0) return;

    // Debt warning (FR-TREASURY-4)
    if (this.treasuryManager.wouldEnterDebt(cost)) {
      this.events.emit('debt-warning');
    }
    this.treasuryManager.debit(cost);
    const infraTile: InfrastructureTile = {
      type: infraType,
      x: tile.x, y: tile.y,
      connections: 0,
      buildCost: cost,
      buildTime: this.timeSystem.getElapsedMinutes(),
      spriteIndex: 0,
    };
    this.infrastructureManager.place(infraTile);
    this.infrastructureManager.autoConnect(tile.x, tile.y);

    // Re-render this tile and any neighbors that changed
    this.renderInfrastructureTile(this.infrastructureManager.getAt(tile.x, tile.y)!);
    // Re-render neighbors whose connections may have changed
    for (const [, delta] of DIRECTION_DELTAS) {
      const nx = tile.x + delta.dx;
      const ny = tile.y + delta.dy;
      const neighbor = this.infrastructureManager.getAt(nx, ny);
      if (neighbor) this.renderInfrastructureTile(neighbor);
    }

    this.events.emit('treasury-changed');
    this.events.emit('build-completed');
  }

  private handleBridgeClick(tile: { x: number; y: number }): void {
    const phase = this.buildTool.phase;
    if (phase === BuildPhase.ToolActive) {
      const terrain = this.terrain[tile.y][tile.x];
      if (terrain === TerrainType.DeepWater || terrain === TerrainType.ShallowWater) return;
      this.buildTool.setBridgeStart(tile.x, tile.y);
    } else if (phase === BuildPhase.BridgeStart) {
      const start = this.buildTool.bridgeStartTile!;
      if (tile.x !== start.x && tile.y !== start.y) return;
      const endTerrain = this.terrain[tile.y][tile.x];
      if (endTerrain === TerrainType.DeepWater || endTerrain === TerrainType.ShallowWater) return;
      this.buildBridgeSpan(start, tile);
      this.buildTool.resetBridgeState();
    }
  }

  private buildBridgeSpan(start: { x: number; y: number }, end: { x: number; y: number }): void {
    const isHorizontal = start.y === end.y;
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    // Only place bridge on the water tiles between the banks (exclusive of endpoints)
    let totalCost = 0;
    const tilesToPlace: { x: number; y: number }[] = [];

    if (isHorizontal) {
      for (let x = minX + 1; x < maxX; x++) {
        const cost = CostCalculator.tileCost(InfrastructureType.Bridge, this.terrain[start.y][x]);
        if (cost < 0) return; // Can't build here
        totalCost += cost;
        tilesToPlace.push({ x, y: start.y });
      }
    } else {
      for (let y = minY + 1; y < maxY; y++) {
        const cost = CostCalculator.tileCost(InfrastructureType.Bridge, this.terrain[y][start.x]);
        if (cost < 0) return;
        totalCost += cost;
        tilesToPlace.push({ x: start.x, y });
      }
    }

    if (tilesToPlace.length === 0) return;

    // Debt warning (FR-TREASURY-4)
    if (this.treasuryManager.wouldEnterDebt(totalCost)) {
      this.events.emit('debt-warning');
    }
    this.treasuryManager.debit(totalCost);

    for (const pos of tilesToPlace) {
      const connections = isHorizontal
        ? (Direction.E | Direction.W)
        : (Direction.N | Direction.S);
      const spriteIndex = isHorizontal ? 18 : 19;
      const cost = CostCalculator.tileCost(InfrastructureType.Bridge, this.terrain[pos.y][pos.x]);
      const infraTile: InfrastructureTile = {
        type: InfrastructureType.Bridge,
        x: pos.x, y: pos.y,
        connections,
        buildCost: cost > 0 ? cost : 200,
        buildTime: this.timeSystem.getElapsedMinutes(),
        spriteIndex,
      };
      this.infrastructureManager.place(infraTile);
      this.renderInfrastructureTile(infraTile);
    }

    this.events.emit('treasury-changed');
    this.events.emit('build-completed');
  }

  private handleStationClick(tile: { x: number; y: number }): void {
    const tier = this.buildTool.selectedStationTier;
    if (!tier) return;

    // Collect all cells the station would occupy
    const cells: { x: number; y: number }[] = [];
    for (let dy = 0; dy < tier.height; dy++) {
      for (let dx = 0; dx < tier.width; dx++) {
        cells.push({ x: tile.x + dx, y: tile.y + dy });
      }
    }

    // Validate all cells
    for (const cell of cells) {
      if (cell.x < 0 || cell.x >= MAP_WIDTH || cell.y < 0 || cell.y >= MAP_HEIGHT) return;
      const validation = this.infrastructureManager.canPlace(tier.type, cell.x, cell.y, this.terrain, cells);
      if (!validation.valid) return;
    }

    // Check at least one cell is adjacent to rail (4-connected)
    const adjacentToRail = cells.some(cell => {
      const neighbors = [
        { x: cell.x, y: cell.y - 1 },
        { x: cell.x + 1, y: cell.y },
        { x: cell.x, y: cell.y + 1 },
        { x: cell.x - 1, y: cell.y },
      ];
      return neighbors.some(n => {
        const existing = this.infrastructureManager.getAt(n.x, n.y);
        return existing && (existing.type === InfrastructureType.Rail || existing.type === InfrastructureType.ElevatedRail);
      });
    });
    if (!adjacentToRail) return;

    // Debt warning (FR-TREASURY-4)
    if (this.treasuryManager.wouldEnterDebt(tier.cost)) {
      this.events.emit('debt-warning');
    }
    this.treasuryManager.debit(tier.cost);

    const groupId = `station-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    for (const cell of cells) {
      const infraTile: InfrastructureTile = {
        type: tier.type,
        x: cell.x, y: cell.y,
        connections: 0,
        buildCost: Math.floor(tier.cost / cells.length),
        buildTime: this.timeSystem.getElapsedMinutes(),
        spriteIndex: tier.type === InfrastructureType.StationHalt ? 20 : tier.type === InfrastructureType.StationTown ? 21 : 22,
        groupId,
      };
      this.infrastructureManager.place(infraTile);
      this.renderInfrastructureTile(infraTile);
    }

    this.events.emit('treasury-changed');
    this.events.emit('build-completed');
  }

  private handleDemolishClick(tile: { x: number; y: number }): void {
    const existing = this.infrastructureManager.getAt(tile.x, tile.y);
    if (!existing) return;

    if (existing.groupId) {
      // Station: remove all tiles in group
      const groupTiles = this.infrastructureManager.getStationGroup(existing.groupId);

      // Check adjacency rule: cannot demolish if adjacent rail exists
      for (const gt of groupTiles) {
        const neighbors = [
          { x: gt.x, y: gt.y - 1 }, { x: gt.x + 1, y: gt.y },
          { x: gt.x, y: gt.y + 1 }, { x: gt.x - 1, y: gt.y },
        ];
        for (const n of neighbors) {
          const adj = this.infrastructureManager.getAt(n.x, n.y);
          if (adj && !adj.groupId && (adj.type === InfrastructureType.Rail || adj.type === InfrastructureType.ElevatedRail)) {
            return; // Blocked: adjacent rail exists
          }
        }
      }

      let totalRefund = 0;
      for (const gt of groupTiles) {
        totalRefund += CostCalculator.demolishRefund(gt, this.timeSystem.getElapsedMinutes());
        this.infrastructureManager.remove(gt.x, gt.y);
        this.removeInfrastructureSprite(gt.x, gt.y);
      }
      this.treasuryManager.credit(totalRefund);
    } else {
      const refund = CostCalculator.demolishRefund(existing, this.timeSystem.getElapsedMinutes());
      this.infrastructureManager.remove(tile.x, tile.y);
      this.removeInfrastructureSprite(tile.x, tile.y);
      this.treasuryManager.credit(refund);

      // Re-connect neighboring rail after removal
      for (const [, delta] of DIRECTION_DELTAS) {
        const nx = tile.x + delta.dx;
        const ny = tile.y + delta.dy;
        const neighbor = this.infrastructureManager.getAt(nx, ny);
        if (neighbor && (neighbor.type === InfrastructureType.Rail || neighbor.type === InfrastructureType.ElevatedRail)) {
          this.infrastructureManager.autoConnect(nx, ny);
          this.renderInfrastructureTile(this.infrastructureManager.getAt(nx, ny)!);
        }
      }
    }

    this.events.emit('treasury-changed');
    this.events.emit('demolish-completed');
  }

  private updateGhostPreview(pointer: Phaser.Input.Pointer): void {
    const tile = this.pointerToTile(pointer);
    if (!tile) {
      this.ghostPreview.clearAll();
      this.events.emit('cost-tooltip', null);
      return;
    }

    const tool = this.buildTool.activeTool;
    const phase = this.buildTool.phase;

    if (phase === BuildPhase.Dragging) {
      // Auto-route preview
      const startTile = this.buildTool.dragStartTile;
      if (startTile) {
        const infraType = tool === ToolType.Rail ? InfrastructureType.Rail : InfrastructureType.ElevatedRail;
        const path = Pathfinder.findPath(startTile.x, startTile.y, tile.x, tile.y, infraType, this.terrain, this.infrastructureManager);
        if (path) {
          // Compute cost only for tiles that will actually be placed (skip existing)
          let previewCost = 0;
          let newTiles = 0;
          for (const p of path) {
            if (this.infrastructureManager.hasAt(p.x, p.y)) continue;
            const c = CostCalculator.tileCost(infraType, this.terrain[p.y][p.x]);
            if (c > 0) { previewCost += c; newTiles++; }
          }
          this.ghostPreview.showRoute(path.map(p => ({
            x: p.x, y: p.y,
            valid: CostCalculator.tileCost(infraType, this.terrain[p.y][p.x]) >= 0,
          })));
          this.events.emit('route-preview', { totalCost: previewCost, perTile: [] });
          const affordable = this.treasuryManager.getBalance() - previewCost >= -999999;
          this.events.emit('cost-tooltip', {
            screenX: pointer.x, screenY: pointer.y,
            label: `\u00A3${previewCost.toLocaleString('en-GB')} (${newTiles} tiles)`,
            affordable,
          });
        } else {
          this.ghostPreview.clearAll();
          this.events.emit('route-preview', null);
          this.events.emit('cost-tooltip', null);
        }
      }
      return;
    }

    // Single tile preview
    switch (tool) {
      case ToolType.Rail:
      case ToolType.ElevatedRail: {
        const infraType = tool === ToolType.Rail ? InfrastructureType.Rail : InfrastructureType.ElevatedRail;
        const validation = this.infrastructureManager.canPlace(infraType, tile.x, tile.y, this.terrain);
        this.ghostPreview.showSingle(tile.x, tile.y, validation.valid);
        if (validation.valid) {
          const cost = CostCalculator.tileCost(infraType, this.terrain[tile.y][tile.x]);
          const affordable = cost >= 0;
          this.events.emit('cost-tooltip', {
            screenX: pointer.x, screenY: pointer.y,
            label: cost >= 0 ? `\u00A3${cost}` : 'Cannot build',
            affordable,
          });
        } else {
          this.events.emit('cost-tooltip', {
            screenX: pointer.x, screenY: pointer.y,
            label: validation.reason ?? 'Cannot build',
            affordable: false,
          });
        }
        break;
      }
      case ToolType.Station: {
        const tier = this.buildTool.selectedStationTier;
        if (!tier) { this.ghostPreview.clearAll(); return; }
        const cells: { x: number; y: number }[] = [];
        for (let dy = 0; dy < tier.height; dy++) {
          for (let dx = 0; dx < tier.width; dx++) {
            cells.push({ x: tile.x + dx, y: tile.y + dy });
          }
        }
        const allValid = cells.every(c => c.x >= 0 && c.x < MAP_WIDTH && c.y >= 0 && c.y < MAP_HEIGHT && this.infrastructureManager.canPlace(tier.type, c.x, c.y, this.terrain, cells).valid);
        this.ghostPreview.showMultiTile(cells, allValid);
        this.events.emit('cost-tooltip', {
          screenX: pointer.x, screenY: pointer.y,
          label: `\u00A3${tier.cost.toLocaleString('en-GB')}`,
          affordable: allValid,
        });
        break;
      }
      case ToolType.Bridge: {
        if (phase === BuildPhase.BridgeStart) {
          const start = this.buildTool.bridgeStartTile!;
          // Show preview of bridge span to current tile
          if (tile.x === start.x || tile.y === start.y) {
            const isH = tile.y === start.y;
            const tiles: { x: number; y: number; valid: boolean }[] = [];
            if (isH) {
              const minX = Math.min(start.x, tile.x);
              const maxX = Math.max(start.x, tile.x);
              for (let x = minX + 1; x < maxX; x++) {
                const t = this.terrain[start.y][x];
                const isWater = t === TerrainType.DeepWater || t === TerrainType.ShallowWater;
                tiles.push({ x, y: start.y, valid: isWater });
              }
            } else {
              const minY = Math.min(start.y, tile.y);
              const maxY = Math.max(start.y, tile.y);
              for (let y = minY + 1; y < maxY; y++) {
                const t = this.terrain[y][start.x];
                const isWater = t === TerrainType.DeepWater || t === TerrainType.ShallowWater;
                tiles.push({ x: start.x, y, valid: isWater });
              }
            }
            if (tiles.length === 0) {
              this.ghostPreview.clearAll();
              this.events.emit('cost-tooltip', null);
            } else {
              this.ghostPreview.showBridge(tiles);
              // Use CostCalculator for bridge cost (flat 200/tile per FR-COST-3)
              const bridgeCostPerTile = CostCalculator.tileCost(InfrastructureType.Bridge, TerrainType.DeepWater);
              const totalCost = tiles.length * bridgeCostPerTile;
              this.events.emit('cost-tooltip', {
                screenX: pointer.x, screenY: pointer.y,
                label: `\u00A3${totalCost} (${tiles.length} spans)`,
                affordable: true,
              });
            }
          }
        } else {
          // Show single tile ghost for bank selection
          const terrain = this.terrain[tile.y][tile.x];
          const valid = terrain !== TerrainType.DeepWater && terrain !== TerrainType.ShallowWater;
          this.ghostPreview.showSingle(tile.x, tile.y, valid);
          this.events.emit('cost-tooltip', {
            screenX: pointer.x, screenY: pointer.y,
            label: valid ? 'Select bank' : 'Invalid bank',
            affordable: valid,
          });
        }
        break;
      }
      case ToolType.Demolish: {
        const existing = this.infrastructureManager.getAt(tile.x, tile.y);
        if (existing) {
          // Check station demolish blocked by adjacent rail (FR-DEMOLISH-5)
          if (existing.groupId) {
            const groupTiles = this.infrastructureManager.getStationGroup(existing.groupId);
            const hasAdjacentRail = groupTiles.some(gt => {
              const neighbors = [
                { x: gt.x, y: gt.y - 1 }, { x: gt.x + 1, y: gt.y },
                { x: gt.x, y: gt.y + 1 }, { x: gt.x - 1, y: gt.y },
              ];
              return neighbors.some(n => {
                const adj = this.infrastructureManager.getAt(n.x, n.y);
                return adj && !adj.groupId && (adj.type === InfrastructureType.Rail || adj.type === InfrastructureType.ElevatedRail);
              });
            });
            if (hasAdjacentRail) {
              this.ghostPreview.showSingle(tile.x, tile.y, false);
              this.events.emit('cost-tooltip', {
                screenX: pointer.x, screenY: pointer.y,
                label: 'Cannot demolish: remove rail first',
                affordable: false,
              });
              break;
            }
          }

          const refund = CostCalculator.demolishRefund(existing, this.timeSystem.getElapsedMinutes());
          const percent = existing.buildCost > 0
            ? Math.floor((refund / existing.buildCost) * 100)
            : 0;
          this.ghostPreview.showSingle(tile.x, tile.y, true);
          this.events.emit('cost-tooltip', {
            screenX: pointer.x, screenY: pointer.y,
            label: `Demolish? Refund: \u00A3${refund} (${percent}%)`,
            affordable: true,
          });
          this.events.emit('demolish-preview', { refund, buildCost: existing.buildCost });
        } else {
          this.ghostPreview.showSingle(tile.x, tile.y, false);
          this.events.emit('cost-tooltip', null);
        }
        break;
      }
    }
  }

  private executeAutoRoute(start: { x: number; y: number }, end: { x: number; y: number }): void {
    const tool = this.buildTool.activeTool;
    const infraType = tool === ToolType.Rail ? InfrastructureType.Rail : InfrastructureType.ElevatedRail;
    const path = Pathfinder.findPath(start.x, start.y, end.x, end.y, infraType, this.terrain, this.infrastructureManager);
    if (!path) return;

    // Only charge for tiles that will actually be placed (skip existing infrastructure)
    let actualCost = 0;
    for (const p of path) {
      if (this.infrastructureManager.hasAt(p.x, p.y)) continue;
      const cost = CostCalculator.tileCost(infraType, this.terrain[p.y][p.x]);
      if (cost < 0) continue;
      actualCost += cost;
    }
    if (actualCost === 0) return;

    // Debt warning (FR-TREASURY-4)
    if (this.treasuryManager.wouldEnterDebt(actualCost)) {
      this.events.emit('debt-warning');
    }
    this.treasuryManager.debit(actualCost);

    for (const p of path) {
      if (this.infrastructureManager.hasAt(p.x, p.y)) continue;
      const cost = CostCalculator.tileCost(infraType, this.terrain[p.y][p.x]);
      if (cost < 0) continue;
      const infraTile: InfrastructureTile = {
        type: infraType,
        x: p.x, y: p.y,
        connections: 0,
        buildCost: cost,
        buildTime: this.timeSystem.getElapsedMinutes(),
        spriteIndex: 0,
      };
      this.infrastructureManager.place(infraTile);
    }

    // Auto-connect all placed tiles
    for (const p of path) {
      this.infrastructureManager.autoConnect(p.x, p.y);
    }

    // Render all affected tiles
    for (const p of path) {
      const placed = this.infrastructureManager.getAt(p.x, p.y);
      if (placed) this.renderInfrastructureTile(placed);
    }

    this.events.emit('treasury-changed');
    this.events.emit('build-completed');
  }

  private renderInfrastructureTile(tile: InfrastructureTile): void {
    const key = `${tile.x},${tile.y}`;
    // Remove existing bob if any
    const existing = this.infraBobs.get(key);
    if (existing) existing.destroy();

    const yPos = tile.type === InfrastructureType.ElevatedRail
      ? tile.y * TILE_SIZE - 2
      : tile.y * TILE_SIZE;
    const bob = this.infraBlitter!.create(tile.x * TILE_SIZE, yPos, tile.spriteIndex);
    this.infraBobs.set(key, bob);
  }

  private renderAllInfrastructure(): void {
    for (const tile of this.infrastructureManager.getAll()) {
      this.renderInfrastructureTile(tile);
    }
  }

  private removeInfrastructureSprite(x: number, y: number): void {
    const key = `${x},${y}`;
    const bob = this.infraBobs.get(key);
    if (bob) {
      bob.destroy();
      this.infraBobs.delete(key);
    }
  }
}

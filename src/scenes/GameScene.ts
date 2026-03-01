import Phaser from 'phaser';
import { WorldGenerator } from '../systems/WorldGenerator';
import { AutoTiler } from '../systems/AutoTiler';
import { TimeSystem } from '../systems/TimeSystem';
import { TerrainType } from '../types/terrain';
import { SpeedSetting } from '../types/time';
import { SaveSlotData, MAX_SAVE_NAME_LENGTH } from '../types/save';
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
  public timeSystem!: TimeSystem;
  public currentSeed!: number;

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

    // Click-drag panning
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.isDragging = true;
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
        this.cameraStartX = camera.scrollX;
        this.cameraStartY = camera.scrollY;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        const zoom = camera.zoom;
        const dx = (this.dragStartX - pointer.x) / zoom;
        const dy = (this.dragStartY - pointer.y) / zoom;
        camera.scrollX = this.cameraStartX + dx;
        camera.scrollY = this.cameraStartY + dy;
      }
    });

    this.input.on('pointerup', () => {
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

    // Smooth zoom tween
    this.tweens.add({
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
    };
  }
}

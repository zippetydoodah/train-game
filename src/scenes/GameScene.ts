import Phaser from 'phaser';
import { WorldGenerator } from '../systems/WorldGenerator';
import { AutoTiler } from '../systems/AutoTiler';
import { TimeSystem } from '../systems/TimeSystem';
import { TerrainType } from '../types/terrain';
import { SpeedSetting } from '../types/time';
import { SaveSlotData } from '../types/save';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  TILE_SIZE,
  WORLD_PIXEL_WIDTH,
  WORLD_PIXEL_HEIGHT,
  ZOOM_LEVELS,
  DEFAULT_ZOOM_INDEX,
} from '../config/game-config';

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
  public timeSystem!: TimeSystem;
  public currentSeed!: number;

  constructor() {
    super({ key: 'game' });
  }

  create(data: GameSceneData): void {
    this.currentSeed = data.seed;

    // Generate world
    const worldData = WorldGenerator.generate(data.seed);

    // Build tile index array using autotiler
    const tileIndexData: number[][] = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      tileIndexData[y] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        tileIndexData[y][x] = AutoTiler.getTileIndex(worldData.terrain, x, y);
      }
    }

    // Create tilemap
    const map = this.make.tilemap({
      data: tileIndexData,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });

    const tileset = map.addTilesetImage('terrain', 'terrain-tileset', TILE_SIZE, TILE_SIZE);
    map.createLayer(0, tileset!, 0, 0);

    // Camera setup
    const camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD_PIXEL_WIDTH, WORLD_PIXEL_HEIGHT);

    if (data.isNewGame) {
      const startPos = this.findStartPosition(worldData.terrain);
      camera.centerOn(startPos.x, startPos.y);
    } else if (data.saveData) {
      camera.scrollX = data.saveData.cameraX;
      camera.scrollY = data.saveData.cameraY;
      // Find closest zoom index
      this.currentZoomIndex = (ZOOM_LEVELS as readonly number[]).indexOf(data.saveData.cameraZoom);
      if (this.currentZoomIndex === -1) this.currentZoomIndex = DEFAULT_ZOOM_INDEX;
      camera.setZoom(ZOOM_LEVELS[this.currentZoomIndex]);
    }

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

    // Keyboard zoom shortcuts
    const keyboard = this.input.keyboard!;
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

    // Launch HUD
    this.scene.launch('hud', { timeSystem: this.timeSystem, gameScene: this });
  }

  update(_time: number, delta: number): void {
    this.timeSystem.update(delta);
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
    camera.setZoom(newZoom);
    camera.scrollX = worldX - pointer.x / newZoom;
    camera.scrollY = worldY - pointer.y / newZoom;
  }

  private togglePause(): void {
    const current = this.timeSystem.getSpeed();
    if (current === SpeedSetting.Paused) {
      this.timeSystem.setSpeed(SpeedSetting.Normal);
    } else {
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
      name,
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

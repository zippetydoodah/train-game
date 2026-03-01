import Phaser from 'phaser';
import { TreasuryPanel } from '../ui/TreasuryPanel';
import { TimePanel } from '../ui/TimePanel';
import { Toolbar } from '../ui/Toolbar';
import { SidePanel } from '../ui/SidePanel';
import { SaveMenu } from '../ui/SaveMenu';
import { TimeSystem } from '../systems/TimeSystem';
import { GameScene } from './GameScene';
import { GAME_WIDTH } from '../config/game-config';

export class HUDScene extends Phaser.Scene {
  private timePanel!: TimePanel;
  private saveMenu: SaveMenu | null = null;
  private timeSystem!: TimeSystem;
  private gameScene!: GameScene;
  private onSaveRequested!: () => void;
  private onEscapePressed!: () => void;

  constructor() {
    super({ key: 'hud' });
  }

  create(data: { timeSystem: TimeSystem; gameScene: GameScene }): void {
    this.timeSystem = data.timeSystem;
    this.gameScene = data.gameScene;
    this.cameras.main.setScroll(0, 0);

    new TreasuryPanel(this, 12, 12);
    this.timePanel = new TimePanel(this, GAME_WIDTH - 12 - 220, 12, data.timeSystem, data.gameScene);
    new Toolbar(this);
    new SidePanel(this, GAME_WIDTH - 200, 80);

    // Listen for save menu open
    this.events.on('open-save-menu', () => this.openSaveMenu());
    this.events.on('return-to-menu', () => this.returnToMainMenu());

    // Store bound handler references for surgical removal on shutdown
    this.onSaveRequested = () => this.openSaveMenu();
    this.onEscapePressed = () => this.handleEscape();
    this.gameScene.events.on('save-requested', this.onSaveRequested);
    this.gameScene.events.on('escape-pressed', this.onEscapePressed);

    // Clean up cross-scene listeners when this scene shuts down
    this.events.on('shutdown', () => {
      this.gameScene.events.off('save-requested', this.onSaveRequested);
      this.gameScene.events.off('escape-pressed', this.onEscapePressed);
      if (this.saveMenu) {
        this.saveMenu.close();
        this.saveMenu = null;
      }
    });
  }

  update(): void {
    this.timePanel.refresh();
  }

  private openSaveMenu(): void {
    if (this.saveMenu) return;
    this.timeSystem.setForcePaused(true);
    this.saveMenu = new SaveMenu(this, this.gameScene, () => {
      this.timeSystem.setForcePaused(false);
      this.saveMenu = null;
    });
  }

  private handleEscape(): void {
    if (this.saveMenu) {
      this.saveMenu.close();
      this.timeSystem.setForcePaused(false);
      this.saveMenu = null;
    }
  }

  private returnToMainMenu(): void {
    this.timeSystem.setForcePaused(true);
    if (this.saveMenu) {
      this.saveMenu.close();
      this.saveMenu = null;
    }
    this.scene.stop('hud');
    this.scene.get('game').scene.start('main-menu');
  }
}

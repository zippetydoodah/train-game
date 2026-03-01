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
    this.gameScene.events.on('save-requested', () => this.openSaveMenu());
    this.gameScene.events.on('escape-pressed', () => this.handleEscape());
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
}

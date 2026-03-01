import Phaser from 'phaser';
import { TreasuryPanel } from '../ui/TreasuryPanel';
import { TimePanel } from '../ui/TimePanel';
import { Toolbar } from '../ui/Toolbar';
import { SidePanel } from '../ui/SidePanel';
import { SaveMenu } from '../ui/SaveMenu';
import { StationSubMenu } from '../ui/StationSubMenu';
import { CostTooltip } from '../ui/CostTooltip';
import { TimeSystem } from '../systems/TimeSystem';
import { GameScene } from './GameScene';
import { ToolType } from '../types/tools';
import { GAME_WIDTH } from '../config/game-config';

export class HUDScene extends Phaser.Scene {
  private timePanel!: TimePanel;
  private treasuryPanel!: TreasuryPanel;
  private toolbar!: Toolbar;
  private sidePanel!: SidePanel;
  private stationSubMenu!: StationSubMenu;
  private costTooltip!: CostTooltip;
  private saveMenu: SaveMenu | null = null;
  private timeSystem!: TimeSystem;
  private gameScene!: GameScene;
  private onSaveRequested!: () => void;
  private onEscapePressed!: () => void;
  private onToolHotkey!: (tool: ToolType) => void;
  private onToolDeselected!: () => void;
  private onTreasuryChanged!: () => void;
  private onBuildCompleted!: () => void;
  private onDemolishCompleted!: () => void;
  private onRoutePreview!: (data: unknown) => void;
  private onCostTooltip!: (data: unknown) => void;

  constructor() {
    super({ key: 'hud' });
  }

  create(data: { timeSystem: TimeSystem; gameScene: GameScene }): void {
    this.timeSystem = data.timeSystem;
    this.gameScene = data.gameScene;
    this.cameras.main.setScroll(0, 0);

    // Treasury panel (now receives TreasuryManager reference)
    this.treasuryPanel = new TreasuryPanel(this, 12, 12, data.gameScene.treasuryManager);
    this.timePanel = new TimePanel(this, GAME_WIDTH - 12 - 220, 12, data.timeSystem, data.gameScene);
    this.toolbar = new Toolbar(this);
    this.sidePanel = new SidePanel(this, GAME_WIDTH - 200, 80);
    this.stationSubMenu = new StationSubMenu(this, (tier) => {
      data.gameScene.buildTool.selectStationTier(tier);
      this.stationSubMenu.hide();
    });
    this.costTooltip = new CostTooltip(this);

    // Tool selection from toolbar buttons
    this.events.on('tool-selected', (tool: ToolType) => {
      data.gameScene.buildTool.selectTool(tool);
      this.toolbar.setActiveTool(data.gameScene.buildTool.activeTool);
      if (data.gameScene.buildTool.activeTool === ToolType.Station) {
        this.stationSubMenu.show();
      } else {
        this.stationSubMenu.hide();
      }
    });

    // Existing event listeners
    this.events.on('open-save-menu', () => this.openSaveMenu());
    this.events.on('return-to-menu', () => this.returnToMainMenu());

    // Tool hotkeys (from GameScene keyboard)
    this.onToolHotkey = (tool: ToolType) => {
      data.gameScene.buildTool.selectTool(tool);
      this.toolbar.setActiveTool(data.gameScene.buildTool.activeTool);
      if (data.gameScene.buildTool.activeTool === ToolType.Station) {
        this.stationSubMenu.show();
      } else {
        this.stationSubMenu.hide();
      }
    };

    // Tool deselected (ESC)
    this.onToolDeselected = () => {
      this.toolbar.setActiveTool(ToolType.None);
      this.stationSubMenu.hide();
      this.costTooltip.hide();
      this.sidePanel.clearContent();
    };

    // Treasury changed
    this.onTreasuryChanged = () => {
      this.treasuryPanel.refresh();
    };

    // Build completed flash
    this.onBuildCompleted = () => {
      this.treasuryPanel.flashDeduction();
    };

    // Demolish completed flash
    this.onDemolishCompleted = () => {
      this.treasuryPanel.flashRefund();
    };

    // Route preview
    this.onRoutePreview = (routeData: unknown) => {
      if (routeData && typeof routeData === 'object' && 'totalCost' in routeData) {
        this.sidePanel.showRouteBreakdown(routeData as { totalCost: number; perTile: { x: number; y: number; cost: number; terrain: number }[] });
      } else {
        this.sidePanel.clearContent();
      }
    };

    // Cost tooltip
    this.onCostTooltip = (tooltipData: unknown) => {
      if (tooltipData && typeof tooltipData === 'object' && 'screenX' in tooltipData) {
        const d = tooltipData as { screenX: number; screenY: number; label: string; affordable: boolean };
        this.costTooltip.show(d.screenX, d.screenY, d.label, d.affordable);
      } else {
        this.costTooltip.hide();
      }
    };

    // Store bound handler references
    this.onSaveRequested = () => this.openSaveMenu();
    this.onEscapePressed = () => this.handleEscape();

    // Wire up cross-scene events
    this.gameScene.events.on('save-requested', this.onSaveRequested);
    this.gameScene.events.on('escape-pressed', this.onEscapePressed);
    this.gameScene.events.on('tool-hotkey', this.onToolHotkey);
    this.gameScene.events.on('tool-deselected', this.onToolDeselected);
    this.gameScene.events.on('treasury-changed', this.onTreasuryChanged);
    this.gameScene.events.on('build-completed', this.onBuildCompleted);
    this.gameScene.events.on('demolish-completed', this.onDemolishCompleted);
    this.gameScene.events.on('route-preview', this.onRoutePreview);
    this.gameScene.events.on('cost-tooltip', this.onCostTooltip);

    // Clean up on shutdown
    this.events.on('shutdown', () => {
      this.gameScene.events.off('save-requested', this.onSaveRequested);
      this.gameScene.events.off('escape-pressed', this.onEscapePressed);
      this.gameScene.events.off('tool-hotkey', this.onToolHotkey);
      this.gameScene.events.off('tool-deselected', this.onToolDeselected);
      this.gameScene.events.off('treasury-changed', this.onTreasuryChanged);
      this.gameScene.events.off('build-completed', this.onBuildCompleted);
      this.gameScene.events.off('demolish-completed', this.onDemolishCompleted);
      this.gameScene.events.off('route-preview', this.onRoutePreview);
      this.gameScene.events.off('cost-tooltip', this.onCostTooltip);
      if (this.saveMenu) {
        this.saveMenu.close();
        this.saveMenu = null;
      }
    });
  }

  update(): void {
    this.timePanel.refresh();
    this.treasuryPanel.refresh();
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
    if (this.stationSubMenu.isVisible()) {
      this.stationSubMenu.hide();
      this.gameScene.buildTool.deselectTool();
      this.toolbar.setActiveTool(ToolType.None);
      return;
    }

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

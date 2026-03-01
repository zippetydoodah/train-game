import { ToolType } from '../types/tools';
import { StationTierConfig } from '../types/infrastructure';

export enum BuildPhase {
  Idle = 'idle',
  ToolActive = 'tool_active',
  Dragging = 'dragging',
  BridgeStart = 'bridge_start',
  StationSubMenu = 'station_sub_menu',
}

export class BuildToolStateMachine {
  private _activeTool: ToolType = ToolType.None;
  private _phase: BuildPhase = BuildPhase.Idle;
  private _selectedStationTier: StationTierConfig | null = null;
  private _bridgeStartTile: { x: number; y: number } | null = null;
  private _dragStartTile: { x: number; y: number } | null = null;

  /** Callback fired when the active tool changes. */
  onToolChanged: ((tool: ToolType) => void) | null = null;

  /** Callback fired when the build phase changes. */
  onPhaseChanged: ((phase: BuildPhase) => void) | null = null;

  get activeTool(): ToolType {
    return this._activeTool;
  }

  get phase(): BuildPhase {
    return this._phase;
  }

  get selectedStationTier(): StationTierConfig | null {
    return this._selectedStationTier;
  }

  get bridgeStartTile(): { x: number; y: number } | null {
    return this._bridgeStartTile;
  }

  get dragStartTile(): { x: number; y: number } | null {
    return this._dragStartTile;
  }

  private setPhase(phase: BuildPhase): void {
    if (this._phase !== phase) {
      this._phase = phase;
      this.onPhaseChanged?.(phase);
    }
  }

  /**
   * Select a tool. If the same tool is selected again, deselect it (toggle off).
   * Sets the appropriate phase based on tool type.
   */
  selectTool(tool: ToolType): void {
    if (tool === this._activeTool) {
      this.deselectTool();
      return;
    }

    this._activeTool = tool;
    this._selectedStationTier = null;
    this._bridgeStartTile = null;
    this._dragStartTile = null;

    this.onToolChanged?.(tool);

    switch (tool) {
      case ToolType.Station:
        this.setPhase(BuildPhase.StationSubMenu);
        break;
      case ToolType.Bridge:
        this.setPhase(BuildPhase.BridgeStart);
        break;
      case ToolType.None:
        this.setPhase(BuildPhase.Idle);
        break;
      default:
        this.setPhase(BuildPhase.ToolActive);
        break;
    }
  }

  /** Deselect the current tool and reset all state. */
  deselectTool(): void {
    this._activeTool = ToolType.None;
    this._selectedStationTier = null;
    this._bridgeStartTile = null;
    this._dragStartTile = null;

    this.onToolChanged?.(ToolType.None);
    this.setPhase(BuildPhase.Idle);
  }

  /** Select a station tier from the sub-menu. Transitions to ToolActive. */
  selectStationTier(tier: StationTierConfig): void {
    this._selectedStationTier = tier;
    this.setPhase(BuildPhase.ToolActive);
  }

  /** Set the bridge start tile. */
  setBridgeStart(x: number, y: number): void {
    this._bridgeStartTile = { x, y };
    this.setPhase(BuildPhase.ToolActive);
  }

  /** Begin a drag operation from (x, y). */
  startDrag(x: number, y: number): void {
    this._dragStartTile = { x, y };
    this.setPhase(BuildPhase.Dragging);
  }

  /** End the current drag operation. Returns to ToolActive. */
  endDrag(): void {
    this._dragStartTile = null;
    this.setPhase(BuildPhase.ToolActive);
  }
}

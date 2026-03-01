import { InfrastructureType } from './infrastructure';

/** Tools available in the toolbar. */
export enum ToolType {
  None = 'none',
  Rail = 'rail',
  Station = 'station',
  Bridge = 'bridge',
  ElevatedRail = 'elevated_rail',
  Demolish = 'demolish',
}

/** Keyboard shortcut mapping. */
export const TOOL_HOTKEYS: ReadonlyMap<string, ToolType> = new Map([
  ['R', ToolType.Rail],
  ['T', ToolType.Station],
  ['B', ToolType.Bridge],
  ['E', ToolType.ElevatedRail],
  ['X', ToolType.Demolish],
]);

/**
 * Maps toolbar button labels to ToolType values.
 */
export const BUTTON_LABEL_TO_TOOL: ReadonlyMap<string, ToolType> = new Map([
  ['Rail',      ToolType.Rail],
  ['Station',   ToolType.Station],
  ['Bridge',    ToolType.Bridge],
  ['Elev.Rail', ToolType.ElevatedRail],
  ['Demolish',  ToolType.Demolish],
]);

/** Maps ToolType to the InfrastructureType it places. */
export const TOOL_TO_INFRA_TYPE: ReadonlyMap<ToolType, InfrastructureType> = new Map([
  [ToolType.Rail,         InfrastructureType.Rail],
  [ToolType.ElevatedRail, InfrastructureType.ElevatedRail],
  [ToolType.Bridge,       InfrastructureType.Bridge],
]);

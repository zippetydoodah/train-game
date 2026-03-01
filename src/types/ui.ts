export enum ButtonState {
  Normal = 'normal',
  Hover = 'hover',
  Active = 'active',
  Disabled = 'disabled',
}

export interface PanelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  alpha?: number;
  borderColor?: number;
}

export interface ToolbarButtonConfig {
  label: string;
  width: number;
  enabled: boolean;
  onClick?: () => void;
}
